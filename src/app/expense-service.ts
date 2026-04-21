import { computed, Injectable, signal, effect, inject } from '@angular/core';
import { Expense, CategoryMetadata } from './expense';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestoreDb } from './firebase';
import { AuthService } from './auth-service';
import { CategoryService } from './category-service';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);

  categories = this.categoryService.categories;
  categoryMetadata = this.categoryService.categoryMetadata;

  expenses = signal<Expense[]>([]);
  // categories = signal<string[]>([
  //   'Work',
  //   'Personal',
  //   'Grocery',
  //   'Utilities',
  //   'Shopping',
  //   'Travel',
  //   'Food',
  // ]);

  // categoryMetadata = signal<Record<string, CategoryMetadata>>({
  //   Work: { name: 'Work', color: '#0d6efd', icon: 'briefcase', isCustom: false },
  //   Personal: { name: 'Personal', color: '#6610f2', icon: 'person', isCustom: false },
  //   Grocery: { name: 'Grocery', color: '#198754', icon: 'shopping-cart', isCustom: false },
  //   Utilities: { name: 'Utilities', color: '#ffc107', icon: 'lightbulb', isCustom: false },
  //   Shopping: { name: 'Shopping', color: '#d63384', icon: 'bag', isCustom: false },
  //   Travel: { name: 'Travel', color: '#0dcaf0', icon: 'plane', isCustom: false },
  //   Food: { name: 'Food', color: '#fd7e14', icon: 'utensils', isCustom: false },
  // });

  isLoading = signal<boolean>(false);
  error = signal<string>('');

  constructor() {
    // Load expenses when user logs in
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.loadExpensesFromFirebase(user.uid);
        void this.loadCategoriesFromFirebase(user.uid);
      } else {
        this.expenses.set([]);
        this.categories.set([
          'Work',
          'Personal',
          'Grocery',
          'Utilities',
          'Shopping',
          'Travel',
          'Food',
        ]);
      }
    });
  }

  totalExpense = computed(() => this.expenses().reduce((sum, e) => sum + e.amount, 0));

  transactionCount = computed(() => this.expenses().length);

  highestExpense = computed(() => {
    const arr = this.expenses();
    return arr.length ? Math.max(...arr.map((e) => e.amount)) : 0;
  });

  averageExpense = computed(() => {
    const arr = this.expenses();
    return arr.length ? arr.reduce((sum, e) => sum + e.amount, 0) / arr.length : 0;
  });

  getExpenseById(id: string) {
    return this.expenses().find((expense) => expense.id === id);
  }

  async addExpense(expense: Omit<Expense, 'id' | 'userId'>): Promise<string> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User must be logged in to add expenses');
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      const expensesCollection = collection(firestoreDb, `users/${user.uid}/expenses`);
      const docRef = await addDoc(expensesCollection, {
        ...expense,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add to local state
      const newExpense: Expense = {
        ...expense,
        id: docRef.id,
        userId: user.uid,
      };
      this.expenses.update((list) => [...list, newExpense]);

      return docRef.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error adding expense';
      this.error.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateExpense(updatedExpense: Expense): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User must be logged in to update expenses');
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      const expenseRef = doc(firestoreDb, `users/${user.uid}/expenses/${updatedExpense.id}`);
      await updateDoc(expenseRef, {
        ...updatedExpense,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      this.expenses.update((list) =>
        list.map((expense) => (expense.id === updatedExpense.id ? updatedExpense : expense)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating expense';
      this.error.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async removeExpense(id: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User must be logged in to delete expenses');
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      const expenseRef = doc(firestoreDb, `users/${user.uid}/expenses/${id}`);
      await deleteDoc(expenseRef);

      // Update local state
      this.expenses.update((list) => list.filter((e) => e.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting expense';
      this.error.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async addCategory(name: string, color: string, icon: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User must be logged in to add categories');
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      const metadata: CategoryMetadata = {
        name,
        color,
        icon,
        isCustom: true,
      };

      // Save to Firebase
      const categoriesRef = doc(firestoreDb, `users/${user.uid}/categories/${name}`);
      await setDoc(categoriesRef, metadata);

      // Update local state
      this.categories.update((list) => [...list, name]);
      this.categoryMetadata.update((meta) => ({
        ...meta,
        [name]: metadata,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error adding category';
      this.error.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateCategoryMetadata(name: string, color: string, icon: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User must be logged in to update categories');
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      const metadata: CategoryMetadata = {
        name,
        color,
        icon,
        isCustom: this.categoryMetadata()[name]?.isCustom ?? false,
      };

      // Save to Firebase
      const categoryRef = doc(firestoreDb, `users/${user.uid}/categories/${name}`);
      await setDoc(categoryRef, metadata, { merge: true });

      // Update local state
      this.categoryMetadata.update((meta) => ({
        ...meta,
        [name]: metadata,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating category';
      this.error.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteCategory(name: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User must be logged in to delete categories');
    }

    const meta = this.categoryMetadata()[name];
    if (!meta?.isCustom) {
      throw new Error('Default categories cannot be deleted');
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      // Delete from Firebase
      const categoryRef = doc(firestoreDb, `users/${user.uid}/categories/${name}`);
      await deleteDoc(categoryRef);

      // Update local state
      this.categories.update((list) => list.filter((c) => c !== name));
      this.categoryMetadata.update((meta) => {
        const newMeta = { ...meta };
        delete newMeta[name];
        return newMeta;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting category';
      this.error.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadExpensesFromFirebase(userId: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set('');

      const expensesCollection = collection(firestoreDb, `users/${userId}/expenses`);
      const snapshot = await getDocs(expensesCollection);

      const loadedExpenses: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedExpenses.push({
          id: doc.id,
          title: data['title'] || '',
          amount: data['amount'] || 0,
          category: data['category'] || 'Personal',
          date: data['date'] || new Date().toISOString().split('T')[0],
          description: data['description'] || '',
          userId,
        });
      });

      this.expenses.set(loadedExpenses);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading expenses';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadCategoriesFromFirebase(userId: string): Promise<void> {
    try {
      const categoriesCollection = collection(firestoreDb, `users/${userId}/categories`);
      const snapshot = await getDocs(categoriesCollection);

      const metadata: Record<string, CategoryMetadata> = { ...this.categoryMetadata() };
      const allCategories = new Set(this.categories());

      snapshot.forEach((doc) => {
        const data = doc.data();
        const name = doc.id;
        metadata[name] = {
          name: data['name'] || name,
          color: data['color'] || '#0d6efd',
          icon: data['icon'] || 'tag',
          isCustom: data['isCustom'] ?? true,
        };
        allCategories.add(name);
      });

      this.categoryMetadata.set(metadata);
      this.categories.set(Array.from(allCategories));
    } catch (err) {
      // Silently fail if categories don't exist yet
      console.error('Error loading categories:', err);
    }
  }

  getCategoryColor(category: string): string {
    return this.categoryMetadata()[category]?.color ?? '#0d6efd';
  }

  getCategoryIcon(category: string): string {
    return this.categoryMetadata()[category]?.icon ?? 'tag';
  }
}
