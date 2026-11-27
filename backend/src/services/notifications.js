// Notifications about critical events outside the dashboard: email (Resend) and webhook
// (Slack/Teams/any HTTP receiver). Subscribed to the bus; services don't know about them.
//
// Sent in-process without a queue: if the process dies mid-send, the message
// is lost. Next step for production: a queue (BullMQ/SQS) with retries.
import { bus, TOPICS } from "../lib/bus.js";
import { logger } from "../lib/logger.js";
import { User } from "../models/User.js";
import { Box } from "../models/Box.js";

const NOTIFY_TYPES = new Set(["critical"]);
const TIMEOUT_MS = 5000;

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
}

function describe(event, box) {
  const where = box ? `${box.name} (${event.boxId}), ${box.address}` : event.boxId;
  return { subject: `[EmptyLess] ${event.message}`, text: `${event.message}\n\nPostbox: ${where}\nTime: ${event.createdAt}` };
}

export function createNotifier({ resendApiKey, fromEmail, webhookUrl }) {
  const channels = [];

  if (resendApiKey) {
    channels.push(async (event, box) => {
      const recipients = await User.find({
        active: true, notifyEmail: true, role: { $in: ["admin", "dispatcher"] },
      }).select("email").lean();
      if (recipients.length === 0) return;
      const { subject, text } = describe(event, box);
      await postJson(
        "https://api.resend.com/emails",
        { from: fromEmail, to: recipients.map((r) => r.email), subject, text },
        { Authorization: `Bearer ${resendApiKey}` },
      );
    });
  }

  if (webhookUrl) {
    channels.push(async (event, box) => {
      const { text } = describe(event, box);
      // Slack and Teams read the text field; other receivers get the full event.
      await postJson(webhookUrl, { text, event, box });
    });
  }

  async function handle(event) {
    if (!NOTIFY_TYPES.has(event.type) || channels.length === 0) return;
    const box = await Box.findById(event.boxId).lean().catch(() => null);
    const results = await Promise.allSettled(channels.map((send) => send(event, box)));
    for (const r of results) {
      if (r.status === "rejected") logger.error({ err: r.reason, eventId: event.id }, "notification failed");
    }
  }

  const listener = (event) => void handle(event);
  return {
    channels: channels.length,
    start: () => bus.on(TOPICS.EVENT_CREATED, listener),
    stop: () => bus.off(TOPICS.EVENT_CREATED, listener),
    handle, // for tests
  };
}
