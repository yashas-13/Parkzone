/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { ParkingSpot } from '../types';

interface LiveGoogleMapProps {
  spots: ParkingSpot[];
  onSelectSpot: (spot: ParkingSpot) => void;
  userCoords?: { lat: number; lng: number } | null;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Premium Cyberpunk Dark theme for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#090a16' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#05050a' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a5f3fc' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#22d3ee' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#444664' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0d1024' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#444664' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#13162b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#202444' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#686a94' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#06b6d4/30' }, { weight: 2 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0891b2/30' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e2e8f0' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0b1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#06b6d4' }],
  },
];

function MapHandler({ userCoords }: { userCoords?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && userCoords) {
      map.panTo(userCoords);
    }
  }, [map, userCoords]);
  return null;
}

export default function LiveGoogleMap({ spots, onSelectSpot, userCoords }: LiveGoogleMapProps) {
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

  // Default Bangalore (Indiranagar / Koramangala area)
  const defaultCenter = { lat: 12.9716, lng: 77.6412 };

  // Setup splash screen when key is missing, adhering to instruction 1C
  if (!hasValidKey) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#070712] p-5 border border-white/5 rounded-3xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none blur-3xl" />
        <div className="text-center max-w-sm z-10 space-y-4">
          <div className="w-14 h-14 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-2xl flex items-center justify-center text-2xl mx-auto drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-pulse">
            🗺️
          </div>
          <h3 className="font-['Space_Grotesk'] font-bold text-base text-white">
            Google Maps API Key Required
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Configure your developer credentials to unlock live Bangalore GPS location sweeps, route plotting, and real-time sensor visualization tracking.
          </p>
          <div className="space-y-2.5 text-left bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-[10px] font-mono text-slate-300">
            <p>
              <strong className="text-[#22d3ee]">1. Obtain:</strong>{' '}
              <a
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                Google Cloud Console
              </a>
            </p>
            <p>
              <strong className="text-[#22d3ee]">2. Inject variables:</strong> Open{' '}
              <span className="text-white">Settings</span> (⚙️ gear icon, top-right panel) →{' '}
              <span className="text-white">Secrets</span> → Write{' '}
              <code className="text-[#22d3ee] bg-white/5 px-1 py-0.5 rounded">
                GOOGLE_MAPS_PLATFORM_KEY
              </code>{' '}
              as name → Paste your production-ready API access key.
            </p>
          </div>
          <div className="text-[9px] text-[#22d3ee] font-mono animate-pulse uppercase tracking-wider">
            ✓ Applet Auto-Reloads Once Credential Syncs
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId="PARK_IT_DARK_MAP"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          styles={darkMapStyle}
          className="w-full h-full"
          disableDefaultUI={false}
          gestureHandling="cooperative"
        >
          <MapHandler userCoords={userCoords} />

          {userCoords && (
            <AdvancedMarker position={userCoords} title="Your Live Location">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-8 h-8 bg-cyan-400 rounded-full opacity-35 animate-ping"></div>
                <div className="w-3.5 h-3.5 bg-[#22d3ee] border-2 border-white rounded-full shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
              </div>
            </AdvancedMarker>
          )}
          {spots.map((spot) => {
            const isSelected = selectedSpot?.id === spot.id;
            return (
              <AdvancedMarker
                key={spot.id}
                position={{ lat: spot.lat, lng: spot.lng }}
                title={spot.name}
                onClick={() => setSelectedSpot(spot)}
              >
                <div className="flex flex-col items-center group cursor-pointer">
                  {/* Neomorphic Pin badge containing the price */}
                  <div
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-black tracking-tighter shadow-2xl flex items-center gap-0.5 transition-all border ${
                      isSelected
                        ? 'bg-[#22d3ee] text-black border-cyan-200 scale-115 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                        : 'bg-[#0a0a14]/95 text-white border-white/10 group-hover:border-cyan-400 group-hover:text-[#22d3ee]'
                    }`}
                  >
                    <span>₹{spot.pricePerHour}</span>
                    {spot.amenities.includes('EV Charging') && (
                      <span className="text-[8px]" title="EV Charging Station">
                        ⚡
                      </span>
                    )}
                  </div>
                  {/* Anchored stem */}
                  <div
                    className={`w-[1.5px] h-2 transition-colors ${
                      isSelected ? 'bg-[#22d3ee]' : 'bg-white/20'
                    }`}
                  />
                  {/* Subtle pulsing anchor dot on coordinates */}
                  <div className="relative">
                    <div
                      className={`w-2 h-2 rounded-full border border-black shadow-lg transition-transform ${
                        isSelected ? 'bg-[#22d3ee] scale-125' : 'bg-white/60 group-hover:bg-cyan-400'
                      }`}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#22d3ee] rounded-full animate-ping opacity-30" />
                    )}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {selectedSpot && (
            <InfoWindow
              position={{ lat: selectedSpot.lat, lng: selectedSpot.lng }}
              onCloseClick={() => setSelectedSpot(null)}
              headerContent={
                <div className="font-['Space_Grotesk'] font-bold text-xs text-white">
                  {selectedSpot.name}
                </div>
              }
            >
              <div className="text-slate-200 p-1 space-y-2 max-w-[200px]" style={{ color: '#ffffff' }}>
                <div className="w-full h-20 rounded-lg overflow-hidden bg-white/5">
                  <img
                    src={selectedSpot.image}
                    alt={selectedSpot.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[10px] text-slate-300 font-sans leading-relaxed line-clamp-2">
                  {selectedSpot.description}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    ₹{selectedSpot.pricePerHour}/hr
                  </span>
                  <button
                    onClick={() => {
                      onSelectSpot(selectedSpot);
                      setSelectedSpot(null);
                    }}
                    className="bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-[9px] uppercase tracking-wider rounded px-2.5 py-1 cursor-pointer transition-colors"
                  >
                    Select Spot
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
