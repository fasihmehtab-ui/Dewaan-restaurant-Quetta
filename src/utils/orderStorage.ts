import { Order } from '../types';

const STORAGE_KEY = 'dewaan_orders_v1';

export function getSavedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any dummy order DW-8942
      const cleanOrders = parsed.filter((o) => o.id !== 'DW-8942');
      return cleanOrders;
    }
    return [];
  } catch (err) {
    return [];
  }
}

export function saveOrders(orders: Order[]): void {
  try {
    const cleanOrders = orders.filter((o) => o.id !== 'DW-8942');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanOrders));
  } catch (err) {
    console.error('Error saving orders', err);
  }
}
