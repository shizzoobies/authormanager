export type PenName = "alexi-hart" | "alexandra-knight";

export interface HealthResponse {
  status: "ok";
  service: string;
  time: string;
}

export class AuthorApiClient {
  constructor(private readonly baseUrl: string, private readonly token?: string) {}

  private headers(): HeadersInit {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (this.token) h.authorization = `Bearer ${this.token}`;
    return h;
  }

  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/health`, { headers: this.headers() });
    if (!res.ok) throw new Error(`health check failed: ${res.status}`);
    return res.json() as Promise<HealthResponse>;
  }
}
