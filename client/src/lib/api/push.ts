import { authenticatedClientFetch } from "./authenticated-client";

export async function subscribeToPush(subscription: PushSubscriptionJSON): Promise<void> {
  await authenticatedClientFetch<void>("/api/v1/push/subscribe/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await authenticatedClientFetch<void>("/api/v1/push/subscribe/", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}
