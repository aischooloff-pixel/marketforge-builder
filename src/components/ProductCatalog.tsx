import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const ProductCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: allProducts = [], isLoading: productsLoading } = useProducts({
    categorySlug: selectedCategory !== 'all' ? selectedCategory : undefined,
    type: selectedType !== 'all' ? selectedType as 'one-time' | 'subscription' : undefined
  });

  const isLoading = categoriesLoading || productsLoading;

  const filteredProducts = useMemo(() => {
    let result = allProducts.filter((product) => {
      const matchesSearch = search === '' ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.short_desc?.toLowerCase().includes(search.toLowerCase()) ||
      product.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesSearch && matchesPrice;
    });
    // No random shuffle — keep server sort order
    return result;
  }, [allProducts, search, priceRange, selectedCategory]);

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 50000;
    return Math.max(...allProducts.map((p) => p.price), 50000);
  }, [allProducts]);

  const activeFiltersCount = [
  selectedCategory !== 'all',
  selectedType !== 'all',
  priceRange[0] > 0 || priceRange[1] < maxPrice].
  filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedType('all');
    setPriceRange([0, 50000]);
    setSearch('');
    setSearchParams({});
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (value !== 'all') {
      setSearchParams({ category: value });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="min-h-screen pt-16 md:pt-20 pb-20 md:pb-0 criminal-pattern py-0">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Каталог</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isLoading ? 'Загрузка...' : `${filteredProducts.length} товаров`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Поиск товаров..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 md:h-11" />
            {search &&
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearch('')}>
                <X className="h-4 w-4" />
              </Button>
            }
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="md:hidden gap-2 h-10">
            <Filter className="h-4 w-4" />
            Фильтры
            {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => handleCategoryChange('all')} className="rounded-full h-8 text-xs md:text-sm">Все</Button>
          {categories.map((cat) =>
          <Button key={cat.id} variant={selectedCategory === cat.slug ? 'default' : 'outline'} size="sm" onClick={() => handleCategoryChange(cat.slug)} className="rounded-full h-8 text-xs md:text-sm">
              {cat.icon} {cat.name}
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          <AnimatePresence>
            {showFilters &&
            <motion.aside initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full md:hidden flex-shrink-0 overflow-hidden">
                <div className="space-y-4 p-4 win95-window mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2 text-sm"><SlidersHorizontal className="h-4 w-4" />Фильтры</h3>
                    {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Сбросить</Button>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Тип</label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Все типы" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="one-time">Разовый</SelectItem>
                        <SelectItem value="subscription">Подписка</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Цена: {priceRange[0].toLocaleString('ru-RU')} — {priceRange[1].toLocaleString('ru-RU')} ₽</label>
                    <Slider value={priceRange} onValueChange={(value) => setPriceRange(value as [number, number])} min={0} max={maxPrice} step={100} className="py-4" />
                  </div>
                </div>
              </motion.aside>
            }
          </AnimatePresence>

          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6 p-4 win95-window">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Фильтры</h3>
                {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}>Сбросить</Button>}
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Тип</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="Все типы" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="one-time">Разовый</SelectItem>
                    <SelectItem value="subscription">Подписка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Цена: {priceRange[0].toLocaleString('ru-RU')} — {priceRange[1].toLocaleString('ru-RU')} ₽</label>
                <Slider value={priceRange} onValueChange={(value) => setPriceRange(value as [number, number])} min={0} max={maxPrice} step={100} className="py-4" />
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 criminal-pattern">
            {isLoading ?
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {[...Array(6)].map((_, i) =>
              <div key={i} className="win95-window p-2 md:p-3">
                    <Skeleton className="h-3 w-1/2 mb-2" />
                    <div className="flex gap-2 mb-2"><Skeleton className="w-8 h-8" /><Skeleton className="h-4 flex-1" /></div>
                    <Skeleton className="h-3 w-3/4 mb-2" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
              )}
              </div> :
            filteredProducts.length > 0 ?
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {filteredProducts.map((product, index) =>
              <ProductCard key={product.id} product={product} index={index} />
              )}
              </div> :

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 md:py-16">
                <p className="text-muted-foreground mb-4 text-sm md:text-base">Товары не найдены</p>
                <Button variant="outline" size="sm" onClick={clearFilters}>Сбросить фильтры</Button>
              </motion.div>
            }
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 win95-window">
          <button
            onClick={() => setDisclaimerOpen(!disclaimerOpen)}
            className="win95-titlebar px-2 py-1 w-full text-left flex items-center justify-between cursor-pointer">

            <span className="font-pixel text-[10px]">⚠ Отказ от ответственности</span>
            <span className="text-[10px]">{disclaimerOpen ? '▲' : '▼'}</span>
          </button>
          {disclaimerOpen &&
          <div className="p-3 text-xs text-muted-foreground space-y-2 bevel-sunken m-1">
              <p>
                Все товары и услуги представлены исключительно в ознакомительных целях. Администрация не несёт ответственности за действия покупателей. Приобретая товар, вы подтверждаете, что ознакомились с условиями использования.
              </p>
              <Link to="/disclaimer" className="inline-block text-primary hover:underline font-pixel text-[10px]">
                Подробнее →
              </Link>
            </div>
          }
        </div>
      </div>
    </div>);

};