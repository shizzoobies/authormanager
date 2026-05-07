export interface AuthorBridge {
  auth: {
    status: () => Promise<{ hasPassword: boolean }>;
    setPassword: (password: string) => Promise<boolean>;
    verify: (password: string) => Promise<boolean>;
  };
  listmonk: {
    getConfig: () => Promise<{ url: string; user: string; hasToken: boolean }>;
    setConfig: (cfg: { url: string; user: string; token: string }) => Promise<boolean>;
    fetch: <T = unknown>(path: string) => Promise<T>;
  };
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertextB64: string) => Promise<string>;
}

declare global {
  interface Window {
    authorBridge: AuthorBridge;
  }
}

export const bridge: AuthorBridge = window.authorBridge;
