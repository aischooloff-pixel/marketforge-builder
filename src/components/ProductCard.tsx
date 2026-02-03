import { Product } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  index?: number;
}

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
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={`/product/${product.id}`}>
        <div className="h-full p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <Badge 
              variant={product.type === 'subscription' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {product.type === 'subscription' ? 'Подписка' : 'Разовый'}
            </Badge>
            {product.popular && (
              <Badge variant="outline" className="text-xs border-foreground/20">
                Популярное
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 group-hover:text-foreground transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {product.shortDesc}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {product.tags.slice(0, 3).map(tag => (
                <span 
                  key={tag} 
                  className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <span className="text-2xl font-bold">
                {product.price.toLocaleString('ru-RU')}
              </span>
              <span className="text-sm text-muted-foreground ml-1">₽</span>
              {product.type === 'subscription' && (
                <span className="text-xs text-muted-foreground">/мес</span>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={handleAddToCart}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">В корзину</span>
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export const ProductCardCompact = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();

  return (
    <Link to={`/product/${product.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all"
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{product.name}</h4>
          <p className="text-sm text-muted-foreground truncate">{product.shortDesc}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold whitespace-nowrap">
            {product.price.toLocaleString('ru-RU')} ₽
          </span>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              addItem(product);
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </Link>
  );
};
