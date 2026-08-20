import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './pages/navbar/navbar.component';
import { DiaryEntryOverlayComponent } from './components/diary-entry-overlay/diary-entry-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, DiaryEntryOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('mood-panda');
}
