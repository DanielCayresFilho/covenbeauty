import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface BrevoRecipient {
  email: string;
  name?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly endpoint = 'https://api.brevo.com/v3/smtp/email';

  constructor(private readonly config: ConfigService) {}

  /** Envia o código de recuperação de senha (6 dígitos). */
  async sendPasswordResetCode(to: string, name: string | null, code: string) {
    const ttl = this.config.get<number>('PASSWORD_RESET_TTL_MINUTES', 15);
    const subject = 'Coven Beauty — Código de recuperação de senha';
    const html = `
      <div style="font-family: Arial, sans-serif; color: #2b2b2b;">
        <h2>🌙 Coven Beauty</h2>
        <p>Olá${name ? `, ${name}` : ''}.</p>
        <p>Use o código abaixo para redefinir sua senha:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p>Este código expira em ${ttl} minutos. Se não foi você, ignore este e-mail.</p>
      </div>`;

    await this.send({ email: to, name: name ?? undefined }, subject, html, code);
  }

  private async send(
    to: BrevoRecipient,
    subject: string,
    htmlContent: string,
    devFallbackCode?: string,
  ) {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const fromEmail = this.config.get<string>('MAIL_FROM_EMAIL');
    const fromName = this.config.get<string>('MAIL_FROM_NAME', 'Coven Beauty');

    if (!apiKey || !fromEmail) {
      // Sem configuração de e-mail: não quebra o fluxo. Em dev, loga o código
      // para permitir testar sem provedor.
      this.logger.warn(
        'BREVO_API_KEY/MAIL_FROM_EMAIL não configurados — e-mail não enviado.',
      );
      if (
        devFallbackCode &&
        this.config.get<string>('NODE_ENV') !== 'production'
      ) {
        this.logger.warn(`[DEV] Código para ${to.email}: ${devFallbackCode}`);
      }
      return;
    }

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: fromEmail, name: fromName },
          to: [to],
          subject,
          htmlContent,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Falha ao enviar e-mail (${res.status}): ${body}`);
      }
    } catch (e) {
      this.logger.error(`Erro ao chamar a API do Brevo: ${String(e)}`);
    }
  }
}
