import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff, Settings, Info, Activity, Edit2 } from 'lucide-react';

interface HUDOverlayProps {
  connected: boolean;
  latency: number | null;
  throttle: number;
  steering: number;
  throttleLimit: number;
  esp32Ip: string;
  editingIp: boolean;
  onEditIp: () => void;
  onIpChange: (val: string) => void;
  onIpBlur: () => void;
  onIpKey: (e: React.KeyboardEvent) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSetup: () => void;
}

const HUDOverlay = memo(({
  connected,
  latency,
  throttle,
  steering,
  throttleLimit,
  esp32Ip,
  editingIp,
  onEditIp,
  onIpChange,
  onIpBlur,
  onIpKey,
  onConnect,
  onDisconnect,
  onSetup
}: HUDOverlayProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 p-4 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex gap-6">
          {/* Connection Status */}
          <div className="flex flex-col gap-1">
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-bold">Link Status</span>
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="text-neon-cyan neon-text-glow" size={16} />
              ) : (
                <WifiOff className="text-neon-red" size={16} />
              )}
              <span className={`text-[10px] font-bold uppercase tracking-widest ${connected ? 'text-neon-cyan neon-text-glow' : 'text-neon-red'}`}>
                {connected ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Latency */}
          <div className="flex flex-col gap-1">
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-bold">Latency</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end h-3">
                {[1, 2, 3, 4].map((bar) => (
                  <div 
                    key={bar}
                    className={`w-0.5 rounded-full transition-all duration-300 ${
                      !connected ? 'bg-white/5' :
                      latency !== null && latency < (bar * 50) ? 'bg-neon-cyan shadow-[0_0_5px_#00f3ff]' : 'bg-white/10'
                    }`}
                    style={{ height: `${bar * 25}%` }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-white/60">{latency !== null ? `${latency}ms` : '--'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          {/* IP Config */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-bold">Vehicle Core IP</span>
            <div className="flex items-center gap-2 group cursor-pointer" onClick={onEditIp}>
              {editingIp ? (
                <input
                  autoFocus
                  className="bg-white/10 border border-neon-cyan/30 rounded px-2 py-0.5 text-[10px] font-mono text-neon-cyan focus:outline-none"
                  value={esp32Ip}
                  onChange={(e) => onIpChange(e.target.value)}
                  onBlur={onIpBlur}
                  onKeyDown={onIpKey}
                />
              ) : (
                <>
                  <span className="text-[10px] font-mono text-white/60">{esp32Ip}</span>
                  <Edit2 size={10} className="text-white/20 group-hover:text-neon-cyan transition-colors" />
                </>
              )}
            </div>
          </div>

          <button 
            onClick={onSetup}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Info size={18} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex justify-between items-end pointer-events-auto">
        <div className="flex gap-4">
          <button 
            onClick={connected ? onDisconnect : onConnect}
            className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
              connected 
              ? 'border-neon-red/20 text-neon-red bg-neon-red/5 hover:bg-neon-red hover:text-white' 
              : 'border-neon-cyan/20 text-neon-cyan bg-neon-cyan/5 hover:bg-neon-cyan hover:text-black'
            }`}
          >
            {connected ? 'Disconnect' : 'Connect Link'}
          </button>
        </div>
      </div>
    </div>
  );
});

HUDOverlay.displayName = 'HUDOverlay';
export default HUDOverlay;
