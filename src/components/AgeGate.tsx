import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AGE_CONFIRMED_KEY = 'temka_age_confirmed';

export const AgeGate = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const confirmed = localStorage.getItem(AGE_CONFIRMED_KEY);
    if (!confirmed) {
      setShow(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem(AGE_CONFIRMED_KEY, 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="win95-window max-w-sm w-full"
          >
            <div className="win95-titlebar">
              <span>⚠ Подтверждение возраста</span>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bevel-sunken bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-bold mb-2">Вам исполнилось 18 лет?</h2>
              <p className="text-sm text-muted-foreground mb-1 font-mono leading-relaxed">
                Данная платформа содержит контент, предназначенный исключительно для совершеннолетних пользователей.
              </p>
              <p className="text-xs text-muted-foreground mb-6 font-mono">
                Продолжая, вы подтверждаете достижение 18 лет и принимаете{' '}
                <a href="/terms" className="text-primary hover:underline">пользовательское соглашение</a>
                {' '}и{' '}
                <a href="/privacy" className="text-primary hover:underline">политику конфиденциальности</a>.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleConfirm} className="px-8">
                  Да, мне 18+
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = 'https://google.com';
                  }}
                >
                  Нет
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};