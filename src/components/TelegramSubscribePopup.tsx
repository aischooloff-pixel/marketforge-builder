import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "temka_session_count";
const SUBSCRIBED_KEY = "temka_subscribed";
const SHOW_EVERY = 5;

export const TelegramSubscribePopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SUBSCRIBED_KEY)) return;

    const count = Number(localStorage.getItem(STORAGE_KEY) || "0") + 1;
    localStorage.setItem(STORAGE_KEY, String(count));

    if (count % SHOW_EVERY === 0) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleSubscribe = () => {
    localStorage.setItem(SUBSCRIBED_KEY, "1");
    window.open("https://t.me/TemkaStoreNews", "_blank");
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
      <div className="win95-window w-[340px] max-w-[92vw] animate-scale-in">
        {/* Title bar */}
        <div className="win95-titlebar justify-between">
          <span>📡 TEMKA NEWS</span>
          <span className="flex items-center gap-1 text-[9px]">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center gap-4 text-center">
          <p className="text-lg leading-relaxed">
            ✈️ Подпишись на канал —<br />
            узнавай о завозах первым
          </p>

          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <Button onClick={handleSubscribe} className="w-full bg-primary text-primary-foreground">
              Подписаться
            </Button>
            <Button variant="outline" onClick={() => setVisible(false)} className="w-full">
              Позже
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
