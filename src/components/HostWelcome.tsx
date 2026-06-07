/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface HostWelcomeProps {
  onBack: () => void;
  onListSpace: () => void;
  onMaybeLater: () => void;
}

type SpaceType = 'garage' | 'driveway' | 'lot';

export default function HostWelcome({ onBack, onListSpace, onMaybeLater }: HostWelcomeProps) {
  const [selectedType, setSelectedType] = useState<SpaceType>('garage');

  // Interactive estimates based on space types
  const estimates = {
    garage: { amount: 480, label: 'Garage', rates: [40, 60, 55, 85, 100, 70] },
    driveway: { amount: 320, label: 'Driveway', rates: [25, 45, 35, 65, 80, 50] },
    lot: { amount: 240, label: 'Parking Lot', rates: [20, 30, 28, 48, 60, 42] },
  };

  const currentEst = estimates[selectedType];

  return (
    <div className="min-h-[100dvh] bg-[#050508] text-white relative select-none">
      {/* Background Decorators */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[10%] right-[5%]"></div>
      <div className="orb bottom-[20%] left-[10%] bg-radial from-cyan-400 to-transparent"></div>

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#0a0a14]/65 backdrop-blur-xl flex items-center justify-between px-6 h-16 border-b border-white/5 select-none font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-all text-cyan-400 active:scale-90 cursor-pointer"
          >
            <span className="text-lg font-bold">←</span>
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center glow-cyan">
              <div className="w-1.5 h-1.5 bg-black rounded-sm rotate-45"></div>
            </div>
            <span className="font-['Space_Grotesk'] font-bold text-lg tracking-tight text-white">
              Parkit <span className="text-cyan-400">Host</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-80">
          <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
          <div className="w-5 h-1.5 rounded-full bg-cyan-400 glow-cyan"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-lg mx-auto flex flex-col justify-center relative z-10">
        {/* Hero Section */}
        <section className="mb-10 relative">
          <h1 className="font-['Space_Grotesk'] text-5xl font-black leading-tight tracking-tighter text-white mb-4">
            Earn while you <br />
            <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.45)]">don't park.</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-[90%]">
            Your empty driveway or garage could be generating passive revenue. List it in minutes and connect with thousands of active drivers.
          </p>
        </section>

        {/* Space type toggle selector */}
        <div className="mb-6 flex gap-2 p-1.5 bg-white/5 border border-white/10 backdrop-blur rounded-2xl font-mono">
          {(['garage', 'driveway', 'lot'] as SpaceType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex-1 py-2 text-[10px] font-bold font-mono tracking-wider uppercase transition-all rounded-xl cursor-pointer ${
                selectedType === type
                  ? 'bg-cyan-400 text-black glow-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {type === 'garage' ? 'Garage' : type === 'driveway' ? 'Driveway' : 'Lot'}
            </button>
          ))}
        </div>

        {/* Bento Grid Feature Highlight */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {/* Earning Potential Card (Main) */}
          <div className="col-span-2 glass-panel p-6 rounded-3xl relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-start mb-6 relative z-10 font-mono">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#22d3ee]/80 mb-1">
                  ESTIMATED SYSTEM YIELD
                </p>
                <p className="font-['Space_Grotesk'] text-4xl font-bold text-white tracking-tight">
                  ${currentEst.amount}.00 <span className="text-xs text-slate-400 font-normal">/mo</span>
                </p>
              </div>
              <div className="bg-[#22d3ee]/10 p-3 rounded-2xl text-cyan-400 font-bold text-base border border-cyan-400/20">
                💸
              </div>
            </div>

            {/* Simulated interactive bar chart */}
            <div className="flex items-end gap-2.5 h-28 relative z-10 px-2">
              {currentEst.rates.map((h, index) => (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  {/* Daily popup on hover */}
                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-24 bg-black border border-white/10 text-cyan-400 text-[9px] font-mono px-1.5 py-0.5 rounded transition-opacity pointer-events-none mb-1 shadow-lg">
                    ${Math.round(h * 4.8)}/mo
                  </div>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${h}%`,
                      backgroundColor: index >= 4 ? '#22d3ee' : index === 3 ? '#0891b2' : 'rgba(255, 255, 255, 0.08)',
                      boxShadow: index >= 3 ? '0 0 10px rgba(34, 211, 238, 0.25)' : 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Chart Day Labels */}
            <div className="mt-4 flex justify-between text-[9px] font-mono text-slate-500 uppercase tracking-wider px-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>
          </div>

          {/* Full Control Management Card */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between shadow">
            <span className="text-xl text-cyan-400 mb-4 font-bold select-none">📅</span>
            <div>
              <h3 className="font-['Space_Grotesk'] font-bold text-base leading-none text-white mb-1.5">
                Full Control
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">Set your own price, availability, and specific boundaries.</p>
            </div>
          </div>

          {/* Insured Security Card */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between shadow">
            <span className="text-xl text-cyan-400 mb-4 font-bold select-none">🛡️</span>
            <div>
              <h3 className="font-['Space_Grotesk'] font-bold text-base leading-none text-white mb-1.5">
                Insured Liability
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">Every host transaction is backed with customized coverage.</p>
            </div>
          </div>
        </div>

        {/* Dashboard Preview Testimonial Card */}
        <div className="glass-panel p-5 rounded-2xl mb-10 shadow flex gap-4 items-start select-none">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
            <img
              alt="Marcus Portrait"
              className="w-full h-full object-cover filter brightness-90"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFm6xjLwAqwI5Y8onhbJiOkNGFxc59_ei0i-7JZNC5dm-tTc0koXHqd0jSW3Cb-ymGX9wZ9-0HtGCAoru7zdlnCUxyQKTFVplKb9_v3ttz8JtEASs2QvRKl4M6rU0LLHFYLIeZcegM_RaNPTVNspnQAZ4GKDeJ2zwkx4DfB99KXL2vMYJRbQ1Cy80XrQcFgVf8ONOX1C2Sgjz_Pr0V0sgeVfZF86G-pCcriA1Q9qZqmjy0u87CtcvIFDoXaIQNvj8rx1dGGDjowjk"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200 leading-relaxed italic">
              "I pay my entire car lease just by renting my empty home driveway while I'm at the workspace."
            </p>
            <p className="text-[9px] text-cyan-400 uppercase font-mono tracking-widest mt-1.5">
              • Marcus, Host since 2023
            </p>
          </div>
        </div>

        {/* Call to Action buttons */}
        <div className="space-y-4">
          <button
            onClick={onListSpace}
            id="btn-list-your-space"
            className="w-full h-15 bg-cyan-400 hover:bg-cyan-300 text-black rounded-2xl font-['Space_Grotesk'] font-bold text-base transition-all flex items-center justify-center gap-2 glow-cyan cursor-pointer animate-pulse-slow"
          >
            <span>List Your Space</span>
            <span className="text-sm font-bold">→</span>
          </button>
          <button
            onClick={onMaybeLater}
            className="w-full h-13 bg-transparent text-slate-400 hover:text-white font-mono text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all rounded-2xl cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </main>

      {/* Background Decorator Image */}
      <div className="absolute bottom-0 right-0 w-1/2 h-64 -z-20 opacity-[0.02] pointer-events-none select-none">
        <img
          alt="Architectural background"
          className="w-full h-full object-cover rounded-tl-[100px]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrMj-mHcwAgOoDlmiZt3xWaqhqBSjL_nVZHquh1m7xh2wmy0_f8SUik-aqmUTXSHLh86C4kUg2vKRs2cEkUMhZhhXWIHHgZfXf_kU40vVIdYWtyOvwwb7rNF6ekyesUm9BkE7II_v_sV36Lt2-rkW2eDSedmdxczDz_He50eWpp5v6O6wJdTkDsh2R4N2sHUrJRCVDjp8DdaG_74FnkPbKUOmTD4iPsHG3DECODSt0XgKGoKt6K67ZxhBByr-6L8H1Y_eCgXVsgTc"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
