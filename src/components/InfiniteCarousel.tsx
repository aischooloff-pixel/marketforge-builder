import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InfiniteCarouselProps {
  products: any[];
}

export const InfiniteCarousel = ({ products }: InfiniteCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Triple the items for seamless loop
  const items = [...products, ...products, ...products];
  const singleSetWidth = useRef(0);

  const resetToMiddle = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !singleSetWidth.current) return;
    // Jump to middle set without animation
    const currentScroll = el.scrollLeft;
    if (currentScroll >= singleSetWidth.current * 2) {
      el.scrollLeft = currentScroll - singleSetWidth.current;
    } else if (currentScroll <= 0) {
      el.scrollLeft = currentScroll + singleSetWidth.current;
    }
  }, []);

  // Calculate single set width
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Each card is ~320px + 16px gap on desktop, ~85vw + 12px on mobile
    const totalWidth = el.scrollWidth / 3;
    singleSetWidth.current = totalWidth;
    // Start from middle set
    el.scrollLeft = totalWidth;
  }, [products]);

  // Auto-scroll
  useEffect(() => {
    if (isPaused || products.length === 0) return;

    intervalRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({ left: 1, behavior: 'auto' });
      resetToMiddle();
    }, 20);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, products.length, resetToMiddle]);

  const scrollByAmount = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    setTimeout(resetToMiddle, 500);
  };

  if (products.length === 0) return null;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        setTimeout(() => {
          setIsPaused(false);
          resetToMiddle();
        }, 3000);
      }}
    >
      {/* Navigation arrows - desktop */}
      <div className="hidden md:block">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 rounded-full h-10 w-10 bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={() => scrollByAmount(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 rounded-full h-10 w-10 bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={() => scrollByAmount(1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-background to-transparent z-[1]" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-background to-transparent z-[1]" />

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4"
        style={{ scrollBehavior: 'auto' }}
      >
        {items.map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            className="w-[75vw] md:w-[300px] lg:w-[320px] flex-shrink-0"
          >
            <ProductCard product={product} index={index % products.length} />
          </div>
        ))}
      </div>
    </div>
  );
};
