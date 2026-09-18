"use client";

import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Draw from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Select from "ol/interaction/Select";
import Snap from "ol/interaction/Snap";
import ScaleLine from "ol/control/ScaleLine";
import Zoom from "ol/control/Zoom";
import { fromLonLat } from "ol/proj";
import { getLength } from "ol/sphere";
import { Fill, Stroke, Style, Circle as CircleStyle, Text } from "ol/style";
import "ol/ol.css";

const india = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [73.8567, 18.5204] }, properties: { name: "Pune" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [72.8777, 19.076] }, properties: { name: "Mumbai" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [77.5946, 12.9716] }, properties: { name: "Bengaluru" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [77.1025, 28.7041] }, properties: { name: "Delhi" } },
  ],
} as const;

type Tool = "select" | "point" | "line" | "polygon" | "measure" | "filter";
export type Basemap = "streets" | "satellite" | "topographic" | "terrain" | "light" | "dark";

const indiaBounds = [[68.1, 8.0], [97.4, 8.0], [97.4, 35.7], [68.1, 35.7], [68.1, 8.0]];
const stateShapes = [
  [[68.1, 23.0], [74.0, 23.0], [74.0, 35.7], [68.1, 35.7], [68.1, 23.0]],
  [[74.0, 20.0], [80.0, 20.0], [80.0, 30.0], [74.0, 30.0], [74.0, 20.0]],
  [[80.0, 18.0], [88.0, 18.0], [88.0, 28.0], [80.0, 28.0], [80.0, 18.0]],
  [[88.0, 20.0], [97.4, 20.0], [97.4, 29.0], [88.0, 29.0], [88.0, 20.0]],
  [[72.0, 8.0], [82.0, 8.0], [82.0, 20.0], [72.0, 20.0], [72.0, 8.0]],
];
const cities = [
  [73.8567, 18.5204, "Pune"], [72.8777, 19.076, "Mumbai"], [77.5946, 12.9716, "Bengaluru"],
  [77.1025, 28.7041, "Delhi"], [80.2707, 13.0827, "Chennai"], [78.4867, 17.385, "Hyderabad"],
  [88.3639, 22.5726, "Kolkata"], [75.7873, 26.9124, "Jaipur"], [73.0479, 26.2389, "Jodhpur"],
  [72.5714, 23.0225, "Ahmedabad"], [76.7794, 30.7333, "Chandigarh"], [85.8245, 20.2961, "Bhubaneswar"],
] as const;

function featureCollection(features: object[]) {
  return { type: "FeatureCollection", features };
}

function pointFeatures() {
  return cities.map(([lon, lat, name]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { name } }));
}

function thematicFeatures(id: string) {
  if (id === "boundaries") return featureCollection([{ type: "Feature", geometry: { type: "Polygon", coordinates: [indiaBounds] }, properties: { name: "India administrative extent" } }]);
  if (id === "states" || id === "districts" || id === "postal") return featureCollection(stateShapes.map((coordinates, i) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: [coordinates] }, properties: { name: id + " zone " + (i + 1) } })));
  if (id === "roads") return featureCollection([
    [[68.5, 23], [74, 19], [78, 22], [84, 21], [90, 24], [96, 27]],
    [[72, 12], [76, 18], [80, 23], [84, 28], [90, 34]],
    [[70, 30], [77, 27], [84, 26], [92, 29]],
  ].map((coordinates, i) => ({ type: "Feature", geometry: { type: "LineString", coordinates }, properties: { name: "Road corridor " + (i + 1) } })));
  if (id === "railways") return featureCollection([
    [[72, 19], [77, 21], [80, 23], [85, 22], [89, 23]],
    [[73, 13], [77, 18], [81, 24], [86, 29]],
  ].map((coordinates, i) => ({ type: "Feature", geometry: { type: "LineString", coordinates }, properties: { name: "Rail corridor " + (i + 1) } })));
  if (id === "water") return featureCollection([
    { type: "Feature", geometry: { type: "LineString", coordinates: [[73, 30], [74, 27], [75, 24], [76, 20], [77, 16]] }, properties: { name: "River network" } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[88, 30], [87, 27], [88, 24], [89, 21]] }, properties: { name: "River network" } },
  ]);
  if (id === "landcover" || id === "forest" || id === "elevation" || id === "population") return featureCollection(stateShapes.map((coordinates, i) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: [coordinates] }, properties: { name: id + " zone " + (i + 1), value: (i + 1) * 20 } })));
  if (["settlements", "airports", "health", "schools"].includes(id)) return featureCollection(pointFeatures());
  return featureCollection([]);
}

function styleFor(id: string) {
  const point = ["settlements", "airports", "health", "schools"].includes(id);
  const line = ["roads", "railways", "water"].includes(id);
  const polygon = ["boundaries", "states", "districts", "postal", "landcover", "forest", "elevation", "population"].includes(id);

  const stroke =
    id === "roads" ? "#f0b35a" :
    id === "railways" ? "#d58cff" :
    id === "water" ? "#4aa3ff" :
    id === "forest" ? "#39d083" :
    "#39d0a1";

  return (feature: any) => {
    const name = String(feature.get("name") ?? "");
    const value = feature.get("value");
    const label = value !== undefined ? `${name} · ${value}` : name;

    if (point) {
      return new Style({
        image: new CircleStyle({
          radius: id === "airports" ? 6 : 5,
          fill: new Fill({ color: stroke }),
          stroke: new Stroke({ color: "#06111d", width: 2 }),
        }),
        text: new Text({
          text: label,
          offsetY: -12,
          font: "600 12px Inter, Arial, sans-serif",
          fill: new Fill({ color: "#ffffff" }),
          stroke: new Stroke({ color: "#06111d", width: 3 }),
          overflow: true,
        }),
      });
    }

    if (polygon) {
      return new Style({
        fill: undefined,
        stroke: id === "boundaries" ? new Stroke({ color: "#8de7ff", width: 2 }) : undefined,
        text: new Text({
          text: label,
          font: "600 11px Inter, Arial, sans-serif",
          fill: new Fill({ color: "#ffffff" }),
          stroke: new Stroke({ color: "#06111d", width: 3 }),
          overflow: true,
          placement: "point",
        }),
      });
    }

    return new Style({
      stroke: new Stroke({ color: stroke, width: id === "roads" ? 3 : 2 }),
      text: new Text({
        text: label,
        font: "600 11px Inter, Arial, sans-serif",
        fill: new Fill({ color: "#ffffff" }),
        stroke: new Stroke({ color: "#06111d", width: 3 }),
        overflow: true,
        placement: "line",
      }),
    });
  };
}

function createBasemap(kind: Basemap) {
  if (kind === "satellite") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri, Maxar, Earthstar Geographics, and the GIS User Community" }) });
  if (kind === "topographic") return new TileLayer({ source: new XYZ({ url: "https://tile.opentopomap.org/{z}/{x}/{y}.png", attributions: "© OpenTopoMap contributors" }) });
  if (kind === "terrain") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  if (kind === "light") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  if (kind === "dark") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  return new TileLayer({ source: new OSM({ attributions: "© OpenStreetMap contributors" }) });
}

export default function MapView({ activeLayers, view3d, tool = "select", basemap = "streets", onSelect, onMeasure }: { activeLayers: string[]; view3d: boolean; tool?: Tool; basemap?: Basemap; onSelect?: (name: string) => void; onMeasure?: (meters: number) => void }) {
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const baseRef = useRef<TileLayer<any> | null>(null);
  const labelsRef = useRef<TileLayer<any> | null>(null);
  const layerRefs = useRef<Record<string, VectorLayer<VectorSource>>>({});
  const editRef = useRef<VectorSource | null>(null);
  const interactionsRef = useRef<Array<Draw | Select | Modify | Snap>>([]);

  useEffect(() => {
    if (!target.current) return;
    const editSource = new VectorSource({ features: new GeoJSON().readFeatures(india, { featureProjection: "EPSG:3857" }) });
    editRef.current = editSource;
    const map = new Map({ target: target.current, layers: [createBasemap(basemap)], controls: [new Zoom(), new ScaleLine()], view: new View({ center: fromLonLat([78.9629, 22.5937]), zoom: 5.4, minZoom: 3, maxZoom: 19 }) });
    baseRef.current = map.getLayers().item(0) as TileLayer<any>;
    const labels = new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }), zIndex: 100, visible: basemap !== "streets" });
    labelsRef.current = labels;
    map.addLayer(labels);
    const ids = ["boundaries", "states", "districts", "roads", "railways", "water", "landcover", "elevation", "population", "settlements", "airports", "health", "schools", "forest", "postal"];
    ids.forEach(id => {
      const source = id === "boundaries" ? editSource : new VectorSource({ features: new GeoJSON().readFeatures(thematicFeatures(id), { featureProjection: "EPSG:3857" }) });
      const layer = new VectorLayer({ source, style: styleFor(id), visible: activeLayers.includes(id), zIndex: id === "boundaries" ? 20 : 10 });
      layerRefs.current[id] = layer;
      map.addLayer(layer);
    });
    mapRef.current = map;
    return () => { map.setTarget(undefined); mapRef.current = null; layerRefs.current = {}; };
  // Map is initialized once; layer visibility and basemap changes are handled by dedicated effects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Object.entries(layerRefs.current).forEach(([id, layer]) => layer.setVisible(activeLayers.includes(id)));
  }, [activeLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = createBasemap(basemap);
    const old = baseRef.current;
    if (old) map.removeLayer(old);
    map.getLayers().insertAt(0, next);
    baseRef.current = next;
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const source = editRef.current;
    if (!map || !source) return;
    interactionsRef.current.forEach(i => map.removeInteraction(i));
    interactionsRef.current = [];
    const select = new Select();
    select.on("select", e => { const f = e.selected[0]; if (f) onSelect?.(String(f.get("name") ?? "Selected feature")); });
    map.addInteraction(select);
    interactionsRef.current.push(select);
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
      map.addInteraction(draw);
      interactionsRef.current.push(draw);
      const modify = new Modify({ source });
      map.addInteraction(modify);
      interactionsRef.current.push(modify);
      const snap = new Snap({ source });
      map.addInteraction(snap);
      interactionsRef.current.push(snap);
    }
    if (tool === "filter") {
      const handler = (event: MouseEvent) => {
        const hits = map.getFeaturesAtPixel(map.getEventPixel(event));
        if (hits.length) onSelect?.("Filtered: " + String(hits[0].get("name") ?? "feature"));
      };
      target.current?.addEventListener("click", handler);
      return () => target.current?.removeEventListener("click", handler);
    }
    return () => interactionsRef.current.forEach(i => map.removeInteraction(i));
  }, [tool, onSelect, onMeasure]);

  useEffect(() => { mapRef.current?.getView().setZoom(view3d ? 3.2 : 5.4); }, [view3d]);

  return <div ref={target} tabIndex={0} className="w-full h-full bg-[#07111f]" aria-label="Interactive GIS map" />;
}
