import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-habit-color-picker',
  imports: [MatIconModule],
  templateUrl: './habit-color-picker.component.html',
  styleUrls: ['./habit-color-picker.component.scss'],
})
export class HabitColorPickerComponent {
  readonly color = input.required<string>();
  readonly colorChange = output<string>();

  onNativeColorInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.colorChange.emit(value);
  }
}
