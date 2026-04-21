import { Injectable, computed, inject, signal } from '@angular/core';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ExpenseService } from './expense-service';
import { firebaseAuth, firestoreDb, googleAuthProvider } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  monthlyBudgetGoal: number;
  categoryBudgets: Record<string, number>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface ProfileUpdateInput {
  name: string;
  monthlyBudgetGoal: number;
  categoryBudgets: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly expenseService = inject(ExpenseService);

  readonly currentUser = signal<User | null>(null);
  readonly profile = signal<UserProfile | null>(null);
  readonly authReady = signal<boolean>(false);
  readonly authError = signal<string>('');
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  constructor() {
    onAuthStateChanged(firebaseAuth, (user) => {
      void this.handleAuthStateChanged(user);
    });
  }

  async registerWithEmail(email: string, password: string, name: string): Promise<void> {
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();

    const credential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);

    if (normalizedName) {
      await updateProfile(credential.user, { displayName: normalizedName });
    }

    await this.loadOrCreateUserProfile(credential.user, normalizedName);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    await this.loadOrCreateUserProfile(credential.user);
  }

  async signInWithGoogle(): Promise<void> {
    const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
    await this.loadOrCreateUserProfile(credential.user);
  }

  async signOutUser(): Promise<void> {
    await signOut(firebaseAuth);
  }

  async updateAccountProfile(input: ProfileUpdateInput): Promise<void> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Sign in before updating your account profile.');
    }

    const normalizedName =
      input.name.trim() || user.displayName || this.fallbackNameFromEmail(user.email);
    const normalizedMonthlyBudgetGoal =
      Number.isFinite(input.monthlyBudgetGoal) && input.monthlyBudgetGoal > 0
        ? input.monthlyBudgetGoal
        : 2000;
    const normalizedCategoryBudgets = this.normalizeCategoryBudgets(input.categoryBudgets);

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? '',
      name: normalizedName,
      monthlyBudgetGoal: normalizedMonthlyBudgetGoal,
      categoryBudgets: normalizedCategoryBudgets,
    };

    const userRef = doc(firestoreDb, 'users', user.uid);

    await setDoc(
      userRef,
      {
        ...profile,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (user.displayName !== normalizedName) {
      await updateProfile(user, { displayName: normalizedName });
    }

    this.profile.set(profile);
  }

  private async handleAuthStateChanged(user: User | null): Promise<void> {
    this.currentUser.set(user);
    this.authError.set('');

    if (!user) {
      this.profile.set(null);
      this.authReady.set(true);
      return;
    }

    try {
      await this.loadOrCreateUserProfile(user);
    } catch (error) {
      this.authError.set(this.toErrorMessage(error));
    } finally {
      this.authReady.set(true);
    }
  }

  private async loadOrCreateUserProfile(user: User, preferredName = ''): Promise<void> {
    const userRef = doc(firestoreDb, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);

    const fallbackName =
      preferredName.trim() || user.displayName || this.fallbackNameFromEmail(user.email);

    if (!userSnapshot.exists()) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email ?? '',
        name: fallbackName,
        monthlyBudgetGoal: 2000,
        categoryBudgets: this.defaultCategoryBudgets(),
      };

      await setDoc(
        userRef,
        {
          ...newProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      this.profile.set(newProfile);
      return;
    }

    const data = userSnapshot.data() as Partial<UserProfile>;
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? (typeof data.email === 'string' ? data.email : ''),
      name:
        typeof data.name === 'string' && data.name.trim() ? data.name.trim() : fallbackName,
      monthlyBudgetGoal:
        typeof data.monthlyBudgetGoal === 'number' && data.monthlyBudgetGoal > 0
          ? data.monthlyBudgetGoal
          : 2000,
      categoryBudgets: this.normalizeCategoryBudgets(data.categoryBudgets),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    await setDoc(
      userRef,
      {
        email: profile.email,
        name: profile.name,
        monthlyBudgetGoal: profile.monthlyBudgetGoal,
        categoryBudgets: profile.categoryBudgets,
        createdAt: data.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    this.profile.set(profile);
  }

  private defaultCategoryBudgets(): Record<string, number> {
    const categoryBudgets: Record<string, number> = {};
    for (const category of this.expenseService.categories()) {
      categoryBudgets[category] = 300;
    }
    return categoryBudgets;
  }

  private normalizeCategoryBudgets(
    categoryBudgets: Record<string, number> | undefined,
  ): Record<string, number> {
    const defaults = this.defaultCategoryBudgets();
    const normalized: Record<string, number> = { ...defaults };

    if (!categoryBudgets) {
      return normalized;
    }

    for (const [category, value] of Object.entries(categoryBudgets)) {
      const numericValue = Number(value);
      normalized[category] = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
    }

    return normalized;
  }

  private fallbackNameFromEmail(email: string | null): string {
    if (!email) return 'User';
    return email.split('@')[0] || 'User';
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'An unexpected Firebase error occurred.';
  }
}
