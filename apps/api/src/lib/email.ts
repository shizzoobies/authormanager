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

export async function sendConfirmationEmail({ to, pen, confirmUrl }: SendArgs): Promise<void> {
  const subject = SUBJECTS[pen];
  const body = BODIES[pen](confirmUrl);

  if (!config.listmonkUrl || !config.listmonkUser) {
    // Dev fallback: log to console so the developer can click the link.
    console.log(
      `\n[email:dev]\n  to: ${to}\n  pen: ${pen}\n  subject: ${subject}\n  body: ${body}\n`
    );
    return;
  }

  // Listmonk transactional API. Requires a tx template named after the pen.
  const templateName = `confirm-${pen}`;
  const res = await fetch(`${config.listmonkUrl}/api/tx`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization:
        "Basic " +
        Buffer.from(`${config.listmonkUser}:${config.listmonkToken}`).toString("base64")
    },
    body: JSON.stringify({
      subscriber_email: to,
      template_id: templateName,
      data: { confirm_url: confirmUrl, subject, body }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`listmonk tx send failed: ${res.status} ${text}`);
  }
}
