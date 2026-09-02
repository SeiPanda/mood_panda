import { Injectable, computed, signal } from '@angular/core';

export type ProfileId = string;

export interface Profile {
  id: ProfileId;
  /** Display name, shown as tooltip in the navbar. */
  name: string;
  /** Material Symbols icon name. */
  icon: string;
}

const ACTIVE_KEY = 'active-profile';

/**
 * Storage keys that existed before profiles. On first run they are moved into
 * the default profile's namespace so existing data is not orphaned.
 */
const LEGACY_KEYS = [
  'diary-entries',
  'diary-extra-periods',
  'habit-tracker-data',
  'habit-tracker-show-weekdays',
];

/**
 * The available profiles. Kept as a static list for now; a later backend
 * connection can replace this with data fetched per authenticated user.
 */
export const PROFILES: Profile[] = [
  { id: 'me', name: 'Ich', icon: 'face_4' },
  { id: 'partner', name: 'Partner', icon: 'face' },
];

/**
 * Holds the currently active profile and namespaces persisted data by it.
 *
 * Every store that persists user data derives its storage key via
 * {@link scopedKey}, so switching the profile swaps the whole data set.
 * When a backend is added, this service becomes the identity source and the
 * stores swap `localStorage` for HTTP without touching the switch UI.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  readonly profiles = PROFILES;
  readonly activeId = signal<ProfileId>(this.loadActiveId());
  readonly active = computed(
    () => this.profiles.find((p) => p.id === this.activeId()) ?? this.profiles[0],
  );

  constructor() {
    this.migrateLegacyKeys();
  }

  /** Moves pre-profile storage keys into the default profile's namespace, once. */
  private migrateLegacyKeys() {
    const target = PROFILES[0].id;
    for (const key of LEGACY_KEYS) {
      const value = localStorage.getItem(key);
      const scoped = `${key}::${target}`;
      if (value !== null && localStorage.getItem(scoped) === null) {
        localStorage.setItem(scoped, value);
        localStorage.removeItem(key);
      }
    }
  }

  /** Namespaces a base storage key to the active profile. */
  scopedKey(base: string): string {
    return `${base}::${this.activeId()}`;
  }

  setActive(id: ProfileId) {
    if (id === this.activeId() || !this.profiles.some((p) => p.id === id)) {
      return;
    }
    this.activeId.set(id);
    // Persist synchronously: the reload below pre-empts any async effect.
    localStorage.setItem(ACTIVE_KEY, id);
    // Reload so every store re-reads its data under the new profile namespace.
    location.reload();
  }

  private loadActiveId(): ProfileId {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw && PROFILES.some((p) => p.id === raw) ? raw : PROFILES[0].id;
  }
}
