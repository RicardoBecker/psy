// 🔒 Code review PR #17 (KAN-157, P2): representação canônica única de
// e-mail em TODAS as bordas (cadastro, login, reset de senha, login
// social) — sem isso, "Pessoa@exemplo.com" (cadastro local) e
// "pessoa@exemplo.com" (claim do Google) não colidem na busca por
// `User.email` (coluna Postgres sensível a caixa) e viram duas contas para
// o mesmo endereço lógico. `trim` cobre espaços colados em copy-paste.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
