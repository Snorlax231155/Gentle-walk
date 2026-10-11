import json
import os
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
import boto3

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "gentle-walk-air-quality")
S3_BUCKET = os.environ.get("S3_BUCKET", "gentle-walk-overpass-cache-651694719691")

dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
s3 = boto3.client("s3", region_name="ap-south-1")
table = dynamodb.Table(DYNAMODB_TABLE)

# Load curated places
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLACES_PATH = os.path.join(SCRIPT_DIR, "curated-places.json")

def load_places():
    if os.path.exists(PLACES_PATH):
        with open(PLACES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return [
        { "name": "Lodhi Gardens, New Delhi", "lat": 28.5933, "lon": 77.2215, "radiusM": 800 },
        { "name": "Cubbon Park, Bengaluru", "lat": 12.9763, "lon": 77.5929, "radiusM": 800 },
        { "name": "Sanjay Van, South Delhi", "lat": 28.5284, "lon": 77.1741, "radiusM": 800 },
        { "name": "Connaught Place, New Delhi", "lat": 28.6139, "lon": 77.2090, "radiusM": 800 },
        { "name": "Chennai Central / Marina", "lat": 13.0801, "lon": 80.2808, "radiusM": 800 }
    ]

def refresh_air_quality(places):
    results = []
    for place in places:
        lat = place["lat"]
        lon = place["lon"]
        cache_key = f"{lat:.2f},{lon:.2f}"
        url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lon}&hourly=pm2_5&forecast_days=1&timezone=auto"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "GentleWalk-Lambda/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                hourly_pm25 = data.get("hourly", {}).get("pm2_5", [])
                if hourly_pm25:
                    # Normalize to 24 values
                    series = [float(v) if v is not None else 50.0 for v in hourly_pm25[:24]]
                    while len(series) < 24:
                        series.append(series[-1] if series else 50.0)

                    ttl = int(time.time()) + 3600  # 1 hour TTL
                    now_iso = datetime.now(timezone.utc).isoformat()

                    table.put_item(
                        Item={
                            "cacheKey": cache_key,
                            "hourlyPm25Json": json.dumps(series),
                            "ttl": ttl,
                            "updatedAt": now_iso,
                            "placeName": place["name"]
                        }
                    )
                    results.append({"place": place["name"], "key": cache_key, "status": "stored"})
        except Exception as e:
            print(f"Error fetching air quality for {place['name']}: {e}")
            results.append({"place": place["name"], "key": cache_key, "error": str(e)})
    return results

def refresh_overpass(places):
    results = []
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.fr/api/interpreter"
    ]

    for place in places:
        lat = place["lat"]
        lon = place["lon"]
        radius = place.get("radiusM", 800)
        cache_key = f"{lat:.3f},{lon:.3f},{radius}"
        s3_key = f"overpass/{cache_key}.json"

        # Check if already in S3 and fresh (< 24h old)
        try:
            head = s3.head_object(Bucket=S3_BUCKET, Key=s3_key)
            last_modified = head.get("LastModified")
            if last_modified:
                age_seconds = (datetime.now(timezone.utc) - last_modified).total_seconds()
                if age_seconds < 86400:
                    results.append({"place": place["name"], "key": s3_key, "status": "already_cached"})
                    continue
        except Exception:
            pass  # Not found, continue to fetch

        query = (
            f"[out:json][timeout:25];"
            f"("
            f'way["highway"](around:{radius},{lat:.6f},{lon:.6f});'
            f'node["amenity"="bench"](around:{radius},{lat:.6f},{lon:.6f});'
            f'way["leisure"="park"](around:{radius},{lat:.6f},{lon:.6f});'
            f");"
            f"out body geom;"
        )
        post_data = urllib.parse.urlencode({"data": query}).encode("utf-8")

        success = False
        for endpoint in endpoints:
            req = urllib.request.Request(
                endpoint,
                data=post_data,
                headers={
                    "User-Agent": "GentleWalk-Lambda/1.0 (hackathon-elder-planner; contact: info@gentlewalk.app)",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=25) as resp:
                    raw_body = resp.read()
                    osm_data = json.loads(raw_body.decode("utf-8"))
                    if osm_data.get("elements"):
                        s3.put_object(
                            Bucket=S3_BUCKET,
                            Key=s3_key,
                            Body=raw_body,
                            ContentType="application/json",
                            Metadata={"placeName": place["name"], "elements": str(len(osm_data["elements"]))}
                        )
                        results.append({"place": place["name"], "key": s3_key, "elements": len(osm_data["elements"]), "status": "stored"})
                        success = True
                        break
            except Exception as e:
                print(f"Overpass mirror {endpoint} failed for {place['name']}: {e}")
                time.sleep(1)

        if not success:
            results.append({"place": place["name"], "key": s3_key, "status": "failed"})

    return results

def lambda_handler(event, context):
    print(f"Lambda triggered with event: {json.dumps(event)}")
    places = load_places()
    action = event.get("action", "all")

    response = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action
    }

    if action in ["air", "all"]:
        response["air_quality"] = refresh_air_quality(places)

    if action in ["overpass", "all"]:
        response["overpass"] = refresh_overpass(places)

    return {
        "statusCode": 200,
        "body": json.dumps(response)
    }
