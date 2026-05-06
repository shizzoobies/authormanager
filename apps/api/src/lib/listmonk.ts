import { config } from "../config.js";
import type { PenSlug } from "./jwt.js";

interface ListmonkSubscriberPayload {
  email: string;
  name: string;
  status: "enabled" | "disabled" | "blocklisted";
  lists: number[];
  preconfirm_subscriptions?: boolean;
}

interface ListmonkSubscriberResponse {
  data: { id: number; email: string; status: string };
}

function authHeader(): string {
  // Listmonk supports basic auth with API user + token.
  return "Basic " + Buffer.from(`${config.listmonkUser}:${config.listmonkToken}`).toString("base64");
}

export async function upsertSubscriber(email: string, pen: PenSlug): Promise<number | null> {
  if (!config.listmonkUrl || !config.listmonkUser) {
    console.warn("[listmonk] no credentials configured; skipping upsert");
    return null;
  }
  const listId = config.listmonkLists[pen];
  if (!listId) {
    console.warn(`[listmonk] no list id configured for pen ${pen}`);
    return null;
  }

  const payload: ListmonkSubscriberPayload = {
    email,
    name: email.split("@")[0],
    status: "enabled",
    lists: [listId],
    preconfirm_subscriptions: false
  };

  const res = await fetch(`${config.listmonkUrl}/api/subscribers`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: authHeader() },
    body: JSON.stringify(payload)
  });

  if (res.status === 409) {
    // Subscriber exists. Look them up.
    const lookup = await fetch(
      `${config.listmonkUrl}/api/subscribers?query=email='${encodeURIComponent(email)}'`,
      { headers: { authorization: authHeader() } }
    );
    if (!lookup.ok) throw new Error(`listmonk lookup failed: ${lookup.status}`);
    const body = (await lookup.json()) as { data: { results: { id: number }[] } };
    return body.data.results[0]?.id ?? null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`listmonk upsert failed: ${res.status} ${text}`);
  }
  const body = (await res.json()) as ListmonkSubscriberResponse;
  return body.data.id;
}

export async function markConfirmed(subscriberId: number): Promise<void> {
  if (!config.listmonkUrl) return;
  await fetch(`${config.listmonkUrl}/api/subscribers/lists`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: authHeader() },
    body: JSON.stringify({
      ids: [subscriberId],
      action: "add",
      target_list_ids: [],
      status: "confirmed"
    })
  });
}
