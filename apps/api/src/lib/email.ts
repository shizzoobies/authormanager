import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config.js";
import type { PenSlug } from "./jwt.js";

interface SendArgs {
  to: string;
  pen: PenSlug;
  confirmUrl: string;
}

const SUBJECTS: Record<PenSlug, string> = {
  "alexi-hart": "Confirm your spot on the reader list",
  "alexandra-knight": "Step into the Inner Circle"
};

const BODIES: Record<PenSlug, (url: string) => string> = {
  "alexi-hart": (url) => `Hi friend,

Thanks for joining my reader list! Click the link below to confirm and get your bonus story.

${url}

This link expires in 24 hours. If you didn't sign up, you can ignore this email.

Talk soon,
Alexi`,
  "alexandra-knight": (url) => `Welcome to the shadows.

Click below to confirm your subscription and unlock the prequel novella.

${url}

This link expires in 24 hours. If you didn't request this, simply close this message.

Alexandra`
};

const FROM_BY_PEN: Record<PenSlug, string> = {
  "alexi-hart": config.emailFrom["alexi-hart"],
  "alexandra-knight": config.emailFrom["alexandra-knight"]
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!config.smtp.host || !config.smtp.user) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: !config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass }
  });
  return transporter;
}

export async function sendConfirmationEmail({ to, pen, confirmUrl }: SendArgs): Promise<void> {
  const subject = SUBJECTS[pen];
  const text = BODIES[pen](confirmUrl);
  const from = FROM_BY_PEN[pen];

  const tx = getTransporter();
  if (!tx) {
    console.log(
      `\n[email:dev]\n  to: ${to}\n  from: ${from}\n  pen: ${pen}\n  subject: ${subject}\n  body:\n${text}\n`
    );
    return;
  }

  await tx.sendMail({ from, to, subject, text });
}
