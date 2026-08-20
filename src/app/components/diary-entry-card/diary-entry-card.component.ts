import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DiaryEntry } from '../../services/diary.service';

@Component({
  selector: 'li[app-diary-entry-card]',
  imports: [MatIconModule],
  templateUrl: './diary-entry-card.component.html',
  styleUrls: ['./diary-entry-card.component.scss'],
  host: {
    class: 'entry-card',
    '[class.expanded]': 'expanded()',
    '[class.can-expand]': 'canExpand()',
    '(click)': 'onCardClick()',
  },
})
export class DiaryEntryCardComponent {
  readonly entry = input.required<DiaryEntry>();
  readonly expanded = input(false);

  readonly toggleExpand = output<void>();
  readonly edit = output<void>();

  private readonly probeEl = viewChild<ElementRef<HTMLDivElement>>('probeEl');
  protected readonly canExpand = signal(false);

  protected readonly formattedDate = computed(() => {
    const date = new Date(`${this.entry().date}T00:00:00`);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
    });
  });

  constructor() {
    afterRenderEffect({
      read: (onCleanup) => {
        // Track the entry so edits to an already-mounted card (same date,
        // same DOM element) re-measure instead of only running once on create.
        this.entry();

        // Measured off the always-clamped probe twin, not the visible
        // preview: the visible one loses its clamp while expanded, at which
        // point its scrollHeight and clientHeight are always equal and
        // overflow can no longer be detected from it.
        const el = this.probeEl()?.nativeElement;
        if (!el) {
          this.canExpand.set(false);
          return;
        }

        const measure = () => this.canExpand.set(el.scrollHeight > el.clientHeight + 1);
        measure();

        // Re-measure on width changes: narrowing the window reflows the
        // clamped text into more lines, which can only be detected by
        // observing the element, not by re-running this effect. Observing
        // the probe (rather than gating this on the expanded state) means
        // resizing an already-open card also keeps the collapse control's
        // visibility correct.
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        onCleanup(() => observer.disconnect());
      },
    });
  }

  protected onEdit(event: Event) {
    event.stopPropagation();
    this.edit.emit();
  }

  protected onToggleExpand(event: Event) {
    event.stopPropagation();
    this.toggleExpand.emit();
  }

  protected onCardClick() {
    if (this.canExpand() || this.expanded()) {
      this.toggleExpand.emit();
    }
  }
}
