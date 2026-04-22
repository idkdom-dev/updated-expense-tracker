import { Component, computed, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { Expense } from '../expense';
import { ExpenseService } from '../expense-service';
import { AuthService } from '../auth-service';

type DateWindowFilter = 'all' | 'thisMonth' | 'last30';
type AmountRangeFilter = 'all' | '0-50' | '50-200' | '200+';
type TransactionType = 'Income' | 'Expense';
type DashboardTransaction = Expense;

interface CategorySpend {
  category: string;
  amount: number;
  percent: number;
  color: string;
}

interface CategoryBudgetProgress {
  category: string;
  spent: number;
  budget: number;
  usagePercent: number;
  progressPercent: number;
  status: 'Safe' | 'Nearing limit' | 'Exceeded';
  color: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatListModule,
    MatTableModule,
    MatBadgeModule,
    MatTabsModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly expenseService = inject(ExpenseService);
  readonly authService = inject(AuthService);
  readonly selectedDateWindow = signal<DateWindowFilter>('all');
  readonly selectedCategory = signal<string>('All');
  readonly selectedAmountRange = signal<AmountRangeFilter>('all');
  readonly monthlyBudgetGoal = signal<number>(2000);
  readonly categoryBudgets = signal<Record<string, number>>({});

  private readonly fallbackColors = [
    '#0d6efd',
    '#6f42c1',
    '#20c997',
    '#fd7e14',
    '#198754',
    '#d63384',
    '#0dcaf0',
  ];

  constructor() {
    // Update monthlyBudgetGoal and categoryBudgets from profile
    effect(() => {
      const profile = this.authService.profile();
      if (profile) {
        this.monthlyBudgetGoal.set(profile.monthlyBudgetGoal);
        this.categoryBudgets.set(profile.categoryBudgets);
      }
    });

    // Force refresh when expenses change
    effect(() => {
      const expenses = this.expenseService.expenses();
      // This will trigger the computed properties to re-evaluate
    });
  }

  readonly allTransactions = computed<DashboardTransaction[]>(
    () => this.expenseService.expenses() as DashboardTransaction[],
  );

  readonly filterCategories = computed(() => {
    // Get unique categories from the actual categories list
    const categories = new Set<string>(['All']);

    // Add all actual categories (this should be updated after rename)
    for (const category of this.expenseService.categories()) {
      categories.add(category);
    }

    // Only add categories from transactions that actually exist in our current categories list
    // This prevents old renamed categories from appearing in filters
    for (const transaction of this.allTransactions()) {
      // Only add the category if it exists in our current categories list
      if (this.expenseService.categories().includes(transaction.category)) {
        categories.add(transaction.category);
      }
    }

    return Array.from(categories);
  });

  readonly filteredTransactions = computed(() =>
    this.allTransactions().filter(
      (transaction) =>
        this.passesDateWindowFilter(transaction) &&
        this.passesCategoryFilter(transaction) &&
        this.passesAmountFilter(transaction),
    ),
  );

  readonly expenseTransactions = computed(() =>
    this.filteredTransactions().filter((transaction) => transaction.type === 'expense'),
  );

  readonly incomeTransactions = computed(() =>
    this.filteredTransactions().filter((transaction) => transaction.type === 'income'),
  );

  readonly totalExpenses = computed(() =>
    this.expenseTransactions().reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
  );

  readonly totalIncome = computed(() =>
    this.incomeTransactions().reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
  );

  readonly netCashFlow = computed(() => this.totalIncome() - this.totalExpenses());
  readonly transactionCount = computed(() => this.filteredTransactions().length);

  readonly budgetUsedPercent = computed(() => {
    const goal = this.monthlyBudgetGoal();
    if (goal <= 0) return 0;
    return (this.totalExpenses() / goal) * 100;
  });

  readonly budgetProgressPercent = computed(() => Math.min(100, this.budgetUsedPercent()));

  readonly budgetStatus = computed(() => {
    const used = this.budgetUsedPercent();
    if (used >= 100) return 'Over budget';
    if (used >= 80) return 'Nearing budget';
    return 'On track';
  });

  readonly categorySpending = computed<CategorySpend[]>(() => {
    const totals: Record<string, number> = {};

    for (const transaction of this.expenseTransactions()) {
      const amount = Math.abs(transaction.amount);
      totals[transaction.category] = (totals[transaction.category] ?? 0) + amount;
    }

    const totalExpenseAmount = this.totalExpenses();

    return Object.entries(totals)
      .sort((first, second) => second[1] - first[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percent: totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0,
        color: this.expenseService.getCategoryColor(category),
      }));
  });

  readonly pieChartGradient = computed(() => {
    const spending = this.categorySpending();
    const totalExpenseAmount = this.totalExpenses();

    if (!spending.length || totalExpenseAmount <= 0) {
      return 'conic-gradient(#dee2e6 0deg 360deg)';
    }

    let currentAngle = 0;
    const slices: string[] = [];

    for (const item of spending.slice(0, 6)) {
      const sliceDegrees = (item.amount / totalExpenseAmount) * 360;
      const start = currentAngle;
      const end = currentAngle + sliceDegrees;
      slices.push(`${item.color} ${start}deg ${end}deg`);
      currentAngle = end;
    }

    if (currentAngle < 360) {
      slices.push(`#e9ecef ${currentAngle}deg 360deg`);
    }

    return `conic-gradient(${slices.join(', ')})`;
  });

  readonly largestIncomeOrExpense = computed(() =>
    Math.max(this.totalIncome(), this.totalExpenses(), 1),
  );

  readonly incomeBarPercent = computed(
    () => (this.totalIncome() / this.largestIncomeOrExpense()) * 100,
  );

  readonly expenseBarPercent = computed(
    () => (this.totalExpenses() / this.largestIncomeOrExpense()) * 100,
  );

  readonly categoryBudgetProgress = computed<CategoryBudgetProgress[]>(() => {
    const spendingMap = new Map<string, number>(
      this.categorySpending().map((item) => [item.category, item.amount]),
    );

    // Only show categories that exist in the current categories list
    return Object.entries(this.categoryBudgets())
      .filter(([category]) => this.expenseService.categories().includes(category))
      .map(([category, budget]) => {
        const spent = spendingMap.get(category) ?? 0;
        const usagePercent = budget > 0 ? (spent / budget) * 100 : 0;

        let status: CategoryBudgetProgress['status'] = 'Safe';
        if (usagePercent >= 100) {
          status = 'Exceeded';
        } else if (usagePercent >= 80) {
          status = 'Nearing limit';
        }

        return {
          category,
          spent,
          budget,
          usagePercent,
          progressPercent: Math.min(100, usagePercent),
          status,
          color: this.expenseService.getCategoryColor(category),
        };
      })
      .sort((first, second) => second.usagePercent - first.usagePercent);
  });

  readonly budgetAlerts = computed(() =>
    this.categoryBudgetProgress().filter((row) => row.usagePercent >= 80),
  );

  readonly recentTransactions = computed(() =>
    [...this.filteredTransactions()]
      .sort(
        (first, second) =>
          this.resolveTransactionDate(second).getTime() -
          this.resolveTransactionDate(first).getTime(),
      )
      .slice(0, 5),
  );

  setDateWindow(value: string) {
    if (value === 'all' || value === 'thisMonth' || value === 'last30') {
      this.selectedDateWindow.set(value);
    }
  }

  setCategory(value: string) {
    this.selectedCategory.set(value);
  }

  setAmountRange(value: string) {
    if (value === 'all' || value === '0-50' || value === '50-200' || value === '200+') {
      this.selectedAmountRange.set(value);
    }
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  formatTransactionDate(transaction: DashboardTransaction): string {
    return this.resolveTransactionDate(transaction).toLocaleDateString();
  }

  formatTransactionAmount(transaction: DashboardTransaction): string {
    const sign = this.isIncome(transaction) ? '+' : '-';
    return `${sign}${this.formatCurrency(Math.abs(transaction.amount))}`;
  }

  isIncome(transaction: DashboardTransaction): boolean {
    return this.getTransactionType(transaction) === 'Income';
  }

  private getTransactionType(transaction: DashboardTransaction): TransactionType {
    // If type is explicitly set, use it
    if (transaction.type) {
      const type = transaction.type;
      if (type === 'expense') {
        return 'Expense';
      } else if (type === 'income') {
        return 'Income';
      }
    }

    // Default to expense for backward compatibility
    return 'Expense';
  }

  private passesDateWindowFilter(transaction: DashboardTransaction): boolean {
    const selectedWindow = this.selectedDateWindow();
    if (selectedWindow === 'all') return true;

    const transactionDate = this.resolveTransactionDate(transaction);
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    if (selectedWindow === 'last30') {
      const last30 = new Date(now);
      last30.setDate(now.getDate() - 30);
      last30.setHours(0, 0, 0, 0); // Start of day 30 days ago
      return transactionDate >= last30 && transactionDate <= now;
    }

    return (
      transactionDate.getMonth() === now.getMonth() &&
      transactionDate.getFullYear() === now.getFullYear()
    );
  }

  private passesCategoryFilter(transaction: DashboardTransaction): boolean {
    const selectedCategory = this.selectedCategory();
    if (selectedCategory === 'All') return true;
    return transaction.category === selectedCategory;
  }

  private passesAmountFilter(transaction: DashboardTransaction): boolean {
    const amount = Math.abs(transaction.amount);
    const selectedRange = this.selectedAmountRange();

    if (selectedRange === 'all') return true;
    if (selectedRange === '0-50') return amount <= 50;
    if (selectedRange === '50-200') return amount > 50 && amount <= 200;
    return amount > 200;
  }

  private resolveTransactionDate(transaction: DashboardTransaction): Date {
    if (transaction.date) {
      const explicitDate = new Date(transaction.date);
      if (!Number.isNaN(explicitDate.getTime())) {
        return explicitDate;
      }
    }

    return new Date();
  }
}
