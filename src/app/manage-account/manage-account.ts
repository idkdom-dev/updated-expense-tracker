import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-manage-account',
  imports: [FormsModule],
  templateUrl: './manage-account.html',
  styleUrl: './manage-account.css',
})
export class ManageAccount {
  authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  monthlyBudgetGoal = 2000;
  categoryBudgets: Record<string, number> = {};
  loading = signal<boolean>(false);
  success = signal<string>('');
  error = signal<string>('');

  constructor() {
    // Redirect to login if not authenticated
    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/login']);
    }

    // Load profile data when it becomes available
    effect(() => {
      const profile = this.authService.profile();
      if (profile) {
        this.name = profile.name;
        this.monthlyBudgetGoal = profile.monthlyBudgetGoal;
        this.categoryBudgets = { ...profile.categoryBudgets };
      }
    });
  }

  async updateProfile(): Promise<void> {
    // Validate
    if (!this.name.trim()) {
      this.error.set('Name is required');
      return;
    }
    if (this.monthlyBudgetGoal <= 0) {
      this.error.set('Monthly budget must be greater than 0');
      return;
    }

    this.loading.set(true);
    this.success.set('');
    this.error.set('');

    try {
      await this.authService.updateAccountProfile({
        name: this.name,
        monthlyBudgetGoal: this.monthlyBudgetGoal,
        categoryBudgets: this.categoryBudgets,
      });
      this.success.set('Profile updated successfully!');
      setTimeout(() => this.success.set(''), 5000);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  updateCategoryBudget(category: string, value: number): void {
    this.categoryBudgets[category] = value >= 0 ? value : 0;
  }

  get categories(): string[] {
    return Object.keys(this.categoryBudgets).sort();
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return 'An error occurred while updating profile.';
  }
}
