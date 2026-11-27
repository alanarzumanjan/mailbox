// Внутренняя шина доменных событий. Сервисы публикуют факты
// ("ящик обновлён", "создано событие"), а подписчики (SSE, уведомления)
// реагируют, не зная друг о друге.
//
// Работает в пределах одного процесса. Для нескольких инстансов API
// заменяется на MongoDB change streams или Redis pub/sub без изменения сервисов.
import { EventEmitter } from "node:events";

export const bus = new EventEmitter();
bus.setMaxListeners(1000); // по слушателю на каждое открытое SSE-подключение

export const TOPICS = Object.freeze({
  BOX_UPDATED: "box.updated",
  EVENT_CREATED: "event.created",
  PICKUP_CREATED: "pickup.created",
});
