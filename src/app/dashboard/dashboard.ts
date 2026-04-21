import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Expense } from '../expense';
import { ExpenseService } from '../expense-service';
type DateWindowFilter = 'all' | 'thisMonth' | 'last30';
type AmountRangeFilter = 'all' | '0-50' | '50-200' | '200+';
type TransactionType = 'Income' | 'Expense';

interface DashboardTransaction extends Expense {
  type?: TransactionType;
  date?: string;
  notes?: string;
}

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
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly expenseService = inject(ExpenseService);
  readonly selectedDateWindow = signal<DateWindowFilter>('all');
  readonly selectedCategory = signal<string>('All');
  readonly selectedAmountRange = signal<AmountRangeFilter>('all');
  readonly monthlyBudgetGoal = signal<number>(2000);

  private readonly fallbackColors = [
    '#0d6efd',
    '#6f42c1',
    '#20c997',
    '#fd7e14',
    '#198754',
    '#d63384',
    '#0dcaf0',
  ];

  private readonly categoryColors: Record<string, string> = {
    Food: '#fd7e14',
    Rent: '#6f42c1',
    Travel: '#0dcaf0',
    Grocery: '#198754',
    Utilities: '#ffc107',
    Shopping: '#d63384',
    Personal: '#6610f2',
    Work: '#0d6efd',
  };

  private readonly categoryBudgets: Record<string, number> = {
    Food: 450,
    Rent: 1100,
    Travel: 250,
    Grocery: 300,
    Utilities: 260,
    Shopping: 220,
    Personal: 180,
    Work: 150,
  };

  readonly allTransactions = computed<DashboardTransaction[]>(
    () => this.expenseService.expenses() as DashboardTransaction[],
  );

  readonly filterCategories = computed(() => {
    const categories = new Set<string>(['All']);
    for (const category of this.expenseService.categories()) {
      categories.add(category);
    }
    for (const transaction of this.allTransactions()) {
      categories.add(transaction.category);
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
    this.filteredTransactions().filter((transaction) => this.getTransactionType(transaction) === 'Expense'),
  );

  readonly incomeTransactions = computed(() =>
    this.filteredTransactions().filter((transaction) => this.getTransactionType(transaction) === 'Income'),
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
      .map(([category, amount], index) => ({
        category,
        amount,
        percent: totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0,
        color: this.resolveCategoryColor(category, index),
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

    return Object.entries(this.categoryBudgets)
      .map(([category, budget], index) => {
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
          color: this.resolveCategoryColor(category, index),
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
          this.resolveTransactionDate(second).getTime() - this.resolveTransactionDate(first).getTime(),
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

  formatTransactionNotes(transaction: DashboardTransaction): string {
    return transaction.notes?.trim() ? transaction.notes : '—';
  }

  isIncome(transaction: DashboardTransaction): boolean {
    return this.getTransactionType(transaction) === 'Income';
  }

  private getTransactionType(transaction: DashboardTransaction): TransactionType {
    return transaction.type === 'Income' ? 'Income' : 'Expense';
  }

  private passesDateWindowFilter(transaction: DashboardTransaction): boolean {
    const selectedWindow = this.selectedDateWindow();
    if (selectedWindow === 'all') return true;

    const transactionDate = this.resolveTransactionDate(transaction);
    const now = new Date();

    if (selectedWindow === 'last30') {
      const last30 = new Date(now);
      last30.setDate(now.getDate() - 30);
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

    const parsedId = Number(transaction.id);
    if (Number.isFinite(parsedId) && parsedId > 0) {
      const idDate = new Date(parsedId);
      if (!Number.isNaN(idDate.getTime())) {
        return idDate;
      }
    }

    return new Date();
  }

  private resolveCategoryColor(category: string, index: number): string {
    return this.categoryColors[category] ?? this.fallbackColors[index % this.fallbackColors.length];
  }
}
