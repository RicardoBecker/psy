// 🍎 KAN-16 (KAN-76): carrega o "Sign in with Apple JS" sob demanda e expõe
// um único ponto de entrada para disparar o login. Mesmo princípio de
// lib/google-identity.ts — só usamos isto para obter o `identityToken`
// assinado pela Apple; o backend re-verifica do zero
// (ver apps/backend/.../providers/apple.provider.ts).
//
// 🔒 Code review PR #18 (KAN-158, P1): antes de abrir o popup, buscamos um
// desafio (state/nonce) do backend — gerado e guardado lá num cookie
// HttpOnly de curta duração — e repassamos os dois para o SDK da Apple. O
// backend valida ambos na volta, provando que a resposta é desta tentativa
// (não um token Apple válido obtido em outro contexto/replay).
import { authApi } from './api';

const APPLE_JS_SRC =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

interface AppleAuthorizationResponse {
  authorization: { id_token: string; state?: string };
}

interface AppleIdApi {
  init(config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
    nonce: string;
    state: string;
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

// 🚪 Ponto de entrada único: busca o desafio, inicializa o SDK (se preciso)
// e abre o popup de login. Resolve com {idToken, state} em caso de
// sucesso; ao usuário fechar o popup, a Apple rejeita a Promise com
// `error: 'popup_closed_by_user'` — não é um erro de verdade (ver
// login/page.tsx: KAN-76 "tratar cancelamento").
export async function appleSignIn(): Promise<{ idToken: string; state: string }> {
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Login com Apple não está disponível no momento.');
  }

  const { state, nonce } = await authApi.startAppleAuth();

  await loadAppleScript();

  window.AppleID!.auth.init({
    clientId,
    scope: 'email',
    redirectURI: window.location.origin,
    usePopup: true,
    nonce,
    state,
  });

  const response = await window.AppleID!.auth.signIn();
  // A Apple ecoa o `state` na resposta de autorização; se por algum motivo
  // não vier, usamos o que geramos localmente — o backend é quem faz a
  // comparação de verdade contra o cookie assinado.
  return { idToken: response.authorization.id_token, state: response.authorization.state ?? state };
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
