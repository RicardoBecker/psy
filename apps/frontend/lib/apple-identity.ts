// 🍎 KAN-16 (KAN-76): carrega o "Sign in with Apple JS" sob demanda e expõe
// um único ponto de entrada para disparar o login. Mesmo princípio de
// lib/google-identity.ts — só usamos isto para obter o `identityToken`
// assinado pela Apple; o backend re-verifica do zero
// (ver apps/backend/.../providers/apple.provider.ts).
const APPLE_JS_SRC =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

interface AppleAuthorizationResponse {
  authorization: { id_token: string };
}

interface AppleIdApi {
  init(config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
  }): void;
  signIn(): Promise<AppleAuthorizationResponse>;
}

declare global {
  interface Window {
    AppleID?: { auth: AppleIdApi };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Login com Apple só está disponível no navegador.'));
  }
  if (window.AppleID?.auth) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = APPLE_JS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error('Não foi possível carregar o Apple Login. Verifique sua conexão.'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

// 🚪 Ponto de entrada único: inicializa o SDK (se preciso) e abre o popup de
// login. Resolve com o identityToken em caso de sucesso; ao usuário fechar o
// popup, a Apple rejeita a Promise com `error: 'popup_closed_by_user'` — não
// é um erro de verdade (ver login/page.tsx: KAN-76 "tratar cancelamento").
export async function appleSignIn(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Login com Apple não está disponível no momento.');
  }

  await loadAppleScript();

  window.AppleID!.auth.init({
    clientId,
    scope: 'email',
    redirectURI: window.location.origin,
    usePopup: true,
  });

  const response = await window.AppleID!.auth.signIn();
  return response.authorization.id_token;
}

// ✋ A Apple sinaliza cancelamento do usuário com esse código de erro
// específico — usado por quem chama appleSignIn para decidir se mostra
// mensagem de erro ou apenas ignora silenciosamente.
export function isAppleSignInCancellation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'error' in err &&
    (err as { error?: unknown }).error === 'popup_closed_by_user'
  );
}
