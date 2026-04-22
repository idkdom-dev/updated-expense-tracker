export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  type?: 'expense' | 'income';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryMetadata {
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
}
