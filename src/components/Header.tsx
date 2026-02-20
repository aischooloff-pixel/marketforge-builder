import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { Sun, Moon, ShoppingCart, Home, Grid3X3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

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
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1">
            <span className="text-lg md:text-xl font-bold tracking-tight">TEMKA</span>
            <span className="text-lg md:text-xl font-light text-muted-foreground">.STORE</span>
          </Link>

          {/* Navigation - Desktop only */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link 
                key={link.href} 
                to={link.href} 
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  isActive(link.href) 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-8 w-8 md:h-10 md:w-10">
              <AnimatePresence mode="wait">
                {theme === 'light' ? (
                  <motion.div 
                    key="moon" 
                    initial={{ rotate: -90, opacity: 0 }} 
                    animate={{ rotate: 0, opacity: 1 }} 
                    exit={{ rotate: 90, opacity: 0 }} 
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="sun" 
                    initial={{ rotate: 90, opacity: 0 }} 
                    animate={{ rotate: 0, opacity: 1 }} 
                    exit={{ rotate: -90, opacity: 0 }} 
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="rounded-full relative h-8 w-8 md:h-10 md:w-10">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-foreground text-background text-[10px] flex items-center justify-center font-medium"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Button>
            </Link>

            {/* Balance - visible on larger screens */}
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm font-medium">
                <span>{user.balance.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Navigation - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navLinks.map(link => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link 
                key={link.href} 
                to={link.href} 
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                  active 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
