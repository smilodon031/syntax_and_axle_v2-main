import React, { useRef, useCallback, memo } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';

interface VirtualJoystickProps {
  onChange: (data: { throttle: number; steering: number }) => void;
  disabled?: boolean;
  size?: number;
}

const VirtualJoystick = memo(({ onChange, disabled, size = 280 }: VirtualJoystickProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const limit = size / 2.5;
  const deadZone = 5;

  const handleMove = useCallback((_event: any, info: any) => {
    if (disabled) return;
    
    // Calculate clamped position
    let nextX = info.offset.x;
    let nextY = info.offset.y;
    
    // Clamp to circular boundary
    const distance = Math.sqrt(nextX * nextX + nextY * nextY);
    if (distance > limit) {
      const angle = Math.atan2(nextY, nextX);
      nextX = Math.cos(angle) * limit;
      nextY = Math.sin(angle) * limit;
    }

    x.set(nextX);
    y.set(nextY);
    
    // Apply dead zone for the values sent to the controller
    let outX = nextX;
    let outY = nextY;
    if (Math.abs(outX) < deadZone) outX = 0;
    if (Math.abs(outY) < deadZone) outY = 0;

    // Normalize to -100 to 100
    onChange({
      steering: Math.round((outX / limit) * 100),
      throttle: Math.round((-outY / limit) * 100)
    });
  }, [disabled, limit, onChange, x, y]);

  const handleEnd = useCallback(() => {
    // Smoothly animate back to center
    animate(x, 0, { type: 'spring', stiffness: 600, damping: 35 });
    animate(y, 0, { type: 'spring', stiffness: 600, damping: 35 });
    onChange({ throttle: 0, steering: 0 });
  }, [onChange, x, y]);

  return (
    <div 
      ref={containerRef}
      className="relative rounded-full border-2 border-white/5 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      style={{ width: size, height: size }}
    >
      {/* Axis Guides */}
      <div className="absolute w-full h-[1px] bg-neon-cyan/5" />
      <div className="absolute h-full w-[1px] bg-neon-cyan/5" />
      
      {/* Decorative Rings */}
      <div className="absolute inset-12 rounded-full border border-white/5" />
      <div className="absolute inset-24 rounded-full border border-white/5" />

      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={1} // Follow finger 1:1 during drag
        onDrag={handleMove}
        onDragEnd={handleEnd}
        style={{ 
          x, 
          y,
          width: size / 3, 
          height: size / 3 
        }}
        className={`z-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue neon-glow-cyan cursor-grab active:cursor-grabbing flex items-center justify-center border border-white/20 ${disabled ? 'opacity-50 grayscale' : ''}`}
      >
        <div className="w-1/3 h-1/3 rounded-full border-2 border-white/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white/40 shadow-[0_0_15px_white]" />
        </div>
      </motion.div>
    </div>
  );
});

VirtualJoystick.displayName = 'VirtualJoystick';
export default VirtualJoystick;
