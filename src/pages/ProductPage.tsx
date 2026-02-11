import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct, useProductStock } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { useProxyAvailability } from '@/hooks/useProxyAvailability';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CountrySelector, ServiceSelector } from '@/components/CountrySelector';
import { ProxyCountrySelector } from '@/components/ProxyCountrySelector';
import { TigerNumberBuyer } from '@/components/TigerNumberBuyer';
import { SocialBoostBuyer } from '@/components/SocialBoostBuyer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowLeft, Shield, AlertTriangle, PackageX, Loader2, Clock, Globe } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
const ProductPage = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const {
    data: product,
    isLoading,
    error
  } = useProduct(id);
  const {
    data: stockCount = 0,
    isLoading: stockLoading
  } = useProductStock(id);
  const {
    addItem
  } = useCart();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('http');

  // Determine product type
  const isApiProduct = product?.tags?.some(t => t.startsWith('api:px6')) ?? false;
  const isTigerProduct = product?.tags?.includes('api:tiger') ?? false;
  const isProfiLikeProduct = product?.tags?.includes('api:profilike') ?? false;
  const proxyVersion = product?.tags?.includes('api:px6:v3') ? 3 : product?.tags?.includes('api:px6:v4') ? 4 : 6;

  const { data: proxyData, isLoading: proxyLoading } = useProxyAvailability(proxyVersion, isApiProduct);
  if (isLoading) {
    return <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-6 w-32 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <Skeleton className="h-8 w-24 mb-4" />
                <Skeleton className="h-10 w-3/4 mb-4" />
                <Skeleton className="h-20 w-full mb-6" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div>
                <Skeleton className="aspect-[16/9] rounded-xl mb-6" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>;
  }
  if (error || !product) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Товар не найден</h1>
          <Link to="/catalog">
            <Button>Вернуться в каталог</Button>
          </Link>
        </div>
      </div>;
  }
  const needsPeriodSelector = isApiProduct;

  const periodOptionsMap: Record<number, { value: string; label: string; price: number }[]> = {
    4: [ // IPv4
      { value: '7', label: 'Неделя', price: 49 },
      { value: '14', label: '2 недели', price: 79 },
      { value: '30', label: 'Месяц', price: 139 },
      { value: '60', label: '2 месяца', price: 279 },
      { value: '90', label: '3 месяца', price: 389 },
    ],
    6: [ // IPv6
      { value: '3', label: '3 дня', price: 9 },
      { value: '7', label: 'Неделя', price: 12 },
      { value: '14', label: '2 недели', price: 19 },
      { value: '30', label: 'Месяц', price: 29 },
      { value: '60', label: '2 месяца', price: 49 },
      { value: '90', label: '3 месяца', price: 69 },
    ],
    3: [ // IPv4 Shared
      { value: '7', label: 'Неделя', price: 15 },
      { value: '14', label: '2 недели', price: 25 },
      { value: '30', label: 'Месяц', price: 39 },
      { value: '60', label: '2 месяца', price: 69 },
      { value: '90', label: '3 месяца', price: 99 },
    ],
  };

  const periodOptions = periodOptionsMap[proxyVersion] || periodOptionsMap[4];
  const defaultPeriod = periodOptions[0]?.value || '7';
  const activePeriod = selectedPeriod || defaultPeriod;

  const currentPeriodPrice = isApiProduct
    ? (periodOptions.find(p => p.value === activePeriod)?.price || periodOptions[0]?.price || 49)
    : product.price;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (needsCountrySelector && !selectedCountry) return;
    addItem({
      id: product.id,
      name: product.name,
      shortDesc: product.short_desc || '',
      longDesc: product.long_desc || '',
      price: currentPeriodPrice,
      type: product.type || 'one-time',
      category: product.categories?.slug || '',
      tags: product.tags || [],
      legalNote: product.legal_note || '',
      popular: product.is_popular || false,
      countries: product.countries || undefined,
      services: product.services || undefined
    }, {
      country: selectedCountry || undefined,
      services: selectedServices.length > 0 ? selectedServices : undefined,
      period: needsPeriodSelector ? parseInt(activePeriod) : undefined,
      protocol: isApiProduct ? selectedProtocol : undefined,
    });
  };
  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => prev.includes(serviceId) ? prev.filter(s => s !== serviceId) : [...prev, serviceId]);
  };
  const needsCountrySelector = product.countries && product.countries.length > 0;
  const needsServiceSelector = product.services && product.services.length > 0;
  const isOutOfStock = stockCount === 0;
  const categoryIcon = product.categories?.icon || '📦';
  return <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-16 md:pt-20 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4 md:py-8">
          {/* Back Link */}
          <Link to="/catalog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 md:mb-8 transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Назад в каталог
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
            {/* Product Info */}
            <motion.div initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }}>
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant={product.type === 'subscription' ? 'default' : 'secondary'}>
                  {product.type === 'subscription' ? 'Подписка' : 'Разовый платёж'}
                </Badge>
                {product.is_popular && <Badge variant="outline">Популярное</Badge>}
                {isOutOfStock && <Badge variant="destructive" className="gap-1">
                    <PackageX className="h-3 w-3" />
                    Нет в наличии
                  </Badge>}
              </div>

              <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
                {product.name}
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mb-4 md:mb-6">
                {product.short_desc}
              </p>

              <p className="text-sm md:text-base text-foreground mb-6 md:mb-8 leading-relaxed">
                {product.long_desc}
              </p>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && <div className="flex flex-wrap gap-2 mb-8">
                  {product.tags.map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-secondary text-sm">
                      {tag}
                    </span>)}
                </div>}

              {/* Legal Note */}
              {product.legal_note && <div className="p-4 rounded-xl bg-secondary/50 border mb-8">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium mb-1">Условия использования</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.legal_note}
                      </p>
                    </div>
                  </div>
                </div>}
            </motion.div>

            {/* Purchase Section */}
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} className="lg:sticky lg:top-24">
              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Product Media */}
                <div className="relative aspect-[2/1] md:aspect-[16/9] bg-secondary/50 overflow-hidden">
                  {product.media_urls && product.media_urls.length > 0 ? /\.(mp4|webm|mov)$/i.test(product.media_urls[0]) ? <video src={product.media_urls[0]} className="w-full h-full object-cover" controls muted /> : <img src={product.media_urls[0]} alt={product.name} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-5xl md:text-6xl">
                        {categoryIcon}
                      </div>
                    </div>}
                  {product.is_popular && !isOutOfStock && <div className="absolute top-2 left-2 md:top-3 md:left-3">
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        Популярное
                      </Badge>
                    </div>}
                  {isOutOfStock && <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Badge variant="destructive" className="text-sm md:text-lg py-1.5 px-3 md:py-2 md:px-4 gap-1.5 md:gap-2">
                        <PackageX className="h-4 w-4 md:h-5 md:w-5" />
                        Нет в наличии
                      </Badge>
                    </div>}
                </div>

                {/* Additional media thumbnails */}
                {product.media_urls && product.media_urls.length > 1 && <div className="flex gap-2 p-3 overflow-x-auto">
                    {product.media_urls.map((url, i) => <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0 bg-muted">
                        {/\.(mp4|webm|mov)$/i.test(url) ? <video src={url} className="w-full h-full object-cover" muted /> : <img src={url} alt="" className="w-full h-full object-cover" />}
                      </div>)}
                  </div>}
                
                <div className="p-4 md:p-6">
                  {/* Tiger SMS Product - Custom buyer */}
                  {isTigerProduct && !isOutOfStock && (
                    <TigerNumberBuyer />
                  )}

                  {/* Profi-Like Product - Social boost buyer */}
                  {isProfiLikeProduct && !isOutOfStock && (
                    <SocialBoostBuyer />
                  )}

                  {/* Non-API products: standard purchase flow */}
                  {!isTigerProduct && !isProfiLikeProduct && <>
                    {/* Stock info */}
                    {!stockLoading && !isOutOfStock && <div className="mb-4">
                        <p className="text-sm text-muted-foreground">
                          В наличии: <span className={stockCount > 0 && stockCount <= 5 ? 'text-orange-500 font-medium' : 'font-medium'}>
                            {stockCount === -1 ? '∞' : stockCount} шт
                          </span>
                        </p>
                      </div>}

                    {/* Country Selector - dynamic for API products, static for others */}
                    {isApiProduct && !isOutOfStock && <div className="mb-6">
                        <ProxyCountrySelector
                          countries={proxyData?.countries || []}
                          availability={proxyData?.availability || {}}
                          selectedCountry={selectedCountry}
                          onSelect={setSelectedCountry}
                          isLoading={proxyLoading}
                        />
                      </div>}
                    {!isApiProduct && needsCountrySelector && !isOutOfStock && <div className="mb-6">
                        <CountrySelector selectedCountry={selectedCountry} onSelect={setSelectedCountry} availableCountries={product.countries} />
                      </div>}

                    {/* Period Selector for API products */}
                    {needsPeriodSelector && !isOutOfStock && <div className="mb-6">
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Период
                        </label>
                        <Select value={activePeriod} onValueChange={setSelectedPeriod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {periodOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label} — {opt.price} ₽
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>}

                    {/* Protocol Selector for API products */}
                    {isApiProduct && !isOutOfStock && <div className="mb-6">
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Протокол
                        </label>
                        <ToggleGroup type="single" value={selectedProtocol} onValueChange={(v) => v && setSelectedProtocol(v)} className="justify-start">
                          <ToggleGroupItem value="http" className="px-4">
                            HTTP/HTTPS
                          </ToggleGroupItem>
                          <ToggleGroupItem value="socks" className="px-4">
                            SOCKS5
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>}

                    {/* Service Selector for Virtual Numbers */}
                    {needsServiceSelector && !isOutOfStock && <div className="mb-6">
                        <ServiceSelector selectedServices={selectedServices} onToggle={toggleService} availableServices={product.services?.map(s => s.toLowerCase())} />
                      </div>}

                    {/* Price */}
                    <div className="mb-4 md:mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-bold">
                          {currentPeriodPrice.toLocaleString('ru-RU')}
                        </span>
                        <span className="text-lg md:text-xl text-muted-foreground">₽</span>
                        {product.type === 'subscription' && <span className="text-muted-foreground text-sm">/мес</span>}
                      </div>
                    </div>

                    {/* Add to Cart */}
                    <Button size="lg" className="w-full gap-2 mb-4" onClick={handleAddToCart} disabled={isOutOfStock || (isApiProduct && !selectedCountry) || (isApiProduct && selectedCountry && (proxyData?.availability?.[selectedCountry] || 0) === 0) || (!isApiProduct && needsCountrySelector && !selectedCountry)}>
                      {isOutOfStock ? <>
                          <PackageX className="h-5 w-5" />
                          Нет в наличии
                        </> : <>
                          <ShoppingCart className="h-5 w-5" />
                          Добавить в корзину
                        </>}
                    </Button>

                    {/* Warning */}
                    {!isOutOfStock && <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Возврат и замена товара возможна через Тех.поддержку</span>
                      </div>}
                  </>}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>;
};
export default ProductPage;