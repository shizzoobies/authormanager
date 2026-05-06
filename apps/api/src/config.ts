import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const smtpPort = Number(process.env.SMTP_PORT ?? 2587);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd: process.env.NODE_ENV === "production",
  jwtSecret: process.env.JWT_SECRET ?? "dev_secret_replace_me",
  jwtCookieDomain: process.env.JWT_COOKIE_DOMAIN ?? undefined,
  listmonkUrl: process.env.LISTMONK_URL ?? "",
  listmonkUser: process.env.LISTMONK_API_USER ?? "",
  listmonkToken: process.env.LISTMONK_API_TOKEN ?? "",
  listmonkLists: {
    "alexi-hart": Number(process.env.LISTMONK_LIST_ALEXI_HART ?? 0),
    "alexandra-knight": Number(process.env.LISTMONK_LIST_ALEXANDRA_KNIGHT ?? 0)
  },
  siteUrls: {
    "alexi-hart": process.env.ALEXI_HART_DOMAIN ?? "https://alexi-hart.pages.dev",
    "alexandra-knight": process.env.ALEXANDRA_KNIGHT_DOMAIN ?? "https://alexandra-knight.pages.dev"
  },
  magnetUrls: {
    "alexi-hart": process.env.MAGNET_URL_ALEXI_HART ?? "",
    "alexandra-knight": process.env.MAGNET_URL_ALEXANDRA_KNIGHT ?? ""
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: smtpPort,
    secure: smtpPort === 465 || smtpPort === 2465,
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? ""
  },
  emailFrom: {
    "alexi-hart": process.env.EMAIL_FROM_ALEXI_HART ?? "Alexi Hart <hello@alexihart.com>",
    "alexandra-knight":
      process.env.EMAIL_FROM_ALEXANDRA_KNIGHT ?? "Alexandra Knight <hello@alex-knight.com>"
  },
  required
};

function parseCsv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const ALLOWED_ORIGINS = Array.from(
  new Set([
    config.siteUrls["alexi-hart"],
    config.siteUrls["alexandra-knight"],
    ...parseCsv("EXTRA_ORIGINS"),
    "http://localhost:4321",
    "http://localhost:4322"
  ])
);
