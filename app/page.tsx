"use client";

import { useState } from "react";
import {
  Activity, BarChart3, Box, Database, FileDown, Filter, Globe2, Layers3,
  MapPinned, Menu, Ruler, Search, Settings2, ShieldCheck, Sparkles,
  Upload, Users, X, Zap, Satellite, Mountain, Moon, Sun
} from "lucide-react";
import MapView, { type Basemap } from "../components/MapView";

const layers = [
  { id: "osm", name: "OpenStreetMap", type: "Basemap", enabled: true, source: "OpenStreetMap" },
  { id: "boundaries", name: "Administrative Boundaries", type: "Vector", enabled: true, source: "OpenStreetMap / India open data" },
  { id: "states", name: "India States & UTs", type: "Vector", enabled: false, source: "Open data" },
  { id: "districts", name: "India Districts", type: "Vector", enabled: false, source: "Open data" },
  { id: "roads", name: "Road Network", type: "Vector", enabled: false, source: "OpenStreetMap" },
  { id: "railways", name: "Railway Network", type: "Vector", enabled: false, source: "OpenStreetMap" },
  { id: "water", name: "Rivers & Water Bodies", type: "Vector", enabled: false, source: "Natural Earth / OSM" },
  { id: "landcover", name: "Land Cover / LULC", type: "Raster", enabled: false, source: "Bhuvan / Copernicus" },
  { id: "elevation", name: "Elevation / Terrain", type: "Raster", enabled: false, source: "Survey of India / DEM" },
  { id: "population", name: "Population Density", type: "Raster", enabled: false, source: "Census / open data" },
  { id: "settlements", name: "Cities & Settlements", type: "Vector", enabled: false, source: "OSM / open data" },
  { id: "airports", name: "Airports", type: "Vector", enabled: false, source: "Open data" },
  { id: "health", name: "Health Facilities", type: "Vector", enabled: false, source: "data.gov.in" },
  { id: "schools", name: "Schools & Education", type: "Vector", enabled: false, source: "Open government data" },
  { id: "forest", name: "Forest / Vegetation", type: "Vector", enabled: false, source: "NIC / ISRO" },
  { id: "postal", name: "Postal / PIN Boundaries", type: "Vector", enabled: false, source: "data.gov.in" },
];

const basemaps: Array<{id: Basemap; name: string; description: string; icon: typeof Globe2}> = [
  { id: "streets", name: "Streets", description: "OpenStreetMap", icon: Globe2 },
  { id: "satellite", name: "Satellite", description: "World imagery", icon: Satellite },
  { id: "topographic", name: "Topo", description: "OSM + terrain", icon: Mountain },
  { id: "terrain", name: "Terrain", description: "Physical relief", icon: Mountain },
  { id: "light", name: "Light", description: "Minimal gray", icon: Sun },
  { id: "dark", name: "Dark", description: "Dark canvas", icon: Moon },
];

const quickActions = [
  { icon: Globe2, label: "Global data" },
  { icon: Database, label: "Catalog" },
  { icon: Ruler, label: "Measure" },
  { icon: Activity, label: "Live layers" },
];

const workspaceActions = [
  { icon: Users, label: "Team & permissions" },
  { icon: ShieldCheck, label: "Security & audit" },
  { icon: FileDown, label: "Export / reports" },
];

const datasets = [
  ["India Administrative Boundaries", "Vector", "12.4 MB", "Public"],
  ["Global Population 2025", "Raster", "1.8 GB", "Public"],
  ["Road Network — Maharashtra", "Vector", "84 MB", "Team"],
  ["Land Use / Land Cover", "Raster", "640 MB", "Public"],
];

export default function Home() {
  const [activeTool, setActiveTool] = useState("Explore");
  const [sidebar, setSidebar] = useState(true);
  const [activeLayers, setActiveLayers] = useState(layers.map(l => l.id));
  const [view3d, setView3d] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("streets");
  const [mapTool, setMapTool] = useState<"select" | "point" | "line" | "polygon" | "measure" | "filter">("select");
  const [mapMessage, setMapMessage] = useState("Ready");
  const [search, setSearch] = useState("");

  const toggleLayer = (id: string) =>
    setActiveLayers(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);

  return (
    <main className="min-h-screen bg-[#07111f] text-[#e6eef8]">
      <header className="h-16 border-b border-[#1e344d] bg-[#091625] flex items-center px-4 gap-4">
        <button onClick={() => setSidebar(!sidebar)} className="p-2 rounded-lg hover:bg-[#13263c]" aria-label="Toggle sidebar"><Menu size={20}/></button>
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 grid place-items-center text-[#06111d] font-black">G</div>
          <div><div className="font-bold tracking-tight">GIS Studio</div><div className="text-[10px] uppercase tracking-[.2em] text-[#7f96ad]">Geospatial Intelligence</div></div>
        </div>
        <div className="flex-1 max-w-2xl mx-auto relative">
          <Search size={16} className="absolute left-3 top-3 text-[#6f879f]"/>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter") setMapMessage(search ? `Searching: ${search}` : "Enter a place or dataset"); }} className="w-full h-10 rounded-xl border border-[#203951] bg-[#0d1b2b] pl-9 pr-4 outline-none focus:border-[#39d0a1]" placeholder="Search places, datasets, coordinates, layers..." />
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => setView3d(!view3d)} className={`px-3 py-2 rounded-lg border text-sm ${view3d ? "border-[#39d0a1] text-[#39d0a1]" : "border-[#243d57]"}`}><Box size={15} className="inline mr-2"/>{view3d ? "3D" : "2D"}</button>
          <button className="p-2 rounded-lg hover:bg-[#13263c]"><Settings2 size={18}/></button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {sidebar && <aside className="w-[330px] shrink-0 border-r border-[#1e344d] bg-[#091625] overflow-y-auto">
          <div className="p-4 border-b border-[#1e344d]">
            <div className="grid grid-cols-4 gap-1 bg-[#0d1b2b] p-1 rounded-xl">
              {["Explore","Layers","Data","Analyze"].map(t => <button key={t} onClick={() => setActiveTool(t)} className={`rounded-lg py-2 text-xs ${activeTool===t ? "bg-[#18334b] text-[#fff]" : "text-[#8299b0]"}`}>{t}</button>)}
            </div>
          </div>

          {activeTool === "Explore" && <div className="p-4 space-y-4">
            <section className="rounded-2xl border border-[#1e344d] bg-[#0d1b2b] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-[#39d0a1]"/> Intelligent Map Assistant</div>
              <p className="text-xs text-[#8399af] mt-2 leading-5">Ask questions about your spatial data, discover patterns, build map views and run analysis workflows.</p>
              <div className="mt-3 flex gap-2"><input className="flex-1 rounded-lg bg-[#081321] border border-[#203951] px-3 py-2 text-xs" placeholder="e.g. find high-density areas"/><button onClick={() => setMapMessage("Assistant queued spatial analysis") } className="rounded-lg bg-[#39d0a1] text-[#06111d] px-3"><Zap size={14}/></button></div>
            </section>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => { const Icon = action.icon; return <button key={action.label} className="rounded-xl border border-[#1e344d] bg-[#0d1b2b] p-3 text-left hover:border-[#315372]"><Icon size={17} className="text-[#4aa3ff]"/><div className="text-xs mt-2">{action.label}</div></button>; })}
            </div>
          </div>}

          {activeTool === "Layers" && <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold">Map layers</span><button onClick={() => setMapMessage("Upload workflow ready — choose a GIS dataset") } className="text-xs text-[#39d0a1]"><Upload size={13} className="inline mr-1"/>Add</button></div>
            <div className="rounded-xl border border-[#1e344d] bg-[#0d1b2b] p-3 mb-3">
              <div className="text-[10px] uppercase tracking-widest text-[#6f879f] mb-2">Basemap</div>
              <div className="grid grid-cols-2 gap-2">
                {basemaps.map(b => { const Icon = b.icon; return <button key={b.id} onClick={() => { setBasemap(b.id); setMapMessage("Basemap: " + b.name); }} className={"flex items-center gap-2 rounded-lg border p-2 text-left " + (basemap===b.id ? "border-[#39d0a1] bg-[#123148]" : "border-[#203951] bg-[#081321]")}><Icon size={15} className={basemap===b.id ? "text-[#39d0a1]" : "text-[#6f879f]"}/><span className="min-w-0"><span className="block text-xs">{b.name}</span><span className="block text-[9px] text-[#71879d]">{b.description}</span></span></button>; })}
              </div>
            </div>
            {layers.map(l => <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#1b3046] bg-[#0d1b2b]"><input type="checkbox" checked={activeLayers.includes(l.id)} onChange={() => toggleLayer(l.id)} /><Layers3 size={16} className="text-[#4aa3ff]"/><div className="min-w-0 flex-1"><div className="text-xs truncate">{l.name}</div><div className="text-[10px] text-[#71879d]">{l.type} · {l.source}</div></div><span className="h-2 w-2 rounded-full bg-[#39d0a1]"/></div>)}
          </div>}

          {activeTool === "Data" && <div className="p-4"><div className="flex gap-2 mb-3"><button className="flex-1 rounded-lg bg-[#18334b] py-2 text-xs"><Database size={13} className="inline mr-1"/>Catalog</button><button className="rounded-lg border border-[#29435c] px-3"><Upload size={13}/></button></div>{datasets.map(d => <div key={d[0]} className="border-b border-[#1a2e43] py-3"><div className="text-xs font-medium">{d[0]}</div><div className="text-[10px] text-[#72889e] mt-1">{d[1]} · {d[2]} · {d[3]}</div></div>)}</div>}

          {activeTool === "Analyze" && <div className="p-4 space-y-2">{["Buffer / proximity","Intersect / overlay","Heatmap / density","Spatial statistics","Route / network","Raster calculator"].map((x,i)=><button key={x} onClick={() => setMapMessage(`${x} selected — configure inputs on the map`)} className="w-full flex items-center gap-3 rounded-xl border border-[#1e344d] bg-[#0d1b2b] p-3 text-left hover:border-[#39d0a1]"><BarChart3 size={16} className="text-[#39d0a1]"/><span className="text-xs">{x}</span><span className="ml-auto text-[10px] text-[#61788e]">Run</span></button>)}</div>}

          <div className="p-4 border-t border-[#1e344d] mt-4">
            <div className="text-[10px] uppercase tracking-widest text-[#627a92] mb-2">Workspace</div>
            {workspaceActions.map(action => { const Icon = action.icon; return <button key={action.label} className="w-full flex items-center gap-3 py-2 text-xs text-[#8ca1b5] hover:text-white"><Icon size={15}/>{action.label}</button>; })}
          </div>
        </aside>}

        <section className="flex-1 relative min-w-0 map-shell">
          <MapView activeLayers={activeLayers} view3d={view3d} basemap={basemap} tool={mapTool} onSelect={name => setMapMessage(`Selected: ${name}`)} onMeasure={meters => setMapMessage(`Measured: ${(meters / 1000).toFixed(2)} km`)}/>
          <div className="absolute top-4 right-4 flex gap-1 rounded-xl border border-[#29435c] bg-[#091625]/95 p-1 shadow-xl">
            {basemaps.slice(0, 4).map(b => <button key={b.id} title={b.name} onClick={() => { setBasemap(b.id); setMapMessage("Basemap: " + b.name); }} className={"p-2 rounded-lg " + (basemap===b.id ? "bg-[#18334b] text-[#39d0a1]" : "hover:bg-[#13263c]")}><b.icon size={16}/></button>)}
          </div>
          <div className="absolute top-4 left-4 flex gap-2">
            {["Select","Draw","Measure","Filter"].map((x,i)=>{ const tool = i===0 ? "select" : i===1 ? "polygon" : i===2 ? "measure" : "filter"; return <button key={x} onClick={() => setMapTool(tool as typeof mapTool)} className={`px-3 py-2 rounded-lg border bg-[#0b1726]/95 text-xs shadow-lg ${mapTool===tool ? "border-[#39d0a1] text-[#39d0a1]" : "border-[#29435c]"}`}>{i===0 ? <MapPinned size={13} className="inline mr-1"/> : i===1 ? <Sparkles size={13} className="inline mr-1"/> : i===2 ? <Ruler size={13} className="inline mr-1"/> : <Filter size={13} className="inline mr-1"/>}{x}</button>)}
          </div>
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between pointer-events-none">
            <div className="pointer-events-auto rounded-xl border border-[#29435c] bg-[#091625]/95 p-3 text-[11px] shadow-xl"><div className="font-semibold">Map status</div><div className="text-[#7f96ad] mt-1">EPSG:3857 · {view3d ? "3D preview" : "2D"} · {activeLayers.length} layers active · {mapMessage}</div></div>
            <div className="pointer-events-auto rounded-xl border border-[#29435c] bg-[#091625]/95 p-2 flex gap-1"><button className="p-2 hover:bg-[#13263c]"><FileDown size={16}/></button><button className="p-2 hover:bg-[#13263c]"><X size={16}/></button></div>
          </div>
        </section>
      </div>
    </main>
  );
}