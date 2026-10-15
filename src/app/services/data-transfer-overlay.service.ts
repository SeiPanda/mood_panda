import { Injectable, signal } from '@angular/core';
import { ExportPayload } from './data-transfer.service';

export type DataTransferMode = 'export' | { payload: ExportPayload } | null;

/** Controls the "Daten exportieren/importieren" overlay and, for import, holds the parsed file. */
@Injectable({ providedIn: 'root' })
export class DataTransferOverlayService {
  readonly mode = signal<DataTransferMode>(null);

  openExport() {
    this.mode.set('export');
  }

  openImport(payload: ExportPayload) {
    this.mode.set({ payload });
  }

  close() {
    this.mode.set(null);
  }
}
