#!/usr/bin/env bash
set -uo pipefail

echo "=========================================================="
echo "      TEARDOWN: Removing all 'project=gentle-walk' AWS Resources"
echo "=========================================================="

AWS_REGION="ap-south-1"
CLUSTER_NAME="gentle-walk-cluster"
SERVICE_NAME="gentle-walk-service"

# 1. Delete ECS Express Gateway Services
echo "Deleting ECS Express Gateway Service..."
aws ecs delete-express-gateway-service \
  --service-name "gentle-walk-app" \
  --cluster "${CLUSTER_NAME}" 2>/dev/null || true

aws ecs delete-express-gateway-service \
  --service-name "gentle-walk-service" \
  --cluster "${CLUSTER_NAME}" 2>/dev/null || true

# 2. Delete ECS Cluster
echo "Deleting ECS Cluster..."
aws ecs delete-cluster --cluster "${CLUSTER_NAME}" 2>/dev/null || true

# 3. Delete IAM Roles & Policies
echo "Deleting IAM Roles & Policies..."
aws iam delete-role-policy \
  --role-name gentle-walk-ecs-task-role \
  --policy-name gentle-walk-ecs-task-policy 2>/dev/null || true

aws iam delete-role --role-name gentle-walk-ecs-task-role 2>/dev/null || true

aws iam detach-role-policy \
  --role-name gentle-walk-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

aws iam delete-role-policy \
  --role-name gentle-walk-ecs-execution-role \
  --policy-name gentle-walk-ecs-execution-cwlogs 2>/dev/null || true

aws iam delete-role --role-name gentle-walk-ecs-execution-role 2>/dev/null || true

aws iam detach-role-policy \
  --role-name gentle-walk-ecs-infrastructure-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices 2>/dev/null || true

aws iam detach-role-policy \
  --role-name gentle-walk-ecs-infrastructure-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleForGatewayHostSharedALB 2>/dev/null || true

aws iam detach-role-policy \
  --role-name gentle-walk-ecs-infrastructure-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRolePolicyForLoadBalancers 2>/dev/null || true

aws iam delete-role --role-name gentle-walk-ecs-infrastructure-role 2>/dev/null || true

# 4. Delete EventBridge Rules & Targets
echo "Deleting EventBridge Scheduler rules..."
aws events remove-targets --rule gentle-walk-air-rule --ids "1" 2>/dev/null || true
aws events delete-rule --name gentle-walk-air-rule 2>/dev/null || true

aws events remove-targets --rule gentle-walk-overpass-rule --ids "1" 2>/dev/null || true
aws events delete-rule --name gentle-walk-overpass-rule 2>/dev/null || true

# 5. Delete Lambda Function & Role
echo "Deleting Lambda function & IAM role..."
aws lambda delete-function --function-name gentle-walk-cache-refresher 2>/dev/null || true
aws iam delete-role-policy --role-name gentle-walk-lambda-role --policy-name gentle-walk-lambda-policy 2>/dev/null || true
aws iam delete-role --role-name gentle-walk-lambda-role 2>/dev/null || true

# 6. Delete DynamoDB Table
echo "Deleting DynamoDB table..."
aws dynamodb delete-table --table-name gentle-walk-air-quality --region "${AWS_REGION}" 2>/dev/null || true

# 7. Delete S3 Cache Bucket (Empty bucket first)
echo "Emptying and deleting S3 cache bucket..."
S3_BUCKET="gentle-walk-overpass-cache-651694719691"
aws s3 rm "s3://${S3_BUCKET}" --recursive 2>/dev/null || true
aws s3api delete-bucket --bucket "${S3_BUCKET}" --region "${AWS_REGION}" 2>/dev/null || true

# 8. Delete CloudWatch Logs
echo "Deleting CloudWatch Log Groups..."
aws logs delete-log-group --log-group-name /ecs/gentle-walk 2>/dev/null || true
aws logs delete-log-group --log-group-name /aws/lambda/gentle-walk-cache-refresher 2>/dev/null || true

# 9. Delete ECR Repository
echo "Deleting ECR Repository..."
aws ecr delete-repository --repository-name gentle-walk --force 2>/dev/null || true

echo "=========================================================="
echo " Teardown completed. All billable resources destroyed."
echo "=========================================================="
