import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HabitColorPickerComponent } from './habit-color-picker/habit-color-picker.component';
import { DiaryService, toDateKey } from '../../services/diary.service';
import { DiaryOverlayService } from '../../services/diary-overlay.service';

interface Habit {
  id: string;
  name: string;
  color: string;
}

interface HabitTrackerData {
  habits: Habit[];
  checks: Record<string, Record<string, boolean[]>>;
}

const STORAGE_KEY = 'habit-tracker-data';
const SHOW_WEEKDAYS_KEY = 'habit-tracker-show-weekdays';

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DEFAULT_HABIT_COLOR = '#4c8bf5';

@Component({
  selector: 'app-habit-tracker',
  imports: [FormsModule, MatIconModule, HabitColorPickerComponent],
  templateUrl: './habit-tracker.component.html',
  styleUrls: ['./habit-tracker.component.scss'],
})
export class HabitTrackerComponent {
  private readonly diaryService = inject(DiaryService);
  private readonly diaryOverlayService = inject(DiaryOverlayService);

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

  protected readonly showWeekdays = signal(this.loadShowWeekdays());

  private readonly initialData = this.loadData();
  protected readonly habits = signal<Habit[]>(this.initialData.habits);
  private readonly checksByMonth = signal<Record<string, Record<string, boolean[]>>>(
    this.initialData.checks,
  );
  protected readonly checks = computed(() => this.checksByMonth()[this.monthKey()] ?? {});

  protected readonly editMode = signal(false);
  protected readonly newHabitColor = signal(DEFAULT_HABIT_COLOR);
  protected newHabitName = '';

  constructor() {
    effect(() => {
      const data: HabitTrackerData = {
        habits: this.habits(),
        checks: this.checksByMonth(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    });
    effect(() => {
      localStorage.setItem(SHOW_WEEKDAYS_KEY, JSON.stringify(this.showWeekdays()));
    });
  }

  private loadShowWeekdays(): boolean {
    const raw = localStorage.getItem(SHOW_WEEKDAYS_KEY);
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

  toggleShowWeekdays() {
    this.showWeekdays.update((v) => !v);
  }

  private loadData(): HabitTrackerData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { habits: [], checks: {} };
    }
    try {
      const parsed = JSON.parse(raw) as HabitTrackerData;
      const habits = (parsed.habits ?? []).map((h) => ({
        ...h,
        color: h.color ?? DEFAULT_HABIT_COLOR,
      }));
      return { habits, checks: parsed.checks ?? {} };
    } catch {
      return { habits: [], checks: {} };
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
    const habit: Habit = { id: crypto.randomUUID(), name, color: this.newHabitColor() };
    this.habits.update((habits) => [...habits, habit]);
    this.newHabitName = '';
    this.newHabitColor.set(DEFAULT_HABIT_COLOR);
  }

  updateHabitColor(habitId: string, color: string) {
    this.habits.update((habits) =>
      habits.map((h) => (h.id === habitId ? { ...h, color } : h)),
    );
  }

  removeHabit(habitId: string) {
    this.habits.update((habits) => habits.filter((h) => h.id !== habitId));
    this.checksByMonth.update((monthChecks) =>
      Object.fromEntries(
        Object.entries(monthChecks).map(([month, checks]) => {
          const { [habitId]: _removed, ...rest } = checks;
          return [month, rest];
        }),
      ),
    );
  }

  toggleEditMode() {
    this.editMode.update((v) => !v);
  }

  renameHabit(habitId: string, newName: string) {
    const name = newName.trim();
    if (name) {
      this.habits.update((habits) =>
        habits.map((h) => (h.id === habitId ? { ...h, name } : h)),
      );
    }
  }
}
