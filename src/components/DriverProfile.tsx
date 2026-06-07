/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Vehicle } from '../types';
import { uploadFileToStorage } from '../firebase';

interface DriverProfileProps {
  user: UserProfile;
  onAddVehicle: (newVehicle: Vehicle) => void;
  onBackToFind: () => void;
  onBackToBookings: () => void;
  onBecomeHost: () => void;
  onLogout: () => void;
  onOpenDriveBackup?: () => void;
  onUpdateAvatar?: (newUrl: string) => void;
}

export default function DriverProfile({
  user,
  onAddVehicle,
  onBackToFind,
  onBackToBookings,
  onBecomeHost,
  onLogout,
  onOpenDriveBackup,
  onUpdateAvatar,
}: DriverProfileProps) {
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [isElectric, setIsElectric] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [showLegalModal, setShowLegalModal] = useState(false);

  const [localNotification, setLocalNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setLocalNotification({ message, type });
  };

  useEffect(() => {
    if (!localNotification) return;
    const t = setTimeout(() => setLocalNotification(null), 3500);
    return () => clearTimeout(t);
  }, [localNotification]);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setAvatarError('Only images are allowed.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Image size must be under 3MB.');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');
    try {
      const storagePath = `avatars/${Date.now()}_${file.name}`;
      const downloadUrl = await uploadFileToStorage(storagePath, file);
      if (onUpdateAvatar) {
        onUpdateAvatar(downloadUrl);
      }
    } catch (err: any) {
      console.error(err);
      setAvatarError(err.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const triggerAvatarInput = () => {
    if (avatarUploading) return;
    avatarInputRef.current?.click();
  };

  const handleAddNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel.trim() || !newPlate.trim()) {
      triggerNotification('Please fill out all fields.', 'error');
      return;
    }
    const vehicle: Vehicle = {
      id: `v-${Date.now()}`,
      model: newModel,
      plate: newPlate.toUpperCase(),
      isElectric,
    };
    onAddVehicle(vehicle);
    triggerNotification(`Successfully registered ${vehicle.model}!`, 'success');
    setNewModel('');
    setNewPlate('');
    setShowAddVehicleModal(false);
  };

  return (
    <div className="bg-[#050508] text-white min-h-[100dvh] pb-32 font-sans select-none antialiased relative overflow-x-hidden">
      {/* Background Decorators */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[20%] left-[5%]"></div>
      <div className="orb bottom-[10%] right-[15%] bg-radial from-cyan-400 to-transparent"></div>

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-45 bg-[#0a0a14]/65 backdrop-blur-xl border-b border-white/5 shadow-md flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-3">
          <img
            alt="Short user portrait icon"
            className="w-8 h-8 rounded-lg object-cover border border-white/10"
            src={user.avatar}
            referrerPolicy="no-referrer"
          />
          <span className="text-2xl font-bold tracking-tighter text-white font-['Space_Grotesk'] cursor-pointer flex items-center gap-1" onClick={onBackToFind}>
            <span className="text-cyan-400">P</span>arkit
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenDriveBackup && (
            <button
              onClick={onOpenDriveBackup}
              className="text-cyan-400 hover:text-cyan-300 font-mono font-bold text-[9px] uppercase tracking-widest bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              ☁ Sync Drive
            </button>
          )}
          <button
            onClick={onBecomeHost}
            className="text-black font-mono font-bold text-[9px] uppercase tracking-widest bg-cyan-400 hover:bg-cyan-300 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer glow-cyan"
          >
            Switch to Host
          </button>
          <button className="text-slate-400 hover:text-cyan-400 font-bold text-sm">🔔</button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-lg mx-auto relative z-10">
        {/* Profile Card details */}
        <section className="mb-8 text-center md:text-left flex flex-col md:flex-row items-center md:gap-6">
          <div className="relative inline-block mb-3 md:mb-0 group cursor-pointer" onClick={triggerAvatarInput}>
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-cyan-400/20 group-hover:border-cyan-400 transition-colors shadow-md">
              <img
                alt={`${user.name} Portrait`}
                className={`w-full h-full object-cover transition-all ${avatarUploading ? 'brightness-50 blur-sm' : 'group-hover:scale-105'}`}
                src={user.avatar}
                referrerPolicy="no-referrer"
              />
              {avatarUploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <span className="text-[14px]">📸</span>
                  <span className="text-[8px] font-mono font-black tracking-widest text-cyan-400 mt-0.5">UPDATE</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-black px-2.5 py-0.5 rounded-lg text-[8px] font-mono font-black uppercase tracking-widest shadow glow-cyan">
              PRO
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-['Space_Grotesk']">
              {user.name}
            </h1>
            <p className="text-slate-400 text-xs font-semibold">{user.email}</p>
            {avatarError && (
              <p className="text-red-400 text-[10px] font-mono mt-1">⚠️ {avatarError}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start font-mono text-[9px] leading-none mb-1">
              <span className="bg-white/5 border border-white/10 text-slate-400 px-3 py-1.5 rounded-lg">
                SINCE {user.memberSince}
              </span>
              <span className="bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 px-3 py-1.5 rounded-lg flex items-center gap-1 leading-none">
                ✓ VERIFIED DRIVER
              </span>
            </div>
          </div>
        </section>

        {/* Bento statistical metrics */}
        <section className="grid grid-cols-2 gap-4 mb-8 select-none font-bold">
          <div className="glass-panel p-4.5 rounded-3xl border border-white/5 shadow">
            <span className="text-lg">🚗</span>
            <div className="text-2xl font-['Space_Grotesk'] font-bold text-cyan-400 mt-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
              {user.vehicles.length}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono font-bold mt-1">
              Vehicles Active
            </div>
          </div>
          <div className="glass-panel p-4.5 rounded-3xl border border-white/5 shadow">
            <span className="text-lg">🅿️</span>
            <div className="text-2xl font-['Space_Grotesk'] font-bold text-cyan-400 mt-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
              142
            </div>
            <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono font-bold mt-1">
              Parks Completed
            </div>
          </div>
        </section>

        {/* My Vehicles list section wrapper */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Active Fleet</h2>
            <button
              onClick={() => setShowAddVehicleModal(true)}
              className="text-cyan-400 font-mono text-[9px] uppercase font-bold flex items-center gap-1 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <span>+ Add Vehicle</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm border border-white/5">
            {user.vehicles.map((v) => (
              <div
                key={v.id}
                className="p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-b-0"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center text-sm border border-cyan-400/20">
                  {v.isElectric ? '⚡' : '🚙'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs truncate text-white">{v.model}</div>
                  <div className="text-[10px] text-slate-500 font-mono tracking-wide mt-0.5">
                    {v.plate}
                  </div>
                </div>
                <span className="text-cyan-400 font-bold">✓</span>
              </div>
            ))}
          </div>
        </section>

        {onOpenDriveBackup && (
          <section className="mb-8">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-3">Google Drive Integration</h2>
            <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-gradient-to-br from-cyan-400/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none"></div>
              <h3 className="font-['Space_Grotesk'] font-bold text-sm text-white mb-1">Drive Cloud Backups</h3>
              <p className="text-[10px] text-slate-400 font-sans leading-normal mb-3.5">
                Maintain and sync your vehicle inventory, profile files, and bookmarks directly in your Google Drive folder for safe keeping.
              </p>
              <button
                onClick={onOpenDriveBackup}
                className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all shadow glow-cyan text-center cursor-pointer"
              >
                ☁ Sync Profile to Drive
              </button>
            </div>
          </section>
        )}

        {/* Payment options wrapper list */}
        <section className="mb-8 select-none">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-3">Linked Payments</h2>
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm border border-white/5">
            {user.paymentMethods.map((p) => (
              <div
                key={p.id}
                className="p-4 flex items-center gap-3 border-b border-white/5 last:border-0 hover:bg-white/[0.01]"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-400 text-black flex items-center justify-center text-sm font-bold glow-cyan">
                  {p.type === 'card' ? '💳' : '🍎'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs text-white">{p.label}</div>
                  {p.expiry && (
                    <div className="text-[8px] text-slate-500 font-bold font-mono uppercase tracking-widest mt-0.5">
                      EXPIRES {p.expiry}
                    </div>
                  )}
                </div>
                {p.isDefault && (
                  <span className="bg-cyan-500/10 border border-cyan-500/20 text-[#22d3ee] text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-wider">
                    DEFAULT
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Support items card list menu */}
        <section className="mb-10">
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm border border-white/5">
            <div
              onClick={() => triggerNotification('Displaying historic account billing (simulated)...', 'info')}
              className="p-4 flex items-center gap-3.5 hover:bg-white/[0.02] border-b border-white/5 transition-colors cursor-pointer text-xs font-semibold text-slate-300"
            >
              <span>📑</span>
              <div className="flex-1 text-white">Session Transaction History</div>
              <span className="text-slate-600 font-mono">→</span>
            </div>

            <div
              onClick={() => triggerNotification('Opening live support ticketing portal (simulated)...', 'info')}
              className="p-4 flex items-center gap-3.5 hover:bg-white/[0.02] border-b border-white/5 transition-colors cursor-pointer text-xs font-semibold text-slate-300"
            >
              <span>🤝</span>
              <div className="flex-1 text-white">Customer Support Center</div>
              <span className="text-slate-600 font-mono">→</span>
            </div>

            <div
              onClick={onBecomeHost}
              className="p-4 flex items-center gap-3.5 hover:bg-white/[0.02] border-b border-white/5 transition-colors cursor-pointer text-xs font-semibold text-slate-300"
            >
              <span>💰</span>
              <div className="flex-1 text-cyan-400 font-extrabold font-mono">Switch to Host Console</div>
              <span className="text-cyan-400">→</span>
            </div>

            <div
              onClick={() => setShowLegalModal(true)}
              className="p-4 flex items-center gap-3.5 hover:bg-white/[0.02] border-b border-white/5 transition-colors cursor-pointer text-xs font-semibold text-slate-300"
            >
              <span>⚖️</span>
              <div className="flex-1 text-white">Legal, Grievance & Play Store Info</div>
              <span className="text-slate-600 font-mono">→</span>
            </div>

            <div
              onClick={onLogout}
              className="p-4 flex items-center gap-3.5 bg-rose-500/10 hover:bg-rose-500/15 transition-colors cursor-pointer text-xs font-bold text-rose-400"
            >
              <span>🚪</span>
              <div className="flex-grow">Sign Out of Parkzone</div>
            </div>
          </div>
        </section>

        <p className="text-center text-[9px] text-slate-600 font-mono font-bold uppercase tracking-widest leading-none mb-10 select-none">
          App Version 4.2.1-stable
        </p>
      </main>

      {/* Embedded Navigation Bar containing active markers */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 pb-4 bg-[#0a0a14]/90 backdrop-blur-md border-t border-white/5 h-20 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={onBackToFind}
          className="flex flex-col items-center justify-center text-slate-400 hover:text-cyan-400 px-6 py-2.5 transition-colors cursor-pointer"
        >
          <span className="text-sm">🗺️</span>
          <span className="font-sans text-[9px] font-bold uppercase mt-1 tracking-widest">
            Find
          </span>
        </button>

        <button
          onClick={onBackToBookings}
          className="flex flex-col items-center justify-center text-slate-400 hover:text-cyan-400 px-6 py-2.5 transition-colors cursor-pointer"
        >
          <span className="text-sm">📋</span>
          <span className="font-sans text-[9px] font-bold uppercase mt-1 tracking-widest">
            PASSES
          </span>
        </button>

        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center bg-cyan-400 text-black rounded-2xl px-6 py-2.5 scale-102 transition-transform duration-200 cursor-pointer glow-cyan"
        >
          <span className="text-sm">👤</span>
          <span className="font-sans text-[9px] font-extrabold uppercase mt-1 tracking-widest">
            Profile
          </span>
        </button>
      </nav>

      {/* Simple, interactive modal to add vehicles */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-[#050508]/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#0a0a14] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-['Space_Grotesk'] font-bold text-lg mb-4 text-white">
              Add New Vehicle
            </h3>
            <form onSubmit={handleAddNewVehicle} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500 pl-1">
                  Model Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tesla Model 3"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none rounded-xl px-4 py-3 text-xs font-mono text-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500 pl-1">
                  License Plate
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KA-01-MG-1234"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none rounded-xl px-4 py-3 text-xs font-mono text-white transition-all"
                />
              </div>

              <div className="flex items-center gap-2 select-none py-1">
                <input
                  type="checkbox"
                  id="electricId"
                  checked={isElectric}
                  onChange={(e) => setIsElectric(e.target.checked)}
                  className="rounded text-cyan-400 focus:ring-cyan-400 w-4 h-4 border-white/10 bg-white/5"
                />
                <label htmlFor="electricId" className="text-xs font-semibold text-slate-400 cursor-pointer select-none">
                  This is an electric vehicle (EV)
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="flex-1 py-3 text-white bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-cyan-400 text-black rounded-xl text-xs font-mono font-bold hover:bg-cyan-300 transition-all active:scale-95 glow-cyan"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLegalModal && (
        <div className="fixed inset-0 bg-[#050508]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a14] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <h3 className="font-['Space_Grotesk'] font-bold text-base mb-3.5 text-white flex items-center gap-2">
              <span>⚖️</span> Compliance & Legal Details
            </h3>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-slate-300 font-sans text-[11px] leading-relaxed">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-mono font-bold text-cyan-400 uppercase tracking-wider block text-[9px] mb-1">
                  1. Privacy & Consent
                </span>
                <p className="text-slate-400 select-text">
                  Parkzone collects essential registration data (your linked Google account profile details, phone numbers, and vehicle plate numbers) solely to enable automated parking pass creation, gated entry camera recognition, and security verification. Location analytics are strictly used for finding nearest slots.
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-mono font-bold text-cyan-400 uppercase tracking-wider block text-[9px] mb-1">
                  2. Terms of Host Listing
                </span>
                <p className="text-slate-400 select-text">
                  Hosts in Bangalore agree to maintain accurate slot descriptions, clear access instructions, and honor designated pricing. All peer-to-peer parking spot bookings are locally managed. Parkzone is an intermediary interface on top of Google Cloud Run.
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-mono font-bold text-emerald-400 uppercase tracking-wider block text-[9px] mb-1 text-emerald-400">
                  3. Indian IT Act - Grievance Officer
                </span>
                <div className="text-slate-400 space-y-1 font-mono text-[10px] select-text">
                  <p><strong className="text-white">Officer:</strong> Rajesh Gowda</p>
                  <p><strong className="text-white">Designation:</strong> Grievance Redressal Officer, Parkzone India</p>
                  <p><strong className="text-white">Email:</strong> grievances@parkzone.in</p>
                  <p><strong className="text-white">Office:</strong> 80 Feet Rd, Koramangala 4th Block, Bengaluru, KA 560034</p>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-mono font-bold text-cyan-400 uppercase tracking-wider block text-[9px] mb-1">
                  4. Google Play Developer Policies
                </span>
                <p className="text-slate-400 select-text">
                  This application features a fully sandboxed/live backup integration using your personal Google Drive for total user data autonomy. Secure account generation utilizes official Google Firebase Authentication API endpoints.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLegalModal(false)}
              className="mt-5 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono font-bold text-white transition-colors cursor-pointer"
            >
              Close Documents
            </button>
          </div>
        </div>
      )}

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
                  : localNotification.type === 'error'
                  ? 'bg-[#1a0808]/95 border-rose-500/35 text-rose-300 shadow-rose-950/20'
                  : 'bg-[#070914]/95 border-cyan-500/35 text-cyan-300 shadow-cyan-950/20'
              }`}
            >
              <div className={`absolute inset-0 opacity-[0.04] pointer-events-none ${
                localNotification.type === 'success' ? 'bg-emerald-400' : localNotification.type === 'error' ? 'bg-rose-400' : 'bg-cyan-400'
              }`} />
              <div className="flex items-center gap-2.5 select-none relative z-10 w-full pr-1">
                <span className="text-sm">
                  {localNotification.type === 'success' ? '✨' : localNotification.type === 'error' ? '⚠️' : '🛸'}
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
