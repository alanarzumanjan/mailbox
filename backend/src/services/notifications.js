// Уведомления о критических событиях вне дашборда: email (Resend) и webhook
// (Slack/Teams/любой HTTP-приёмник). Подписаны на шину, сервисы о них не знают.
//
// Отправка в процессе, без очереди: при падении процесса в момент отправки
// письмо потеряется. Для прода следующий шаг — очередь (BullMQ/SQS) с ретраями.
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
      // Поле text понимают Slack и Teams; остальным пригодится event целиком.
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
    handle, // для тестов
  };
}
