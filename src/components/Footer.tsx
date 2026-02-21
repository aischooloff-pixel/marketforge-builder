import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card pb-16 md:pb-0">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-4 sm:gap-6 md:grid md:grid-cols-3">
          {/* ASCII Art */}
          <div className="hidden sm:flex flex-col items-center md:items-start">
            <pre className="text-[8px] md:text-[10px] leading-none text-primary font-mono select-none whitespace-pre">
{`  ██████████████████
  █ TEMKA.STORE    █
  █ ░░░░░░░░░░░░░░ █
  █ ░ ╔═══════╗ ░░ █
  █ ░ ║ ☠   ☠ ║ ░░ █
  █ ░ ║  ▄▄▄  ║ ░░ █
  █ ░ ║ █████ ║ ░░ █
  █ ░ ╚═══════╝ ░░ █
  █ ░░░░░░░░░░░░░░ █
  ██████████████████`}
            </pre>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:flex-col sm:items-center sm:gap-2 text-xs text-muted-foreground font-mono">
            <span className="w-full text-center text-foreground font-bold text-sm mb-0.5 sm:mb-1">Навигация</span>
            <Link to="/catalog" className="hover:text-primary transition-colors">[Каталог]</Link>
            <Link to="/profile" className="hover:text-primary transition-colors">[Профиль]</Link>
            <Link to="/info" className="hover:text-primary transition-colors">[Инфо]</Link>
            <Link to="/disclaimer" className="hover:text-primary transition-colors">[Дисклеймер]</Link>
            <a href="https://t.me/TemkaStoreNews" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">[Канал в TG]</a>
          </div>

          {/* Info block */}
          <div className="flex flex-col items-center md:items-end gap-2 text-xs font-mono">
            <div className="bevel-sunken bg-background p-2 md:p-3 text-[10px] text-muted-foreground w-full max-w-[280px] sm:max-w-[220px]">
              <div className="text-primary mb-1">$ status</div>
              <div>Сервер: <span className="text-success">ONLINE</span></div>
              <div>Аптайм: <span className="text-foreground">99.9%</span></div>
              <div>Гарант: <span className="text-success">ACTIVE</span></div>
              <div className="mt-1 text-[9px] text-muted-foreground/60">
                PGP: 4A8B 2C1F 9D3E ...
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground/50 mt-1">
              © TEMKA.STORE · Все права защищены  
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};