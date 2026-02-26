import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/hooks/useProducts';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  product: Product;
  quantity: number;
  selectedCountry?: string;
  selectedServices?: string[];
  selectedPeriod?: number;
  selectedProtocol?: string;
  overridePrice?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, options?: { country?: string; services?: string[]; period?: number; protocol?: string }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'temka_cart';
const SYNC_DEBOUNCE_MS = 1500;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, webApp } = useTelegram();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStorageKey = () => {
    if (user?.telegram_id) return `${CART_STORAGE_KEY}_${user.telegram_id}`;
    return CART_STORAGE_KEY;
  };

  // Load cart from localStorage
  useEffect(() => {
    const storageKey = getStorageKey();
    try {
      const savedCart = localStorage.getItem(storageKey);
      if (savedCart) setItems(JSON.parse(savedCart));
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
    setIsInitialized(true);
  }, [user?.telegram_id]);

  // Save cart to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }, [items, isInitialized, user?.telegram_id]);

  // Cleanup debounce timer on unmount
  useEffect(() => () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); }, []);

  // Sync cart to Supabase (для напоминаний о брошенной корзине)
  const syncCartToServer = useCallback(async (cartItems: CartItem[], cartTotal: number) => {
    const initData = webApp?.initData;
    if (!initData || !user) return;
    try {
      await supabase.functions.invoke('sync-cart', {
        body: {
          initData,
          items: cartItems.map(item => ({
            product: { id: item.product.id, name: item.product.name, price: item.product.price },
            quantity: item.quantity,
            overridePrice: item.overridePrice,
          })),
          total: cartTotal,
        },
      });
    } catch (error) {
      console.warn('[CartContext] Failed to sync cart:', error);
    }
  }, [webApp?.initData, user]);

  const scheduleSyncCart = useCallback((cartItems: CartItem[], cartTotal: number) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => syncCartToServer(cartItems, cartTotal), SYNC_DEBOUNCE_MS);
  }, [syncCartToServer]);

  const addItem = (product: Product, options?: { country?: string; services?: string[]; period?: number; protocol?: string }) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const next = existing
        ? prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...prev, { product, quantity: 1, selectedCountry: options?.country, selectedServices: options?.services, selectedPeriod: options?.period, selectedProtocol: options?.protocol }];
      const newTotal = next.reduce((sum, item) => sum + (item.overridePrice || item.product.price) * item.quantity, 0);
      scheduleSyncCart(next, newTotal);
      return next;
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => {
      const next = prev.filter(item => item.product.id !== productId);
      const newTotal = next.reduce((sum, item) => sum + (item.overridePrice || item.product.price) * item.quantity, 0);
      scheduleSyncCart(next, newTotal);
      return next;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(productId); return; }
    setItems(prev => {
      const next = prev.map(item => item.product.id === productId ? { ...item, quantity } : item);
      const newTotal = next.reduce((sum, item) => sum + (item.overridePrice || item.product.price) * item.quantity, 0);
      scheduleSyncCart(next, newTotal);
      return next;
    });
  };

  const clearCart = () => {
    setItems([]);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    // Немедленно удаляем сессию с сервера
    syncCartToServer([], 0);
  };

  const total = items.reduce((sum, item) => sum + (item.overridePrice || item.product.price) * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
