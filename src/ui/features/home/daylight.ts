/**
 * Position of a moment inside its day, as a 0…1 fraction.
 *
 * Used by the home halo: the arc fills from midnight to now, so the graphic
 * answers "how much of the day is left" instead of being pure decoration.
 */
export function dayProgress(date: Date): number {
  const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  return seconds / 86_400;
}
