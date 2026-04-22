import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { MatDialogModule } from '@angular/material/dialog';
import { ExpenseService } from '../expense-service';
import { Expense } from '../expense';

interface EditExpenseData extends Expense {
  type: 'expense' | 'income';
}

@Component({
  selector: 'app-edit-expense',
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
    MatDialogModule,
  ],
  templateUrl: './edit-expense.html',
  styleUrl: './edit-expense.css',
})
export class EditExpense implements OnInit {
  id = '';
  transactionType: 'expense' | 'income' = 'expense';
  title = '';
  amount: number | null = null;
  category = 'Personal';
  date: string = new Date().toISOString().split('T')[0];
  description = '';
  loading = signal<boolean>(false);
  error = signal<string>('');

  route = inject(ActivatedRoute);
  router = inject(Router);
  expenseService = inject(ExpenseService);

  get categoryList() {
    return this.expenseService.categories();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/expenses']);
      return;
    }

    const expense = this.expenseService.getExpenseById(id);
    if (!expense) {
      this.router.navigate(['/expenses']);
      return;
    }

    this.id = expense.id;
    this.title = expense.title;
    this.amount = expense.amount;
    this.category = expense.category;
    this.date = expense.date || new Date().toISOString().split('T')[0];
    this.description = expense.description || '';

    // Set transaction type from existing expense
    this.transactionType = (expense as EditExpenseData).type || 'expense';
  }

  async saveExpense() {
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

      const updatedExpense: EditExpenseData = {
        id: this.id,
        title: this.title.trim(),
        amount: Number(this.amount),
        category: this.category,
        date: this.date,
        description: this.description.trim(),
        type: this.transactionType,
        userId: 'current-user-id', // This will be replaced with actual user ID
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.expenseService.updateExpense(updatedExpense);
      void this.router.navigate(['/expenses']);
    } catch (err) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async deleteExpense() {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      this.loading.set(true);
      this.error.set('');

      await this.expenseService.removeExpense(this.id);
      void this.router.navigate(['/expenses']);
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
    return 'An error occurred while saving the transaction.';
  }
}
