/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ParkingSpot } from '../types';

interface LiveOpenStreetMapProps {
  spots: ParkingSpot[];
  onSelectSpot: (spot: ParkingSpot) => void;
  userCoords?: { lat: number; lng: number } | null;
}

export default function LiveOpenStreetMap({ spots, onSelectSpot, userCoords }: LiveOpenStreetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

  // Default Bangalore (Indiranagar / Koramangala area)
  const defaultCenter: [number, number] = [12.9716, 77.6412];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Standard Leaflet leaflet.css marker styling fix: we use custom div icons,
    // so we don't need standard marker assets; this is highly resilient to bundler-path changes.

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false, // Custom styled zoom controls can be used, or keep standard clean
      attributionControl: true,
    });

    // Add CartoDB Dark Matter Tile Layer (Premium styling, free, open-source, no api keys!)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Reposition attribution control to bottom-right neatly
    map.attributionControl.setPosition('bottomright');

    // Add scale indicator at bottom-left
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync user location overlay beacon and map center when userCoords is provided
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-cyan-400 rounded-full opacity-35 animate-ping"></div>
          <div class="w-3.5 h-3.5 bg-cyan-400 border-2 border-white rounded-full shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
        </div>
      `;
      const icon = L.divIcon({
        html: userHtml,
        className: 'user-location-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon }).addTo(map);
    }

    // Centering with smooth flyTo animation
    map.flyTo([userCoords.lat, userCoords.lng], 14, { animate: true, duration: 1.5 });
  }, [userCoords]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    (Object.values(markersRef.current) as L.Marker[]).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Add fresh markers for currently visible/filtered spots
    spots.forEach((spot) => {
      // EV charging icon
      const hasEv = spot.amenities.includes('EV Charging');

      // Create Custom Neomorphic Cyberpunk HTML Marker Pin
      const customIconHtml = `
        <div class="flex flex-col items-center cursor-pointer transform -translate-y-1/2">
          <div class="px-2.5 py-1 rounded-xl text-[10px] font-mono font-black tracking-tighter bg-[#0a0a14] text-white border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center gap-0.5 hover:border-[#22d3ee] hover:text-[#22d3ee] transition-all duration-200">
            <span>₹${spot.pricePerHour}</span>
            ${hasEv ? '<span class="text-[8px] text-cyan-400">⚡</span>' : ''}
          </div>
          <!-- Anchored stem -->
          <div class="w-[1.5px] h-2 bg-white/20"></div>
          <!-- Centered anchor dot -->
          <div class="relative w-2 h-2">
            <div class="absolute inset-0 w-2 h-2 rounded-full bg-white border border-black shadow"></div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: customIconHtml,
        className: 'custom-osm-marker-container',
        iconSize: [60, 42],
        iconAnchor: [30, 42], // Centered bottom alignment
      });

      const marker = L.marker([spot.lat, spot.lng], { icon }).addTo(map);

      // Handle marker interaction click
      marker.on('click', () => {
        setSelectedSpot(spot);
        map.panTo([spot.lat, spot.lng]);
      });

      markersRef.current[spot.id] = marker;
    });
  }, [spots]);

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {/* Map Div Surface */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* React Styled Immersive Card Overlay for Selected Spot */}
      {selectedSpot && (
        <div className="absolute bottom-5 left-5 right-5 md:left-auto md:w-80 bg-[#0a0a14]/95 backdrop-blur-md border border-white/10 rounded-2.5xl p-4.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-10 transition-all duration-300 animate-fade-in">
          {/* Close trigger */}
          <button
            onClick={() => setSelectedSpot(null)}
            className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
          >
            ✕
          </button>

          {/* Badge & Meta info */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 text-[#22d3ee] font-mono text-[8.5px] font-bold uppercase rounded-md tracking-wider">
              {selectedSpot.type.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ★ {selectedSpot.ratings}
            </span>
          </div>

          {/* Main info flex stream */}
          <div className="flex gap-3 items-start">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/5 flex-shrink-0 relative">
              <img
                src={selectedSpot.image}
                alt={selectedSpot.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-['Space_Grotesk'] font-bold text-sm text-white truncate">
                {selectedSpot.name}
              </h4>
              <p className="text-[10.5px] text-slate-400 leading-normal line-clamp-2">
                {selectedSpot.description}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <div>
              <span className="block text-[8px] text-slate-500 font-mono uppercase tracking-wider">
                YIELD PRICE
              </span>
              <span className="font-['Space_Grotesk'] text-sm font-black text-[#22d3ee] font-mono">
                ₹{selectedSpot.pricePerHour}
                <span className="text-slate-400 font-sans font-normal text-xs">/hr</span>
              </span>
            </div>

            <button
              onClick={() => {
                onSelectSpot(selectedSpot);
                setSelectedSpot(null);
              }}
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-extrabold text-[9px] uppercase tracking-wider rounded-xl cursor-pointer transition-colors shadow-lg shadow-cyan-400/10 active:scale-95 duration-150"
            >
              Select Spot
            </button>
          </div>
        </div>
      )}

      {/* Styled Zoom controls over the map panel */}
      <div className="absolute top-24 right-5 z-10 flex flex-col gap-1 bg-[#0a0a14]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg select-none">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 font-bold transition-all text-sm cursor-pointer"
          title="Zoom In"
        >
          ＋
        </button>
        <div className="h-[1px] bg-white/10 mx-1.5" />
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 font-bold transition-all text-sm cursor-pointer"
          title="Zoom Out"
        >
          —
        </button>
      </div>
    </div>
  );
}
