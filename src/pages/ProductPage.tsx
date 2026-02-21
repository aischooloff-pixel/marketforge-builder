import { useState, useRef, useEffect } from 'react';
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
import { ShoppingCart, ArrowLeft, Shield, AlertTriangle, PackageX, Clock, Globe, Check, X, Minus, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id);
  const { data: stockCount = 0, isLoading: stockLoading } = useProductStock(id);
  const { addItem } = useCart();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('http');
  const [addedToCart, setAddedToCart] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (descRef.current) {
      setDescOverflows(descRef.current.scrollHeight > 120);
    }
  }, [product?.long_desc]);

  const isApiProduct = product?.tags?.some(t => t.startsWith('api:px6')) ?? false;
  const isTigerProduct = product?.tags?.includes('api:tiger') ?? false;
  const isProfiLikeProduct = product?.tags?.includes('api:profilike') ?? false;
  
  const proxyVersion = product?.tags?.includes('api:px6:v3') ? 3 : product?.tags?.includes('api:px6:v4') ? 4 : 6;

  const { data: proxyData, isLoading: proxyLoading } = useProxyAvailability(proxyVersion, isApiProduct);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="win95-window max-w-4xl mx-auto">
              <div className="win95-titlebar px-2 py-1">
                <Skeleton className="h-3 w-32 bg-primary-foreground/30" />
              </div>
              <div className="p-4 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="win95-window p-6 text-center">
            <div className="win95-titlebar px-2 py-1 mb-0">
              <span>Ошибка</span>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <PackageX className="h-10 w-10 text-muted-foreground" />
              <h1 className="text-lg font-bold">Товар не найден</h1>
              <Link to="/catalog">
                <Button>Вернуться в каталог</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const needsPeriodSelector = isApiProduct;

  const periodOptionsMap: Record<number, { value: string; label: string; price: number }[]> = {
    4: [
      { value: '7', label: 'Неделя', price: 49 },
      { value: '14', label: '2 недели', price: 79 },
      { value: '30', label: 'Месяц', price: 139 },
      { value: '60', label: '2 месяца', price: 279 },
      { value: '90', label: '3 месяца', price: 389 },
    ],
    6: [
      { value: '3', label: '3 дня', price: 9 },
      { value: '7', label: 'Неделя', price: 12 },
      { value: '14', label: '2 недели', price: 19 },
      { value: '30', label: 'Месяц', price: 29 },
      { value: '60', label: '2 месяца', price: 49 },
      { value: '90', label: '3 месяца', price: 69 },
    ],
    3: [
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
    toast.success(`${product.name} добавлен в корзину`);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => prev.includes(serviceId) ? prev.filter(s => s !== serviceId) : [...prev, serviceId]);
  };

  const needsCountrySelector = product.countries && product.countries.length > 0;
  const needsServiceSelector = product.services && product.services.length > 0;
  const isOutOfStock = stockCount === 0;
  const categoryIcon = product.categories?.icon || '📦';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 md:pt-20 pb-20 md:pb-0">
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 md:mb-6 transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Назад в каталог
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            {/* Main Win95 Window */}
            <div className="win95-window crt-glitch-window">
              {/* Title Bar */}
              <div className="win95-titlebar px-2 py-1 justify-between">
                <span className="truncate flex-1 text-[9px] md:text-[11px]">
                  {product.name}
                </span>
                <div className="flex gap-0.5 ml-2">
                  <div className="w-4 h-4 md:w-5 md:h-5 bevel-raised bg-card flex items-center justify-center cursor-pointer">
                    <Minus className="h-2.5 w-2.5 md:h-3 md:w-3 text-foreground" />
                  </div>
                  <div className="w-4 h-4 md:w-5 md:h-5 bevel-raised bg-card flex items-center justify-center cursor-pointer">
                    <Square className="h-2 w-2 md:h-2.5 md:w-2.5 text-foreground" />
                  </div>
                  <Link to="/catalog">
                    <div className="w-4 h-4 md:w-5 md:h-5 bevel-raised bg-card flex items-center justify-center cursor-pointer">
                      <X className="h-2.5 w-2.5 md:h-3 md:w-3 text-foreground" />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Menu Bar */}
              <div className="bevel-raised bg-card px-1 py-0.5 flex gap-3 text-xs border-b border-border">
                <span className="hover:bg-primary hover:text-primary-foreground px-1 cursor-pointer">Файл</span>
                <span className="hover:bg-primary hover:text-primary-foreground px-1 cursor-pointer">Правка</span>
                <span className="hover:bg-primary hover:text-primary-foreground px-1 cursor-pointer">Вид</span>
                <span className="hover:bg-primary hover:text-primary-foreground px-1 cursor-pointer">Справка</span>
              </div>

              {/* Content Area */}
              <div className="p-2 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3 md:gap-4">

                  {/* Left: Product Info */}
                  <div className="space-y-3">
                    {/* Image Panel */}
                    <div className="bevel-sunken bg-background p-1">
                      <div className="relative aspect-[2/1] md:aspect-[16/9] overflow-hidden">
                        {product.media_urls && product.media_urls.length > 0 ? (
                          /\.(mp4|webm|mov)$/i.test(product.media_urls[0]) ? (
                            <video src={product.media_urls[0]} className="w-full h-full object-cover" controls muted />
                          ) : (
                            <img src={product.media_urls[0]} alt={product.name} className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                            <div className="text-5xl md:text-6xl">{categoryIcon}</div>
                          </div>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <Badge variant="destructive" className="text-sm md:text-lg py-1.5 px-3 gap-1.5">
                              <PackageX className="h-4 w-4 md:h-5 md:w-5" />
                              Нет в наличии
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Thumbnails */}
                    {product.media_urls && product.media_urls.length > 1 && (
                      <div className="flex gap-1 overflow-x-auto">
                        {product.media_urls.map((url, i) => (
                          <div key={i} className="w-12 h-12 bevel-sunken bg-background p-0.5 flex-shrink-0">
                            {/\.(mp4|webm|mov)$/i.test(url) ? (
                              <video src={url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Description Panel */}
                    <div className="bevel-sunken bg-background p-2 md:p-3">
                      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border">
                        <span className="text-lg">{categoryIcon}</span>
                        <h2 className="text-sm md:text-base font-bold">{product.name}</h2>
                        {product.is_popular && (
                          <Badge variant="outline" className="text-[10px] ml-auto">★ Популярное</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {product.short_desc}
                      </p>
                      <div
                        ref={descRef}
                        className={`text-sm leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-300 ${descExpanded ? '' : 'max-h-[120px]'}`}
                      >
                        {product.long_desc}
                      </div>
                      {descOverflows && (
                        <button
                          onClick={() => setDescExpanded(!descExpanded)}
                          className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                        >
                          {descExpanded ? <><ChevronUp className="h-3 w-3" /> Свернуть</> : <><ChevronDown className="h-3 w-3" /> Читать полностью</>}
                        </button>
                      )}
                    </div>

                    {/* Tags */}
                    {product.tags && product.tags.filter(t => !t.startsWith('api:')).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.tags.filter(t => !t.startsWith('api:')).map(tag => (
                          <span key={tag} className="bevel-raised bg-card px-2 py-0.5 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Legal Note */}
                    {product.legal_note && (
                      <div className="bevel-sunken bg-background p-2 md:p-3">
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold mb-1">Условия использования</h4>
                            <p className="text-xs text-muted-foreground">{product.legal_note}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Purchase Panel */}
                  <div>
                    <div className="win95-window">
                      <div className="win95-titlebar px-1.5 py-0.5">
                        <span className="text-[8px] md:text-[9px]">Покупка</span>
                      </div>
                      <div className="p-2 md:p-3 space-y-3">
                        {/* Tiger SMS */}
                        {isTigerProduct && !isOutOfStock && <TigerNumberBuyer />}

                        {/* Profi-Like */}
                        {isProfiLikeProduct && !isOutOfStock && <SocialBoostBuyer />}

                        {/* Standard flow */}
                        {!isTigerProduct && !isProfiLikeProduct && (
                          <>
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1">
                              <span className="bevel-raised bg-card px-2 py-0.5 text-[10px]">
                                {product.type === 'subscription' ? '📅 Подписка' : '💰 Разовый'}
                              </span>
                              {!stockLoading && !isOutOfStock && (
                                <span className={`bevel-raised bg-card px-2 py-0.5 text-[10px] ${stockCount > 0 && stockCount <= 5 ? 'text-destructive' : ''}`}>
                                  📦 {stockCount === -1 ? '∞' : stockCount} шт
                                </span>
                              )}
                            </div>

                            {/* Country Selector */}
                            {isApiProduct && !isOutOfStock && (
                              <ProxyCountrySelector
                                countries={proxyData?.countries || []}
                                availability={proxyData?.availability || {}}
                                selectedCountry={selectedCountry}
                                onSelect={setSelectedCountry}
                                isLoading={proxyLoading}
                              />
                            )}
                            {!isApiProduct && needsCountrySelector && !isOutOfStock && (
                              <CountrySelector selectedCountry={selectedCountry} onSelect={setSelectedCountry} availableCountries={product.countries} />
                            )}

                            {/* Period */}
                            {needsPeriodSelector && !isOutOfStock && (
                              <div>
                                <label className="text-xs font-bold mb-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Период
                                </label>
                                <Select value={activePeriod} onValueChange={setSelectedPeriod}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {periodOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label} — {opt.price} ₽
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Protocol */}
                            {isApiProduct && !isOutOfStock && (
                              <div>
                                <label className="text-xs font-bold mb-1 flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  Протокол
                                </label>
                                <ToggleGroup type="single" value={selectedProtocol} onValueChange={(v) => v && setSelectedProtocol(v)} className="justify-start">
                                  <ToggleGroupItem value="http" className="px-3 text-xs h-7">HTTP/HTTPS</ToggleGroupItem>
                                  <ToggleGroupItem value="socks" className="px-3 text-xs h-7">SOCKS5</ToggleGroupItem>
                                </ToggleGroup>
                              </div>
                            )}

                            {/* Service Selector */}
                            {needsServiceSelector && !isOutOfStock && (
                              <ServiceSelector selectedServices={selectedServices} onToggle={toggleService} availableServices={product.services?.map(s => s.toLowerCase())} />
                            )}

                            {/* Price */}
                            <div className="bevel-sunken bg-background p-2 text-center">
                              <span className="text-xl md:text-2xl font-bold text-primary">
                                {currentPeriodPrice.toLocaleString('ru-RU')}
                              </span>
                              <span className="text-sm text-muted-foreground ml-1">₽</span>
                              {product.type === 'subscription' && <span className="text-xs text-muted-foreground">/мес</span>}
                            </div>

                            {/* Add to Cart */}
                            <Button className="w-full gap-2" onClick={handleAddToCart} disabled={isOutOfStock || (isApiProduct && !selectedCountry) || (isApiProduct && selectedCountry && (proxyData?.availability?.[selectedCountry] || 0) === 0) || (!isApiProduct && needsCountrySelector && !selectedCountry)}>
                              {isOutOfStock ? <>
                                <PackageX className="h-4 w-4" />
                                Нет в наличии
                              </> : addedToCart ? <>
                                <Check className="h-4 w-4" />
                                Добавлено
                              </> : <>
                                <ShoppingCart className="h-4 w-4" />
                                В корзину
                              </>}
                            </Button>

                            {!isOutOfStock && (
                              <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Возврат и замена через Тех.поддержку</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
export default ProductPage;