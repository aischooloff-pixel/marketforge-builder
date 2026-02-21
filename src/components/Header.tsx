import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useCart } from "@/contexts/CartContext";
import { useTelegram } from "@/contexts/TelegramContext";
import { Button } from "@/components/ui/button";
import { PxHome, PxGrid, PxUser, PxCart, PxFolder } from "@/components/PixelIcons";

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { itemCount } = useCart();
  const { user } = useTelegram();
  const location = useLocation();

  const navLinks = [
    { href: "/", label: "Главная", icon: PxHome },
    { href: "/catalog", label: "Каталог", icon: PxGrid },
    { href: "/profile", label: "Профиль", icon: PxUser },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 win95-window">
        <div className="win95-titlebar px-2 py-1">
          <span className="flex-1 flex items-center gap-1">
            <PxFolder size={14} />
            TEMKA.STORE
          </span>
          <div className="flex gap-0.5">
            <button
              onClick={toggleTheme}
              className="bevel-raised bg-card h-4 w-4 flex items-center justify-center text-foreground text-[8px] leading-none active:bevel-sunken"
            >
              {theme === "light" ? "☽" : "☀"}
            </button>
          </div>
        </div>

        <div className="px-2 py-1 flex items-center justify-between border-b border-border">
          <Link to="/" className="flex items-center gap-1">
            <span className="font-bold tracking-tight font-pixel text-[10px]">TEMKA</span>
            <span className="font-light text-muted-foreground font-pixel text-[10px]">.STORE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} to={link.href}>
                  <Button variant={isActive(link.href) ? "default" : "ghost"} size="sm" className="text-xs gap-1">
                    <Icon size={14} />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <PxCart size={18} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user && (
              <div className="hidden md:flex items-center gap-2 px-2 py-1 bevel-sunken bg-card text-sm">
                <span>{user.balance.toLocaleString("ru-RU")} ₽</span>
              </div>
            )}
          </div>
        </div>

        {/* Marquee Ticker — only on home page */}
        {location.pathname === "/" && (
          <div className="bg-primary overflow-hidden py-1 border-b border-border">
            <div className="marquee-track">
              {[...Array(2)].map((_, i) => (
                <span
                  key={i}
                  className="text-sm md:text-base text-primary-foreground whitespace-nowrap px-8 font-medium"
                >
                  ⚠ ВХОД ТОЛЬКО ДЛЯ СВОИХ ⚠ ТОВАРЫ ВАЛИДНЫЕ ⚠ НИКАКОГО СКАМА ⚠ АВТОВЫДАЧА 24/7 ⚠ ДИСПУТ ЧЕРЕЗ САППОРТ ⚠
                  ВХОД ТОЛЬКО ДЛЯ СВОИХ ⚠ НИКАКОГО СКАМА ⚠ ТОВАРЫ ВАЛИД ⚠ АВЫТОВЫДАЧА 24/7 ⚠ ДИСПУТ ЧЕРЕЗ САППОРТ ⚠
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 win95-window safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link key={link.href} to={link.href} className="flex-1">
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="w-full flex flex-col items-center justify-center gap-0.5 h-12 text-[10px]"
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
