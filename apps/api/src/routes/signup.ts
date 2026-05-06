import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { signConfirmation, type PenSlug } from "../lib/jwt.js";
import { sendConfirmationEmail } from "../lib/email.js";
import { upsertSubscriber } from "../lib/listmonk.js";
import { config } from "../config.js";

const prisma = new PrismaClient();

const PEN_TO_DB = {
  "alexi-hart": "ALEXI_HART",
  "alexandra-knight": "ALEXANDRA_KNIGHT"
} as const;

const schema = z.object({
  email: z.string().email().max(254),
  pen: z.enum(["alexi-hart", "alexandra-knight"])
});

export const signupRouter: Router = Router();

signupRouter.post("/signup", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload", issues: parsed.error.format() });
    return;
  }
  const { email, pen } = parsed.data;
  const penSlug = pen as PenSlug;

  try {
    const listmonkId = await upsertSubscriber(email, penSlug);
    const subscriber = await prisma.subscriber.upsert({
      where: { email_penName: { email, penName: PEN_TO_DB[penSlug] } },
      create: {
        email,
        penName: PEN_TO_DB[penSlug],
        listmonkSubscriberId: listmonkId ?? undefined
      },
      update: { listmonkSubscriberId: listmonkId ?? undefined }
    });

    const token = signConfirmation({ email, pen: penSlug, sub: subscriber.id });
    const confirmUrl = `${config.siteUrls[penSlug]}/members/welcome?token=${encodeURIComponent(token)}`;
    await sendConfirmationEmail({ to: email, pen: penSlug, confirmUrl });

    res.json({ ok: true, message: "Confirmation email sent." });
  } catch (err) {
    console.error("[signup]", err);
    res.status(500).json({ error: "signup_failed" });
  }
});
