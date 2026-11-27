// Dashboard realtime via Server-Sent Events.
// SSE rather than WebSocket: the stream is one-way (server → browser), runs over
// plain HTTP, reconnects by itself in the browser (EventSource) and needs no
// separate server.
//
//   const es = new EventSource(`${API}/api/stream?access_token=${token}`);
//   es.addEventListener("box.updated", (e) => updateBox(JSON.parse(e.data)));
//   es.addEventListener("event.created", (e) => pushEvent(JSON.parse(e.data)));
import { Router } from "express";
import { authenticateStream, ROLE } from "../middleware/auth.js";
import { registry } from "../lib/openapi.js";
import { bus, TOPICS } from "../lib/bus.js";

const HEARTBEAT_MS = 25_000; // keeps the connection alive through proxies and load balancers

export function createStreamRouter({ heartbeatMs = HEARTBEAT_MS } = {}) {
  const router = Router();

  registry.registerPath({
    method: "get",
    path: "/api/stream",
    tags: ["Realtime"],
    summary: "Live updates (text/event-stream): box.updated, event.created, pickup.created",
    description:
      "EventSource cannot set headers, so pass the access token as ?access_token=. " +
      "The stream starts with a 'ready' event; ': ping' comments keep the connection alive.",
    responses: { 200: { description: "Event stream", content: { "text/event-stream": { schema: { type: "string" } } } } },
  });

  router.get("/", authenticateStream, ROLE.staff, (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // stop nginx from buffering the stream
    });
    res.write("retry: 5000\n\n");

    const send = (topic, payload) => {
      res.write(`event: ${topic}\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    send("ready", { user: req.user.id, role: req.user.role });

    const listeners = Object.values(TOPICS).map((topic) => {
      const fn = (payload) => send(topic, payload);
      bus.on(topic, fn);
      return [topic, fn];
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), heartbeatMs);

    req.on("close", () => {
      clearInterval(heartbeat);
      for (const [topic, fn] of listeners) bus.off(topic, fn);
    });
  });

  return router;
}
