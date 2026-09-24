// 🔍 KAN-15 (KAN-74): carrega o Google Identity Services (GIS) sob demanda e
// expõe um único ponto de entrada para disparar o login. O backend nunca
// confia em nada que venha daqui — só usamos isto para obter o `credential`
// (ID token assinado pelo Google), que o backend re-verifica do zero
// (ver apps/backend/.../providers/google.provider.ts).
const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  prompt(momentListener?: (notification: unknown) => void): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Login com Google só está disponível no navegador.'));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error('Não foi possível carregar o Google Login. Verifique sua conexão.'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

// 🚪 Ponto de entrada único: inicializa o GIS (se preciso) e exibe o prompt
// de login. `onCredential` só é chamado quando o usuário completa o fluxo
// com sucesso — cancelamento/fechamento do prompt não gera erro nenhum,
// só nunca invoca o callback (ver KAN-74: "tratar cancelamento sem erro").
export async function promptGoogleSignIn(onCredential: (idToken: string) => void): Promise<void> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Login com Google não está disponível no momento.');
  }

  await loadGsiScript();

  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
  });

  window.google!.accounts.id.prompt();
}
