import React, { useState, useEffect, memo, useRef } from 'react';
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker,
  ZoomableGroup
} from 'react-simple-maps';
import { Card, Text, BlockStack, Tooltip } from '@shopify/polaris';
// Removed usePassiveEvents import to fix passive event listener conflicts

// GeoJSON data for world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// City coordinates lookup service using custom API
const getCityCoordinates = async (cityName) => {
  // Skip API call for unknown/invalid locations
  if (!cityName || cityName.toLowerCase() === 'unknown' || cityName.trim() === '') {
    return null; // Return null to filter out these locations
  }
  
  try {
    // Use the custom API endpoint
    const response = await fetch(`https://convert-boost-backend.vercel.app/api/get_coordinates?location=${encodeURIComponent(cityName)}`);
    const data = await response.json();
    
    if (data.success && data.data) {
      // Extract latitude and longitude from the updated response format
      const { latitude, longitude } = data.data;
      // Validate coordinates are valid numbers
      if (typeof latitude === 'number' && typeof longitude === 'number' && 
          !isNaN(latitude) && !isNaN(longitude) && 
          latitude !== 0 && longitude !== 0) {
        return { lat: latitude, lng: longitude };
      }
    }
    
    // Return null for invalid coordinates
    return null;
  } catch (error) {
    console.error("Error getting coordinates for city:", cityName, error);
    return null;
  }
};

const WorldMapChart = ({ locationAnalytics }) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState([0, 0]);
  const mapRef = useRef();
  
  // Passive events removed to fix react-simple-maps conflicts
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Restore page scroll when component unmounts
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  useEffect(() => {
    const loadCityCoordinates = async () => {
      if (!locationAnalytics || Object.keys(locationAnalytics).length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        // Filter out unknown locations before processing
        const validLocations = Object.entries(locationAnalytics)
          .filter(([city]) => city && city.toLowerCase() !== 'unknown' && city.trim() !== '');
        
        if (validLocations.length === 0) {
          setMarkers([]);
          setLoading(false);
          return;
        }
        
        const cityMarkersPromises = validLocations.map(async ([city, count]) => {
          const coords = await getCityCoordinates(city);
          if (coords) {
            return {
              name: city,
              coordinates: [coords.lng, coords.lat],
              count: count
            };
          }
          return null;
        });
        
        const cityMarkersResults = await Promise.all(cityMarkersPromises);
        const validMarkers = cityMarkersResults.filter(marker => marker !== null);
        
        setMarkers(validMarkers);
        setLoading(false);
      } catch (error) {
        console.error("Error loading city coordinates:", error);
        setLoading(false);
      }
    };
    
    loadCityCoordinates();
  }, [locationAnalytics]);
  
  // Calculate max count for scaling the markers
  const maxCount = markers.length > 0 
    ? Math.max(...markers.map(marker => marker.count)) 
    : 0;
  
  // Function to determine marker size based on count
  const getMarkerSize = (count) => {
    const minSize = 2;
    const maxSize = 12;
    
    // Prevent division by zero and negative values
    if (maxCount === 0 || count <= 0) {
      return minSize / zoom;
    }
    
    const normalizedSize = minSize + (count / maxCount) * (maxSize - minSize);
    const finalSize = normalizedSize / zoom;
    
    // Ensure minimum size to prevent negative or zero values
    return Math.max(finalSize, 0.5);
  };

  // Handle zoom and pan changes
  const handleMoveEnd = (position) => {
    setZoom(position.zoom);
    setCenter(position.coordinates);
  };

  // Reset map to initial position
  const handleReset = () => {
    setZoom(1);
    setCenter([0, 0]);
  };

  // Handle zoom in/out buttons
  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom * 1.5, 8));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom / 1.5, 0.5));
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd">User Distribution by City</Text>
        
        <div style={{ height: '400px', width: '100%', position: 'relative', overflow: 'hidden' }}>
          {loading ? (
            <div className="loading-indicator" style={{ textAlign: 'center', paddingTop: '150px' }}>
              <Text variant="bodyMd" color="subdued">Loading map data...</Text>
            </div>
          ) : markers.length === 0 ? (
            <div className="no-data" style={{ textAlign: 'center', paddingTop: '150px' }}>
              <Text variant="bodyMd" color="subdued">No location data available</Text>
            </div>
          ) : (
            <div 
              ref={mapRef}
              style={{ 
                height: '100%', 
                width: '100%',
                cursor: 'grab'
              }}
              onMouseEnter={() => {
                // Disable page scroll when mouse enters map
                document.body.style.overflow = 'hidden';
              }}
              onMouseLeave={() => {
                // Re-enable page scroll when mouse leaves map
                document.body.style.overflow = 'auto';
              }}
            >
              <ComposableMap
                projectionConfig={{
                  scale: 150,
                  rotation: [-10, 0, 0],
                }}
                style={{ outline: 'none', width: '100%', height: '100%' }}
              >
              <ZoomableGroup 
                zoom={zoom} 
                center={center}
                onMoveEnd={handleMoveEnd}
                minZoom={0.5}
                maxZoom={8}
                translateExtent={[[-1000, -500], [1000, 500]]}
                scaleExtent={[0.5, 8]}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map(geo => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#EAEAEC"
                        stroke="#D6D6DA"
                        style={{
                          default: { outline: 'none' },
                          hover: { outline: 'none', fill: '#F5F5F5' },
                          pressed: { outline: 'none' },
                        }}
                      />
                    ))
                  }
                </Geographies>
                
                {markers.map(({ name, coordinates, count }) => (
                  <Marker key={name} coordinates={coordinates}>
                    <circle
                      r={getMarkerSize(count)}
                      fill="#10b5e3"
                      stroke="#FFFFFF"
                      strokeWidth={1/zoom}
                    />
                    <title>{`${name}: ${count} users`}</title>
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>
            
            {/* Zoom Controls */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              zIndex: 1000
            }}>
              <button
                onClick={handleZoomIn}
                style={{
                  width: '30px',
                  height: '30px',
                  border: '1px solid #ddd',
                  background: 'white',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={handleZoomOut}
                style={{
                  width: '30px',
                  height: '30px',
                  border: '1px solid #ddd',
                  background: 'white',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                title="Zoom Out"
              >
                −
              </button>
              <button
                onClick={handleReset}
                style={{
                  width: '30px',
                  height: '30px',
                  border: '1px solid #ddd',
                  background: 'white',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                title="Reset View"
              >
                ⌂
              </button>
            </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
          <div style={{ margin: '0 10px', display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#10b5e3',
              marginRight: '5px',
              borderRadius: '50%'
            }}></div>
            <span>User Concentration</span>
          </div>
          <div style={{ margin: '0 10px', color: '#637381', fontSize: '0.8rem' }}>
            (Larger circles indicate more users)
          </div>
        </div>
      </BlockStack>
    </Card>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(WorldMapChart);