# Gentle Walk

> **Hyperlocal walking planner for pollution-sensitive elderly citizens.**
> Focuses on ONE small area (a park, colony, or campus) and optimizes **inhaled particulate dose** instead of travel distance or time.

---

## 🌿 Core Concept & Optimization Model

Traditional map routers optimize for shortest distance or fastest walking time, directing pedestrians along busy arterial roads. For pollution-sensitive elders, **inhaled particulate exposure** is the critical health constraint.

Gentle Walk minimizes the inhaled dose of fine particulate matter ($PM_{2.5}$):

$$\text{dose} = PM_{2.5}(\text{hour}) \times \text{path\_factor} \times \text{minutes} \times \text{breathing\_rate} \times \text{sensitivity}$$

Where:
- $\text{minutes} = \frac{\text{lengthMeters}}{\text{walkSpeed}}$
- $\text{path\_factor} = \text{classFactor} + (\text{hotspotPenalty if within 30m of pollution source})$
- $\text{routing\_cost} = \begin{cases} \infty & \text{if lowMobility and slope} > 5.0\% \\ \text{dose} \times 0.9 & \text{if path has a rest bench} \\ \text{dose} & \text{otherwise} \end{cases}$

---

## ⚙️ Tunable Heuristic Assumptions

> **Disclaimer:** Gentle Walk is an algorithmic planning aid and not medical advice. None of these values are clinically measured laboratory constants; they are heuristic approximations based on environmental health literature and CPCB guidelines.

| Property (`application.yml`) | Default Value | Unit | Rationale / Source |
| :--- | :--- | :--- | :--- |
| `walk-speed-m-per-min` | `60.0` | m/min | ~3.6 km/h, comfortable elder strolling pace |
| `breathing-m3-per-min` | `0.02` | $\text{m}^3/\text{min}$ | ~20 L/min minute ventilation volume during light walking |
| `sensitivity.normal` | `1.0` | multiplier | Baseline healthy adult |
| `sensitivity.sensitive` | `1.5` | multiplier | Mild asthma, allergic rhinitis, senior citizen |
| `sensitivity.very-sensitive` | `2.0` | multiplier | COPD, cardiovascular conditions, frail elders |
| `class-factor.primary` | `1.6` | factor | High vehicular traffic, diesel exhaust, tailpipe proximity |
| `class-factor.secondary` | `1.4` | factor | Moderate vehicle flow, stop-and-go junction traffic |
| `class-factor.residential` | `1.15` | factor | Low vehicle flow, domestic cooking emissions |
| `class-factor.footpath` | `1.0` | factor | Dedicated pedestrian path separated from motorized lanes |
| `class-factor.park-path` | `0.7` | factor | Tree canopy particulate filtration, set back from roads |
| `hotspot-penalty` | `0.3` | additive factor | Diesel generator, tandoor/dhaba smoke, bus idling stop |
| `max-slope-low-mobility-percent` | `5.0` | % incline | Gentle walking constraint preventing elder knee/cardiac strain |
| `bench-cost-multiplier` | `0.9` | multiplier | 10% routing discount for paths equipped with rest benches |
| `traffic-light.green-max` | `60.0` | $\mu\text{g}/\text{m}^3$ | CPCB 24h Satisfactory standard ($\le 60$) |
| `traffic-light.yellow-max` | `90.0` | $\mu\text{g}/\text{m}^3$ | Moderate threshold ($\le 90$); take short gentle walks |
| `loop.length-tolerance` | `0.25` | fraction | Target loop duration tolerance ($\pm 25\%$) |
| `loop.max-candidates` | `60` | count | Turnaround candidate search limit |
| `loop.return-path-penalty` | `4.0` | multiplier | Weight multiplier applied to outward edges to prevent backtracking |
| `loop.random-seed` | `42` | seed | Fixed pseudo-random seed for deterministic repeatability |

---

## 🚀 Quickstart & Setup

The project uses Nix flakes for zero-configuration reproducible environments with Java 21, Maven 3.9, and Node.js.

### 1. Enter Development Environment
```bash
nix develop
```

### 2. Run Backend Tests
```bash
mvn test
```
All 21 unit and integration tests run offline against recorded JSON fixtures and mocked HTTP services.

### 3. Start Backend Server
```bash
mvn spring-boot:run
```
Backend starts on `http://localhost:8080`.
- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

### 4. Start Frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔄 Switching Between Demo Mode and Live Mode

Gentle Walk runs **100% offline in Demo Mode** with zero sensor or API dependencies:

- **Demo Mode (`demo: true`)**:
  - Uses a synthetic $14 \times 14$ grid (60m grid spacing, row 5 primary road, col 9 secondary road, corner park with benches, 8% incline patch, and junction hotspot).
  - Uses an invented 24-hour diurnal $PM_{2.5}$ curve with a dawn smog peak (135 $\mu\text{g}/\text{m}^3$ at 08:00) and an afternoon dip (42 $\mu\text{g}/\text{m}^3$ at 15:00).
  - Every API response marks `"mode": "demo"` and the UI displays a clear amber banner: *"Demo data - numbers are invented"*.

- **Live Mode (`demo: false`)**:
  - Uncheck "Demo Mode" in the UI sidebar or pass `demo: false` in the API.
  - Queries **OpenStreetMap Overpass API** for real walkable ways (`highway=*`), park polygons (`leisure=park`), and benches (`amenity=bench`).
  - Queries **Open-Meteo Air Quality API** for hourly forecast $PM_{2.5}$.
  - Queries **Open-Meteo Elevation API** for node elevations to evaluate slope percentage.
  - Results are cached in Caffeine (24h for graph & elevation, 30 min for air quality).

---

## 📡 REST API Reference

### 1. `GET /api/health`
Health check endpoint returning system status and timestamp.

### 2. `GET /api/window`
Evaluates the 24-hour diurnal forecast and finds the cleanest walking window.
- **Parameters**: `lat` (double), `lon` (double), `hours` (int, default 1), `demo` (boolean)
- **Response**:
  ```json
  {
    "mode": "demo",
    "window": {
      "startHour": 15,
      "endHour": 16,
      "meanPm25": 42.0,
      "worstSlotMean": 135.0,
      "trafficLight": "GREEN",
      "hourlyPm25": [72.0, 68.0, ..., 42.0, ...]
    },
    "disclaimer": "Gentle Walk is an algorithmic planning aid and not medical advice."
  }
  ```

### 3. `POST /api/plan`
Generates the lowest-dose loop vs typical baseline loop.
- **Request Body**:
  ```json
  {
    "lat": 28.6139,
    "lon": 77.2090,
    "radiusM": 800,
    "minutes": 20,
    "sensitivity": "NORMAL",
    "lowMobility": false,
    "hour": 15,
    "hotspots": [
      { "lat": 28.6145, "lon": 77.2092, "description": "Idling generator" }
    ],
    "demo": true
  }
  ```
- **Response**: Returns `bestLoop`, `baselineLoop`, `reductionPct` (e.g. `23.5%`), `extraMinutes`, GeoJSON LineString coordinates, and road class breakdowns.

### 4. `POST /api/validate/sensor`
Compares handheld portable sensor readings against the model's loop ranking.
- **Body**: CSV content (`loop,time,pm25`)
- **Query Params**: `modelDoseLoopA`, `modelDoseLoopB`
- **Response**: Empirical winner, model winner, ranking agreement, and percentage difference.

---

## 🎯 Pitch Validation Guide

When pitching Gentle Walk at a hackathon or jury review, demonstrate these key proofs:

1. **The Diurnal Window Demo**:
   - Show how pollution in urban colonies peaks in early morning (07:00–09:00, Red status, $>130\ \mu\text{g}/\text{m}^3$) due to the winter inversion layer.
   - Show that moving the elder's walk to 15:00 (Green status, $42\ \mu\text{g}/\text{m}^3$) cuts baseline exposure by **over 65% before walking a single meter**.

2. **The Hyperlocal Routing Demo**:
   - Compare the **Cleanest Loop** (green line) vs the **Typical Street Loop** (grey dashed line).
   - Point out how the router deliberately takes shaded park footpaths with rest benches and routes away from primary vehicular junctions.
   - Show the **Inhaled Dose Reduction Metric** (typically 20% to 35% lower dose with only 1–2 extra minutes of walking).

3. **Elder Constraints Demo**:
   - Toggle **"Avoid Steep Slopes"**: verify that paths with $>5\%$ incline are excluded.
   - Tap on the map to add an **Idling Diesel Generator Hotspot**: watch the planner dynamically re-route around the 30-meter exclusion zone.

4. **Empirical Validation**:
   - Show `POST /api/validate/sensor` validating real handheld particulate counter logs against the router's ranking.

---

## ⚠️ Known Limitations & Edge Cases

1. **OpenStreetMap Data Completeness**:
   - In some residential colonies, footpaths and bench nodes may not yet be tagged in OSM. Gentle Walk defaults untagged roads to `RESIDENTIAL`.
2. **Coarse Forecast Grid**:
   - Open-Meteo Air Quality forecasts have a spatial resolution of ~11 km ($0.1^\circ$). While excellent for diurnal timing, hyperlocal spatial variation relies on road class proximity factors and user-marked hotspots.
3. **Proxy Exposure Factors**:
   - Road class factors (`1.6x` for primary, `0.7x` for park) are heuristic proxies based on vehicular proximity studies, not micro-sensors on every street.
4. **Complex Multipolygon Parks**:
   - Large urban parks mapped as nested multipolygon relations with inner rings may occasionally fall back to standard road classification if outer rings are fragmented.
