import { Injectable } from '@angular/core';
import { auth } from '../../../environment.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  currentUser$: Observable<User | null> = new Observable();

  constructor() {
    this.currentUser$ = new Observable((observer) => {
      onAuthStateChanged(auth, (user) => {
        observer.next(user);
        if (!user) {
          observer.complete();
        }
      });
    });
  }

  register(email: string, password: string) {
    return from(createUserWithEmailAndPassword(auth, email, password));
  }

  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(auth, email, password));
  }

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(auth, provider));
  }

  logout() {
    return from(signOut(auth));
  }
}
