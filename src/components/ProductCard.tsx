import { Product } from '@/hooks/useProducts';
import { useProductStock } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, PackageX, Check } from 'lucide-react';
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

  const isInCart = items.some(item => item.product.id === product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stockCount === 0) return;
    
    addItem({
      id: product.id,
      name: product.name,
      shortDesc: product.short_desc || '',
      longDesc: product.long_desc || '',
      price: product.price,
      type: product.type || 'one-time',
      category: product.categories?.slug || '',
      tags: product.tags || [],
      legalNote: product.legal_note || '',
      popular: product.is_popular || false,
      countries: product.countries || undefined,
      services: product.services || undefined,
    });
    toast.success(`${product.name} добавлен в корзину`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const categoryIcon = product.categories?.icon || '📦';
  const isOutOfStock = stockCount === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group h-full"
    >
      <Link to={`/product/${product.id}`} className="block h-full">
        <div className={`h-full p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/8 hover:border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col ${isOutOfStock ? 'opacity-50' : ''}`}>
          {/* Product Image/Icon Area */}
          <div className="relative aspect-square md:aspect-[4/3] rounded-lg md:rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-2 md:mb-4 overflow-hidden">
            {product.media_urls && product.media_urls.length > 0 ? (
              /\.(mp4|webm|mov)$/i.test(product.media_urls[0]) ? (
                <video src={product.media_urls[0]} className="w-full h-full object-cover" muted />
              ) : (
                <img src={product.media_urls[0]} alt={product.name} className="w-full h-full object-cover" />
              )
            ) : (
              <span className="text-4xl md:text-7xl opacity-60 group-hover:scale-110 transition-transform duration-300">
                {categoryIcon}
              </span>
            )}
            
            {/* Quick Add Button - appears on hover */}
            {!isOutOfStock && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1 }}
                className={`absolute top-2 right-2 md:top-3 md:right-3 transition-opacity ${isInCart || justAdded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Button
                  size="icon"
                  variant={isInCart || justAdded ? "default" : "secondary"}
                  className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow-lg"
                  onClick={handleAddToCart}
                >
                  {isInCart || justAdded ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : <Plus className="h-4 w-4 md:h-5 md:w-5" />}
                </Button>
              </motion.div>
            )}

            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Badge variant="secondary" className="gap-1">
                  <PackageX className="h-3 w-3" />
                  Нет в наличии
                </Badge>
              </div>
            )}

            {/* Type badge */}
            {product.type === 'subscription' && (
              <div className="absolute top-2 left-2 md:top-3 md:left-3 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md bg-foreground text-background text-[10px] md:text-xs font-medium">
                Подписка
              </div>
            )}

            {/* Popular badge */}
            {product.is_popular && !isOutOfStock && (
              <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
                <Badge variant="default" className="text-[10px] md:text-xs">
                  Популярное
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Title */}
            <h3 className="font-bold text-sm md:text-lg leading-tight mb-0.5 md:mb-1 group-hover:text-foreground transition-colors line-clamp-2">
              {product.name}
            </h3>
            
            {/* Description - hidden on mobile to save space */}
            <p className="hidden md:block text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
              {product.short_desc}
            </p>

            {/* Stock indicator */}
            {!isOutOfStock && stockCount > 0 && stockCount <= 5 && (
              <p className="text-xs text-warning mb-1">
                Осталось: {stockCount} шт
              </p>
            )}
            {stockCount === -1 && (
              <p className="text-xs text-success mb-1">
                ∞ В наличии
              </p>
            )}

            {/* Price - aligned to bottom */}
            <div className="flex items-end justify-between mt-auto pt-1 md:pt-0">
              <div>
                <span className="text-base md:text-2xl font-bold">
                  {product.price.toLocaleString('ru-RU')}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground ml-0.5">₽</span>
                {product.type === 'subscription' && (
                  <span className="text-[10px] md:text-xs text-muted-foreground">/мес</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// Compact card for horizontal lists
export const ProductCardCompact = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const { data: stockCount = 0 } = useProductStock(product.id);
  
  const isOutOfStock = stockCount === 0;
  const categoryIcon = product.categories?.icon || '📦';

  return (
    <Link to={`/product/${product.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`group flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md transition-all ${isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Mini icon */}
        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{categoryIcon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{product.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{product.short_desc}</p>
          {isOutOfStock && (
            <p className="text-xs text-destructive">Нет в наличии</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-sm whitespace-nowrap">
            {product.price.toLocaleString('ru-RU')} ₽
          </span>
          {!isOutOfStock && (
            <Button 
              size="icon" 
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => {
                e.preventDefault();
                addItem({
                  id: product.id,
                  name: product.name,
                  shortDesc: product.short_desc || '',
                  longDesc: product.long_desc || '',
                  price: product.price,
                  type: product.type || 'one-time',
                  category: product.categories?.slug || '',
                  tags: product.tags || [],
                  legalNote: product.legal_note || '',
                  popular: product.is_popular || false,
                });
              }}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </Link>
  );
};
