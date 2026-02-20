import { Link } from 'react-router-dom';
import { legalRules } from '@/data/products';

export const Footer = () => {
  return (
    <footer className="bg-background border-t border-border">
      {/* Win95 Taskbar / Status bar style footer */}
      <div className="flex items-center px-2 py-1 border-t border-border"
        style={{
          boxShadow: 'inset 0px 1px 0px #FFFFFF'
        }}
      >
        {/* Start button area */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-1">
          <span>© 2025 TEMKA.STORE</span>
          <span>|</span>
          <Link to="/disclaimer" className="hover:text-foreground underline text-[10px]">
            Правила
          </Link>
          <span>|</span>
          <Link to="/info" className="hover:text-foreground underline text-[10px]">
            Справка
          </Link>
        </div>
        {/* Status indicators */}
        <div className="flex items-center gap-1">
          <div className="h-4 px-2 flex items-center text-[10px] text-muted-foreground"
            style={{
              boxShadow: 'inset 1px 1px 0px #808080, inset -1px -1px 0px #DFDFDF'
            }}
          >
            ✅ Онлайн
          </div>
          <div className="h-4 px-2 flex items-center text-[10px] text-muted-foreground"
            style={{
              boxShadow: 'inset 1px 1px 0px #808080, inset -1px -1px 0px #DFDFDF'
            }}
          >
            🔒 Защищено
          </div>
        </div>
      </div>
    </footer>
  );
};
