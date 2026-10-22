# 🌿 Gentle Walk

> **A hyperlocal walking companion and community route planner designed for pollution-sensitive elders, families, and mindful walkers.**

---

## 📖 What is Gentle Walk?

Traditional navigation apps like Google Maps optimize strictly for the **shortest distance** or the **fastest travel time**, routinely guiding pedestrians along congested multi-lane roads choked with vehicular exhaust and diesel particulates.

For senior citizens, people with asthma or COPD, and young children, **inhaled particulate exposure ($PM_{2.5}$)** is far more critical than saving two minutes on a walk.

**Gentle Walk** re-imagines walking navigation around health, comfort, and community:

- 🕒 **Finds the Cleanest Air Window**: Urban pollution fluctuates dramatically throughout the day (often peaking in early mornings due to temperature inversions). Gentle Walk analyzes 24-hour diurnal forecast curves to find the cleanest time slot to walk.
- 🍃 **Minimizes Inhaled Pollution Dose**: Plans gentle walking loops through tree-covered park pathways and quiet residential lanes while avoiding high-traffic corridors and local pollution hotspots (like diesel generators and idling buses).
- 🪑 **Elder-Friendly Constraints**: Filters out steep inclines ($>5\%$ slope) and rewards paths with rest benches and shaded spots.
- 🎯 **Pokémon GO-Style Community Trails & PokéStops**: Community members can draw custom walking routes and pin custom landmarks — like seating benches, drinking water points, shade canopies, and scenic viewpoints — to share healthy strolls with neighbors.
- 📱 **Installable Mobile Web App (PWA)**: Works seamlessly in any browser or installs with one tap as a native-feeling mobile app with offline support.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with **TypeScript** — Component architecture & typed UI state
- **Vite** — Next-generation frontend build tooling and fast dev server
- **Tailwind CSS** — Clean, responsive, mobile-first design system
- **Leaflet & React-Leaflet** — Interactive map rendering, custom path drawing, and milestone markers
- **Lucide Icons** — Lightweight icon set

### Backend
- **Java 21** & **Spring Boot 3.3** — Production-ready RESTful microservice
- **JGraphT** — Graph data structures and Dijkstra-based shortest-path & loop routing algorithms
- **JTS Topology Suite** — Geospatial geometry and point-in-polygon containment
- **Caffeine Cache** — High-performance in-memory caching for Overpass queries and elevation profiles
- **Spring Validation & Actuator** — Health check probes and input validation

### External APIs & Data Sources
- **OpenStreetMap (Overpass API)** — Real-world pedestrian ways, park polygons, and public benches
- **Open-Meteo Air Quality API** — 24-hour hourly $PM_{2.5}$ forecast modeling
- **Open-Meteo Elevation API** — Node elevations for terrain slope calculations
- **OpenStreetMap Nominatim** — Geocoding and location search

### Mobile & PWA
- **Progressive Web App (PWA)** — Web App Manifest and Service Worker with offline asset caching
- **In-App Mobile Install Banner** — Captures native install prompts on Android Chrome & iOS Safari

### Infrastructure & Cloud
- **Docker & Google Jib** — Daemonless, reproducible OCI container builds
- **Amazon ECS (Fargate Express Gateway)** — Serverless container deployment
- **Amazon ECR** — Secure container image registry
- **Amazon CloudWatch** — Health checks, metric filters, and automated alarms
- **GitHub Actions** — Continuous integration and automated test pipeline

---

## ⚙️ How It Works

```
  [ Search / Current Location ]
               │
               ▼
  [ 1. Diurnal Air Quality Analysis ] ──► Finds cleanest hour (e.g. 3:00 PM vs 8:00 AM smog)
               │
               ▼
  [ 2. Overpass & Elevation Graph ]   ──► Builds walkable pedestrian network + terrain slope
               │
               ▼
  [ 3. Inhaled Dose Routing Engine ]  ──► Minimizes: PM2.5 × Road Factor × Time × Sensitivity
               │                          • Benches grant routing discounts
               │                          • Slopes >5% and hotspots are excluded
               ▼
  [ 4. Interactive Map & Community ]  ──► Compare Cleanest Loop vs Baseline Street Route
                                          • Draw custom walking paths
                                          • Place PokéStop milestones (benches, water, shade)
                                          • Install directly to mobile home screen
```

### 1. Pinpointing the Cleanest Window
Urban air quality varies by up to 70% within a single day. The backend fetches 24-hour $PM_{2.5}$ forecasts from Open-Meteo and finds the cleanest consecutive time window, helping elders avoid hazardous morning smog peaks before taking a single step.

### 2. Calculating the Inhaled Dose
Rather than measuring pure distance, Gentle Walk models the actual particulate volume inhaled along each path segment:

$$\text{Dose} = PM_{2.5}(\text{hour}) \times \text{Road Factor} \times \text{Duration (min)} \times \text{Breathing Rate} \times \text{Sensitivity}$$

- **Park paths & footpaths** have lower exposure factors ($0.7\times - 1.0\times$) due to tree canopy filtration and distance from vehicular exhausts.
- **Arterial roads** carry high exposure penalties ($1.4\times - 1.6\times$).
- **Rest benches** provide a $10\%$ routing incentive, favoring comfortable trails.
- **Pollution hotspots** (e.g., diesel generators, idling stands) add localized avoidance penalties within a 30-meter radius.
- **Steep slopes** ($>5\%$ incline) are blocked when "Avoid Steep Slopes" is enabled.

### 3. Loop Generation vs. Baseline Comparison
Using JGraphT, the algorithm explores candidate turn-around waypoints to generate a circular loop of the requested duration (e.g. 15, 20, or 30 minutes). It contrasts this **Cleanest Walk** with a typical street-level route, showing the exact percentage of inhaled pollution avoided (typically 20% to 35% lower dose with only 1–2 extra minutes of gentle walking).

### 4. Community Trails & PokéStop Milestones
Just like exploring in Pokémon GO, users can:
- **Draw Custom Trails**: Click or tap anywhere on the map to trace a custom scenic walk.
- **Place Milestones**: Drop interactive markers for rest seating, clean drinking water, shade canopies, or scenic viewpoints.
- **Publish & Share**: Save the route for neighbors and community members to discover, walk, and enjoy.

### 5. 1-Tap Mobile Experience (PWA)
Visiting Gentle Walk on mobile prompts a clean, in-app install banner. Tapping **"Install"** adds Gentle Walk to your home screen with a standalone app window, splash screen, and offline support.

---

## 🚀 Running Locally

### Prerequisites
- **Java 21** & **Maven 3.9+**
- **Node.js 18+** & **npm**
*(Or use Nix: `nix develop` provides everything pre-configured)*

### 1. Start the Backend
```bash
mvn spring-boot:run
```
The backend starts on `http://localhost:8080`.
- **Health Check**: `http://localhost:8080/api/health`
- **Swagger API Docs**: `http://localhost:8080/swagger-ui.html`

### 2. Start the Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Tests
```bash
mvn test
```
All unit and integration tests run 100% offline using recorded fixtures.
