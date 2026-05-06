import { Router } from "express";
import { verify, sessionCookieOptions, SESSION_COOKIE, type SessionPayload } from "../lib/jwt.js";

export const membersRouter: Router = Router();

membersRouter.get("/members/access-check", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ ok: false });
    return;
  }
  try {
    const payload = verify<SessionPayload>(token, "session");
    res.json({ ok: true, email: payload.email, pen: payload.pen });
  } catch {
    res.status(401).json({ ok: false });
  }
});

membersRouter.post("/members/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.json({ ok: true });
});
