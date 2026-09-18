"use client";

import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import type TileSource from "ol/source/Tile";
import ScaleLine from "ol/control/ScaleLine";
import Zoom from "ol/control/Zoom";
import { fromLonLat } from "ol/proj";
import "ol/ol.css";

export type Basemap = "streets" | "satellite" | "topographic" | "terrain" | "light" | "dark";


function createBasemap(kind: Basemap) {
  if (kind === "satellite") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri, Maxar, Earthstar Geographics, and the GIS User Community" }) });
  if (kind === "topographic") return new TileLayer({ source: new XYZ({ url: "https://tile.opentopomap.org/{z}/{x}/{y}.png", attributions: "© OpenTopoMap contributors" }) });
  if (kind === "terrain") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  if (kind === "light") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  if (kind === "dark") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  return new TileLayer({ source: new OSM({ attributions: "© OpenStreetMap contributors" }) });
}

export default function MapView({ activeLayers, view3d, basemap = "streets" }: { activeLayers: string[]; view3d: boolean; basemap?: Basemap }) {
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const baseRef = useRef<TileLayer<TileSource> | null>(null);
  const labelsRef = useRef<TileLayer<TileSource> | null>(null);
  const cadastralRef = useRef<TileLayer<TileWMS> | null>(null);
  const cadastralEnabledRef = useRef(false);

  useEffect(() => {
    const targetElement = target.current;
    if (!targetElement) return;
    const map = new Map({ target: targetElement, layers: [createBasemap(basemap)], controls: [new Zoom(), new ScaleLine()], view: new View({ center: fromLonLat([78.9629, 22.5937]), zoom: 5.4, minZoom: 3, maxZoom: 19 }) });
    baseRef.current = map.getLayers().item(0) as TileLayer<TileSource>;
    const labels = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attributions: "© Esri",
      }),
      zIndex: 100,
      visible: activeLayers.includes("places"),
    });
    labelsRef.current = labels;
    map.addLayer(labels);

    const cadastral = new TileLayer({
      source: new TileWMS({
        url: "https://mahabhunakasha.mahabhumi.gov.in/WMS",
        params: {
          SERVICE: "WMS",
          VERSION: "1.3.0",
          LAYERS: "VILLAGE_MAP",
          STYLES: "VILLAGE_MAP",
          FORMAT: "image/png",
          TRANSPARENT: true,
          state: "27",
          gis_code: "RVM2507272500070311400000",
        },
        serverType: "geoserver",
        crossOrigin: "anonymous",
      }),
      zIndex: 50,
      visible: activeLayers.includes("cadastral"),
      minZoom: 9,
      opacity: 0.9,
    });
    cadastralRef.current = cadastral;
    map.addLayer(cadastral);
    mapRef.current = map;
    return () => { map.setTarget(undefined); mapRef.current = null; };
  // Map is initialized once; layer visibility and basemap changes are handled by dedicated effects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    labelsRef.current?.setVisible(activeLayers.includes("places"));

    const cadastral = cadastralRef.current;
    const map = mapRef.current;
    if (!cadastral || !map) return;

    const enabled = activeLayers.includes("cadastral");
    cadastral.setVisible(enabled);

    // The current real BhuNaksha WMS configuration is a Pune-area village map.
    // When enabled, move the view to that source area so the user can immediately see it.
    if (enabled && !cadastralEnabledRef.current) {
      map.getView().animate({
        center: fromLonLat([73.8567, 18.5204]),
        zoom: 12.5,
        duration: 450,
      });
    }
    cadastralEnabledRef.current = enabled;
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
      const targetElement = target.current;
      targetElement?.addEventListener("click", handler);
      return () => targetElement?.removeEventListener("click", handler);
    }
    return () => interactionsRef.current.forEach(i => map.removeInteraction(i));
  }, [tool, onSelect, onMeasure]);

  useEffect(() => { mapRef.current?.getView().setZoom(view3d ? 3.2 : 5.4); }, [view3d]);

  return <div ref={target} tabIndex={0} className="w-full h-full bg-[#07111f]" aria-label="Interactive GIS map" />;
}
