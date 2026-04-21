import { Component, OnInit, inject } from '@angular/core';
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
  category = '';

  route = inject(ActivatedRoute);
  router = inject(Router);
  expenseService = inject(ExpenseService);

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
  }

  saveExpense() {
    if (!this.id || !this.title || this.amount === null || !this.category) return;

    const updatedExpense: Expense = {
      id: this.id,
      title: this.title,
      amount: Number(this.amount),
      category: this.category as any,
    };

    this.expenseService.updateExpense(updatedExpense);
    this.router.navigate(['/expenses']);
  }
}
