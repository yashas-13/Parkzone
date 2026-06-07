/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ParkingSpot } from '../types';
import AdBanner from './AdBanner';

interface SpotDetailsProps {
  spot: ParkingSpot;
  onBack: () => void;
  onReserve: (spot: ParkingSpot, totalRate: number, hours: number) => void;
  isSaved: boolean;
  onToggleSaved: (spotId: string) => void;
  allSpots?: ParkingSpot[];
  onSelectAlternative?: (spot: ParkingSpot) => void;
}

// Trigonometric Geodesic Distance (Haversine Formula) for precise Bangalore positioning
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's major radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCompassDirection(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360; // Normalize compass angle
  if (brng >= 337.5 || brng < 22.5) return 'North';
  if (brng >= 22.5 && brng < 67.5) return 'North-East';
  if (brng >= 67.5 && brng < 112.5) return 'East';
  if (brng >= 112.5 && brng < 157.5) return 'South-East';
  if (brng >= 157.5 && brng < 202.5) return 'South';
  if (brng >= 202.5 && brng < 247.5) return 'South-West';
  if (brng >= 247.5 && brng < 292.5) return 'West';
  return 'North-West';
}

export default function SpotDetails({
  spot,
  onBack,
  onReserve,
  isSaved,
  onToggleSaved,
  allSpots = [],
  onSelectAlternative,
}: SpotDetailsProps) {
  const [hoursSelected, setHoursSelected] = useState(3);
  const [localNotification, setLocalNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const triggerNotification = (message: string, type: 'success' | 'info' = 'info') => {
    setLocalNotification({ message, type });
  };

  useEffect(() => {
    if (!localNotification) return;
    const t = setTimeout(() => setLocalNotification(null), 3500);
    return () => clearTimeout(t);
  }, [localNotification]);

  const totalCost = spot.pricePerHour * hoursSelected;

  // Filter and compute alternatives nearby sorted by closest distance
  const alternatives = allSpots
    .filter((s) => s.id !== spot.id)
    .map((s) => {
      const distance = getDistanceInKm(spot.lat, spot.lng, s.lat, s.lng);
      const direction = getCompassDirection(spot.lat, spot.lng, s.lat, s.lng);
      const priceDiff = s.pricePerHour - spot.pricePerHour;
      return { spot: s, distance, direction, priceDiff };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3); // Top 3 closest alternatives

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
                  triggerNotification('Copied location of spot to clipboard!', 'success');
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
              triggerNotification(`Launching turn-by-turn navigation route to ${spot.name}!`, 'info')
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

        {/* AdMob Integration Banner */}
        <section className="px-5 mt-6 w-full flex justify-center">
          <AdBanner size="banner" />
        </section>

        {/* About location block */}
        <section className="px-5 mt-6 text-sm leading-relaxed">
          <h3 className="font-['Space_Grotesk'] font-bold text-lg mb-2 text-white">About this location</h3>
          <p className="text-slate-400 font-medium text-xs md:text-sm">{spot.description}</p>
        </section>

        {/* Alternative Parking Nearby Stream */}
        {alternatives.length > 0 && (
          <section className="px-5 mt-8 select-none">
            <div className="flex justify-between items-end mb-3.5">
              <div>
                <span className="text-cyan-400 font-mono font-bold text-[9px] tracking-widest uppercase mb-0.5 block">
                  COORDINATE DEVIATIONS
                </span>
                <h3 className="font-['Space_Grotesk'] font-bold text-lg text-white">
                  Alternative Parking Nearby
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Top {alternatives.length} closest</span>
            </div>

            <div className="space-y-3">
              {alternatives.map(({ spot: altSpot, distance, direction, priceDiff }) => (
                <div
                  key={altSpot.id}
                  onClick={() => onSelectAlternative && onSelectAlternative(altSpot)}
                  className="bg-[#0e0e18]/60 hover:bg-[#131326]/75 border border-white/5 hover:border-cyan-400/30 p-3.5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all active:scale-98 group shadow-lg"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-13 h-13 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 relative">
                      <img
                        src={altSpot.image}
                        alt={altSpot.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform filter brightness-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <h4 className="font-['Space_Grotesk'] font-bold text-xs text-white truncate max-w-[140px] group-hover:text-[#22d3ee] transition-colors">
                          {altSpot.name}
                        </h4>
                        <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                          {altSpot.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-cyan-400 font-mono font-bold flex items-center gap-0.5">
                          📍 {distance.toFixed(1)} km {direction}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-medium flex items-center gap-0.5">
                          ⭐ {altSpot.ratings}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right select-none">
                    <div className="font-['Space_Grotesk'] font-bold text-xs text-white">
                      ₹{altSpot.pricePerHour}
                      <span className="text-slate-500 font-mono font-normal text-[10px]">/hr</span>
                    </div>
                    {priceDiff < 0 ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-0.5">
                        ₹{Math.abs(priceDiff)} cheaper
                      </span>
                    ) : priceDiff > 0 ? (
                      <span className="text-[10px] font-mono font-semibold text-slate-500 mt-0.5">
                        +₹{priceDiff}/hr
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-semibold text-cyan-400/80 mt-0.5">
                        Same price
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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

      {/* Premium Local Animated Feedback Notification banner */}
      <AnimatePresence>
        {localNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed bottom-24 left-0 right-0 z-50 px-6 pointer-events-none"
          >
            <div
              className={`max-w-md mx-auto p-4 rounded-2xl backdrop-blur-xl border flex items-center justify-between shadow-2xl pointer-events-auto relative overflow-hidden ${
                localNotification.type === 'success'
                  ? 'bg-[#061814]/95 border-emerald-500/35 text-emerald-300 shadow-emerald-950/20'
                  : 'bg-[#070914]/95 border-cyan-500/35 text-cyan-300 shadow-cyan-950/20'
              }`}
            >
              <div className={`absolute inset-0 opacity-[0.04] pointer-events-none ${
                localNotification.type === 'success' ? 'bg-emerald-400' : 'bg-cyan-400'
              }`} />
              <div className="flex items-center gap-2.5 select-none relative z-10 w-full pr-1">
                <span className="text-sm">
                  {localNotification.type === 'success' ? '✨' : '🛸'}
                </span>
                <p className="text-[11px] font-sans font-semibold leading-snug">{localNotification.message}</p>
              </div>
              <button
                onClick={() => setLocalNotification(null)}
                className="text-white/40 hover:text-white font-bold text-xs p-1 cursor-pointer transition-colors relative z-10"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
