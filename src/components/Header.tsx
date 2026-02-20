import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { Sun, Moon, ShoppingCart, Home, Grid3X3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { itemCount } = useCart();
  const { user } = useTelegram();
  const location = useLocation();

  const navLinks = [
    { href: '/', label: 'Главная', icon: Home },
    { href: '/catalog', label: 'Каталог', icon: Grid3X3 },
    { href: '/profile', label: 'Профиль', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Header — Win95 window chrome */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background" style={{
        boxShadow: 'inset -1px -1px 0px #000000, inset 1px 1px 0px #FFFFFF, inset -2px -2px 0px #808080, inset 2px 2px 0px #DFDFDF'
      }}>
        {/* Title Bar */}
        <div className="win95-titlebar px-2 py-0.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Pixel icon */}
            <div className="w-4 h-4 bg-white flex items-center justify-center text-[8px] leading-none font-bold text-primary">
              🛒
            </div>
            <span className="text-white text-xs font-bold tracking-wide" style={{ fontFamily: '"MS Sans Serif", monospace' }}>
              TEMKA.STORE — Интернет-магазин
            </span>
          </div>
          {/* Win95 window buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleTheme}
              className="win95-titlebar-btn text-foreground bg-background text-[9px] font-bold leading-none"
              title={theme === 'light' ? 'Dark' : 'Light'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="win95-titlebar-btn">_</div>
            <div className="win95-titlebar-btn">□</div>
            <div className="win95-titlebar-btn font-bold text-foreground">✕</div>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="win95-menubar border-b border-border/50">
          <Link to="/" className={`win95-menubar-item text-xs ${isActive('/') ? 'bg-primary text-white' : ''}`}>
            Файл
          </Link>
          <Link to="/catalog" className={`win95-menubar-item text-xs ${isActive('/catalog') ? 'bg-primary text-white' : ''}`}>
            Каталог
          </Link>
          <Link to="/cart" className={`win95-menubar-item text-xs flex items-center gap-1`}>
            Корзина {itemCount > 0 && <span className="bg-primary text-white text-[9px] px-1">({itemCount})</span>}
          </Link>
          <Link to="/profile" className={`win95-menubar-item text-xs ${isActive('/profile') ? 'bg-primary text-white' : ''}`}>
            Профиль
          </Link>
          <Link to="/info" className="win95-menubar-item text-xs">
            Справка
          </Link>
          {user && (
            <span className="ml-auto win95-menubar-item text-xs text-muted-foreground">
              💰 {user.balance.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>
      </header>

      {/* Bottom Navigation - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background safe-area-bottom" style={{
        boxShadow: 'inset -1px -1px 0px #000000, inset 1px 1px 0px #FFFFFF, inset -2px -2px 0px #808080, inset 2px 2px 0px #DFDFDF'
      }}>
        {/* Win95 taskbar style */}
        <div className="win95-titlebar py-1 px-2">
          <span className="text-white text-[10px]">📌 Панель задач</span>
          {user && (
            <span className="ml-auto text-white text-[10px]">💰 {user.balance.toLocaleString('ru-RU')} ₽</span>
          )}
        </div>
        <div className="flex items-center h-12 px-1 gap-1">
          {navLinks.map(link => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-medium transition-none
                  ${active
                    ? 'shadow-win95-sunken bg-background'
                    : 'shadow-win95-raised bg-background hover:brightness-95'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <Link
            to="/cart"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-medium shadow-win95-raised bg-background hover:brightness-95 relative"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Корзина</span>
            {itemCount > 0 && (
              <span className="absolute top-0.5 right-2 bg-primary text-white text-[8px] px-0.5 leading-tight">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </>
  );
};
