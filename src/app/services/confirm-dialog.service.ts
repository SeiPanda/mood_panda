import { Injectable, signal } from '@angular/core';

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (result: boolean) => void;
}

/** Generic yes/no confirmation dialog, driven by a signal read by ConfirmDialogComponent. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly request = signal<ConfirmRequest | null>(null);

  confirm(
    message: string,
    options?: { confirmLabel?: string; cancelLabel?: string },
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.request.set({
        message,
        confirmLabel: options?.confirmLabel ?? 'Löschen',
        cancelLabel: options?.cancelLabel ?? 'Abbrechen',
        resolve,
      });
    });
  }

  respond(result: boolean) {
    this.request()?.resolve(result);
    this.request.set(null);
  }
}
