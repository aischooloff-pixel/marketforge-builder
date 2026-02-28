import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PxStar } from "@/components/PixelIcons";
import { useToast } from "@/hooks/use-toast";

interface FreeProduct {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

const FREE_PRODUCT_TAGS = ["free:tg-shop", "free:invite-script", "free:chat-spam"];

const FALLBACK_ITEMS: FreeProduct[] = [
  { id: "", name: "Готовый ТГ магазин (бот)", icon: "🤖", desc: "Полностью готовый Telegram-бот магазин" },
  { id: "", name: "Скрипт инвайтинга", icon: "📨", desc: "Автоматический инвайтинг в группы" },
  { id: "", name: "Скрипт рассылки по чатам", icon: "📢", desc: "Массовая рассылка сообщений" },
];

export const FreeProductsSection = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<FreeProduct[]>(FALLBACK_ITEMS);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, icon_url, short_desc, tags")
        .eq("is_active", true)
        .overlaps("tags", FREE_PRODUCT_TAGS);

      if (data && data.length > 0) {
        setProducts(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            icon: p.icon_url || "🎁",
            desc: p.short_desc || "",
          }))
        );
      }
    };
    load();
  }, []);

  const handleClaim = async (product: FreeProduct) => {
    if (!product.id) {
      toast({ title: "Товар не настроен", description: "Обратитесь к администратору", variant: "destructive" });
      return;
    }

    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) {
      toast({ title: "Ошибка", description: "Откройте через Telegram", variant: "destructive" });
      return;
    }

    setClaiming(product.id);
    try {
      const { data, error } = await supabase.functions.invoke("claim-free-product", {
        body: { telegram_id: tgUser.id, product_id: product.id },
      });

      if (error) {
        const parsed = typeof error === "object" && "context" in error
          ? await (error as any).context?.json?.() ?? {}
          : {};
        throw new Error(parsed?.message || data?.message || "Ошибка");
      }

      if (data?.error) {
        if (data.error === "already_claimed") {
          toast({ title: "Уже получено", description: data.message });
        } else if (data.error === "not_subscribed") {
          toast({ title: "Подпишись на канал", description: "Для получения подпишись на канал проекта", variant: "destructive" });
        } else {
          toast({ title: "Ошибка", description: data.message, variant: "destructive" });
        }
        return;
      }

      setClaimed((prev) => ({ ...prev, [product.id]: data.content || data.file_url || "Готово!" }));
      toast({ title: "🎉 Товар получен!", description: "Контент ниже" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message || "Попробуй позже", variant: "destructive" });
    } finally {
      setClaiming(null);
    }
  };

  return (
    <section className="py-8 md:py-16 bg-secondary/30 criminal-pattern">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-6 md:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bevel-raised bg-card text-foreground text-xs font-medium mb-3">
            <PxStar size={16} filled />
            БЕСПЛАТНО
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1">Забери бесплатно</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Подпишись на канал и получи один из инструментов
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto">
          {products.map((product, index) => {
            const isClaimed = !!claimed[product.id];
            return (
              <motion.div
                key={product.id || index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="win95-window p-4 md:p-5 h-full flex flex-col text-center">
                  <div className="text-4xl mb-3">{product.icon}</div>
                  <h3 className="font-bold text-sm md:text-base mb-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4 flex-1">{product.desc}</p>

                  {isClaimed ? (
                    <div className="bevel-sunken bg-card p-2 font-mono text-xs break-all max-h-24 overflow-y-auto text-left">
                      <span className="text-muted-foreground select-none">&gt; </span>
                      {claimed[product.id]}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      disabled={claiming === product.id || !product.id}
                      onClick={() => handleClaim(product)}
                    >
                      {claiming === product.id ? "Получаю..." : "🎁 Забрать"}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
