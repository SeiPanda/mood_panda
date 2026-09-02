import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProfileService, ProfileId } from '../../services/profile.service';

@Component({
  selector: 'app-navbar',
  imports: [MatButtonModule, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  private readonly profileService = inject(ProfileService);

  readonly profiles = this.profileService.profiles;
  readonly activeId = this.profileService.activeId;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const currentWidth = event.target.innerWidth;
    if (currentWidth > 650) {
      this.toggle = false;
    }
  }
  toggle: boolean = false;

  switchProfile(id: ProfileId) {
    this.profileService.setActive(id);
  }

  triggerSideNav() {
    this.toggle = !this.toggle;
  }

  clickedOutside() {
    this.toggle = false;
  }
}
