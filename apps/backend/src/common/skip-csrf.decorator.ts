import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/**
 * Isenta um endpoint da validação de CSRF (CsrfGuard). Uso restrito a
 * endpoints que não agem sobre uma sessão já autenticada — hoje só
 * register/login, cujo pior caso de abuso é "logar a vítima numa conta do
 * atacante" (login CSRF), uma ameaça distinta e de impacto menor do que
 * CSRF sobre uma sessão autenticada, que é o que este guard protege.
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
