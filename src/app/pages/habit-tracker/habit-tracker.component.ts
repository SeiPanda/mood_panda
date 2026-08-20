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

function randomHabitColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return hslToHex(hue, 65, 45);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
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

  private readonly today = new Date();
  protected readonly monthKey = `${this.today.getFullYear()}-${this.today.getMonth()}`;
  protected readonly daysInMonth = new Date(
    this.today.getFullYear(),
    this.today.getMonth() + 1,
    0,
  ).getDate();
  protected readonly days = Array.from({ length: this.daysInMonth }, (_, i) => i + 1);
  protected readonly currentDay = this.today.getDate();

  protected readonly showWeekdays = signal(this.loadShowWeekdays());

  protected readonly habits = signal<Habit[]>(this.loadData().habits);
  private readonly checksByMonth = signal<Record<string, Record<string, boolean[]>>>(
    this.loadData().checks,
  );
  protected readonly checks = computed(() => this.checksByMonth()[this.monthKey] ?? {});

  protected readonly editMode = signal(false);
  protected readonly newHabitColor = signal('#ffffff');
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
    const weekday = new Date(this.today.getFullYear(), this.today.getMonth(), day).getDay();
    return WEEKDAY_LABELS[weekday];
  }

  private dateKeyForDay(day: number): string {
    return toDateKey(new Date(this.today.getFullYear(), this.today.getMonth(), day));
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
        color: h.color ?? randomHabitColor(),
      }));
      return { habits, checks: parsed.checks ?? {} };
    } catch {
      return { habits: [], checks: {} };
    }
  }

  private checksForHabit(habitId: string): boolean[] {
    return this.checks()[habitId] ?? new Array(this.daysInMonth).fill(false);
  }

  isChecked(habitId: string, day: number): boolean {
    return this.checksForHabit(habitId)[day - 1] ?? false;
  }

  toggleCheck(habitId: string, day: number) {
    const monthChecks = { ...this.checksByMonth() };
    const habitChecks = [...this.checksForHabit(habitId)];
    habitChecks[day - 1] = !habitChecks[day - 1];
    monthChecks[this.monthKey] = { ...monthChecks[this.monthKey], [habitId]: habitChecks };
    this.checksByMonth.set(monthChecks);
  }

  addHabit() {
    const name = this.newHabitName.trim();
    if (!name) {
      return;
    }
    const habit: Habit = { id: crypto.randomUUID(), name, color: this.newHabitColor() };
    this.habits.update((habits) => [...habits, habit]);
    this.newHabitName = '';
    this.newHabitColor.set('#ffffff');
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
