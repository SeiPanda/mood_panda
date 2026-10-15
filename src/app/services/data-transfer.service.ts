import { Injectable, inject } from '@angular/core';
import { ProfileService } from './profile.service';

const EXPORT_VERSION = 1;

export interface DataCategory {
  id: string;
  label: string;
  keys: string[];
}

/**
 * Groups the base storage keys into user-facing categories for export/import,
 * so someone can e.g. bring over the diary without the habit checks. Kept in
 * one place so it stays in sync with what the stores actually persist - see
 * profile.service.ts `scopedKey` and its callers.
 */
export const DATA_CATEGORIES: DataCategory[] = [
  { id: 'diary', label: 'Tagebuch', keys: ['diary-entries', 'diary-extra-periods'] },
  { id: 'habits', label: 'Habits', keys: ['habit-tracker-habits'] },
  { id: 'habit-checks', label: 'Habit-Tracking (Häkchen)', keys: ['habit-tracker-data'] },
];

export interface ExportPayload {
  version: number;
  exportedAt: string;
  profile: { name: string; icon: string };
  data: Record<string, unknown>;
}

function isExportPayload(value: unknown): value is ExportPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ExportPayload).version === 'number' &&
    typeof (value as ExportPayload).data === 'object' &&
    (value as ExportPayload).data !== null
  );
}

/**
 * Exports/imports the active profile's data as a JSON file, so it can move
 * to another profile, a new computer, or - once there is a backend - be
 * used to seed it. Always targets whichever profile is active, the same
 * scoping every store uses (see ProfileService.scopedKey). Callers pick
 * which {@link DataCategory} ids to include on export or apply on import.
 */
@Injectable({ providedIn: 'root' })
export class DataTransferService {
  private readonly profile = inject(ProfileService);

  /** Which categories have data in this payload - only these make sense to offer on import. */
  availableCategories(payload: ExportPayload): DataCategory[] {
    return DATA_CATEGORIES.filter((category) =>
      category.keys.some((key) => payload.data[key] !== undefined),
    );
  }

  exportSelected(categoryIds: string[]) {
    const keys = DATA_CATEGORIES.filter((c) => categoryIds.includes(c.id)).flatMap(
      (c) => c.keys,
    );
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      const raw = localStorage.getItem(this.profile.scopedKey(key));
      if (raw !== null) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          // Skip keys that somehow hold invalid JSON rather than fail the whole export.
        }
      }
    }
    const payload: ExportPayload = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile: { name: this.profile.active().name, icon: this.profile.active().icon },
      data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `pandournal-${this.profile.activeId()}-${payload.exportedAt.slice(0, 10)}.json`;
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** Reads and validates an exported file without applying it yet. */
  async readFile(file: File): Promise<ExportPayload> {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Die Datei ist kein gültiges JSON.');
    }
    if (!isExportPayload(parsed)) {
      throw new Error('Die Datei hat kein bekanntes Export-Format.');
    }
    return parsed;
  }

  /** Overwrites the active profile's data for the given categories and reloads. */
  importSelected(payload: ExportPayload, categoryIds: string[]) {
    const keys = DATA_CATEGORIES.filter((c) => categoryIds.includes(c.id)).flatMap(
      (c) => c.keys,
    );
    for (const key of keys) {
      const value = payload.data[key];
      if (value !== undefined) {
        localStorage.setItem(this.profile.scopedKey(key), JSON.stringify(value));
      }
    }
    location.reload();
  }
}
