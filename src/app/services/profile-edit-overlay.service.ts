import { Injectable, signal } from '@angular/core';
import { ProfileId } from './profile.service';

/** Controls the "Profil bearbeiten" overlay; holds the profile being edited. */
@Injectable({ providedIn: 'root' })
export class ProfileEditOverlayService {
  readonly editingId = signal<ProfileId | null>(null);

  open(profileId: ProfileId) {
    this.editingId.set(profileId);
  }

  close() {
    this.editingId.set(null);
  }
}
