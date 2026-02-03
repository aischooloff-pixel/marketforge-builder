import { Link } from 'react-router-dom';
import { products, categories, storeData } from '@/data/products';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Users, Star, Quote } from 'lucide-react';

const reviews = [
  {
    id: 1,
    name: 'Артём',
    username: '@artem_arb',
    text: 'Лучший магаз для арбитража. Прокси работают стабильно, выдача моментальная.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Максим',
    username: '@max_seo',
    text: 'Пользуюсь уже полгода. Цены адекватные, поддержка отвечает быстро.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Дмитрий',
    username: '@dmitry_mk',
    text: 'Удобный бот, всё автоматом. Рекомендую!',
    rating: 5,
  },
];
const Index = () => {
  const popularProducts = products.filter(p => p.popular).slice(0, 6);
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
            }} className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-secondary text-xs md:text-sm font-medium mb-4 md:mb-8">
                <Shield className="h-3 w-3 md:h-4 md:w-4" />
                Только легальные инструменты
              </motion.div>
              
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 md:mb-6">
                {storeData.store_meta.name}
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
                <Link to="/info">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm md:text-base px-6 md:px-8 h-11 md:h-12">
                    Информация
                  </Button>
                </Link>
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
              title: 'Легально',
              desc: 'Все товары проверены на соответствие законодательству'
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
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="flex justify-between items-center gap-4 mb-6 md:mb-10">
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

            {/* Horizontal scroll on Mobile, Grid on Desktop */}
            <div className="md:hidden overflow-x-auto -mx-4 px-4 pb-4 scrollbar-hide">
              <div className="flex gap-3 snap-x snap-mandatory">
                {popularProducts.map((product, index) => (
                  <div key={product.id} className="w-[85vw] flex-shrink-0 snap-center">
                    <ProductCard product={product} index={index} />
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
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
                  <Link to={`/catalog?category=${category.id}`}>
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
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="py-10 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-6 md:mb-10"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Отзывы</h2>
              <p className="text-sm md:text-base text-muted-foreground">Что говорят наши клиенты</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-4 md:p-5 h-full">
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <Quote className="h-5 w-5 text-muted-foreground/30 mb-2" />
                    <p className="text-sm md:text-base text-foreground mb-4">{review.text}</p>
                    <div className="mt-auto">
                      <p className="font-medium text-sm">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.username}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
      </main>

      <Footer />
    </div>;
};
export default Index;