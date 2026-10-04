export function allocateVnd(
  total: number,
  weights: { id: string; weight: number }[],
): Record<string, number> {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    weights.some((w) => !Number.isSafeInteger(w.weight) || w.weight < 0) ||
    new Set(weights.map((w) => w.id)).size !== weights.length
  )
    throw Error("Số tiền không hợp lệ");
  const sum = weights.reduce((s, w) => s + BigInt(w.weight), 0n);
  if (sum === 0n && total > 0) throw Error("Không có trọng số");
  const result: Record<string, number> = {};
  let used = 0;
  const parts = weights
    .map((w) => {
      const product = BigInt(total) * BigInt(w.weight);
      const n = sum ? Number(product / sum) : 0;
      result[w.id] = n;
      used += n;
      return { ...w, remainder: sum ? product % sum : 0n };
    })
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.id.localeCompare(b.id)
        : a.remainder > b.remainder
          ? -1
          : 1,
    );
  for (let i = 0; i < total - used; i++) result[parts[i].id]++;
  return result;
}
export function splitBill(
  total: number,
  weights: { id: string; weight: number }[],
  covered: string[],
  sponsors: string[],
) {
  const ids = new Set(weights.map((w) => w.id));
  if (
    new Set(covered).size !== covered.length ||
    new Set(sponsors).size !== sponsors.length ||
    covered.some((id) => !ids.has(id) || sponsors.includes(id)) ||
    sponsors.some((id) => !ids.has(id)) ||
    (covered.length && !sponsors.length)
  )
    throw Error("Nhóm bao cơm không hợp lệ");
  const shares = allocateVnd(total, weights);
  const extra = covered.reduce((s, id) => s + shares[id], 0);
  covered.forEach((id) => (shares[id] = 0));
  const sponsorShares = allocateVnd(
    extra,
    sponsors.map((id) => ({ id, weight: 1 })),
  );
  for (const id of sponsors) shares[id] += sponsorShares[id];
  return shares;
}
