# AWS Deployment Guide for Gentle Walk

> [!NOTE]
> **AWS App Runner Deprecation**: AWS App Runner is closed to new customers. The primary and recommended deployment model on AWS is **Amazon ECS Express Mode on Fargate** (1 vCPU, 2 GB, auto-managed ALB gateway and zero NAT Gateway overhead).

This guide provides the official deployment path on Amazon Web Services (AWS) in region `ap-south-1` (Mumbai) for **Gentle Walk**:

1. **Recommended**: **Amazon ECS Express Mode on Fargate** (Serverless containers, zero-downtime rolling deployments, automated Application Load Balancer and HTTPS endpoint).
2. **Infrastructure as Code / Scripts**: Automated deployment tooling in `/deploy`.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             Internet Users             │
                      └───────────────────┬────────────────────┘
                                          │ HTTPS (443)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    ECS Express Gateway Service (ALB)   │
                      │   (AWS-managed TLS & ingress routing)  │
                      └───────────────────┬────────────────────┘
                                          │ Port 8080 (VPC)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │      Amazon ECS Task on Fargate        │
                      │  - 1 vCPU, 2 GB RAM (Task role auth)   │
                      │  - Spring Boot 3.3 (REST API)          │
                      │  - Embedded React 18 PWA Frontend      │
                      │  - CloudWatch Logs: /ecs/gentle-walk   │
                      └───────────┬────────────────┬───────────┘
                                  │                │
            HTTPS Requests        │                │ HTTPS Requests
                                  ▼                ▼
                     ┌──────────────────┐    ┌─────────────────┐
                     │ OpenStreetMap    │    │ Open-Meteo      │
                     │ Overpass API     │    │ Air & Elevation │
                     └──────────────────┘    └─────────────────┘
```

---

## Automated Deployment (Using `/deploy`)

The `/deploy` directory contains automated, least-privilege CLI scripts for the complete deployment lifecycle:

### Step 1: Package & Push Container Image to ECR
```bash
./deploy/build-and-push.sh
```
This builds the React frontend production bundle, embeds it into `src/main/resources/static`, builds a lightweight Alpine JRE 21 container image via Jib, and pushes it to Amazon ECR (`gentle-walk:latest`).

### Step 2: Deploy Amazon ECS Express Mode Service
```bash
./deploy/deploy-ecs-express.sh
```
This provisions:
- ECS Cluster: `gentle-walk-cluster`
- Task Execution Role: `gentle-walk-ecs-execution-role` (ECR pull, CloudWatch logs)
- Infrastructure Role: `gentle-walk-ecs-infrastructure-role` (ALB, security groups, auto-scaling)
- Task Role: `gentle-walk-ecs-task-role`
- Service: `gentle-walk-app` (Desired: 1, Max: 2, Port: 8080, Health check: `/api/health`)
- Ingress: Public HTTPS URL automatically provisioned by ECS Express Mode.

### Step 3: Verify Endpoints
```bash
./deploy/verify-endpoints.sh <HTTPS_URL>
```
Validates:
- `GET /api/health` -> HTTP 200 `{"status":"UP"}`
- `GET /api/window?demo=true` -> HTTP 200 with 24-hour PM2.5 forecasts
- `POST /api/plan` -> HTTP 200 with optimal safe loops and indoor fallback alternatives
- `GET /` -> HTTP 200 loads the React PWA

### Step 4: Full Teardown
```bash
./deploy/teardown.sh
```
Destroys all resources tagged `project=gentle-walk` (ECS service, cluster, ALB, ECR repository, IAM roles, and CloudWatch log groups) ensuring zero lingering AWS costs.
