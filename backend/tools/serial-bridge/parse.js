// Разбор строки, которую Arduino печатает в Serial.
// Понимает три формата, чтобы не зависеть от того, как написан скетч:
//
//   {"weight":1850,"distance":120,"battery":86}     — JSON (рекомендуемый)
//   1850,120                                         — CSV: weight,distance[,battery]
//   Weight: 1850 g | Distance: 12.0 cm               — человекочитаемый вывод
//
// Возвращает { weight, distance?, battery? } в граммах и миллиметрах, либо null.

const num = (v) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

function normalise({ weight, distance, battery }) {
  if (weight === undefined) return null;
  const out = { weight: Math.max(0, Math.round(weight)) }; // отрицательный вес после тары — шум
  if (distance !== undefined) out.distance = Math.max(0, Math.round(distance));
  if (battery !== undefined) out.battery = Math.min(100, Math.max(0, Math.round(battery)));
  return out;
}

export function parseLine(raw) {
  const line = raw.trim();
  if (!line) return null;

  if (line.startsWith("{")) {
    try {
      const o = JSON.parse(line);
      return normalise({ weight: num(o.weight ?? o.w), distance: num(o.distance ?? o.d), battery: num(o.battery ?? o.b) });
    } catch {
      return null;
    }
  }

  if (/^-?\d+(\.\d+)?(\s*[,;]\s*-?\d+(\.\d+)?){0,2}$/.test(line)) {
    const [w, d, b] = line.split(/\s*[,;]\s*/).map(num);
    return normalise({ weight: w, distance: d, battery: b });
  }

  // "Weight: 1850 g  Distance: 12 cm" — ищем числа после ключевых слов
  const pick = (re) => {
    const m = re.exec(line);
    return m ? { value: num(m[1]), unit: (m[2] ?? "").toLowerCase() } : null;
  };
  const w = pick(/(?:\bweight|вес|\bw)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)\s*(kg|g|кг|г)?/i);
  const d = pick(/(?:\bdistance|\bdist|расстояние|\bd)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)\s*(cm|mm|см|мм)?/i);
  const b = pick(/(?:\bbattery|\bbatt|заряд|\bb)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  if (!w) return null;

  const weight = w.unit === "kg" || w.unit === "кг" ? w.value * 1000 : w.value;
  const distance = d ? (d.unit === "cm" || d.unit === "см" ? d.value * 10 : d.value) : undefined;
  return normalise({ weight, distance, battery: b?.value });
}

/**
 * Стоит ли отправлять показание: изменилось заметно или давно не отправляли.
 * Экономит трафик и батарею в реальном устройстве и не спамит API.
 */
export function shouldSend(prev, next, { minWeightDeltaG = 10, minDistanceDeltaMm = 5, maxSilenceMs = 60_000 }, now = Date.now()) {
  if (!prev) return true;
  if (now - prev.at >= maxSilenceMs) return true;
  if (Math.abs(next.weight - prev.reading.weight) >= minWeightDeltaG) return true;
  if (next.distance != null && prev.reading.distance != null &&
      Math.abs(next.distance - prev.reading.distance) >= minDistanceDeltaMm) return true;
  return false;
}
