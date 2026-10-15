import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DATA_CATEGORIES, DataTransferService } from '../../services/data-transfer.service';
import { DataTransferOverlayService } from '../../services/data-transfer-overlay.service';

@Component({
  selector: 'app-data-transfer-overlay',
  imports: [FormsModule, MatIconModule],
  templateUrl: './data-transfer-overlay.component.html',
  styleUrls: ['./data-transfer-overlay.component.scss'],
})
export class DataTransferOverlayComponent {
  private readonly dataTransfer = inject(DataTransferService);
  private readonly overlayService = inject(DataTransferOverlayService);

  protected readonly mode = this.overlayService.mode;
  protected readonly isOpen = computed(() => this.mode() !== null);
  protected readonly isImport = computed(() => {
    const mode = this.mode();
    return !!mode && mode !== 'export';
  });

  protected readonly title = computed(() =>
    this.isImport() ? 'Daten importieren' : 'Daten exportieren',
  );

  /** All categories on export; only the ones present in the file on import. */
  protected readonly categories = computed(() => {
    const mode = this.mode();
    if (mode && mode !== 'export') {
      return this.dataTransfer.availableCategories(mode.payload);
    }
    return DATA_CATEGORIES;
  });

  protected selected: Record<string, boolean> = {};

  constructor() {
    effect(() => {
      // Reset selection (defaulting to "all") whenever the overlay is (re)opened.
      const categories = this.categories();
      this.selected = Object.fromEntries(categories.map((c) => [c.id, true]));
    });
  }

  protected selectedIds(): string[] {
    return Object.entries(this.selected)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
  }

  protected get hasSelection(): boolean {
    return this.selectedIds().length > 0;
  }

  toggle(id: string) {
    this.selected = { ...this.selected, [id]: !this.selected[id] };
  }

  confirm() {
    const ids = this.selectedIds();
    if (ids.length === 0) {
      return;
    }
    const mode = this.mode();
    if (mode && mode !== 'export') {
      this.dataTransfer.importSelected(mode.payload, ids);
      // importSelected reloads the page; no need to close explicitly.
      return;
    }
    this.dataTransfer.exportSelected(ids);
    this.overlayService.close();
  }

  close() {
    this.overlayService.close();
  }
}
