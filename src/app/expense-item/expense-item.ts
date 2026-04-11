import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExpenseService } from '../expense-service';
import { Expense } from '../expense';

@Component({
  selector: 'app-expense-item',
  imports: [RouterLink],
  templateUrl: './expense-item.html',
  styleUrl: './expense-item.css',
})
export class ExpenseItem {
  @Input() expenseId?: string;

  expenseService = inject(ExpenseService);

  expense = computed(() =>
    this.expenseId ? this.expenseService.getExpenseById(this.expenseId) : undefined,
  );

  highlight = computed(() => (this.expense()?.amount ?? 0) > 100);

  deleteExpense() {
    if (!this.expenseId) return;
    this.expenseService.removeExpense(this.expenseId);
  }
}
