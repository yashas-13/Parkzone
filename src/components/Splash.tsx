/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Space } from 'lucide-react';

interface SplashProps {
  onFindParking: () => void;
  onLogin: () => void;
  onCreateAccount: () => void;
  onGoogleSignIn: () => void;
  onExplore: () => void;
  onBeHost: () => void;
}

export default function Splash({
  onFindParking,
  onLogin,
  onCreateAccount,
  onGoogleSignIn,
  onExplore,
  onBeHost,
}: SplashProps) {
  return (
    <main className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between overflow-hidden bg-[#050508] text-white">
      {/* Immersive Background effects */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[-100px] left-[10%]"></div>
      <div className="orb bottom-[-150px] right-[5%] bg-radial from-cyan-400 to-transparent"></div>

      {/* Cityscape Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          alt="Bangalore night cityscape shadow"
          className="w-full h-full object-cover opacity-15 mix-blend-luminosity filter brightness-75"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTSGAPoexayl8cHxkq_2lRea-GiLuI0-GnH-41TTWcg_Y2Mbio4z151-jUfPwVaY564b5jyXWKSERh-QAGpAOIcyJBTw5oyHfBWF5JwhC81gWfGvnfesIP3jFhhx5eqlVg6fNA7qUXvaR1crNuKbehaC08YmG8U00ukEC1Wpr_Q8sTHxLMA4RTs3HFTA9X5b3aQlei8GnFqHgSJFyFZ3VVEtYZ1VW9QBD7ZplTTVSMSBtI4hctH_iRcTjVnUexfIaRpXN4T9XxlwI"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-transparent z-10" />
      </div>

      {/* Top Branding Section */}
      <div className="relative z-10 w-full pt-16 px-8 flex flex-col items-center select-none text-center">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-[1.5px] bg-[#22d3ee] rounded-full glow-cyan"></div>
          <span className="text-cyan-400 font-mono text-[9px] tracking-[0.3em] uppercase font-bold">
            PARKZONE SYSTEM INTERFACE
          </span>
          <div className="w-10 h-[1.5px] bg-[#22d3ee] rounded-full glow-cyan"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center glow-cyan">
            <div className="w-3 h-3 bg-black rounded-sm rotate-45"></div>
          </div>
          <h1 className="font-['Space_Grotesk'] font-bold text-6xl tracking-tighter text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
            Parkzone
          </h1>
        </div>
      </div>

      {/* Center Interactive Bento widgets */}
      <div className="relative z-10 w-full max-w-md px-6 grid grid-cols-2 gap-3">
        <div className="col-span-2 glass-panel rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-cyan-400 text-[10px] uppercase font-mono tracking-widest mb-0.5">
              LIVE NETWORK STATUS
            </span>
            <span className="text-white font-['Space_Grotesk'] text-2xl font-bold">
              2,482 Spots
            </span>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-8 h-8 bg-cyan-400 rounded-full animate-ping opacity-25"></div>
            <div className="w-4 h-4 bg-[#22d3ee] rounded-full shadow-[0_0_15px_#22d3ee]"></div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-1.5 shadow-md">
          <span className="text-cyan-400 text-xl font-bold font-mono">⚡</span>
          <span className="text-white font-['Space_Grotesk'] text-sm font-bold leading-tight">
            Instant
            <br />
            Booking
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-1.5 shadow-md">
          <span className="text-cyan-400 text-xl font-bold font-mono">🛡️</span>
          <span className="text-white font-['Space_Grotesk'] text-sm font-bold leading-tight">
            Secure
            <br />
            Valet
          </span>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="relative z-10 w-full max-w-md px-6 pb-12 flex flex-col gap-4">
        <button
          onClick={onFindParking}
          id="btn-find-parking-near-me"
          className="w-full h-15 bg-cyan-400 hover:bg-cyan-300 text-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all font-['Space_Grotesk'] font-bold text-lg glow-cyan cursor-pointer"
        >
          <span>Find Parking Near Me</span>
          <svg
            className="w-5 h-5 transition-transform stroke-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </button>

        <button
          onClick={onGoogleSignIn}
          className="w-full h-13 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-2xl flex items-center justify-center gap-2.5 active:scale-95 transition-all font-mono font-bold text-xs tracking-wider uppercase text-white cursor-pointer"
        >
          <span>🔑</span>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center justify-between px-2 text-slate-500 font-medium text-[10px] font-mono select-none mt-1">
          <button
            onClick={onLogin}
            className="uppercase tracking-widest hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Log In
          </button>
          <div className="h-3 w-[1px] bg-white/10"></div>
          <button
            onClick={onCreateAccount}
            className="uppercase tracking-widest hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Create Account
          </button>
          <div className="h-3 w-[1px] bg-white/10"></div>
          <button
            onClick={onBeHost}
            className="uppercase tracking-wide text-cyan-400 hover:text-cyan-300 transition-colors font-bold cursor-pointer"
          >
            Earn ₹ (Host)
          </button>
        </div>
      </div>
    </main>
  );
}
