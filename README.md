# 3D Power Flow Card for Home Assistant

A custom Lovelace card that displays your home's energy flow over a beautiful 3D isometric background with animated SVG paths.

## Features
- Custom 3D background image support.
- Animated SVG energy flows based on real-time data.
- Dynamic battery states (Charging/Discharging/Idle) with color coding.

## Installation via HACS
1. Go to **Frontend** > **Custom repositories** in HACS.
2. Add `https://github.com/AbuAwn/lovelace-3d-power-flow-card` as a **Lovelace** repository.
3. Download and reload your browser.

## Configuration Example
```yaml
type: custom:lovelace-3d-power-flow-card
title: FLUJO DE ENERGÍA
# image: /local/mi_casa_3d.png # (Opcional: Si se omite, usa la imagen 3D por defecto)
entities:
  grid: sensor.potencia_red_invertida
  load: sensor.consumo_casa_total
  solar: sensor.produccion_solar_total
  battery: sensor.hoymiles_hybride_battery_power
  battery_soc: sensor.hoymiles_hybride_battery_soc
```

## Options
| Name | Type | Requirement | Description | Default |
| --- | --- | --- | --- | --- |
| `type` | string | **Required** | `custom:lovelace-3d-power-flow-card` | |
| `entities` | object | **Required** | Entities mapping (`grid`, `load`, `solar`, `battery`, `battery_soc`) | |
| `title` | string | Optional | Header title | `FLUJO DE ENERGÍA` |
| `image` | string | Optional | Custom background image path or URL | Built-in 3D House Image (`default_3d_house.png`) |

