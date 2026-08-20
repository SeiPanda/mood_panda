import { Injectable, computed, effect, signal } from '@angular/core';

export interface DiaryEntry {
  date: string;
  title: string;
  text: string;
  updatedAt: number;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entriesMap()));
    });
    effect(() => {
      localStorage.setItem(EXTRA_PERIODS_KEY, JSON.stringify(this.extraPeriods()));
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
    const raw = localStorage.getItem(STORAGE_KEY);
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
    const raw = localStorage.getItem(EXTRA_PERIODS_KEY);
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
    const entry: DiaryEntry = { date: dateKey, title, text, updatedAt: Date.now() };
    this.entriesMap.update((map) => ({ ...map, [dateKey]: entry }));
  }
}
