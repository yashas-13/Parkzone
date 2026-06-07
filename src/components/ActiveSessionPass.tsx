/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, UserProfile, ParkingSpot } from '../types';

interface ActiveSessionPassProps {
  user: UserProfile;
  booking: Booking;
  onEndSession: () => void;
  onOpenFind: () => void;
  onOpenProfile: () => void;
}

export default function ActiveSessionPass({
  user,
  booking,
  onEndSession,
  onOpenFind,
  onOpenProfile,
}: ActiveSessionPassProps) {
  const [seconds, setSeconds] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [hasNotified, setHasNotified] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  // Initialize of the counter based on estimated start time
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Request notifications permission with initial feedback
  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        new Notification('Parkzone Notifications Enabled!', {
          body: 'We will alert you when your parking session is about to expire.',
          icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXu27H7m62UOre5aTgD7GHP_WvEilak6Q1F7zy9Wsk_CxZ53MEDCsuYiluDRnWnucq376t_Lx9ac-HcROob5HwqBBCJhabJpYda8mu3MPEH1PBnMXqGbUscPFk1kVwnRrURrSY73Z7Ph08xR-F3qv8xaq9UDB5eC0fjws-RbcTwxXF9sUrIEDHK6_jPlOUPZXbzCloS-9AiC3vXoVjjVkCTGFA9eGRpU7vnqjbC3gLxiw5jUEiqEwDeqPsQxWIwdVlI6bGrNh6MgHFc',
        });
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
    }
  };

  // Simulate an expiry alert immediately
  const handleSimulateExpiry = () => {
    if (permissionStatus !== 'granted') {
      handleRequestPermission();
      return;
    }
    setTestCountdown(3);
  };

  // Test countdown hook
  useEffect(() => {
    if (testCountdown === null) return;

    if (testCountdown === 0) {
      setTestCountdown(null);
      try {
        new Notification('Parkzone: Parking Pass Expiring Soon!', {
          body: `SIMULATION: Your reserved parking pass at ${booking.spotName} has less than 5 minutes left!`,
          icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXu27H7m62UOre5aTgD7GHP_WvEilak6Q1F7zy9Wsk_CxZ53MEDCsuYiluDRnWnucq376t_Lx9ac-HcROob5HwqBBCJhabJpYda8mu3MPEH1PBnMXqGbUscPFk1kVwnRrURrSY73Z7Ph08xR-F3qv8xaq9UDB5eC0fjws-RbcTwxXF9sUrIEDHK6_jPlOUPZXbzCloS-9AiC3vXoVjjVkCTGFA9eGRpU7vnqjbC3gLxiw5jUEiqEwDeqPsQxWIwdVlI6bGrNh6MgHFc',
          tag: 'parkzone-expiry-sim',
          requireInteraction: true,
        });
      } catch (err) {
        console.error('Error triggering test notification:', err);
      }
      return;
    }

    const timer = setTimeout(() => {
      setTestCountdown(testCountdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [testCountdown, booking]);

  // Real-time notification check: about to expire (5 minutes / 300 seconds left)
  useEffect(() => {
    if (permissionStatus !== 'granted' || hasNotified) return;

    const totalDurationSecs = (booking.durationHours || 3) * 3600;
    const currentElapsedSecs = seconds + 5055;
    const remainingSecs = totalDurationSecs - currentElapsedSecs;

    if (remainingSecs > 0 && remainingSecs <= 300) {
      setHasNotified(true);
      try {
        new Notification('Parkzone: Space Session Expiring Soon!', {
          body: `Your session at ${booking.spotName} has less than 5 minutes remaining. Please extend or prepare to vacate.`,
          icon: 'https://lh3.googleusercontent.com/aida-public/AB6AXu27H7m62UOre5aTgD7GHP_WvEilak6Q1F7zy9Wsk_CxZ53MEDCsuYiluDRnWnucq376t_Lx9ac-HcROob5HwqBBCJhabJpYda8mu3MPEH1PBnMXqGbUscPFk1kVwnRrURrSY73Z7Ph08xR-F3qv8xaq9UDB5eC0fjws-RbcTwxXF9sUrIEDHK6_jPlOUPZXbzCloS-9AiC3vXoVjjVkCTGFA9eGRpU7vnqjbC3gLxiw5jUEiqEwDeqPsQxWIwdVlI6bGrNh6MgHFc',
          tag: 'parkzone-expiry',
          requireInteraction: true,
        });
      } catch (err) {
        console.error('Error triggering notification:', err);
      }
    }
  }, [seconds, permissionStatus, hasNotified, booking]);

  const formatTime = (totalSec: number) => {
    // Add default mock hour to match aesthetic layout
    const baseSeconds = totalSec + 5055; // Sets up 01:24:15 starting range visual!
    const hrs = Math.floor(baseSeconds / 3600);
    const mins = Math.floor((baseSeconds % 3600) / 60);
    const secs = baseSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRemainingTime = () => {
    const totalDurationSecs = (booking.durationHours || 3) * 3600;
    const currentElapsedSecs = seconds + 5055;
    const remainingSecs = totalDurationSecs - currentElapsedSecs;
    if (remainingSecs <= 0) {
      return 'Expired';
    }
    const hrs = Math.floor(remainingSecs / 3600);
    const mins = Math.floor((remainingSecs % 3600) / 60);
    const secs = remainingSecs % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const calculateAccruedCost = () => {
    const totalSecs = seconds + 5055;
    const hoursFraction = totalSecs / 3600;
    const total = booking.pricePerHour * hoursFraction;
    return Math.max(booking.pricePerHour, parseFloat(total.toFixed(2)));
  };

  return (
    <div className="bg-[#050508] text-white min-h-[100dvh] pb-32 font-sans select-none antialiased relative overflow-x-hidden">
      {/* Background Decorators */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[10%] right-[5%]"></div>
      <div className="orb bottom-[40%] left-[10%] bg-radial from-cyan-400/20 to-transparent"></div>

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#0a0a14]/65 backdrop-blur-xl border-b border-white/5 shadow-md flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-3">
          <div
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 cursor-pointer hover:border-cyan-400 transition-all"
          >
            <img
              alt="User"
              className="w-full h-full object-cover"
              src={user.avatar}
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-2xl font-bold tracking-tighter text-white font-['Space_Grotesk'] font-bold cursor-pointer" onClick={onOpenFind}>
            <span className="text-cyan-400">P</span>arkit
          </span>
        </div>
        <button className="text-slate-400 hover:text-cyan-400 font-bold text-sm">🔔</button>
      </header>

      {/* Main Canvas content */}
      <main className="pt-24 pb-32 px-6 max-w-md mx-auto relative z-10">
        <section className="mb-6">
          <h2 className="text-3xl font-['Space_Grotesk'] font-bold text-white tracking-tight mb-1">
            Active Session
          </h2>
          <p className="text-slate-400 font-mono text-xs truncate uppercase tracking-wider">
            {booking.spotName} • {booking.locationDetails}
          </p>
        </section>

        {/* QR Code and live timer box */}
        <div className="glass-panel rounded-3xl p-7 border border-white/5 shadow-xl text-center mb-5 relative overflow-hidden">
          <div className="mb-6 flex flex-col items-center">
            <div className="p-3 bg-white rounded-2xl shadow-sm mb-4 border border-white/10 inline-block pointer-events-none select-none">
              {/* Scanable high quality QR graphics wrapper */}
              <img
                alt="Gate QR Code"
                className="w-44 h-44 rounded-lg"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXu27H7m62UOre5aTgD7GHP_WvEilak6Q1F7zy9Wsk_CxZ53MEDCsuYiluDRnWnucq376t_Lx9ac-HcROob5HwqBBCJhabJpYda8mu3MPEH1PBnMXqGbUscPFk1kVwnRrURrSY73Z7Ph08xR-F3qv8xaq9UDB5eC0fjws-RbcTwxXF9sUrIEDHK6_jPlOUPZXbzCloS-9AiC3vXoVjjVkCTGFA9eGRpU7vnqjbC3gLxiw5jUEiqEwDeqPsQxWIwdVlI6bGrNh6MgHFc"
                referrerPolicy="no-referrer"
              />
            </div>

            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-cyan-400 text-black rounded-full text-[9px] font-mono font-bold uppercase tracking-widest shadow glow-cyan">
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
              LIVE TIMING
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[8px] font-bold font-mono uppercase tracking-[0.2em] text-slate-500">
              Elapsed Time
            </p>
            <p className="text-4xl font-['Space_Grotesk'] font-extrabold text-cyan-400 tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(34,211,238,0.25)]">
              {formatTime(seconds)}
            </p>
          </div>
        </div>

        {/* Smart Expiry Alerts Control Panel */}
        <div className="glass-panel rounded-2xl p-4.5 border border-white/5 mb-5 select-none text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔔</span>
              <div>
                <h4 className="font-['Space_Grotesk'] font-bold text-sm text-white">Smart Expiry Alerts</h4>
                <p className="text-[10px] text-slate-400 font-medium font-sans">Notify 5 mins before session ends</p>
              </div>
            </div>
            <button
              onClick={handleRequestPermission}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                permissionStatus === 'granted'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : permissionStatus === 'denied'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-cyan-400 text-black hover:bg-cyan-300 font-extrabold glow-cyan'
              }`}
            >
              {permissionStatus === 'granted' ? 'Enabled ✓' : permissionStatus === 'denied' ? 'Blocked ⚠' : 'Enable'}
            </button>
          </div>
          
          {permissionStatus === 'granted' && (
            <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-3">
              <div className="text-[10px] text-slate-400 font-sans leading-tight">
                <span className="block mb-1">Session limit: <strong>{booking.durationHours || 3} Hours</strong></span>
                <span>Time Remaining: <strong className="text-cyan-400 font-mono tracking-wide">{formatRemainingTime()}</strong></span>
              </div>
              <button
                onClick={handleSimulateExpiry}
                disabled={testCountdown !== null}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-400/20 hover:border-cyan-400/50 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {testCountdown !== null ? `Alerting in ${testCountdown}s...` : '⚡ Test Alert'}
              </button>
            </div>
          )}
        </div>

        {/* Vehicle & Parking details block */}
        <div className="grid grid-cols-2 gap-4 mb-6 select-none">
          <div className="glass-panel p-4 rounded-2xl border border-white/5">
            <p className="text-[8px] font-bold font-mono uppercase tracking-widest text-cyan-400 mb-1">
              Vehicle
            </p>
            <p className="text-base font-['Space_Grotesk'] font-bold text-white">
              {booking.vehiclePlate}
            </p>
            <p className="text-[10px] text-slate-500 font-medium font-mono">Model 3 Premium</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5">
            <p className="text-[8px] font-bold font-mono uppercase tracking-widest text-[#22d3ee] mb-1">
              Accrued Price
            </p>
            <p className="text-base font-['Space_Grotesk'] font-bold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.2)]">
              ₹{calculateAccruedCost().toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium font-mono">
              ₹{booking.pricePerHour}/hr
            </p>
          </div>
        </div>

        {/* Location contextual maps thumbnail */}
        <div className="relative h-28 rounded-2xl overflow-hidden mb-6 group border border-white/5 shadow-md select-none">
          <img
            alt="Map contextual"
            className="w-full h-full object-cover pointer-events-none brightness-50 filter contrast-125 hover:scale-105 transition-transform duration-300"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3fFDaH2C9MZWie8o_GVQUG42BAw0xnkjcBQZ3k6-BgUK11lGvtHZSxisVehtnIAAbTwVd0mphCe7Ut9Jx2zim5FW9dvowwohBXY3-HszTlGcZTk8zO_ODJDQXdeBt7FlspjB87iQKiCLwGaaazsshom828fqCq5vv7DdZhYb7vS9Oc0FbZo06hRoggVixqmNP5iTrQKNczWvW1r0h6JH12XcW1Sgb612Mmyt-FfcSrlxX6es0m2n3-4nKurvwUvvNkhjsFSFEIBE"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050510]/95 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-4 text-white">
            <p className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location Details</p>
            <p className="text-base font-['Space_Grotesk'] font-bold leading-tight">
              {booking.spotName}
            </p>
          </div>
          <div className="absolute top-3 right-3 bg-cyan-400 text-black px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider shadow glow-cyan">
            740m Away
          </div>
        </div>

        {/* Primary Action controls */}
        <button
          onClick={onEndSession}
          id="btn-end-session"
          className="w-full py-4 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-mono uppercase tracking-wider font-bold text-xs shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-rose-950/25"
        >
          <span>⏹️ End Active Session</span>
        </button>
      </main>

      {/* Embedded Navigation Bar containing active markers */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 pb-4 bg-[#0a0a14]/90 backdrop-blur-md border-t border-white/5 h-20 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={onOpenFind}
          className="flex flex-col items-center justify-center text-slate-400 hover:text-cyan-400 px-6 py-2.5 transition-colors cursor-pointer"
        >
          <span className="text-sm">🗺️</span>
          <span className="font-sans text-[9px] font-bold uppercase mt-1 tracking-widest">
            Find
          </span>
        </button>

        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center bg-cyan-400 text-black rounded-2xl px-6 py-2.5 scale-102 transition-transform duration-200 cursor-pointer glow-cyan"
        >
          <span className="text-sm">📋</span>
          <span className="font-sans text-[9px] font-extrabold uppercase mt-1 tracking-widest">
            PASSES
          </span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center text-slate-400 hover:text-cyan-400 px-6 py-2.5 transition-colors cursor-pointer"
        >
          <span className="text-sm">👤</span>
          <span className="font-sans text-[9px] font-bold uppercase mt-1 tracking-widest">
            Profile
          </span>
        </button>
      </nav>
    </div>
  );
}
