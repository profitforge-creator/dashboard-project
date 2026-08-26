/** Which index in an ordered, cyclic list is "today", given a pinned anchor day/index. */
export function computeRotationTodayIndex(numDays: number, anchorDate: string | null, anchorIndex: number | null, todayISO: string): number | null {
  if (numDays <= 0) return null;
  if (!anchorDate || anchorIndex == null) return 0;
  const diffDays = Math.round((Date.parse(todayISO + "T00:00:00") - Date.parse(anchorDate + "T00:00:00")) / 86400000);
  return (((anchorIndex + diffDays) % numDays) + numDays) % numDays;
}
