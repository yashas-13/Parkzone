/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

interface AdBannerProps {
  unitId?: string;
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  className?: string;
}

export default function AdBanner({ 
  unitId = import.meta.env.VITE_ADMOB_BANNER_UNIT_ID, 
  size = 'banner', 
  className = '' 
}: AdBannerProps) {
  const [isNative, setIsNative] = useState(false);
  
  useEffect(() => {
    // In a real PWA / Capacitor setup, we would inject native admob logic here 
    // or trigger capacitor/admob plugins if window.Capacitor exists.
    if (typeof window !== 'undefined' && 'Capacitor' in window) {
      setIsNative(true);
      // Capacitor AdMob Initialization would happen here.
    }
  }, [unitId]);
  
  const getDimensions = () => {
    switch (size) {
      case 'largeBanner': return { width: 320, height: 100 };
      case 'mediumRectangle': return { width: 300, height: 250 };
      case 'fullBanner': return { width: 468, height: 60 };
      case 'leaderboard': return { width: 728, height: 90 };
      case 'banner':
      default: return { width: 320, height: 50 };
    }
  };
  
  const { width, height } = getDimensions();

  if (isNative) {
    // Spacer for native overlaid banner
    return <div style={{ height: `${height}px` }} className={className} />;
  }

  // Web Placeholder for Development/Preview
  return (
    <div 
      className={`mx-auto bg-[#1a1b26] border border-cyan-900/30 rounded-lg flex flex-col items-center justify-center overflow-hidden relative shadow-inner ${className}`}
      style={{ width: '100%', maxWidth: `${width}px`, height: `${height}px` }}
    >
      <div className="absolute top-0 right-0 bg-black/40 text-[8px] text-slate-400 px-1 py-0.5 rounded-bl">
        Ad
      </div>
      
      <div className="flex items-center gap-2 text-cyan-400/50">
        <Info size={14} />
        <span className="font-mono text-xs uppercase tracking-widest font-bold">AdMob Banner</span>
      </div>
      
      {!unitId && (
        <span className="text-[9px] text-amber-500/70 mt-1 font-mono text-center px-2">
          Missing VITE_ADMOB_BANNER_UNIT_ID
        </span>
      )}
    </div>
  );
}
