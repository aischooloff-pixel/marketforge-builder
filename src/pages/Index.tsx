import { Link, useNavigate } from 'react-router-dom';
import { storeData } from '@/data/products';
import { usePopularProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useApprovedReviews, useAverageRating } from '@/hooks/useReviews';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReviewForm } from '@/components/ReviewForm';
import CircularGallery from '@/components/CircularGallery';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Users, Star, Quote, Info, Send, Award, Shield, ShieldAlert } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
const Index = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const {
    data: popularProducts = [],
    isLoading: productsLoading
  } = usePopularProducts(6);
  const {
    data: categories = [],
    isLoading: categoriesLoading
  } = useCategories();
  const {
    data: reviews = [],
    isLoading: reviewsLoading
  } = useApprovedReviews();
  const {
    average,
    count
  } = useAverageRating(reviews);

  // Auto-scroll removed — static horizontal scroll on mobile
  return <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 pb-12 md:pt-40 md:pb-32">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} className="max-w-4xl mx-auto text-center">
              <motion.div initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.2
            }} className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent/15 text-accent text-xs md:text-sm font-medium mb-4 md:mb-8">
                <Award className="h-3 w-3 md:h-4 md:w-4" />
                ​Первый магазин с приложением         
              </motion.div>
              
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 md:mb-6 flex items-center justify-center flex-wrap">
                {'TEMKA'.split('').map((char, i) => (
                  <motion.span
                    key={`t-${i}`}
                    initial={{ opacity: 0, y: 30, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.4, type: 'spring', stiffness: 200 }}
                  >
                    {char}
                  </motion.span>
                ))}
                {'.STORE'.split('').map((char, i) => (
                  <motion.span
                    key={`s-${i}`}
                    initial={{ opacity: 0, y: 30, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.4 + (5 + i) * 0.08, duration: 0.4, type: 'spring', stiffness: 200 }}
                    style={{ color: '#8c8c8c' }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
              
              <p className="text-base md:text-2xl text-muted-foreground mb-6 md:mb-10 max-w-2xl mx-auto px-2">
                {storeData.store_meta.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                <Link to="/catalog">
                  <Button size="lg" className="w-full sm:w-auto gap-2 text-sm md:text-base px-6 md:px-8 h-11 md:h-12">
                    Смотреть каталог
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </Link>
                <div className="flex flex-row gap-2 justify-center">
                  <Link to="/info">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs px-4 h-9">
                      <Info className="h-3.5 w-3.5" />
                      Информация
                    </Button>
                  </Link>
                  <a href="https://t.me/TemkaStoreNews" target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs px-4 h-9">
                      <Send className="h-3.5 w-3.5" />
                      Телеграм канал
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-8 md:py-16 border-y bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {[{
              icon: Shield,
              title: 'Надежно',
              desc: 'Лучшие поставщики и проверенные временем товары'
            }, {
              icon: Zap,
              title: 'Мгновенно',
              desc: 'Автоматическая доставка после оплаты'
            }, {
              icon: Users,
              title: 'Для профи',
              desc: 'Инструменты для мастеров своих дел'
            }].map((feature, index) => <motion.div key={feature.title} initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: index * 0.1
            }} viewport={{
              once: true
            }} className="flex items-start gap-3 md:gap-4 p-4 md:p-6">
                  <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-foreground text-background">
                    <feature.icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base md:text-lg mb-0.5 md:mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>)}
            </div>
          </div>
        </section>

        {/* Popular Products */}
        <section className="py-10 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="flex justify-between items-center gap-4 mb-6 md:mb-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-1">Популярное</h2>
                <p className="text-sm md:text-base text-muted-foreground">Самые востребованные товары</p>
              </div>
              <Link to="/catalog">
                <Button variant="outline" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm">
                  Все
                  <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* CircularGallery — full width, outside container */}
          {productsLoading ? (
            <div className="flex gap-4 px-4 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[260px] rounded-2xl border bg-card">
                  <Skeleton className="aspect-[4/3] rounded-2xl" />
                </div>
              ))}
            </div>
          ) : popularProducts.length > 0 ? (
            <div className="w-full" style={{ height: '420px' }}>
              <CircularGallery
                items={popularProducts.map(p => ({
                  image: p.media_urls?.[0] || `https://placehold.co/700x500/1a1a1a/ffffff?text=${encodeURIComponent(p.name)}`,
                  text: p.name,
                  href: `/product/${p.id}`
                }))}
                bend={3}
                textColor={theme === 'dark' ? '#ffffff' : '#111111'}
                borderRadius={0.07}
                font="bold 28px Inter"
                scrollSpeed={2}
                scrollEase={0.05}
                onItemClick={(index) => {
                  if (popularProducts[index]) {
                    navigate(`/product/${popularProducts[index].id}`);
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Популярные товары скоро появятся</p>
            </div>
          )}
        </section>


        {/* Categories */}
        <section className="py-10 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="text-center mb-6 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Категории</h2>
              <p className="text-sm md:text-base text-muted-foreground">Найдите нужный инструмент</p>
            </motion.div>

            {categoriesLoading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="p-4 md:p-6 rounded-lg md:rounded-xl border bg-card">
                    <Skeleton className="h-10 w-10 mx-auto mb-2 rounded" />
                    <Skeleton className="h-4 w-3/4 mx-auto mb-1" />
                    <Skeleton className="h-3 w-1/2 mx-auto hidden md:block" />
                  </div>)}
              </div> : categories.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {categories.map((category, index) => <motion.div key={category.id} initial={{
              opacity: 0,
              scale: 0.9
            }} whileInView={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: index * 0.05
            }} viewport={{
              once: true
            }}>
                    <Link to={`/catalog?category=${category.slug}`}>
                      <div className="p-4 md:p-6 rounded-lg md:rounded-xl border bg-card hover:shadow-lg hover:-translate-y-1 transition-all text-center group">
                        <div className="text-3xl md:text-4xl mb-2 md:mb-3">{category.icon}</div>
                        <h3 className="font-semibold text-sm md:text-base mb-0.5 md:mb-1 group-hover:text-foreground transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 hidden md:block">
                          {category.description}
                        </p>
                      </div>
                    </Link>
                  </motion.div>)}
              </div> : <div className="text-center py-12 text-muted-foreground">
                <p>Категории скоро появятся</p>
              </div>}
          </div>
        </section>

        {/* Reviews */}
        <section className="py-10 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="text-center mb-6 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Отзывы</h2>
              {count > 0 && <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({
                  length: 5
                }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(average) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />)}
                  </div>
                  <span className="text-sm font-medium">{average}</span>
                  <span className="text-sm text-muted-foreground">({count} отзывов)</span>
                </div>}
              <p className="text-sm md:text-base text-muted-foreground mt-1">Что говорят наши клиенты</p>
            </motion.div>

            {reviewsLoading ? <div className="flex gap-4 overflow-hidden pb-4">
                {[...Array(3)].map((_, i) => <div key={i} className="w-[280px] md:w-[320px] flex-shrink-0">
                    <div className="p-4 rounded-xl border bg-card">
                      <Skeleton className="h-4 w-20 mb-3" />
                      <Skeleton className="h-16 w-full mb-3" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>)}
              </div> : reviews.length > 0 ? <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-4" style={{
              width: 'max-content'
            }}>
                  {reviews.map((review, index) => <motion.div key={review.id} initial={{
                opacity: 0,
                y: 20
              }} whileInView={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: index * 0.05
              }} viewport={{
                once: true
              }} className="w-[280px] md:w-[320px] flex-shrink-0">
                      <Card className="p-4 md:p-5 h-full">
                        <div className="flex items-center gap-1 mb-3">
                          {Array.from({
                      length: review.rating
                    }).map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
                        </div>
                        <Quote className="h-5 w-5 text-muted-foreground/30 mb-2" />
                        <p className="text-sm md:text-base text-foreground mb-4">{review.text}</p>
                        <div className="mt-auto">
                          <p className="font-medium text-sm">{review.author_name || 'Пользователь'}</p>
                        </div>
                      </Card>
                    </motion.div>)}
                </div>
              </div> : <div className="text-center py-8 text-muted-foreground">
                <p>Отзывов пока нет. Будьте первым!</p>
              </div>}
            {reviews.length > 0 && <p className="text-center text-xs text-muted-foreground mt-2">← Листайте →</p>}

            {/* Review Form */}
            <div className="mt-6 mb-20 max-w-md mx-auto">
              <ReviewForm />
            </div>
          </div>
        </section>

        {/* Disclaimer Banner */}
        <section className="py-8 md:py-12 pb-24 md:pb-12 border-t bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-start md:items-center gap-4 max-w-3xl mx-auto"
            >
              <div className="p-2.5 rounded-lg bg-destructive/10 shrink-0">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Отказ от ответственности</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Все товары предназначены для законных целей. Покупатель несёт полную ответственность 
                  за использование приобретённых товаров и услуг.
                </p>
              </div>
              <Link to="/disclaimer">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0">
                  Подробнее
                  <ArrowRight className="h-3 w-3" />
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