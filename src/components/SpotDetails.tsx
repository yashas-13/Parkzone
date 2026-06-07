/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ParkingSpot } from '../types';

interface SpotDetailsProps {
  spot: ParkingSpot;
  onBack: () => void;
  onReserve: (spot: ParkingSpot, totalRate: number, hours: number) => void;
  isSaved: boolean;
  onToggleSaved: (spotId: string) => void;
}

export default function SpotDetails({
  spot,
  onBack,
  onReserve,
  isSaved,
  onToggleSaved,
}: SpotDetailsProps) {
  const [hoursSelected, setHoursSelected] = useState(3);
  const totalCost = spot.pricePerHour * hoursSelected;

  return (
    <div className="bg-[#050508] text-white min-h-[100dvh] pb-32 font-sans select-none antialiased relative overflow-x-hidden">
      {/* Background Decorators */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[30%] left-[10%]"></div>
      <div className="orb bottom-[20%] right-[10%] bg-radial from-cyan-400/20 to-transparent"></div>

      {/* TopAppBar header action triggers */}
      <header className="fixed top-0 w-full z-50 bg-[#0a0a14]/65 backdrop-blur-xl border-b border-white/5 shadow-md">
        <div className="flex justify-between items-center px-6 h-16 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-cyan-400 text-white cursor-pointer transition-transform active:scale-90"
            >
              <span className="text-xl text-cyan-400 font-bold">←</span>
            </button>
            <h1 className="font-['Space_Grotesk'] font-bold text-lg text-white truncate max-w-[200px]">
              {spot.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleSaved(spot.id)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isSaved
                  ? 'bg-cyan-400 border-cyan-400 text-black font-bold scale-105 glow-cyan'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-400'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save place'}
            >
              ⭐
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: spot.name, text: spot.location, url: window.location.href });
                } else {
                  alert('Copied location to clipboard: ' + spot.location);
                }
              }}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-cyan-400 text-slate-400 hover:text-cyan-400 cursor-pointer"
            >
              🔗
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16 max-w-lg mx-auto relative z-10">
        {/* Dynamic Cover image banner */}
        <section className="relative h-72 w-full overflow-hidden select-none">
          <img
            className="w-full h-full object-cover filter brightness-50 contrast-125"
            alt={spot.name}
            src={spot.image}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-400 text-black rounded-full text-[9px] font-mono font-bold uppercase tracking-wider mb-2 shadow glow-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
              Live Availability
            </span>
            <h2 className="font-['Space_Grotesk'] text-2xl font-bold leading-tight drop-shadow-sm">
              {spot.name}
            </h2>
            <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1 font-semibold font-mono">
              <span>📍</span>
              {spot.location}
            </p>
          </div>
        </section>

        {/* Quick Info Bento Grid widgets with prices */}
        <section className="px-5 -mt-6 relative z-10 grid grid-cols-2 gap-4">
          <div className="glass-panel p-4.5 rounded-2xl border border-white/5 flex flex-col justify-center">
            <p className="text-slate-500 font-mono font-bold text-[8px] uppercase tracking-wider mb-1">
              Price per hour
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-['Space_Grotesk'] font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                ₹{spot.pricePerHour}
              </span>
              <span className="text-slate-500 text-xs font-semibold font-mono">/hr</span>
            </div>
          </div>

          <div className="glass-panel p-4.5 rounded-2xl border border-white/5 flex flex-col justify-center">
            <p className="text-slate-500 font-mono font-bold text-[8px] uppercase tracking-wider mb-1">
              Spots Left
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-['Space_Grotesk'] font-bold text-white">
                {spot.spotsLeft}
              </span>
              <span className="text-slate-500 text-xs font-semibold font-mono">/ {spot.totalSpots}</span>
            </div>
          </div>

          <button
            onClick={() =>
              alert(`Navigating to ${spot.name}. Coordinates: ${spot.lat}, ${spot.lng}`)
            }
            className="col-span-2 bg-cyan-400 hover:bg-cyan-300 text-black p-3.5 rounded-xl flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-widest text-xs shadow glow-cyan active:scale-98 transition-all cursor-pointer"
          >
            <span>🚗 Navigate to Entry Gate</span>
          </button>
        </section>

        {/* Duration configuration panel */}
        <section className="px-5 mt-6">
          <div className="bg-cyan-400/5 p-4 rounded-2xl border border-cyan-400/10">
            <p className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-2.5">
              Select Parking duration
            </p>
            <div className="flex justify-between items-center gap-2">
              {[1, 2, 3, 5, 8].map((h) => (
                <button
                  key={h}
                  onClick={() => setHoursSelected(h)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                    hoursSelected === h
                      ? 'bg-cyan-400 text-black shadow-sm glow-cyan font-bold'
                      : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                  }`}
                >
                  {h} HR
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Premium Amenities list */}
        <section className="px-5 mt-8">
          <h3 className="font-['Space_Grotesk'] font-bold text-lg mb-3 text-white">Premium Amenities</h3>
          <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-none">
            {spot.amenities.map((amenity, index) => {
              const icons: { [key: string]: string } = {
                'CCTV 24/7': '📹',
                'EV Charging': '⚡',
                Covered: '🛡️',
                Accessible: '♿',
                'Automated Entry': '🤖',
                'Self Entry': '🔑',
                'Electric gate access': '⚡',
              };
              return (
                <div
                  key={index}
                  className="flex-shrink-0 bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2"
                >
                  <span className="text-sm select-none">{icons[amenity] || '✨'}</span>
                  <span className="text-xs font-semibold text-slate-300">{amenity}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* About location block */}
        <section className="px-5 mt-6 text-sm leading-relaxed">
          <h3 className="font-['Space_Grotesk'] font-bold text-lg mb-2 text-white">About this location</h3>
          <p className="text-slate-400 font-medium text-xs md:text-sm">{spot.description}</p>
        </section>

        {/* Map preview block */}
        <section className="px-5 mt-6">
          <div className="w-full h-36 rounded-xl overflow-hidden filter grayscale opacity-60 border border-white/10 brightness-75 shadow-inner">
            <img
              className="w-full h-full object-cover pointer-events-none"
              alt="Map thumbnail view"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzPdQk_T2e8cOlS_2nFRyHAhP9OKkwbLwNAXXFjCAyCMwCiwNl9oFX5TQqscHjVZikzNFsrAS2ULe5N_lUU2qz4h600Oh9Pedxo4JvGOfJpteYATqTVHtHtDh2G31ESWMGM643qBmd9GE1ndQutXAhzeF2jm86bmeeqabiYMYKvwHPeGjND7ZhKQ44bpyX4-QGsFhTVJAPge1hBGjjHh9e_YGOY8MlgmCUd8VShNkoP5wSMZY2k8vLqekp0_mupgMLH_7OQwiKPdU"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>

        {/* User Reviews and stars metrics */}
        <section className="px-5 mt-8 mb-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-['Space_Grotesk'] font-bold text-lg text-white font-bold">User Reviews</h3>
            <div className="flex items-center gap-1 text-cyan-400">
              <span className="text-cyan-400 font-bold">⭐</span>
              <span className="font-bold text-sm">{spot.ratings}</span>
              <span className="text-slate-500 text-xs font-medium">({spot.reviewCount})</span>
            </div>
          </div>

          <div className="space-y-4">
            {spot.reviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic font-mono">No reviews yet for this space.</p>
            ) : (
              spot.reviews.map((review, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col text-xs leading-relaxed"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        className="w-9 h-9 rounded-lg object-cover border border-white/10"
                        alt={review.author}
                        src={review.avatar}
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-bold text-white text-xs">{review.author}</p>
                        <p className="text-[9px] text-slate-500 font-mono font-medium">{review.date}</p>
                      </div>
                    </div>
                    {/* Stars render */}
                    <div className="flex text-cyan-400 select-none text-[9px] font-bold">
                      {Array.from({ length: 5 }).map((_, sIdx) => (
                        <span key={sIdx}>{sIdx < review.stars ? '★' : '☆'}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-400 font-medium">{review.text}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Bottom action bar details */}
      <footer className="fixed bottom-0 left-0 w-full z-40 bg-[#0a0a14]/90 backdrop-blur-xl px-6 py-4.5 flex items-center justify-between border-t border-white/5 shadow-2xl">
        <div className="flex flex-col select-none">
          <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest">
            Est. Total
          </span>
          <span className="text-2xl font-['Space_Grotesk'] font-bold text-cyan-400 tracking-tight drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
            ₹{totalCost}{' '}
            <span className="text-xs font-mono font-normal text-slate-500">/ {hoursSelected} HRS</span>
          </span>
        </div>
        <button
          onClick={() => onReserve(spot, totalCost, hoursSelected)}
          id="btn-reserve-spot"
          className="flex-1 max-w-[240px] bg-cyan-400 hover:bg-cyan-300 text-black py-4 rounded-xl font-mono uppercase tracking-widest font-bold text-xs shadow glow-cyan active:scale-95 transition-all text-center cursor-pointer"
        >
          Reserve Spot Now
        </button>
      </footer>
    </div>
  );
}
