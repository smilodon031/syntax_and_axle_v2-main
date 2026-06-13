import React, { useRef, useCallback, memo, useState, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';

interface GearSelectorProps {
  onChange: (direction: number) => void;
  disabled?: boolean;
  size?: number;
}

const GearSelector = memo(({ onChange, disabled, size = 300 }: GearSelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const [direction, setDirection] = useState(0); // -1, 0, 1

  const trackHeight = size - 40;
  const step = trackHeight / 2;

  const updateDirection = useCallback((val: number) => {
    let newDir = 0;
    if (val < -step / 2) newDir = 1; // Top is forward (negative Y in motion)
    else if (val > step / 2) newDir = -1; // Bottom is reverse
    else newDir = 0;

    if (newDir !== direction) {
      setDirection(newDir);
      onChange(newDir);
    }
    return newDir;
  }, [direction, onChange, step]);

  const handleDrag = useCallback((_event: any, info: any) => {
    if (disabled) return;
    
    const nextY = Math.max(-step, Math.min(step, info.offset.y));
    y.set(nextY);
    updateDirection(nextY);
  }, [disabled, step, updateDirection, y]);

  const handleDragEnd = useCallback(() => {
    const currentY = y.get();
    let targetY = 0;
    if (currentY < -step / 2) targetY = -step;
    else if (currentY > step / 2) targetY = step;
    else targetY = 0;

    animate(y, targetY, { type: 'spring', stiffness: 400, damping: 30 });
    updateDirection(targetY);
  }, [step, updateDirection, y]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center">
        <span className="text-[8px] font-bold text-neon-cyan uppercase tracking-widest mb-1">Drive Mode</span>
        <div className="flex gap-3 text-[9px] font-mono font-bold">
          <span className={direction === 1 ? 'text-neon-cyan neon-text-glow' : 'text-white/20'}>FWD</span>
          <span className={direction === 0 ? 'text-white neon-text-glow' : 'text-white/20'}>NEU</span>
          <span className={direction === -1 ? 'text-blue-600 neon-text-glow' : 'text-white/20'}>REV</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative bg-black/40 backdrop-blur-sm rounded-full border border-white/10 flex items-center justify-center"
        style={{ width: 70, height: size }}
      >
        {/* Track */}
        <div className="absolute inset-y-6 w-1 bg-white/5 rounded-full" />
        
        {/* Snap Points */}
        <div className="absolute inset-y-6 flex flex-col justify-between items-center pointer-events-none">
          <div className="w-3 h-[1px] bg-white/20" />
          <div className="w-5 h-[1px] bg-white/40" />
          <div className="w-3 h-[1px] bg-white/20" />
        </div>

        {/* Lever Handle */}
        <motion.div
          drag="y"
          dragConstraints={{ top: -step, bottom: step }}
          dragElastic={0.05}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 0.95, brightness: 1.2 }}
          style={{ y }}
          className={`z-10 w-14 h-16 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 shadow-2xl cursor-grab active:cursor-grabbing flex flex-col items-center justify-center gap-0.5 ${disabled ? 'opacity-50 grayscale' : ''}`}
        >
          {/* Grip Lines */}
          <div className="w-6 h-0.5 bg-white/10 rounded-full" />
          <div className="w-6 h-0.5 bg-white/10 rounded-full" />
          <div className="w-6 h-0.5 bg-white/10 rounded-full" />
          
          {/* Status Light */}
          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            direction === 1 ? 'bg-neon-cyan shadow-[0_0_10px_#00f3ff]' : 
            direction === -1 ? 'bg-blue-700 shadow-[0_0_10px_#0000ff]' : 
            'bg-white/20'
          }`} />
        </motion.div>
      </div>
    </div>
  );
});

GearSelector.displayName = 'GearSelector';
export default GearSelector;
