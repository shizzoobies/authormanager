export type PenSlug = "alexi-hart" | "alexandra-knight";

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
    request: <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>;
  };
  anthropic: {
    getConfig: () => Promise<{ hasKey: boolean }>;
    setKey: (key: string) => Promise<boolean>;
    draftNewsletter: (args: { pen: PenSlug; notes: string }) => Promise<{
      subject: string;
      body: string;
    }>;
  };
  github: {
    getConfig: () => Promise<{ hasToken: boolean }>;
    setToken: (token: string) => Promise<boolean>;
    putFile: (args: {
      pen: PenSlug;
      path: string;
      contentBase64: string;
      message: string;
    }) => Promise<unknown>;
    getFile: (args: { pen: PenSlug; path: string }) => Promise<
      { sha: string; content: string } | null
    >;
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
