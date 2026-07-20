import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Default marker icons break under Vite bundling — use CDN icons. */
const busIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * In-app live bus map (OpenStreetMap via Leaflet — no Google API key).
 */
export default function BusLiveMap({
  latitude,
  longitude,
  label = "School bus",
  speedKmh,
  className = "",
  height = 280,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (
      !containerRef.current ||
      latitude == null ||
      longitude == null ||
      Number.isNaN(Number(latitude)) ||
      Number.isNaN(Number(longitude))
    ) {
      return undefined;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
      const speedText =
        speedKmh != null && speedKmh !== "" ? `<br/>${speedKmh} km/h` : "";
      marker.bindPopup(`<strong>${label}</strong>${speedText}`);

      mapRef.current = map;
      markerRef.current = marker;

      // Leaflet needs a tick after layout for correct size in mobile cards
      requestAnimationFrame(() => map.invalidateSize());
    } else {
      mapRef.current.setView([lat, lng]);
      markerRef.current.setLatLng([lat, lng]);
      const speedText =
        speedKmh != null && speedKmh !== "" ? `<br/>${speedKmh} km/h` : "";
      markerRef.current.setPopupContent(`<strong>${label}</strong>${speedText}`);
    }

    return undefined;
  }, [latitude, longitude, label, speedKmh]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  if (latitude == null || longitude == null) return null;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 ${className}`}
      style={{ height }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
