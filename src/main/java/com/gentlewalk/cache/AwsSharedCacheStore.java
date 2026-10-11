package com.gentlewalk.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gentlewalk.config.AppProperties;
import com.gentlewalk.graph.dto.OverpassResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "gentlewalk.cache.store", havingValue = "aws")
public class AwsSharedCacheStore implements SharedCacheStore {

    private static final Logger log = LoggerFactory.getLogger(AwsSharedCacheStore.class);

    private final DynamoDbClient dynamoDbClient;
    private final S3Client s3Client;
    private final AppProperties properties;
    private final ObjectMapper objectMapper;

    public AwsSharedCacheStore(
            DynamoDbClient dynamoDbClient,
            S3Client s3Client,
            AppProperties properties,
            ObjectMapper objectMapper
    ) {
        this.dynamoDbClient = dynamoDbClient;
        this.s3Client = s3Client;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<List<Double>> getAirQuality(double lat, double lon) {
        String cacheKey = String.format(Locale.US, "%.2f,%.2f", lat, lon);
        String tableName = properties.cache() != null && properties.cache().airQualityTable() != null
                ? properties.cache().airQualityTable()
                : "gentle-walk-air-quality";

        try {
            log.info("Checking AWS DynamoDB table [{}] for key [{}]", tableName, cacheKey);
            GetItemRequest request = GetItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of("cacheKey", AttributeValue.builder().s(cacheKey).build()))
                    .build();

            GetItemResponse response = dynamoDbClient.getItem(request);
            if (response != null && response.hasItem() && response.item().containsKey("hourlyPm25Json")) {
                String json = response.item().get("hourlyPm25Json").s();
                List<Double> values = objectMapper.readValue(json, new TypeReference<List<Double>>() {});
                log.info("Cache HIT in AWS DynamoDB for key [{}]: {} hourly points", cacheKey, values.size());
                return Optional.of(values);
            }
            log.info("Cache MISS in AWS DynamoDB for key [{}]", cacheKey);
        } catch (Exception e) {
            log.warn("Failed to retrieve air quality from DynamoDB for [{}]: {}", cacheKey, e.getMessage());
        }

        return Optional.empty();
    }

    @Override
    public Optional<OverpassResponse> getOverpassData(double lat, double lon, int radiusM) {
        String s3Key = String.format(Locale.US, "overpass/%.3f,%.3f,%d.json", lat, lon, radiusM);
        String bucketName = properties.cache() != null && properties.cache().overpassBucket() != null
                ? properties.cache().overpassBucket()
                : "gentle-walk-overpass-cache-651694719691";

        try {
            log.info("Checking AWS S3 bucket [{}] for key [{}]", bucketName, s3Key);
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            try (ResponseInputStream<GetObjectResponse> s3Stream = s3Client.getObject(request)) {
                OverpassResponse response = objectMapper.readValue((InputStream) s3Stream, OverpassResponse.class);
                if (response != null && response.elements() != null && !response.elements().isEmpty()) {
                    log.info("Cache HIT in AWS S3 for [{}/{}]: {} elements", bucketName, s3Key, response.elements().size());
                    return Optional.of(response);
                }
            }
        } catch (NoSuchKeyException e) {
            log.info("Cache MISS in AWS S3 for key [{}] (object not found)", s3Key);
        } catch (Exception e) {
            log.warn("Failed to retrieve Overpass data from S3 for [{}]: {}", s3Key, e.getMessage());
        }

        return Optional.empty();
    }
}
