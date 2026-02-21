import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setText: (text: string) => void;
          enable: () => void;
          disable: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: 'light' | 'dark';
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        platform: string;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        showPopup: (params: { title?: string; message: string; buttons?: Array<{ type: string; text: string }> }) => void;
        showAlert: (message: string) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
      };
    };
  }
}

export interface TelegramUser {
  id: string;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
  balance: number;
  is_banned: boolean;
  ban_reason?: string;
  roles: string[];
  created_at: string;
}

interface TelegramContextType {
  user: TelegramUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTelegramWebApp: boolean;
  webApp: typeof window.Telegram.WebApp | null;
  refreshUser: () => Promise<void>;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [webApp, setWebApp] = useState<typeof window.Telegram.WebApp | null>(null);

  const isTelegramWebApp = typeof window !== 'undefined' && 
    !!window.Telegram?.WebApp && 
    !!window.Telegram.WebApp.initData &&
    window.Telegram.WebApp.initData.length > 0;

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => {
    if (!webApp?.HapticFeedback) return;
    
    if (type === 'success' || type === 'error' || type === 'warning') {
      webApp.HapticFeedback.notificationOccurred(type);
    } else {
      webApp.HapticFeedback.impactOccurred(type);
    }
  };

  const authenticateUser = async () => {
    console.log('[TelegramAuth] Checking Telegram WebApp...');
    console.log('[TelegramAuth] window.Telegram:', !!window.Telegram);
    console.log('[TelegramAuth] window.Telegram.WebApp:', !!window.Telegram?.WebApp);
    console.log('[TelegramAuth] initData length:', window.Telegram?.WebApp?.initData?.length || 0);
    
    const initData = window.Telegram?.WebApp?.initData;
    
    if (!initData || initData.length === 0) {
      console.log('[TelegramAuth] No initData - running in dev mode');
      setIsLoading(false);
      return;
    }

    console.log('[TelegramAuth] Calling telegram-auth edge function...');

    try {
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { initData },
      });

      console.log('[TelegramAuth] Response:', { data, error });

      if (error) {
        console.error('[TelegramAuth] Auth error:', error);
        setIsLoading(false);
        return;
      }

      if (data?.success && data?.user) {
        console.log('[TelegramAuth] User authenticated:', data.user);
        setUser(data.user);
      }
    } catch (err) {
      console.error('[TelegramAuth] Authentication failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await authenticateUser();
  };

  useEffect(() => {
    console.log('[TelegramAuth] Initializing...');
    
    const hasTelegramWithData = window.Telegram?.WebApp && 
      window.Telegram.WebApp.initData && 
      window.Telegram.WebApp.initData.length > 0;

    if (hasTelegramWithData) {
      const tgWebApp = window.Telegram!.WebApp;
      console.log('[TelegramAuth] Telegram WebApp found, initData:', tgWebApp.initData?.substring(0, 50) + '...');
      setWebApp(tgWebApp);
      
      // Initialize Telegram WebApp
      tgWebApp.ready();
      tgWebApp.expand();

      // Authenticate user
      authenticateUser();
    } else {
      // Development mode - simulate regular user (NO admin rights for security)
      console.log('[TelegramAuth] Development mode: simulating Telegram user (no admin access)');
      setUser({
        id: 'dev-user-id',
        telegram_id: 123456789,
        username: 'dev_user',
        first_name: 'Developer',
        balance: 5000,
        is_banned: false,
        roles: ['user'], // Regular user - admin requires real DB role
        created_at: new Date().toISOString(),
      });
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('moderator') || false;

  return (
    <TelegramContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isTelegramWebApp,
        webApp,
        refreshUser,
        hapticFeedback,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
};
