import React, { useRef, useCallback, memo, useState } from 'react';
import { motion, useMotionValue } from 'motion/react';

interface SpeedLimiterProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  size?: number;
}

const SpeedLimiter = memo(({ value, onChange, disabled, size = 300 }: SpeedLimiterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleTouch = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Calculate percentage from bottom
    const relativeY = clientY - rect.top;
    const percentage = 100 - Math.max(0, Math.min(100, (relativeY / rect.height) * 100));
    
    onChange(Math.round(percentage));
  }, [disabled, onChange]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold text-neon-cyan uppercase tracking-widest mb-1">Max Power</span>
        <span className="text-xl font-bold text-white font-mono">{value}%</span>
      </div>

      <div 
        ref={containerRef}
        onMouseDown={handleTouch}
        onMouseMove={(e) => e.buttons === 1 && handleTouch(e)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        className="relative bg-black/40 backdrop-blur-sm rounded-full border border-white/5 flex items-center justify-center cursor-pointer overflow-hidden p-1"
        style={{ width: 32, height: size }}
      >
        {/* Track Fill */}
        <div className="absolute inset-x-1 bottom-1 rounded-full bg-neon-cyan/10" style={{ height: `${value}%` }} />
        
        {/* Active Marker */}
        <motion.div 
          className="absolute left-0 right-0 h-1 bg-neon-cyan neon-glow-cyan z-10"
          animate={{ bottom: `${value}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Scale Marks */}
        <div className="absolute inset-0 flex flex-col justify-between py-8 px-2 pointer-events-none opacity-10">
          {[100, 75, 50, 25, 0].map(v => (
            <div key={v} className="w-full h-[1px] bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
});

SpeedLimiter.displayName = 'SpeedLimiter';
export default SpeedLimiter;
