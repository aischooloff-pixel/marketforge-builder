import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { Zap, MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const InfoPage = () => {
  const features = [
    {
      icon: Zap,
      title: 'Моментальная доставка',
      desc: 'Купил → получил файл / доступ / номер / прокси в один клик.',
    },
    {
      icon: MessageSquare,
      title: 'Мини-апп в Telegram',
      desc: 'Весь магазин в чате: каталог, баланс, быстрый checkout.',
    },
    {
      icon: ShieldCheck,
      title: 'Поддержка 24/7',
      desc: 'Честная политика возвратов и compliance — никакой дряни и блокировок.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-6 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </Link>

            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              О проекте TEMKA.STORE
            </h1>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
                <strong className="text-foreground">TEMKA.STORE</strong> — расходники и инструменты для темщиков, 
                арбитражников и маркетологов. Автоматическая выдача, моментальные цифровые 
                доставки и первая в нише мини-апп в Telegram.
              </p>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10">
                Дешёвые цены, постоянная поддержка и честные правила — всё, чтобы работать 
                быстрее и без лишней головной боли.
              </p>
            </div>

            <h2 className="text-2xl font-bold mb-6">Ключевые преимущества</h2>

            <div className="space-y-4 mb-10">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="flex items-start gap-4 p-4 rounded-xl border bg-card"
                >
                  <div className="p-3 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/catalog" className="flex-1">
                <Button size="lg" className="w-full">
                  Перейти в каталог
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InfoPage;
