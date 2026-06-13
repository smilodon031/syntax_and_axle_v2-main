import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Wifi, Info, Cpu } from 'lucide-react';

interface SetupGuideProps {
  onBack: () => void;
}

export default function SetupGuide({ onBack }: SetupGuideProps) {
  return (
    <div className="fixed inset-0 bg-[#02040a] z-[200] flex flex-col p-8 overflow-y-auto font-sans">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-neon-cyan mb-8 hover:opacity-80 transition-opacity"
      >
        <ChevronLeft size={24} />
        <span className="font-bold uppercase tracking-widest">Back to Cockpit</span>
      </button>

      <div className="max-w-2xl mx-auto w-full space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Hardware <span className="text-neon-cyan">Configuration</span>
          </h1>
          <p className="text-white/40 max-w-md mx-auto">Follow these steps to link your mobile cockpit to the ESP32 vehicle core.</p>
        </header>

        <div className="grid gap-6">
          <Step 
            number="01" 
            title="Power Up" 
            icon={<Cpu className="text-neon-cyan" />}
            description="Connect your Li-ion battery to the ESP32 and ESC. Ensure the status LED is blinking."
          />
          <Step 
            number="02" 
            title="WiFi Link" 
            icon={<Wifi className="text-neon-cyan" />}
            description="Open your phone's WiFi settings and connect to the 'NeonRC_Car' access point."
          />
          <Step 
            number="03" 
            title="Cockpit Sync" 
            icon={<Info className="text-neon-cyan" />}
            description="Return to this app. If the status shows 'Connected', your neural link is established."
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="font-bold text-neon-cyan uppercase tracking-widest flex items-center gap-2">
            <Info size={18} />
            Pro Tip
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            If you experience lag, ensure you are within 10 meters of the vehicle. For maximum performance, use 'Sport Mode' only in open areas.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, icon, description }: any) {
  return (
    <div className="flex gap-6 items-start bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
      <div className="text-3xl font-black text-white/10 italic">{number}</div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-bold text-white uppercase tracking-widest">{title}</h3>
        </div>
        <p className="text-sm text-white/40 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
