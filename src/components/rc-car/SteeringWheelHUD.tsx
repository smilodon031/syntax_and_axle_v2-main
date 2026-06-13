import React, { memo } from 'react';
import { motion } from 'motion/react';

interface SteeringWheelHUDProps {
  steering: number;
}

const SteeringWheelHUD = memo(({ steering }: SteeringWheelHUDProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Semi-circle steering gauge */}
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-2 border-white/5" />
        <motion.div 
          className="absolute top-0 left-0 w-32 h-32 rounded-full border-t-2 border-neon-cyan neon-glow-cyan"
          animate={{ rotate: steering * 0.45 }}
          style={{ transformOrigin: 'center center' }}
        />
        
        {/* Center Marker */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-4 bg-neon-cyan/40" />
      </div>
      <div className="flex justify-between w-32 px-1">
        <span className="text-[8px] font-mono text-white/20">L</span>
        <span className="text-[10px] font-mono text-neon-cyan">{Math.round(steering)}°</span>
        <span className="text-[8px] font-mono text-white/20">R</span>
      </div>
    </div>
  );
});

SteeringWheelHUD.displayName = 'SteeringWheelHUD';
export default SteeringWheelHUD;
