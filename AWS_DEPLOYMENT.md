# AWS Deployment Guide for Gentle Walk

This guide provides three production deployment paths on Amazon Web Services (AWS) for **Gentle Walk**:

1. **Option A: AWS App Runner** (Recommended — Fastest, fully managed, zero VPC configuration, automated HTTPS).
2. **Option B: AWS ECS Fargate** (Serverless containers for enterprise VPC setups).
3. **Option C: AWS EC2 with Docker Compose** (Single virtual machine on AWS Free Tier / t4g instance).

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             Internet Users             │
                      └───────────────────┬────────────────────┘
                                          │ HTTPS (443)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    AWS App Runner / ALB / CloudFront   │
                      └───────────────────┬────────────────────┘
                                          │ Port 8080
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Gentle Walk Docker Container        │
                      │  - Spring Boot 3.3 (REST API)          │
                      │  - Embedded React 18 PWA Frontend      │
                      │  - Caffeine Graph & Air Caches         │
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

## Option A: Deploying on AWS App Runner (Recommended)

AWS App Runner runs containers directly without managing servers, load balancers, or clusters.

### Step 1: Create Amazon ECR Repository & Push Container
```bash
# 1. Authenticate Docker with your AWS account ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# 2. Create the repository
aws ecr create-repository --repository-name gentle-walk --region ap-south-1

# 3. Build & tag the multi-stage image
docker build -t gentle-walk .
docker tag gentle-walk:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/gentle-walk:latest

# 4. Push to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/gentle-walk:latest
```

### Step 2: Create App Runner Service
1. Open the **AWS App Runner Console** (`https://console.aws.amazon.com/apprunner`).
2. Click **Create service**.
3. **Source**: Select *Container registry* -> *Amazon ECR*.
4. **Image URI**: Select `gentle-walk:latest`.
5. **Deployment settings**: Automatic (deploys whenever a new image is pushed) or Manual.
6. **Configure service**:
   - **Service name**: `gentle-walk-prod`
   - **vCPU**: `1 vCPU`, **Memory**: `2 GB`
   - **Port**: `8080`
   - **Environment variables**:
     - `SERVER_PORT`: `8080`
     - `JAVA_OPTS`: `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0`
7. Click **Create & Deploy**. In ~3 minutes, App Runner will provide an auto-generated HTTPS URL (e.g. `https://xxxxxx.ap-south-1.awsapprunner.com`).

---

## Option B: Deploying on AWS ECS Fargate

For teams running inside an existing AWS VPC:

1. **Create ECS Cluster**:
   ```bash
   aws ecs create-cluster --cluster-name gentle-walk-cluster --region ap-south-1
   ```
2. **Register Task Definition**:
   Update `aws/task-definition.json` with your AWS Account ID and run:
   ```bash
   aws ecs register-task-definition --cli-input-json file://aws/task-definition.json
   ```
3. **Create Fargate Service**:
   ```bash
   aws ecs create-service \
     --cluster gentle-walk-cluster \
     --service-name gentle-walk-service \
     --task-definition gentle-walk-task \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxx],securityGroups=[sg-xxxxxx],assignPublicIp=ENABLED}"
   ```

---

## Option C: Deploying on AWS EC2 (Simple Docker Run)

Ideal for quick evaluation on an `Amazon Linux 2023` or `Ubuntu 24.04` EC2 instance (`t4g.small` or `t3.small`):

1. **Launch EC2 instance**:
   - AMI: Ubuntu 24.04 LTS (x86_64 or ARM64)
   - Instance Type: `t4g.small` or `t3.small` (1-2 vCPU, 2GB RAM)
   - Security Group: Allow inbound traffic on port `80`, `443`, and `8080`.
2. **SSH into the instance**:
   ```bash
   ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
   ```
3. **Install Docker & Clone Project**:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   # Log out and log back in, then:
   git clone <YOUR_REPO_URL> gentle-walk
   cd gentle-walk
   ```
4. **Start Application**:
   ```bash
   docker-compose up -d --build
   ```
5. **Verify**:
   ```bash
   curl http://localhost:8080/api/health
   ```
   Open `http://<EC2_PUBLIC_IP>:8080` in your phone browser.

---

## Health Checks & Monitoring

The backend exposes health monitoring compatible with AWS ALB and CloudWatch:
- Healthcheck Endpoint: `GET /api/health`
- Response: `{"status":"UP","service":"gentle-walk"}`
- Spring Boot Actuator (if enabled): `/actuator/health`
