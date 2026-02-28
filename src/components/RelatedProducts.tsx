import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';

interface RelatedProductsProps {
  categoryId: string;
  currentProductId: string;
}

export const RelatedProducts = ({ categoryId, currentProductId }: RelatedProductsProps) => {
  const { data: products } = useQuery({
    queryKey: ['related-products', categoryId, currentProductId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, slug, icon, cashback_percent)')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .neq('id', currentProductId)
        .order('is_popular', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  if (!products || products.length === 0) return null;

  return (
    <div className="win95-window mt-4">
      <div className="win95-titlebar px-2 py-1">
        <span className="text-[9px] md:text-[11px]">🛒 С этим покупают</span>
      </div>
      <div className="p-2 md:p-4">
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {products.map((p) => (
            <div key={p.id} className="min-w-[160px] max-w-[200px] flex-shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
