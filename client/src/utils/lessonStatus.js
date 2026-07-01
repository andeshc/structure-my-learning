// Derives the badge for a single lesson within a guide's full, position-ordered
// item list. "Next up" is computed (first incomplete lesson), not stored, so it
// naturally stays put when a later lesson is completed out of order.
export function lessonBadge(flatItems, item) {
  if (item.isCompleted) return 'completed';
  if (item.inProgress) return 'in-progress';
  const firstIncomplete = flatItems.find((i) => !i.isCompleted);
  if (firstIncomplete === item) return 'next-up';
  return null;
}
