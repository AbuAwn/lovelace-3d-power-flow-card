# 3D Power Flow Card for Home Assistant

A custom Lovelace card that displays your home's energy flow over a beautiful 3D isometric background with animated SVG paths.

## Features
- Custom 3D background image support.
- Animated SVG energy flows based on real-time data.
- Dynamic battery states (Charging/Discharging/Idle) with color coding.
- **Auto-calculates Home Load:** If you don't provide a `load` entity, the card automatically calculates your home consumption (`Grid + Solar + Battery`).

## Installation via HACS
1. Go to **Frontend** > **Custom repositories** in HACS.
2. Add `https://github.com/AbuAwn/lovelace-3d-power-flow-card` as a **Lovelace** repository.
3. Download and reload your browser.

## Configuration Example
```yaml
type: custom:lovelace-3d-power-flow-card
title: FLUJO DE ENERGÍA
image: /local/casa_3d.png
entities:
  grid: sensor.potencia_red_invertida
  solar: sensor.produccion_solar_total
  battery: sensor.hoymiles_hybride_battery_power
  battery_soc: sensor.hoymiles_hybride_battery_soc
  # load: sensor.consumo_casa_total # Optional: Automatically calculated if omitted
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
| `entities.load` | string | Optional | Home load entity. Automatically calculated if omitted | `Grid + Solar + Battery` |
| `invert_grid` | boolean | Optional | Invert grid power sign (auto-detected if entity name contains 'invertid') | `auto` |
| `invert_battery` | boolean | Optional | Invert battery power sign (if charging/discharging is reversed) | `false` |
| `battery_units` | number | Optional | Number of battery units displayed next to SoC | `1` |
| `show_autoconsumo` | boolean | Optional | Display real-time self-consumption percentage | `true` |


