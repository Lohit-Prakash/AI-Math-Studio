import React, { useRef, useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw, Move, MousePointer2, Eye, EyeOff } from 'lucide-react';
import { FormulaData } from '../types';
import { safeEvaluate, generateGraphPoints } from '../utils/math';

interface VisualizerProps {
  formulaData: FormulaData;
  values: Record<string, number>;
  result: number | string;
  isGhost?: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ formulaData, values, result, isGhost = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- Graph State ---
  const [customDomain, setCustomDomain] = useState<{ min: number; max: number } | null>(null);
  const [isGraphDragging, setIsGraphDragging] = useState(false);
  const graphDragStartRef = useRef<{ x: number; min: number; max: number } | null>(null);

  // --- SVG State ---
  const [svgTransform, setSvgTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isSvgDragging, setIsSvgDragging] = useState(false);
  const [isPanModeEnabled, setIsPanModeEnabled] = useState(false);
  const svgDragStartRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const [svgMouse, setSvgMouse] = useState<{ x: number; y: number } | null>(null);
  
  // Shared State
  const [showCoordinates, setShowCoordinates] = useState(false);

  // Reset states when formula changes
  useEffect(() => {
    setCustomDomain(null);
    setSvgTransform({ x: 0, y: 0, k: 1 });
  }, [formulaData.title, formulaData.jsFormula]);

  // --- SVG Interaction Handlers ---
  const handleSvgZoom = (factor: number) => {
    setSvgTransform(prev => ({ 
      ...prev, 
      k: Math.min(Math.max(prev.k * factor, 0.1), 10) 
    }));
  };

  const handleSvgReset = () => setSvgTransform({ x: 0, y: 0, k: 1 });

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (isGhost) return;
    // Only drag if Pan Mode is enabled or Middle Mouse button is used
    if (isPanModeEnabled || e.button === 1) {
      e.preventDefault();
      setIsSvgDragging(true);
      svgDragStartRef.current = { 
          clientX: e.clientX, 
          clientY: e.clientY, 
          x: svgTransform.x, 
          y: svgTransform.y 
      };
    }
  };

  const onSvgWheel = (e: React.WheelEvent) => {
    if (isGhost) return;
    e.stopPropagation();
    const zoomIntensity = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1; 
    const factor = 1 + (direction * zoomIntensity);
    
    // Simple zoom logic
    setSvgTransform(prev => ({ 
      ...prev, 
      k: Math.min(Math.max(prev.k * factor, 0.1), 10) 
    }));
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !showCoordinates) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const mx = e.clientX - rect.left - centerX;
    const my = e.clientY - rect.top - centerY;

    const svgXCentered = (mx - svgTransform.x) / svgTransform.k;
    const svgYCentered = (my - svgTransform.y) / svgTransform.k;

    // Map back to 0-400, 0-300 space (assuming 200,150 is center)
    const svgX = svgXCentered + 200;
    const svgY = svgYCentered + 150;

    setSvgMouse({ x: svgX, y: svgY });
  };

  // Global Drag Handlers for both
  useEffect(() => {
    const handleWindowMove = (e: MouseEvent) => {
      // Graph Drag
      if (isGraphDragging && graphDragStartRef.current && containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const dx = e.clientX - graphDragStartRef.current.x;
        const range = graphDragStartRef.current.max - graphDragStartRef.current.min;
        const shift = -(dx / width) * range;
        setCustomDomain({
          min: graphDragStartRef.current.min + shift,
          max: graphDragStartRef.current.max + shift
        });
      }

      // SVG Drag
      if (isSvgDragging && svgDragStartRef.current) {
         const dx = e.clientX - svgDragStartRef.current.clientX;
         const dy = e.clientY - svgDragStartRef.current.clientY;
         setSvgTransform(prev => ({
             ...prev,
             x: svgDragStartRef.current!.x + dx,
             y: svgDragStartRef.current!.y + dy
         }));
      }
    };

    const handleWindowUp = () => {
      setIsGraphDragging(false);
      setIsSvgDragging(false);
      graphDragStartRef.current = null;
      svgDragStartRef.current = null;
    };

    if (isGraphDragging || isSvgDragging) {
      window.addEventListener('mousemove', handleWindowMove);
      window.addEventListener('mouseup', handleWindowUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };
  }, [isGraphDragging, isSvgDragging]);

  // --- Common UI Components ---

  const ControlsOverlay = ({ onZoomIn, onZoomOut, onReset, isDraggingMode, onTogglePan, showCoordsToggle, onToggleCoords, coordsVisible }: any) => (
    !isGhost && (
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/50 shadow-2xl">
        <button onClick={onZoomIn} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={onZoomOut} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={onReset} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors" title="Reset View">
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-700/50 my-1"></div>
        <button 
          onClick={onTogglePan} 
          className={`p-2 ${isDraggingMode ? 'text-cyan-400 bg-slate-800 ring-1 ring-cyan-500/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'} rounded-lg transition-all`} 
          title="Toggle Pan Mode"
        >
          <Move className="w-4 h-4" />
        </button>
        {showCoordsToggle && (
            <button 
            onClick={onToggleCoords} 
            className={`p-2 ${coordsVisible ? 'text-cyan-400 bg-slate-800 ring-1 ring-cyan-500/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'} rounded-lg transition-all`} 
            title="Toggle Coordinates"
          >
            {coordsVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        )}
      </div>
    )
  );

  // --- SVG Rendering ---
  const processedSvg = useMemo(() => {
    if (!formulaData.svgTemplate) return null;
    
    let svg = formulaData.svgTemplate;
    
    // Evaluate {{ expression }}
    svg = svg.replace(/\{\{(.*?)\}\}/g, (match, expression) => {
      const cleanExpr = expression.trim();
      const decodedExpr = cleanExpr.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const val = safeEvaluate(decodedExpr, values);
      if (typeof val === 'number' && isFinite(val)) return String(parseFloat(val.toFixed(4)));
      if (typeof val === 'string') return val;
      return match; 
    });
    
    svg = svg.replace(/{{result}}/g, String(result));

    const visibilityStyles = `
      svg { width: 100%; height: 100%; overflow: visible; }
      svg text, svg tspan { 
        fill: #e2e8f0 !important; 
        font-family: 'Inter', sans-serif; 
        font-weight: 500; 
        opacity: 1 !important; 
        text-rendering: optimizeLegibility;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5); 
      }
      
      /* Fix invisible blacks */
      svg [stroke="#000"], svg [stroke="#000000"], svg [stroke="black"], svg [stroke="rgb(0,0,0)"] { stroke: #22d3ee !important; }
      svg [fill="#000"], svg [fill="#000000"], svg [fill="black"], svg [fill="rgb(0,0,0)"] { fill: #22d3ee !important; fill-opacity: 0.2 !important; }
      
      /* Default styling for unstyled shapes */
      :is(svg path, svg rect, svg circle, svg ellipse, svg polygon):not([fill]):not([stroke]):not([style*="fill"]):not([style*="stroke"]) {
         fill: #22d3ee !important; fill-opacity: 0.2 !important; stroke: #22d3ee !important; stroke-width: 2px !important;
      }
      svg line:not([stroke]):not([style*="stroke"]) { stroke: #22d3ee !important; stroke-width: 2px !important; }
      
      /* Optimization & Precision */
      svg path, svg rect, svg circle, svg ellipse, svg polygon, svg line {
        vector-effect: non-scaling-stroke;
        shape-rendering: geometricPrecision;
      }
    `;

    if (isGhost) {
      svg = svg.replace(/<animate[\s\S]*?\/>/g, '')
               .replace(/<animateMotion[\s\S]*?\/>/g, '')
               .replace(/<animateTransform[\s\S]*?\/>/g, '')
               .replace(/<animate[\s\S]*?>[\s\S]*?<\/animate>/g, '')
               .replace(/<animateMotion[\s\S]*?>[\s\S]*?<\/animateMotion>/g, '');
      
      // Unified visibility for Ghost too, just dashed
      svg = svg.replace(/<\/svg>/i, `<style>${visibilityStyles} svg * { animation: none !important; transition: none !important; stroke-dasharray: 4 4 !important; opacity: 0.6; }</style></svg>`);
    } else {
      svg = svg.replace(/<\/svg>/i, `<style>${visibilityStyles}</style></svg>`);
    }
    return svg;
  }, [formulaData.svgTemplate, values, result, isGhost]);

  const renderSvg = () => {
    if (!processedSvg) return null;
    
    return (
      <div 
        ref={containerRef}
        className={`w-full h-full relative overflow-hidden ${isPanModeEnabled ? (isSvgDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'} ${isGhost ? 'pointer-events-none opacity-40' : ''}`}
        onMouseDown={onSvgMouseDown}
        onWheel={onSvgWheel}
        onMouseMove={onSvgMouseMove}
        onMouseLeave={() => setSvgMouse(null)}
      >
         <ControlsOverlay 
            onZoomIn={() => handleSvgZoom(1.2)} 
            onZoomOut={() => handleSvgZoom(0.8)} 
            onReset={handleSvgReset}
            isDraggingMode={isPanModeEnabled}
            onTogglePan={() => setIsPanModeEnabled(!isPanModeEnabled)}
            showCoordsToggle={true}
            coordsVisible={showCoordinates}
            onToggleCoords={() => setShowCoordinates(!showCoordinates)}
         />
         
         {/* SVG Tooltip */}
         {svgMouse && !isGhost && showCoordinates && (
            <div 
              className="absolute z-30 pointer-events-none bg-slate-950/95 border border-slate-700/80 px-3 py-2 rounded-lg shadow-2xl backdrop-blur-md ring-1 ring-white/10"
              style={{ 
                left: '50%', 
                bottom: '20px', 
                transform: 'translateX(-50%)' 
              }}
            >
              <div className="flex items-center gap-2 mb-1 border-b border-slate-800 pb-1">
                  <MousePointer2 className="w-3 h-3 text-slate-500" />
                  <span className="text-xs font-mono text-slate-300 font-bold">SVG Coordinates</span>
              </div>
              <div className="font-mono text-xs space-y-0.5">
                <div className="flex gap-3">
                  <span className="text-slate-500">x:</span>
                  <span className="text-slate-200">{svgMouse.x.toFixed(0)}</span>
                  <span className="text-slate-500 ml-2">y:</span>
                  <span className="text-cyan-400 font-bold">{svgMouse.y.toFixed(0)}</span>
                </div>
              </div>
            </div>
         )}

         <div 
           className="w-full h-full flex items-center justify-center"
           style={{ 
             transform: `translate(${svgTransform.x}px, ${svgTransform.y}px) scale(${svgTransform.k})`,
             transformOrigin: 'center',
             transition: isSvgDragging ? 'none' : 'transform 0.1s ease-out'
           }}
         >
            <div 
               className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
               dangerouslySetInnerHTML={{ __html: processedSvg }} 
               style={{ shapeRendering: 'geometricPrecision' }}
            />
         </div>
      </div>
    );
  };

  // --- Graph Renderer ---
  const renderGraph = () => {
    const xVar = formulaData.graphConfig?.xLabel || 
                 formulaData.inputs.find(i => ['t', 'time', 'x', 'angle', 'theta', 'r', 'd'].includes(i.symbol.toLowerCase()))?.symbol || 
                 formulaData.inputs[0]?.symbol;

    if (!xVar) return null;

    const currentVal = values[xVar] || 0;
    const defaultMin = formulaData.graphConfig?.xMin ?? (currentVal < 0 ? currentVal * 2 : (currentVal === 0 ? -10 : 0));
    const defaultMax = formulaData.graphConfig?.xMax ?? (currentVal <= 0 ? 10 : currentVal * 2);
    const xMin = customDomain ? customDomain.min : defaultMin;
    const xMax = customDomain ? customDomain.max : defaultMax;

    const data = useMemo(() => 
      generateGraphPoints(formulaData.jsFormula, values, xVar, xMin, xMax, 500),
      [formulaData.jsFormula, values, xVar, xMin, xMax]
    );

    const handleGraphZoom = (factor: number) => {
      const range = xMax - xMin;
      const center = (xMin + xMax) / 2;
      const newRange = range * factor;
      if (newRange < 1e-6) return; // Prevent collapse
      setCustomDomain({ min: center - newRange / 2, max: center + newRange / 2 });
    };

    const onGraphMouseDown = (e: React.MouseEvent) => {
      if (isGhost) return;
      if (isPanModeEnabled) {
          setIsGraphDragging(true);
          graphDragStartRef.current = { x: e.clientX, min: xMin, max: xMax };
      }
    };

    const onGraphWheel = (e: React.WheelEvent) => {
      if (isGhost) return;
      e.stopPropagation(); 
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const width = rect.width;
      const ratio = offsetX / width;
      const currentRange = xMax - xMin;
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newRange = currentRange * zoomFactor;
      if (newRange < 1e-6) return;

      const cursorValue = xMin + (ratio * currentRange);
      const newMin = cursorValue - (ratio * newRange);
      const newMax = newMin + newRange;
      setCustomDomain({ min: newMin, max: newMax });
    };

    const currentXValue = values[xVar] || 0;

    return (
      <div 
        ref={containerRef}
        className={`w-full h-full relative select-none ${isPanModeEnabled ? (isGraphDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'} ${isGhost ? 'opacity-30 grayscale pointer-events-none' : ''}`}
        onMouseDown={onGraphMouseDown}
        onWheel={onGraphWheel}
      >
        <ControlsOverlay 
          onZoomIn={() => handleGraphZoom(0.8)} 
          onZoomOut={() => handleGraphZoom(1.25)} 
          onReset={() => setCustomDomain(null)}
          isDraggingMode={isPanModeEnabled}
          onTogglePan={() => setIsPanModeEnabled(!isPanModeEnabled)}
          showCoordsToggle={true}
          coordsVisible={showCoordinates}
          onToggleCoords={() => setShowCoordinates(!showCoordinates)}
        />

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
            <ReferenceLine x={0} stroke="#64748b" strokeWidth={1} />
            <XAxis 
              dataKey="x" stroke="#94a3b8" tickFormatter={(val) => val.toFixed(1)} 
              fontSize={10} tickLine={false} axisLine={false} domain={[xMin, xMax]} type="number" allowDataOverflow
            />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={40} domain={['auto', 'auto']} />
            
            {showCoordinates && (
              <Tooltip 
                cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const x = Number(label);
                    const y = Number(payload[0].value);
                    return (
                      <div className="bg-slate-950/95 border border-slate-700/80 px-3 py-2 rounded-lg shadow-2xl backdrop-blur-md ring-1 ring-white/10">
                        <div className="flex items-center gap-2 mb-1 border-b border-slate-800 pb-1">
                           <MousePointer2 className="w-3 h-3 text-slate-500" />
                           <span className="text-xs font-mono text-slate-300 font-bold">Coordinates</span>
                        </div>
                        <div className="font-mono text-xs space-y-0.5">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">x:</span>
                            <span className="text-slate-200">{x.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">y:</span>
                            <span className="text-cyan-400 font-bold">{y.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            )}
            <Area type="monotone" dataKey="y" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorY)" isAnimationActive={false} />
            {!isGhost && currentXValue >= xMin && currentXValue <= xMax && (
              <ReferenceLine x={currentXValue} stroke="#ef4444" strokeDasharray="3 3" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (formulaData.visualType === 'graph') return <div className="w-full h-full min-h-[300px]">{renderGraph()}</div>;
  if (formulaData.visualType === 'geometry' || formulaData.visualType === 'physics') return renderSvg();
  if (formulaData.visualType === 'finance') return <div className="w-full h-full min-h-[300px]">{renderGraph()}</div>;
  
  return null;
};