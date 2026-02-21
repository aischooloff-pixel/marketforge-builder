import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const CrtBootScreen = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('crt-booted')) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('crt-booted', '1');
    }, 1800);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[99999] bg-black flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)',
          }} />

          <motion.div
            className="relative"
            initial={{ scaleY: 0.003, scaleX: 0.8, opacity: 1 }}
            animate={{ scaleY: 1, scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ originY: 0.5 }}
          >
            <div className="w-screen h-screen flex items-center justify-center bg-black">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7, 1] }}
                transition={{ duration: 0.6, delay: 0.8, times: [0, 0.3, 0.6, 1] }}
                className="text-center"
              >
                <p className="font-mono text-primary text-sm md:text-base tracking-widest">
                  TEMKA.STORE SECURE BOOT v2.1
                </p>
                <motion.p
                  className="font-mono text-primary/60 text-xs mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  Connecting to secure network...
                </motion.p>
                <motion.span
                  className="inline-block w-2 h-4 bg-primary mt-3"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.15, 0] }}
            transition={{ duration: 1.8, times: [0, 0.8, 0.85, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};