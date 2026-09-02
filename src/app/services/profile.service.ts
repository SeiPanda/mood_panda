import { Injectable, computed, signal } from '@angular/core';

export type ProfileId = string;

export interface Profile {
  id: ProfileId;
  /** Display name, shown as tooltip in the navbar. */
  name: string;
  /** Material Symbols icon name. */
  icon: string;
}

/** Fields the user is allowed to change from the edit dialog. */
export type ProfileEdit = Partial<Pick<Profile, 'name' | 'icon'>>;

const ACTIVE_KEY = 'active-profile';
const PROFILES_KEY = 'profiles';

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
 * The default profiles. Used to seed {@link ProfileService.profiles} on first
 * run; afterwards the (possibly edited) list is read from localStorage. A later
 * backend connection can replace this with data fetched per authenticated user.
 */
export const DEFAULT_PROFILES: Profile[] = [
  { id: 'me', name: 'Ich', icon: 'face_4' },
  { id: 'partner', name: 'Partner', icon: 'face' },
];

/** Icons offered in the profile edit dialog. */
export const PROFILE_ICONS = [
  'face',
  'face_2',
  'face_3',
  'face_4',
  'face_5',
  'face_6',
  'sentiment_satisfied',
  'mood',
  'self_improvement',
  'favorite',
  'pets',
  'star',
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
  readonly profiles = signal<Profile[]>(this.loadProfiles());
  readonly activeId = signal<ProfileId>(this.loadActiveId());
  readonly active = computed(
    () => this.profiles().find((p) => p.id === this.activeId()) ?? this.profiles()[0],
  );

  constructor() {
    this.migrateLegacyKeys();
  }

  /** Moves pre-profile storage keys into the default profile's namespace, once. */
  private migrateLegacyKeys() {
    const target = DEFAULT_PROFILES[0].id;
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
    if (id === this.activeId() || !this.profiles().some((p) => p.id === id)) {
      return;
    }
    this.activeId.set(id);
    // Persist synchronously: the reload below pre-empts any async effect.
    localStorage.setItem(ACTIVE_KEY, id);
    // Reload so every store re-reads its data under the new profile namespace.
    location.reload();
  }

  /** Updates a profile's display name and/or icon and persists the change. */
  updateProfile(id: ProfileId, changes: ProfileEdit) {
    const name = changes.name?.trim();
    this.profiles.update((profiles) =>
      profiles.map((p) =>
        p.id === id
          ? { ...p, ...(name ? { name } : {}), ...(changes.icon ? { icon: changes.icon } : {}) }
          : p,
      ),
    );
    localStorage.setItem(PROFILES_KEY, JSON.stringify(this.profiles()));
  }

  private loadProfiles(): Profile[] {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      return DEFAULT_PROFILES.map((p) => ({ ...p }));
    }
    try {
      const parsed = JSON.parse(raw) as Profile[];
      // Keep the fixed set of profile ids; only name/icon are user-editable.
      return DEFAULT_PROFILES.map((base) => {
        const stored = parsed.find((p) => p.id === base.id);
        return {
          id: base.id,
          name: stored?.name?.trim() || base.name,
          icon: stored?.icon || base.icon,
        };
      });
    } catch {
      return DEFAULT_PROFILES.map((p) => ({ ...p }));
    }
  }

  private loadActiveId(): ProfileId {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw && DEFAULT_PROFILES.some((p) => p.id === raw) ? raw : DEFAULT_PROFILES[0].id;
  }
}
