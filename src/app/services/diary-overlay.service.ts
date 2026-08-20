import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DiaryOverlayService {
  readonly openDateKey = signal<string | null>(null);

  open(dateKey: string) {
    this.openDateKey.set(dateKey);
  }

  close() {
    this.openDateKey.set(null);
  }
}
