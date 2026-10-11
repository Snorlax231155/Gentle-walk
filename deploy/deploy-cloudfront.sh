#!/usr/bin/env bash
set -euo pipefail

# Ensure proxy is active if IPv6 has issues
if ! curl -m 2 -s -I https://cloudfront.amazonaws.com >/dev/null 2>&1; then
  if ! pgrep -f "ipv4-proxy.py" >/dev/null 2>&1; then
    echo "Starting background IPv4 CONNECT proxy..."
    python3 deploy/ipv4-proxy.py &
    sleep 1
  fi
  export HTTPS_PROXY="http://127.0.0.1:8888"
  export HTTP_PROXY="http://127.0.0.1:8888"
fi

AWS_BIN=$(which aws 2>/dev/null || ls -d /nix/store/*awscli2*/bin/aws 2>/dev/null | tail -n 1)
export AWS_DEFAULT_REGION="ap-south-1"
export AWS_PROFILE="AdministratorAccess-651694719691"

echo "=== Deploying CloudFront Distribution for Gentle Walk ==="

ORIGIN_DOMAIN="ge-603d77f297f3418cb26c0cda69a2656d.ecs.ap-south-1.on.aws"
ORIGIN_ID="ECS-Gentle-Walk-Origin"
COMMENT="Gentle Walk Edge CDN (project=gentle-walk)"
CALLER_REF="gentle-walk-$(date +%s)"

# Managed Policy IDs
CACHING_OPTIMIZED="658327ea-f89d-4fab-a63d-7e88639e58f6"
CACHING_DISABLED="4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
ORIGIN_REQUEST_ALL_EXCEPT_HOST="b689b0a8-53d0-40ab-baf2-68738e2966ac"

CONFIG_JSON="/tmp/cf-dist-config.json"
cat > "$CONFIG_JSON" <<EOF
{
  "DistributionConfig": {
    "CallerReference": "${CALLER_REF}",
    "Comment": "${COMMENT}",
    "Enabled": true,
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "${ORIGIN_ID}",
          "DomainName": "${ORIGIN_DOMAIN}",
          "CustomOriginConfig": {
            "HTTPPort": 80,
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "https-only",
            "OriginSslProtocols": {
              "Quantity": 1,
              "Items": ["TLSv1.2"]
            },
            "OriginReadTimeout": 30,
            "OriginKeepaliveTimeout": 5
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "${ORIGIN_ID}",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Quantity": 3,
        "Items": ["GET", "HEAD", "OPTIONS"],
        "CachedMethods": {
          "Quantity": 2,
          "Items": ["GET", "HEAD"]
        }
      },
      "CachePolicyId": "${CACHING_OPTIMIZED}",
      "Compress": true,
      "SmoothStreaming": false
    },
    "CacheBehaviors": {
      "Quantity": 1,
      "Items": [
        {
          "PathPattern": "/api/*",
          "TargetOriginId": "${ORIGIN_ID}",
          "ViewerProtocolPolicy": "https-only",
          "AllowedMethods": {
            "Quantity": 7,
            "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "CachedMethods": {
              "Quantity": 2,
              "Items": ["GET", "HEAD"]
            }
          },
          "CachePolicyId": "${CACHING_DISABLED}",
          "OriginRequestPolicyId": "${ORIGIN_REQUEST_ALL_EXCEPT_HOST}",
          "Compress": true,
          "SmoothStreaming": false
        }
      ]
    },
    "PriceClass": "PriceClass_100"
  },
  "Tags": {
    "Items": [
      {
        "Key": "project",
        "Value": "gentle-walk"
      }
    ]
  }
}
EOF

echo "Creating CloudFront distribution..."
RESULT=$("$AWS_BIN" cloudfront create-distribution-with-tags --distribution-config-with-tags "file://${CONFIG_JSON}")

DIST_ID=$(echo "$RESULT" | grep -o '"Id": "[^"]*"' | head -n 1 | cut -d'"' -f4)
DOMAIN_NAME=$(echo "$RESULT" | grep -o '"DomainName": "[^"]*"' | head -n 1 | cut -d'"' -f4)
STATUS=$(echo "$RESULT" | grep -o '"Status": "[^"]*"' | head -n 1 | cut -d'"' -f4)

echo "=================================================="
echo "CloudFront Distribution successfully created!"
echo "Distribution ID: ${DIST_ID}"
echo "CloudFront Domain: https://${DOMAIN_NAME}"
echo "Status: ${STATUS}"
echo "=================================================="

echo "https://${DOMAIN_NAME}" > deploy/cloudfront-endpoint.txt
echo "${DIST_ID}" > deploy/cloudfront-distribution-id.txt
rm -f "$CONFIG_JSON"
