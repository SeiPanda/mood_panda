import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './pages/navbar/navbar.component';
import { DiaryEntryOverlayComponent } from './components/diary-entry-overlay/diary-entry-overlay.component';
import { ProfileEditOverlayComponent } from './components/profile-edit-overlay/profile-edit-overlay.component';
import { DataTransferOverlayComponent } from './components/data-transfer-overlay/data-transfer-overlay.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavbarComponent,
    DiaryEntryOverlayComponent,
    ProfileEditOverlayComponent,
    DataTransferOverlayComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('mood-panda');
}
