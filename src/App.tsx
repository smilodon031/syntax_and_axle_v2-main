/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import GearSelector from "./components/rc-car/GearSelector";
import ThrottleBar from "./components/rc-car/ThrottleBar";
import SteeringWheel from "./components/rc-car/SteeringWheel";
import SetupGuide from "./components/rc-car/SetupGuide";
import FireEffect from "./components/rc-car/FireEffect";
import HUDOverlay from "./components/rc-car/HUDOverlay";
import { Smartphone, Gauge, Compass } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [throttle, setThrottle] = useState(0);
  const [steering, setSteering] = useState(0);
  const [direction, setDirection] = useState(0); // -1, 0, 1
  const [speedLimit, setSpeedLimit] = useState(75);
  
  const directionRef = useRef(0);
  const speedLimitRef = useRef(75);

  // Sync refs with state for use in the animation loop without restarting it
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { speedLimitRef.current = speedLimit; }, [speedLimit]);

  const [esp32Ip, setEsp32Ip] = useState("192.168.4.1");
  const [showSetup, setShowSetup] = useState(false);
  const [editingIp, setEditingIp] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<any>(null);
  const lastSendRef = useRef(0);
  const smoothThrottleRef = useRef(0);
  const smoothSteeringRef = useRef(0);
  const targetThrottleRef = useRef(0);
  const targetSteeringRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(`ws://${esp32Ip}/ws`);
    ws.onopen = () => { setConnected(true); setLatency(0); };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.pong) setLatency(Date.now() - data.pong);
    };
    ws.onclose = () => {
      setConnected(false);
      setLatency(null);
      reconnectRef.current = setTimeout(connectWebSocket, 3000);
    };
    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [esp32Ip]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      wsRef.current?.readyState === WebSocket.OPEN &&
        wsRef.current.send(JSON.stringify({ ping: Date.now() }));
    }, 2000);
    return () => clearInterval(interval);
  }, [connected]);

  const lastDriveCmdRef = useRef("");
  const lastSteerCmdRef = useRef("");

  const handleSteeringChange = useCallback((s: number) => {
    targetSteeringRef.current = s;
  }, []);

  const handleSpeedLimitChange = useCallback((val: number) => {
    setSpeedLimit(val);
  }, []);

  const handleDirectionChange = useCallback((d: number) => {
    setDirection(d);
  }, []);

  const sendHttp = useCallback(async (cmd: string, type: 'drive' | 'steer') => {
    if (!esp32Ip) return;
    
    // Simple ref-based deduplication to avoid unnecessary re-renders
    if (type === 'drive' && cmd === lastDriveCmdRef.current) return;
    if (type === 'steer' && cmd === lastSteerCmdRef.current) return;

    if (type === 'drive') lastDriveCmdRef.current = cmd;
    if (type === 'steer') lastSteerCmdRef.current = cmd;

    try {
      // Use no-cors for simple ESP32 servers
      await fetch(`http://${esp32Ip}${cmd}`, { mode: 'no-cors' });
    } catch (err) {
      console.error("HTTP Control Error:", err);
    }
  }, [esp32Ip]);

  const sendWs = useCallback((payload: any) => {
    const now = Date.now();
    if (now - lastSendRef.current < 20) return;
    lastSendRef.current = now;
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify(payload));
  }, []);

  useEffect(() => {
    const LERP = 0.15; // Slightly even smoother
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const prevT = smoothThrottleRef.current;
      const prevS = smoothSteeringRef.current;
      
      // Calculate target throttle based on current direction and speed limit refs
      const targetT = directionRef.current === 0 ? 0 : directionRef.current * speedLimitRef.current;
      targetThrottleRef.current = targetT;

      smoothThrottleRef.current += (targetThrottleRef.current - prevT) * LERP;
      smoothSteeringRef.current += (targetSteeringRef.current - prevS) * LERP;
      
      if (Math.abs(smoothThrottleRef.current) < 0.1) smoothThrottleRef.current = 0;
      if (Math.abs(smoothSteeringRef.current) < 0.1) smoothSteeringRef.current = 0;
      
      const finalT = Math.round(smoothThrottleRef.current);
      const finalS = Math.round(smoothSteeringRef.current);
      
      const prevT_rounded = Math.round(prevT);
      const prevS_rounded = Math.round(prevS);

      if (finalT !== prevT_rounded || finalS !== prevS_rounded) {
        setThrottle(finalT);
        setSteering(finalS);
        sendWs({ throttle: finalT, steering: finalS });

        // --- PROPORTIONAL HTTP COMMAND MAPPING ---
        // Drive Logic: Send absolute speed and direction
        if (Math.abs(finalT) > 5) {
          sendHttp(`/drive?v=${finalT}`, 'drive');
        } else {
          sendHttp('/stop', 'drive');
        }

        // Steering Logic: Send normalized -100 to 100 value
        if (Math.abs(finalS) > 2) {
          sendHttp(`/steer?v=${finalS}`, 'steer');
        } else {
          sendHttp('/steer?v=0', 'steer');
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sendWs, sendHttp]); // No longer depends on direction or speedLimit

  if (showSetup) return <SetupGuide onBack={() => setShowSetup(false)} />;

  const absThrottle = Math.abs(throttle);
  const glowOpacity = absThrottle / 400;
  const glowColor = throttle < 0 ? "0, 0, 139" : "0, 191, 255"; // Dark Blue for reverse, Light Blue for forward

  return (
    <div
      className="fixed inset-0 font-inter overflow-hidden"
      style={{
        background: "hsl(var(--background))",
        userSelect: "none",
      }}
    >
      {/* Landscape Hint Overlay */}
      <div id="landscape-hint" className="fixed inset-0 z-[100] bg-black hidden flex-col items-center justify-center text-center p-8">
        <motion.div
          animate={{ rotate: 90 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-4"
        >
          <Smartphone size={64} className="text-neon-cyan" />
        </motion.div>
        <h2 className="text-2xl font-bold text-neon-cyan mb-2 uppercase tracking-tighter">Rotate Device</h2>
        <p className="text-white/40">Please rotate your phone to landscape mode for the cockpit interface.</p>
      </div>

      {/* ── DYNAMIC BACKGROUND ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, rgba(${glowColor},${glowOpacity}) 0%, transparent 65%)`,
          }}
        />
        {/* Full Screen Fire Effect */}
        <div className="absolute inset-0 z-0 opacity-30">
          <FireEffect throttle={throttle} />
        </div>
      </div>

      {/* ── HUD OVERLAY ── */}
      <HUDOverlay
        connected={connected}
        latency={latency}
        throttle={throttle}
        steering={steering}
        throttleLimit={speedLimit}
        esp32Ip={esp32Ip}
        editingIp={editingIp}
        onEditIp={() => setEditingIp(true)}
        onIpChange={setEsp32Ip}
        onIpBlur={() => setEditingIp(false)}
        onIpKey={(e) => e.key === "Enter" && setEditingIp(false)}
        onConnect={connectWebSocket}
        onDisconnect={() => wsRef.current?.close()}
        onSetup={() => setShowSetup(true)}
      />

      {/* ── COCKPIT DECORATIONS ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-5">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-neon-cyan/20 rounded-tl-3xl m-4" />
        <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-neon-cyan/20 rounded-tr-3xl m-4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-neon-cyan/20 rounded-bl-3xl m-4" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-neon-cyan/20 rounded-br-3xl m-4" />
        
        {/* Side Rails */}
        <div className="absolute inset-y-32 left-8 w-[1px] bg-gradient-to-b from-transparent via-neon-cyan/20 to-transparent" />
        <div className="absolute inset-y-32 right-8 w-[1px] bg-gradient-to-b from-transparent via-neon-cyan/20 to-transparent" />
      </div>

      {/* ── MAIN LANDSCAPE LAYOUT ── */}
      <div className="relative z-10 flex flex-row items-center justify-between w-full h-full px-10"
        style={{ paddingTop: 50, paddingBottom: 30 }}>

        {/* LEFT CONTROLS: Near the thumb */}
        <div className="flex flex-row items-center gap-8 h-full">
          <ThrottleBar limit={speedLimit} actualThrottle={absThrottle} onChange={handleSpeedLimitChange} size={220} />
          <GearSelector onChange={handleDirectionChange} size={220} />
        </div>

        {/* CENTER-RIGHT: Steering Wheel */}
        <div className="flex-1 flex justify-center items-center">
          <SteeringWheel onChange={handleSteeringChange} size={200} />
        </div>

        {/* RIGHT: Telemetry - More compact for mobile */}
        <div className="flex flex-col items-center justify-center gap-3 h-full min-w-[120px]">
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-black/40 border border-white/5 w-full backdrop-blur-sm">
            <Gauge size={14} className="text-neon-cyan" />
            <span className="text-[7px] uppercase tracking-[0.2em] text-white/30 font-bold">Velocity</span>
            <span className="text-xl font-mono font-black text-white">{absThrottle}%</span>
          </div>
          
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-black/40 border border-white/5 w-full backdrop-blur-sm">
            <Compass size={14} className="text-neon-cyan" />
            <span className="text-[7px] uppercase tracking-[0.2em] text-white/30 font-bold">Vector</span>
            <span className="text-xl font-mono font-black text-white">{steering}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}
