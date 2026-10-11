#!/usr/bin/env bash
set -euo pipefail

AWS_BIN=$(which aws 2>/dev/null || ls -d /nix/store/*awscli2*/bin/aws 2>/dev/null | tail -n 1)
export AWS_DEFAULT_REGION="ap-south-1"
export AWS_PROFILE="AdministratorAccess-651694719691"

ALB_DIM="app/ecs-express-gateway-alb-ae4d3c11/597d6650520470ea"
CLUSTER_NAME="gentle-walk-cluster"
SERVICE_NAME="gentle-walk-app"

echo "=== Deploying CloudWatch Monitoring (Alarms & Dashboard) ==="

# 1. 5xx Error Rate Alarm
echo "Creating CloudWatch Alarm: gentle-walk-5xx-errors..."
"$AWS_BIN" cloudwatch put-metric-alarm \
  --alarm-name "gentle-walk-5xx-errors" \
  --alarm-description "Alarms when Gentle Walk target returns more than 5 5XX errors within 5 minutes" \
  --metric-name "HTTPCode_Target_5XX_Count" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5.0 \
  --comparison-operator "GreaterThanOrEqualToThreshold" \
  --dimensions "Name=LoadBalancer,Value=${ALB_DIM}" \
  --tags "Key=project,Value=gentle-walk"

# 2. High Latency Alarm (> 2.0s average response time)
echo "Creating CloudWatch Alarm: gentle-walk-high-latency..."
"$AWS_BIN" cloudwatch put-metric-alarm \
  --alarm-name "gentle-walk-high-latency" \
  --alarm-description "Alarms when average response time exceeds 2.0s over 5 minutes" \
  --metric-name "TargetResponseTime" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Average" \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 2.0 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions "Name=LoadBalancer,Value=${ALB_DIM}" \
  --tags "Key=project,Value=gentle-walk"

# 3. CloudWatch Dashboard: gentle-walk-operations
echo "Creating CloudWatch Dashboard: gentle-walk-operations..."
DASHBOARD_BODY=$(cat <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "ALB Total Request Volume",
        "region": "ap-south-1",
        "metrics": [
          [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${ALB_DIM}", { "stat": "Sum", "label": "Requests / 5min" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Target Response Time Latency (Average & p95)",
        "region": "ap-south-1",
        "metrics": [
          [ "AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "${ALB_DIM}", { "stat": "Average", "label": "Avg Latency (s)" } ],
          [ "...", { "stat": "p95", "label": "p95 Latency (s)" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "HTTP Status Codes (Target Responses)",
        "region": "ap-south-1",
        "metrics": [
          [ "AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", "${ALB_DIM}", { "stat": "Sum", "label": "2XX Success", "color": "#2ca02c" } ],
          [ ".", "HTTPCode_Target_4XX_Count", ".", ".", { "stat": "Sum", "label": "4XX Client Errors", "color": "#ff7f0e" } ],
          [ ".", "HTTPCode_Target_5XX_Count", ".", ".", { "stat": "Sum", "label": "5XX Server Errors", "color": "#d62728" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "ECS Fargate Resource Utilization",
        "region": "ap-south-1",
        "metrics": [
          [ "AWS/ECS", "CPUUtilization", "ServiceName", "${SERVICE_NAME}", "ClusterName", "${CLUSTER_NAME}", { "stat": "Average", "label": "CPU (%)" } ],
          [ ".", "MemoryUtilization", ".", ".", ".", ".", { "stat": "Average", "label": "Memory (%)" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "period": 300
      }
    }
  ]
}
EOF
)

"$AWS_BIN" cloudwatch put-dashboard \
  --dashboard-name "gentle-walk-operations" \
  --dashboard-body "$DASHBOARD_BODY"

echo "=================================================="
echo "CloudWatch Alarms & Dashboard created successfully!"
echo "- Alarm: gentle-walk-5xx-errors"
echo "- Alarm: gentle-walk-high-latency"
echo "- Dashboard: gentle-walk-operations (https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=gentle-walk-operations)"
echo "=================================================="
