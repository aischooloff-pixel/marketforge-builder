import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'ziplock_gift_claimed';
const GIFT_CODE = 'WELCOME10';

const PixelZiplock = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
    <rect x="3" y="1" width="10" height="2" fill="hsl(0,0%,70%)" />
    <rect x="2" y="3" width="12" height="1" fill="hsl(220,60%,50%)" />
    <rect x="2" y="4" width="12" height="1" fill="hsl(220,50%,40%)" />
    <rect x="2" y="5" width="12" height="9" fill="hsl(0,0%,90%)" opacity="0.6" />
    <rect x="2" y="5" width="1" height="9" fill="hsl(0,0%,60%)" />
    <rect x="13" y="5" width="1" height="9" fill="hsl(0,0%,60%)" />
    <rect x="2" y="14" width="12" height="1" fill="hsl(0,0%,60%)" />
    <rect x="5" y="7" width="2" height="2" fill="hsl(120,60%,35%)" />
    <rect x="8" y="8" width="3" height="2" fill="hsl(120,50%,30%)" />
    <rect x="6" y="9" width="2" height="2" fill="hsl(120,70%,40%)" />
    <rect x="9" y="10" width="2" height="2" fill="hsl(120,55%,32%)" />
    <rect x="4" y="10" width="2" height="1" fill="hsl(120,65%,38%)" />
    <rect x="7" y="11" width="1" height="1" fill="hsl(120,60%,42%)" />
    <rect x="7" y="7" width="1" height="1" fill="hsl(100,50%,45%)" />
    <rect x="10" y="7" width="1" height="1" fill="hsl(100,50%,45%)" />
    <rect x="5" y="12" width="1" height="1" fill="hsl(100,50%,45%)" />
  </svg>
);

export const FloatingZiplock = () => {
  const [claimed, setClaimed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [showGift, setShowGift] = useState(false);
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const animRef = useRef<number>();
  const posRef = useRef({ x: 100, y: 200 });
  const velRef = useRef({ vx: 1.5 + Math.random(), vy: 1 + Math.random() });

  useEffect(() => {
    if (claimed) return;

    const animate = () => {
      const pos = posRef.current;
      const vel = velRef.current;

      pos.x += vel.vx;
      pos.y += vel.vy;

      const maxX = window.innerWidth - 56;
      const maxY = window.innerHeight - 56;

      if (pos.x <= 0 || pos.x >= maxX) {
        vel.vx *= -1;
        pos.x = Math.max(0, Math.min(pos.x, maxX));
      }
      if (pos.y <= 60 || pos.y >= maxY) {
        vel.vy *= -1;
        pos.y = Math.max(60, Math.min(pos.y, maxY));
      }

      setPosition({ x: pos.x, y: pos.y });
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [claimed]);

  const handleClick = () => {
    setShowGift(true);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const handleClaim = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setClaimed(true);
    setShowGift(false);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(GIFT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (claimed) return null;

  return (
    <>
      {!showGift && (
        <motion.button
          className="fixed z-[100] cursor-pointer hover:scale-110 transition-transform drop-shadow-lg"
          style={{
            left: position.x,
            top: position.y,
            willChange: 'left, top',
          }}
          onClick={handleClick}
          whileTap={{ scale: 0.9 }}
          title="Нажми меня!"
        >
          <div className="relative">
            <PixelZiplock size={48} />
            <motion.div
              className="absolute -top-1 -right-1 text-warning text-xs"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ✦
            </motion.div>
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {showGift && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowGift(false)} />

            <motion.div
              className="relative win95-window w-full max-w-xs sm:max-w-sm"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="win95-titlebar justify-between">
                <span>🎁 gift.exe</span>
                <button
                  onClick={() => setShowGift(false)}
                  className="bevel-raised bg-card text-foreground h-4 w-4 flex items-center justify-center text-[8px] leading-none active:bevel-sunken"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 flex flex-col items-center gap-3 sm:gap-4 bg-card">
                <div className="flex justify-center">
                  <PixelZiplock size={64} />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="font-pixel text-[11px] sm:text-xs text-primary leading-relaxed">
                    ПОДАРОК ДЛЯ НОВИЧКА!
                  </h3>
                  <p className="text-sm sm:text-base text-foreground">
                    Скидка <span className="text-primary font-bold">10%</span> на любой заказ!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Действует 24 часа с момента активации
                  </p>
                </div>

                <div className="bevel-sunken bg-background px-4 py-2 w-full text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Промокод:</span>
                  <span className="font-pixel text-sm sm:text-base text-primary tracking-widest">{GIFT_CODE}</span>
                </div>

                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleCopy}
                    className="flex-1 bevel-raised bg-card px-3 py-2 text-xs sm:text-sm font-bold active:bevel-sunken hover:bg-secondary transition-colors"
                  >
                    {copied ? '✓ Скопировано' : '📋 Копировать'}
                  </button>
                  <button
                    onClick={handleClaim}
                    className="flex-1 bevel-raised bg-primary text-primary-foreground px-3 py-2 text-xs sm:text-sm font-bold active:bevel-sunken"
                  >
                    Забрал!
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground/60 text-center">
                  Введи код при оформлении заказа в корзине
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};