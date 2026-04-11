import { Component, computed, inject } from '@angular/core';
import { ExpenseService } from '../expense-service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  expenseService = inject(ExpenseService);

  totalExpenses = this.expenseService.totalExpense;
  transactionCount = this.expenseService.transactionCount;
  highestExpense = this.expenseService.highestExpense;
  averageExpense = this.expenseService.averageExpense;
}
