// ✉️ KAN-17 (KAN-78): template do e-mail de recuperação de senha. Isolado
// da lógica de negócio (AuthService) só para ficar testável/legível à parte.
export function buildPasswordResetEmail(resetUrl: string): { subject: string; html: string; text: string } {
  const subject = 'Redefinição de senha';
  const text =
    `Recebemos uma solicitação para redefinir sua senha.\n\n` +
    `Acesse o link abaixo para escolher uma nova senha. Ele expira em 30 minutos e só pode ser usado uma vez:\n${resetUrl}\n\n` +
    `Se você não solicitou isso, pode ignorar este e-mail com segurança — sua senha continua a mesma.`;
  const html = `
    <p>Recebemos uma solicitação para redefinir sua senha.</p>
    <p><a href="${resetUrl}">Clique aqui para escolher uma nova senha</a>.</p>
    <p>Esse link expira em 30 minutos e só pode ser usado uma vez.</p>
    <p>Se você não solicitou isso, pode ignorar este e-mail com segurança — sua senha continua a mesma.</p>
  `.trim();

  return { subject, html, text };
}
