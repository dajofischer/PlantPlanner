"use client";
import React, { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import Select from "./SelectNoSSR";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import { components, OptionProps, SingleValueProps, MenuListProps } from "react-select";
import { PLANT_PLACEHOLDER } from "./plantPlaceholder";

// Beet dimensions in px (not cm)
const BEET_WIDTH = 1280;
const BEET_HEIGHT = 200;

interface Plant {
  x: number;
  y: number;
  radius: number;
  image: string;
  name: string;
}

interface PlantType {
  name: string;
  image: string;
  diameter: number;
}

interface PlantOption {
  value: string;
  label: string;
  image: string;
  diameter: number;
}

export default function PlantPlanner() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [diameter, setDiameter] = useState(60);
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [validImages, setValidImages] = useState<Set<string>>(new Set());
  const [isMetaDown, setIsMetaDown] = useState(false);
  const [isAltDown, setIsAltDown] = useState(false); // NEW: track Option/Alt key
  const [hoveredPlantName, setHoveredPlantName] = useState<string | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null); // NEW: track hovered row index
  const [hoveredPlantIndex, setHoveredPlantIndex] = useState<number | null>(null); // NEW: for alt-hover highlight
  const [currentPage, setCurrentPage] = useState(0); // NEW: pagination
  const [showAutosavePrompt, setShowAutosavePrompt] = useState(false);
  const rowsPerPage = 5; // CHANGED: show max 5 rows per page
  const tableRowRefs = useRef<(HTMLTableRowElement | null)[]>([]); // For scrolling
  const svgRef = useRef<SVGSVGElement>(null);
  const fullCsvData = useRef<any[]>([]); // Store full CSV rows for table
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load plant types from CSV
  useEffect(() => {
    fetch("/data/pflanzen.csv")
      .then(res => res.text())
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results: Papa.ParseResult<any>) => {
            const types = results.data.map((row: any) => {
              let name = (row.pflanzenname || "").trim();
              let image = (row.bildname || "").trim();
              let diameter = parseInt(row.durchmesser, 10) || 60;
              // Always convert to .png for local images and for validImages
              if (image) {
                image = image.replace(/\.(jpg|jpeg)$/i, ".png");
              }
              return { name, image, diameter };
            }).filter((t: PlantType) => t.name && t.image);
            setPlantTypes(types);
            setSelectedType(prev => prev || (types.length > 0 ? types[0].name : ""));
            // validImages must be .png only
            setValidImages(new Set(types.map(t => t.image.replace(/\.(jpg|jpeg)$/i, ".png"))));
            // Store full CSV for table
            fullCsvData.current = results.data;
          }
        });
      });
  }, []);

  // When plant type changes, set diameter from selected plant
  useEffect(() => {
    if (!selectedType) return;
    const type = plantTypes.find(t => t.name === selectedType);
    if (type && type.diameter) {
      setDiameter(type.diameter);
    }
  }, [selectedType, plantTypes]);

  // Track Command key (metaKey) for delete mode and Option/Alt for inspect mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey) setIsMetaDown(true);
      if (e.altKey) setIsAltDown(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey) setIsMetaDown(false);
      if (!e.altKey) setIsAltDown(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Convert mouse event to SVG coordinates
  function getSvgCoords(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: cursorpt.x, y: cursorpt.y };
  }

  // Only allow placing or deleting if plantTypes is loaded and selectedType is valid
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const svgPoint = getSvgCoords(e);
    // If Command (metaKey) is pressed, delete nearest plant
    if (e.metaKey) {
      if (plants.length === 0) return;
      // Find the nearest plant to the click
      const threshold = 30; // px
      let minDist = Infinity;
      let minIdx = -1;
      plants.forEach((p, i) => {
        const dist = Math.sqrt((p.x - svgPoint.x) ** 2 + (p.y - svgPoint.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      });
      if (minDist < threshold && minIdx !== -1) {
        setPlants(plants => plants.filter((_, i) => i !== minIdx));
      }
      return;
    }
    if (!selectedType || !plantTypes.find(t => t.name === selectedType)) return;
    const { x, y } = svgPoint;
    const type = plantTypes.find(t => t.name === selectedType);
    // Always use a valid image path (placeholder if missing or invalid)
    let image = type ? `/plants/${type.image.replace(/\.(jpg|jpeg)$/i, ".png")}` : "";
    if (!type || !type.image || !validImages.has(type.image.replace(/\.(jpg|jpeg)$/i, ".png"))) {
      image = PLANT_PLACEHOLDER;
    }
    setPlants([
      ...plants,
      {
        x,
        y,
        radius: diameter / 2,
        image,
        name: selectedType,
      },
    ]);
  }

  // Only show preview if plantTypes is loaded and selectedType is valid
  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    if (!selectedType || !plantTypes.find(t => t.name === selectedType)) {
      setPreview(null);
      return;
    }
    const { x, y } = getSvgCoords(e);
    setPreview({ x, y });
  }

  function handleSvgMouseLeave() {
    setPreview(null);
  }

  // Prepare options for dropdown
  const plantOptions: PlantOption[] = plantTypes.map((t) => ({
    value: t.name,
    label: t.name,
    image: t.image,
    diameter: t.diameter,
  }));

  // Custom option rendering with image
  const Option = (props: OptionProps<PlantOption, false>) => (
    <components.Option {...props}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={validImages.has(props.data.image) ? `/plants/${props.data.image}` : PLANT_PLACEHOLDER}
          onError={(e) => (e.currentTarget.src = PLANT_PLACEHOLDER)}
          alt={props.data.label}
          height={36}
          width={36}
          style={{ marginRight: 10, borderRadius: 6, objectFit: "cover" }}
        />
        <span>{props.data.label}</span>
      </div>
    </components.Option>
  );

  // Custom single value rendering
  const SingleValue = (props: SingleValueProps<PlantOption, false>) => (
    <components.SingleValue {...props}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={validImages.has(props.data.image) ? `/plants/${props.data.image}` : PLANT_PLACEHOLDER}
          onError={(e) => (e.currentTarget.src = PLANT_PLACEHOLDER)}
          alt={props.data.label}
          height={28}
          width={28}
          style={{ marginRight: 8, borderRadius: 6, objectFit: "cover" }}
        />
        <span>{props.data.label}</span>
      </div>
    </components.SingleValue>
  );

  // Virtualized MenuList for react-select
  const MenuList = <Option,>(props: MenuListProps<Option, false>) => {
    const { options, children, maxHeight, getValue } = props;
    const childrenArray = React.Children.toArray(children);
    const height = Math.min(options.length * 48, maxHeight || 400);
    const selected = getValue && getValue()[0];
    const initialOffset = Math.max(
      0,
      options.findIndex((o: any) => (o as any).value === (selected as any)?.value) * 48 - 48
    );
    return (
      <List
        height={height}
        itemCount={childrenArray.length}
        itemSize={48}
        width="100%"
        initialScrollOffset={initialOffset}
        style={{ zIndex: 100 }}
      >
        {({ index, style }: ListChildComponentProps) => (
          <div style={style}>{childrenArray[index]}</div>
        )}
      </List>
    );
  };

  const TypedSelect = Select as unknown as React.ComponentType<any>;

  // When alt-hovering a plant, jump to its table row and page
  useEffect(() => {
    if (isAltDown && hoveredPlantIndex !== null) {
      setCurrentPage(Math.floor(hoveredPlantIndex / rowsPerPage));
      // Remove auto-scroll: do not scrollIntoView here
    }
  }, [isAltDown, hoveredPlantIndex]);

  // CSV helpers
  function plantsToCsv(plants: Plant[]) {
    const header = 'x,y,name,durchmesser\n';
    const rows = plants.map(p => `${p.x},${p.y},"${p.name.replace(/"/g, '""')}",${Math.round(p.radius * 2)}`).join('\n');
    return header + rows;
  }
  function csvToPlants(csv: string): Plant[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const xIdx = header.indexOf('x');
    const yIdx = header.indexOf('y');
    const nameIdx = header.indexOf('name');
    const dIdx = header.findIndex(h => h === 'durchmesser');
    return lines.slice(1).map(line => {
      const cols = line.match(/("[^"]*"|[^,]+)/g)?.map(s => s.replace(/^"|"$/g, '')) || [];
      const name = cols[nameIdx] || '';
      const type = plantTypes.find(t => t.name === name);
      const image = type ? `/plants/${type.image.replace(/\.(jpg|jpeg)$/i, ".png")}` : PLANT_PLACEHOLDER;
      return {
        x: parseFloat(cols[xIdx]),
        y: parseFloat(cols[yIdx]),
        name,
        image,
        radius: (parseFloat(cols[dIdx]) || 60) / 2,
      };
    }).filter(p => p.name);
  }
  // Autosave on plant change
  useEffect(() => {
    if (plants.length > 0) {
      localStorage.setItem('autosave.csv', plantsToCsv(plants));
    }
  }, [plants]);
  // On mount, prompt to load autosave if exists
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('autosave.csv')) {
      setShowAutosavePrompt(true);
    }
  }, []);

  return (
    <div className="w-full h-full p-0 m-0" style={{ boxSizing: "border-box", minHeight: '100vh', background: '#fff' }}>
      <div className="flex flex-col gap-4 w-full items-center" style={{ padding: 0, margin: 0 }}>
        {/* Controls row: Dropdown, Slider, Buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: 24, margin: 0, padding: '12px 0 0 0', justifyContent: 'flex-start' }}>
          <div style={{ flex: '0 0 520px', minWidth: 320, maxWidth: 700, marginLeft: 32 }}>
            <Select
              options={plantOptions}
              value={plantOptions.find((o) => o.value === selectedType) || null}
              onChange={(option: any) => {
                setSelectedType(option?.value || "");
              }}
              components={{ Option: Option as any, SingleValue: SingleValue as any, MenuList: MenuList as any }}
              filterOption={undefined}
              isSearchable
              placeholder="Pflanze suchen..."
              styles={{
                menu: (base: any) => ({ ...base, zIndex: 100 }),
                option: (base: any) => ({ ...base, fontSize: 12.6 }), // 30% smaller than 18
                singleValue: (base: any) => ({ ...base, fontSize: 12.6 }), // 30% smaller than 18
                control: (base: any) => ({ ...base, minWidth: 320, maxWidth: 700, width: '100%', height: 60 }),
              }}
              maxMenuHeight={400}
            />
          </div>
          <div style={{ flex: '0 0 340px', minWidth: 180, maxWidth: 400, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, whiteSpace: 'nowrap' }}>Durchmesser (px):</span>
            <input
              type="range"
              min={10}
              max={BEET_HEIGHT}
              value={diameter}
              onChange={e => setDiameter(Number(e.target.value))}
              style={{ flex: 1, minWidth: 80, maxWidth: 180 }}
            />
            <span style={{ minWidth: 40, textAlign: 'right', fontSize: 15 }}>{diameter} px</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 16 }}>
            <button
              onClick={() => {
                const filename = prompt('Dateiname für Export (z.B. pflanzen_status.csv):', 'pflanzen_status.csv');
                if (!filename) return;
                const csv = plantsToCsv(plants);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 100);
              }}
              style={{
                padding: '6px 18px',
                transition: 'background 0.2s, color 0.2s',
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 16,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#c00', e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
            >Speichern</button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 18px',
                transition: 'background 0.2s, color 0.2s',
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 16,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#c00', e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
            >Laden</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = evt => {
                  const csv = evt.target?.result as string;
                  setPlants(csvToPlants(csv));
                  setCurrentPage(0);
                };
                reader.readAsText(file);
              }}
            />
            {showAutosavePrompt && (
              <button
                onClick={() => {
                  const csv = localStorage.getItem('autosave.csv');
                  if (csv) setPlants(csvToPlants(csv));
                  setShowAutosavePrompt(false);
                  setCurrentPage(0);
                }}
                style={{
                  padding: '6px 18px',
                  transition: 'background 0.2s, color 0.2s',
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#c00', e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
              >Autosave laden</button>
            )}
            <button
              onClick={() => setPlants([])}
              style={{
                padding: '6px 18px',
                transition: 'background 0.2s, color 0.2s',
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 16,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#c00', e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
            >Beet leeren</button>
          </div>
        </div>
        <div style={{
  width: BEET_WIDTH,
  maxWidth: '100vw',
  overflowX: 'auto',
  position: 'relative',
  margin: '0 auto',
  display: 'block',
}}>
          {/* Soil background image, now tiled at 50% scale */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: BEET_WIDTH,
            height: BEET_HEIGHT,
            backgroundImage: 'url(/soil.jpg)',
            backgroundSize: '100px 100px', // 50% of original 200x200px
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            zIndex: 0,
            pointerEvents: 'none',
          }} />
          <svg
            ref={svgRef}
            width={BEET_WIDTH}
            height={BEET_HEIGHT}
            viewBox={`0 0 ${BEET_WIDTH} ${BEET_HEIGHT}`}
            style={{ width: BEET_WIDTH, height: BEET_HEIGHT, cursor: isMetaDown ? "pointer" : isAltDown ? "pointer" : (plantTypes.length > 0 && selectedType ? "crosshair" : "not-allowed"), display: "block", position: 'relative', zIndex: 1, background: 'transparent' }}
            onClick={handleSvgClick}
            onMouseMove={e => {
              handleSvgMouseMove(e);
              if (isAltDown) {
                // Find if hovering over a plant
                const svgPoint = getSvgCoords(e);
                let foundIdx: number | null = null;
                for (let i = 0; i < plants.length; ++i) {
                  const p = plants[i];
                  const dist = Math.sqrt((p.x - svgPoint.x) ** 2 + (p.y - svgPoint.y) ** 2);
                  if (dist <= p.radius) {
                    foundIdx = i;
                    break;
                  }
                }
                setHoveredPlantIndex(foundIdx);
              } else {
                setHoveredPlantIndex(null);
              }
            }}
            onMouseLeave={() => {
              handleSvgMouseLeave();
              setHoveredPlantIndex(null);
            }}
          >
            {/* Planted images */}
            {plants.map((p, i) => {
              const imgSrc = p.image && p.image !== "/plants/.png" && p.image !== "/plants/" ? p.image : PLANT_PLACEHOLDER;
              let isAltHighlighted = isAltDown && hoveredPlantIndex === i;
              let isDeleteHighlighted = false;
              let isIndividuallyHighlighted = false;
              let isGroupHighlighted = false;
              // Command/Meta delete highlight logic: only the nearest plant within 30px gets the red border
              let deleteIdx = -1;
              if (isMetaDown && preview) {
                let minDist = Infinity;
                plants.forEach((pp, idx) => {
                  const dist = Math.sqrt((pp.x - preview.x) ** 2 + (pp.y - preview.y) ** 2);
                  if (dist < minDist) {
                    minDist = dist;
                    deleteIdx = idx;
                  }
                });
                if (deleteIdx === i && minDist < 30) isDeleteHighlighted = true;
              }
              if (!isAltHighlighted && !isDeleteHighlighted && hoveredRowIndex !== null && plants[hoveredRowIndex]) {
                const hoveredPlant = plants[hoveredRowIndex];
                isIndividuallyHighlighted =
                  p.name === hoveredPlant.name &&
                  p.x === hoveredPlant.x &&
                  p.y === hoveredPlant.y &&
                  p.radius === hoveredPlant.radius;
              }
              isGroupHighlighted = !isAltHighlighted && !isDeleteHighlighted && hoveredPlantName !== null && p.name === hoveredPlantName;
              let stroke = isDeleteHighlighted
                ? "#c00"
                : isAltHighlighted
                ? "#2196f3"
                : isIndividuallyHighlighted
                ? "#2196f3"
                : isGroupHighlighted
                ? "#FFD700"
                : "#800";
              let strokeWidth = isDeleteHighlighted
                ? p.radius * 0.2 + 4
                : isAltHighlighted
                ? 8
                : isIndividuallyHighlighted
                ? 5
                : isGroupHighlighted
                ? 4
                : 2;
              return (
                <g key={i}
                  onMouseEnter={() => {
                    if (isAltDown) setHoveredPlantIndex(i);
                  }}
                  onMouseLeave={() => {
                    if (isAltDown) setHoveredPlantIndex(null);
                  }}
                  style={{ cursor: isAltDown ? "pointer" : undefined }}
                >
                  <clipPath id={`plant-clip-${i}`}><circle cx={p.x} cy={p.y} r={p.radius} /></clipPath>
                  <image
                    href={imgSrc}
                    x={p.x - p.radius}
                    y={p.y - p.radius}
                    width={p.radius * 2}
                    height={p.radius * 2}
                    style={{ pointerEvents: "none" }}
                    clipPath={`url(#plant-clip-${i})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                </g>
              );
            })}
            {/* Preview circle with image */}
            {preview && selectedType && !isMetaDown && !isAltDown && (() => {
              const type = plantTypes.find(t => t.name === selectedType);
              const imgSrc = type && type.image && validImages.has(type.image.replace(/\.(jpg|jpeg)$/i, ".png")) ? `/plants/${type.image.replace(/\.(jpg|jpeg)$/i, ".png")}` : PLANT_PLACEHOLDER;
              return (
                <g>
                  <clipPath id="preview-clip"><circle cx={preview.x} cy={preview.y} r={diameter / 2} /></clipPath>
                  <image
                    href={imgSrc}
                    x={preview.x - diameter / 2}
                    y={preview.y - diameter / 2}
                    width={diameter}
                    height={diameter}
                    opacity={0.6}
                    style={{ pointerEvents: "none" }}
                    clipPath="url(#preview-clip)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <circle
                    cx={preview.x}
                    cy={preview.y}
                    r={diameter / 2}
                    fill="none"
                    stroke="#000"
                    strokeDasharray="8 6"
                    strokeWidth={2}
                  />
                </g>
              );
            })()}
            {/* Show ❌ cross at cursor if Command is held */}
            {isMetaDown && preview && (
              <g pointerEvents="none">
                <text
                  x={preview.x}
                  y={preview.y + 8}
                  textAnchor="middle"
                  fontSize={36}
                  fontWeight="bold"
                  fill="#c00"
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ userSelect: "none" }}
                >
                  ❌
                </text>
              </g>
            )}
            {/* Show 👀 at cursor if Option/Alt is held */}
            {isAltDown && preview && (
              <g pointerEvents="none">
                <text
                  x={preview.x}
                  y={preview.y + 8}
                  textAnchor="middle"
                  fontSize={36}
                  fontWeight="bold"
                  fill="#2196f3"
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ userSelect: "none" }}
                >
                  👀
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
      {/* Table of planted plants' CSV data */}
      <div style={{ width: '100%', marginTop: 32 }}>
        {plants.length > 0 && plantTypes.length > 0 && (() => {
          const columns = [
            "pflanzenname","durchmesser","hoehe","bluetezeit","standort","erntezeit","wuchsgeschwindigkeit","laub","laubfarbe","boden","wurzelsystem","wuchs","verfuegbarkeit","lieferzeit","preis","url"
          ];
          // For each placed plant, find the full CSV row and override durchmesser with the actual placed value
          const plantedRows = plants.map((p) => {
            const csvRow = fullCsvData.current.find((row: any) => row.pflanzenname === p.name);
            if (!csvRow) return null;
            return {
              ...csvRow,
              durchmesser: Math.round(p.radius * 2), // reflect current diameter in px
              _plant_x: p.x,
              _plant_y: p.y,
            };
          }).filter(Boolean);
          // PAGINATION
          const totalPages = Math.ceil(plantedRows.length / rowsPerPage);
          const pagedRows = plantedRows.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
          tableRowRefs.current = [];
          // Determine group highlight: if hovering a plant in SVG, highlight all rows of that type
          let groupHighlightName: string | null = null;
          if (typeof hoveredPlantIndex === 'number' && hoveredPlantIndex >= 0 && plants[hoveredPlantIndex]) {
            groupHighlightName = plants[hoveredPlantIndex].name;
          } else if (hoveredPlantName) {
            groupHighlightName = hoveredPlantName;
          }
          return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900, background: '#fff', border: '1px solid #ccc', fontSize: '70%' }}>
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col} style={{ border: '1px solid #ccc', padding: 6, background: '#f7f7f7', fontWeight: 600 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row: any, i: number) => {
                    const globalIdx = currentPage * rowsPerPage + i;
                    const isGroupHighlighted = groupHighlightName && row.pflanzenname === groupHighlightName;
                    return (
                      <tr
                        key={globalIdx}
                        ref={el => { tableRowRefs.current[i] = el; }}
                        onMouseEnter={() => {
                          setHoveredPlantName(row.pflanzenname);
                          setHoveredRowIndex(globalIdx);
                        }}
                        onMouseLeave={() => {
                          setHoveredPlantName(null);
                          setHoveredRowIndex(null);
                        }}
                        style={{
                          background:
                            isAltDown && hoveredPlantIndex === globalIdx
                              ? '#e3f2fd' // blue for alt-hovered plant
                              : hoveredRowIndex === globalIdx
                              ? '#e3f2fd' // blue for individual
                              : isGroupHighlighted
                              ? '#fffbe6' // gold for group highlight
                              : undefined,
                        }}
                      >
                        {columns.map(col => (
                          <td key={col} style={{ border: '1px solid #ccc', padding: 6 }}>
                            {col === 'url' && row[col] ? (
                              <a href={row[col]} target="_blank" rel="noopener noreferrer">zur Pflanze</a>
                            ) : (row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, margin: '12px 0' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  style={{
                    padding: '4px 12px',
                    border: 'none',
                    borderRadius: 4,
                    background: currentPage === 0 ? '#eee' : '#f7f7f7',
                    color: currentPage === 0 ? '#aaa' : '#c00',
                    fontWeight: 700,
                    fontSize: 20,
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (currentPage !== 0) {
                      e.currentTarget.style.background = '#c00';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (currentPage !== 0) {
                      e.currentTarget.style.background = '#f7f7f7';
                      e.currentTarget.style.color = '#c00';
                    }
                  }}
                >←</button>
                <span style={{ fontSize: 16, fontWeight: 500 }}>Seite {currentPage + 1} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  style={{
                    padding: '4px 12px',
                    border: 'none',
                    borderRadius: 4,
                    background: currentPage === totalPages - 1 ? '#eee' : '#f7f7f7',
                    color: currentPage === totalPages - 1 ? '#aaa' : '#c00',
                    fontWeight: 700,
                    fontSize: 20,
                    cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (currentPage !== totalPages - 1) {
                      e.currentTarget.style.background = '#c00';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (currentPage !== totalPages - 1) {
                      e.currentTarget.style.background = '#f7f7f7';
                      e.currentTarget.style.color = '#c00';
                    }
                  }}
                >→</button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
