package com.gentlewalk.air;

import com.gentlewalk.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AirQualityClientTest {

    private AirQualityClient airQualityClient;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
                .messageConverters(converters -> converters.add(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter()));
        mockServer = MockRestServiceServer.bindTo(builder).build();

        AppProperties.OpenMeteoProperties openMeteoProps = new AppProperties.OpenMeteoProperties(
                "https://air-quality-api.open-meteo.com/v1/air-quality",
                "https://api.open-meteo.com/v1/elevation",
                5000
        );
        AppProperties properties = new AppProperties(
                60.0, 0.02, null, null, 0.3, 5.0, 0.9, null, null, null, openMeteoProps, null, "Disclaimer", null
        );

        airQualityClient = new AirQualityClient(properties, builder);
    }

    @Test
    @DisplayName("Parses recorded airquality_sample.json fixture and interpolates null value")
    void testParseRecordedFixtureWithNullValue() throws Exception {
        ClassPathResource resource = new ClassPathResource("fixtures/airquality_sample.json");
        String jsonContent;
        try (InputStream is = resource.getInputStream()) {
            jsonContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        mockServer.expect(requestTo(org.hamcrest.Matchers.containsString("latitude=28.61")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(jsonContent, MediaType.APPLICATION_JSON));

        List<Double> pm25 = airQualityClient.getHourlyPm25(28.61, 77.21);
        mockServer.verify();

        assertThat(pm25).hasSize(24);
        // In fixture: index 13 is 56.2, index 14 is null, index 15 is 43.1.
        // Interpolated index 14 should be (56.2 + 43.1)/2 = 49.65
        assertThat(pm25.get(14)).isNotNull();
        assertThat(pm25.get(14)).isCloseTo(49.65, org.assertj.core.api.Assertions.within(0.001));
    }

    @Test
    @DisplayName("Sanitizer handles completely empty series by falling back to demo series")
    void testSanitizerFallback() {
        List<Double> result = airQualityClient.sanitizeAndNormalize24Hours(List.of());
        assertThat(result).hasSize(24);
        assertThat(result).isEqualTo(DemoAirData.get24HourSeries());
    }

    @Test
    @DisplayName("When shared cache store returns data, it is used without contacting Open-Meteo")
    void testSharedCacheHitBypassesHttp() {
        com.gentlewalk.cache.SharedCacheStore mockStore = org.mockito.Mockito.mock(com.gentlewalk.cache.SharedCacheStore.class);
        List<Double> cachedValues = java.util.Collections.nCopies(24, 25.0);
        org.mockito.Mockito.when(mockStore.getAirQuality(28.59, 77.22))
                .thenReturn(java.util.Optional.of(cachedValues));

        AirQualityClient clientWithCache = new AirQualityClient(
                new AppProperties(60.0, 0.02, null, null, 0.3, 5.0, 0.9, null, null, null, null, null, "Disclaimer", null),
                RestClient.builder(),
                mockStore
        );

        List<Double> result = clientWithCache.getHourlyPm25(28.59, 77.22);

        assertThat(result).hasSize(24);
        assertThat(result.get(0)).isEqualTo(25.0);
        // Verify mockServer was never queried (no HTTP requests expected)
        mockServer.verify();
    }
}
