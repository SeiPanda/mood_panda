import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MoodFaceComponent } from '../../components/mood-face/mood-face.component';
import { MOOD_CATEGORIES, MOOD_LEVELS, MoodService } from '../../services/mood.service';

@Component({
  selector: 'app-day-mood-view',
  imports: [MatIconModule, MoodFaceComponent],
  templateUrl: './day-mood-view.component.html',
  styleUrls: ['./day-mood-view.component.scss'],
})
export class DayMoodViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly moodService = inject(MoodService);

  protected readonly moodLevels = MOOD_LEVELS;
  protected readonly categories = MOOD_CATEGORIES;

  private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly dateKey = computed(() => this.paramMap().get('date') ?? '');

  private readonly date = computed(() => {
    const [y, m, d] = this.dateKey().split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  });

  protected readonly dateLabel = computed(() =>
    this.date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }),
  );

  protected readonly mood = computed(() => this.moodService.getMood(this.dateKey()));

  // Hobbies starts expanded to mirror the reference day view; the rest stay
  // collapsed until the user opens them.
  protected readonly expanded = signal<Record<string, boolean>>({ hobbies: true });

  isExpanded(categoryId: string): boolean {
    return !!this.expanded()[categoryId];
  }

  toggleCategory(categoryId: string) {
    this.expanded.update((state) => ({ ...state, [categoryId]: !state[categoryId] }));
  }

  isSelected(categoryId: string, itemId: string): boolean {
    return this.moodService.isCategoryItemSelected(this.dateKey(), categoryId, itemId);
  }

  toggleItem(categoryId: string, itemId: string) {
    this.moodService.toggleCategoryItem(this.dateKey(), categoryId, itemId);
  }

  selectMood(level: number) {
    this.moodService.setMood(this.dateKey(), level);
  }

  goBack() {
    this.router.navigate(['/mood-tracker']);
  }
}
