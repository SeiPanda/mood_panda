import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatIconModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
})
export class ConfirmDialogComponent {
  private readonly dialogService = inject(ConfirmDialogService);

  protected readonly request = this.dialogService.request;
  protected readonly isOpen = computed(() => this.request() !== null);

  confirm() {
    this.dialogService.respond(true);
  }

  cancel() {
    this.dialogService.respond(false);
  }
}
