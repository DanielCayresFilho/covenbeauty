import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersService } from '@/users/users.service';
import { MailService } from '@/mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

// Parâmetros do argon2id (OWASP: 19 MiB, 2 iterações, paralelismo 1).
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email.toLowerCase());

    // Mensagem genérica + verificação mesmo sem usuário para mitigar
    // enumeração de e-mails e timing attacks.
    const valid =
      user && user.isActive
        ? await argon2.verify(user.passwordHash, dto.password)
        : await this.fakeVerify(dto.password);

    if (!user || !user.isActive || !valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.users.updateLastLogin(user.id);
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.toPublic(user) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload & { jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.userId !== payload.sub
    ) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    const matches = await argon2.verify(stored.tokenHash, refreshToken);
    if (!matches) {
      // Possível reuso de token — revoga toda a família por segurança.
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sessão inválida, faça login novamente');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Conta indisponível');
    }

    // Rotação: revoga o token atual e emite um novo par.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Esqueci minha senha: gera um código de 6 dígitos e envia por e-mail.
   * Sempre retorna sucesso (não revela se o e-mail existe).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user || !user.isActive) {
      // Gasta um tempo comparável ao caminho real para mitigar enumeração
      // de e-mails por medição de tempo de resposta.
      await argon2.hash('dummy-timing-equalizer', ARGON2_OPTIONS).catch(() => undefined);
      return; // resposta genérica
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await argon2.hash(code, ARGON2_OPTIONS);
    const ttlMin = this.config.get<number>('PASSWORD_RESET_TTL_MINUTES', 15);

    // Invalida códigos anteriores ainda não usados.
    await this.prisma.passwordResetCode.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + ttlMin * 60_000),
      },
    });

    // Fire-and-forget: não bloqueia a resposta (tempo constante) e não vaza
    // o custo de rede do envio. O MailService trata os próprios erros.
    void this.mail.sendPasswordResetCode(user.email, user.fullName, code);
    this.logger.log(`Código de recuperação gerado para ${user.email}`);
  }

  /** Redefine a senha usando o código de 6 dígitos. */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findByEmail(email.toLowerCase());
    const invalid = new BadRequestException('Código inválido ou expirado');
    if (!user || !user.isActive) {
      throw invalid;
    }

    const record = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw invalid;
    }

    const matches = await argon2.verify(record.codeHash, code);
    if (!matches) {
      throw invalid;
    }

    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalida qualquer outro código pendente e derruba as sessões.
      this.prisma.passwordResetCode.deleteMany({
        where: { userId: user.id, usedAt: null },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Senha redefinida para ${user.email}`);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jti = randomUUID();
    const refreshTtl = this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      } as JwtSignOptions),
      this.jwt.signAsync(
        { ...payload, jti },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshTtl,
          jwtid: jti,
        } as JwtSignOptions,
      ),
    ]);

    const tokenHash = await argon2.hash(refreshToken, ARGON2_OPTIONS);

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash,
        expiresAt: this.expiryFromNow(refreshTtl),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Gasta tempo comparável a um verify real quando o usuário não existe.
   * Usa argon2.hash (mesmo custo memory-hard do verify) para garantir tempo
   * equivalente sem depender de um hash fixo — mitiga timing/enumeração.
   */
  private async fakeVerify(password: string): Promise<boolean> {
    await argon2.hash(password, ARGON2_OPTIONS).catch(() => undefined);
    return false;
  }

  private expiryFromNow(ttl: string): Date {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    const now = Date.now();
    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    }
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(now + value * multipliers[unit]);
  }

  private toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
