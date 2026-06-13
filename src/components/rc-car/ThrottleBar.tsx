import React, { useRef, useCallback, memo } from 'react';
import { motion } from 'motion/react';
import FireEffect from './FireEffect';

interface ThrottleBarProps {
  limit: number;
  actualThrottle: number;
  onChange: (val: number) => void;
  size?: number;
}

const ThrottleBar = memo(({ limit, actualThrottle, onChange, size = 300 }: ThrottleBarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouch = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Calculate percentage from bottom
    const relativeY = clientY - rect.top;
    const percentage = 100 - Math.max(0, Math.min(100, (relativeY / rect.height) * 100));
    
    onChange(Math.round(percentage));
  }, [onChange]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center">
        <span className="text-[8px] uppercase tracking-[0.2em] text-white/20 font-bold">Speed Limiter</span>
        <div className="h-2" />
      </div>
      <div 
        ref={containerRef}
        onMouseDown={handleTouch}
        onMouseMove={(e) => e.buttons === 1 && handleTouch(e)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        className="relative w-14 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 p-1 flex flex-col-reverse overflow-hidden cursor-pointer throttle-track"
        style={{ height: size }}
      >
        {/* Fire Effect Layer - Reacts to actual throttle */}
        <div className="absolute inset-0 z-0">
           <FireEffect throttle={actualThrottle} />
        </div>

        {/* Slider Track Background Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none flex flex-col justify-between p-4 z-10">
          {[...Array(11)].map((_, i) => (
            <div key={i} className="w-full border-t border-white" />
          ))}
        </div>

        <motion.div 
          className="w-full rounded-full throttle-fill neon-glow-cyan z-20"
          style={{ height: `${limit}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        />

        {/* Percentage Label */}
        <div className="absolute top-4 left-0 w-full text-center pointer-events-none z-30">
          <span className="text-sm font-mono font-black text-white neon-text-glow-cyan">{limit}%</span>
        </div>
      </div>
    </div>
  );
});

ThrottleBar.displayName = 'ThrottleBar';
export default ThrottleBar;
