package com.gentlewalk.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

@Configuration
public class CacheConfig {

    public static final String GRAPH_CACHE = "graphCache";
    public static final String AIR_QUALITY_CACHE = "airQualityCache";
    public static final String ELEVATION_CACHE = "elevationCache";

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();

        CaffeineCache graphCache = new CaffeineCache(
                GRAPH_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(24))
                        .maximumSize(500)
                        .recordStats()
                        .build()
        );

        CaffeineCache airCache = new CaffeineCache(
                AIR_QUALITY_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofMinutes(30))
                        .maximumSize(1000)
                        .recordStats()
                        .build()
        );

        CaffeineCache elevationCache = new CaffeineCache(
                ELEVATION_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(24))
                        .maximumSize(5000)
                        .recordStats()
                        .build()
        );

        manager.setCaches(List.of(graphCache, airCache, elevationCache));
        return manager;
    }
}
