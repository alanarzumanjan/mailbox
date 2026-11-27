// Courier visiting order (open route: starts at the depot, no return).
//
// Up to EXACT_LIMIT stops: exact Held-Karp (bitmask DP),
// O(n^2 * 2^n), 12 stops take milliseconds. Beyond that: nearest neighbour
// + 2-opt improvement, not guaranteed optimal but fast for any n.
//
// Only the ORDER is solved here. The road geometry is still drawn by the
// frontend via OSRM (components/MapView.js).

import { haversineKm } from "./geo.js";

export const EXACT_LIMIT = 12;

const round2 = (x) => Math.round(x * 100) / 100;

function distanceMatrix(nodes) {
  return nodes.map((a) => nodes.map((b) => haversineKm(a, b)));
}

function pathLength(order, dist) {
  // order holds node indices, 0 = depot
  let total = 0;
  for (let i = 1; i < order.length; i++) total += dist[order[i - 1]][order[i]];
  return total;
}

function heldKarp(dist, n) {
  // Stops are indices 1..n in dist, 0 is the depot.
  const FULL = (1 << n) - 1;
  const dp = Array.from({ length: 1 << n }, () => new Float64Array(n).fill(Infinity));
  const parent = Array.from({ length: 1 << n }, () => new Int8Array(n).fill(-1));

  for (let i = 0; i < n; i++) dp[1 << i][i] = dist[0][i + 1];

  for (let mask = 1; mask <= FULL; mask++) {
    for (let i = 0; i < n; i++) {
      const cur = dp[mask][i];
      if (cur === Infinity || !(mask & (1 << i))) continue;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        const next = mask | (1 << j);
        const cand = cur + dist[i + 1][j + 1];
        if (cand < dp[next][j]) {
          dp[next][j] = cand;
          parent[next][j] = i;
        }
      }
    }
  }

  let end = 0;
  for (let i = 1; i < n; i++) if (dp[FULL][i] < dp[FULL][end]) end = i;

  const order = [];
  for (let mask = FULL, cur = end; cur !== -1; ) {
    order.push(cur + 1);
    const prev = parent[mask][cur];
    mask ^= 1 << cur;
    cur = prev;
  }
  return [0, ...order.reverse()];
}

function nearestNeighbourTwoOpt(dist, n) {
  const visited = new Set([0]);
  const order = [0];
  while (order.length <= n) {
    const last = order[order.length - 1];
    let best = -1;
    for (let j = 1; j <= n; j++) {
      if (!visited.has(j) && (best === -1 || dist[last][j] < dist[last][best])) best = j;
    }
    visited.add(best);
    order.push(best);
  }

  // 2-opt: reverse segments while that shortens the path. The depot (position 0) stays put.
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const a = order[i - 1], b = order[i], c = order[k];
        const d = k + 1 < order.length ? order[k + 1] : null;
        const before = dist[a][b] + (d === null ? 0 : dist[c][d]);
        const after = dist[a][c] + (d === null ? 0 : dist[b][d]);
        if (after < before - 1e-9) {
          order.splice(i, k - i + 1, ...order.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return order;
}

// points: [{ id, lat, lng }], depot: { lat, lng }
export function optimizeRoute(points, depot) {
  if (points.length === 0) {
    return { order: [], legsKm: [], totalDistanceKm: 0, algorithm: "none" };
  }

  const nodes = [depot, ...points];
  const dist = distanceMatrix(nodes);
  const n = points.length;
  const exact = n <= EXACT_LIMIT;
  const idx = exact ? heldKarp(dist, n) : nearestNeighbourTwoOpt(dist, n);

  const legsKm = [];
  for (let i = 1; i < idx.length; i++) legsKm.push(round2(dist[idx[i - 1]][idx[i]]));

  return {
    order: idx.slice(1).map((i) => points[i - 1].id),
    legsKm,
    totalDistanceKm: round2(pathLength(idx, dist)),
    algorithm: exact ? "held-karp" : "nearest-neighbour+2opt",
  };
}
