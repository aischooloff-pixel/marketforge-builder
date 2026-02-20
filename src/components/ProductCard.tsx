import { Product } from '@/hooks/useProducts';
import { useProductStock } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <div
      className="group h-full"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link to={`/product/${product.id}`} className="block h-full">
        {/* Win95 Window chrome */}
        <div className={`h-full flex flex-col bg-background ${isOutOfStock ? 'opacity-60' : ''}`}
          style={{
            boxShadow: 'inset -1px -1px 0px #000000, inset 1px 1px 0px #FFFFFF, inset -2px -2px 0px #808080, inset 2px 2px 0px #DFDFDF'
          }}
        >
          {/* Win95 title bar */}
          <div className="win95-titlebar flex items-center justify-between px-1 py-0.5 flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-[10px]">{categoryIcon}</span>
              <span className="text-white text-[10px] font-bold truncate max-w-[120px]">{product.name}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="win95-titlebar-btn text-[8px]">_</div>
              <div className="win95-titlebar-btn text-[8px]">□</div>
              <div className="win95-titlebar-btn text-[8px] font-bold">✕</div>
            </div>
          </div>

          {/* Product Image Area */}
          <div className="relative aspect-square md:aspect-[4/3] flex items-center justify-center overflow-hidden mx-2 mt-2"
            style={{
              boxShadow: 'inset 1px 1px 0px #000000, inset -1px -1px 0px #FFFFFF, inset 2px 2px 0px #808080, inset -2px -2px 0px #DFDFDF',
              background: '#FFFFFF'
            }}
          >
            {product.media_urls && product.media_urls.length > 0 ? (
              /\.(mp4|webm|mov)$/i.test(product.media_urls[0]) ? (
                <video src={product.media_urls[0]} className="w-full h-full object-cover" muted />
              ) : (
                <img src={product.media_urls[0]} alt={product.name} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              )
            ) : (
              <span className="text-5xl md:text-7xl">
                {categoryIcon}
              </span>
            )}
            
            {/* Quick Add Button */}
            {!isOutOfStock && (
              <div className={`absolute top-1 right-1 transition-opacity ${isInCart || justAdded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <Button
                  size="icon"
                  variant={isInCart || justAdded ? "win95primary" : "default"}
                  className="h-7 w-7 text-[10px]"
                  onClick={handleAddToCart}
                >
                  {isInCart || justAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </Button>
              </div>
            )}

            {/* Out of stock overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <PackageX className="h-3 w-3" />
                  Нет в наличии
                </Badge>
              </div>
            )}

            {/* Type badge */}
            {product.type === 'subscription' && (
              <div className="absolute top-1 left-1 bg-primary text-white text-[9px] px-1 py-0">
                Подписка
              </div>
            )}

            {/* Popular badge */}
            {product.is_popular && !isOutOfStock && (
              <div className="absolute bottom-1 left-1 bg-primary text-white text-[9px] px-1">
                ★ Популярное
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col p-2 min-h-0">
            <h3 className="font-bold text-xs md:text-sm leading-tight mb-1 line-clamp-2">
              {product.name}
            </h3>
            
            <p className="hidden md:block text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">
              {product.short_desc}
            </p>

            {/* Stock indicator */}
            {!isOutOfStock && stockCount > 0 && stockCount <= 5 && (
              <p className="text-[10px] text-warning mb-1">⚠ Осталось: {stockCount} шт</p>
            )}
            {stockCount === -1 && (
              <p className="text-[10px] text-success mb-1">✓ В наличии</p>
            )}

            {/* Price + Add button */}
            <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/50 gap-1">
              <div>
                <span className="text-sm md:text-base font-bold">
                  {product.price.toLocaleString('ru-RU')}
                </span>
                <span className="text-xs text-muted-foreground ml-0.5">₽</span>
              </div>
              {!isOutOfStock && (
                <Button
                  size="sm"
                  variant="default"
                  className="text-[10px] h-6 px-2 gap-1"
                  onClick={handleAddToCart}
                >
                  {isInCart || justAdded ? (
                    <><Check className="h-3 w-3" /> OK</>
                  ) : (
                    <><Plus className="h-3 w-3" /> Купить</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
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
      <div
        className={`group flex items-center gap-2 p-2 bg-background ${isOutOfStock ? 'opacity-60' : ''}`}
        style={{
          boxShadow: 'inset -1px -1px 0px #000000, inset 1px 1px 0px #FFFFFF, inset -2px -2px 0px #808080, inset 2px 2px 0px #DFDFDF'
        }}
      >
        {/* Mini icon */}
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-2xl bg-white"
          style={{
            boxShadow: 'inset 1px 1px 0px #000000, inset -1px -1px 0px #FFFFFF, inset 2px 2px 0px #808080, inset -2px -2px 0px #DFDFDF'
          }}
        >
          <span>{categoryIcon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-xs truncate">{product.name}</h4>
          <p className="text-[10px] text-muted-foreground truncate">{product.short_desc}</p>
          {isOutOfStock && (
            <p className="text-[10px] text-destructive">Нет в наличии</p>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="font-bold text-xs whitespace-nowrap">
            {product.price.toLocaleString('ru-RU')} ₽
          </span>
          {!isOutOfStock && (
            <Button 
              size="icon" 
              variant="default"
              className="h-7 w-7"
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
              <ShoppingCart className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
};
