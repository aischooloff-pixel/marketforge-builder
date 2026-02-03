import React, { createContext, useContext, useState } from 'react';

interface Order {
  id: string;
  date: string;
  items: { name: string; price: number }[];
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
}

interface TopUp {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending';
}

interface User {
  id: string;
  nickname: string;
  avatar: string;
  balance: number;
  orders: Order[];
  topUps: TopUp[];
}

interface UserContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (nickname: string) => void;
  logout: () => void;
  updateBalance: (amount: number) => void;
  addOrder: (order: Order) => void;
  addTopUp: (topUp: TopUp) => void;
}

const mockUser: User = {
  id: 'user-1',
  nickname: 'temka_user',
  avatar: '',
  balance: 5000,
  orders: [
    {
      id: 'order-1',
      date: '2024-01-15',
      items: [{ name: 'VK API Toolkit', price: 1990 }],
      total: 1990,
      status: 'completed'
    },
    {
      id: 'order-2',
      date: '2024-01-20',
      items: [{ name: 'Country Proxy Pack', price: 1490 }],
      total: 1490,
      status: 'completed'
    }
  ],
  topUps: [
    {
      id: 'topup-1',
      date: '2024-01-10',
      amount: 5000,
      method: 'Банковская карта',
      status: 'completed'
    }
  ]
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(mockUser);

  const isLoggedIn = user !== null;

  const login = (nickname: string) => {
    setUser({
      ...mockUser,
      nickname
    });
  };

  const logout = () => {
    setUser(null);
  };

  const updateBalance = (amount: number) => {
    setUser(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
  };

  const addOrder = (order: Order) => {
    setUser(prev => prev ? { ...prev, orders: [order, ...prev.orders] } : null);
  };

  const addTopUp = (topUp: TopUp) => {
    setUser(prev => prev ? { 
      ...prev, 
      topUps: [topUp, ...prev.topUps],
      balance: prev.balance + topUp.amount 
    } : null);
  };

  return (
    <UserContext.Provider value={{ user, isLoggedIn, login, logout, updateBalance, addOrder, addTopUp }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
