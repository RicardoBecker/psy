// 🔒 Code review PR #17 (KAN-157, P2): representação canônica única de
// e-mail em TODAS as bordas (cadastro, login, reset de senha, login
// social) — sem isso, "Pessoa@exemplo.com" (cadastro local) e
// "pessoa@exemplo.com" (claim do Google) não colidem na busca por
// `User.email` (coluna Postgres sensível a caixa) e viram duas contas para
// o mesmo endereço lógico. `trim` cobre espaços colados em copy-paste.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 🔒 Code review PR #19 (KAN-156, P3): logs operacionais (ex.: falha de
// envio de e-mail) não podem expor o endereço completo — este é um
// produto de saúde emocional, e "quem solicitou recuperação de senha" já
// é informação sensível por si só. Mantém só o suficiente para depurar um
// domínio problemático (ex.: um provedor rejeitando tudo), nunca o
// endereço completo. Exemplo: "pessoa@exemplo.com" → "p***@exemplo.com".
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}
