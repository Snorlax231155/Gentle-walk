package com.gentlewalk.graph;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gentlewalk.domain.PathEdge;
import com.gentlewalk.domain.RoadClass;
import com.gentlewalk.graph.dto.OverpassResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GraphBuilderTest {

    @Mock
    private OverpassClient overpassClient;

    @Mock
    private ElevationClient elevationClient;

    private GraphBuilder graphBuilder;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        graphBuilder = new GraphBuilder(overpassClient, elevationClient);
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Builds graph from OSM data, detects park paths and benches accurately")
    void testBuildFromOsmData() throws Exception {
        ClassPathResource resource = new ClassPathResource("fixtures/overpass_sample.json");
        OverpassResponse osmResponse;
        try (InputStream is = resource.getInputStream()) {
            osmResponse = objectMapper.readValue(is, OverpassResponse.class);
        }

        // Mock elevation response: 4 elevations
        when(elevationClient.getElevations(anyList()))
                .thenReturn(List.of(210.0, 210.5, 211.0, 211.2));

        GraphBuilder.GraphBuildResult result = graphBuilder.buildFromOsmData(
                osmResponse,
                28.6140,
                77.2091,
                List.of()
        );

        assertThat(result).isNotNull();
        assertThat(result.graph()).isNotNull();
        assertThat(result.graph().vertexSet()).hasSize(4); // 4 nodes: 101, 102, 103, 104
        assertThat(result.graph().edgeSet()).isNotEmpty();

        // Check that at least one edge has bench = true (since bench node 1001 is at 28.6140, 77.2091)
        boolean hasBenchEdge = result.graph().edgeSet().stream().anyMatch(PathEdge::isHasBench);
        assertThat(hasBenchEdge).isTrue();

        // Check that at least one edge is recognized as PARK_PATH due to the park polygon
        boolean hasParkPathEdge = result.graph().edgeSet().stream().anyMatch(e -> e.getRoadClass() == RoadClass.PARK_PATH);
        assertThat(hasParkPathEdge).isTrue();
    }
}
