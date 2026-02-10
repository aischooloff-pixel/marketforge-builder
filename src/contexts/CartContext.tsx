import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/data/products';
import { useTelegram } from '@/contexts/TelegramContext';

interface CartItem {
  product: Product;
  quantity: number;
  selectedCountry?: string;
  selectedServices?: string[];
  selectedPeriod?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, options?: { country?: string; services?: string[]; period?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'temka_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useTelegram();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Generate storage key based on telegram_id
  const getStorageKey = () => {
    if (user?.telegram_id) {
      return `${CART_STORAGE_KEY}_${user.telegram_id}`;
    }
    return CART_STORAGE_KEY;
  };

  // Load cart from localStorage
  useEffect(() => {
    const storageKey = getStorageKey();
    try {
      const savedCart = localStorage.getItem(storageKey);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setItems(parsed);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
    setIsInitialized(true);
  }, [user?.telegram_id]);

  // Save cart to localStorage when items change
  useEffect(() => {
    if (!isInitialized) return;
    
    const storageKey = getStorageKey();
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }, [items, isInitialized, user?.telegram_id]);

  const addItem = (product: Product, options?: { country?: string; services?: string[]; period?: number }) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { 
        product, 
        quantity: 1, 
        selectedCountry: options?.country,
        selectedServices: options?.services,
        selectedPeriod: options?.period,
      }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
