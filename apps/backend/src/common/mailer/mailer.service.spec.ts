import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MailerService } from './mailer.service';

const sendMail = jest.fn();
const createTransport = jest.fn().mockReturnValue({ sendMail });

jest.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => createTransport(...args),
}));

function configServiceWith(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('MailerService — never fails the caller, never sends without SMTP configured (KAN-17)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
  });

  it('without SMTP_HOST, does not attempt to send and does not throw', async () => {
    const service = new MailerService(configServiceWith({}));

    await expect(
      service.send({ to: 'a@example.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi' }),
    ).resolves.toBeUndefined();

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('with SMTP_HOST configured, sends through the transporter with the configured from', async () => {
    const service = new MailerService(
      configServiceWith({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '2525',
        SMTP_FROM: 'contato@app.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
      }),
    );

    await service.send({ to: 'a@example.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi' });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 2525 }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'contato@app.com', to: 'a@example.com', subject: 'Oi' }),
    );
  });

  it('swallows a transporter failure instead of throwing (never differs from the happy path)', async () => {
    sendMail.mockRejectedValue(new Error('conexão SMTP recusada'));
    const service = new MailerService(configServiceWith({ SMTP_HOST: 'smtp.example.com' }));

    await expect(
      service.send({ to: 'a@example.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi' }),
    ).resolves.toBeUndefined();
  });

  // 🔒 Code review PR #19 (KAN-156, P3): logs operacionais não podem
  // expor o endereço completo de quem solicitou recuperação de senha.
  describe('never logs the raw email address (KAN-156, P3)', () => {
    it('masks the address in the "SMTP não configurado" warning', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const service = new MailerService(configServiceWith({}));

      await service.send({ to: 'vitima@example.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi' });

      expect(warnSpy).toHaveBeenCalled();
      const loggedMessage = warnSpy.mock.calls[0][0] as string;
      expect(loggedMessage).not.toContain('vitima@example.com');
      expect(loggedMessage).toContain('v***@example.com');

      warnSpy.mockRestore();
    });

    it('masks the address in the send-failure error log', async () => {
      sendMail.mockRejectedValue(new Error('conexão SMTP recusada'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const service = new MailerService(configServiceWith({ SMTP_HOST: 'smtp.example.com' }));

      await service.send({ to: 'vitima@example.com', subject: 'Oi', html: '<p>Oi</p>', text: 'Oi' });

      expect(errorSpy).toHaveBeenCalled();
      const loggedMessage = errorSpy.mock.calls[0][0] as string;
      expect(loggedMessage).not.toContain('vitima@example.com');
      expect(loggedMessage).toContain('v***@example.com');

      errorSpy.mockRestore();
    });
  });
});
