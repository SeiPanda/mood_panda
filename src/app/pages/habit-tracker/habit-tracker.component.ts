import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HabitColorPickerComponent } from './habit-color-picker/habit-color-picker.component';
import { DiaryService, toDateKey } from '../../services/diary.service';
import { DiaryOverlayService } from '../../services/diary-overlay.service';
import { HabitService } from '../../services/habit.service';
import { ProfileService } from '../../services/profile.service';

type ChecksByMonth = Record<string, Record<string, boolean[]>>;

const STORAGE_KEY = 'habit-tracker-data';
const SHOW_WEEKDAYS_KEY = 'habit-tracker-show-weekdays';

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DEFAULT_HABIT_COLOR = '#4c8bf5';

// Donut circles are drawn with r=20 in the template's 48x48 viewBox.
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 20;

function countTrue(checks: boolean[] | undefined, limit: number): number {
  if (!checks) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < limit && i < checks.length; i++) {
    if (checks[i]) {
      count++;
    }
  }
  return count;
}

@Component({
  selector: 'app-habit-tracker',
  imports: [FormsModule, MatIconModule, HabitColorPickerComponent],
  templateUrl: './habit-tracker.component.html',
  styleUrls: ['./habit-tracker.component.scss'],
})
export class HabitTrackerComponent {
  private readonly diaryService = inject(DiaryService);
  private readonly diaryOverlayService = inject(DiaryOverlayService);
  private readonly habitService = inject(HabitService);
  private readonly profile = inject(ProfileService);

  // Captured once. Switching profiles reloads the page, so these keys never
  // change during a session; keeping them reactive would make the save
  // effects copy the current profile's data into the newly selected one.
  private readonly storageKey = this.profile.scopedKey(STORAGE_KEY);
  private readonly showWeekdaysKey = this.profile.scopedKey(SHOW_WEEKDAYS_KEY);

  private readonly today = new Date();

  private readonly viewDate = signal(
    new Date(this.today.getFullYear(), this.today.getMonth(), 1),
  );

  private readonly year = computed(() => this.viewDate().getFullYear());
  private readonly month = computed(() => this.viewDate().getMonth());

  private readonly monthKey = computed(() => `${this.year()}-${this.month()}`);
  private readonly daysInMonth = computed(() =>
    new Date(this.year(), this.month() + 1, 0).getDate(),
  );
  protected readonly days = computed(() =>
    Array.from({ length: this.daysInMonth() }, (_, i) => i + 1),
  );
  protected readonly isCurrentMonth = computed(
    () =>
      this.year() === this.today.getFullYear() && this.month() === this.today.getMonth(),
  );
  protected readonly currentDay = computed(() =>
    this.isCurrentMonth() ? this.today.getDate() : -1,
  );
  protected readonly monthLabel = computed(() =>
    this.viewDate().toLocaleDateString('de-DE', { month: 'long' }),
  );
  protected readonly prevMonthLabel = computed(() =>
    new Date(this.year(), this.month() - 1, 1).toLocaleDateString('de-DE', {
      month: 'long',
    }),
  );

  protected readonly view = signal<'tracker' | 'analysis'>('tracker');
  protected readonly showComparison = signal(false);
  protected readonly chartType = signal<'bars' | 'donut'>('bars');

  protected readonly showWeekdays = signal(this.loadShowWeekdays());

  protected readonly habits = this.habitService.habits;
  private readonly checksByMonth = signal<ChecksByMonth>(this.loadChecks());
  protected readonly checks = computed(() => this.checksByMonth()[this.monthKey()] ?? {});

  // Days of the viewed month that already have data: the whole month for past
  // months, only the days up to today for the current one. Used so the
  // previous-month comparison covers the same window.
  private readonly trackedDays = computed(() =>
    this.isCurrentMonth() ? this.today.getDate() : this.daysInMonth(),
  );

  private readonly prevMonthKey = computed(() => {
    const y = this.year();
    const m = this.month();
    return m === 0 ? `${y - 1}-11` : `${y}-${m - 1}`;
  });

  private readonly prevChecks = computed(
    () => this.checksByMonth()[this.prevMonthKey()] ?? {},
  );

  protected readonly monthlyStats = computed(() => {
    const checks = this.checks();
    const prevChecks = this.prevChecks();
    // Percentages are always relative to the whole month, per habit.
    const monthDays = this.daysInMonth();
    // The previous-month delta only compares the days that have elapsed, so a
    // month in progress isn't measured against a full one.
    const window = this.trackedDays();
    return this.habits().map((habit) => {
      const count = countTrue(checks[habit.id], monthDays);
      const windowCount = countTrue(checks[habit.id], window);
      const prevCount = countTrue(prevChecks[habit.id], window);
      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        count,
        percent: monthDays > 0 ? Math.round((count / monthDays) * 100) : 0,
        prevCount,
        prevPercent: monthDays > 0 ? Math.round((prevCount / monthDays) * 100) : 0,
        delta: windowCount - prevCount,
      };
    });
  });

  protected readonly monthlyTotals = computed(() => {
    const stats = this.monthlyStats();
    const possible = stats.length * this.daysInMonth();
    const count = stats.reduce((sum, s) => sum + s.count, 0);
    const prevCount = stats.reduce((sum, s) => sum + s.prevCount, 0);
    const delta = stats.reduce((sum, s) => sum + s.delta, 0);
    return {
      count,
      prevCount,
      possible,
      percent: possible > 0 ? Math.round((count / possible) * 100) : 0,
      delta,
    };
  });

  // Donut view shows one habit at a time; the user steps through them.
  protected readonly selectedHabitIndex = signal(0);

  protected readonly selectedStat = computed(() => {
    const stats = this.monthlyStats();
    if (stats.length === 0) {
      return null;
    }
    const index = Math.min(this.selectedHabitIndex(), stats.length - 1);
    const stat = stats[index];
    const clamped = Math.max(0, Math.min(100, stat.percent));
    const filled = (clamped / 100) * DONUT_CIRCUMFERENCE;
    return {
      ...stat,
      index,
      total: stats.length,
      dashArray: `${filled} ${DONUT_CIRCUMFERENCE}`,
    };
  });

  protected readonly editMode = signal(false);
  protected readonly newHabitColor = signal(DEFAULT_HABIT_COLOR);
  protected newHabitName = '';

  constructor() {
    effect(() => {
      localStorage.setItem(this.storageKey, JSON.stringify(this.checksByMonth()));
    });
    effect(() => {
      localStorage.setItem(this.showWeekdaysKey, JSON.stringify(this.showWeekdays()));
    });
  }

  private loadShowWeekdays(): boolean {
    const raw = localStorage.getItem(this.showWeekdaysKey);
    if (raw === null) {
      return true;
    }
    try {
      return JSON.parse(raw) === true;
    } catch {
      return true;
    }
  }

  weekdayLabel(day: number): string {
    const weekday = new Date(this.year(), this.month(), day).getDay();
    return WEEKDAY_LABELS[weekday];
  }

  isWeekend(day: number): boolean {
    const weekday = new Date(this.year(), this.month(), day).getDay();
    return weekday === 0 || weekday === 6;
  }

  prevMonth() {
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    if (this.isCurrentMonth()) {
      return;
    }
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToCurrentMonth() {
    this.viewDate.set(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  }

  private dateKeyForDay(day: number): string {
    return toDateKey(new Date(this.year(), this.month(), day));
  }

  hasDiaryEntry(day: number): boolean {
    return this.diaryService.hasEntry(this.dateKeyForDay(day));
  }

  openDiaryEntry(day: number) {
    this.diaryOverlayService.open(this.dateKeyForDay(day));
  }

  hasTopicEntry(habitId: string, day: number): boolean {
    return this.diaryService.hasTopicEntry(this.dateKeyForDay(day), habitId);
  }

  openTopicEntry(habitId: string, day: number) {
    const habit = this.habitService.getHabit(habitId);
    this.diaryOverlayService.open(this.dateKeyForDay(day), {
      habitId,
      habitName: habit?.name ?? '',
    });
  }

  toggleShowWeekdays() {
    this.showWeekdays.update((v) => !v);
  }

  private loadChecks(): ChecksByMonth {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      // Older versions stored `{habits, checks}` in this key; habits now
      // live in HabitService, so only the checks portion is read from there.
      if (parsed && typeof parsed === 'object' && 'checks' in parsed) {
        return parsed.checks ?? {};
      }
      return (parsed as ChecksByMonth) ?? {};
    } catch {
      return {};
    }
  }

  private checksForHabit(habitId: string): boolean[] {
    return this.checks()[habitId] ?? new Array(this.daysInMonth()).fill(false);
  }

  isChecked(habitId: string, day: number): boolean {
    return this.checksForHabit(habitId)[day - 1] ?? false;
  }

  toggleCheck(habitId: string, day: number) {
    const key = this.monthKey();
    const habitChecks = [...this.checksForHabit(habitId)];
    habitChecks[day - 1] = !habitChecks[day - 1];
    this.checksByMonth.update((monthChecks) => ({
      ...monthChecks,
      [key]: { ...monthChecks[key], [habitId]: habitChecks },
    }));
  }

  addHabit() {
    const name = this.newHabitName.trim();
    if (!name) {
      return;
    }
    this.habitService.add(name, this.newHabitColor());
    this.newHabitName = '';
    this.newHabitColor.set(DEFAULT_HABIT_COLOR);
  }

  updateHabitColor(habitId: string, color: string) {
    this.habitService.updateColor(habitId, color);
  }

  removeHabit(habitId: string) {
    this.habitService.remove(habitId);
    this.checksByMonth.update((monthChecks) =>
      Object.fromEntries(
        Object.entries(monthChecks).map(([month, checks]) => {
          const { [habitId]: _removed, ...rest } = checks;
          return [month, rest];
        }),
      ),
    );
    this.diaryService.removeHabitTopics(habitId);
  }

  toggleEditMode() {
    this.editMode.update((v) => !v);
  }

  setView(view: 'tracker' | 'analysis') {
    this.view.set(view);
  }

  toggleComparison() {
    this.showComparison.update((v) => !v);
  }

  toggleChartType() {
    this.chartType.update((t) => (t === 'bars' ? 'donut' : 'bars'));
  }

  prevHabit() {
    const count = this.monthlyStats().length;
    if (count > 0) {
      this.selectedHabitIndex.set(
        (this.selectedStat()!.index - 1 + count) % count,
      );
    }
  }

  nextHabit() {
    const count = this.monthlyStats().length;
    if (count > 0) {
      this.selectedHabitIndex.set((this.selectedStat()!.index + 1) % count);
    }
  }

  selectHabit(index: number) {
    this.selectedHabitIndex.set(index);
  }

  renameHabit(habitId: string, newName: string) {
    const name = newName.trim();
    if (name) {
      this.habitService.rename(habitId, name);
    }
  }
}
