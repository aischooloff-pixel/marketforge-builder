import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products, countries } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CountrySelector, ServiceSelector } from '@/components/CountrySelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowLeft, Shield, AlertTriangle } from 'lucide-react';

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const product = products.find(p => p.id === id);
  const { addItem } = useCart();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Товар не найден</h1>
          <Link to="/catalog">
            <Button>Вернуться в каталог</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, {
      country: selectedCountry || undefined,
      services: selectedServices.length > 0 ? selectedServices : undefined
    });
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const needsCountrySelector = product.countries && product.countries.length > 0;
  const needsServiceSelector = product.services && product.services.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Back Link */}
          <Link 
            to="/catalog" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад в каталог
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant={product.type === 'subscription' ? 'default' : 'secondary'}>
                  {product.type === 'subscription' ? 'Подписка' : 'Разовый платёж'}
                </Badge>
                {product.popular && (
                  <Badge variant="outline">Популярное</Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {product.name}
              </h1>

              <p className="text-lg text-muted-foreground mb-6">
                {product.shortDesc}
              </p>

              <p className="text-foreground mb-8 leading-relaxed">
                {product.longDesc}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {product.tags.map(tag => (
                  <span 
                    key={tag}
                    className="px-3 py-1 rounded-full bg-secondary text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Legal Note */}
              <div className="p-4 rounded-xl bg-secondary/50 border mb-8">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium mb-1">Условия использования</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.legalNote}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Purchase Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="sticky top-24 p-6 rounded-xl border bg-card">
                {/* Country Selector for Proxy/VPS */}
                {needsCountrySelector && (
                  <div className="mb-6">
                    <CountrySelector
                      selectedCountry={selectedCountry}
                      onSelect={setSelectedCountry}
                      availableCountries={product.countries}
                    />
                  </div>
                )}

                {/* Service Selector for Virtual Numbers */}
                {needsServiceSelector && (
                  <div className="mb-6">
                    <ServiceSelector
                      selectedServices={selectedServices}
                      onToggle={toggleService}
                      availableServices={product.services?.map(s => s.toLowerCase())}
                    />
                  </div>
                )}

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      {product.price.toLocaleString('ru-RU')}
                    </span>
                    <span className="text-xl text-muted-foreground">₽</span>
                    {product.type === 'subscription' && (
                      <span className="text-muted-foreground">/мес</span>
                    )}
                  </div>
                </div>

                {/* Add to Cart */}
                <Button 
                  size="lg" 
                  className="w-full gap-2 mb-4"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Добавить в корзину
                </Button>

                {/* Warning */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Оформляя заказ, вы подтверждаете, что будете использовать 
                    продукт в соответствии с законодательством и правилами магазина.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductPage;
