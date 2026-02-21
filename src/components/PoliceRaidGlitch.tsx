import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RAID_INTERVAL_MIN = 120_000;
const RAID_INTERVAL_MAX = 300_000;
const RAID_DURATION = 2200;

export const PoliceRaidGlitch = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const scheduleRaid = () => {
      const delay = RAID_INTERVAL_MIN + Math.random() * (RAID_INTERVAL_MAX - RAID_INTERVAL_MIN);
      return setTimeout(() => {
        setActive(true);
        setTimeout(() => setActive(false), RAID_DURATION);
        timerId = scheduleRaid();
      }, delay);
    };

    let timerId = scheduleRaid();
    return () => clearTimeout(timerId);
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundColor: [
                'rgba(255,0,0,0.15)',
                'rgba(0,0,255,0.15)',
                'rgba(255,0,0,0.2)',
                'rgba(0,0,255,0.2)',
                'rgba(255,0,0,0.1)',
                'rgba(0,0,255,0.1)',
                'rgba(0,0,0,0)',
              ],
            }}
            transition={{ duration: 2, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1] }}
          />

          <motion.div
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2 }}
          />

          <motion.div
            className="relative text-center px-4"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [1.2, 1, 1, 0.95] }}
            transition={{ duration: 2, times: [0, 0.15, 0.7, 1] }}
          >
            <div
              className="font-pixel text-[10px] sm:text-xs md:text-sm tracking-widest"
              style={{
                color: '#ff3333',
                textShadow: '0 0 10px rgba(255,0,0,0.8), 0 0 20px rgba(255,0,0,0.4)',
              }}
            >
              ⚠ ВНИМАНИЕ ⚠
            </div>
            <motion.div
              className="font-pixel text-[8px] sm:text-[10px] mt-2 tracking-wider"
              style={{
                color: '#ffffff',
                textShadow: '0 0 8px rgba(255,255,255,0.6)',
              }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2, times: [0.1, 0.25, 0.65, 0.9] }}
            >
              ОБНАРУЖЕНА АКТИВНОСТЬ
            </motion.div>
            <motion.div
              className="font-pixel text-[7px] sm:text-[9px] mt-1 tracking-wide"
              style={{ color: '#aaaaaa' }}
              animate={{ opacity: [0, 0.7, 0.7, 0] }}
              transition={{ duration: 2, times: [0.2, 0.35, 0.6, 0.85] }}
            >
              СЕССИЯ ПЕРЕХВАЧЕНА...
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};