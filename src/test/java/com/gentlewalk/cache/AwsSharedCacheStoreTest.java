package com.gentlewalk.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gentlewalk.config.AppProperties;
import com.gentlewalk.graph.dto.OverpassResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AwsSharedCacheStoreTest {

    @Mock
    private DynamoDbClient dynamoDbClient;

    @Mock
    private S3Client s3Client;

    private ObjectMapper objectMapper;
    private AppProperties properties;
    private AwsSharedCacheStore cacheStore;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        AppProperties.CacheProperties cacheProps = new AppProperties.CacheProperties(
                "aws", "test-table", "test-bucket", "ap-south-1"
        );
        properties = new AppProperties(
                60.0, 0.02, null, null, 0.3, 5.0, 0.9, null, null, null, null, null, "Disclaimer", cacheProps
        );
        cacheStore = new AwsSharedCacheStore(dynamoDbClient, s3Client, properties, objectMapper);
    }

    @Test
    @DisplayName("DynamoDB cache hit parses hourlyPm25Json into List<Double>")
    void testAirQualityCacheHit() {
        String json = "[10.5, 20.0, 30.2, 40.8]";
        GetItemResponse response = GetItemResponse.builder()
                .item(Map.of(
                        "cacheKey", AttributeValue.builder().s("28.59,77.22").build(),
                        "hourlyPm25Json", AttributeValue.builder().s(json).build()
                ))
                .build();

        when(dynamoDbClient.getItem(any(GetItemRequest.class))).thenReturn(response);

        Optional<List<Double>> result = cacheStore.getAirQuality(28.5933, 77.2215);

        assertThat(result).isPresent();
        assertThat(result.get()).containsExactly(10.5, 20.0, 30.2, 40.8);
    }

    @Test
    @DisplayName("DynamoDB cache miss or exception returns empty Optional")
    void testAirQualityCacheMiss() {
        GetItemResponse emptyResponse = GetItemResponse.builder().build();
        when(dynamoDbClient.getItem(any(GetItemRequest.class))).thenReturn(emptyResponse);

        Optional<List<Double>> result = cacheStore.getAirQuality(28.5933, 77.2215);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("S3 cache hit parses JSON InputStream into OverpassResponse")
    void testOverpassCacheHit() {
        String json = "{\"version\":0.6,\"generator\":\"Overpass\",\"elements\":[{\"type\":\"node\",\"id\":123,\"lat\":28.59,\"lon\":77.22}]}";
        ByteArrayInputStream bais = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
        ResponseInputStream<GetObjectResponse> s3Stream = new ResponseInputStream<>(
                GetObjectResponse.builder().build(),
                AbortableInputStream.create(bais)
        );

        when(s3Client.getObject(any(GetObjectRequest.class))).thenReturn(s3Stream);

        Optional<OverpassResponse> result = cacheStore.getOverpassData(28.593, 77.222, 800);

        assertThat(result).isPresent();
        assertThat(result.get().elements()).hasSize(1);
        assertThat(result.get().elements().get(0).id()).isEqualTo(123L);
    }

    @Test
    @DisplayName("S3 NoSuchKeyException returns empty Optional without error")
    void testOverpassCacheMiss() {
        when(s3Client.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().message("Key not found").build());

        Optional<OverpassResponse> result = cacheStore.getOverpassData(28.593, 77.222, 800);

        assertThat(result).isEmpty();
    }
}
