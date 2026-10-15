import { Injectable, signal } from '@angular/core';

export interface DiaryOverlayTopic {
  habitId: string;
  habitName: string;
}

@Injectable({ providedIn: 'root' })
export class DiaryOverlayService {
  readonly openDateKey = signal<string | null>(null);
  /** Set when the overlay should edit a single habit's note instead of the whole day. */
  readonly openTopic = signal<DiaryOverlayTopic | null>(null);

  open(dateKey: string, topic?: DiaryOverlayTopic) {
    this.openDateKey.set(dateKey);
    this.openTopic.set(topic ?? null);
  }

  close() {
    this.openDateKey.set(null);
    this.openTopic.set(null);
  }
}
