import { Component, computed } from '@angular/core';
import { ExpenseService } from '../expense-service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  constructor(public expenseService: ExpenseService) {}

  totalExpenses = computed(() => this.expenseService.expenses().reduce((s, e) => s + e.amount, 0));

  count = computed(() => this.expenseService.expenses().length);

  highest = computed(() => {
    const arr = this.expenseService.expenses();
    return arr.length ? Math.max(...arr.map((e) => e.amount)) : 0;
  });

  average = computed(() => {
    const arr = this.expenseService.expenses();
    return arr.length ? arr.reduce((s, e) => s + e.amount, 0) / arr.length : 0;
  });
}
