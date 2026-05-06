import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { signSession, verify, sessionCookieOptions, SESSION_COOKIE, type ConfirmationPayload } from "../lib/jwt.js";
import { markConfirmed } from "../lib/listmonk.js";
import { config } from "../config.js";

const prisma = new PrismaClient();

const PEN_TO_DB = {
  "alexi-hart": "ALEXI_HART",
  "alexandra-knight": "ALEXANDRA_KNIGHT"
} as const;

export const confirmRouter: Router = Router();

// POST so the client can call it from the welcome page after extracting the
// token from the URL (avoids token leaking via referer headers on a GET).
confirmRouter.post("/confirm", async (req, res) => {
  const token = (req.body?.token as string | undefined) ?? "";
  if (!token) {
    res.status(400).json({ error: "missing_token" });
    return;
  }

  let payload: ConfirmationPayload;
  try {
    payload = verify<ConfirmationPayload>(token, "confirm");
  } catch (err) {
    res.status(400).json({ error: "invalid_or_expired_token" });
    return;
  }

  try {
    const subscriber = await prisma.subscriber.update({
      where: { id: payload.sub },
      data: { confirmedAt: new Date() }
    });
    if (subscriber.listmonkSubscriberId) {
      await markConfirmed(subscriber.listmonkSubscriberId).catch((e) =>
        console.warn("[confirm] listmonk mark failed", e)
      );
    }

    const session = signSession({ email: payload.email, pen: payload.pen, sub: payload.sub });
    res.cookie(SESSION_COOKIE, session, sessionCookieOptions());
    res.json({
      ok: true,
      magnet_url: config.magnetUrls[payload.pen] ?? null
    });
  } catch (err) {
    console.error("[confirm]", err);
    res.status(500).json({ error: "confirm_failed" });
  }
});
