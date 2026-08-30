# 3D Power Flow Card for Home Assistant

A custom Lovelace card that displays your home's energy flow over a beautiful 3D isometric house render with animated neon SVG paths and automatic day/night dynamic backgrounds.

## Features
- **Dynamic Day & Night 3D Renders:** Automatically switches between day and night 3D isometric renders based on `sun.sun` or solar generation.
- **Custom Image Support:** Easily set custom static, day, or night backgrounds.
- **Animated Neon Energy Flows:** Color-coded paths with glowing animations:
  - 🟣 **Purple:** Grid Import
  - 🟠 **Orange:** Grid Export
  - 🟡 **Amber/Gold:** Solar Generation
  - 🔵 **Cyan:** House Consumption & Battery Discharge
  - 🟢 **Green:** Battery Charging
- **Auto-calculates Home Load:** If you don't provide a `load` entity, the card automatically calculates your home consumption (`Solar + Grid - Battery`).
- **Real-time Self-Consumption:** Displays dynamic autoconsumo percentage.
- **Universal Unit Support:** Automatically detects and converts `W` and `kW` sensor states with smart formatting.

## Installation via HACS
1. Go to **Frontend** > **Custom repositories** in HACS.
2. Add `https://github.com/AbuAwn/lovelace-3d-power-flow-card` as a **Lovelace** repository.
3. Download and reload your browser.

## Configuration Example
```yaml
type: custom:lovelace-3d-power-flow-card
title: FLUJO DE ENERGÍA
entities:
  grid: sensor.potencia_red_invertida
  solar: sensor.produccion_solar_total
  battery: sensor.hoymiles_hybride_battery_power
  battery_soc: sensor.hoymiles_hybride_battery_soc
  # load: sensor.consumo_casa_total # Optional: Automatically calculated if omitted
# day_image: /local/mi_casa_dia.png   # Optional custom day image
# night_image: /local/mi_casa_noche.png # Optional custom night image
```

### Preview
<p align="center">
  <img src="preview.png" alt="3D Power Flow Card Preview" width="450">
</p>

## Options
| Name | Type | Requirement | Description | Default |
| --- | --- | --- | --- | --- |
| `type` | string | **Required** | `custom:lovelace-3d-power-flow-card` | |
| `entities` | object | **Required** | Entities mapping (`grid`, `solar`, `battery`, `battery_soc`, `load`) | |
| `title` | string | Optional | Header title | `FLUJO DE ENERGÍA` |
| `entities.load` | string | Optional | Home load entity. Automatically calculated if omitted | `Solar + Grid - Battery` |
| `day_image` | string | Optional | Custom background image path or URL for daytime | Built-in 3D House (Day) |
| `night_image` | string | Optional | Custom background image path or URL for nighttime | Built-in 3D House (Night) |
| `image` | string | Optional | Static background image override | Dynamic Day/Night |
| `invert_grid` | boolean | Optional | Invert grid power sign | `auto` |
| `invert_battery` | boolean | Optional | Invert battery power sign (if charging/discharging is reversed) | `false` |
| `battery_units` | number | Optional | Number of battery units displayed next to SoC | `1` |
| `show_autoconsumo` | boolean | Optional | Display real-time self-consumption percentage | `true` |
