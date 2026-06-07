/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { INITIAL_PARKING_SPOTS } from '../data';

export const getOfflineClientHTML = (): string => {
  const jsonSpots = JSON.stringify(INITIAL_PARKING_SPOTS, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parkzone — Standalone Client Build (Offline Diagnostic Utility)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Space Grotesk', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      
      --color-bg: #050508;
      --color-surface: #0a0b12;
      --color-surface-hover: #121422;
      --color-primary: #22d3ee;
      --color-primary-glow: rgba(34, 211, 238, 0.25);
      --color-success: #10b981;
      --color-success-glow: rgba(16, 185, 129, 0.2);
      --color-slate-400: #94a3b8;
      --color-slate-500: #64748b;
      --color-white: #ffffff;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--color-bg);
      color: var(--color-white);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      line-height: 1.5;
    }

    /* Beautiful Cyber grid styling background */
    .background-grid {
      position: fixed;
      inset: 0;
      background-image: 
        radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.05), transparent 70%),
        linear-gradient(rgba(255, 255, 255, 0.007) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.007) 1px, transparent 1px);
      background-size: 100% 100%, 24px 24px, 24px 24px;
      z-index: -1;
      pointer-events: none;
    }

    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Header styling */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 1.5rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 2rem;
      height: 2rem;
      background-color: var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px var(--color-primary-glow);
    }

    .brand-icon::after {
      content: '';
      width: 0.6rem;
      height: 0.6rem;
      background-color: var(--color-bg);
      border-radius: 1px;
      transform: rotate(45deg);
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    .system-badge {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      border: 1px solid rgba(34, 211, 238, 0.3);
      padding: 0.4rem 0.8rem;
      border-radius: 0.75rem;
      background-color: rgba(34, 211, 238, 0.03);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .system-badge span {
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--color-primary);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--color-primary);
      animation: flash 1.5s infinite ease-in-out;
    }

    /* Main Grid Layout */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    @media (min-main-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1.4fr 1fr;
      }
    }

    /* Cards & Components */
    .glass-card {
      background-color: var(--color-surface);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 1.5rem;
      padding: 1.5rem;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }

    .glass-card:hover {
      border-color: rgba(34, 211, 238, 0.2);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .glass-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
    }

    .card-title {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-title span {
      color: var(--color-primary);
    }

    /* Search & Filter Component */
    .search-box {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .input-field {
      flex-grow: 1;
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      color: var(--color-white);
      font-family: var(--font-sans);
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .input-field:focus {
      border-color: var(--color-primary);
      background-color: rgba(255, 255, 255, 0.05);
    }

    /* Parking Spots List */
    .spots-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 480px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    /* Custom Scrollbar */
    .spots-container::-webkit-scrollbar {
      width: 4px;
    }
    .spots-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .spots-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    .spots-container::-webkit-scrollbar-thumb:hover {
      background: var(--color-primary);
    }

    .spot-item {
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 1rem;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .spot-item:hover, .spot-item.selected {
      background-color: var(--color-surface-hover);
      border-color: var(--color-primary);
    }

    .spot-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .spot-name {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.95rem;
    }

    .spot-meta {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-slate-400);
      display: flex;
      gap: 0.75rem;
    }

    .spot-status {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      width: fit-content;
    }

    .status-available {
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--color-success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .status-fast {
      background-color: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .spot-price-tag {
      text-align: right;
    }

    .spot-price {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    .spot-price-unit {
      font-size: 0.65rem;
      color: var(--color-slate-500);
    }

    /* Calculator & Booking Panel */
    .calculator-panel {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .field-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--color-slate-400);
      margin-bottom: 0.4rem;
      display: block;
    }

    .slider-container {
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 1rem;
      padding: 1.25rem;
    }

    .slider-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .slider-val {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--color-primary);
    }

    .custom-range {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      outline: none;
      background: rgba(255, 255, 255, 0.1);
      -webkit-appearance: none;
    }

    .custom-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
      box-shadow: 0 0 10px var(--color-primary);
    }

    .pricing-summary {
      background-color: rgba(34, 211, 238, 0.02);
      border: 1px dashed rgba(34, 211, 238, 0.2);
      border-radius: 1rem;
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pricing-val {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-primary);
      text-shadow: 0 0 10px rgba(34, 211, 238, 0.15);
    }

    /* Action Buttons */
    .btn {
      background-color: var(--color-primary);
      color: var(--color-bg);
      border: none;
      border-radius: 1rem;
      padding: 1rem;
      font-family: var(--font-display);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-shadow: 0 4px 15px rgba(34, 211, 238, 0.2);
    }

    .btn:hover {
      background-color: var(--color-white);
      box-shadow: 0 5px 25px rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }

    .btn:active {
      transform: translateY(0);
    }

    /* Ticket / Pass mockup */
    .ticket-mockup {
      background: linear-gradient(135deg, #111827 0%, var(--color-bg) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1.5rem;
      padding: 1.5rem;
      position: relative;
    }

    .ticket-mockup::after {
      content: '';
      position: absolute;
      top: 50%;
      left: -10px;
      width: 20px;
      height: 20px;
      background-color: var(--color-bg);
      border-radius: 50%;
      transform: translateY(-50%);
      box-shadow: inset -3px 0 0 rgba(255, 255, 255, 0.08);
    }

    .ticket-mockup::before {
      content: '';
      position: absolute;
      top: 50%;
      right: -10px;
      width: 20px;
      height: 20px;
      background-color: var(--color-bg);
      border-radius: 50%;
      transform: translateY(-50%);
      box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.08);
    }

    .ticket-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
      padding-bottom: 0.75rem;
    }

    .ticket-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .ticket-label {
      font-size: 0.65rem;
      color: var(--color-slate-500);
      font-family: var(--font-mono);
      text-transform: uppercase;
    }

    .ticket-value {
      font-size: 0.8rem;
      font-weight: 600;
      font-family: var(--font-sans);
    }

    .ticket-token {
      font-family: var(--font-mono);
      color: var(--color-primary);
      letter-spacing: 0.05em;
      font-size: 0.85rem;
      font-weight: bold;
    }

    /* Diagnostics list display */
    .diagnostics-panel {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      background-color: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 1rem;
      padding: 1rem;
      color: var(--color-slate-400);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .diag-item {
      display: flex;
      justify-content: space-between;
    }

    .diag-val {
      color: var(--color-primary);
    }

    /* Animations */
    @keyframes flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .success-alert {
      background-color: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--color-success);
      padding: 1rem;
      border-radius: 1rem;
      font-size: 0.8rem;
      margin-top: 1rem;
      display: none;
      animation: fadeIn 0.3s forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    footer {
      text-align: center;
      padding: 2rem 0;
      font-size: 0.7rem;
      color: var(--color-slate-500);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      margin-top: auto;
    }
  </style>
</head>
<body>
  <div class="background-grid"></div>

  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon"></div>
        <div class="brand-name">Parkzone</div>
      </div>
      <div class="system-badge">
        <span></span> STANDALONE CLINICAL WORKSPACE v1.12
      </div>
    </header>

    <div class="dashboard-grid">
      <!-- Left: Interactive Map/Search & Spot Selection -->
      <div class="glass-card">
        <div class="card-title">
          <span>📡</span> LOCAL DIAGNOSTIC TRANSMITTER
        </div>
        
        <div class="search-box">
          <input type="text" id="spot-search" class="input-field" placeholder="Search offline database (e.g. Indiranagar, Koramangala)...">
        </div>

        <div class="spots-container" id="spots-list">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- Right: Live Pricing estimation & offline Pass creation -->
      <div class="calculator-panel">
        <div class="glass-card">
          <div class="card-title">
            <span>🧮</span> COST ESTIMATION CONSOLE
          </div>

          <div class="slider-container" style="margin-bottom: 1rem;">
            <div class="slider-header">
              <span class="field-label" style="margin: 0;">Select Duration</span>
              <span class="slider-val" id="duration-val">3 Hours</span>
            </div>
            <input type="range" id="duration-range" class="custom-range" min="1" max="12" value="3">
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <span class="field-label">Pricing Summary</span>
            <div class="pricing-summary">
              <div>
                <p id="bill-selected-spot" style="font-weight: 600; font-size: 0.85rem;">Metro Park, Indiranagar</p>
                <p id="bill-calculation" class="ticket-label">₹50 × 3 hours</p>
              </div>
              <div class="pricing-val" id="total-bill-val">₹150</div>
            </div>
          </div>

          <button class="btn" id="generate-pass-btn" style="margin-top: 1.25rem;">
            ⚡ Generate Secure Parking Pass
          </button>

          <div class="success-alert" id="success-alert">
            ✨ Simulated Booking Completed Successfully! Securing your vehicle reservation slot in real-time.
          </div>
        </div>

        <div class="glass-card" style="padding: 1.25rem;">
          <div class="card-title" style="font-size: 0.95rem; margin-bottom: 0.75rem;">
            <span>🎟️</span> ACTIVE RESERVATION TICKET
          </div>

          <div class="ticket-mockup">
            <div class="ticket-row">
              <div>
                <p class="ticket-label">Client Host</p>
                <p class="ticket-value">Parkzone Mobile System</p>
              </div>
              <div style="text-align: right;">
                <p class="ticket-label">Security Protocol</p>
                <p class="ticket-value" style="color: var(--color-primary);">ENCRYPTED</p>
              </div>
            </div>

            <div class="ticket-row">
              <div>
                <p class="ticket-label">Parking Zone</p>
                <p class="ticket-value" id="ticket-zone">Metro Park, Indiranagar</p>
              </div>
              <div style="text-align: right;">
                <p class="ticket-label">Est. Hours</p>
                <p class="ticket-value" id="ticket-hours">3 hrs</p>
              </div>
            </div>

            <div class="ticket-row" style="margin-bottom: 0;">
              <div>
                <p class="ticket-label">Pass Token ID</p>
                <p class="ticket-token" id="ticket-token">PKZ-8F29A3-X</p>
              </div>
              <div style="text-align: right;">
                <p class="ticket-label">Total Fee</p>
                <p class="ticket-value" id="ticket-fee" style="font-weight: 700;">₹150</p>
              </div>
            </div>
          </div>
        </div>

        <div class="diagnostics-panel">
          <div class="diag-item">
            <span>Terminal Port Status</span>
            <span class="diag-val">RESTful Secure Ingress</span>
          </div>
          <div class="diag-item">
            <span>Active Offline Sync</span>
            <span class="diag-val" style="color: var(--color-success)">Synchronized</span>
          </div>
          <div class="diag-item">
            <span>PWA Registry</span>
            <span class="diag-val">Manifest Native-Ready</span>
          </div>
        </div>
      </div>
    </div>

    <footer>
      🤖 Built with high-fidelity React framework. Standalone Client Export is fully interactive and portable.
    </footer>
  </div>

  <script>
    // Embedded Local Spot Database
    const SPOTS = ${jsonSpots};

    let selectedSpot = SPOTS[0];
    let selectedDuration = 3;

    const spotsListContainer = document.getElementById('spots-list');
    const searchInput = document.getElementById('spot-search');
    const durationRange = document.getElementById('duration-range');
    const durationVal = document.getElementById('duration-val');
    
    const billSelectedSpot = document.getElementById('bill-selected-spot');
    const billCalculation = document.getElementById('bill-calculation');
    const totalBillVal = document.getElementById('total-bill-val');
    
    const ticketZone = document.getElementById('ticket-zone');
    const ticketHours = document.getElementById('ticket-hours');
    const ticketToken = document.getElementById('ticket-token');
    const ticketFee = document.getElementById('ticket-fee');
    
    const generatePassBtn = document.getElementById('generate-pass-btn');
    const successAlert = document.getElementById('success-alert');

    // Create the HTML representation of spots
    function renderSpots(filterText = '') {
      spotsListContainer.innerHTML = '';
      const filtered = SPOTS.filter(s => 
        s.name.toLowerCase().includes(filterText.toLowerCase()) || 
        s.location.toLowerCase().includes(filterText.toLowerCase())
      );

      if (filtered.length === 0) {
        spotsListContainer.innerHTML = '<div style="font-family: var(--font-mono); font-size: 0.75rem; text-align: center; padding: 2rem; color: var(--color-slate-500)">No matches in offline list database.</div>';
        return;
      }

      filtered.forEach(spot => {
        const div = document.createElement('div');
        div.className = \`spot-item \${selectedSpot && selectedSpot.id === spot.id ? 'selected' : ''}\`;
        
        div.innerHTML = \`
          <div class="spot-info">
            <span class="spot-name">\${spot.name}</span>
            <div class="spot-meta">
              <span>\${spot.location}</span>
              <span>•</span>
              <span class="spot-status \${spot.spotsLeft > 10 ? 'status-available' : 'status-fast'}">
                \${spot.spotsLeft} left
              </span>
            </div>
          </div>
          <div class="spot-price-tag">
            <div class="spot-price">₹\${spot.pricePerHour}</div>
            <div class="spot-price-unit">/ hr</div>
          </div>
        \`;

        div.addEventListener('click', () => {
          selectedSpot = spot;
          updateSelectedSpotUI();
          renderSpots(filterText);
        });

        spotsListContainer.appendChild(div);
      });
    }

    function updateSelectedSpotUI() {
      if (!selectedSpot) return;
      billSelectedSpot.textContent = selectedSpot.name;
      const total = selectedSpot.pricePerHour * selectedDuration;
      billCalculation.textContent = \`₹\${selectedSpot.pricePerHour} × \${selectedDuration} hours\`;
      totalBillVal.textContent = \`₹\${total}\`;
      
      ticketZone.textContent = selectedSpot.name;
      ticketHours.textContent = \`\${selectedDuration} hrs\`;
      ticketFee.textContent = \`₹\${total}\`;
    }

    // Input handlers
    searchInput.addEventListener('input', (e) => {
      renderSpots(e.target.value);
    });

    durationRange.addEventListener('input', (e) => {
      selectedDuration = parseInt(e.target.value);
      durationVal.textContent = \`\${selectedDuration} \${selectedDuration === 1 ? 'Hour' : 'Hours'}\`;
      updateSelectedSpotUI();
    });

    generatePassBtn.addEventListener('click', () => {
      // Random generation of HEX pass token ID
      const chars = '0123456789ABCDEF';
      let hex = '';
      for (let i = 0; i < 6; i++) {
        hex += chars[Math.floor(Math.random() * 16)];
      }
      ticketToken.textContent = \`PKZ-\${hex}-X\`;
      
      successAlert.style.display = 'block';
      setTimeout(() => {
        successAlert.style.opacity = '1';
      }, 50);

      setTimeout(() => {
        successAlert.style.opacity = '0';
        setTimeout(() => {
          successAlert.style.display = 'none';
        }, 300);
      }, 5000);
    });

    // Boot
    renderSpots();
    updateSelectedSpotUI();
  </script>
</body>
</html>`;
};
