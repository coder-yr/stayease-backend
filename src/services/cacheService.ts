import NodeCache from "node-cache";

export const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

export const cacheKey = (prefix: string, payload: Record<string, unknown>) => {
  const stable = Object.entries(payload)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${String(v)}`)
    .join("|");
  return `${prefix}:${stable}`;
};
