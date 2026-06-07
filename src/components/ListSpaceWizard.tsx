/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { ParkingSpot } from '../types';
import { uploadFileToStorage } from '../firebase';

interface ListSpaceWizardProps {
  onBack: () => void;
  onPublish: (newSpot: ParkingSpot) => void;
}

export default function ListSpaceWizard({ onBack, onPublish }: ListSpaceWizardProps) {
  const [unit, setUnit] = useState('');
  const [spotType, setSpotType] = useState<'garage' | 'driveway' | 'parking_lot'>('garage');
  const [hourlyRate, setHourlyRate] = useState(5);
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [enableMonthly, setEnableMonthly] = useState(false);
  const [address, setAddress] = useState('12th Main Rd, Indiranagar, Bangalore');
  const [customName, setCustomName] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.6412);

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectingError, setDetectingError] = useState('');

  const detectLiveLocation = () => {
    if (!navigator.geolocation) {
      setDetectingError('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    setDetectingError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        setLat(currentLat);
        setLng(currentLng);

        // Update the Leaflet marker coordinates and pan the view if it is present
        if (markerRef.current) {
          markerRef.current.setLatLng([currentLat, currentLng]);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([currentLat, currentLng], 15);
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setAddress(data.display_name);
            } else {
              setAddress(`GPS Lat: ${currentLat.toFixed(5)}, Lng: ${currentLng.toFixed(5)}`);
            }
          } else {
            setAddress(`GPS Lat: ${currentLat.toFixed(5)}, Lng: ${currentLng.toFixed(5)}`);
          }
        } catch (e) {
          setAddress(`GPS Lat: ${currentLat.toFixed(5)}, Lng: ${currentLng.toFixed(5)}`);
        }
        setDetectingLocation(false);
      },
      (error) => {
        console.error('Error fetching host position:', error);
        setDetectingError('GPS timeout or permission denied. Please click the Open Map manually.');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize and reload map size when opening Step 1
  useEffect(() => {
    if (step !== 1 || !mapRef.current) return;

    // Check if map is already initialized
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const defaultCenter: [number, number] = [lat, lng];
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Custom Cyan Interactive Pin Circle Icon
    const customPinHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 bg-[#22d3ee] rounded-full opacity-35 animate-ping"></div>
        <div class="w-4 h-4 bg-[#22d3ee] border-2 border-white rounded-full shadow-[0_0_12px_rgba(34,211,238,1)]"></div>
      </div>
    `;

    const icon = L.divIcon({
      html: customPinHtml,
      className: 'custom-wizard-picker-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([lat, lng], {
      icon,
      draggable: true
    }).addTo(map);

    markerRef.current = marker;

    // Handle marker dragging updates
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      setLat(position.lat);
      setLng(position.lng);
    });

    // Handle map clicks to smoothly move the selection pine
    map.on('click', (e) => {
      const currentLatLng = e.latlng;
      marker.setLatLng(currentLatLng);
      setLat(currentLatLng.lat);
      setLng(currentLatLng.lng);
      map.panTo(currentLatLng);
    });

    // Solve immediate render sizing glitches
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [step]);

  const calculateWeekly = () => hourlyRate * 4 * 7; // Assuming 4 hours a day average
  const calculateMonthly = () => hourlyRate * 4 * 30;

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();

    const title = customName.trim() || `${spotType === 'garage' ? 'Private Garage' : spotType === 'driveway' ? 'Cozy Driveway' : 'Open Field'} - ${address.split(',')[0]}`;
    const generatedSpot: ParkingSpot = {
      id: `custom-spot-${Date.now()}`,
      name: title,
      location: address,
      pricePerHour: hourlyRate,
      spotsLeft: 1,
      totalSpots: 1,
      type: spotType,
      image: uploadedPhotos[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtRLl077oYdU1fuhltFImo957FylFBZoO2gLA5P2uBqZAF8UjuQ3KMVh0ZihhcKUmj4VNIeSXHQW_aQMFNLIGU4ruICXb_ZNO_ooVtjq0SvdvY7bfjPExd9AfMuW0j4ROzlZL8ff3aQQ-pv3QQbfpMtoCo0oUCoyJHNWj1EdztKCi3CCVGA4_Fmb8Ek3wkTQe98huwyZtKyNpxDqGloAA2Q_dQXlSNqmWFlFEVfMQQtC8guZDJUp3bS-THPhmLx39b-TvlUUNVTNA',
      ratings: 5.0,
      reviewCount: 0,
      reviews: [],
      amenities: ['CCTV 24/7', 'Self Entry'],
      description: `Premium parking slot listed by local host Alex. Spot type is classified as a ${spotType} with robust security and automated entries. Location details: ${unit || 'Main entrance'}.`,
      lat: lat,
      lng: lng,
      hostName: 'Alex Harrison',
      hostAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDigNdjYo25V_DYlHCMWqV3DVT4Xp-I_6-2eIqUM0WgtArxltAfg-HKfij0mzTdu0gMef36kNCuxxdce_gng2SIFTAmZovRBHgAf1nokj1kYWUz5fHQr7TSzC-Hk_dlr4Smivum36OLHRTerW-dcy2rPVliVap6DRJnSNOmm8-zp7qHc2MQd39AIcItdw2GB6bs9EewqvUKjbThIVAheJDIxrrnkZje9W_WYzbgssfMQOj0jV0LCAeH3jfC2_LaNehTMmJ3d_fMgpQ',
      status: 'active',
    };

    onPublish(generatedSpot);
  };

  const processFiles = async (files: FileList) => {
    setUploading(true);
    setUploadError('');
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          setUploadError('Only image files are allowed.');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setUploadError('Image size must be less than 5MB.');
          continue;
        }
        const storagePath = `parking_spots/${Date.now()}_${file.name}`;
        const downloadUrl = await uploadFileToStorage(storagePath, file);
        urls.push(downloadUrl);
      }
      if (urls.length > 0) {
        setUploadedPhotos((prev) => [...prev, ...urls].slice(0, 3));
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const triggerFileInput = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const dummyUpload = () => {
    const defaultUrls = [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCtRLl077oYdU1fuhltFImo957FylFBZoO2gLA5P2uBqZAF8UjuQ3KMVh0ZihhcKUmj4VNIeSXHQW_aQMFNLIGU4ruICXb_ZNO_ooVtjq0SvdvY7bfjPExd9AfMuW0j4ROzlZL8ff3aQQ-pv3QQbfpMtoCo0oUCoyJHNWj1EdztKCi3CCVGA4_Fmb8Ek3wkTQe98huwyZtKyNpxDqGloAA2Q_dQXlSNqmWFlFEVfMQQtC8guZDJUp3bS-THPhmLx39b-TvlUUNVTNA',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA_IWiy_SILPKHxY2NQ0ieKROXjGaNGv1ANKngE0uLynhQ3c-H75Ey6RRQsw6T52Cct8TNBTANV4o5pzL92AcnAmVBR3eEwX5W0A9Mv1qZzjJ-iIO49D_rWqKa1uIOi9rdXoMJad33jnz4ePu5EL9f3dtCfMszLHR6GlkDvNB_udjrVyA19fgOKdDrsY4LXZJzQMPbMZWNv7GReFTdsedNwXuPYIgODvIV3Rr4SfwCGK-UlzlhsHxBs5npQlEUmw62cXgSVBbPfTMk'
    ];
    const nextUrl = defaultUrls[uploadedPhotos.length % defaultUrls.length];
    setUploadedPhotos([...uploadedPhotos, nextUrl]);
  };

  return (
    <div className="min-h-[100dvh] bg-[#050508] text-white pb-36 font-sans relative overflow-x-hidden">
      {/* Background Decorators */}
      <div className="aura-bg dot-grid absolute inset-0 z-0 pointer-events-none"></div>
      <div className="orb top-[10%] left-[20%]"></div>
      <div className="orb bottom-[10%] right-[10%] bg-radial from-cyan-400 to-transparent"></div>

      {/* TopAppBar */}
      <header className="bg-[#0a0a14]/65 backdrop-blur-xl sticky top-0 z-50 w-full border-b border-white/5 shadow-md">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="hover:bg-white/5 text-cyan-400 transition-colors p-2 rounded-lg active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-xl">←</span>
            </button>
            <h1 className="font-['Space_Grotesk'] font-bold text-2xl tracking-tight text-white">
              List Your Space
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Steps indicator for large devices */}
            <div className="hidden md:flex items-center gap-6 mr-6 select-none font-mono text-xs">
              <span className={`font-mono transition-all ${step >= 1 ? 'text-[#22d3ee] font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'text-slate-500'}`}>
                1. DETAILS
              </span>
              <span className={`font-mono transition-all ${step >= 2 ? 'text-[#22d3ee] font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'text-slate-500'}`}>
                2. PRICING
              </span>
              <span className={`font-mono transition-all ${step >= 3 ? 'text-[#22d3ee] font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'text-slate-500'}`}>
                3. PHOTOS
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden border border-white/10 shadow">
              <img
                alt="Representative photo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDigNdjYo25V_DYlHCMWqV3DVT4Xp-I_6-2eIqUM0WgtArxltAfg-HKfij0mzTdu0gMef36kNCuxxdce_gng2SIFTAmZovRBHgAf1nokj1kYWUz5fHQr7TSzC-Hk_dlr4Smivum36OLHRTerW-dcy2rPVliVap6DRJnSNOmm8-zp7qHc2MQd39AIcItdw2GB6bs9EewqvUKjbThIVAheJDIxrrnkZje9W_WYzbgssfMQOj0jV0LCAeH3jfC2_LaNehTMmJ3d_fMgpQ"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 relative z-10">
        {/* Step Indicator (Mobile) */}
        <div className="md:hidden flex justify-between items-center mb-8">
          <div className="flex gap-1.5">
            <div className={`h-[2px] w-8 rounded-full ${step >= 1 ? 'bg-[#22d3ee]' : 'bg-white/10'}`}></div>
            <div className={`h-[2px] w-8 rounded-full ${step >= 2 ? 'bg-[#22d3ee]' : 'bg-white/10'}`}></div>
            <div className={`h-[2px] w-8 rounded-full ${step >= 3 ? 'bg-[#22d3ee]' : 'bg-white/10'}`}></div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#22d3ee]">
            STEP {step} OF 3
          </span>
        </div>

        {/* Step 1: Details and Location */}
        {step === 1 && (
          <div className="space-y-12 animate-fade-in">
            {/* Location block */}
            <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4">
                <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2 leading-tight">
                  Location Info
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Provide your street address. Accurate mapping coordinates help drivers find your space instantly.
                </p>
              </div>
              <div className="md:col-span-8 space-y-6">
                <div className="relative">
                  <div className="flex justify-between items-center mb-1.5 px-1 gap-2 flex-wrap">
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                      Street Address / City Area
                    </label>
                    {detectingLocation ? (
                      <span className="text-[9px] text-cyan-400 font-mono animate-pulse flex items-center gap-1 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" /> SATELLITE PINGING...
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={detectLiveLocation}
                        className="text-[9px] text-[#22d3ee] font-mono font-bold hover:text-white cursor-pointer flex items-center gap-1 px-2 py-0.5 bg-cyan-950/40 border border-cyan-400/25 rounded hover:border-cyan-400/60 active:scale-95 transition-all select-none"
                        title="Acquire live GPS coordinates and street details automatically"
                      >
                        🧭 AUTOFETCH MY LOCATION
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 12th Main, Indiranagar, Bangalore"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none rounded-xl px-4 py-3.5 text-sm font-medium text-white transition-all font-mono text-xs"
                  />
                  {detectingError && (
                    <p className="text-[10px] text-rose-400 font-mono mt-1 px-1 bg-rose-500/10 border border-rose-500/20 py-1 rounded">
                      ⚠️ {detectingError}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 mb-2 px-1">
                    Select Exact Marker Location on Interactive Map
                  </label>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    Click anywhere on the satellite tracker map below or drag the cyan beacon to specify the precise parking coordinates.
                  </p>
                  <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl aspect-video relative border border-white/10 h-[260px] md:h-[300px] w-full">
                    <div ref={mapRef} className="w-full h-full z-0" />
                    <div className="absolute top-4 left-4 z-[1000] bg-[#0a0a14]/90 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-xl shadow font-mono text-[9px] text-slate-300">
                      🛰️ GPS lat-lng:&nbsp;
                      <span className="text-cyan-400 font-bold">{lat.toFixed(6)}</span>,&nbsp;
                      <span className="text-cyan-400 font-bold">{lng.toFixed(6)}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 z-[1000] glass-panel px-4 py-3 rounded-xl border border-white/10 shadow bg-[#0a0a14]/90 backdrop-blur-md">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <span className="text-cyan-400 font-bold animate-pulse">📍</span>
                        <span className="font-mono text-[11px] text-slate-200 truncate">{address}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="relative">
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-1">
                      Unit / Space Number (Optional)
                    </label>
                    <input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none rounded-xl px-4 py-3.5 text-white font-medium placeholder-slate-600 text-sm transition-all"
                      placeholder="e.g. B-12 or Base 4"
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Spot Type block */}
            <section className="grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-white/5 pt-10">
              <div className="md:col-span-4">
                <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2 leading-tight">
                  Spot Classification
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Categorize your space properly to match specific driver preferences.
                </p>
              </div>
              <div className="md:col-span-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Garage */}
                  <div
                    onClick={() => setSpotType('garage')}
                    className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all active:scale-95 group cursor-pointer ${
                      spotType === 'garage'
                        ? 'border-cyan-400 bg-cyan-400/5 glow-cyan'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <span className="text-3xl mb-3 select-none">🚗</span>
                    <span className="font-bold text-white text-sm">Garage</span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">
                      INDOOR / SECURED
                    </span>
                    {spotType === 'garage' && (
                      <div className="absolute top-3 right-3 text-cyan-400 text-xs font-bold font-mono">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Driveway */}
                  <div
                    onClick={() => setSpotType('driveway')}
                    className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all active:scale-95 group cursor-pointer ${
                      spotType === 'driveway'
                        ? 'border-cyan-400 bg-cyan-400/5 glow-cyan'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <span className="text-3xl mb-3 select-none">🏡</span>
                    <span className="font-bold text-white text-sm">Driveway</span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">
                      OUTDOOR / PRIVATE
                    </span>
                    {spotType === 'driveway' && (
                      <div className="absolute top-3 right-3 text-cyan-400 text-xs font-bold font-mono">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Lot */}
                  <div
                    onClick={() => setSpotType('parking_lot')}
                    className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all active:scale-95 group cursor-pointer ${
                      spotType === 'parking_lot'
                        ? 'border-cyan-400 bg-cyan-400/5 glow-cyan'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <span className="text-3xl mb-3 select-none">🅿️</span>
                    <span className="font-bold text-white text-sm">Parking Lot</span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">
                      OPEN / CORPORATE
                    </span>
                    {spotType === 'parking_lot' && (
                      <div className="absolute top-3 right-3 text-cyan-400 text-xs font-bold font-mono">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Step 2: Pricing */}
        {step === 2 && (
          <div className="space-y-12 animate-fade-in col-span-1">
            <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4">
                <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2 leading-tight">
                  Pricing Matrix
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Establish competitive pricing. Setting flexible models can secure occupancy gains of over 50%.
                </p>
              </div>
              <div className="md:col-span-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Hourly Box */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl">
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-[#22d3ee] mb-4">
                      HOURLY PARKING RATE (₹)
                    </label>
                    <div className="flex items-center">
                      <span className="text-3xl font-['Space_Grotesk'] font-bold text-white mr-2">
                        ₹
                      </span>
                      <input
                        className="w-full text-4xl font-['Space_Grotesk'] font-black text-[#22d3ee] bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                        type="number"
                        min="5"
                        max="200"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Math.max(1, parseInt(e.target.value) || 0))}
                      />
                      <span className="text-slate-400 text-xs font-semibold ml-2">
                        /hr
                      </span>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Est. Weekly Return</span>
                      <span className="font-bold text-cyan-400 text-sm font-mono px-2.5 py-1 bg-white/5 rounded-full">
                        ₹{calculateWeekly().toLocaleString()}.00
                      </span>
                    </div>
                  </div>

                  {/* Monthly Box */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col justify-between">
                    <div>
                      <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-4">
                        CUSTOM LISTING TITLE (INFO)
                      </label>
                      <input
                        type="text"
                        className="w-full border-b border-white/10 focus:border-cyan-400 outline-none text-base font-bold pb-1 bg-transparent text-white"
                        placeholder="e.g. Alex Indiranagar Gate"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                    </div>
                    <div className="mt-8">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 select-none">
                        <input
                          className="rounded text-cyan-400 focus:ring-cyan-400 w-4 h-4 border-white/10 bg-white/5"
                          type="checkbox"
                          checked={enableMonthly}
                          onChange={(e) => setEnableMonthly(e.target.checked)}
                        />
                        <span>Enable monthly bookings</span>
                      </label>
                      {enableMonthly && (
                        <div className="mt-2 text-[10px] text-[#22d3ee] font-medium font-mono">
                          ✓ Recommended Auto rate: ₹{calculateMonthly()} /mo
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div className="space-y-12 animate-fade-in">
            <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4">
                <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2 leading-tight">
                  Upload Photos
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Real pictures of the physical entrance reduce cancellations and increase bookings significantly.
                </p>
                {uploadError && (
                  <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-red-400 text-xs font-mono">
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>
              <div className="md:col-span-8">
                <div className="grid grid-cols-3 gap-4">
                  {/* Big Cover Dropzone with Drag and Drop */}
                  <div
                    onClick={triggerFileInput}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="col-span-3 aspect-[21/9] bg-white/[0.01] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center group hover:bg-cyan-400/[0.03] hover:border-cyan-400 transition-colors cursor-pointer select-none relative overflow-hidden"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />

                    {uploading ? (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="font-bold text-sm text-cyan-400">Uploading to Firebase Storage...</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">Please keep this tab open</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 mb-2 shadow-sm group-hover:scale-105 transition-transform text-lg">
                          📸
                        </div>
                        <p className="font-bold text-sm text-white">Upload Spot Image</p>
                        <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase font-bold mt-1">
                          Drag and drop or click here to upload (max 3)
                        </p>
                      </>
                    )}
                  </div>

                  {uploadedPhotos.length === 0 ? (
                    <>
                      <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 flex flex-col items-center justify-center text-slate-600 text-xs select-none gap-2">
                        <span className="text-2xl">🖼️</span>
                        <span>Cover Photo</span>
                      </div>
                      <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 flex flex-col items-center justify-center text-slate-600 text-xs select-none gap-2">
                        <span className="text-2xl">🖼️</span>
                        <span>Angle 2</span>
                      </div>
                      <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 flex flex-col items-center justify-center text-slate-600 text-xs select-none gap-2">
                        <span className="text-2xl">🖼️</span>
                        <span>Angle 3</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {uploadedPhotos.map((url, i) => (
                        <div key={i} className="aspect-square bg-white/[0.02] rounded-xl border border-white/10 overflow-hidden relative shadow-sm">
                          <img className="w-full h-full object-cover filter brightness-90" src={url} alt={`Uploaded ${i}`} />
                          <div className="absolute top-1.5 right-1.5 bg-cyan-400 text-black rounded-lg w-5 h-5 flex items-center justify-center font-bold text-[10px] glow-cyan">
                            ✓
                          </div>
                        </div>
                      ))}
                      {uploadedPhotos.length < 3 && (
                        <div
                          onClick={triggerFileInput}
                          className="aspect-square bg-white/5 border-2 border-dashed border-white/10 hover:border-cyan-400 hover:text-cyan-400 text-slate-400 rounded-xl flex flex-col items-center justify-center text-xs gap-1 cursor-pointer transition-colors"
                        >
                          <span className="text-xl font-bold">+</span>
                          <span className="font-mono text-[8px] uppercase">Add Photo</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={dummyUpload}
                    className="text-[10px] font-mono text-cyan-400/60 hover:text-cyan-400 underline cursor-pointer"
                  >
                    💡 No photo on hand? Populate with high-quality sample image
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Sticky Bottom Actions Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a14]/90 backdrop-blur-md border-t border-white/5 shadow-2xl z-40 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-5 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer text-xs uppercase tracking-widest font-mono"
          >
            Cancel Draft
          </button>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors cursor-pointer text-xs uppercase tracking-widest font-mono border border-white/10"
              >
                Previous
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-8 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest glow-cyan active:scale-95 transition-all cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handlePublish}
                id="btn-publish-listing"
                className="px-10 py-4 bg-cyan-400 hover:bg-cyan-200 text-black rounded-xl font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest glow-cyan active:scale-95 transition-all cursor-pointer"
              >
                Publish Space Live!
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
