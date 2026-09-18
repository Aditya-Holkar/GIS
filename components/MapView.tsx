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
export type CadastralSelection = { gisCode: string; plotNo?: string };

function createBasemap(kind: Basemap) {
  if (kind === "satellite") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri, Maxar, Earthstar Geographics, and the GIS User Community" }) });
  if (kind === "topographic") return new TileLayer({ source: new XYZ({ url: "https://tile.opentopomap.org/{z}/{x}/{y}.png", attributions: "© OpenTopoMap contributors" }) });
  if (kind === "terrain") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  if (kind === "light") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  if (kind === "dark") return new TileLayer({ source: new XYZ({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "© Esri" }) });
  return new TileLayer({ source: new OSM({ attributions: "© OpenStreetMap contributors" }) });
}

export default function MapView({ activeLayers, view3d, basemap = "streets", cadastralSelection }: { activeLayers: string[]; view3d: boolean; basemap?: Basemap; cadastralSelection?: CadastralSelection | null }) {
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const baseRef = useRef<TileLayer<TileSource> | null>(null);
  const labelsRef = useRef<TileLayer<TileSource> | null>(null);
  const cadastralRef = useRef<TileLayer<TileWMS> | null>(null);
  const cadastralEnabledRef = useRef(false);

  useEffect(() => {
    const targetElement = target.current;
    if (!targetElement) return;

    const map = new Map({
      target: targetElement,
      layers: [createBasemap(basemap)],
      controls: [new Zoom(), new ScaleLine()],
      view: new View({ center: fromLonLat([78.9629, 22.5937]), zoom: 5.4, minZoom: 3, maxZoom: 19 }),
    });

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

    // Official Maharashtra BhuNaksha village-map WMS.
    // The service expects the Maharashtra state code, village GIS code,
    // VILLAGE_MAP layer and the EPSG:3857 map request parameters.
    const cadastral = new TileLayer({
      source: new TileWMS({
        url: "https://mahabhunakasha.mahabhumi.gov.in/WMS",
        params: {
          SERVICE: "WMS",
          VERSION: "1.3.0",
          REQUEST: "GetMap",
          FORMAT: "image/png",
          TRANSPARENT: true,
          LAYERS: "VILLAGE_MAP",
          STYLES: "VILLAGE_MAP",
          state: "27",
          gis_code: "RVM2507272500070311400000",
          overlay_codes: "",
          CRS: "EPSG:3857",
          FORMAT_OPTIONS: "dpi:180",
        },
        serverType: "geoserver",
        projection: "EPSG:3857",
        transition: 0,
        wrapX: false,
      }),
      zIndex: 50,
      visible: activeLayers.includes("cadastral"),
      minZoom: 9,
      opacity: 0.95,
    });
    cadastralRef.current = cadastral;
    map.addLayer(cadastral);
    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      labelsRef.current = null;
      cadastralRef.current = null;
    };
  // Map is initialized once; layer visibility and basemap changes are handled by dedicated effects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    labelsRef.current?.setVisible(activeLayers.includes("places"));

    const cadastral = cadastralRef.current;
    if (!cadastral) return;

    // Toggle the real WMS in place. Do not silently pan the user's map.
    cadastral.setVisible(activeLayers.includes("cadastral"));
    cadastralEnabledRef.current = activeLayers.includes("cadastral");
  }, [activeLayers]);

  useEffect(() => {
    const source = cadastralRef.current?.getSource();
    if (!source || !cadastralSelection?.gisCode) return;
    source.updateParams({ state: "27", gis_code: cadastralSelection.gisCode, overlay_codes: "", LAYERS: "VILLAGE_MAP", STYLES: "VILLAGE_MAP", FORMAT: "image/png", TRANSPARENT: true, CRS: "EPSG:3857" });
    source.refresh();
  }, [cadastralSelection]);

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
    mapRef.current?.getView().setZoom(view3d ? 3.2 : 5.4);
  }, [view3d]);

  return <div ref={target} tabIndex={0} className="w-full h-full bg-[#07111f]" aria-label="Interactive GIS map" />;
}
