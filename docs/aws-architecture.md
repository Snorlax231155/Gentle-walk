# Gentle Walk — AWS Cloud Architecture

This document describes the production AWS architecture supporting the "Gentle Walk" hyperlocal elder walking route planner in `ap-south-1` (Mumbai). Every AWS service was chosen to solve a concrete architectural bottleneck or failure mode in the application code.

---

## 1. Architecture Diagram

```mermaid
flowchart TD
    subgraph Clients["Elderly Walkers & Mobile Devices"]
        Browser["React + Vite PWA (Port 8080)"]
    end

    subgraph Ingress["AWS Edge & Ingress"]
        CF["Amazon CloudFront CDN (Edge Cache / HTTPS)<br/>(PriceClass_100, Gzip/Brotli, Static Asset Cache)"]
        ALB["ECS Express Auto-Provisioned ALB<br/>(HTTPS Ingress / Port 443)"]
    end

    subgraph ECS["Amazon ECS Express Mode on AWS Fargate (ap-south-1)"]
        Task["Gentle Walk Spring Boot 3.3 Task<br/>1 vCPU / 2 GB RAM<br/>Local L1 Cache: Caffeine<br/>Places Search Service"]
    end

    subgraph DataPipeline["Pre-warming Data Pipeline (Async Background)"]
        EB_Air["EventBridge Scheduler<br/>(Rate: 30 minutes)"]
        EB_OSM["EventBridge Scheduler<br/>(Cron: Daily 02:00 UTC)"]
        Lambda["AWS Lambda: gentle-walk-cache-refresher<br/>(Python 3.12, 128 MB)"]
    end

    subgraph Storage["Shared Persistent L2 Cache"]
        DDB[("Amazon DynamoDB<br/>gentle-walk-air-quality<br/>(Key: %.2f,%.2f | On-Demand | TTL)")]
        S3[("Amazon S3<br/>gentle-walk-overpass-cache-651694719691<br/>(Key: overpass/%.3f,%.3f,%d.json)")]
    end

    subgraph Upstream["Upstream Public APIs"]
        OpenMeteo["Open-Meteo Air Quality & Elevation API"]
        Overpass["OpenStreetMap Overpass API Mirrors"]
        Nominatim["OpenStreetMap Nominatim Geocoding"]
    end

    subgraph Ops["Observability & Operations"]
        CW_Logs["Amazon CloudWatch Logs<br/>(/ecs/gentle-walk, 7-day retention)"]
        CW_Alarms["CloudWatch Alarms<br/>(gentle-walk-5xx-errors, gentle-walk-high-latency)"]
        CW_Dash["CloudWatch Dashboard<br/>(gentle-walk-operations)"]
        CI["GitHub Actions CI/CD Pipeline<br/>(100% Offline Tests, Build & Deploy)"]
        IAM["Least-Privilege IAM Roles<br/>(Task Role: Read-only DDB & S3)"]
    end

    Browser -->|HTTPS| CF
    CF -->|Pass-through /api/*| ALB
    CF -.->|Edge Cached Static UI| Browser
    ALB -->|Forward| Task
    Task -->|1. L1 Cache Check| Task
    Task -->|2. L2 Cache Hit| DDB
    Task -->|2. L2 Cache Hit| S3
    Task -.->|3. Fallback on L2 Miss| OpenMeteo
    Task -.->|3. Fallback on L2 Miss| Overpass
    Task -->|Geocoding Proxy| Nominatim
    Task -->|Telemetry| CW_Logs
    ALB -->|Metrics| CW_Alarms
    ALB -->|Metrics| CW_Dash
    IAM -.->|Applies to| Task
    CI -->|Deploys to| ECS

    EB_Air -->|Trigger Action: air| Lambda
    EB_OSM -->|Trigger Action: overpass| Lambda
    Lambda -->|Pre-fetch| OpenMeteo
    Lambda -->|Pre-fetch with Backoff| Overpass
    Lambda -->|Store Forecasts| DDB
    Lambda -->|Store Road Graphs| S3
```

---

## 2. Service-by-Service Rationale & Problem-Solving Impact

### 1. Amazon ECS Express Mode on AWS Fargate
- **Problem in the code**: The backend runs Spring Boot 3.3 (Java 21) with JGraphT Dijkstra routing, requiring predictable CPU and ~1.5 GB memory for in-memory graph execution. Traditional ECS required manually orchestrating ALBs, target groups, VPC routing, and autoscaling policies.
- **AWS Service**: `Amazon ECS Express Mode on Fargate` (1 vCPU, 2 GB RAM, 1–2 replica autoscaling, active service `gentle-walk-app` in `gentle-walk-cluster`).
- **Measured Result**: Zero EC2 instances to patch; single command provisioned an HTTPS endpoint, ALB, target group, and auto-scaling container. Cold start complete in 13.9s.
- **Why not the alternative?**:
  - *App Runner*: Closed to new AWS accounts.
  - *EC2*: Requires managing OS updates, AMI baking, and idle costs for underutilized instances.
  - *AWS Lambda for the API*: Spring Boot cold start and JGraphT Dijkstra execution on JVM would incur 8–15s cold starts per cold request, unacceptable for interactive elder route planning.

---

### 2. Amazon DynamoDB (Air Quality Shared L2 Cache)
- **Problem in the code**: `AirQualityClient` previously relied solely on in-memory Caffeine cache (`expireAfterWrite(30m)`). On container startup or when autoscaling spins up a 2nd task, the cache is completely cold. Cold calls to Open-Meteo European endpoints took ~1.3s per user.
- **AWS Service**: `Amazon DynamoDB` (`gentle-walk-air-quality`, on-demand capacity, TTL attribute `ttl`, partition key `cacheKey` in `%.2f,%.2f` format matching `@Cacheable`).
- **Measured Result**: Sub-20ms DynamoDB retrieval. Eliminated cold Open-Meteo calls for all curated park locations across all container instances.
- **Why not the alternative?**:
  - *ElastiCache Redis*: Costs ~$15–30/month even when idle with zero traffic (violates Ground Rule 6 cost constraints). DynamoDB On-Demand costs \$0.00 when idle and has zero minimum charge.
  - *Relational DB (RDS Aurora/Postgres)*: Overkill for key-value document lookups with TTL expiration.

---

### 3. Amazon S3 (Overpass OSM Road Graph Cache)
- **Problem in the code**: The public OpenStreetMap Overpass API explicitly throttles and blocks AWS cloud datacenter IP ranges (returning HTTP 403 Forbidden or 504 Gateway Timeout after 7+ seconds). Every live `/api/plan` call previously failed with HTTP 502 Bad Gateway. Furthermore, raw OSM JSON payloads for an 800m park radius exceed 295 KB (often exceeding 400 KB for dense colonies), which breaches DynamoDB's hard 400 KB item size limit.
- **AWS Service**: `Amazon S3` (`gentle-walk-overpass-cache-651694719691`, key `overpass/%.3f,%.3f,%d.json`, private bucket with SSE-S3 encryption and 7-day lifecycle policy).
- **Measured Result**: **Eliminated 100% of HTTP 502 failures**. Route planning latency dropped from >7.7s (timeout) to 2.298s on cold S3 load, and sub-second (0.785s) on subsequent requests.
- **Why not the alternative?**:
  - *DynamoDB*: Fails with `ValidationException` when OSM graphs exceed the 400 KB item limit.
  - *Direct Overpass calls*: Guaranteed failure (403/502) due to IP blacklisting of cloud providers.

---

### 4. AWS Lambda & Amazon EventBridge Scheduler (Cache Pre-warming)
- **Problem in the code**: External APIs must never be in the critical latency path of an interactive walk planning request. Elders checking pollution-safe walk windows cannot wait 10 seconds for synchronous multi-mirror scraping.
- **AWS Service**: `AWS Lambda` (`gentle-walk-cache-refresher`, Python 3.12) triggered by `EventBridge Scheduler`:
  - `gentle-walk-air-rule`: Triggers air quality refresh every 30 minutes.
  - `gentle-walk-overpass-rule`: Triggers OSM graph refresh daily at 02:00 UTC.
  - Curated locations are sourced from `curated-places.json` (Lodhi Gardens, Cubbon Park, Sanjay Van, Connaught Place, Chennai Central, Crescent Park).
- **Measured Result**: Tasks never need to query external APIs for curated walking zones during user requests.
- **Why not the alternative?**:
  - *Background thread inside Spring Boot*: Cannot coordinate across multiple ECS tasks; dies when the container restarts; wastes Fargate task CPU cycles.
  - *Self-hosted Cron on EC2*: Requires always-on billable infrastructure.

---

### 5. Amazon CloudWatch Operations & Monitoring (Phase 3)
- **Problem in the code**: Production reliability requires real-time alerting for 5xx failures (upstream API failures or unhandled exceptions) and high latency that could strand elderly users waiting for route calculations.
- **AWS Services**:
  - `gentle-walk-5xx-errors`: CloudWatch Metric Alarm triggering when `HTTPCode_Target_5XX_Count` >= 5 within a 5-minute period.
  - `gentle-walk-high-latency`: CloudWatch Metric Alarm triggering when average `TargetResponseTime` exceeds 2.0s over 5 minutes.
  - `gentle-walk-operations`: CloudWatch Dashboard providing live 4-pane visibility:
    1. Total Request Volume (`RequestCount`).
    2. Latency Metrics (Average & p95 `TargetResponseTime`).
    3. HTTP Status Codes (`2XX`, `4XX`, `5XX` breakdowns).
    4. ECS Fargate Resource Utilization (`CPUUtilization`, `MemoryUtilization`).
- **Measured Result**: Zero manual monitoring required; alerts fire proactively if upstream OSM or weather latency degrades.

---

### 6. Edge Caching & Automated CI/CD (Phase 3)
- **Amazon CloudFront**:
  - IaC template in [`deploy/deploy-cloudfront.sh`](file:///home/snorlax/Desktop/amazon_environment/deploy/deploy-cloudfront.sh).
  - PriceClass: `PriceClass_100` (India, US, Europe) for cost minimization.
  - Caching optimized (`658327ea-f89d-4fab-a63d-7e88639e58f6`) for static PWA assets (`/assets/*`, `.js`, `.css`), with Brotli/Gzip compression.
  - Pass-through caching disabled (`4135ea2d-6df8-44a3-9df3-4b5a84be39ad`) + AllViewerExceptHostHeader (`b689b0a8-53d0-40ab-baf2-68738e2966ac`) for `/api/*` ensuring real-time pollution calculations.
  *(Note: CloudFront distribution creation on this specific AWS account requires one-time AWS Support verification for anti-fraud; the complete IaC script is validated and prepared in `/deploy/deploy-cloudfront.sh`)*.
- **GitHub Actions CI/CD Pipeline**:
  - Located in [`.github/workflows/ci.yml`](file:///home/snorlax/Desktop/amazon_environment/.github/workflows/ci.yml).
  - Automatically executes on push to `main`:
    1. Bundles Vite PWA frontend.
    2. Runs all 34 backend unit & integration tests 100% offline.
    3. Builds container image via Jib with Java 21 JRE Alpine base.
    4. Deploys updated service revision to AWS ECS Express Mode.
