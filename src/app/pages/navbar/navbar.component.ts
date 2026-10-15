import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProfileService, ProfileId } from '../../services/profile.service';
import { ProfileEditOverlayService } from '../../services/profile-edit-overlay.service';
import { DataTransferService } from '../../services/data-transfer.service';
import { DataTransferOverlayService } from '../../services/data-transfer-overlay.service';

@Component({
  selector: 'app-navbar',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  private readonly profileService = inject(ProfileService);
  private readonly profileEditOverlay = inject(ProfileEditOverlayService);
  private readonly dataTransfer = inject(DataTransferService);
  private readonly dataTransferOverlay = inject(DataTransferOverlayService);

  @ViewChild('importInput') private importInput?: ElementRef<HTMLInputElement>;

  readonly profiles = this.profileService.profiles;
  readonly activeId = this.profileService.activeId;
  readonly active = this.profileService.active;
  readonly settingsOpen = signal(false);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const currentWidth = event.target.innerWidth;
    if (currentWidth > 650) {
      this.toggle = false;
    }
  }
  toggle: boolean = false;

  toggleSettings() {
    this.settingsOpen.update((open) => !open);
  }

  closeSettings() {
    this.settingsOpen.set(false);
  }

  switchProfile(id: ProfileId) {
    this.closeSettings();
    this.profileService.setActive(id);
  }

  editActiveProfile() {
    this.closeSettings();
    this.profileEditOverlay.open(this.activeId());
  }

  exportData() {
    this.closeSettings();
    this.dataTransferOverlay.openExport();
  }

  triggerImport() {
    this.closeSettings();
    this.importInput?.nativeElement.click();
  }

  async onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const payload = await this.dataTransfer.readFile(file);
      this.dataTransferOverlay.openImport(payload);
    } catch {
      alert('Die Datei konnte nicht gelesen werden. Ist es eine gültige Export-Datei?');
    }
  }

  triggerSideNav() {
    this.toggle = !this.toggle;
  }

  clickedOutside() {
    this.toggle = false;
  }
}
