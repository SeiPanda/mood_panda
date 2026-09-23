import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ProfileService } from './profile.service';

export interface DiaryEntry {
  date: string;
  title: string;
  text: string;
  updatedAt: number;
  /** Per-habit notes for this day, keyed by habit id. */
  topics?: Record<string, string>;
}

const STORAGE_KEY = 'diary-entries';
const EXTRA_PERIODS_KEY = 'diary-extra-periods';

interface ExtraPeriods {
  years: number[];
  months: Record<number, number[]>;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable({ providedIn: 'root' })
export class DiaryService {
  private readonly profile = inject(ProfileService);

  // Captured once. Switching profiles triggers a full page reload, so the
  // scoped keys never change during a session. If they stayed reactive, the
  // persistence effects below would re-run on switch and write the current
  // profile's in-memory data into the newly selected profile's key.
  private readonly storageKey = this.profile.scopedKey(STORAGE_KEY);
  private readonly extraPeriodsKey = this.profile.scopedKey(EXTRA_PERIODS_KEY);

  private readonly entriesMap = signal<Record<string, DiaryEntry>>(this.loadEntries());
  private readonly extraPeriods = signal<ExtraPeriods>(this.loadExtraPeriods());

  readonly entries = computed(() =>
    Object.values(this.entriesMap()).sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly years = computed(() => {
    const years = new Set<number>(this.extraPeriods().years);
    for (const entry of this.entries()) {
      years.add(Number(entry.date.slice(0, 4)));
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  constructor() {
    effect(() => {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entriesMap()));
    });
    effect(() => {
      localStorage.setItem(this.extraPeriodsKey, JSON.stringify(this.extraPeriods()));
    });

    const now = new Date();
    this.addYear(now.getFullYear());
    this.addMonth(now.getFullYear(), now.getMonth() + 1);
  }

  monthsForYear(year: number): number[] {
    const months = new Set<number>(this.extraPeriods().months[year] ?? []);
    for (const entry of this.entries()) {
      if (Number(entry.date.slice(0, 4)) === year) {
        months.add(Number(entry.date.slice(5, 7)));
      }
    }
    return Array.from(months).sort((a, b) => b - a);
  }

  entriesForMonth(year: number, month: number): DiaryEntry[] {
    const prefix = `${year}-${`${month}`.padStart(2, '0')}`;
    return this.entries().filter((entry) => entry.date.startsWith(prefix));
  }

  addYear(year: number) {
    this.extraPeriods.update((periods) =>
      periods.years.includes(year) ? periods : { ...periods, years: [...periods.years, year] },
    );
  }

  addMonth(year: number, month: number) {
    this.addYear(year);
    this.extraPeriods.update((periods) => {
      const existing = periods.months[year] ?? [];
      if (existing.includes(month)) {
        return periods;
      }
      return { ...periods, months: { ...periods.months, [year]: [...existing, month] } };
    });
  }

  private loadEntries(): Record<string, DiaryEntry> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw) as Record<string, DiaryEntry>;
    } catch {
      return {};
    }
  }

  private loadExtraPeriods(): ExtraPeriods {
    const raw = localStorage.getItem(this.extraPeriodsKey);
    if (!raw) {
      return { years: [], months: {} };
    }
    try {
      const parsed = JSON.parse(raw) as ExtraPeriods;
      return { years: parsed.years ?? [], months: parsed.months ?? {} };
    } catch {
      return { years: [], months: {} };
    }
  }

  getEntry(dateKey: string): DiaryEntry | undefined {
    return this.entriesMap()[dateKey];
  }

  hasEntry(dateKey: string): boolean {
    return !!this.entriesMap()[dateKey];
  }

  saveEntry(dateKey: string, title: string, text: string) {
    this.entriesMap.update((map) => {
      const entry: DiaryEntry = {
        date: dateKey,
        title,
        text,
        updatedAt: Date.now(),
        topics: map[dateKey]?.topics,
      };
      return { ...map, [dateKey]: entry };
    });
  }

  getTopicEntry(dateKey: string, habitId: string): string {
    return this.entriesMap()[dateKey]?.topics?.[habitId] ?? '';
  }

  hasTopicEntry(dateKey: string, habitId: string): boolean {
    return !!this.entriesMap()[dateKey]?.topics?.[habitId];
  }

  saveTopicEntry(dateKey: string, habitId: string, text: string) {
    this.entriesMap.update((map) => {
      const existing = map[dateKey];
      const topics = { ...(existing?.topics ?? {}) };
      if (text) {
        topics[habitId] = text;
      } else {
        delete topics[habitId];
      }
      const entry: DiaryEntry = {
        date: dateKey,
        title: existing?.title ?? '',
        text: existing?.text ?? '',
        updatedAt: Date.now(),
        topics: Object.keys(topics).length > 0 ? topics : undefined,
      };
      return { ...map, [dateKey]: entry };
    });
  }

  /** Strips a removed habit's notes out of every diary entry that has one. */
  removeHabitTopics(habitId: string) {
    this.entriesMap.update((map) => {
      const result: Record<string, DiaryEntry> = { ...map };
      for (const [key, entry] of Object.entries(map)) {
        if (!entry.topics || !(habitId in entry.topics)) {
          continue;
        }
        const topics = { ...entry.topics };
        delete topics[habitId];
        result[key] = { ...entry, topics: Object.keys(topics).length > 0 ? topics : undefined };
      }
      return result;
    });
  }
}
