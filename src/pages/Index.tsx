import { Link } from 'react-router-dom';
import { storeData } from '@/data/products';
import { usePopularProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useApprovedReviews, useAverageRating } from '@/hooks/useReviews';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { ReviewForm } from '@/components/ReviewForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import FaqSection from '@/components/FaqSection';
import { TypewriterText } from '@/components/TypewriterText';
import { PxShield, PxLightning, PxUsers, PxStar, PxArrowRight, PxInfo, PxMail, PxWarning } from '@/components/PixelIcons';
import { PixelDivider } from '@/components/PixelDivider';

const Index = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: popularProducts = [], isLoading: productsLoading } = usePopularProducts(6);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: reviews = [], isLoading: reviewsLoading } = useApprovedReviews();
  const { average, count } = useAverageRating(reviews);

  return <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-28 pb-12 md:pt-40 md:pb-32 criminal-pattern">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bevel-raised bg-card text-foreground text-xs md:text-sm font-medium mb-4 md:mb-8">
                <PxShield size={16} />
                ​Проверенный селлер · 2000+ сделок
              </motion.div>
              
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 md:mb-6">
                TEMKA<span className="text-muted-foreground">.STORE</span>
              </h1>
              
              <p className="text-base md:text-2xl text-muted-foreground mb-6 md:mb-10 max-w-2xl mx-auto px-2 font-mono">
                <TypewriterText text={storeData.store_meta.description} speed={35} />
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                <Link to="/catalog">
                  <Button size="lg" className="w-full sm:w-auto gap-2 text-sm md:text-base px-6 md:px-8 h-11 md:h-12">
                    Смотреть каталог
                    <PxArrowRight size={14} />
                  </Button>
                </Link>
                <div className="flex flex-row gap-2 justify-center">
                  <Link to="/info">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs px-4 h-9">
                      <PxInfo size={14} />
                      Информация
                    </Button>
                  </Link>
                  <a href="https://t.me/TemkaStoreNews" target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs px-4 h-9">
                      <PxMail size={14} />
                      Телеграм канал
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <PixelDivider variant="zigzag" />
        {/* Features */}
        <section className="py-8 md:py-16 bg-secondary/30 criminal-pattern">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {[{
              icon: PxShield,
              title: 'Гарант',
              desc: 'Встроенный гарант-сервис. Диспут через саппорт'
            }, {
              icon: PxLightning,
              title: 'Моментальный отстук',
              desc: 'Автовыдача после оплаты. Без ожидания'
            }, {
              icon: PxUsers,
              title: 'Только для своих',
              desc: 'Закрытое коммьюнити. Проверенные поставщики'
            }].map((feature, index) => {
                const Icon = feature.icon;
                return <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} className="flex items-start gap-3 md:gap-4 p-4 md:p-6">
                  <div className="p-2 md:p-3 bevel-raised bg-card">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base md:text-lg mb-0.5 md:mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>;
              })}
            </div>
          </div>
        </section>
        <PixelDivider variant="checker" />

        {/* Popular Products */}
        <section className="py-10 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex justify-between items-center gap-4 mb-6 md:mb-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-1">В наличии</h2>
                <p className="text-sm md:text-base text-muted-foreground">Залетай пока есть</p>
              </div>
              <Link to="/catalog">
                <Button variant="outline" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm">
                  Все
                  <PxArrowRight size={12} />
                </Button>
              </Link>
            </motion.div>

            {productsLoading ? <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="win95-window p-2"><Skeleton className="h-3 w-1/2 mb-2" /><div className="flex gap-2 mb-2"><Skeleton className="w-8 h-8" /><Skeleton className="h-4 flex-1" /></div><Skeleton className="h-5 w-1/3" /></div>)}
              </div> : popularProducts.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                {popularProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
              </div> : <div className="text-center py-12 text-muted-foreground font-mono"><p>&gt; Завоз скоро. Следи за каналом</p></div>}
          </div>
        </section>

        <PixelDivider variant="dots" />
        {/* Categories */}
        <section className="py-10 md:py-20 bg-secondary/30 criminal-pattern">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-6 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Отделы</h2>
              <p className="text-sm md:text-base text-muted-foreground">Выбери нужный раздел</p>
            </motion.div>

            {categoriesLoading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="p-4 md:p-6 border bg-card"><Skeleton className="h-10 w-10 mx-auto mb-2" /><Skeleton className="h-4 w-3/4 mx-auto mb-1" /><Skeleton className="h-3 w-1/2 mx-auto hidden md:block" /></div>)}
              </div> : categories.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {categories.map((category, index) => <motion.div key={category.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} viewport={{ once: true }}>
                    <Link to={`/catalog?category=${category.slug}`}>
                      <div className="p-4 md:p-6 win95-window hover-lift text-center group h-full flex flex-col items-center justify-center">
                        <div className="text-3xl md:text-4xl mb-2 md:mb-3">{category.icon}</div>
                        <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1 group-hover:text-foreground transition-colors">{category.name}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 hidden md:block">{category.description}</p>
                      </div>
                    </Link>
                  </motion.div>)}
              </div> : <div className="text-center py-12 text-muted-foreground"><p>Отделы скоро откроются</p></div>}
          </div>
        </section>

        <PixelDivider variant="zigzag" />
        {/* Reviews */}
        <section className="py-10 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-6 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Отзывы</h2>
              {count > 0 && <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <PxStar key={i} size={16} filled={i < Math.round(average)} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{average}</span>
                  <span className="text-sm text-muted-foreground">({count} отзывов)</span>
                </div>}
              <p className="text-sm md:text-base text-muted-foreground mt-1">Реальные отстуки от покупателей</p>
            </motion.div>

            {reviewsLoading ? <div className="flex gap-4 overflow-hidden pb-4">
                {[...Array(3)].map((_, i) => <div key={i} className="w-[280px] md:w-[320px] flex-shrink-0"><div className="p-4 border bg-card"><Skeleton className="h-4 w-20 mb-3" /><Skeleton className="h-16 w-full mb-3" /><Skeleton className="h-4 w-24" /></div></div>)}
              </div> : reviews.length > 0 ? <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {reviews.map((review, index) => <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} viewport={{ once: true }} className="w-[280px] md:w-[320px] flex-shrink-0">
                      <div className="p-3 md:p-4 h-full max-h-[140px] overflow-hidden bevel-sunken bg-card font-mono text-sm">
                        <div className="flex items-center gap-1.5 mb-2 text-primary text-xs">
                          <span className="text-muted-foreground">[{new Date(review.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}]</span>
                          <span>&lt;{review.author_name || 'user'}&gt;</span>
                          <span className="ml-auto text-warning">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        </div>
                        <p className="text-foreground/90 leading-relaxed line-clamp-3">
                          <span className="text-muted-foreground select-none">&gt; </span>{review.text}
                        </p>
                      </div>
                    </motion.div>)}
                </div>
              </div> : <div className="text-center py-8 text-muted-foreground font-mono"><p>&gt; Отзывов пока нет. Будь первым, кто отпишется</p></div>}
            {reviews.length > 0 && <p className="text-center text-xs text-muted-foreground mt-2 font-mono">◄ Листайте ►</p>}

            <div className="mt-6 mb-20 max-w-md mx-auto">
              <ReviewForm />
            </div>
          </div>
        </section>

        <FaqSection />

        <PixelDivider variant="checker" />
        {/* Disclaimer Banner */}
        <section className="py-8 md:py-12 pb-24 md:pb-12 bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex flex-col md:flex-row items-start md:items-center gap-4 max-w-3xl mx-auto">
              <div className="p-2.5 bevel-raised bg-card shrink-0">
                <PxWarning size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">⚠ Дисклеймер</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Администрация не несёт ответственности за действия покупателей. Все товары предоставляются «как есть». Претензии через диспут.
                </p>
              </div>
              <Link to="/disclaimer">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0">
                  Подробнее
                  <PxArrowRight size={12} />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>;
};
export default Index;