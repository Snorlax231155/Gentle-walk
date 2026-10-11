#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="651694719691"
ECR_REPO="gentle-walk"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"

echo "=== Stage 1: Build React PWA Frontend ==="
(cd frontend && npm ci && npm run build)

echo "=== Stage 2: Embed Frontend Assets into Spring Boot Static Resources ==="
rm -rf src/main/resources/static
cp -r frontend/dist src/main/resources/static

echo "=== Stage 3: Containerize Application via Jib ==="
mvn compile com.google.cloud.tools:jib-maven-plugin:3.4.4:buildTar \
  -Dimage="${IMAGE_URI}" \
  -Djib.from.image="eclipse-temurin:21-jre-alpine" \
  -Djib.container.ports=8080 \
  -Djib.container.environment="SERVER_PORT=8080,JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0" \
  -DskipTests

echo "=== Stage 4: Push to Amazon ECR via Skopeo with Retries ==="
ECR_PASS=$(aws ecr get-login-password --region "${AWS_REGION}")
skopeo --insecure-policy copy \
  --retry-times 5 \
  --retry-delay 3s \
  --dest-creds "AWS:${ECR_PASS}" \
  docker-archive:target/jib-image.tar \
  "docker://${IMAGE_URI}"

echo "=== Container Image Successfully Pushed to ${IMAGE_URI} ==="
