/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HostProfile, ParkingSpot } from '../types';

interface HostHubDashboardProps {
  hostProfile: HostProfile;
  onListNewSpace: () => void;
  onToggleListingStatus: (spotId: string) => void;
  onBackToDriver: () => void;
  onOpenDriveBackup?: () => void;
}

export default function HostHubDashboard({
  hostProfile,
  onListNewSpace,
  onToggleListingStatus,
  onBackToDriver,
  onOpenDriveBackup,
}: HostHubDashboardProps) {
  const [earnings, setEarnings] = useState(hostProfile.totalEarnings);
  const [tab, setTab] = useState<'overview' | 'listings' | 'earnings' | 'messages'>('overview');

  const claimBonusEarnings = () => {
    // Interactive earning update!
    setEarnings((prev) => prev + 150);
  };

  return (
    <div className="bg-[#050508] text-white min-h-[100dvh] pb-32 font-sans select-none antialiased relative overflow-x-hidden">
      {/* Background Decorators */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[15%] left-[10%]"></div>
      <div className="orb bottom-[20%] right-[10%] bg-radial from-cyan-400/20 to-transparent"></div>

      {/* TopAppBar */}
      <header className="bg-[#0a0a14]/65 backdrop-blur-xl sticky top-0 z-50 w-full border-b border-white/5 shadow-md">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
              <img
                alt="Host photo"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDigNdjYo25V_DYlHCMWqV3DVT4Xp-I_6-2eIqUM0WgtArxltAfg-HKfij0mzTdu0gMef36kNCuxxdce_gng2SIFTAmZovRBHgAf1nokj1kYWUz5fHQr7TSzC-Hk_dlr4Smivum36OLHRTerW-dcy2rPVliVap6DRJnSNOmm8-zp7qHc2MQd39AIcItdw2GB6bs9EewqvUKjbThIVAheJDIxrrnkZje9W_WYzbgssfMQOj0jV0LCAeH3jfC2_LaNehTMmJ3d_fMgpQ"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-['Space_Grotesk'] font-black text-white text-2xl tracking-tighter">
              <span className="text-cyan-400">H</span>ost Hub
            </span>
          </div>
          <div className="flex items-center gap-4">
            {onOpenDriveBackup && (
              <button
                onClick={onOpenDriveBackup}
                className="text-cyan-400 hover:text-cyan-300 font-mono font-bold text-[9px] uppercase tracking-widest bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                ☁ Sync Drive
              </button>
            )}
            <button
              onClick={onBackToDriver}
              className="text-black font-mono font-bold text-[9px] uppercase tracking-widest bg-cyan-400 hover:bg-cyan-300 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer glow-cyan"
            >
              Switch to Driver
            </button>
            <button className="text-slate-400 hover:text-cyan-400 transition-colors">
              🔔
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 pb-32 relative z-10">
        {/* Welcome Block Category */}
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="text-center md:text-left">
            <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-400 font-bold mb-1">
              Welcome Back
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight font-['Space_Grotesk'] text-white">
              Your Metropolis Pulse.
            </h1>
          </div>
          <button
            onClick={onListNewSpace}
            id="btn-list-new-space"
            className="flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black px-7 py-3.5 rounded-xl font-mono uppercase tracking-widest text-xs font-bold shadow-lg shadow-cyan-400/10 hover:opacity-95 active:scale-95 transition-all cursor-pointer mx-auto md:mx-0 glow-cyan"
          >
            <span>+ List New Space</span>
          </button>
        </section>

        {tab === 'overview' && (
          <div className="space-y-10 animate-fade-in">
            {/* Bento Grid Earnings and count stats */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Earnings column */}
              <div className="md:col-span-2 glass-panel p-7 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10 w-full">
                  <h3 className="text-slate-500 font-mono font-bold text-[9px] uppercase tracking-wider mb-4">
                    Total Earnings
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tighter text-white tabular-nums font-['Space_Grotesk'] drop-shadow-[0_0_10px_rgba(34,211,238,0.25)]">
                      ₹{earnings.toLocaleString()}
                    </span>
                    <span className="text-cyan-400 font-mono font-bold text-[9px] bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 rounded">
                      +12% THIS MONTH
                    </span>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 w-3/4 rounded-full glow-cyan"></div>
                    </div>
                    <button
                      onClick={claimBonusEarnings}
                      className="text-cyan-400 text-[9px] uppercase tracking-widest bg-cyan-400/10 border border-cyan-400/20 hover:bg-cyan-400/25 font-mono font-bold py-1.5 px-3 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-center"
                    >
                      + Simulate Booking
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Bookings card */}
              <div className="glass-panel p-7 rounded-3xl flex flex-col justify-between border-t-2 border-cyan-400 shadow shadow-cyan-400/5">
                <h3 className="text-cyan-400 font-mono font-bold text-[9px] uppercase tracking-wider">
                  Pending Approvals
                </h3>
                <div className="mt-3">
                  <span className="text-5xl font-black text-white font-['Space_Grotesk'] drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">08</span>
                  <p className="text-slate-400 font-mono text-[9px] uppercase tracking-wider mt-1">Actions required today</p>
                </div>
                <button
                  onClick={() => alert('All reviews completed! No further pending details.')}
                  className="mt-4 flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[9px] uppercase tracking-wide hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Review Spaces List →
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Active list column */}
              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-['Space_Grotesk'] font-bold text-white">
                    Active Listings
                  </h2>
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-400 rounded-lg text-[8px] font-mono font-bold uppercase tracking-wider">
                    {hostProfile.listings.length} SPACES
                  </span>
                </div>

                <div className="space-y-4">
                  {hostProfile.listings.map((spot) => (
                    <div
                      key={spot.id}
                      className="group glass-panel p-4.5 rounded-3xl border border-white/5 hover:border-cyan-400/25 transition-all shadow-md"
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/5">
                          <img
                            alt={spot.name}
                            className="w-full h-full object-cover"
                            src={spot.image}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-start gap-1 pb-1">
                            <div>
                              <h4 className="text-sm font-bold truncate max-w-[180px] text-white">
                                {spot.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-mono tracking-wide truncate max-w-[170px] mt-0.5">
                                📍 {spot.location}
                              </p>
                            </div>
                            <button
                              onClick={() => onToggleListingStatus(spot.id)}
                              className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition-all tracking-wider ${
                                spot.status === 'active'
                                  ? 'bg-cyan-400/10 border border-cyan-400/30 text-cyan-400'
                                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                              }`}
                              title="Click to toggle status"
                            >
                              {spot.status === 'active' ? 'Active' : 'Paused'}
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex gap-4 text-xs font-semibold">
                              <div>
                                <p className="text-[8px] uppercase tracking-wider font-mono font-bold text-slate-500">
                                  Price Rate
                                </p>
                                <p className="font-bold text-white font-mono">
                                  ₹{spot.pricePerHour}/hr
                                </p>
                              </div>
                              <div>
                                <p className="text-[8px] uppercase tracking-wider font-mono font-bold text-slate-500">
                                  Bookings
                                </p>
                                <p className="font-bold text-white font-mono">
                                  {spot.reviewCount > 0 ? spot.reviewCount : 12}
                                </p>
                              </div>
                            </div>
                            <span className="text-cyan-400 text-xs font-semibold hover:underline">Edit Details</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#0a0a14] border border-white/10 text-white p-5 rounded-3xl flex flex-col justify-between shadow-xl">
                  <h3 className="font-['Space_Grotesk'] font-bold text-lg mb-3 text-white">Quick Insights</h3>
                  <div className="space-y-3 font-semibold text-xs leading-normal">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-400">Peak Demand</span>
                      <span className="text-white font-mono text-[10px]">Sat, 2 PM - 8 PM</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-400">Avg. Occupancy</span>
                      <span className="text-cyan-400 font-mono text-[10px] drop-shadow-[0_0_5px_rgba(34,211,238,0.2)]">74%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Most Popular</span>
                      <span className="text-white font-mono text-[10px]">Indiranagar</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-white/5">
                  <h3 className="font-['Space_Grotesk'] font-bold text-lg mb-4 text-white">Live Feed</h3>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-cyan-400 text-black rounded-lg text-[8px] font-mono font-bold uppercase tracking-widest shadow glow-cyan">
                      <span className="w-1 h-1 bg-black rounded-full animate-pulse"></span>
                      ACTIVE NOW
                    </span>
                    <span className="font-bold text-white text-xs">3 Active Parkers</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2.5 text-xs bg-white/5 p-2 rounded-xl border border-white/5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 text-[10px] font-mono">
                        🚗
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white leading-none text-xs font-mono">
                          KA-01-MJ-2342
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono truncate mt-1">
                          Indiranagar • Ending in 42m
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {onOpenDriveBackup && (
                  <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-gradient-to-br from-cyan-400/5 to-transparent relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none"></div>
                    <h3 className="font-['Space_Grotesk'] font-bold text-sm text-white mb-1">Google Drive Sync</h3>
                    <p className="text-[10px] text-slate-400 font-sans leading-normal mb-3.5">
                      Backup and secure your custom host space listings, pricing logs, and calculated metrics safely onto Google Drive.
                    </p>
                    <button
                      onClick={onOpenDriveBackup}
                      className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all shadow glow-cyan text-center cursor-pointer"
                    >
                      ☁ Configure Drive Backups
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'listings' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-white">My Spaces ({hostProfile.listings.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hostProfile.listings.map((spot) => (
                <div key={spot.id} className="glass-panel p-4 rounded-3xl border border-white/5 shadow">
                  <img src={spot.image} alt={spot.name} className="w-full h-32 object-cover rounded-2xl mb-3 border border-white/5" />
                  <h3 className="font-bold text-sm mb-1 text-white">{spot.name}</h3>
                  <p className="text-xs text-slate-400 mb-3 font-mono">📍 {spot.location}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold font-mono text-cyan-400">₹{spot.pricePerHour}/hr</span>
                    <button
                      onClick={() => onToggleListingStatus(spot.id)}
                      className={`px-3 py-1 bg-white/5 border border-white/5 rounded-lg hover:border-cyan-400 text-slate-400 transition-colors cursor-pointer text-[10px] font-mono ${
                        spot.status === 'active' ? 'text-cyan-400 bg-cyan-400/5 border-cyan-400/20' : 'text-rose-400 bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      {spot.status === 'active' ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'earnings' && (
          <div className="glass-panel p-8 rounded-3xl border border-white/5 text-center shadow max-w-md mx-auto animate-fade-in">
            <span className="text-4xl mb-4 block">📈</span>
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white mb-2">Simulated Balance</h2>
            <p className="text-xs text-slate-400 mb-4 font-sans max-w-xs mx-auto">Earnings accrued are automatically credited to your associated debit bank account weekly.</p>
            <div className="text-4xl font-extrabold text-cyan-400 font-['Space_Grotesk'] drop-shadow-[0_0_10px_rgba(34,211,238,0.25)] mb-6">₹{earnings.toLocaleString()}</div>
            <button onClick={() => alert('Simulated withdrawal success!')} className="px-6 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold uppercase tracking-widest text-xs rounded-xl glow-cyan cursor-pointer">Simulate Withdraw</button>
          </div>
        )}

        {tab === 'messages' && (
          <div className="glass-panel p-8 rounded-3xl border border-white/5 text-center shadow max-w-md mx-auto animate-fade-in">
            <span className="text-4xl mb-4 block">💬</span>
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white mb-2">Host Messageboard</h2>
            <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-xs mx-auto">No active messages from drivers. When customers ping about availability or directions, chats load here.</p>
          </div>
        )}
      </main>

      {/* Embedded Navigation Bar matching Host Hub active tab structure */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 pb-4 bg-[#0a0a14]/90 backdrop-blur-md border-t border-white/5 h-20 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setTab('overview')}
          className={`flex flex-col items-center justify-center px-6 py-2 cursor-pointer ${
            tab === 'overview' ? 'bg-cyan-400 text-black rounded-xl glow-cyan font-bold scale-102 hover:bg-cyan-300 transition-all shadow' : 'text-slate-400 hover:text-cyan-400 font-semibold'
          }`}
        >
          <span className="text-sm">📊</span>
          <span className="text-[9px] uppercase tracking-wide font-mono font-extrabold mt-0.5">Overview</span>
        </button>

        <button
          onClick={() => setTab('listings')}
          className={`flex flex-col items-center justify-center px-6 py-2 cursor-pointer ${
            tab === 'listings' ? 'bg-cyan-400 text-black rounded-xl glow-cyan font-bold scale-102 hover:bg-cyan-300 transition-all shadow' : 'text-slate-400 hover:text-cyan-400 font-semibold'
          }`}
        >
          <span className="text-sm">🗺️</span>
          <span className="text-[9px] uppercase tracking-wide font-mono font-extrabold mt-0.5">Listings</span>
        </button>

        <button
          onClick={() => setTab('earnings')}
          className={`flex flex-col items-center justify-center px-6 py-2 cursor-pointer ${
            tab === 'earnings' ? 'bg-cyan-400 text-black rounded-xl glow-cyan font-bold scale-102 hover:bg-cyan-300 transition-all shadow' : 'text-slate-400 hover:text-cyan-400 font-semibold'
          }`}
        >
          <span className="text-sm">💸</span>
          <span className="text-[9px] uppercase tracking-wide font-mono font-extrabold mt-0.5">Earnings</span>
        </button>

        <button
          onClick={() => setTab('messages')}
          className={`flex flex-col items-center justify-center px-6 py-2 cursor-pointer ${
            tab === 'messages' ? 'bg-cyan-400 text-black rounded-xl glow-cyan font-bold scale-102 hover:bg-cyan-300 transition-all shadow' : 'text-slate-400 hover:text-cyan-400 font-semibold'
          }`}
        >
          <span className="text-sm">💬</span>
          <span className="text-[9px] uppercase tracking-wide font-mono font-extrabold mt-0.5">Messages</span>
        </button>
      </nav>
    </div>
  );
}
