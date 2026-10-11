#!/usr/bin/env bash
set -euo pipefail

# Configuration
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="651694719691"
SERVICE_NAME="gentle-walk-app"
CLUSTER_NAME="gentle-walk-cluster"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/gentle-walk:latest"
EXEC_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/gentle-walk-ecs-execution-role"
INFRA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/gentle-walk-ecs-infrastructure-role"
TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/gentle-walk-ecs-task-role"

echo "=== Ensuring ECS Cluster exists: ${CLUSTER_NAME} ==="
aws ecs create-cluster \
  --cluster-name "${CLUSTER_NAME}" \
  --tags key=project,value=gentle-walk > /dev/null || true

echo "=== Creating Amazon ECS Express Gateway Service ==="
aws ecs create-express-gateway-service \
  --service-name "${SERVICE_NAME}" \
  --cluster "${CLUSTER_NAME}" \
  --execution-role-arn "${EXEC_ROLE_ARN}" \
  --infrastructure-role-arn "${INFRA_ROLE_ARN}" \
  --task-role-arn "${TASK_ROLE_ARN}" \
  --health-check-path "/api/health" \
  --primary-container "{
    \"image\": \"${IMAGE_URI}\",
    \"containerPort\": 8080,
    \"awsLogsConfiguration\": {
      \"logGroup\": \"/ecs/gentle-walk\",
      \"logStreamPrefix\": \"ecs\"
    },
    \"environment\": [
      {\"name\": \"SERVER_PORT\", \"value\": \"8080\"},
      {\"name\": \"JAVA_OPTS\", \"value\": \"-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0\"}
    ]
  }" \
  --cpu "1024" \
  --memory "2048" \
  --scaling-target "{
    \"minTaskCount\": 1,
    \"maxTaskCount\": 2,
    \"autoScalingMetric\": \"AVERAGE_CPU\",
    \"autoScalingTargetValue\": 70
  }" \
  --tags '[{"key":"project","value":"gentle-walk"}]'

echo "=== Express Gateway Service created successfully ==="
