/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ParkingSpot, UserProfile } from '../types';
import LiveGoogleMap from './LiveGoogleMap';
import LiveOpenStreetMap from './LiveOpenStreetMap';

interface DriverDiscoveryProps {
  user: UserProfile;
  spots: ParkingSpot[];
  onSelectSpot: (spot: ParkingSpot) => void;
  onOpenProfile: () => void;
  onOpenBookings: () => void;
  onOpenMessages?: () => void;
  activeSessionId: string | null;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function DriverDiscovery({
  user,
  spots,
  onSelectSpot,
  onOpenProfile,
  onOpenBookings,
  activeSessionId,
}: DriverDiscoveryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'garage' | 'driveway' | 'parking_lot'>('all');
  const [spotsLeftCounter, setSpotsLeftCounter] = useState(124);
  const [viewMode, setViewMode] = useState<'cyber' | 'osm' | 'live'>(hasValidKey ? 'live' : 'osm');

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleFetchLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        console.error('Error fetching position:', error);
        let errorMsg = 'Unable to fetch your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enable location access in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setLocationError(errorMsg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };


  const filteredSpots = spots.filter((spot) => {
    const matchesSearch =
      spot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spot.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || spot.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const triggerUpdateNow = () => {
    const randomized = Math.floor(100 + Math.random() * 50);
    setSpotsLeftCounter(randomized);
  };

  return (
    <div className="bg-[#050508] min-h-[100dvh] pb-32 text-white font-sans antialiased relative overflow-x-hidden">
      {/* Background Decorators */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[30%] left-[10%]"></div>
      <div className="orb bottom-[20%] right-[5%] bg-radial from-cyan-400 to-transparent"></div>

      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a14]/65 backdrop-blur-xl border-b border-white/5 shadow-md flex justify-between items-center px-6 h-16 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 cursor-pointer hover:border-cyan-400 active:scale-95 transition-all"
          >
            <img
              alt="User Profile avatar"
              className="w-full h-full object-cover filter brightness-95"
              src={user.avatar}
              referrerPolicy="no-referrer"
            />
          </button>
          <h1 className="font-['Space_Grotesk'] font-bold text-2xl text-white tracking-tighter flex items-center gap-1.5">
            <span className="text-cyan-400">P</span>arkit
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfile}
            className="text-cyan-400 font-mono font-bold text-[10px] tracking-wider uppercase border border-cyan-400/20 bg-cyan-400/5 px-3.5 py-1.5 rounded-xl hover:bg-cyan-400/15 transition-all select-none cursor-pointer"
          >
            Dashboard
          </button>
          <button className="text-slate-400 hover:text-cyan-400 transition-colors relative cursor-pointer active:scale-90">
            🔔
            {activeSessionId && (
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,211,238,1)]" />
            )}
          </button>
        </div>
      </nav>

      <main className="pt-16 pb-24 relative z-10">
        {/* Interactive map visualization section */}
        <section className="relative h-[480px] w-full overflow-hidden shadow-inner bg-[#06060c] border-b border-white/5">
          {viewMode === 'live' ? (
            <LiveGoogleMap spots={filteredSpots} onSelectSpot={onSelectSpot} userCoords={userCoords} />
          ) : viewMode === 'osm' ? (
            <LiveOpenStreetMap spots={filteredSpots} onSelectSpot={onSelectSpot} userCoords={userCoords} />
          ) : (
            <>
              <div className="absolute inset-0 select-none">
                {/* Grayscale styled minimalist Bangalore map visual - inverted and made dark for matrix cyber effect */}
                <img
                  className="w-full h-full object-cover opacity-20 mix-blend-screen filter invert brightness-125 contrast-125"
                  alt="Indiranagar Koramangala local map overlay"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWU8ML5Py8Nnbdf8OlcpIREYwjzx7d4bBHarkwRDGnEY-iyKLgXTApdnbnwacZi8G41SdIsnK7L8UXKwSdB0Z8O2elHbwdjux81fyBWX_XSMYqn42LbxbPeYjPx6rHAhRPydksOBwu9ytL3axdeH-vxYxqL_2-DTSH3ywSbTl_lv_MQG0otuyzBaIFEnnXOoK9UhFkT1PTraSbSyTCFaumi85242hiDqUvhAU6v_5pEn0RJERJzqhkQAY9hi4swbEzOQi_aqD7Kks"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050508] pointer-events-none" />
              </div>

              {/* Interactive Simulated Map Pins */}
              {filteredSpots.map((spot, i) => {
                const coordinates = [
                  { top: '35%', left: '26%' },
                  { top: '46%', left: '62%' },
                  { top: '24%', left: '74%' },
                  { top: '68%', left: '42%' },
                  { top: '55%', left: '18%' },
                ];
                const pos = coordinates[i % coordinates.length];
                const isSpecial = spot.id === 'metro-park-indiranagar';

                return (
                  <div
                    key={spot.id}
                    onClick={() => onSelectSpot(spot)}
                    className="absolute z-10 group cursor-pointer active:scale-95 transition-transform"
                    style={{ top: pos.top, left: pos.left }}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold shadow-xl flex items-center gap-0.5 transition-all border ${
                          isSpecial
                            ? 'bg-cyan-400 text-black border-cyan-300 glow-cyan scale-110'
                            : 'bg-[#0a0a14] text-white border-white/10 hover:border-cyan-400 hover:text-[#22d3ee]'
                        }`}
                      >
                        <span>₹{spot.pricePerHour}</span>
                        {spot.amenities.includes('EV Charging') && (
                          <span className="text-[10px]" title="EV Charging Station">
                            ⚡
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-[1px] h-2 mx-auto ${
                          isSpecial ? 'bg-cyan-400' : 'bg-white/10'
                        }`}
                      />
                      {isSpecial && (
                        <div className="bg-[#050508]/95 backdrop-blur-md border border-white/10 p-1.5 rounded-lg text-[9px] font-mono text-slate-300 whitespace-nowrap shadow mt-1">
                          📍 Indiranagar 12th Main
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Current location blue beacon Indicator */}
              <div className="absolute top-[52%] left-[43%] z-10 select-none">
                <div className="w-6 h-6 bg-cyan-400 rounded-full border-2 border-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.7)] flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-30"></div>
                  <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                </div>
              </div>
            </>
          )}

          {/* Floated Search Overlay Box (floating on top of canvas) */}
          <div className="absolute top-6 left-0 right-0 px-6 z-20 transition-all">
            <div className="max-w-md mx-auto flex gap-2.5">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">
                  🔍
                </span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-14 pl-11 pr-4 bg-[#0e0e18]/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl text-xs text-white focus:outline-none focus:border-cyan-400 font-medium placeholder-slate-500 transition-all font-mono"
                  placeholder="Search parking in Bangalore..."
                  type="text"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  const types: ('all' | 'garage' | 'driveway' | 'parking_lot')[] = [
                    'all',
                    'garage',
                    'driveway',
                    'parking_lot',
                  ];
                  const idx = types.indexOf(filterType);
                  setFilterType(types[(idx + 1) % types.length]);
                }}
                className="w-14 h-14 bg-[#0e0e18]/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center text-lg text-cyan-400 hover:border-cyan-400 active:scale-90 transition-all cursor-pointer select-none"
                title={`Current filter: ${filterType}. Click to change.`}
              >
                ⚙️
              </button>
            </div>

            {/* Filter Pill Info overlay */}
            {filterType !== 'all' && (
              <div className="max-w-md mx-auto mt-2 px-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-400/10 border border-cyan-400/30 text-[#22d3ee] text-[9px] font-mono uppercase rounded-lg tracking-wider shadow">
                  Filter: {filterType.replace('_', ' ')}
                  <button onClick={() => setFilterType('all')} className="font-bold text-xs ml-1 hover:text-white cursor-pointer">
                    ✕
                  </button>
                </span>
              </div>
            )}

            {locationError && (
              <div className="max-w-md mx-auto mt-2 px-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-rose-400 text-[9px] font-mono uppercase rounded-lg tracking-wider shadow">
                  ⚠️ {locationError}
                  <button onClick={() => setLocationError(null)} className="font-bold text-xs ml-1 hover:text-rose-200 cursor-pointer">
                    ✕
                  </button>
                </span>
              </div>
            )}

            {userCoords && (
              <div className="max-w-md mx-auto mt-2 px-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono uppercase rounded-lg tracking-wider shadow">
                  🛰️ GPS Active: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
                  <button onClick={() => setUserCoords(null)} className="font-bold text-xs ml-1 hover:text-white cursor-pointer" title="Reset/clear live location">
                    ✕
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Geolocation Fetcher Trigger Overlay */}
          <div className="absolute bottom-36 right-6 z-20 select-none">
            <button
              onClick={handleFetchLiveLocation}
              disabled={isLocating}
              className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-2xl bg-[#0a0a14]/95 backdrop-blur-md ${
                isLocating
                  ? 'border-cyan-400 text-cyan-400 animate-pulse'
                  : userCoords
                  ? 'border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:border-cyan-300'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
              title="Locate live physical GPS position"
            >
              {isLocating ? (
                <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-base">🎯</span>
              )}
            </button>
          </div>

          {/* Map Technology Switch Pivot Overlay */}
          <div className="absolute bottom-20 right-6 z-20 flex gap-1 p-1 bg-[#0a0a14]/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl select-none">
            <button
              onClick={() => setViewMode('cyber')}
              className={`px-3 py-2 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                viewMode === 'cyber'
                  ? 'bg-white/5 text-cyan-400 border border-cyan-400/20 shadow-inner'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              📟 Cyber Grid
            </button>
            <button
              onClick={() => setViewMode('osm')}
              className={`px-3 py-2 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'osm'
                  ? 'bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              🌐 Open-Source
            </button>
            <button
              onClick={() => setViewMode('live')}
              className={`px-3 py-2 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'live'
                  ? 'bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              🗺️ Live GPS
              {hasValidKey && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
            </button>
          </div>
        </section>


        {/* Recommended Nearby Horizontal Stream Section */}
        <section className="-mt-16 relative z-20 px-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-cyan-400 font-mono font-bold text-[10px] tracking-widest uppercase mb-0.5 block">
                YOUR CITY REGIONS
              </span>
              <h2 className="text-2xl font-['Space_Grotesk'] font-bold text-white tracking-tight">
                Recommended Nearby
              </h2>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-none select-none">
            {filteredSpots.length === 0 ? (
              <div className="min-w-[280px] bg-white/[0.01] p-6 rounded-2xl border border-white/5 text-center text-slate-500 font-mono text-xs">
                No active spots found matching filters.
              </div>
            ) : (
              filteredSpots.map((spot) => (
                <div
                  key={spot.id}
                  onClick={() => onSelectSpot(spot)}
                  className="min-w-[290px] bg-[#0d0e1a]/40 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-3.5 shadow-md border border-white/5 hover:border-cyan-400/30 transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/10">
                    <img
                      alt={spot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform filter brightness-90"
                      src={spot.image}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex justify-between items-start gap-1 pb-1">
                      <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm truncate">
                        {spot.name}
                      </h3>
                      <div className="bg-amber-400/5 border border-amber-400/10 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 flex-shrink-0">
                        <span className="text-amber-400 text-[9px]">⭐</span>
                        <span className="text-amber-400 text-[9px] font-extrabold font-mono">
                          {spot.ratings}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mb-2 font-mono">
                      {spot.location}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-extrabold text-xs font-mono">
                        ₹{spot.pricePerHour}
                        <span className="text-[9px] text-slate-500 font-normal">/hr</span>
                      </span>
                      <span
                        className={`text-[8px] font-extrabold font-mono uppercase px-2 py-0.5 rounded-md tracking-wider border ${
                          spot.status === 'filling_fast'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : spot.status === 'cheap'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {spot.status === 'filling_fast'
                          ? 'Filling Fast'
                          : spot.status === 'cheap'
                          ? 'Budget'
                          : 'Available'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Stats Bento grid */}
        <section className="px-6 mt-6">
          <h3 className="font-['Space_Grotesk'] font-bold text-lg mb-3">Live Fleet Analytics</h3>
          <div className="grid grid-cols-2 gap-4 select-none">
            <div className="col-span-1 bg-gradient-to-br from-[#0a0f1d] to-[#04050a] border border-white/5 text-white p-5 rounded-2xl flex flex-col justify-between min-h-[140px] relative overflow-hidden shadow-xl">
              <span className="absolute -bottom-4 -right-4 text-7xl opacity-[0.03] select-none pointer-events-none">🅿️</span>
              <div className="z-10">
                <p className="font-['Space_Grotesk'] font-black text-3xl mb-0.5 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.25)]">
                  {spotsLeftCounter}
                </p>
                <p className="text-[8px] font-mono font-bold uppercase tracking-widest text-[#22d3ee] mb-3">
                  Online Spots
                </p>
              </div>
              <button
                onClick={triggerUpdateNow}
                className="bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-[8px] uppercase tracking-wider rounded-xl px-3 py-1.5 w-fit z-15 cursor-pointer glow-cyan transition-colors"
              >
                Scan Sensors
              </button>
            </div>

            <div className="col-span-1 flex flex-col gap-3">
              <div className="bg-[#0d0e1a]/40 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    Active Passes
                  </p>
                  <p className="font-['Space_Grotesk'] font-bold text-white text-xs">
                    {activeSessionId ? '1 Active Drive' : '0 sessions'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400 font-bold text-xs border border-cyan-400/20">
                  ⏱️
                </div>
              </div>

              <div className="bg-[#0d0e1a]/40 border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    My Favorites
                  </p>
                  <p className="font-['Space_Grotesk'] font-bold text-white text-xs">
                    12 Places Saved
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-400/5 flex items-center justify-center text-amber-400 font-bold text-xs border border-amber-400/10">
                  ⭐
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Embedded Navigation Bar matching the Driver mock details */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 pb-4 bg-[#0a0a14]/90 backdrop-blur-md border-t border-white/5 h-20 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center bg-cyan-400 text-black rounded-2xl px-6 py-2.5 scale-102 transition-transform duration-200 cursor-pointer glow-cyan"
        >
          <span className="text-base">🗺️</span>
          <span className="font-sans text-[9px] font-extrabold uppercase mt-1 tracking-widest">
            FIND
          </span>
        </button>

        <button
          onClick={onOpenBookings}
          className="flex flex-col items-center justify-center text-slate-400 hover:text-cyan-400 px-6 py-2.5 transition-colors cursor-pointer"
        >
          <span className="text-sm">📋</span>
          <span className="font-sans text-[9px] font-bold uppercase mt-1 tracking-widest">
            PASSES
          </span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center text-slate-400 hover:text-cyan-400 px-6 py-2.5 transition-colors cursor-pointer"
        >
          <span className="text-sm">👤</span>
          <span className="font-sans text-[9px] font-bold uppercase mt-1 tracking-widest">
            PROFILE
          </span>
        </button>
      </nav>
    </div>
  );
}
