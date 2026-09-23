import { Injectable, effect, inject, signal } from '@angular/core';
import { ProfileService } from './profile.service';

export interface Habit {
  id: string;
  name: string;
  color: string;
}

const HABITS_KEY = 'habit-tracker-habits';
const LEGACY_COMBINED_KEY = 'habit-tracker-data';
const DEFAULT_HABIT_COLOR = '#4c8bf5';

/**
 * Holds the habit list on its own, separate from the habit-tracker's daily
 * checks. Split out so other features (e.g. diary topic notes) can resolve a
 * habit's name without depending on the tracker page/component.
 */
@Injectable({ providedIn: 'root' })
export class HabitService {
  private readonly profile = inject(ProfileService);

  // Captured once, see profile-switching notes on DiaryService/HabitTrackerComponent:
  // reading scopedKey() reactively would let a persistence effect copy the
  // current profile's habits into a newly selected profile on switch.
  private readonly storageKey = this.profile.scopedKey(HABITS_KEY);
  private readonly legacyCombinedKey = this.profile.scopedKey(LEGACY_COMBINED_KEY);

  readonly habits = signal<Habit[]>(this.loadHabits());

  constructor() {
    effect(() => {
      localStorage.setItem(this.storageKey, JSON.stringify(this.habits()));
    });
  }

  getHabit(id: string): Habit | undefined {
    return this.habits().find((h) => h.id === id);
  }

  habitName(id: string): string {
    return this.getHabit(id)?.name ?? '';
  }

  add(name: string, color: string): Habit {
    const habit: Habit = { id: crypto.randomUUID(), name, color };
    this.habits.update((habits) => [...habits, habit]);
    return habit;
  }

  updateColor(id: string, color: string) {
    this.habits.update((habits) => habits.map((h) => (h.id === id ? { ...h, color } : h)));
  }

  rename(id: string, name: string) {
    this.habits.update((habits) => habits.map((h) => (h.id === id ? { ...h, name } : h)));
  }

  remove(id: string) {
    this.habits.update((habits) => habits.filter((h) => h.id !== id));
  }

  private loadHabits(): Habit[] {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Habit[];
        return parsed.map((h) => ({ ...h, color: h.color ?? DEFAULT_HABIT_COLOR }));
      } catch {
        return [];
      }
    }
    // Migrate once from the old combined `{habits, checks}` blob.
    const legacyRaw = localStorage.getItem(this.legacyCombinedKey);
    if (!legacyRaw) {
      return [];
    }
    try {
      const parsed = JSON.parse(legacyRaw) as { habits?: Habit[] };
      return (parsed.habits ?? []).map((h) => ({ ...h, color: h.color ?? DEFAULT_HABIT_COLOR }));
    } catch {
      return [];
    }
  }
}
