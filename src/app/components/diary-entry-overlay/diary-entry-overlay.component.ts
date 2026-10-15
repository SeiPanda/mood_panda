import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DiaryService } from '../../services/diary.service';
import { DiaryOverlayService } from '../../services/diary-overlay.service';
import { HabitService } from '../../services/habit.service';

@Component({
  selector: 'app-diary-entry-overlay',
  imports: [FormsModule, MatIconModule],
  templateUrl: './diary-entry-overlay.component.html',
  styleUrls: ['./diary-entry-overlay.component.scss'],
})
export class DiaryEntryOverlayComponent {
  private readonly diaryService = inject(DiaryService);
  private readonly overlayService = inject(DiaryOverlayService);
  private readonly habitService = inject(HabitService);

  protected readonly dateKey = this.overlayService.openDateKey;
  protected readonly topic = this.overlayService.openTopic;
  protected readonly isOpen = computed(() => this.dateKey() !== null);
  protected readonly isTopicMode = computed(() => this.topic() !== null);

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

  // The whole day's entry, with per-habit notes resolved to their current
  // names so a saved note stays reachable even after the habit is renamed.
  protected readonly topicEntries = computed(() => {
    const key = this.dateKey();
    if (!key) {
      return [];
    }
    const topics = this.diaryService.getEntry(key)?.topics ?? {};
    return Object.entries(topics)
      .map(([habitId, text]) => ({ habitId, text, name: this.habitService.habitName(habitId) }))
      .filter((t) => t.text && t.name);
  });

  protected readonly allHabits = this.habitService.habits;
  protected readonly showTopicPicker = signal(false);

  // Habits that don't already have a note for this day, offered in the "add
  // topic" picker so the same habit isn't listed twice.
  protected readonly availableTopics = computed(() => {
    const withEntry = new Set(this.topicEntries().map((t) => t.habitId));
    return this.allHabits().filter((h) => !withEntry.has(h.id));
  });

  protected title = '';
  protected text = '';

  constructor() {
    effect(() => {
      const key = this.dateKey();
      const topic = this.topic();
      this.showTopicPicker.set(false);
      if (!key) {
        return;
      }
      if (topic) {
        this.title = '';
        this.text = this.diaryService.getTopicEntry(key, topic.habitId);
      } else {
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
    const topic = this.topic();
    if (topic) {
      this.diaryService.saveTopicEntry(key, topic.habitId, this.text.trim());
    } else {
      this.diaryService.saveEntry(key, this.title.trim(), this.text.trim());
    }
    this.overlayService.close();
  }

  editTopic(habitId: string, habitName: string) {
    const key = this.dateKey();
    if (!key) {
      return;
    }
    this.overlayService.open(key, { habitId, habitName });
  }

  toggleTopicPicker() {
    this.showTopicPicker.update((v) => !v);
  }

  pickTopic(habitId: string, habitName: string) {
    this.showTopicPicker.set(false);
    this.editTopic(habitId, habitName);
  }

  backToDay() {
    const key = this.dateKey();
    if (!key) {
      return;
    }
    this.overlayService.open(key);
  }

  close() {
    this.overlayService.close();
  }
}
