package com.gentlewalk.graph;

import com.gentlewalk.config.AppProperties;
import com.gentlewalk.graph.dto.OverpassResponse;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OverpassClientTest {

    private OverpassClient overpassClient;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
                .messageConverters(converters -> converters.add(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter()));
        mockServer = MockRestServiceServer.bindTo(builder).build();

        AppProperties.OverpassProperties overpassProps = new AppProperties.OverpassProperties(
                "https://overpass-api.de/api/interpreter",
                "GentleWalkTest/1.0",
                5000,
                0,
                100L
        );
        AppProperties properties = new AppProperties(
                60.0, 0.02, null, null, 0.3, 5.0, 0.9, null, null, overpassProps, null, null, "Disclaimer"
        );

        overpassClient = new OverpassClient(properties, builder);
    }

    @Test
    @DisplayName("Parses recorded overpass_sample.json fixture and sends polite User-Agent")
    void testParseRecordedOverpassFixture() throws Exception {
        ClassPathResource resource = new ClassPathResource("fixtures/overpass_sample.json");
        String jsonContent;
        try (InputStream is = resource.getInputStream()) {
            jsonContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        mockServer.expect(requestTo("https://overpass-api.de/api/interpreter"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("User-Agent", "GentleWalkTest/1.0"))
                .andRespond(withSuccess(jsonContent, MediaType.APPLICATION_JSON));

        OverpassResponse response = overpassClient.fetchOsmData(28.6140, 77.2090, 500);
        mockServer.verify();

        assertThat(response).isNotNull();
        assertThat(response.elements()).isNotEmpty();
        // Fixture contains 1 bench node, 3 highway ways, 1 park way
        assertThat(response.elements()).hasSize(5);
    }
}
