export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  description?: string;
  userId?: string;
}

export interface CategoryMetadata {
  name: string;
  color: string;
  icon: string;
  isCustom?: boolean;
}
