import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Contrato das variáveis de ambiente. A app não sobe se algo obrigatório
 * estiver faltando — falha cedo em vez de quebrar em runtime.
 */
class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsInt()
  @Min(1)
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string;

  // ── Segurança / infra (opcionais) ──
  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string; // origens permitidas, separadas por vírgula

  @IsString()
  @IsOptional()
  TRUST_PROXY?: string; // "1"/"true" quando atrás de proxy reverso

  @IsString()
  @IsOptional()
  SWAGGER_ENABLED?: string; // "true" força o Swagger em produção

  // ── E-mail / reset de senha (opcionais) ──
  @IsString()
  @IsOptional()
  BREVO_API_KEY?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM_EMAIL?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM_NAME?: string;

  @IsInt()
  @IsOptional()
  PASSWORD_RESET_TTL_MINUTES?: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Configuração de ambiente inválida:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
