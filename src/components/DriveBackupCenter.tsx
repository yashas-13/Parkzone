/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  X,
  FileText,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  FileCode,
  HardDrive
} from 'lucide-react';
import { UserProfile, HostProfile } from '../types';
import {
  googleSignIn,
  logout as authLogout,
  initAuth,
  listDriveFiles,
  backupDataToDrive,
  downloadDataFromDrive,
  deleteFileFromDrive,
  DriveFile,
  getAccessToken
} from '../firebase';

interface DriveBackupCenterProps {
  userProfile: UserProfile;
  hostProfile: HostProfile;
  onRestoreUser: (restored: UserProfile) => void;
  onRestoreHost: (restored: HostProfile) => void;
  onClose: () => void;
}

export default function DriveBackupCenter({
  userProfile,
  hostProfile,
  onRestoreUser,
  onRestoreHost,
  onClose
}: DriveBackupCenterProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize auth trigger
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        fetchFiles();
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showNotification('success', `Connected as ${result.user.displayName || result.user.email}`);
        await fetchFiles();
      }
    } catch (error: any) {
      console.error('Sign-in failed:', error);
      showNotification('error', `Failed to connect: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await authLogout();
      setUser(null);
      setToken(null);
      setBackups([]);
      showNotification('success', 'Logged out from Google Workspace.');
    } catch (error: any) {
      showNotification('error', 'Logout failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const files = await listDriveFiles();
      setBackups(files);
    } catch (error: any) {
      console.error('Failed to grab files:', error);
      // If token expired, clear so user can re-authenticate
      if (error.message && error.message.includes('401')) {
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDriver = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const payload = {
        appIdentifier: 'parkzone_driver_state',
        backupTime: new Date().toISOString(),
        profile: userProfile,
      };
      await backupDataToDrive('parkzone_backup_driver.json', payload);
      showNotification('success', 'Driver settings and fleet successfully backed up to Google Drive!');
      await fetchFiles();
    } catch (error: any) {
      showNotification('error', `Driver backup error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupHost = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const payload = {
        appIdentifier: 'parkzone_host_state',
        backupTime: new Date().toISOString(),
        profile: hostProfile,
      };
      await backupDataToDrive('parkzone_backup_host.json', payload);
      showNotification('success', 'Host spaces registry successfully backed up to Google Drive!');
      await fetchFiles();
    } catch (error: any) {
      showNotification('error', `Host backup error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (file: DriveFile) => {
    const isHostFile = file.name.includes('host');
    const label = isHostFile ? 'Host listings and earnings' : 'Driver fleet, vehicle logs, and saved spots';
    
    const confirmRestore = window.confirm(
      `Restoring from "${file.name}" will overwrite your local ${label} state. Do you want to proceed?`
    );
    if (!confirmRestore) return;

    setLoading(true);
    try {
      const restoredPayload = await downloadDataFromDrive(file.id);
      if (restoredPayload.appIdentifier === 'parkzone_driver_state' || restoredPayload.appIdentifier === 'parkit_driver_state') {
        onRestoreUser(restoredPayload.profile);
        showNotification('success', 'Driver active fleet & saved spaces restored successfully!');
      } else if (restoredPayload.appIdentifier === 'parkzone_host_state' || restoredPayload.appIdentifier === 'parkit_host_state') {
        onRestoreHost(restoredPayload.profile);
        showNotification('success', 'Host listings and metrics restored successfully!');
      } else {
        throw new Error('Unrecognized Parkzone backup format.');
      }
    } catch (error: any) {
      showNotification('error', `Restore error: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file: DriveFile) => {
    // Mandated: Explicit user confirmation dialog before deleting user-owned data
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${file.name}" from your Google Drive? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await deleteFileFromDrive(file.id);
      showNotification('success', `Deleted "${file.name}" successfully.`);
      await fetchFiles();
    } catch (error: any) {
      showNotification('error', `Delete operations failed: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020204]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0c14] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl relative">
        {/* Background gradient flares */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between relative z-10 bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/20 text-cyan-400 flex items-center justify-center">
              <Cloud className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] font-black tracking-tight text-white text-base">Google Drive Cloud Sync</h3>
              <p className="text-[10px] text-slate-400 font-mono">WORKSPACE INTEGRATION GATEWAY</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex-grow space-y-6 relative z-10">
          {notification && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium animate-slide-up ${
                notification.type === 'success'
                  ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Account Status Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            {!user ? (
              <div className="text-center py-4">
                <HardDrive className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1.5">No Google Account Connected</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-normal">
                  Connect your Google Drive to enable cloud-hosted backups, synchronize listings, and securely safeguard active fleets or completed bookings across devices.
                </p>
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="mx-auto flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-black px-6 py-3 rounded-xl font-mono uppercase tracking-widest text-[10px] font-bold shadow-lg shadow-cyan-400/10 transition-all cursor-pointer glow-cyan disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt="User photo"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border border-cyan-400/30"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{user.displayName || 'Authorized User'}</span>
                      <span className="px-1.5 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded text-[7px] text-cyan-400 font-mono font-bold uppercase tracking-wider">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors font-mono text-[9px] uppercase tracking-wider bg-white/5 border border-white/5 px-3 py-2 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Backup Action Panel (Only if authenticated) */}
          {user && (
            <div className="space-y-3.5">
              <h4 className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-widest">Create New Backup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Driver Backup */}
                <button
                  onClick={handleBackupDriver}
                  disabled={loading}
                  className="flex flex-col items-start p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-cyan-400/30 hover:bg-white/[0.04] transition-all text-left group cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/10 text-cyan-400 flex items-center justify-center mb-3">
                    <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="font-bold text-xs text-white">Backup Driver Slate</span>
                  <p className="text-[9px] text-slate-400 font-sans mt-1 leading-normal">
                    Syncs active Tesla/EV fleet and saved places to Drive.
                  </p>
                </button>

                {/* Host Backup */}
                <button
                  onClick={handleBackupHost}
                  disabled={loading}
                  className="flex flex-col items-start p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-cyan-400/30 hover:bg-white/[0.04] transition-all text-left group cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center mb-3">
                    <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="font-bold text-xs text-white">Backup Host Listings</span>
                  <p className="text-[9px] text-slate-400 font-sans mt-1 leading-normal">
                    Syncs dynamic spaces, price rates, and weekly balance logs.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Backup History Explorer */}
          {user && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-widest">Saved Workspace Files</h4>
                <button
                  onClick={fetchFiles}
                  disabled={loading}
                  className="text-slate-400 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh Backup History"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>

              {backups.length === 0 ? (
                <div className="text-center py-8 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl">
                  <p className="text-xs text-slate-500 font-medium font-sans">No Parkzone backup files found in this Drive folder.</p>
                  <p className="text-[10px] text-slate-600 font-sans mt-0.5">Click any button above to create one now.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {backups.map((file) => {
                    const isHost = file.name.includes('host');
                    return (
                      <div
                        key={file.id}
                        className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isHost ? (
                            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center flex-shrink-0">
                              <FileCode className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-cyan-400/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate max-w-[170px]" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5 leading-none">
                              {new Date(file.createdTime).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleRestore(file)}
                            disabled={loading}
                            className="bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 px-2.5 py-1.5 rounded-lg text-cyan-400 text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Restore content from backup"
                          >
                            <Download className="w-3 h-3" />
                            Restore
                          </button>
                          <button
                            onClick={() => handleDelete(file)}
                            disabled={loading}
                            className="p-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 rounded-lg text-rose-400 cursor-pointer transition-colors"
                            title="Delete file from Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4.5 bg-white/[0.01] border-t border-white/5 text-center relative z-10">
          <p className="text-[9px] font-mono text-slate-500 max-w-xs mx-auto leading-relaxed">
            All files are stored cleanly and encrypted within your personal Google Drive in strict compliance with permission privacy boundaries.
          </p>
        </div>
      </div>
    </div>
  );
}
