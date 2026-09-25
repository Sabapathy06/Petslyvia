import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const COLORS = ['#fbbf24', '#ec4899', '#3b82f6', '#22c55e', '#a78bfa', '#f97316'];

interface ConfettiProps {
  show: boolean;
  count?: number;
}

export function Confetti({ show, count = 50 }: ConfettiProps) {
  const [pieces, setPieces] = useState<number[]>([]);

  useEffect(() => {
    if (show) {
      setPieces(Array.from({ length: count }, (_, i) => i));
      const timer = setTimeout(() => setPieces([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [show, count]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-3 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{ y: '110vh', opacity: 0, rotate: Math.random() * 720 }}
              transition={{ duration: 2 + Math.random(), ease: 'easeIn', delay: Math.random() * 0.3 }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
