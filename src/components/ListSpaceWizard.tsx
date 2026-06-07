/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ParkingSpot } from '../types';

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
      lat: 12.9716,
      lng: 77.6412,
      hostName: 'Alex Harrison',
      hostAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDigNdjYo25V_DYlHCMWqV3DVT4Xp-I_6-2eIqUM0WgtArxltAfg-HKfij0mzTdu0gMef36kNCuxxdce_gng2SIFTAmZovRBHgAf1nokj1kYWUz5fHQr7TSzC-Hk_dlr4Smivum36OLHRTerW-dcy2rPVliVap6DRJnSNOmm8-zp7qHc2MQd39AIcItdw2GB6bs9EewqvUKjbThIVAheJDIxrrnkZje9W_WYzbgssfMQOj0jV0LCAeH3jfC2_LaNehTMmJ3d_fMgpQ',
      status: 'active',
    };

    onPublish(generatedSpot);
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
                  <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-400 mb-1.5 px-1">
                    Street Address / City Area
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 12th Main, Indiranagar, Bangalore"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none rounded-xl px-4 py-3.5 text-sm font-medium text-white transition-all"
                  />
                </div>

                <div className="glass-panel rounded-xl overflow-hidden shadow-sm aspect-video relative group border border-white/10">
                  <img
                    className="w-full h-full object-cover select-none filter contrast-120 brightness-50 mix-blend-luminosity opacity-40"
                    alt="Map illustration grid"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLBgPtUzGSylWuD_dpNbP02OYiWANm0_iOQfxiSQF6RFlZUIf8IJrD4y0eAGhS8Z63fnQblbp7d2hSazDzIasdmGGZ55Z6EnYYU1MggaTb16lbj_muekQL4Kv8raojCAQ4xjz0vD_pszJVDXVRgtGgfpzEPaRHFKqoBNT_aYyPBdc0ZEcHoa3wI8EsTMA8z4Ie5_9MkavzBe6CQXtA_G3gZmggHmwQpgqVst45rRiKeL8FGymjd8gDAJn0SK8HBMAAx5cg-gU01NM"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-cyan-400 flex items-center justify-center rounded-full shadow-lg shadow-cyan-400/40 ring-4 ring-cyan-400/15 animate-pulse text-black text-base">
                      📍
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 glass-panel px-4 py-3 rounded-xl border border-white/10 shadow">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <span className="text-cyan-400 font-bold">📍</span>
                      <span className="font-mono text-[11px] text-slate-200">{address}</span>
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
                <p className="text-slate-400 text-sm leading-relaxed">
                  Real pictures of the physical entrance reduce cancellations and increase bookings significantly.
                </p>
              </div>
              <div className="md:col-span-8">
                <div className="grid grid-cols-3 gap-4">
                  {/* Big Cover Dropzone */}
                  <div
                    onClick={dummyUpload}
                    className="col-span-3 aspect-[21/9] bg-white/[0.01] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center group hover:bg-cyan-400/[0.03] hover:border-cyan-400 transition-colors cursor-pointer select-none"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 mb-2 shadow-sm group-hover:scale-105 transition-transform text-lg">
                      📸
                    </div>
                    <p className="font-bold text-sm text-white">Upload Spot Image</p>
                    <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase font-bold mt-1">
                      Drag and drop OR tap to upload
                    </p>
                  </div>

                  {uploadedPhotos.length === 0 ? (
                    <>
                      <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 flex items-center justify-center text-slate-600 text-2xl select-none">
                        🖼️
                      </div>
                      <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 flex items-center justify-center text-slate-600 text-2xl select-none">
                        🖼️
                      </div>
                      <div className="aspect-square bg-white/[0.02] rounded-xl border border-white/5 flex items-center justify-center text-slate-600 text-2xl select-none">
                        🖼️
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
                          onClick={dummyUpload}
                          className="aspect-square bg-white/5 border-2 border-dashed border-white/10 hover:border-cyan-400 hover:text-cyan-400 text-slate-400 rounded-xl flex items-center justify-center text-lg font-bold cursor-pointer transition-colors"
                        >
                          +
                        </div>
                      )}
                    </>
                  )}
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
