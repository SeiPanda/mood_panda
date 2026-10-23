import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MoodFaceComponent } from '../../components/mood-face/mood-face.component';
import { MOOD_CATEGORIES, MOOD_LEVELS, MoodCategoryItem, MoodService } from '../../services/mood.service';
import { toDateKey } from '../../services/diary.service';

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

interface CalendarCell {
  day: number;
  dateKey: string;
  isToday: boolean;
}

@Component({
  selector: 'app-mood-tracker',
  imports: [MatButtonModule, MatIconModule, MoodFaceComponent],
  templateUrl: './mood-tracker.component.html',
  styleUrls: ['./mood-tracker.component.scss'],
})
export class MoodTrackerComponent {
  private readonly router = inject(Router);
  private readonly moodService = inject(MoodService);

  protected readonly moodLevels = MOOD_LEVELS;
  protected readonly weekdayLabels = WEEKDAY_LABELS;

  private readonly today = new Date();
  private readonly todayKey = toDateKey(this.today);

  private readonly viewDate = signal(
    new Date(this.today.getFullYear(), this.today.getMonth(), 1),
  );

  private readonly year = computed(() => this.viewDate().getFullYear());
  private readonly month = computed(() => this.viewDate().getMonth());
  private readonly daysInMonth = computed(() =>
    new Date(this.year(), this.month() + 1, 0).getDate(),
  );
  private readonly firstWeekday = computed(() => new Date(this.year(), this.month(), 1).getDay());

  protected readonly isCurrentMonth = computed(
    () => this.year() === this.today.getFullYear() && this.month() === this.today.getMonth(),
  );

  protected readonly monthLabel = computed(() =>
    this.viewDate().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
  );

  protected readonly leadingBlanks = computed(() => Array.from({ length: this.firstWeekday() }));

  protected readonly cells = computed<CalendarCell[]>(() => {
    const year = this.year();
    const month = this.month();
    return Array.from({ length: this.daysInMonth() }, (_, i) => {
      const day = i + 1;
      const dateKey = toDateKey(new Date(year, month, day));
      return { day, dateKey, isToday: dateKey === this.todayKey };
    });
  });

  protected readonly fastSelectOpen = signal(false);
  protected readonly todayMood = computed(() => this.moodService.getMood(this.todayKey));

  moodFor(dateKey: string): number | undefined {
    return this.moodService.getMood(dateKey);
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

  protected readonly overviewDateKey = signal<string | null>(null);

  protected readonly overviewMood = computed(() => {
    const dateKey = this.overviewDateKey();
    return dateKey ? this.moodService.getMood(dateKey) : undefined;
  });

  protected readonly overviewDateLabel = computed(() => {
    const dateKey = this.overviewDateKey();
    if (!dateKey) {
      return '';
    }
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  protected readonly overviewItems = computed<MoodCategoryItem[]>(() => {
    const dateKey = this.overviewDateKey();
    const categories = dateKey ? this.moodService.getEntry(dateKey)?.categories : undefined;
    if (!categories) {
      return [];
    }
    return MOOD_CATEGORIES.flatMap((category) =>
      category.items.filter((item) => categories[category.id]?.includes(item.id)),
    );
  });

  openDay(dateKey: string) {
    if (this.moodService.hasEntry(dateKey)) {
      this.closeFastSelect();
      this.overviewDateKey.set(dateKey);
      return;
    }
    this.router.navigate(['/mood-tracker', dateKey]);
  }

  closeOverview() {
    this.overviewDateKey.set(null);
  }

  editOverviewDay() {
    const dateKey = this.overviewDateKey();
    if (!dateKey) {
      return;
    }
    this.closeOverview();
    this.router.navigate(['/mood-tracker', dateKey]);
  }

  deleteOverviewDay() {
    const dateKey = this.overviewDateKey();
    if (!dateKey) {
      return;
    }
    this.moodService.deleteEntry(dateKey);
    this.closeOverview();
  }

  toggleFastSelect() {
    this.fastSelectOpen.update((v) => !v);
  }

  closeFastSelect() {
    this.fastSelectOpen.set(false);
  }

  selectTodayMood(level: number) {
    this.moodService.setMood(this.todayKey, level);
    this.closeFastSelect();
  }
}
