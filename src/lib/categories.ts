import type { Exercise } from '../db/schema';

/** Muscle-group categories, in display order. "General" is the catch-all. */
export const CATEGORIES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full body', 'General'] as const;

export type Category = (typeof CATEGORIES)[number];

/** Exercises created before categories existed have none: they count as General. */
export const categoryOf = (e: Pick<Exercise, 'category'>): Category =>
  e.category && (CATEGORIES as readonly string[]).includes(e.category) ? (e.category as Category) : 'General';

/** Group exercises by category in display order, skipping empty groups. */
export function groupByCategory<T extends Pick<Exercise, 'category'>>(items: T[]) {
  return CATEGORIES.map((category) => ({ category, items: items.filter((e) => categoryOf(e) === category) })).filter(
    (g) => g.items.length,
  );
}
