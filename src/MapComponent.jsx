import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Polygon, Polyline, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Map camera controller for smooth flying to searched locations or clicked parcels
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (center) {
        map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [map, center, zoom]);
  return null;
}

export default function MapComponent({ 
  parcels, 
  selectedParcel, 
  onSelectParcel, 
  uploadedRoute, 
  showBypass,
  mapCenter,
  mapZoom
}) {
  const [mapType, setMapType] = useState('hybrid');

  // Real NH-44 / Delhi-Vadodara Link Alignment Coordinates (Sikri - Ballabgarh - Palwal stretch)
  const defaultCorridor = [
    [28.3185, 77.3125],
    [28.3120, 77.3145],
    [28.3055, 77.3168],
    [28.2980, 77.3190],
    [28.2910, 77.3215],
    [28.2845, 77.3240],
    [28.2780, 77.3265]
  ];

  // AI Micro-Bypass Alignment avoiding Critical High Court Stay Parcels (P-03 & P-06)
  const bypassCorridor = [
    [28.3120, 77.3145],
    [28.3065, 77.3120], // Bypasses P-03 on West side
    [28.2980, 77.3190],
    [28.2910, 77.3215],
    [28.2850, 77.3195], // Bypasses P-06
    [28.2780, 77.3265]
  ];

  const getColor = (status) => {
    if (status === 'critical') return '#EF4444'; // Crimson Red
    if (status === 'risk') return '#F59E0B';     // Alert Amber
    return '#10B981';                            // Emerald Green
  };

  return (
    <div className="relative w-full h-[560px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      
      {/* Top Left Overlay: Active Corridor Telemetry */}
      <div className="absolute top-3 left-14 z-[1000] bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs shadow-lg pointer-events-none">
        <div className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider">● LIVE GIS CADASTRAL LAYER</div>
        <div className="font-bold text-slate-100">NH-44 / DND-Sohna Spur (Faridabad - Palwal)</div>
      </div>

      {/* Top Right Overlay: Layer Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg">
        <button 
          onClick={() => setMapType('hybrid')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${mapType === 'hybrid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
        >
          🛰️ Satellite Cadastral
        </button>
        <button 
          onClick={() => setMapType('terrain')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${mapType === 'terrain' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
        >
          ⛰️ Revenue Terrain
        </button>
        <button 
          onClick={() => setMapType('street')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${mapType === 'street' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
        >
          🗺️ Street Map
        </button>
      </div>

      <MapContainer 
        center={mapCenter || [28.3010, 77.3180]} 
        zoom={mapZoom || 14} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController center={mapCenter} zoom={mapZoom} />

        {/* High-Speed Official Google GIS Layers */}
        {mapType === 'hybrid' && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            maxZoom={21}
            attribution="&copy; Google Satellite Cadastral"
          />
        )}
        {mapType === 'terrain' && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
            maxZoom={20}
            attribution="&copy; Google Terrain"
          />
        )}
        {mapType === 'street' && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
            attribution="&copy; Google Maps"
          />
        )}

        {/* Centerline Corridor (Right of Way - RoW) */}
        <Polyline 
          positions={defaultCorridor} 
          pathOptions={{ color: '#38bdf8', weight: 5, opacity: 0.9 }} 
        >
          <Tooltip sticky>NH-44 Proposed 60m Right of Way (RoW)</Tooltip>
        </Polyline>

        {/* Uploaded GeoJSON Alignment */}
        {uploadedRoute && (
          <GeoJSON 
            key={JSON.stringify(uploadedRoute)} 
            data={uploadedRoute} 
            style={{ color: '#c084fc', weight: 6, opacity: 0.95 }} 
          />
        )}

        {/* AI Micro-Bypass Alignment */}
        {showBypass && (
          <Polyline 
            positions={bypassCorridor} 
            pathOptions={{ color: '#10b981', weight: 6, dashArray: '10, 8', opacity: 1 }} 
          >
            <Tooltip permanent direction="right">⚡ AI Re-aligned Micro-Bypass (Avoids CWP-14892 Stay)</Tooltip>
          </Polyline>
        )}

        {/* Real Surveyed Land Parcels with Geodesic Area */}
        {parcels.map((parcel) => {
          const isSelected = selectedParcel?.id === parcel.id;
          const color = getColor(parcel.status);

          return (
            <Polygon
              key={parcel.id}
              positions={parcel.coords}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3.5 : 2,
                fillColor: color,
                fillOpacity: isSelected ? 0.68 : 0.42,
              }}
              eventHandlers={{
                click: () => onSelectParcel(parcel)
              }}
            >
              <Tooltip direction="center" permanent className="font-mono font-bold text-[11px]">
                {parcel.id} · {parcel.metrics?.acres} Ac ({parcel.riskScore}%)
              </Tooltip>
              <Popup>
                <div className="text-slate-900 text-xs space-y-1 min-w-[220px]">
                  <div className="font-extrabold text-sm border-b border-slate-300 pb-1 flex justify-between">
                    <span>{parcel.id}: Mauza {parcel.mauza}</span>
                    <span className="text-red-600">{parcel.riskScore}% Risk</span>
                  </div>
                  <div><strong>ULPIN (Bhu-ID):</strong> <span className="font-mono">{parcel.ulpin}</span></div>
                  <div><strong>Khewat / Khasra:</strong> {parcel.khewat} // {parcel.khasra}</div>
                  <div><strong>Geodesic Area:</strong> {parcel.metrics?.hectares} Ha ({parcel.metrics?.acres} Acres | {parcel.metrics?.kanalMarla})</div>
                  <div><strong>Khatedar (Owner):</strong> {parcel.owner}</div>
                  <div><strong>Land Nature:</strong> {parcel.landType}</div>
                  <div><strong>e-Courts CNR:</strong> {parcel.cnrNumber}</div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

      </MapContainer>
    </div>
  )
}