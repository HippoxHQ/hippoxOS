/**
 * EarthView Map Command Handler
 * Processes map rendering data from LLM responses
 */
export interface EarthViewCommand {
    type: 'view' | 'marker' | 'circle' | 'polygon' | 'polyline' | 'heatmap' | 'cluster' | 'barchart' | 'geojson' | 'layer';
    data: any;
}
/**
 * Process EarthView data from LLM response
 * Validates and prepares map data for rendering
 */
export function processEarthViewData(earthviewData: any): EarthViewCommand[] {
    if (!earthviewData || typeof earthviewData !== 'object') {
        return [];
    }
    const commands: EarthViewCommand[] = [];
    // View control
    if (earthviewData.view) {
        commands.push({
            type: 'view',
            data: earthviewData.view,
        });
    }
    // Markers
    if (Array.isArray(earthviewData.markers) && earthviewData.markers.length > 0) {
        commands.push({
            type: 'marker',
            data: earthviewData.markers,
        });
    }
    // Circles
    if (Array.isArray(earthviewData.circles) && earthviewData.circles.length > 0) {
        commands.push({
            type: 'circle',
            data: earthviewData.circles,
        });
    }
    // Polygons
    if (Array.isArray(earthviewData.polygons) && earthviewData.polygons.length > 0) {
        commands.push({
            type: 'polygon',
            data: earthviewData.polygons,
        });
    }
    // Polylines
    if (Array.isArray(earthviewData.polylines) && earthviewData.polylines.length > 0) {
        commands.push({
            type: 'polyline',
            data: earthviewData.polylines,
        });
    }
    // Heatmap
    if (Array.isArray(earthviewData.heatmap) && earthviewData.heatmap.length > 0) {
        commands.push({
            type: 'heatmap',
            data: earthviewData.heatmap,
        });
    }
    // Clusters
    if (Array.isArray(earthviewData.clusters) && earthviewData.clusters.length > 0) {
        commands.push({
            type: 'cluster',
            data: earthviewData.clusters,
        });
    }
    // Bar charts
    if (Array.isArray(earthviewData.barcharts) && earthviewData.barcharts.length > 0) {
        commands.push({
            type: 'barchart',
            data: earthviewData.barcharts,
        });
    }
    // GeoJSON
    if (Array.isArray(earthviewData.geojson) && earthviewData.geojson.length > 0) {
        commands.push({
            type: 'geojson',
            data: earthviewData.geojson,
        });
    }
    // Layers
    if (Array.isArray(earthviewData.layers) && earthviewData.layers.length > 0) {
        commands.push({
            type: 'layer',
            data: earthviewData.layers,
        });
    }
    return commands;
}
/**
 * Validate EarthView marker data
 * Ensures all required fields are present
 */
export function validateMarker(marker: any): boolean {
    return (
        typeof marker === 'object' &&
        typeof marker.longitude === 'number' &&
        typeof marker.latitude === 'number' &&
        (marker.bubbleBoxTitle || marker.title) &&
        (marker.bubbleBoxDescription || marker.name)
    );
}
/**
 * Validate EarthView circle data
 */
export function validateCircle(circle: any): boolean {
    return (
        typeof circle === 'object' &&
        Array.isArray(circle.center) &&
        circle.center.length === 2 &&
        typeof circle.radius === 'number'
    );
}
/**
 * Validate EarthView polygon data
 */
export function validatePolygon(polygon: any): boolean {
    return (
        typeof polygon === 'object' &&
        Array.isArray(polygon.points) &&
        polygon.points.length >= 3 &&
        polygon.points.every((p: any) => Array.isArray(p) && p.length === 2)
    );
}
/**
 * Validate EarthView polyline data
 */
export function validatePolyline(polyline: any): boolean {
    return (
        typeof polyline === 'object' &&
        Array.isArray(polyline.points) &&
        polyline.points.length >= 2 &&
        polyline.points.every((p: any) => Array.isArray(p) && p.length === 2)
    );
}