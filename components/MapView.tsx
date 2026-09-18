
"use client";

import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Draw from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Select from "ol/interaction/Select";
import Snap from "ol/interaction/Snap";
import { fromLonLat, toLonLat } from "ol/proj";
import { getLength } from "ol/sphere";
import { Fill, Stroke, Style, Circle as CircleStyle } from "ol/style";
import "ol/ol.css";

const india = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [73.8567, 18.5204] }, properties: { name: "Pune" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [72.8777, 19.076] }, properties: { name: "Mumbai" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [77.5946, 12.9716] }, properties: { name: "Bengaluru" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [77.1025, 28.7041] }, properties: { name: "Delhi" } }
  ]
} as const;

type Tool = "select" | "point" | "line" | "polygon" | "measure" | "filter";

export default function MapView({
  activeLayers, view3d, tool = "select", onSelect, onMeasure,
}: { activeLayers: string[]; view3d: boolean; tool?: Tool; onSelect?: (name: string) => void; onMeasure?: (meters: number) => void }) {
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorRef = useRef<VectorLayer<VectorSource> | null>(null);
  const editRef = useRef<VectorSource | null>(null);
  const interactionsRef = useRef<Array<Draw | Select | Modify | Snap>>([]);

  useEffect(() => {
    if (!target.current) return;
    const source = new VectorSource({ features: new GeoJSON().readFeatures(india, { featureProjection: "EPSG:3857" }) });
    editRef.current = source;
    const vector = new VectorLayer({ source, style: new Style({
      image: new CircleStyle({ radius: 7, fill: new Fill({ color: "#39d0a1" }), stroke: new Stroke({ color: "#06111d", width: 2 }) }),
      fill: new Fill({ color: "rgba(57,208,161,.12)" }), stroke: new Stroke({ color: "#39d0a1", width: 2 }),
    }) });
    vectorRef.current = vector;
    const map = new Map({ target: target.current, layers: [new TileLayer({ source: new OSM() }), vector], view: new View({ center: fromLonLat([78.9629, 22.5937]), zoom: 4.6 }) });
    mapRef.current = map;
    const select = new Select();
    select.on("select", e => {
      const feature = e.selected[0];
      if (feature) onSelect?.(String(feature.get("name") ?? "Selected feature"));
    });
    map.addInteraction(select);
    interactionsRef.current.push(select);
    return () => { map.setTarget(undefined); mapRef.current = null; };
  }, [onSelect]);

  useEffect(() => {
    vectorRef.current?.setVisible(activeLayers.includes("boundaries"));
  }, [activeLayers]);

  useEffect(() => {
    const map = mapRef.current;
    const source = editRef.current;
    if (!map || !source) return;
    interactionsRef.current.filter(i => i !== undefined).forEach(i => map.removeInteraction(i));
    interactionsRef.current = [];
    const select = new Select();
    select.on("select", e => { const f=e.selected[0]; if(f) onSelect?.(String(f.get("name") ?? "Selected feature")); });
    map.addInteraction(select); interactionsRef.current.push(select);
    if (tool === "point" || tool === "line" || tool === "polygon" || tool === "measure") {
      const type = tool === "point" ? "Point" : tool === "line" || tool === "measure" ? "LineString" : "Polygon";
      const draw = new Draw({ source, type });
      draw.on("drawend", e => {
        if (tool === "measure") {
          const geometry = e.feature.getGeometry();
          if (geometry && "getCoordinates" in geometry) onMeasure?.(getLength(geometry as never, { projection: "EPSG:3857" }));
          source.removeFeature(e.feature);
        }
      });
      map.addInteraction(draw); interactionsRef.current.push(draw);
      const modify = new Modify({ source }); map.addInteraction(modify); interactionsRef.current.push(modify);
      const snap = new Snap({ source }); map.addInteraction(snap); interactionsRef.current.push(snap);
    }
    if (tool === "filter") {
      const handler = (event: MouseEvent) => {
        const pixel = map.getEventPixel(event);
        const hits = map.getFeaturesAtPixel(pixel);
        if (hits.length) onSelect?.("Filtered: " + String(hits[0].get("name") ?? "feature"));
      };
      target.current?.addEventListener("click", handler);
      return () => target.current?.removeEventListener("click", handler);
    }
    return () => interactionsRef.current.forEach(i => map.removeInteraction(i));
  }, [tool, onSelect, onMeasure]);

  useEffect(() => { mapRef.current?.getView().setZoom(view3d ? 3.2 : 4.6); }, [view3d]);

  return <div ref={target} tabIndex={0} className="w-full h-full bg-[#07111f]" aria-label="Interactive GIS map" />;
}
