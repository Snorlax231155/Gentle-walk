# Gentle Walk — AWS Cloud Architecture

This document describes the AWS architecture supporting the "Gentle Walk" hyperlocal elder walking route planner in `ap-south-1` (Mumbai). Every AWS service was chosen to solve a concrete architectural bottleneck or failure mode in the application code.

---

## 1. Architecture Diagram

```mermaid
flowchart TD
    subgraph Clients["Elderly Walkers & Mobile Devices"]
        Browser["React + Vite PWA (Port 8080)"]
    end

    subgraph Ingress["AWS Edge & Ingress"]
        ALB["ECS Express Auto-Provisioned ALB<br/>(HTTPS Ingress / Port 443)"]
    end

    subgraph ECS["Amazon ECS Express Mode on AWS Fargate (ap-south-1)"]
        Task["Gentle Walk Spring Boot 3.3 Task<br/>1 vCPU / 2 GB RAM<br/>Local L1 Cache: Caffeine"]
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
    end

    subgraph Ops["Observability & Security"]
        CW["Amazon CloudWatch Logs<br/>(/ecs/gentle-walk, 7-day retention)"]
        IAM["Least-Privilege IAM Roles<br/>(Task Role: Read-only DDB & S3)"]
    end

    Browser -->|HTTPS| ALB
    ALB -->|Forward| Task
    Task -->|1. L1 Cache Check| Task
    Task -->|2. L2 Cache Hit| DDB
    Task -->|2. L2 Cache Hit| S3
    Task -.->|3. Fallback on L2 Miss| OpenMeteo
    Task -.->|3. Fallback on L2 Miss| Overpass
    Task -->|Telemetry| CW
    IAM -.->|Applies to| Task

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
- **Problem in the code**: The backend runs Spring Boot 3.3 (Java 21) with JGraphT Dijkstra routing, requiring predictable CPU and ~1.5 GB memory for in-memory graph execution. Previously, App Runner was suggested, but AWS closed App Runner to new customers. Traditional ECS required manually orchestrating ALBs, target groups, VPC routing, and autoscaling policies.
- **AWS Service**: `Amazon ECS Express Mode on Fargate` (1 vCPU, 2 GB RAM, 1–2 replica autoscaling).
- **Measured Result**: Zero EC2 instances to patch; single CLI command provisioned an HTTPS endpoint, ALB, target group, and auto-scaling container. Cold start complete in 13.5s.
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
  - Curated locations are sourced from `curated-places.json` (Lodhi Gardens, Cubbon Park, Sanjay Van, Connaught Place, Chennai Central).
- **Measured Result**: Tasks never need to query external APIs for curated walking zones during user requests.
- **Why not the alternative?**:
  - *Background thread inside Spring Boot*: Cannot coordinate across multiple ECS tasks; dies when the container restarts; wastes Fargate task CPU cycles.
  - *Self-hosted Cron on EC2*: Requires always-on billable infrastructure.

---

### 5. Amazon CloudWatch Logs & IAM Least Privilege
- **Problem in the code**: Debugging container bootstrap issues and verifying cache hit rates requires centralized logging. Over-privileged IAM roles pose major security risks.
- **AWS Services**:
  - `CloudWatch Log Group` (`/ecs/gentle-walk`): 7-day retention limit strictly enforces cost control.
  - `gentle-walk-ecs-task-role`: Strictly scoped IAM policy allowing ONLY `dynamodb:GetItem` on `gentle-walk-air-quality` and `s3:GetObject` on `gentle-walk-overpass-cache-651694719691/*` (zero wildcard admin privileges).
- **Measured Result**: Clear audit trail confirming DynamoDB and S3 cache hits (`Cache HIT in AWS S3`, `Cache HIT in AWS DynamoDB`), with zero credentials stored in application code or configuration.
