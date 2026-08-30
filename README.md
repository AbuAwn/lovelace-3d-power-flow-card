# 🏠 3D Power Flow Card for Home Assistant

<p align="center">
  <img src="preview.png" alt="3D Power Flow Card Preview" width="480">
</p>

<p align="center">
  A custom Lovelace card displaying your home's real-time energy flow over a stunning 3D isometric house render, with neon-glowing animated SVG paths and automatic day/night background switching.
</p>

<p align="center">
  <a href="https://github.com/AbuAwn/lovelace-3d-power-flow-card/releases/latest"><img src="https://img.shields.io/github/v/release/AbuAwn/lovelace-3d-power-flow-card?style=flat-square&color=blue" alt="Latest Release"></a>
  <a href="https://github.com/AbuAwn/lovelace-3d-power-flow-card/blob/main/LICENSE"><img src="https://img.shields.io/github/license/AbuAwn/lovelace-3d-power-flow-card?style=flat-square" alt="License"></a>
</p>

---

## ✨ Features

- **🌅 Dynamic Day & Night 3D Renders** — Automatically switches between a daytime and nighttime 3D isometric house based on `sun.sun` entity or solar production level.
- **⚡ Animated Neon Energy Flows** — Color-coded glowing SVG paths with directional animations:
  - 🟣 **Purple** — Grid Import
  - 🟠 **Orange** — Grid Export
  - 🟡 **Amber / Gold** — Solar Generation
  - 🔵 **Cyan** — House Consumption & Battery Discharge
  - 🟢 **Green** — Battery Charging
- **🔢 Auto Home Load Calculation** — If no `load` entity is set, the card calculates consumption automatically:  
  `Home Load = Solar + Grid Import - Battery Charge + Battery Discharge`
- **📊 Real-time Self-Consumption (Autoconsumo)** — Percentage of load covered by local sources.
- **🔌 Universal Unit Support** — Automatically detects and converts `W` / `kW` sensor states.
- **🖼️ Custom Background Images** — Override day, night, or use a single static image.

---

## 📦 Installation via HACS

1. Go to **HACS → Frontend → ⋮ → Custom repositories**.
2. Add `https://github.com/AbuAwn/lovelace-3d-power-flow-card` and set category to **Lovelace**.
3. Search for **3D Power Flow Card** and install it.
4. Reload your browser (`Ctrl+F5`).

---

## ⚙️ Configuration Example

```yaml
type: custom:lovelace-3d-power-flow-card
title: FLUJO DE ENERGÍA
entities:
  grid: sensor.potencia_red_invertida
  solar: sensor.produccion_solar_total
  battery: sensor.hoymiles_hybride_battery_power
  battery_soc: sensor.hoymiles_hybride_battery_soc
  # load: sensor.consumo_casa_total   # Optional: auto-calculated if omitted
invert_grid: true   # Use if your grid sensor is sign-inverted (see Sign Convention below)
battery_units: 1
```

---

## 🔌 Individual Devices (Piscina, AC, Calentador, etc.)

Add a `individual` list to monitor specific devices. They appear as live chips below the 3D house:

```yaml
individual:
  - entity: sensor.piscina_potencia
    name: Piscina
    type: pool              # Enables preset icon & color
    display_zero: false     # Hide chip when off

  - entity: sensor.termo_potencia
    name: Calentador
    type: heater
    display_zero: false

  - entity: sensor.id_ac_salon_power
    name: Aire Acondicionado
    type: ac
    display_zero: true      # Always visible

  - entity: sensor.secadora_potencia
    name: Secadora
    type: dryer
    display_zero: false
    display_zero_tolerance: 1   # Hide below 1 W
```

### Available `type` presets

| `type` | Icon | Color |
|---|---|---|
| `pool` | 🏊 `mdi:pool` | Cyan |
| `heater` | 🔥 `mdi:water-boiler` | Orange |
| `ac` | ❄️ `mdi:air-conditioner` | Light Blue |
| `washer` | 🫧 `mdi:washing-machine` | Sky Blue |
| `dryer` | 🌀 `mdi:tumble-dryer` | Amber |
| `ev` | 🔌 `mdi:ev-station` | Green |
| `boiler` | 🔥 `mdi:fire` | Orange |
| `oven` | 🍳 `mdi:stove` | Orange |

You can also override icon and color freely:
```yaml
individual:
  - entity: sensor.mi_dispositivo
    name: Dispositivo
    icon: mdi:television       # Any MDI icon
    color: '#ff6b35'           # Any CSS color
    display_zero: false
```

### Device Chip Behavior
- **Active** (power > 0): Full opacity, colored glow border, shows `X W` or `X,XX kW`.
- **Inactive** (power ≈ 0): Dimmed chip, shows `—`.
- With `display_zero: false`: Chip is hidden when inactive.

---

## 🔄 Sign Convention — Critical for Correct Readings

Different inverters and meters use different sign conventions. You **must** understand your sensors to configure the card correctly.

### Grid sensor (`entities.grid`)

| Sensor State | Meaning |
|---|---|
| Positive (`> 0`) | Importing from grid (default expected) |
| Negative (`< 0`) | Exporting to grid (default expected) |

If your grid sensor is **inverted** (e.g. `sensor.potencia_red_invertida`, negative = importing), set:
```yaml
invert_grid: true
```
> **Auto-detection:** If the entity name contains the word `invertid`, the card enables `invert_grid` automatically.

### Battery sensor (`entities.battery`)

| Sensor State | Meaning |
|---|---|
| Negative (`< 0`) | Discharging — powering the home (Hoymiles default) |
| Positive (`> 0`) | Charging — storing solar energy (Hoymiles default) |

If your battery sensor has the **opposite** convention (positive = discharging), set:
```yaml
invert_battery: true
```

### Example — DTS WiFi G1 + Hoymiles inverter

```yaml
type: custom:lovelace-3d-power-flow-card
title: FLUJO DE ENERGÍA
entities:
  grid: sensor.potencia_red_invertida
  solar: sensor.suma_potencia_inversores_2
  battery: sensor.energia_dts_wifi_g1_potencia_neta_bateria
  battery_soc: sensor.energia_hybrid_inverter_state_of_charge

invert_grid: true        # sensor.potencia_red_invertida: negativo = importar
invert_battery: true     # sensor.energia_dts_wifi_g1: positivo = descargar

battery_units: 1
show_autoconsumo: true
```

---

## 🖼️ Custom Backgrounds

By default, the card uses beautiful built-in 3D renders (both embedded as high-resolution WebP).  
You can override them per-state or use a single static image:

```yaml
# Custom day/night images:
day_image: /local/mi_casa_dia.png
night_image: /local/mi_casa_noche.png

# OR a single static image (overrides day/night logic):
image: /local/mi_casa.png
```

---

## 📋 Configuration Options

### `entities` (Required)

| Key | Type | Required | Description |
|---|---|---|---|
| `entities.grid` | string | **Required** | Grid power sensor entity |
| `entities.solar` | string | Optional | Solar production sensor |
| `entities.battery` | string | Optional | Battery power sensor |
| `entities.battery_soc` | string | Optional | Battery state of charge (%) |
| `entities.load` | string | Optional | Home load sensor. **Auto-calculated if omitted** |

### Card Options

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `FLUJO DE ENERGÍA` | Header title |
| `invert_grid` | boolean | `auto` | Invert grid power sign. Auto-detected if entity name contains `invertid` |
| `invert_battery` | boolean | `false` | Invert battery power sign (positive = discharging for some sensors) |
| `battery_units` | number | `1` | Number of battery units displayed next to SoC (set to `0` to hide) |
| `show_autoconsumo` | boolean | `true` | Show real-time self-consumption percentage |
| `day_image` | string | Built-in 3D Day Render | Custom background URL/path for daytime |
| `night_image` | string | Built-in 3D Night Render | Custom background URL/path for nighttime |
| `image` | string | — | Static background override (disables day/night switching) |

---

## 🧮 Calculation Logic

When no `load` entity is provided:

```
Home Load (W) = Solar (W) + Grid Power (W) - Battery Power (W)
```

Where:
- `Grid Power` is positive when **importing**, negative when **exporting**.
- `Battery Power` is negative when **discharging** (after sign inversion if `invert_battery: true`).

**Self-Consumption (Autoconsumo):**
```
Autoconsumo (%) = ((Home Load - Grid Import) / Home Load) × 100
```

---

## 🌙 Day / Night Detection

The card selects the background automatically:

1. **Priority 1:** `sun.sun` entity in Home Assistant (most reliable).  
   - `above_horizon` → Day image  
   - `below_horizon` → Night image
2. **Fallback:** If `sun.sun` is unavailable, uses solar production:  
   - `Solar > 10 W` → Day image  
   - `Solar ≤ 10 W` → Night image

---

## 🛠️ Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Solar shows `—` at midday | Sensor in `kW` without `unit_of_measurement` attribute | Verify `unit_of_measurement` in HA Developer Tools |
| Battery shows `CARGANDO` when it should discharge | Sensor sign is inverted | Add `invert_battery: true` |
| Grid shows `IMPORTANDO` when exporting | Sensor sign is inverted | Add `invert_grid: true` |
| Casa shows incorrect value | Grid or battery sign wrong → bad energy balance | Fix sign conventions above |
| Autoconsumo always 0% | Grid > Load in calculation | Usually resolves after fixing sign convention |

---

## 📄 License

MIT © [AbuAwn](https://github.com/AbuAwn)
