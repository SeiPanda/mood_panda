import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DiaryEntryCardComponent } from '../../components/diary-entry-card/diary-entry-card.component';
import { DiaryService } from '../../services/diary.service';
import { DiaryOverlayService } from '../../services/diary-overlay.service';

type DiaryView = 'years' | 'months' | 'list';

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

@Component({
  selector: 'app-diary',
  imports: [FormsModule, MatIconModule, DiaryEntryCardComponent],
  templateUrl: './diary.component.html',
  styleUrls: ['./diary.component.scss'],
})
export class DiaryComponent {
  private readonly diaryService = inject(DiaryService);
  private readonly overlayService = inject(DiaryOverlayService);

  protected readonly view = signal<DiaryView>('list');
  protected readonly selectedYear = signal(new Date().getFullYear());
  protected readonly selectedMonth = signal(new Date().getMonth() + 1);

  protected readonly showAddForm = signal(false);
  protected newYearValue = '';
  protected newMonthValue = '';

  protected readonly expandedDate = signal<string | null>(null);

  protected readonly years = this.diaryService.years;
  protected readonly months = computed(() =>
    this.diaryService.monthsForYear(this.selectedYear()),
  );
  protected readonly monthEntries = computed(() =>
    this.diaryService.entriesForMonth(this.selectedYear(), this.selectedMonth()),
  );

  protected readonly addableMonths = computed(() => {
    const existing = new Set(this.months());
    return Array.from({ length: 12 }, (_, i) => i + 1).filter((month) => !existing.has(month));
  });

  protected readonly heading = computed(() => {
    switch (this.view()) {
      case 'years':
        return 'Jahre';
      case 'months':
        return `${this.selectedYear()}`;
      case 'list':
        return `${MONTH_NAMES[this.selectedMonth() - 1]} ${this.selectedYear()}`;
    }
  });

  monthName(month: number): string {
    return MONTH_NAMES[month - 1];
  }

  openYear(year: number) {
    this.selectedYear.set(year);
    this.view.set('months');
    this.showAddForm.set(false);
  }

  openMonth(month: number) {
    this.selectedMonth.set(month);
    this.view.set('list');
    this.showAddForm.set(false);
  }

  goBack() {
    if (this.view() === 'list') {
      this.view.set('months');
    } else if (this.view() === 'months') {
      this.view.set('years');
    }
    this.showAddForm.set(false);
  }

  toggleAddForm() {
    this.showAddForm.update((v) => !v);
  }

  confirmAddYear() {
    const year = Number(this.newYearValue);
    if (Number.isInteger(year) && year > 0) {
      this.diaryService.addYear(year);
      this.newYearValue = '';
      this.showAddForm.set(false);
    }
  }

  confirmAddMonth() {
    const month = Number(this.newMonthValue);
    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      this.diaryService.addMonth(this.selectedYear(), month);
      this.newMonthValue = '';
      this.showAddForm.set(false);
    }
  }

  toggleExpand(dateKey: string) {
    this.expandedDate.update((current) => (current === dateKey ? null : dateKey));
  }

  editEntry(dateKey: string) {
    this.overlayService.open(dateKey);
  }
}
