/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile } from '../types';

interface OnboardingProps {
  onBack: () => void;
  onSubmit: (data: { name: string; phone: string; plate: string }) => void;
}

export default function Onboarding({ onBack, onSubmit }: OnboardingProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide your phone number.');
      return;
    }
    if (!plate.trim()) {
      setError('Please provide your vehicle license plate for gate recognition.');
      return;
    }
    setError('');
    onSubmit({ name, phone, plate });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row items-stretch bg-[#050508] text-white select-none relative overflow-hidden">
      {/* Background elements */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb right-[-100px] top-[10%]"></div>
      <div className="orb left-[-150px] bottom-[5%] bg-radial from-cyan-400 to-transparent"></div>

      {/* Brand Sidebar Visual - Left (For medium/large devices) */}
      <aside className="relative hidden md:flex flex-col justify-between w-1/3 lg:w-5/12 p-12 overflow-hidden border-r border-white/10 select-none glass-panel">
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <img
            className="w-full h-full object-cover opacity-15 mix-blend-luminosity filter brightness-50"
            alt="Modern urban parking architecture"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBE315YPfmgoI_4Ki0jSolR3QCy709FfSf1-UTPKHvKyCqj6NnmdJaHAshVrb3IsoNEhLLtXYtM6r74jZXDHIN6k4HJ1N9gD-mxpI813WiRdeW7qZ9_8qPahVNPS6QYaPs-zLsnYx7cmXngJmShVmxYEamMFpx-_EFvJRtHt65w1Bn_pxmrojrbhwedEzmKe9YVsYAE4xToEGrOZzaiHzkIsAyz-k2gFWEzYj5JhDf_BCH1Pk-vwzW3ZFZpMAaBrDuU7dzX_gMGwLo"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#050508] via-transparent to-transparent" />
        </div>

        <div className="relative z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer font-mono text-xs"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2 mt-8">
            <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center glow-cyan">
              <div className="w-2 h-2 bg-black rounded-sm rotate-45"></div>
            </div>
            <h1 className="font-['Space_Grotesk'] font-bold text-3xl text-white">Parkit</h1>
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-['Space_Grotesk'] font-medium text-4.5xl leading-tight text-white">
            Your urban journey <br />
            <span className="text-cyan-400 font-bold drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">starts here.</span>
          </p>
          <div className="mt-8 flex gap-2">
            <div className="h-1 w-6 rounded-full bg-white/10"></div>
            <div className="h-1 w-6 rounded-full bg-white/10"></div>
            <div className="h-1.5 w-10 rounded-full bg-[#22d3ee] glow-cyan"></div>
          </div>
        </div>
      </aside>

      {/* Main Form Fields Content Area */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 relative overflow-y-auto z-10 bg-[#050508]/40 backdrop-blur-sm">
        {/* Mobile top navigation with back icon */}
        <div className="md:hidden flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10  text-white border border-white/10 transition-transform active:scale-90 cursor-pointer"
          >
            <span className="text-xl">←</span>
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center glow-cyan">
              <div className="w-1.5 h-1.5 bg-black rounded-sm rotate-45"></div>
            </div>
            <h2 className="font-['Space_Grotesk'] font-bold text-xl text-white">Parkit</h2>
          </div>
          <div className="text-[9px] font-mono font-bold text-slate-500 tracking-widest uppercase">
            Step 3 of 3
          </div>
        </div>

        {/* Mobile progress indicator bar */}
        <div className="md:hidden flex gap-1.5 mb-8">
          <div className="h-[2px] flex-1 rounded-full bg-cyan-400/20"></div>
          <div className="h-[2px] flex-1 rounded-full bg-cyan-400/20"></div>
          <div className="h-1 flex-1 rounded-full bg-[#22d3ee] glow-cyan"></div>
        </div>

        <div className="max-w-md w-full mx-auto md:mx-0">
          <header className="mb-8 text-center md:text-left">
            <span className="hidden md:inline-block text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.25em] mb-2 px-2.5 py-1 glass-panel rounded-full">
              SECURE PROFILE ENROLLMENT
            </span>
            <h1 className="font-['Space_Grotesk'] font-bold text-3xl md:text-4xl text-white tracking-tight mb-3 mt-4">
              Create Your Profile
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed font-sans">
              Set up your verified driver identity. This helps recognize your vehicle at gated garages and safely handle booking check-outs.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-950/45 text-red-300 text-xs rounded-xl border border-red-500/30">
                ⚠️ {error}
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest px-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 text-xs">
                  👤
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full h-13 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all font-sans"
                  placeholder="e.g. Julian Vane"
                  type="text"
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest px-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 text-xs">
                  📞
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full h-13 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all font-sans"
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                />
              </div>
            </div>

            {/* Vehicle License Plate Field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest px-1">
                Vehicle Plate
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 text-xs">
                  🚗
                </div>
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="block w-full h-13 pl-10 pr-10 bg-white/5 border border-white/10 rounded-xl text-white font-['Space_Grotesk'] font-bold uppercase tracking-widest placeholder-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all"
                  placeholder="e.g. ABC-1234"
                  type="text"
                />
                <div className="absolute inset-y-0 right-4 flex items-center text-slate-500 text-sm select-none cursor-help">
                  ℹ️
                </div>
              </div>
              <p className="text-[10px] text-slate-500 px-1 leading-normal font-mono">
                Used for automatic camera-recognition at participating entries.
              </p>
            </div>

            {/* Submit Control */}
            <div className="pt-4">
              <button
                type="submit"
                className="group relative w-full h-15 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl font-['Space_Grotesk'] font-bold text-lg transition-all flex items-center justify-center gap-2 glow-cyan cursor-pointer"
              >
                <span>Get Started</span>
                <span className="text-base font-bold">→</span>
              </button>
              <p className="mt-4 text-center text-[11px] text-slate-500 leading-relaxed px-4 font-mono">
                By clicking "Get Started", you agree to our{' '}
                <a className="text-cyan-400 hover:underline" href="#terms">
                  Terms
                </a>{' '}
                and{' '}
                <a className="text-cyan-400 hover:underline" href="#privacy">
                  Privacy
                </a>
                .
              </p>
            </div>
          </form>
        </div>

        {/* Floated Social Proof overlay for wider devices */}
        <div className="absolute top-8 right-8 z-20 hidden lg:block select-none">
          <div className="glass-panel px-5 py-3 rounded-full flex items-center gap-3 shadow-md">
            <div className="flex -space-x-2">
              <img
                className="w-7 h-7 rounded-full border border-black/50 object-cover"
                alt="Representative"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDf4Mj5Ca4zeCkc0J4F2xWiGqlzo808RsLpAYJYW0CL0ArYXwOT8j5DCf0FzOW6OjldEoYNrLdGRg4OUZPjVpIqkhIPmsBMVDAdJzbmUdTxn17nLniimKuRjbFayxAjxIogL1vrcqzcVrA0zcjQMJ5m8zwd63atyLMOVQ-8DUFZYJc19qotdAexx2Vw4vjzQD-PE12ciNy_yRHZfrTrhr-zN-ZohOMUIt0maFAKRgR71INH7_4366QFvuLZks9zoxbWcJSFjlHE6wg"
                referrerPolicy="no-referrer"
              />
              <img
                className="w-7 h-7 rounded-full border border-black/50 object-cover"
                alt="Representative"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0Wh8FLwyyXeM6HL34839zCIWcElmYS84VJlK8-0EDq0kLfWc050TrwEDRRvMwerDCwwKi4xMHQh_gVcineb8RzfvtwAKUovw_ADQPTxGwHgbLDtjOJ6EqPYbBx4tVM9fI6SE0I81S80jdvzGWzJVSeN6VPc-v1E2dAAvufcK5zj6WWMJggkyDA_8DIr2-mRbC0wtgF161tdQgChHEwcFit45sPtDI9rR9FCa85C1eEz3OROk1hsqq8l6Ra7Q18-zypAcUcimCm9w"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-300">
              JOIN 50K+ NETWORK DRIVERS
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
