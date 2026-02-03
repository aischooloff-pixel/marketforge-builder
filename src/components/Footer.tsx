import { Link } from 'react-router-dom';
import { legalRules } from '@/data/products';

export const Footer = () => {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold tracking-tight">TEMKA</span>
              <span className="text-xl font-light text-muted-foreground">.STORE</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Инструменты для digital-профессионалов
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold mb-4">Навигация</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Главная</Link></li>
              <li><Link to="/catalog" className="hover:text-foreground transition-colors">Каталог</Link></li>
              <li><Link to="/profile" className="hover:text-foreground transition-colors">Профиль</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Категории</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/catalog?category=scripts" className="hover:text-foreground transition-colors">Скрипты</Link></li>
              <li><Link to="/catalog?category=automation" className="hover:text-foreground transition-colors">Автоматизация</Link></li>
              <li><Link to="/catalog?category=proxy" className="hover:text-foreground transition-colors">Прокси и VPS</Link></li>
              <li><Link to="/catalog?category=services" className="hover:text-foreground transition-colors">Услуги</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Правила</h4>
            <p className="text-sm text-muted-foreground">
              {legalRules.disclaimer}
            </p>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 TEMKA.STORE. Все права защищены.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/legal" className="hover:text-foreground transition-colors">Правила использования</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Конфиденциальность</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
