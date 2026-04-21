import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AddExpense } from './add-expense/add-expense';
import { EditExpense } from './edit-expense/edit-expense';
import { ExpenseList } from './expense-list/expense-list';
import { LogIn } from './log-in/log-in';
import { CreateAccount } from './create-account/create-account';
import { ManageAccount } from './manage-account/manage-account';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'add', component: AddExpense },
  { path: 'edit/:id', component: EditExpense },
  { path: 'expenses', component: ExpenseList },
  { path: 'login', component: LogIn },
  { path: 'register', component: CreateAccount },
  { path: 'account', component: ManageAccount },
];
