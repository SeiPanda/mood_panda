import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  imports: [MatButtonModule, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const currentWidth = event.target.innerWidth;
    if (currentWidth > 650) {
      this.toggle = false;
    }
  }
  toggle: boolean = false;

  triggerSideNav() {
    this.toggle = !this.toggle;
  }

  clickedOutside() {
    this.toggle = false;
  }
}
