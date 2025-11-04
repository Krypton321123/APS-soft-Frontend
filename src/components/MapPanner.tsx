import { useMap } from "react-leaflet";
import { useEffect } from "react";
import type { LatLngExpression } from "leaflet";

export default function MapPanner({ center }: { center: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom(), {
        animate: true,
        duration: 2.0, 
      });
    }
  }, [center, map]);

  return null;
}