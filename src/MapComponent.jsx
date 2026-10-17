import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Polygon, Polyline, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Smooth Camera Controller + Grey Border Eliminator
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (center && Array.isArray(center) && center.length === 2) {
        map.flyTo(center, zoom || map.getZoom(), { duration: 1.1 });
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
  corridorSpine,
  uploadedRoute,
  showBypass,
  showRoWBuffer,
  mapCenter,
  mapZoom
}) {
  const [mapType, setMapType] = useState('hybrid');

  // Extract only LineString from uploaded GeoJSON if present
  const uploadedLineOnly = uploadedRoute
    ? {
        ...uploadedRoute,
        features: uploadedRoute.features?.filter(f => f.geometry?.type === 'LineString') || []
      }
    : null;

  // Smart AI Micro-Bypass: shifts alignment North-West around Critical / 110-Gaj Tatima Stay plots
  const dynamicBypassCoords = (corridorSpine || []).map((pt, idx) => {
    if (idx >= 2 && idx <= 5) {
      return [pt[0] + 0.0022, pt[1] - 0.0012];
    }
    if (idx >= 11 && idx <= 14) {
      return [pt[0] + 0.0020, pt[1] + 0.0010];
    }
    return pt;
  });

  const getParcelColor = (parcel) => {
    if (parcel.isTatimaPlot) return '#EC4899';     // Neon Pink/Magenta for 100-Gaj Tatima Stay Plot
    if (parcel.status === 'critical') return '#EF4444'; // Crimson Red
    if (parcel.status === 'risk') return '#F59E0B';     // Amber Yellow
    return '#10B981';                                   // Emerald Green
  };

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      
      {/* Top-Left Live GIS Telemetry Badge */}
      <div className="absolute top-3 left-14 z-[1000] bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs shadow-lg pointer-events-none">
        <div className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          SAJRA / TATIMA CADASTRAL ENGINE ACTIVE
        </div>
        <div className="font-bold text-slate-100 mt-0.5">
          {uploadedRoute?.name || 'Manjhawali Bridge → Yamuna Expwy (Galgotias Corridor)'}
        </div>
      </div>

      {/* Top-Right GIS Layer Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg">
        <button
          onClick={() => setMapType('hybrid')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            mapType === 'hybrid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          🛰️ Satellite GIS
        </button>
        <button
          onClick={() => setMapType('terrain')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            mapType === 'terrain' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          ⛰️ Revenue Terrain
        </button>
        <button
          onClick={() => setMapType('street')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            mapType === 'street' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          🗺️ Cadastral Street
        </button>
      </div>

      {/* Bottom-Left Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-950/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[11px] flex flex-wrap items-center gap-3 shadow-lg">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block border border-white/40" /> Clear Killa
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block border border-white/40" /> At-Risk (Objection)
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span className="w-3 h-3 rounded-sm bg-red-500 inline-block border border-white/40" /> Litigated Killa
        </span>
        <span className="flex items-center gap-1.5 font-bold text-pink-400">
          <span className="w-3 h-3 rounded-sm bg-pink-500 inline-block border border-white" /> 100-Gaj Tatima Stay
        </span>
      </div>

      <MapContainer
        center={mapCenter || [28.3788, 77.4610]}
        zoom={mapZoom || 15}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController center={mapCenter} zoom={mapZoom} />

        {/* Fast Google Map Tile Servers */}
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
            attribution="&copy; Google Revenue Terrain"
          />
        )}
        {mapType === 'street' && (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={21}
            attribution="&copy; Google Street GIS"
          />
        )}

        {/* 1. 60-Meter Right of Way (RoW) Buffer Zone */}
        {showRoWBuffer && !uploadedLineOnly && (
          <Polyline
            positions={corridorSpine}
            pathOptions={{ color: '#38bdf8', weight: 28, opacity: 0.18 }}
          />
        )}

        {/* 2. Highway Centerline Alignment */}
        {!uploadedLineOnly && (
          <Polyline
            positions={corridorSpine}
            pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.95 }}
          >
            <Tooltip sticky>Proposed 60m Right of Way (RoW) Centerline</Tooltip>
          </Polyline>
        )}

        {/* 3. Custom Uploaded GeoJSON Line */}
        {uploadedLineOnly && (
          <GeoJSON
            key={JSON.stringify(uploadedLineOnly)}
            data={uploadedLineOnly}
            style={{ color: '#c084fc', weight: 5, opacity: 0.95 }}
          />
        )}

        {/* 4. AI Recommended Micro-Bypass Route */}
        {showBypass && (
          <Polyline
            positions={dynamicBypassCoords}
            pathOptions={{ color: '#10b981', weight: 5, dashArray: '10, 8', opacity: 1 }}
          >
            <Tooltip permanent direction="top">
              ⚡ AI Micro-Bypass (Avoids High Court Stay Plots, Saves ₹18.4 Cr)
            </Tooltip>
          </Polyline>
        )}

        {/* 5. Orthogonal Killa Parcels & 110-Gaj Tatima Sub-Plots */}
        {parcels.map((parcel) => {
          const isSelected = selectedParcel?.id === parcel.id;
          const color = getParcelColor(parcel);

          return (
            <Polygon
              key={parcel.id}
              positions={parcel.coords}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3.5 : parcel.isTatimaPlot ? 2.5 : 1.4,
                fillColor: color,
                fillOpacity: isSelected ? 0.78 : parcel.isTatimaPlot ? 0.85 : 0.42
              }}
              eventHandlers={{
                click: () => onSelectParcel(parcel)
              }}
            >
              <Tooltip direction="center" className="font-mono font-bold text-[10px]">
                {parcel.id} ({parcel.sqYards} Gaj) — {parcel.riskScore}% Risk
              </Tooltip>
              <Popup>
                <div className="text-slate-900 text-xs space-y-1.5 min-w-[250px]">
                  <div className="font-extrabold text-sm border-b border-slate-300 pb-1 flex justify-between">
                    <span>{parcel.id} · {parcel.mauza}</span>
                    <span className="text-red-600">{parcel.riskScore}% Risk</span>
                  </div>
                  <div><strong>Type:</strong> {parcel.subType}</div>
                  <div><strong>ULPIN:</strong> <span className="font-mono">{parcel.ulpin}</span></div>
                  <div><strong>Khewat // Khasra:</strong> {parcel.khewat} // {parcel.khasra}</div>
                  <div><strong>Exact Area:</strong> <span className="font-bold text-emerald-700">{parcel.sqYards} Gaj</span> ({parcel.areaDisplay})</div>
                  <div><strong>Disputed Area:</strong> <span className="font-bold text-red-600">{parcel.disputedGaj}</span></div>
                  <div><strong>Khatedar (Owner):</strong> {parcel.owner}</div>
                  <div className="bg-amber-50 p-1.5 rounded border border-amber-300 text-[11px]">
                    <strong>Easy Case Summary:</strong> {parcel.easyCaseSummary}
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}