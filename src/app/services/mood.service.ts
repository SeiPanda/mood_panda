import { Injectable, effect, inject, signal } from '@angular/core';
import { ProfileService } from './profile.service';

export interface MoodLevel {
  readonly id: number;
  readonly label: string;
  readonly color: string;
}

export interface MoodCategoryItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}

export interface MoodCategory {
  readonly id: string;
  readonly label: string;
  readonly items: MoodCategoryItem[];
}

export interface MoodEntry {
  mood?: number;
  categories?: Record<string, string[]>;
}

/** Ordered best → worst, matching the fast-select reference image. */
export const MOOD_LEVELS: MoodLevel[] = [
  { id: 0, label: 'Super', color: '#eac558' },
  { id: 1, label: 'Gut', color: '#a8d98a' },
  { id: 2, label: 'Okay', color: '#74b47a' },
  { id: 3, label: 'Schlecht', color: '#3f7a54' },
  { id: 4, label: 'Furchtbar', color: '#9aa1a8' },
];

export const MOOD_CATEGORIES: MoodCategory[] = [
  {
    id: 'hobbies',
    label: 'Hobbies',
    items: [
      { id: 'exercise', label: 'Sport', icon: 'fitness_center' },
      { id: 'tv', label: 'TV & Serien', icon: 'tv' },
      { id: 'movie', label: 'Film', icon: 'movie' },
      { id: 'gaming', label: 'Gaming', icon: 'sports_esports' },
      { id: 'reading', label: 'Lesen', icon: 'menu_book' },
      { id: 'walk', label: 'Spaziergang', icon: 'directions_walk' },
      { id: 'music', label: 'Musik', icon: 'headphones' },
      { id: 'drawing', label: 'Zeichnen', icon: 'palette' },
    ],
  },
  {
    id: 'emotions',
    label: 'Emotionen',
    items: [
      { id: 'happy', label: 'Fröhlich', icon: 'sentiment_very_satisfied' },
      { id: 'excited', label: 'Aufgeregt', icon: 'celebration' },
      { id: 'calm', label: 'Entspannt', icon: 'self_improvement' },
      { id: 'grateful', label: 'Dankbar', icon: 'volunteer_activism' },
      { id: 'anxious', label: 'Ängstlich', icon: 'sentiment_neutral' },
      { id: 'stressed', label: 'Gestresst', icon: 'bolt' },
      { id: 'sad', label: 'Traurig', icon: 'sentiment_dissatisfied' },
      { id: 'angry', label: 'Wütend', icon: 'mood_bad' },
    ],
  },
  {
    id: 'meals',
    label: 'Mahlzeiten',
    items: [
      { id: 'home-cooked', label: 'Selbst gekocht', icon: 'dinner_dining' },
      { id: 'healthy', label: 'Gesund', icon: 'eco' },
      { id: 'takeout', label: 'Takeout', icon: 'takeout_dining' },
      { id: 'sweet', label: 'Süß', icon: 'icecream' },
      { id: 'coffee', label: 'Kaffee', icon: 'local_cafe' },
      { id: 'snack', label: 'Snack', icon: 'cookie' },
      { id: 'fastfood', label: 'Fastfood', icon: 'fastfood' },
      { id: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
    ],
  },
  {
    id: 'self-care',
    label: 'Self-Care',
    items: [
      { id: 'bath', label: 'Baden', icon: 'bathtub' },
      { id: 'skincare', label: 'Skincare', icon: 'face_retouching_natural' },
      { id: 'meditation', label: 'Meditation', icon: 'self_improvement' },
      { id: 'journaling', label: 'Journaling', icon: 'edit_note' },
      { id: 'nature', label: 'Natur', icon: 'park' },
      { id: 'sleep', label: 'Schlaf', icon: 'bedtime' },
      { id: 'therapy', label: 'Therapie', icon: 'psychology' },
      { id: 'rest', label: 'Ausruhen', icon: 'weekend' },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    items: [
      { id: 'birthday', label: 'Geburtstag', icon: 'cake' },
      { id: 'travel', label: 'Reise', icon: 'flight' },
      { id: 'party', label: 'Party', icon: 'celebration' },
      { id: 'work', label: 'Arbeit', icon: 'work' },
      { id: 'appointment', label: 'Termin', icon: 'event' },
      { id: 'shopping', label: 'Shopping', icon: 'shopping_bag' },
      { id: 'sport-event', label: 'Sportevent', icon: 'sports' },
      { id: 'concert', label: 'Konzert', icon: 'music_note' },
    ],
  },
  {
    id: 'people',
    label: 'Menschen',
    items: [
      { id: 'friends', label: 'Freunde', icon: 'group' },
      { id: 'family', label: 'Familie', icon: 'family_restroom' },
      { id: 'partner', label: 'Partner', icon: 'favorite' },
      { id: 'none', label: 'Niemand', icon: 'block' },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty',
    items: [
      { id: 'skincare', label: 'Skincare', icon: 'face_retouching_natural' },
      { id: 'makeup', label: 'Make-up', icon: 'brush' },
      { id: 'hair', label: 'Haare', icon: 'content_cut' },
      { id: 'nails', label: 'Nägel', icon: 'back_hand' },
      { id: 'spa', label: 'Spa', icon: 'spa' },
      { id: 'new-look', label: 'Neuer Look', icon: 'auto_awesome' },
    ],
  },
  {
    id: 'weather',
    label: 'Wetter',
    items: [
      { id: 'sunny', label: 'Sonnig', icon: 'wb_sunny' },
      { id: 'cloudy', label: 'Bewölkt', icon: 'cloud' },
      { id: 'rainy', label: 'Regnerisch', icon: 'opacity' },
      { id: 'snowy', label: 'Schnee', icon: 'ac_unit' },
      { id: 'windy', label: 'Windig', icon: 'air' },
      { id: 'stormy', label: 'Stürmisch', icon: 'thunderstorm' },
      { id: 'hot', label: 'Heiß', icon: 'local_fire_department' },
      { id: 'cold', label: 'Kalt', icon: 'device_thermostat' },
    ],
  },
];

const STORAGE_KEY = 'mood-entries';

/**
 * Holds per-day mood + category selections, namespaced per profile like the
 * other stores (see ProfileService.scopedKey). A day with neither a mood nor
 * any category selection is pruned from storage entirely, so `hasEntry`
 * reflects exactly what the calendar should mark as recorded.
 */
@Injectable({ providedIn: 'root' })
export class MoodService {
  private readonly profile = inject(ProfileService);

  // Captured once, see profile-switching notes on DiaryService/HabitService:
  // reading scopedKey() reactively would let the persistence effect below
  // copy the current profile's entries into a newly selected profile.
  private readonly storageKey = this.profile.scopedKey(STORAGE_KEY);

  private readonly entriesMap = signal<Record<string, MoodEntry>>(this.loadEntries());

  constructor() {
    effect(() => {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entriesMap()));
    });
  }

  private loadEntries(): Record<string, MoodEntry> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw) as Record<string, MoodEntry>;
    } catch {
      return {};
    }
  }

  getEntry(dateKey: string): MoodEntry | undefined {
    return this.entriesMap()[dateKey];
  }

  getMood(dateKey: string): number | undefined {
    return this.entriesMap()[dateKey]?.mood;
  }

  hasEntry(dateKey: string): boolean {
    return !!this.entriesMap()[dateKey];
  }

  deleteEntry(dateKey: string) {
    this.entriesMap.update((map) => {
      const { [dateKey]: _removed, ...rest } = map;
      return rest;
    });
  }

  private static isEmpty(entry: MoodEntry): boolean {
    const hasCategories =
      !!entry.categories && Object.values(entry.categories).some((ids) => ids.length > 0);
    return entry.mood === undefined && !hasCategories;
  }

  /** Clicking the already-selected level again clears the day's mood. */
  setMood(dateKey: string, mood: number) {
    this.entriesMap.update((map) => {
      const existing = map[dateKey];
      const nextMood = existing?.mood === mood ? undefined : mood;
      const candidate: MoodEntry = { mood: nextMood, categories: existing?.categories };
      const { [dateKey]: _removed, ...rest } = map;
      return MoodService.isEmpty(candidate) ? rest : { ...rest, [dateKey]: candidate };
    });
  }

  isCategoryItemSelected(dateKey: string, categoryId: string, itemId: string): boolean {
    return !!this.entriesMap()[dateKey]?.categories?.[categoryId]?.includes(itemId);
  }

  toggleCategoryItem(dateKey: string, categoryId: string, itemId: string) {
    this.entriesMap.update((map) => {
      const existing = map[dateKey];
      const currentIds = existing?.categories?.[categoryId] ?? [];
      const nextIds = currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId];

      const categories = { ...(existing?.categories ?? {}) };
      if (nextIds.length > 0) {
        categories[categoryId] = nextIds;
      } else {
        delete categories[categoryId];
      }

      const candidate: MoodEntry = {
        mood: existing?.mood,
        categories: Object.keys(categories).length > 0 ? categories : undefined,
      };
      const { [dateKey]: _removed, ...rest } = map;
      return MoodService.isEmpty(candidate) ? rest : { ...rest, [dateKey]: candidate };
    });
  }
}
