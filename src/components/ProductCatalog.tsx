import { useState, useMemo } from 'react';
import { products, categories, Product } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const ProductCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 25000]);
  const [showFilters, setShowFilters] = useState(false);

  const maxPrice = Math.max(...products.map(p => p.price));

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = search === '' || 
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.shortDesc.toLowerCase().includes(search.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesType = selectedType === 'all' || product.type === selectedType;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesType && matchesPrice;
    });
  }, [search, selectedCategory, selectedType, priceRange]);

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedType !== 'all',
    priceRange[0] > 0 || priceRange[1] < maxPrice
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedType('all');
    setPriceRange([0, 25000]);
    setSearch('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Каталог</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {filteredProducts.length} товаров
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск товаров..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 md:h-11"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden gap-2 h-10"
          >
            <Filter className="h-4 w-4" />
            Фильтры
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Filters Sidebar - Mobile Sheet / Desktop Sticky */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full md:hidden flex-shrink-0 overflow-hidden"
              >
                <div className="space-y-4 p-4 rounded-xl border bg-card mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <SlidersHorizontal className="h-4 w-4" />
                      Фильтры
                    </h3>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                        Сбросить
                      </Button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Категория</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Все категории" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все категории</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Тип</label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Все типы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="one-time">Разовый</SelectItem>
                        <SelectItem value="subscription">Подписка</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      Цена: {priceRange[0].toLocaleString('ru-RU')} — {priceRange[1].toLocaleString('ru-RU')} ₽
                    </label>
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      min={0}
                      max={25000}
                      step={100}
                      className="py-4"
                    />
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6 p-4 rounded-xl border bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Фильтры
                </h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Сбросить
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Категория</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Тип</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="one-time">Разовый</SelectItem>
                    <SelectItem value="subscription">Подписка</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Цена: {priceRange[0].toLocaleString('ru-RU')} — {priceRange[1].toLocaleString('ru-RU')} ₽
                </label>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  min={0}
                  max={25000}
                  step={100}
                  className="py-4"
                />
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {/* Category Pills - Horizontal scroll on mobile */}
            <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="rounded-full h-8 text-xs md:text-sm flex-shrink-0"
              >
                Все
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="rounded-full whitespace-nowrap h-8 text-xs md:text-sm flex-shrink-0"
                >
                  <span className="mr-1">{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.name}</span>
                </Button>
              ))}
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 md:py-16"
              >
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  Товары не найдены
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
