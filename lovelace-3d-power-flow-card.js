// =============================================================================
// 3D Power Flow Card — Home Assistant Lovelace card
// Isometric 3D house render with animated neon energy flows and per-device
// consumption overlays (pool, dryer, washer, fridge, vitroceramic, EV charger).
// =============================================================================

// Default background renders. The images must live in Home Assistant's
// `config/www/` folder so they are reachable under `/local/...`.
const DEFAULT_DAY_IMAGE = "/local/home_all_day.jpeg";
const DEFAULT_NIGHT_IMAGE = "/local/home_all_night.jpeg";

// Presets per well-known device type: MDI icon, accent color and default label.
const DEVICE_TYPES = {
  pool:       { icon: 'mdi:pool',                 color: '#00b4d8', label: 'PISCINA' },
  dryer:      { icon: 'mdi:tumble-dryer',         color: '#f4a261', label: 'SECADORA' },
  washer:     { icon: 'mdi:washing-machine',      color: '#90e0ef', label: 'LAVADORA' },
  fridge:     { icon: 'mdi:fridge',               color: '#64b5f6', label: 'NEVERA' },
  vitro:      { icon: 'mdi:stove',                color: '#e63946', label: 'VITROCERÁMICA' },
  ev:         { icon: 'mdi:ev-station',           color: '#06d6a0', label: 'COCHE' },
  heater:     { icon: 'mdi:water-boiler',         color: '#ff6b35', label: 'CALENTADOR' },
  ac:         { icon: 'mdi:air-conditioner',      color: '#48cae4', label: 'AIRE ACOND.' },
  boiler:     { icon: 'mdi:fire',                 color: '#ff9500', label: 'CALDERA' },
  oven:       { icon: 'mdi:stove',                color: '#ff6b35', label: 'HORNO' },
  dishwasher: { icon: 'mdi:dishwasher',           color: '#457b9d', label: 'LAVAVAJILLAS' },
  other:      { icon: 'mdi:home-lightning-bolt',  color: '#fbbf24', label: 'RESTO' },
};

// Junction point where the house load branches out toward each device.
// This matches the end of the CASA (house load) flow path in the SVG.
const JUNCTION = { x: 64, y: 50.5 };

// Default on-image positions per device type. `top` / `left` are percentages of
// the image, and — because the SVG uses viewBox "0 0 100 100" over the same
// square image — the same numbers double as SVG coordinates for the flow paths.
const DEVICE_LAYOUT = {
  pool:       { top: '72%', left: '74%' },
  ev:         { top: '85%', left: '26%' },
  washer:     { top: '48%', left: '76%' },
  dryer:      { top: '56%', left: '82%' },
  fridge:     { top: '40%', left: '55%' },
  vitro:      { top: '45%', left: '51%' },
  heater:     { top: '34%', left: '83%' },
  ac:         { top: '34%', left: '18%' },
  boiler:     { top: '34%', left: '83%' },
  oven:       { top: '46%', left: '52%' },
  dishwasher: { top: '52%', left: '54%' },
  other:      { top: '90%', left: '78%' },
};

// Legacy / Spanish `type` values are normalized to the canonical keys above.
const TYPE_ALIASES = {
  dishwash: 'dishwasher',
  dish: 'dishwasher',
  piscina: 'pool',
  filtrado: 'pool',
  secadora: 'dryer',
  lavadora: 'washer',
  nevera: 'fridge',
  frigorifico: 'fridge',
  vitroceramica: 'vitro',
  coche: 'ev',
  cargador: 'ev',
  car: 'ev',
};

// Infer a device type from its name (Spanish + English keywords) when the user
// has not set an explicit `type`.
function inferType(name) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  if (/(piscina|pool|filtra)/.test(n)) return 'pool';
  if (/(secad|dryer)/.test(n)) return 'dryer';
  if (/(lavad|washer|washi)/.test(n)) return 'washer';
  if (/(nevera|frigo|fridge|refri)/.test(n)) return 'fridge';
  if (/(vitro|inducc|placa)/.test(n)) return 'vitro';
  if (/(coche|car\b|cargador|vehiculo|charging|\bev\b)/.test(n)) return 'ev';
  if (/(calentador|termo|heater)/.test(n)) return 'heater';
  if (/(aire|a\/c|clima|a\.c)/.test(n)) return 'ac';
  if (/(caldera|boiler)/.test(n)) return 'boiler';
  if (/(horno|oven)/.test(n)) return 'oven';
  if (/(lavavajillas|dishwash|lavaplatos)/.test(n)) return 'dishwasher';
  return null;
}

// Parse a CSS percentage string ("72%") or bare number into a numeric 0..100.
function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseFloat(String(value).replace('%', '').replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

class PowerFlow3DCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entities || !config.entities.grid) {
      throw new Error('Debes definir al menos la entidad grid (la red) en la configuración.');
    }
    this.config = config;

    // Build the list of monitored (tracked) devices once. A device without an
    // `entity` is not being monitored, so it is skipped ("cargas si seguimiento").
    this.deviceDefs = this.buildDeviceDefs(config.individual || []);

    // "Resto" (remaining house load) is shown by default whenever there are
    // individual devices, unless explicitly disabled with show_other: false.
    this.showOther = config.show_other === true || (config.show_other !== false && this.deviceDefs.length > 0);

    // Force a full re-render.
    this.content = null;
    this.innerHTML = '';
  }

  buildDeviceDefs(individual) {
    const defs = [];
    (Array.isArray(individual) ? individual : []).forEach((dev, i) => {
      // --- "cargas si seguimiento": only render devices that are monitored ---
      if (!dev || !dev.entity) return;

      let type = (dev.type || '').toLowerCase();
      if (!type) type = inferType(dev.name) || 'other';
      type = TYPE_ALIASES[type] || type;

      const preset = DEVICE_TYPES[type] || DEVICE_TYPES.other;
      const layout = DEVICE_LAYOUT[type] || DEVICE_LAYOUT.other;

      const name = (dev.name || preset.label || `DISPOSITIVO ${i + 1}`).toUpperCase();
      const icon = dev.icon || preset.icon;
      const color = dev.color || preset.color;

      // Position: explicit config wins; otherwise the per-type default layout.
      let top = dev.top || layout.top;
      let left = dev.left || layout.left;

      defs.push({
        id: defs.length,
        entity: dev.entity,
        type,
        name,
        icon,
        color,
        top,
        left,
        display_zero: dev.display_zero !== false,
        tolerance: toNumber(dev.display_zero_tolerance) || 0,
      });
    });
    return defs;
  }

  set hass(hass) {
    if (!this.config) return;
    if (!this.content) {
      // First render (or re-render after setConfig).
      this.render(hass);
    } else {
      this.update(hass);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  getPower(entity, hass) {
    if (!entity || !hass || !hass.states[entity]) return 0;
    const stateObj = hass.states[entity];
    const val = parseFloat(stateObj.state);
    if (isNaN(val)) return 0;
    const unit = stateObj.attributes && stateObj.attributes.unit_of_measurement;
    // Only "kW" is a power unit we upscale to watts (kWh is energy, not power).
    if (unit && unit.toLowerCase() === 'kw') return val * 1000;
    return val;
  }

  formatPower(w, isSolar = false) {
    const abs = Math.abs(w);
    if (isSolar && abs < 5) return '—';
    if (abs >= 1000) return `${(abs / 1000).toFixed(2).replace('.', ',')} kW`;
    return `${Math.round(abs)} W`;
  }

  isDay(hass) {
    const sun = hass && hass.states['sun.sun'] ? hass.states['sun.sun'].state : null;
    if (sun === 'above_horizon') return true;
    if (sun === 'below_horizon') return false;
    // Fallback: solar production level.
    return this.getPower(this.config.entities.solar, hass) > 10;
  }

  resolveBackground(hass) {
    const day = this.isDay(hass);
    if (this.config.image) return this.config.image;
    if (day && this.config.day_image) return this.config.day_image;
    if (!day && this.config.night_image) return this.config.night_image;
    return day ? DEFAULT_DAY_IMAGE : DEFAULT_NIGHT_IMAGE;
  }

  // Build a flat render list: monitored devices + the "resto" pseudo-device.
  buildRenderList(otherPower) {
    const list = this.deviceDefs.map((d) => ({ ...d, kind: 'device' }));
    if (this.showOther) {
      list.push({
        id: 'resto',
        kind: 'resto',
        entity: null,
        type: 'other',
        name: 'RESTO',
        icon: DEVICE_TYPES.other.icon,
        color: DEVICE_TYPES.other.color,
        top: DEVICE_LAYOUT.other.top,
        left: DEVICE_LAYOUT.other.left,
        display_zero: false,
        tolerance: 0,
        _power: otherPower,
      });
    }
    return list;
  }

  // ---------------------------------------------------------------------------
  // First render
  // ---------------------------------------------------------------------------
  render(hass) {
    const title = this.config.title || 'FLUJO DE ENERGÍA';
    const currentBg = this.resolveBackground(hass);

    // Individual device chips (monitored devices only).
    const devicesHtml = this.deviceDefs.map((dev) => this.deviceChipHtml(dev)).join('');

    // "Resto" chip (fixed position, shown when there is remaining load).
    const restoHtml = this.showOther ? this.deviceChipHtml({
      id: 'resto', name: 'RESTO', color: DEVICE_TYPES.other.color,
      top: DEVICE_LAYOUT.other.top, left: DEVICE_LAYOUT.other.left,
    }) : '';

    // SVG flow paths + node dots for every device.
    const deviceFlowsSvg = this.deviceDefs.map((dev) => this.deviceFlowSvg(dev)).join('');
    const restoFlowSvg = this.showOther ? this.deviceFlowSvg({
      id: 'resto', type: 'other', top: DEVICE_LAYOUT.other.top, left: DEVICE_LAYOUT.other.left,
    }) : '';

    this.innerHTML = `
      <ha-card style="background: #0d0f12; border-radius: 20px; overflow: hidden; padding: 18px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px;">
          <div style="display: flex; align-items: center; gap: 10px; color: #e1e4ea; font-size: 1.05rem; font-weight: 700; letter-spacing: 0.5px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8e95a0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5" cy="6" r="2"></circle>
              <circle cx="19" cy="18" r="2"></circle>
              <path d="M5 8v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8"></path>
            </svg>
            <span>${title}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 5px 14px; border-radius: 20px; color: #e1e4ea; font-size: 0.85rem; font-weight: 500;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00E676; box-shadow: 0 0 8px #00E676;"></span>
            <span>En vivo</span>
          </div>
        </div>

        <!-- 3D Scene Viewport -->
        <div style="position: relative; width: 100%; aspect-ratio: 1/1; border-radius: 16px; overflow: hidden; background: #000;">
          <img id="card-bg-img" src="${currentBg}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px; display: block; transition: opacity 0.5s ease;">

          <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="glow-purple"><feDropShadow dx="0" dy="0" stdDeviation="0.8" flood-color="#a855f7" flood-opacity="0.95"/></filter>
              <filter id="glow-yellow"><feDropShadow dx="0" dy="0" stdDeviation="0.8" flood-color="#fbbf24" flood-opacity="0.95"/></filter>
              <filter id="glow-cyan"><feDropShadow dx="0" dy="0" stdDeviation="0.8" flood-color="#00e5ff" flood-opacity="0.95"/></filter>
              <filter id="glow-green"><feDropShadow dx="0" dy="0" stdDeviation="0.8" flood-color="#00E676" flood-opacity="0.95"/></filter>
              <filter id="glow-orange"><feDropShadow dx="0" dy="0" stdDeviation="0.8" flood-color="#ff9100" flood-opacity="0.95"/></filter>
              <filter id="dot-glow"><feDropShadow dx="0" dy="0" stdDeviation="0.6" flood-color="#fff" flood-opacity="0.8"/></filter>
            </defs>
            <style>
              .track-line { fill: none; stroke: rgba(255,255,255,0.18); stroke-width: 0.55; stroke-linecap: round; stroke-linejoin: round; }
              .glow-path { fill: none; stroke-width: 0.85; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 4 6; }
              .node-dot { fill: #ffffff; filter: url(#dot-glow); }
              @keyframes flow-forward { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
              @keyframes flow-backward { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 20; } }
            </style>

            <!-- Grid -->
            <path class="track-line" d="M 16 23 L 16 62.5 L 37 62.5" />
            <path id="path-grid" class="glow-path" d="M 16 23 L 16 62.5 L 37 62.5" stroke="transparent" />
            <circle cx="37" cy="62.5" r="1.1" class="node-dot" />
            <!-- Solar -->
            <path class="track-line" d="M 50 23 L 50 38.5" />
            <path id="path-solar" class="glow-path" d="M 50 23 L 50 38.5" stroke="transparent" />
            <circle cx="50" cy="38.5" r="1.1" class="node-dot" />
            <!-- House load -->
            <path class="track-line" d="M 84 23 L 84 50.5 L 64 50.5" />
            <path id="path-load" class="glow-path" d="M 84 23 L 84 50.5 L 64 50.5" stroke="transparent" />
            <circle cx="64" cy="50.5" r="1.1" class="node-dot" />
            <!-- Battery -->
            <path class="track-line" d="M 50 75 L 50 62.5 L 57.5 62.5" />
            <path id="path-batt" class="glow-path" d="M 50 75 L 50 62.5 L 57.5 62.5" stroke="transparent" />
            <circle cx="57.5" cy="62.5" r="1.1" class="node-dot" />

            <!-- Individual device flows -->
            ${deviceFlowsSvg}
            ${restoFlowSvg}
          </svg>

          <!-- Grid label -->
          <div style="position: absolute; top: 5%; left: 16%; transform: translateX(-50%); text-align: center; text-shadow: 0 2px 10px rgba(0,0,0,0.9);">
            <div id="val-grid" style="color: #ffffff; font-size: 1.35rem; font-weight: 800; line-height: 1.1;">0 W</div>
            <div id="label-grid" style="color: #8e95a0; font-size: 0.65rem; font-weight: 700; letter-spacing: 2px; margin-top: 2px;">RED</div>
          </div>
          <!-- Solar label -->
          <div style="position: absolute; top: 5%; left: 50%; transform: translateX(-50%); text-align: center; text-shadow: 0 2px 10px rgba(0,0,0,0.9);">
            <div id="val-solar" style="color: #ffffff; font-size: 1.35rem; font-weight: 800; line-height: 1.1;">—</div>
            <div style="color: #8e95a0; font-size: 0.65rem; font-weight: 700; letter-spacing: 2px; margin-top: 2px;">SOLAR</div>
          </div>
          <!-- House load label -->
          <div style="position: absolute; top: 5%; left: 84%; transform: translateX(-50%); text-align: center; text-shadow: 0 2px 10px rgba(0,0,0,0.9);">
            <div id="val-load" style="color: #ffffff; font-size: 1.35rem; font-weight: 800; line-height: 1.1;">0 W</div>
            <div style="color: #8e95a0; font-size: 0.65rem; font-weight: 700; letter-spacing: 2px; margin-top: 2px;">CASA</div>
          </div>
          <!-- Battery label -->
          <div style="position: absolute; bottom: 4%; left: 50%; transform: translateX(-50%); text-align: center; text-shadow: 0 2px 12px rgba(0,0,0,0.9); width: 80%;">
            <div id="val-batt" style="color: #ffffff; font-size: 1.45rem; font-weight: 800; line-height: 1.1;">0 W</div>
            <div id="state-batt" style="color: #8e95a0; font-size: 0.68rem; font-weight: 700; letter-spacing: 1.8px; margin-top: 3px;">REPOSO</div>
            <div id="soc-batt" style="color: #cfd4dc; font-size: 0.78rem; font-weight: 600; margin-top: 2px;">0%</div>
            <div id="autoconsumo-batt" style="font-size: 0.78rem; font-weight: 600; margin-top: 4px; color: #cfd4dc;">
              <span id="autoconsumo-val" style="color: #00E676; font-weight: 800;">100%</span> autoconsumo
            </div>
          </div>

          <!-- Device chips -->
          <div id="individual-devices" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
            ${devicesHtml}
            ${restoHtml}
          </div>
        </div>
      </ha-card>
    `;

    this.content = this.querySelector('ha-card');
    this.update(hass);
  }

  // HTML for one device chip (label + live value), positioned on the image.
  deviceChipHtml(dev) {
    return `
      <div id="dev-${dev.id}" style="
        position: absolute;
        top: ${dev.top};
        left: ${dev.left};
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: auto;
        transition: opacity 0.4s ease;
        white-space: nowrap;
      ">
        <div style="background: rgba(8,10,14,0.55); border: 1px solid ${dev.color}55; border-radius: 9px; padding: 2px 7px; display: inline-flex; align-items: center; gap: 5px; backdrop-filter: blur(2px);">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dev.color}; box-shadow: 0 0 6px ${dev.color};"></span>
          <span style="color: #dfe5ee; font-size: 0.6rem; font-family: monospace; letter-spacing: 0.3px;">${dev.name}</span>
          <span id="dev-val-${dev.id}" style="color: #ffffff; font-size: 0.62rem; font-weight: 700; font-family: monospace;">—</span>
        </div>
      </div>`;
  }

  // SVG for one device flow: track line + glow path + node dot.
  deviceFlowSvg(dev) {
    const x = toNumber(dev.left);
    const y = toNumber(dev.top);
    if (x === null || y === null) return '';
    const d = `M ${JUNCTION.x} ${JUNCTION.y} L ${x} ${y}`;
    return `
      <path class="track-line" d="${d}" />
      <path id="path-dev-${dev.id}" class="glow-path" d="${d}" stroke="transparent" />
      <circle cx="${x}" cy="${y}" r="1.1" class="node-dot" />`;
  }

  // ---------------------------------------------------------------------------
  // Update on every hass change
  // ---------------------------------------------------------------------------
  update(hass) {
    const config = this.config;
    const imgEl = this.querySelector('#card-bg-img');
    const currentBg = this.resolveBackground(hass);
    if (imgEl && imgEl.getAttribute('src') !== currentBg) {
      imgEl.setAttribute('src', currentBg);
    }

    // --- Read power values ---
    const rawGrid = this.getPower(config.entities.grid, hass);
    const rawSolar = Math.max(0, this.getPower(config.entities.solar, hass));
    let rawBatt = this.getPower(config.entities.battery, hass);

    const isGridInverted = config.invert_grid === true ||
      (config.invert_grid !== false && config.entities.grid && config.entities.grid.includes('invertid'));
    const gridPower = isGridInverted ? -rawGrid : rawGrid;

    if (config.invert_battery === true) rawBatt = -rawBatt;

    const isCharging = rawBatt > 5;
    const isDischarging = rawBatt < -5;
    const battAbs = Math.abs(rawBatt);

    let load = 0;
    if (config.entities.load) {
      load = Math.abs(this.getPower(config.entities.load, hass));
    } else {
      load = Math.max(0, Math.round(rawSolar + gridPower - rawBatt));
    }

    // --- Individual devices + "resto" ---
    const indPowerSum = this.deviceDefs.reduce(
      (sum, dev) => sum + Math.max(0, this.getPower(dev.entity, hass)), 0);
    const otherPower = Math.max(0, load - indPowerSum);

    // --- Grid ---
    const elGrid = this.querySelector('#val-grid');
    const elGridLabel = this.querySelector('#label-grid');
    const pathGrid = this.querySelector('#path-grid');
    elGrid.innerText = this.formatPower(gridPower);
    if (gridPower > 5) {
      elGridLabel.innerText = 'IMPORTANDO';
      pathGrid.style.stroke = '#a855f7';
      pathGrid.style.filter = 'url(#glow-purple)';
      pathGrid.style.animation = 'flow-forward 1.8s linear infinite';
    } else if (gridPower < -5) {
      elGridLabel.innerText = 'EXPORTANDO';
      pathGrid.style.stroke = '#ff9100';
      pathGrid.style.filter = 'url(#glow-orange)';
      pathGrid.style.animation = 'flow-backward 1.8s linear infinite';
    } else {
      elGridLabel.innerText = 'RED';
      pathGrid.style.stroke = 'transparent';
      pathGrid.style.animation = 'none';
    }

    // --- Solar ---
    const elSolar = this.querySelector('#val-solar');
    const pathSolar = this.querySelector('#path-solar');
    elSolar.innerText = this.formatPower(rawSolar, true);
    if (rawSolar > 5) {
      pathSolar.style.stroke = '#fbbf24';
      pathSolar.style.filter = 'url(#glow-yellow)';
      pathSolar.style.animation = 'flow-forward 1.8s linear infinite';
    } else {
      pathSolar.style.stroke = 'transparent';
      pathSolar.style.animation = 'none';
    }

    // --- House load ---
    const elLoad = this.querySelector('#val-load');
    const pathLoad = this.querySelector('#path-load');
    elLoad.innerText = this.formatPower(load);
    if (load > 5) {
      pathLoad.style.stroke = '#00e5ff';
      pathLoad.style.filter = 'url(#glow-cyan)';
      pathLoad.style.animation = 'flow-forward 1.8s linear infinite';
    } else {
      pathLoad.style.stroke = 'transparent';
      pathLoad.style.animation = 'none';
    }

    // --- Battery ---
    const elBatt = this.querySelector('#val-batt');
    const elStateBatt = this.querySelector('#state-batt');
    const pathBatt = this.querySelector('#path-batt');
    elBatt.innerText = this.formatPower(battAbs);
    if (isDischarging) {
      elStateBatt.innerText = 'DESCARGANDO';
      pathBatt.style.stroke = '#00e5ff';
      pathBatt.style.filter = 'url(#glow-cyan)';
      pathBatt.style.animation = 'flow-backward 1.8s linear infinite';
    } else if (isCharging) {
      elStateBatt.innerText = 'CARGANDO';
      pathBatt.style.stroke = '#00E676';
      pathBatt.style.filter = 'url(#glow-green)';
      pathBatt.style.animation = 'flow-forward 1.8s linear infinite';
    } else {
      elStateBatt.innerText = 'REPOSO';
      pathBatt.style.stroke = 'transparent';
      pathBatt.style.animation = 'none';
    }

    // --- Battery SoC ---
    const elSoc = this.querySelector('#soc-batt');
    let socVal = 0;
    if (config.entities.battery_soc && hass.states[config.entities.battery_soc]) {
      const rawSoc = parseFloat(hass.states[config.entities.battery_soc].state);
      socVal = isNaN(rawSoc) ? 0 : Math.round(rawSoc);
    }
    const units = config.battery_units !== undefined ? config.battery_units : 1;
    elSoc.innerText = units ? `${socVal}% · ${units} uds` : `${socVal}%`;

    // --- Autoconsumo ---
    const elAutoconsumo = this.querySelector('#autoconsumo-batt');
    const elAutoconsumoVal = this.querySelector('#autoconsumo-val');
    if (config.show_autoconsumo !== false) {
      elAutoconsumo.style.display = 'block';
      let autoPct = 100;
      if (gridPower > 0 && load > 0) {
        const selfConsumed = Math.max(0, load - gridPower);
        autoPct = Math.min(100, Math.max(0, Math.round((selfConsumed / load) * 100)));
      }
      elAutoconsumoVal.innerText = `${autoPct}%`;
    } else {
      elAutoconsumo.style.display = 'none';
    }

    // --- Devices (monitored) + resto ---
    const renderList = this.buildRenderList(otherPower);
    renderList.forEach((dev) => {
      const devEl = this.querySelector(`#dev-${dev.id}`);
      const devValEl = this.querySelector(`#dev-val-${dev.id}`);
      const devPath = this.querySelector(`#path-dev-${dev.id}`);
      if (!devEl || !devValEl) return;

      const power = dev._power !== undefined ? dev._power : this.getPower(dev.entity, hass);
      const isActive = Math.abs(power) > Math.max(dev.tolerance, 1);

      if (!dev.display_zero && !isActive) {
        devEl.style.opacity = '0';
        if (devPath) {
          devPath.style.stroke = 'transparent';
          devPath.style.animation = 'none';
        }
        devValEl.innerText = '0 W';
      } else {
        devEl.style.opacity = '1';
        if (devPath) {
          if (isActive) {
            devPath.style.stroke = dev.color;
            devPath.style.filter = `drop-shadow(0 0 0.8px ${dev.color})`;
            devPath.style.animation = 'flow-forward 1.8s linear infinite';
          } else {
            devPath.style.stroke = 'transparent';
            devPath.style.animation = 'none';
          }
        }
        devValEl.innerText = isActive ? this.formatPower(power) : '0 W';
      }
    });
  }

  getCardSize() {
    return 4;
  }
}

customElements.define('lovelace-3d-power-flow-card', PowerFlow3DCard);
