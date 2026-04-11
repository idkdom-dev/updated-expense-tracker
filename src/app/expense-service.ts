import { computed, Injectable, signal } from '@angular/core';
import { Expense } from './expense';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  expenses = signal<Expense[]>([]);
  categories = signal<string[]>([
    'Work',
    'Personal',
    'Grocery',
    'Utilities',
    'Shopping',
    'Travel',
    'Food',
  ]);

  totalExpense = computed(() => this.expenses().reduce((sum, e) => sum + e.amount, 0));

  transactionCount = computed(() => this.expenses().length);

  highestExpense = computed(() => {
    const arr = this.expenses();
    return arr.length ? Math.max(...arr.map((e) => e.amount)) : 0;
  });

  averageExpense = computed(() => {
    const arr = this.expenses();
    return arr.length ? arr.reduce((sum, e) => sum + e.amount, 0) / arr.length : 0;
  });

  getExpenseById(id: string) {
    return this.expenses().find((expense) => expense.id === id);
  }

  addExpense(expense: Expense) {
    this.expenses.update((list) => [...list, expense]);
  }

  updateExpense(updatedExpense: Expense) {
    this.expenses.update((list) =>
      list.map((expense) => (expense.id === updatedExpense.id ? updatedExpense : expense)),
    );
  }

  removeExpense(id: string) {
    this.expenses.update((list) => list.filter((e) => e.id !== id));
  }
}
