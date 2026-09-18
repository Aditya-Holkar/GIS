"use client";

import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
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

export default function MapView({ activeLayers, view3d }: { activeLayers: string[]; view3d: boolean }) {
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorRef = useRef<VectorLayer<VectorSource> | null>(null);

  useEffect(() => {
    if (!target.current) return;
    const vector = new VectorLayer({
      source: new VectorSource({ features: new GeoJSON().readFeatures(india, { featureProjection: "EPSG:3857" }) }),
      style: new Style({
        image: new CircleStyle({ radius: 7, fill: new Fill({ color: "#39d0a1" }), stroke: new Stroke({ color: "#06111d", width: 2 }) }),
      }),
    });
    vectorRef.current = vector;
    const map = new Map({
      target: target.current,
      layers: [new TileLayer({ source: new OSM() }), vector],
      view: new View({ center: fromLonLat([78.9629, 22.5937]), zoom: 4.6 }),
    });
    mapRef.current = map;
    return () => { map.setTarget(undefined); mapRef.current = null; };
  }, []);

  useEffect(() => {
    vectorRef.current?.setVisible(activeLayers.includes("boundaries"));
  }, [activeLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const view = map.getView();
    view.setZoom(view3d ? 3.2 : 4.6);
  }, [view3d]);

  return <div ref={target} className="w-full h-full bg-[#07111f]" aria-label="Interactive GIS map" />;
}