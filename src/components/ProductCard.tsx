import { Product } from '@/hooks/useProducts';
import { useProductStock } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addItem, items } = useCart();
  const { data: stockCount = 0 } = useProductStock(product.id);
  const [justAdded, setJustAdded] = useState(false);
  const isInCart = items.some((item) => item.product.id === product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stockCount === 0) return;
    addItem(product);
    toast.success(`${product.name} добавлен в корзину`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const categoryIcon = product.categories?.icon || '📦';
  const isOutOfStock = stockCount === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={`group h-full ${isOutOfStock ? 'opacity-50' : ''}`}>

      <Link to={`/product/${product.id}`} className="block h-full">
        <div className="h-full win95-window hover-lift flex flex-col">
          {/* Win95 title bar */}
          <div className="win95-titlebar px-2 py-1 gap-1.5">
            <span className="text-[9px] md:text-[10px] truncate flex-1">{product.categories?.name || 'Разное'}</span>
            {product.is_popular && <span className="text-[10px] text-warning-foreground">★ ХИТ</span>}
          </div>

          {/* Image / Icon area */}
          <div className="w-full aspect-[4/3] bevel-sunken bg-background flex items-center justify-center overflow-hidden">
            {product.icon_url ? (
              <img src={product.icon_url} alt={product.name} className="w-full h-full object-cover" />
            ) : product.media_urls && product.media_urls.length > 0 && !/\.(mp4|webm|mov)$/i.test(product.media_urls[0]) ? (
              <img src={product.media_urls[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl md:text-5xl">{categoryIcon}</span>
            )}
          </div>

          {/* Content */}
          <div className="p-2.5 md:p-3 flex flex-col flex-1 bg-card">
            {/* Name */}
            <h3 className="text-sm md:text-base font-bold leading-tight line-clamp-2 mb-1">
              {product.name}
            </h3>

            {/* Description */}
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2 flex-1">
              {product.short_desc || '—'}
            </p>

            {/* Stock indicator */}
            <div className="text-[10px] md:text-xs mb-2">
              {isOutOfStock ?
              <span className="text-destructive font-bold">✕ Раскупили</span> :
              stockCount === -1 ?
              <span className="text-primary">● Есть в наличии</span> :
              stockCount <= 5 ?
              <span className="text-warning font-bold">● Осталось {stockCount} шт — залетай</span> :
              <span className="text-primary">● В наличии</span>
              }
            </div>

            {/* Price + cart row */}
            <div className="flex items-center justify-between pt-2 border-t-2 border-border/50 mt-auto">
              <div>
                <span className="text-xl md:text-2xl font-bold text-primary">{product.price.toLocaleString('ru-RU')}</span>
                <span className="text-sm text-muted-foreground ml-0.5">₽</span>
                {product.type === 'subscription' && <span className="text-[10px] text-muted-foreground ml-1">/мес</span>}
              </div>
              {!isOutOfStock &&
              <Button
                size="sm"
                variant={isInCart || justAdded ? 'default' : 'outline'}
                className="h-8 text-xs px-3 bevel-raised"
                onClick={handleAddToCart}>
                  {isInCart || justAdded ? '✓ В корзине' : '+ Взять'}
                </Button>
              }
            </div>
          </div>
        </div>
      </Link>
    </motion.div>);

};

export const ProductCardCompact = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const { data: stockCount = 0 } = useProductStock(product.id);
  const isOutOfStock = stockCount === 0;
  const categoryIcon = product.categories?.icon || '📦';

  return (
    <Link to={`/product/${product.id}`}>
      <div className={`group flex items-center gap-3 p-2 md:p-3 bevel-sunken bg-card hover:bg-secondary/50 transition-colors ${isOutOfStock ? 'opacity-50' : ''}`}>
        <span className="text-lg flex-shrink-0">{categoryIcon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate block group-hover:text-primary transition-colors">{product.name}</span>
        </div>
        <span className="font-bold text-sm text-primary whitespace-nowrap">{product.price.toLocaleString('ru-RU')}₽</span>
        {!isOutOfStock &&
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-xs" onClick={(e) => {
          e.preventDefault();
          addItem(product);
        }}>
            +
          </Button>
        }
      </div>
    </Link>);

};