import { normalizeEmail, maskEmail } from './email.util';

describe('normalizeEmail — canonical form for every boundary (KAN-157)', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Pessoa@Exemplo.com  ')).toBe('pessoa@exemplo.com');
  });

  it('is idempotent', () => {
    const once = normalizeEmail('Pessoa@Exemplo.com');
    expect(normalizeEmail(once)).toBe(once);
  });
});

// 🔒 Code review PR #19 (KAN-156, P3): logs operacionais não podem expor o
// endereço completo de quem solicitou recuperação de senha.
describe('maskEmail — never leaks the full address into logs (KAN-156)', () => {
  it('keeps only the first character of the local part and the full domain', () => {
    expect(maskEmail('pessoa@example.com')).toBe('p***@example.com');
  });

  it('never returns the original address unmasked', () => {
    const email = 'vitima@example.com';
    expect(maskEmail(email)).not.toBe(email);
    expect(maskEmail(email)).not.toContain('vitima');
  });

  it('handles a single-character local part without leaking it', () => {
    expect(maskEmail('a@example.com')).toBe('*@example.com');
  });

  it('degrades gracefully for a malformed value with no domain', () => {
    expect(maskEmail('nao-e-um-email')).toBe('***');
  });
});
