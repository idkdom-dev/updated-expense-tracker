import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../expense-service';
import { Expense } from '../expense';

@Component({
  selector: 'app-edit-expense',
  imports: [FormsModule],
  templateUrl: './edit-expense.html',
  styleUrl: './edit-expense.css',
})
export class EditExpense implements OnInit {
  id = '';
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

      const updatedExpense: Expense = {
        id: this.id,
        title: this.title.trim(),
        amount: Number(this.amount),
        category: this.category,
        date: this.date,
        description: this.description.trim(),
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
    if (!confirm('Are you sure you want to delete this expense?')) {
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
    return 'An error occurred while saving the expense.';
  }
}
