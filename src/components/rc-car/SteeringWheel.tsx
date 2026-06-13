import React, { useRef, useCallback, memo, useState } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';

interface SteeringWheelProps {
  onChange: (steering: number) => void;
  disabled?: boolean;
  size?: number;
}

const SteeringWheel = memo(({ onChange, disabled, size = 320 }: SteeringWheelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotation = useMotionValue(0);
  const [steering, setSteering] = useState(0);

  const limit = 100; // Max rotation angle for visual
  const deadZone = 5;

  const handleDrag = useCallback((_event: any, info: any) => {
    if (disabled) return;
    
    // Calculate rotation based on horizontal drag
    // Sensitivity: 2.5 pixels per degree (increased from 1.5 for less sensitivity)
    let nextRotation = info.offset.x / 2.5;
    nextRotation = Math.max(-limit, Math.min(limit, nextRotation));
    
    rotation.set(nextRotation);
    
    // Normalize to -100 to 100
    let outSteering = (nextRotation / limit) * 100;
    if (Math.abs(outSteering) < deadZone) outSteering = 0;
    
    const finalSteering = Math.round(outSteering);
    if (finalSteering !== steering) {
      setSteering(finalSteering);
      onChange(finalSteering);
    }
  }, [disabled, steering, onChange, rotation]);

  const handleDragEnd = useCallback(() => {
    // Smoothly animate back to center
    animate(rotation, 0, { type: 'spring', stiffness: 400, damping: 30 });
    setSteering(0);
    onChange(0);
  }, [onChange, rotation]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div 
        ref={containerRef}
        className="relative rounded-full border-4 border-white/5 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        style={{ width: size, height: size }}
      >
        {/* Outer Ring Guides */}
        <div className="absolute inset-4 rounded-full border border-white/5" />
        <div className="absolute inset-12 rounded-full border border-white/5" />
        
        {/* Steering Wheel Graphic */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.05}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 0.98 }}
          style={{ rotate: rotation }}
          className={`z-10 w-[85%] h-[85%] rounded-full border-[12px] border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] cursor-grab active:cursor-grabbing flex items-center justify-center ${disabled ? 'opacity-50 grayscale' : ''}`}
        >
          {/* Minimal Spokes */}
          <div className="absolute top-1/2 left-4 right-4 h-1 bg-white/10 -translate-y-1/2" />
          
          {/* Center Cap */}
          <div className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center shadow-inner">
            <div className="w-0.5 h-4 bg-neon-cyan rounded-full neon-glow-cyan" />
          </div>

          {/* Top Marker */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-2 h-4 bg-neon-cyan rounded-b-full shadow-[0_0_15px_#00f3ff]" />
        </motion.div>
      </div>
    </div>
  );
});

SteeringWheel.displayName = 'SteeringWheel';
export default SteeringWheel;
