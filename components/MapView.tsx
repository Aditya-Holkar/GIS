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

function styleFor(id: string) {
  return (feature: any) => {
    const name = String(feature.get("name") ?? "");
    return new Style({
      image: new CircleStyle({
        radius: 4,
        fill: new Fill({ color: "#39d0a1" }),
        stroke: new Stroke({ color: "#06111d", width: 2 }),
      }),
      text: new Text({
        text: name,
        offsetY: -11,
        font: "600 12px Inter, Arial, sans-serif",
        fill: new Fill({ color: "#ffffff" }),
        stroke: new Stroke({ color: "#06111d", width: 3 }),
        overflow: true,
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
    const ids = ["places"];
    ids.forEach(id => {
      const source = id === "boundaries" ? editSource : new VectorSource({ features: new GeoJSON().readFeatures(thematicFeatures(id), { featureProjection: "EPSG:3857" }) });
      const layer = new VectorLayer({ source, style: styleFor(id), visible: activeLayers.includes(id), zIndex: 20 });
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
