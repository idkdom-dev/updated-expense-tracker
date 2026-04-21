import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service';
import { ExpenseService } from '../expense-service';

@Component({
  selector: 'app-manage-account',
  imports: [FormsModule],
  templateUrl: './manage-account.html',
  styleUrl: './manage-account.css',
})
export class ManageAccount {
  authService = inject(AuthService);
  expenseService = inject(ExpenseService);
  private router = inject(Router);

  name = '';
  monthlyBudgetGoal = 2000;
  categoryBudgets: Record<string, number> = {};
  newCategoryName = '';
  newCategoryColor = '#0d6efd';
  newCategoryIcon = 'tag';
  editingCategory: string | null = null;
  editingColor = '';
  editingIcon = '';
  loading = signal<boolean>(false);
  success = signal<string>('');
  error = signal<string>('');
  showAddCategoryForm = signal<boolean>(false);

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

  get categories(): string[] {
    return this.expenseService.categories().sort();
  }

  get customCategories(): string[] {
    return this.categories.filter((cat) => this.expenseService.categoryMetadata()[cat]?.isCustom);
  }

  getCategoryColor(category: string): string {
    return this.expenseService.getCategoryColor(category);
  }

  getCategoryIcon(category: string): string {
    return this.expenseService.getCategoryIcon(category);
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

  async addCustomCategory(): Promise<void> {
    if (!this.newCategoryName.trim()) {
      this.error.set('Category name is required');
      return;
    }

    if (this.categories.includes(this.newCategoryName.trim())) {
      this.error.set('This category already exists');
      return;
    }

    try {
      this.loading.set(true);
      this.error.set('');

      await this.expenseService.addCategory(
        this.newCategoryName.trim(),
        this.newCategoryColor,
        this.newCategoryIcon,
      );

      // Initialize budget for new category
      this.categoryBudgets[this.newCategoryName.trim()] = 300;

      this.newCategoryName = '';
      this.newCategoryColor = '#0d6efd';
      this.newCategoryIcon = 'tag';
      this.showAddCategoryForm.set(false);
      this.success.set('Category added successfully!');
      setTimeout(() => this.success.set(''), 3000);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  startEditCategory(category: string): void {
    this.editingCategory = category;
    this.editingColor = this.getCategoryColor(category);
    this.editingIcon = this.getCategoryIcon(category);
  }

  async saveEditCategory(): Promise<void> {
    if (!this.editingCategory) return;

    try {
      this.loading.set(true);
      this.error.set('');

      await this.expenseService.updateCategoryMetadata(
        this.editingCategory,
        this.editingColor,
        this.editingIcon,
      );

      this.editingCategory = null;
      this.success.set('Category updated successfully!');
      setTimeout(() => this.success.set(''), 3000);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  cancelEditCategory(): void {
    this.editingCategory = null;
  }

  async deleteCategory(category: string): Promise<void> {
    if (
      !confirm(`Are you sure you want to delete the "${category}" category? This cannot be undone.`)
    ) {
      return;
    }

    try {
      this.loading.set(true);
      this.error.set('');

      await this.expenseService.deleteCategory(category);

      // Remove budget for deleted category
      delete this.categoryBudgets[category];

      this.success.set('Category deleted successfully!');
      setTimeout(() => this.success.set(''), 3000);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  toggleAddCategoryForm(): void {
    this.showAddCategoryForm.update((v) => !v);
    if (!this.showAddCategoryForm()) {
      this.newCategoryName = '';
      this.newCategoryColor = '#0d6efd';
      this.newCategoryIcon = 'tag';
    }
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return 'An error occurred while updating profile.';
  }
}
