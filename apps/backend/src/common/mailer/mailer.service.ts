import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// ✉️ KAN-17 (KAN-77): abstração mínima de envio de e-mail. Sem SMTP_HOST
// configurado (dev/CI/test), não tenta enviar — só loga, para o fluxo de
// recuperação de senha continuar testável/rodável sem infraestrutura de
// e-mail real. Nunca lança: um SMTP fora do ar não deveria vazar "o e-mail
// existe" através de uma resposta 500 diferente do caminho feliz.
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    this.from = this.configService.get<string>('SMTP_FROM') ?? 'no-reply@localhost';

    if (!host) {
      this.transporter = null;
      return;
    }

    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get<string>('SMTP_PORT') ?? '587'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: user ? { user, pass } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP não configurado — e-mail para ${message.to} NÃO enviado de verdade ("${message.subject}").`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, ...message });
    } catch (err) {
      // 🔒 Falha de envio não deve virar 500 no fluxo de reset de senha —
      // isso permitiria diferenciar "e-mail existe, SMTP falhou" de
      // "e-mail não existe", reintroduzindo enumeração de contas.
      this.logger.error(`Falha ao enviar e-mail para ${message.to}: ${(err as Error).message}`);
    }
  }
}
