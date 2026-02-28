import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";
import { useProductStock } from "@/hooks/useProducts";

const FREE_PRODUCT_TAGS = ["free:tg-shop", "free:invite-script", "free:chat-spam"];

/* ——— mini card (no price, no cart button) ——— */
const FreeCard = ({
  product,
  selected,
  onClick,
}: {
  product: Product;
  selected: boolean;
  onClick: () => void;
}) => {
  const { data: stockCount = 0 } = useProductStock(product.id);
  const categoryIcon = (product as any).categories?.icon || "📦";
  const isOut = stockCount === 0;

  return (
    <div
      onClick={isOut ? undefined : onClick}
      className={`win95-window flex-shrink-0 w-[220px] md:w-[260px] h-[280px] md:h-[320px] flex flex-col cursor-pointer transition-all select-none
        ${selected ? "ring-2 ring-primary" : ""}
        ${isOut ? "opacity-40 cursor-not-allowed" : "hover-lift"}`}
    >
      <div className="win95-titlebar px-2 py-1 gap-1.5">
        <span className="text-[9px] md:text-[10px] truncate flex-1">
          {(product as any).categories?.name || "Бесплатно"}
        </span>
        <span className="text-[10px] text-warning-foreground">🎁 FREE</span>
      </div>

      <div className="w-full aspect-[4/3] bevel-sunken bg-background flex items-center justify-center overflow-hidden">
        {product.icon_url ? (
          <img src={product.icon_url} alt={product.name} className="w-full h-full object-cover" />
        ) : product.media_urls && product.media_urls.length > 0 ? (
          <img src={product.media_urls[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl md:text-5xl">{categoryIcon}</span>
        )}
      </div>

      <div className="p-2.5 md:p-3 bg-card flex-1 flex flex-col">
        <h3 className="text-sm md:text-base font-bold leading-tight line-clamp-2 mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{product.short_desc || "—"}</p>

        {isOut && (
          <div className="text-[10px] text-destructive font-bold mt-2">✕ Раскупили</div>
        )}
      </div>
    </div>
  );
};

/* ——— main section ——— */
export const FreeProductsSection = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load products and check if user already claimed
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(*)")
        .eq("is_active", true)
        .overlaps("tags", FREE_PRODUCT_TAGS);

      if (data && data.length > 0) {
        setProducts(data as unknown as Product[]);
      }

      // Check if current user already claimed any free product
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_id", tgUser.id)
          .maybeSingle();

        if (profile) {
          const { data: claims } = await supabase
            .from("free_claims")
            .select("id")
            .eq("user_id", profile.id)
            .limit(1);

          setAlreadyClaimed(claims !== null && claims.length > 0);
        } else {
          setAlreadyClaimed(false);
        }
      } else {
        setAlreadyClaimed(false);
      }
    };
    load();
  }, []);

  // scroll selected card into view
  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const cards = scrollRef.current.children;
    if (cards[selectedIdx]) {
      (cards[selectedIdx] as HTMLElement).scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedIdx, open]);

  const handleClaim = async () => {
    const product = products[selectedIdx];
    if (!product) return;

    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) {
      toast({ title: "Ошибка", description: "Откройте через Telegram", variant: "destructive" });
      return;
    }

    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-free-product", {
        body: { telegram_id: tgUser.id, product_id: product.id },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error === "already_claimed") {
          setOpen(false);
          setAlreadyClaimed(true);
          return;
        }
        const msgs: Record<string, string> = {
          not_subscribed: "Сначала подпишись на канал проекта",
          out_of_stock: "Товар закончился",
          check_failed: "Не удалось проверить подписку, попробуй позже",
        };
        toast({
          title: data.error === "not_subscribed" ? "Подпишись на канал" : "Не получилось",
          description: msgs[data.error] || data.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({ title: "🎉 Товар отправлен!", description: "Проверь личные сообщения бота" });
        setOpen(false);
        setAlreadyClaimed(true); // hide section
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message || "Попробуй позже", variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  // Don't render if no products, still loading claim status, or already claimed
  if (products.length === 0 || alreadyClaimed === null || alreadyClaimed) return null;

  return (
    <>
      {/* Hero-like banner on Index */}
      <section className="py-6 md:py-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              🎁 Бесплатные инструменты
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Подпишись на канал и забери один из инструментов — бесплатно
            </p>
            <Button
              size="lg"
              className="gap-2 text-sm md:text-base px-8 h-11 md:h-12"
              onClick={() => setOpen(true)}
            >
              🎁 Забрать бесплатно
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Modal / overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            {/* close btn */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 bevel-raised bg-card px-2 py-0.5 text-xs font-bold hover:bg-secondary"
            >
              ✕
            </button>

            <h3 className="text-lg md:text-xl font-bold mb-1">Выбери товар</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Листай ← → и нажми «Выбрать» (можно забрать только 1 раз)
            </p>

            {/* scrollable cards */}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-4 px-4 max-w-full scrollbar-hide snap-x snap-mandatory"
            >
              {products.map((p, i) => (
                <div key={p.id} className="snap-center">
                  <FreeCard
                    product={p}
                    selected={selectedIdx === i}
                    onClick={() => setSelectedIdx(i)}
                  />
                </div>
              ))}
            </div>

            {/* dots */}
            <div className="flex gap-1.5 my-3">
              {products.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-2 h-2 transition-colors ${
                    selectedIdx === i ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* action */}
            <Button
              size="lg"
              className="gap-2 px-10 h-11"
              disabled={claiming}
              onClick={handleClaim}
            >
              {claiming ? "Отправляю..." : "Выбрать"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
