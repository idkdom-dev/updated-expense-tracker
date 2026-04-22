import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ExpenseService } from '../expense-service';

interface ExpenseData {
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  type: 'expense' | 'income';
}

@Component({
  selector: 'app-add-expense',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './add-expense.html',
  styleUrl: './add-expense.css',
})
export class AddExpense {
  transactionType: 'expense' | 'income' = 'expense';
  title = '';
  amount: number | null = null;
  category: string = 'Personal';
  date: string = new Date().toISOString().split('T')[0];
  description = '';
  newCategoryName = '';
  newCategoryColor = '#0d6efd';
  newCategoryIcon = 'tag';
  showAddCategoryForm = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string>('');

  expenseService = inject(ExpenseService);
  router = inject(Router);

  get categoryList() {
    return this.expenseService.categories();
  }

  async addExpense() {
    // Validate inputs
    if (!this.title.trim()) {
      this.error.set('Title is required');
      return;
    }
    if (this.amount === null || this.amount <= 0) {
      this.error.set('Amount must be greater than 0');
      return;
    }
    if (!this.category) {
      this.error.set('Category is required');
      return;
    }
    if (!this.date) {
      this.error.set('Date is required');
      return;
    }

    try {
      this.loading.set(true);
      this.error.set('');

      const expenseData: ExpenseData = {
        title: this.title.trim(),
        amount: Number(this.amount),
        category: this.category,
        date: this.date,
        description: this.description.trim(),
        type: this.transactionType,
      };

      await this.expenseService.addExpense(expenseData);

      void this.router.navigate(['/expenses']);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async addCategory() {
    if (!this.newCategoryName.trim()) {
      this.error.set('Category name is required');
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

      // Set the new category as selected
      this.category = this.newCategoryName.trim();
      this.newCategoryName = '';
      this.newCategoryColor = '#0d6efd';
      this.newCategoryIcon = 'tag';
      this.showAddCategoryForm.set(false);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  toggleAddCategoryForm() {
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
    return 'An error occurred while adding the transaction.';
  }
}
