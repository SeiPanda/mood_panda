import { Component, computed, input } from '@angular/core';
import { MOOD_LEVELS } from '../../services/mood.service';

@Component({
  selector: 'app-mood-face',
  templateUrl: './mood-face.component.html',
  styleUrls: ['./mood-face.component.scss'],
})
export class MoodFaceComponent {
  readonly level = input<number | undefined>(undefined);

  protected readonly moodLevel = computed(() => {
    const level = this.level();
    return level === undefined ? undefined : MOOD_LEVELS[level];
  });
}
