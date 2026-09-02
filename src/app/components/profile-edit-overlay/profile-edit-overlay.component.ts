import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProfileService, PROFILE_ICONS } from '../../services/profile.service';
import { ProfileEditOverlayService } from '../../services/profile-edit-overlay.service';

@Component({
  selector: 'app-profile-edit-overlay',
  imports: [FormsModule, MatIconModule],
  templateUrl: './profile-edit-overlay.component.html',
  styleUrls: ['./profile-edit-overlay.component.scss'],
})
export class ProfileEditOverlayComponent {
  private readonly profileService = inject(ProfileService);
  private readonly overlayService = inject(ProfileEditOverlayService);

  protected readonly icons = PROFILE_ICONS;
  protected readonly editingId = this.overlayService.editingId;
  protected readonly isOpen = computed(() => this.editingId() !== null);

  protected readonly profile = computed(() =>
    this.profileService.profiles().find((p) => p.id === this.editingId()),
  );

  protected name = '';
  protected icon = '';

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (profile) {
        this.name = profile.name;
        this.icon = profile.icon;
      }
    });
  }

  selectIcon(icon: string) {
    this.icon = icon;
  }

  save() {
    const id = this.editingId();
    if (!id || !this.name.trim()) {
      return;
    }
    this.profileService.updateProfile(id, { name: this.name, icon: this.icon });
    this.overlayService.close();
  }

  close() {
    this.overlayService.close();
  }
}
