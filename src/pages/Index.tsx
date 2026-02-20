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
import { ArrowRight, Zap, Users, Star, Quote, Info, Send, Award, Shield, ShieldAlert } from 'lucide-react';
import { useRef } from 'react';

const Win95Dialog = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-background" style={{
    boxShadow: 'inset -1px -1px 0px #000000, inset 1px 1px 0px #FFFFFF, inset -2px -2px 0px #808080, inset 2px 2px 0px #DFDFDF'
  }}>
    <div className="win95-titlebar flex items-center gap-1 px-2 py-0.5">
      <span className="text-[10px]">📁</span>
      <span className="text-white text-xs font-bold flex-1">{title}</span>
      <div className="win95-titlebar-btn text-[8px]">_</div>
      <div className="win95-titlebar-btn text-[8px]">□</div>
      <div className="win95-titlebar-btn text-[8px] font-bold">✕</div>
    </div>
    {children}
  </div>
);

const Index = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: popularProducts = [], isLoading: productsLoading } = usePopularProducts(6);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: reviews = [], isLoading: reviewsLoading } = useApprovedReviews();
  const { average, count } = useAverageRating(reviews);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-24 md:pt-20 pb-20 md:pb-8">
        {/* Desktop wallpaper area */}
        <div className="container mx-auto px-2 md:px-4 py-4 space-y-4">

          {/* Hero — Main Window */}
          <Win95Dialog title="TEMKA.STORE — Добро пожаловать!">
            <div className="p-4 md:p-8">
              {/* Toolbar */}
              <div className="win95-menubar mb-4 -mx-0">
                <span className="win95-menubar-item text-xs">Файл</span>
                <span className="win95-menubar-item text-xs">Правка</span>
                <span className="win95-menubar-item text-xs">Вид</span>
                <span className="win95-menubar-item text-xs">Помощь</span>
              </div>

              <div className="flex flex-col items-center text-center py-4 md:py-8">
                {/* Badge */}
                <div className="mb-4 bg-primary text-white text-xs px-3 py-1 flex items-center gap-2">
                  <Award className="h-3 w-3" />
                  ★ Первый магазин с приложением
                </div>
                
                {/* Title */}
                <h1 className="text-4xl md:text-7xl font-bold mb-4 tracking-tight" style={{ fontFamily: '"VT323", monospace' }}>
                  <span className="text-foreground">TEMKA</span>
                  <span style={{ color: '#8c8c8c' }}>.STORE</span>
                </h1>
                
                <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-lg px-2" style={{ fontFamily: 'monospace' }}>
                  {storeData.store_meta.description}
                </p>

                {/* Buttons in Win95 dialog style */}
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <Link to="/catalog">
                    <Button size="lg" variant="default" className="gap-2 min-w-[160px]">
                      Смотреть каталог
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/info">
                    <Button size="default" variant="default" className="gap-1.5 min-w-[120px]">
                      <Info className="h-3.5 w-3.5" />
                      Информация
                    </Button>
                  </Link>
                  <a href="https://t.me/TemkaStoreNews" target="_blank" rel="noopener noreferrer">
                    <Button size="default" variant="default" className="gap-1.5 min-w-[140px]">
                      <Send className="h-3.5 w-3.5" />
                      Телеграм канал
                    </Button>
                  </a>
                </div>

                {/* Win95 progress bar decoration */}
                <div className="mt-6 w-full max-w-xs">
                  <div className="text-[10px] text-muted-foreground mb-1 text-left">Загрузка магазина...</div>
                  <div className="h-4 bg-white w-full"
                    style={{ boxShadow: 'inset 1px 1px 0px #000000, inset -1px -1px 0px #FFFFFF, inset 2px 2px 0px #808080, inset -2px -2px 0px #DFDFDF' }}
                  >
                    <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </Win95Dialog>

          {/* Features — System Properties style */}
          <Win95Dialog title="Свойства системы — Преимущества">
            <div className="p-3">
              {/* Tab bar */}
              <div className="flex gap-0 mb-3">
                {['Надежность', 'Скорость', 'Профессионализм'].map((tab, i) => (
                  <div
                    key={tab}
                    className={`px-3 py-1 text-xs border border-border cursor-pointer ${i === 0 
                      ? 'bg-background border-b-background -mb-px z-10 relative' 
                      : 'bg-muted'
                    }`}
                    style={i === 0 ? {
                      boxShadow: 'inset -1px 0px 0px #000000, inset 1px 1px 0px #FFFFFF, -1px 0px 0px #808080, 1px 0px 0px #808080'
                    } : {}}
                  >
                    {tab}
                  </div>
                ))}
              </div>
              
              <div
                className="p-3"
                style={{ boxShadow: 'inset 1px 1px 0px #000000, inset -1px -1px 0px #FFFFFF, inset 2px 2px 0px #808080, inset -2px -2px 0px #DFDFDF' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: Shield, emoji: '🛡️', title: 'Надежно', desc: 'Лучшие поставщики и проверенные временем товары' },
                    { icon: Zap, emoji: '⚡', title: 'Мгновенно', desc: 'Автоматическая доставка после оплаты' },
                    { icon: Users, emoji: '👨‍💻', title: 'Для профи', desc: 'Инструменты для мастеров своих дел' },
                  ].map((feature) => (
                    <div key={feature.title} className="flex items-start gap-3 p-2">
                      <div className="text-2xl">{feature.emoji}</div>
                      <div>
                        <h3 className="font-bold text-sm mb-0.5">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Win95Dialog>

          {/* Popular Products */}
          <Win95Dialog title="Мой компьютер — Популярные товары">
            <div className="p-3">
              <div className="win95-menubar mb-3">
                <span className="win95-menubar-item text-[10px]">Файл</span>
                <span className="win95-menubar-item text-[10px]">Правка</span>
                <span className="win95-menubar-item text-[10px]">Вид</span>
                <span className="ml-auto">
                  <Link to="/catalog">
                    <Button variant="default" size="sm" className="gap-1 text-[10px] h-6">
                      Все товары <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </span>
              </div>

              {/* Address bar */}
              <div className="flex items-center gap-1 mb-3">
                <span className="text-[10px] text-muted-foreground">Адрес:</span>
                <div className="flex-1 h-5 px-1 text-[10px] bg-white flex items-center"
                  style={{ boxShadow: 'inset 1px 1px 0px #000000, inset -1px -1px 0px #FFFFFF, inset 2px 2px 0px #808080, inset -2px -2px 0px #DFDFDF' }}
                >
                  C:\TEMKA.STORE\catalog\popular
                </div>
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : popularProducts.length > 0 ? (
                <>
                  <div ref={scrollRef} className="md:hidden overflow-x-auto -mx-1 px-1 pb-2 scrollbar-hide">
                    <div className="flex gap-2">
                      {popularProducts.map((product, index) => (
                        <div key={product.id} className="w-[75vw] flex-shrink-0">
                          <ProductCard product={product} index={index} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {popularProducts.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  📭 Популярные товары скоро появятся
                </div>
              )}
            </div>
          </Win95Dialog>

          {/* Categories */}
          <Win95Dialog title="Проводник Windows — Категории">
            <div className="p-3">
              <div className="text-center mb-3">
                <p className="text-xs text-muted-foreground">Дважды щёлкните по папке для перехода</p>
              </div>

              {categoriesLoading ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : categories.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {categories.map((category) => (
                    <Link key={category.id} to={`/catalog?category=${category.slug}`}>
                      <div className="flex flex-col items-center gap-1 p-2 cursor-pointer text-center group hover:bg-primary hover:text-white transition-none">
                        {/* Folder icon style */}
                        <div className="text-3xl md:text-4xl">{category.icon}</div>
                        <span className="text-[10px] md:text-xs font-medium leading-tight group-hover:text-white line-clamp-2">
                          {category.name}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  📂 Категории скоро появятся
                </div>
              )}
            </div>
          </Win95Dialog>

          {/* Reviews */}
          <Win95Dialog title="Блокнот — Отзывы клиентов">
            <div className="p-3">
              <div className="win95-menubar mb-3">
                <span className="win95-menubar-item text-[10px]">Файл</span>
                <span className="win95-menubar-item text-[10px]">Правка</span>
                <span className="win95-menubar-item text-[10px]">Формат</span>
              </div>

              {count > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-white"
                  style={{ boxShadow: 'inset 1px 1px 0px #808080, inset -1px -1px 0px #DFDFDF' }}
                >
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < Math.round(average) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <span className="text-xs font-bold">{average}</span>
                  <span className="text-xs text-muted-foreground">({count} отзывов)</span>
                </div>
              )}

              {reviewsLoading ? (
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-64 flex-shrink-0" />)}
                </div>
              ) : reviews.length > 0 ? (
                <div className="overflow-x-auto -mx-1 px-1 pb-2 scrollbar-hide">
                  <div className="flex gap-2" style={{ width: 'max-content' }}>
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="w-[260px] md:w-[300px] flex-shrink-0 bg-background p-2"
                        style={{
                          boxShadow: 'inset 1px 1px 0px #000000, inset -1px -1px 0px #FFFFFF, inset 2px 2px 0px #808080, inset -2px -2px 0px #DFDFDF'
                        }}
                      >
                        {/* Mini title bar */}
                        <div className="win95-titlebar flex items-center gap-1 px-1 py-0.5 mb-2 -mx-2 -mt-2">
                          <span className="text-white text-[9px] font-bold">💬 Отзыв</span>
                        </div>
                        <div className="flex items-center gap-0.5 mb-1.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                          ))}
                        </div>
                        <p className="text-xs text-foreground mb-2 leading-relaxed">{review.text}</p>
                        <div className="border-t border-border/50 pt-1.5">
                          <p className="font-bold text-[10px]">{review.author_name || 'Пользователь'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  📝 Отзывов пока нет. Будьте первым!
                </div>
              )}
              {reviews.length > 0 && (
                <p className="text-center text-[10px] text-muted-foreground mt-1">← Прокрутите →</p>
              )}

              {/* Review Form */}
              <div className="mt-4 max-w-md mx-auto">
                <ReviewForm />
              </div>
            </div>
          </Win95Dialog>

          {/* Disclaimer */}
          <div className="bg-background p-3 flex flex-col md:flex-row items-start md:items-center gap-3"
            style={{
              boxShadow: 'inset -1px -1px 0px #000000, inset 1px 1px 0px #FFFFFF, inset -2px -2px 0px #808080, inset 2px 2px 0px #DFDFDF'
            }}
          >
            {/* Warning icon like Win95 dialog */}
            <div className="flex items-center gap-3 flex-1">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="font-bold text-xs mb-0.5">Отказ от ответственности</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Все товары предназначены для законных целей. Покупатель несёт полную ответственность 
                  за использование приобретённых товаров и услуг.
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link to="/disclaimer">
                <Button variant="default" size="sm" className="text-xs gap-1.5">
                  Подробнее
                </Button>
              </Link>
              <Button variant="default" size="sm" className="text-xs">
                OK
              </Button>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
