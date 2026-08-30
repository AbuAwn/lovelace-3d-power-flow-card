class PowerFlow3DCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      const defaultImage = (typeof import.meta !== 'undefined' && import.meta.url)
        ? new URL('default_3d_house.png', import.meta.url).href
        : '/hacsfiles/lovelace-3d-power-flow-card/default_3d_house.png';
      const bgImage = this.config.image || defaultImage;
      const title = this.config.title || 'FLUJO DE ENERGÍA';

      this.innerHTML = `
        <ha-card style="background: #0f1115; border-radius: 16px; overflow: hidden; padding: 16px; font-family: system-ui;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: #a0a0a0; margin-bottom: 20px; font-weight: 600;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <ha-icon icon="mdi:swap-horizontal"></ha-icon> ${title}
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px; color: #fff; font-size: 0.9em;">
              <span style="color: #4CAF50;">●</span> En vivo
            </div>
          </div>
          
          <div style="position: relative; width: 100%; aspect-ratio: 1/1;">
            <img src="${bgImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
            
            <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" viewBox="0 0 100 100" preserveAspectRatio="none">
              <style>
                .flow-line { fill: none; stroke: rgba(255,255,255,0.2); stroke-width: 0.5; }
                .flow-anim { fill: none; stroke: #4facfe; stroke-width: 0.8; stroke-dasharray: 4 4; animation: flow 2s linear infinite; }
                @keyframes flow { to { stroke-dashoffset: -16; } }
                @keyframes flow-reverse { to { stroke-dashoffset: 16; } }
              </style>
              
              <path class="flow-line" d="M 15 15 L 15 65 L 35 65" />
              <path id="path-grid" class="flow-anim" d="M 15 15 L 15 65 L 35 65" />
              <circle cx="35" cy="65" r="1" fill="#fff" />

              <path class="flow-line" d="M 50 15 L 50 40" />
              <path id="path-solar" class="flow-anim" d="M 50 15 L 50 40" />
              <circle cx="50" cy="40" r="1" fill="#fff" />

              <path class="flow-line" d="M 85 15 L 85 55 L 70 55" />
              <path id="path-load" class="flow-anim" d="M 85 15 L 85 55 L 70 55" />
              <circle cx="70" cy="55" r="1" fill="#fff" />

              <path class="flow-line" d="M 50 80 L 50 65 L 60 65" />
              <path id="path-batt" class="flow-anim" d="M 50 80 L 50 65 L 60 65" />
              <circle cx="60" cy="65" r="1" fill="#fff" />
            </svg>

            <div style="position: absolute; top: 5%; left: 15%; transform: translateX(-50%); text-align: center;">
              <div id="val-grid" style="color: #fff; font-size: 1.2em; font-weight: bold;">0 W</div>
              <div style="color: #888; font-size: 0.7em; letter-spacing: 1px;">RED</div>
            </div>
            
            <div style="position: absolute; top: 5%; left: 50%; transform: translateX(-50%); text-align: center;">
              <div id="val-solar" style="color: #fff; font-size: 1.2em; font-weight: bold;">0 W</div>
              <div style="color: #888; font-size: 0.7em; letter-spacing: 1px;">SOLAR</div>
            </div>
            
            <div style="position: absolute; top: 5%; left: 85%; transform: translateX(-50%); text-align: center;">
              <div id="val-load" style="color: #fff; font-size: 1.2em; font-weight: bold;">0 W</div>
              <div style="color: #888; font-size: 0.7em; letter-spacing: 1px;">CASA</div>
            </div>
            
            <div style="position: absolute; bottom: 5%; left: 50%; transform: translateX(-50%); text-align: center;">
              <div id="val-batt" style="color: #fff; font-size: 1.4em; font-weight: bold;">0 W</div>
              <div id="state-batt" style="color: #888; font-size: 0.7em; letter-spacing: 1px;">REPOSO</div>
              <div id="soc-batt" style="color: #aaa; font-size: 0.75em; margin-top: 4px;">0%</div>
            </div>
          </div>
        </ha-card>
      `;
      this.content = this.querySelector('ha-card');
    }

    const getState = (entity) => entity && hass.states[entity] ? Math.round(hass.states[entity].state) : 0;

    const grid = getState(this.config.entities.grid);
    const load = getState(this.config.entities.load);
    const solar = getState(this.config.entities.solar);
    const batt = getState(this.config.entities.battery);
    
    this.querySelector('#val-grid').innerText = `${Math.abs(grid)} W`;
    this.querySelector('#val-load').innerText = `${Math.abs(load)} W`;
    this.querySelector('#val-solar').innerText = `${Math.abs(solar)} W`;
    
    const pathBatt = this.querySelector('#path-batt');
    this.querySelector('#val-batt').innerText = `${Math.abs(batt)} W`;
    
    if (batt > 0) {
      this.querySelector('#state-batt').innerText = 'DESCARGANDO';
      pathBatt.style.animation = 'flow 2s linear infinite';
      pathBatt.style.stroke = '#4facfe';
    } else if (batt < 0) {
      this.querySelector('#state-batt').innerText = 'CARGANDO';
      pathBatt.style.animation = 'flow-reverse 2s linear infinite';
      pathBatt.style.stroke = '#4CAF50';
    } else {
      this.querySelector('#state-batt').innerText = 'REPOSO';
      pathBatt.style.animation = 'none';
      pathBatt.style.stroke = 'transparent';
    }

    if (this.config.entities.battery_soc && hass.states[this.config.entities.battery_soc]) {
      this.querySelector('#soc-batt').innerText = `${hass.states[this.config.entities.battery_soc].state}%`;
    }
  }

  setConfig(config) {
    if (!config.entities || !config.entities.grid || !config.entities.load) {
      throw new Error('Debes definir las entidades en la configuración (grid y load son obligatorias).');
    }
    this.config = config;
  }
}
customElements.define('lovelace-3d-power-flow-card', PowerFlow3DCard);
