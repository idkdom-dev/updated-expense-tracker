import { Injectable, signal } from '@angular/core';
import { CategoryMetadata } from './expense';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  categories = signal<string[]>([
    'Work',
    'Personal',
    'Grocery',
    'Utilities',
    'Shopping',
    'Travel',
    'Food',
  ]);

  categoryMetadata = signal<Record<string, CategoryMetadata>>({
    Work: { name: 'Work', color: '#0d6efd', icon: 'briefcase', isCustom: false },
    Personal: { name: 'Personal', color: '#6610f2', icon: 'person', isCustom: false },
    Grocery: { name: 'Grocery', color: '#198754', icon: 'shopping-cart', isCustom: false },
    Utilities: { name: 'Utilities', color: '#ffc107', icon: 'lightbulb', isCustom: false },
    Shopping: { name: 'Shopping', color: '#d63384', icon: 'bag', isCustom: false },
    Travel: { name: 'Travel', color: '#0dcaf0', icon: 'plane', isCustom: false },
    Food: { name: 'Food', color: '#fd7e14', icon: 'utensils', isCustom: false },
  });
}
