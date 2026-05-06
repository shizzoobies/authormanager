import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type PenSlug = "alexi-hart" | "alexandra-knight";

export interface ConfirmationPayload {
  kind: "confirm";
  email: string;
  pen: PenSlug;
  sub: string;
}

export interface SessionPayload {
  kind: "session";
  email: string;
  pen: PenSlug;
  sub: string;
}

export type AnyPayload = ConfirmationPayload | SessionPayload;

const CONFIRM_TTL = "24h";
const SESSION_TTL = "180d";

export function signConfirmation(p: Omit<ConfirmationPayload, "kind">): string {
  return jwt.sign({ ...p, kind: "confirm" }, config.jwtSecret, { expiresIn: CONFIRM_TTL });
}

export function signSession(p: Omit<SessionPayload, "kind">): string {
  return jwt.sign({ ...p, kind: "session" }, config.jwtSecret, { expiresIn: SESSION_TTL });
}

export function verify<T extends AnyPayload>(token: string, expectedKind: T["kind"]): T {
  const decoded = jwt.verify(token, config.jwtSecret) as AnyPayload;
  if (decoded.kind !== expectedKind) {
    throw new Error(`Token kind mismatch: expected ${expectedKind}, got ${decoded.kind}`);
  }
  return decoded as T;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "none" as const,
    maxAge: 1000 * 60 * 60 * 24 * 180,
    path: "/",
    ...(config.jwtCookieDomain ? { domain: config.jwtCookieDomain } : {})
  };
}

export const SESSION_COOKIE = "author_session";
