import { Product, categories } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  index?: number;
}

// Get category icon for product
const getCategoryIcon = (categoryId: string) => {
  const category = categories.find(c => c.id === categoryId);
  return category?.icon || '📦';
};

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group h-full"
    >
      <Link to={`/product/${product.id}`} className="block h-full">
        <div className="h-full p-4 rounded-2xl border bg-card shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
          {/* Product Image/Icon Area */}
          <div className="relative aspect-[4/3] rounded-xl bg-secondary/80 flex items-center justify-center mb-4 overflow-hidden">
            {/* Category Icon as placeholder */}
            <span className="text-6xl md:text-7xl opacity-60 group-hover:scale-110 transition-transform duration-300">
              {getCategoryIcon(product.category)}
            </span>
            
            {/* Quick Add Button - appears on hover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1 }}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button
                size="icon"
                variant="secondary"
                className="h-10 w-10 rounded-full shadow-lg bg-background/90 backdrop-blur-sm hover:bg-background"
                onClick={handleAddToCart}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Type badge */}
            {product.type === 'subscription' && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-foreground text-background text-xs font-medium">
                Подписка
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            {/* Title */}
            <h3 className="font-bold text-base md:text-lg leading-tight mb-1 group-hover:text-foreground transition-colors line-clamp-2">
              {product.name}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
              {product.shortDesc}
            </p>

            {/* Price - aligned to bottom right */}
            <div className="flex items-end justify-end">
              <div className="text-right">
                <span className="text-xl md:text-2xl font-bold">
                  {product.price.toLocaleString('ru-RU')}
                </span>
                <span className="text-sm text-muted-foreground ml-1">₽</span>
                {product.type === 'subscription' && (
                  <span className="text-xs text-muted-foreground">/мес</span>
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

  return (
    <Link to={`/product/${product.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="group flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md transition-all"
      >
        {/* Mini icon */}
        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{getCategoryIcon(product.category)}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{product.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{product.shortDesc}</p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-sm whitespace-nowrap">
            {product.price.toLocaleString('ru-RU')} ₽
          </span>
          <Button 
            size="icon" 
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              addItem(product);
            }}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </Link>
  );
};
