import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DiaryService } from '../../services/diary.service';
import { DiaryOverlayService } from '../../services/diary-overlay.service';

@Component({
  selector: 'app-diary-entry-overlay',
  imports: [FormsModule, MatIconModule],
  templateUrl: './diary-entry-overlay.component.html',
  styleUrls: ['./diary-entry-overlay.component.scss'],
})
export class DiaryEntryOverlayComponent {
  private readonly diaryService = inject(DiaryService);
  private readonly overlayService = inject(DiaryOverlayService);

  protected readonly dateKey = this.overlayService.openDateKey;
  protected readonly isOpen = computed(() => this.dateKey() !== null);

  protected readonly displayDate = computed(() => {
    const key = this.dateKey();
    if (!key) {
      return '';
    }
    const date = new Date(`${key}T00:00:00`);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  });

  protected title = '';
  protected text = '';

  constructor() {
    effect(() => {
      const key = this.dateKey();
      if (key) {
        const entry = this.diaryService.getEntry(key);
        this.title = entry?.title ?? '';
        this.text = entry?.text ?? '';
      }
    });
  }

  save() {
    const key = this.dateKey();
    if (!key) {
      return;
    }
    this.diaryService.saveEntry(key, this.title.trim(), this.text.trim());
    this.overlayService.close();
  }

  close() {
    this.overlayService.close();
  }
}
