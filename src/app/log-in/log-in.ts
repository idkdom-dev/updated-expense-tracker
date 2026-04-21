import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-log-in',
  imports: [FormsModule, RouterLink],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css',
})
export class LogIn {
  authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal<boolean>(false);
  error = signal<string>('');

  async signInWithEmail(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.authService.signInWithEmail(this.email, this.password);
      void this.router.navigate(['/']);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.authService.signInWithGoogle();
      void this.router.navigate(['/']);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return 'An error occurred during login.';
  }
}
