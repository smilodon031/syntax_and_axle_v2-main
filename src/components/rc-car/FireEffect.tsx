import React, { memo, useMemo } from 'react';

interface FireEffectProps {
  throttle: number;
}

const MAX_PARTICLES = 40;

const FireEffect = memo(({ throttle }: FireEffectProps) => {
  const intensity = Math.abs(throttle);
  
  // Generate stable particle properties once
  const particles = useMemo(() => {
    return Array.from({ length: MAX_PARTICLES }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      width: Math.random() * 40 + 10,
      height: Math.random() * 40 + 10,
      duration: Math.random() * 0.4 + 0.2,
      delay: Math.random() * 0.5,
    }));
  }, []);

  // Calculate how many particles to show based on intensity
  const activeCount = Math.floor((intensity / 100) * MAX_PARTICLES);
  
  const isReverse = throttle < 0;
  const color1 = isReverse ? '#00008b' : '#00bfff'; // DarkBlue for reverse, DeepSkyBlue for forward
  const color2 = isReverse ? '#4169e1' : '#e0ffff'; // RoyalBlue for reverse, LightCyan for forward

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={p.id}
          className="flame-particle"
          style={{
            display: i < activeCount ? 'block' : 'none',
            left: `${p.left}%`,
            bottom: '-20px',
            width: `${p.width}px`,
            height: `${p.height}px`,
            '--duration': `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: (intensity / 100) * 0.5,
            background: `linear-gradient(to top, ${color1}, ${color2}, #ffffff, transparent)`,
            filter: 'blur(8px)',
          } as any}
        />
      ))}
    </div>
  );
});

FireEffect.displayName = 'FireEffect';
export default FireEffect;
