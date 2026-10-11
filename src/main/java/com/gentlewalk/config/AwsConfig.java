package com.gentlewalk.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;

import java.time.Duration;

@Configuration
@ConditionalOnProperty(name = "gentlewalk.cache.store", havingValue = "aws")
public class AwsConfig {

    @Bean
    public DynamoDbClient dynamoDbClient(AppProperties properties) {
        String region = properties.cache() != null && properties.cache().region() != null
                ? properties.cache().region()
                : "ap-south-1";

        return DynamoDbClient.builder()
                .region(Region.of(region))
                .httpClient(ApacheHttpClient.builder()
                        .connectionTimeout(Duration.ofSeconds(3))
                        .socketTimeout(Duration.ofSeconds(5))
                        .build())
                .build();
    }

    @Bean
    public S3Client s3Client(AppProperties properties) {
        String region = properties.cache() != null && properties.cache().region() != null
                ? properties.cache().region()
                : "ap-south-1";

        return S3Client.builder()
                .region(Region.of(region))
                .httpClient(ApacheHttpClient.builder()
                        .connectionTimeout(Duration.ofSeconds(3))
                        .socketTimeout(Duration.ofSeconds(10))
                        .build())
                .build();
    }
}
