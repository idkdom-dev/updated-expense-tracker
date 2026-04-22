import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { CurrencyPipe } from '@angular/common';
import { ExpenseService } from '../expense-service';
import { Expense } from '../expense';

@Component({
  selector: 'app-expense-item',
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    CurrencyPipe,
  ],
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

  getCategoryColor(category: string): string {
    return this.expenseService.getCategoryColor(category);
  }

  getCategoryIcon(category: string): string {
    return this.expenseService.getCategoryIcon(category);
  }
}
