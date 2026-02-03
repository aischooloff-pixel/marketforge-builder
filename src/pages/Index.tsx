import { Link } from 'react-router-dom';
import { products, categories, storeData } from '@/data/products';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Users } from 'lucide-react';
const Index = () => {
  const popularProducts = products.filter(p => p.popular).slice(0, 6);
  return <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-32">
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
            }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm font-medium mb-8">
                <Shield className="h-4 w-4" />
                Только легальные инструменты
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                {storeData.store_meta.name}
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                {storeData.store_meta.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/catalog">
                  <Button size="lg" className="gap-2 text-base px-8">
                    Смотреть каталог
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/catalog?category=proxy">
                  <Button size="lg" variant="outline" className="text-base px-8">
                    Прокси и VPS
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-y bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              desc: 'Инструменты для арбитражников и маркетологов'
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
            }} className="flex items-start gap-4 p-6">
                  <div className="p-3 rounded-xl bg-foreground text-background">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>)}
            </div>
          </div>
        </section>

        {/* Popular Products */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2">Популярное</h2>
                <p className="text-muted-foreground">Самые востребованные товары</p>
              </div>
              <Link to="/catalog">
                <Button variant="outline" className="gap-2">
                  Все товары
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Horizontal Scroll on Mobile, Grid on Desktop */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-max md:min-w-0">
                {popularProducts.map((product, index) => <div key={product.id} className="w-80 md:w-auto flex-shrink-0">
                    <ProductCard product={product} index={index} />
                  </div>)}
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">Категории</h2>
              <p className="text-muted-foreground">Найдите нужный инструмент</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    <div className="p-6 rounded-xl border bg-card hover:shadow-lg hover:-translate-y-1 transition-all text-center group">
                      <div className="text-4xl mb-3">{category.icon}</div>
                      <h3 className="font-semibold mb-1 group-hover:text-foreground transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {category.description}
                      </p>
                    </div>
                  </Link>
                </motion.div>)}
            </div>
          </div>
        </section>

        {/* CTA */}
        
      </main>

      <Footer />
    </div>;
};
export default Index;