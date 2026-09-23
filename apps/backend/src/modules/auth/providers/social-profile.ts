import { AuthProvider } from '../../../common/types/auth.types';

// 🔒 Formato comum que todo provider de identidade (google.provider.ts,
// apple.provider.ts) precisa produzir depois de VERIFICAR a assinatura do
// ID token. SocialAuthService só aceita entrar em contato com dados neste
// formato — nunca com o corpo bruto da requisição.
export interface VerifiedSocialProfile {
  provider: AuthProvider;
  providerUserId: string; // `sub` do token, já verificado
  email: string;
  emailVerified: boolean;
  name?: string;
}
