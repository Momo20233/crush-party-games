export function secureIndex(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 0x100000000) {
    throw new RangeError("max must be a positive integer no greater than 2^32");
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const limit = Math.floor(0x100000000 / max) * max;
    const values = new Uint32Array(1);
    do crypto.getRandomValues(values); while (values[0] >= limit);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function randomItem<T>(items: readonly T[]): T {
  if (items.length === 0) throw new RangeError("items cannot be empty");
  return items[secureIndex(items.length)];
}

export function drawWithoutRepeat(allIds: readonly number[], remainingIds: number[]): number {
  if (allIds.length === 0) throw new RangeError("allIds cannot be empty");
  if (remainingIds.length === 0) remainingIds.push(...allIds);
  const choiceIndex = secureIndex(remainingIds.length);
  const [id] = remainingIds.splice(choiceIndex, 1);
  return id;
}
