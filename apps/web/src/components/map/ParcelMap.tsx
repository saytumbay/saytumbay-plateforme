import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polygon, TileLayer, Marker, Tooltip as LTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router";
import type { ParcelSnapshot } from "@saytumbay/shared";
import { MOISTURE_LABEL } from "@saytumbay/shared";
import { moistureHex } from "@/lib/hooks";
import { useTheme } from "@/lib/theme";
import { Segmented } from "@/components/ui/data";

const LAYERS = {
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Imagerie © Esri, Maxar, Earthstar Geographics", maxNativeZoom: 17 },
  plan: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© contributeurs OpenStreetMap", maxNativeZoom: 19 },
} as const;

function FitBounds({ parcels, selected }: { parcels: ParcelSnapshot[]; selected?: string | null }) {
  const map = useMap();
  useEffect(() => {
    const pts = (selected ? parcels.filter((p) => p.parcel.id === selected) : parcels).flatMap((p) => p.parcel.polygon);
    if (pts.length) map.fitBounds(L.latLngBounds(pts as L.LatLngTuple[]), { padding: [36, 36], maxZoom: selected ? 18 : 17.75 });
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map, parcels.length, selected]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Carte satellite des parcelles. Couleur = état hydrique, contour pointillé = mesure indisponible,
 * étiquette = code + humidité (l'état ne repose jamais sur la couleur seule).
 */
export function ParcelMap({ parcels, height = 420, selected, onSelect, interactive = true }: { parcels: ParcelSnapshot[]; height?: number | string; selected?: string | null; onSelect?: (id: string) => void; interactive?: boolean }) {
  const [layer, setLayer] = useState<keyof typeof LAYERS>("satellite");
  const { dark } = useTheme();
  const navigate = useNavigate();
  const center = useMemo(() => parcels[0]?.parcel.polygon[0] ?? [15.14234, -16.88288], [parcels]);
  const L0 = LAYERS[layer];
  return (
    <div className="relative overflow-hidden rounded-xl border border-line" style={{ height }}>
      <MapContainer center={center as L.LatLngTuple} zoom={17} zoomSnap={0.25} scrollWheelZoom={false} className="h-full w-full" attributionControl keyboard={interactive} dragging={interactive} zoomControl={interactive}>
        <TileLayer key={layer} url={L0.url} attribution={L0.attribution} maxZoom={19} maxNativeZoom={L0.maxNativeZoom} />
        <FitBounds parcels={parcels} selected={selected} />
        {parcels.map((s) => {
          const col = moistureHex(s.state, dark);
          const on = selected === s.parcel.id;
          const open = () => (onSelect ? onSelect(s.parcel.id) : navigate(`/app/parcelles/${s.parcel.id}`));
          return (
            <Polygon
              key={s.parcel.id}
              positions={s.parcel.polygon as L.LatLngTuple[]}
              pathOptions={{ color: col, fillColor: col, weight: on ? 4 : 2.5, fillOpacity: on ? 0.38 : 0.2, dashArray: s.state === "indisponible" ? "6 6" : undefined, lineJoin: "round" }}
              eventHandlers={{ click: open, mouseover: (e) => e.target.setStyle({ fillOpacity: 0.4 }), mouseout: (e) => e.target.setStyle({ fillOpacity: on ? 0.38 : 0.2 }) }}
            >
              <LTooltip sticky direction="top" opacity={1}>
                <strong>{s.parcel.name}</strong> · {s.parcel.crop}
                <br />
                {MOISTURE_LABEL[s.state]}
                {s.moisture != null ? ` · ${Math.round(s.moisture)} %` : ""}
              </LTooltip>
            </Polygon>
          );
        })}
        {parcels.map((s) => {
          const ll = L.polygon(s.parcel.polygon as L.LatLngTuple[]).getBounds().getCenter();
          const col = moistureHex(s.state, dark);
          const txt = s.moisture == null ? "—" : `${Math.round(s.moisture)} %`;
          const icon = L.divIcon({
            className: "",
            iconSize: [0, 0],
            html: `<div style="transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;font-family:'Sora Variable',system-ui,sans-serif;pointer-events:none"><span style="width:28px;height:28px;border-radius:50%;background:#0e1f18;color:#fff;border:2.5px solid ${col};display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700">${s.parcel.code}</span><span style="white-space:nowrap;background:rgba(14,31,24,.85);color:#fff;font-size:12px;font-weight:600;padding:2px 7px;border-radius:6px">${txt}</span></div>`,
          });
          return <Marker key={`m-${s.parcel.id}`} position={ll} icon={icon} interactive={false} keyboard={false} />;
        })}
      </MapContainer>
      {interactive && (
        <div className="absolute right-3 top-3 z-[400]">
          <Segmented
            label="Fond de carte"
            size="sm"
            value={layer}
            onChange={setLayer}
            options={[
              { value: "satellite", label: "Satellite" },
              { value: "plan", label: "Plan" },
            ]}
            className="shadow-2"
          />
        </div>
      )}
    </div>
  );
}
