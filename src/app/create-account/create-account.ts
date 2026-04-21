import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-create-account',
  imports: [FormsModule, RouterLink],
  templateUrl: './create-account.html',
  styleUrl: './create-account.css',
})
export class CreateAccount {
  authService = inject(AuthService);
  private router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = signal<boolean>(false);
  error = signal<string>('');

  async registerWithEmail(): Promise<void> {
    // Validate inputs
    if (!this.fullName.trim()) {
      this.error.set('Full name is required');
      return;
    }
    if (!this.email.trim()) {
      this.error.set('Email is required');
      return;
    }
    if (!this.password) {
      this.error.set('Password is required');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      await this.authService.registerWithEmail(this.email, this.password, this.fullName);
      void this.router.navigate(['/']);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async signUpWithGoogle(): Promise<void> {
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
    return 'An error occurred during registration.';
  }
}
