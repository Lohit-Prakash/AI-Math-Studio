import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, Send, Sparkles, History, Trash2, ChevronRight, 
  ArrowRight, Info, Box, RotateCcw, Loader2, AlertCircle,
  Atom, Shapes, TrendingUp, Edit, Check, X, Code, Variable, Brain, 
  RefreshCw, Shuffle, AlertTriangle, FlaskConical, Sigma, Wrench
} from 'lucide-react';
import { generateFormula, generateExplanation, syncFormula } from './services/gemini';
import { Visualizer } from './components/Visualizer';
import { InputSection } from './components/InputSection';
import { safeEvaluate } from './utils/math';
import { FormulaData, CalculationResult, ExplanationData, HistoryItem } from './types';

// Latex rendering URL - Simplified for robustness
const getLatexUrl = (formula: string) => {
  // Aggressively clean wrapping delimiters that break CodeCogs
  const cleanFormula = formula
    .replace(/\\\[/g, '') // Remove \[
    .replace(/\\\]/g, '') // Remove \]
    .replace(/\\\(/g, '') // Remove \(
    .replace(/\\\)/g, '') // Remove \)
    .replace(/^[\$]+|[\$]+$/g, '') // Remove leading/trailing $
    .trim();

  // Use svg.image endpoint which is more modern/robust
  // \color{white} for dark mode visibility
  // \huge for size
  return `https://latex.codecogs.com/svg.image?\\color{white}\\huge&space;${encodeURIComponent(cleanFormula)}`;
};

// --- Sub-components ---

const LoadingSkeleton = () => (
  <div className="space-y-6 w-full animate-pulse">
    <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
      <div className="space-y-3 w-full max-w-md">
        <div className="h-8 bg-slate-800/50 rounded-lg w-3/4"></div>
        <div className="h-4 bg-slate-800/30 rounded-lg w-1/2"></div>
      </div>
      <div className="h-16 w-full md:w-[200px] bg-slate-800/30 rounded-2xl"></div>
    </div>
    
    <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl h-[400px] w-full relative overflow-hidden group">
       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
       <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <Shapes className="w-24 h-24 text-slate-700" />
       </div>
    </div>

    <div className="grid gap-6 sm:grid-cols-2">
      <div className="h-16 bg-slate-800/30 rounded-xl"></div>
      <div className="h-16 bg-slate-800/30 rounded-xl"></div>
      <div className="h-16 bg-slate-800/30 rounded-xl"></div>
      <div className="h-16 bg-slate-800/30 rounded-xl"></div>
    </div>
  </div>
);

const SuggestionCategory = ({ icon: Icon, title, items, onSelect }: any) => (
  <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 hover:bg-slate-800/60 hover:border-cyan-500/30 transition-all duration-300 group cursor-pointer" onClick={() => onSelect(items[0])}>
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
      </div>
      <span className="text-sm font-bold text-slate-300 uppercase tracking-wider group-hover:text-white">{title}</span>
    </div>
    <div className="flex flex-wrap gap-2">
      {items.map((item: string) => (
        <button
          key={item}
          onClick={(e) => { e.stopPropagation(); onSelect(item); }}
          className="text-xs bg-slate-950 text-slate-400 hover:text-cyan-300 px-3 py-1.5 rounded-md border border-slate-800 hover:border-cyan-500/50 transition-all"
        >
          {item}
        </button>
      ))}
    </div>
  </div>
);

const surpriseQueries = [
  "Calculate the Schwarzschild radius of Earth",
  "Rocket Equation delta-v calculation",
  "Black-Scholes Option Pricing model",
  "Terminal velocity of a skydiver",
  "Golden Ratio approximation",
  "Drake Equation for alien civilizations",
  "Heat equation for a 1D rod",
  "Navier-Stokes equation for simple flow"
];

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [useThinking, setUseThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  
  const [formula, setFormula] = useState<FormulaData | null>(null);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CalculationResult | null>(null);
  
  // Explanation state
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Ghost Mode (Previous state)
  const prevInputs = useRef<Record<string, number>>({});
  const prevResult = useRef<CalculationResult | null>(null);
  const [showGhost, setShowGhost] = useState(false);

  // Editing Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<{
    title: string;
    latex: string;
    js: string;
  }>({ title: '', latex: '', js: '' });
  const [previewResult, setPreviewResult] = useState<string | number>('...');
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Syncing State
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeEditField, setActiveEditField] = useState<'latex' | 'js' | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate result whenever inputs or formula change
  useEffect(() => {
    // Trigger calculation if formula exists (removed check for inputs length to allow constant formulas)
    if (formula) {
      const rawRes = safeEvaluate(formula.jsFormula, inputs);
      
      // Store current as previous before updating, if it was valid
      if (result && result.value !== "Error") {
        prevInputs.current = { ...inputs };
        prevResult.current = { ...result };
        setShowGhost(true);
      }

      setResult({
        value: typeof rawRes === 'number' ? rawRes : "Error",
        numericValue: typeof rawRes === 'number' ? rawRes : 0
      });

      // Reset explanation when inputs change significantly
      setExplanation(null);
    }
  }, [inputs, formula]);

  // Live Preview Calculation for Editor
  useEffect(() => {
    if (isEditing && editState.js) {
      const rawRes = safeEvaluate(editState.js, inputs);
      if (rawRes === "Error") {
         setPreviewError("JS Syntax Error");
         setPreviewResult("Error");
      } else {
         setPreviewError(null);
         setPreviewResult(typeof rawRes === 'number' ? rawRes.toFixed(4) : rawRes);
      }
    }
  }, [editState.js, inputs, isEditing]);

  const handleGenerate = async (forcedQuery?: string) => {
    const q = forcedQuery || query;
    if (!q.trim()) return;
    
    setIsLoading(true);
    setLoadingStage(useThinking ? 'Deep thinking initiated...' : 'Analyzing request...');
    setError(null);
    setErrorDetail(null);
    setFormula(null);
    setExplanation(null);
    setShowGhost(false);
    setIsEditing(false);

    // Sequential loading messages
    const timers: NodeJS.Timeout[] = [];
    const stages = useThinking ? [
      { t: 1000, msg: 'Analyzing complex mathematical structures...' },
      { t: 4000, msg: 'Reasoning about visualization strategy...' },
      { t: 8000, msg: 'Generating highly accurate model...' }
    ] : [
      { t: 1000, msg: 'Identifying mathematical concepts...' },
      { t: 2500, msg: 'Generating visualization model...' },
      { t: 4000, msg: 'Calibrating parameters...' }
    ];

    stages.forEach(({ t, msg }) => {
      timers.push(setTimeout(() => setLoadingStage(msg), t));
    });

    try {
      const data = await generateFormula(q, useThinking);
      setFormula(data);
      
      // Initialize inputs
      const initialInputs: Record<string, number> = {};
      data.inputs.forEach(inp => {
        initialInputs[inp.symbol] = inp.defaultValue;
      });
      setInputs(initialInputs);
      setQuery(q); // Update input if triggered via suggestion
    } catch (err: any) {
      console.error(err);
      const errStr = err.toString().toLowerCase();
      let msg = "Generation Failed";
      let detail = "An unexpected error occurred. Please try again or rephrase your query.";
      
      if (errStr.includes("403") || errStr.includes("key")) {
        msg = "Authentication Failed";
        detail = "Your API Key is invalid or missing. Please check your environment configuration.";
      } else if (errStr.includes("candidate") || errStr.includes("safety") || errStr.includes("blocked")) {
        msg = "Safety Filter Triggered";
        detail = "The request was flagged by AI safety settings. Try a more academic phrasing.";
      } else if (errStr.includes("json") || errStr.includes("parse") || errStr.includes("response")) {
        msg = "Data Processing Error";
        detail = "The AI returned an incomplete or invalid response structure. Please retry.";
      } else if (errStr.includes("429") || errStr.includes("quota")) {
        msg = "Rate Limit Exceeded";
        detail = "You are sending requests too quickly. Please wait a moment.";
      } else if (errStr.includes("fetch") || errStr.includes("network")) {
        msg = "Network Connection Error";
        detail = "Please check your internet connection and try again.";
      }
      
      setError(msg);
      setErrorDetail(detail);
    } finally {
      timers.forEach(clearTimeout);
      setIsLoading(false);
    }
  };

  const handleSurpriseMe = () => {
    const randomQ = surpriseQueries[Math.floor(Math.random() * surpriseQueries.length)];
    setQuery(randomQ);
    handleGenerate(randomQ);
  };

  const handleExplain = async () => {
    if (!formula || !result) return;
    setIsExplaining(true);
    try {
      const data = await generateExplanation(formula.title, inputs, result.value);
      setExplanation(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExplaining(false);
    }
  };

  const saveToHistory = () => {
    if (formula && result) {
      setHistory(prev => [{
        id: Date.now(),
        timestamp: Date.now(),
        title: formula.title,
        inputs: { ...inputs },
        result: { ...result },
        displayFormula: formula.displayFormula
      }, ...prev]);
    }
  };

  // Editor Handlers
  const startEditing = () => {
    if (!formula) return;
    setEditState({
      title: formula.title,
      latex: formula.displayFormula,
      js: formula.jsFormula
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setActiveEditField(null);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
  };

  const saveEditing = () => {
    if (!formula) return;
    setFormula({
      ...formula,
      title: editState.title,
      displayFormula: editState.latex,
      jsFormula: editState.js
    });
    setIsEditing(false);
    setActiveEditField(null);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
  };

  // Auto-Sync Logic
  const handleEditorChange = (field: 'latex' | 'js', value: string) => {
    setEditState(prev => ({ ...prev, [field]: value }));
    setActiveEditField(field);
    
    // Cancel pending sync
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    // Debounce sync (2s)
    syncTimeoutRef.current = setTimeout(async () => {
      if (!value.trim()) return;
      
      setIsSyncing(true);
      try {
        const variables = formula?.inputs.map(i => i.symbol) || [];
        const translated = await syncFormula(value, field, variables);
        
        if (translated) {
           // Only update if the user hasn't switched context in the meantime
           setEditState(prev => {
             // Safety check: If user is still editing the source field, update the target
             return {
               ...prev,
               [field === 'latex' ? 'js' : 'latex']: translated
             };
           });
        }
      } catch (e) {
        console.error("Auto-sync failed", e);
      } finally {
        setIsSyncing(false);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative z-10">
        
        {/* Header */}
        <header className="flex-none p-6 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Calculator className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                AI Math Studio
              </h1>
              <p className="text-xs text-slate-500">Powered by Gemini 2.5 & 3.0</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            <History className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Search Input */}
            <div className="relative group z-20">
              {useThinking && (
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl opacity-40 blur animate-pulse"></div>
              )}
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-2xl ${useThinking ? 'opacity-0' : 'opacity-30'} group-hover:opacity-60 blur transition duration-500`}></div>
              
              <div className="relative flex items-center bg-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-800">
                {/* Toggle Thinking Mode */}
                <button
                  onClick={() => setUseThinking(!useThinking)}
                  className={`p-2.5 rounded-xl transition-all mr-2 flex items-center gap-2 ${
                    useThinking 
                      ? 'bg-pink-600/20 text-pink-400 ring-1 ring-pink-500/50' 
                      : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                  title={useThinking ? "Deep Thinking Mode Active" : "Enable Deep Thinking Mode"}
                >
                  <Brain className={`w-5 h-5 ${useThinking ? 'animate-pulse' : ''}`} />
                </button>

                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder={useThinking ? "Ask a complex problem..." : "What do you want to calculate?"}
                  className="flex-1 bg-transparent border-none outline-none text-lg text-white px-2 py-2 placeholder:text-slate-500 font-light min-w-0"
                />

                <div className="flex items-center gap-2">
                  {/* Surprise Me Button */}
                  <button
                    onClick={handleSurpriseMe}
                    disabled={isLoading}
                    className="p-3 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-xl transition-colors hidden sm:flex"
                    title="Surprise Me"
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => handleGenerate()}
                    disabled={isLoading || !query}
                    className={`${
                      useThinking 
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white' 
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                    } px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center shadow-lg`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="hidden sm:inline text-sm">Working...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span className="hidden sm:inline">Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-fade-in">
                 <div className="relative">
                    <div className={`absolute inset-0 blur-xl rounded-full ${useThinking ? 'bg-pink-500/20' : 'bg-cyan-500/20'}`}></div>
                    <div className={`relative flex items-center gap-3 bg-slate-900 border px-6 py-3 rounded-2xl shadow-2xl ${
                        useThinking ? 'border-pink-500/30 shadow-pink-500/10' : 'border-cyan-500/30 shadow-cyan-500/10'
                    }`}>
                        {useThinking ? (
                        <Brain className="w-5 h-5 text-pink-400 animate-pulse" />
                        ) : (
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                        )}
                        <span className={`text-sm font-mono font-medium ${useThinking ? 'text-pink-200' : 'text-cyan-200'}`}>
                        {loadingStage}
                        </span>
                    </div>
                 </div>
                 {/* Progress bar simulation */}
                 <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full animate-[loading_2s_ease-in-out_infinite] ${useThinking ? 'bg-pink-500' : 'bg-cyan-500'}`} style={{ width: '50%' }}></div>
                 </div>
                 <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                 `}</style>
              </div>
            )}

            {/* Enhanced Error State */}
            {error && (
              <div className="max-w-2xl mx-auto p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-start gap-4 animate-slide-up shadow-lg shadow-red-900/5">
                <div className="p-3 bg-red-500/10 rounded-xl flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-red-200 font-semibold mb-1">{error}</h3>
                  <p className="text-red-300/80 text-sm leading-relaxed mb-4">{errorDetail}</p>
                  <button 
                    onClick={() => handleGenerate()} 
                    className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-200 px-4 py-2 rounded-lg transition-colors font-medium border border-red-500/10 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3 h-3" /> Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Empty State / Suggestions */}
            {!formula && !isLoading && !error && (
              <div className="flex flex-col items-center justify-center space-y-8 py-8 animate-slide-up">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-slate-700 shadow-xl">
                    <Box className="w-8 h-8 text-slate-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Ready to Calculate</h2>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Describe any mathematical, physical, or financial concept, and AI will generate a fully interactive model.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full px-4">
                  <SuggestionCategory 
                    icon={Atom} 
                    title="Physics" 
                    items={['Projectile Motion', 'Kinetic Energy', 'Snell\'s Law']} 
                    onSelect={(q: string) => { setQuery(q); handleGenerate(q); }}
                  />
                  <SuggestionCategory 
                    icon={Shapes} 
                    title="Geometry" 
                    items={['Volume of a Cone', 'Area of Ellipse', 'Pythagorean Theorem']} 
                    onSelect={(q: string) => { setQuery(q); handleGenerate(q); }}
                  />
                  <SuggestionCategory 
                    icon={TrendingUp} 
                    title="Finance" 
                    items={['Compound Interest', 'Mortgage Payment', 'ROI Calculator']} 
                    onSelect={(q: string) => { setQuery(q); handleGenerate(q); }}
                  />
                  <SuggestionCategory 
                    icon={Wrench} 
                    title="Engineering" 
                    items={['Beam Deflection', 'Ohm\'s Law', 'Stress & Strain']} 
                    onSelect={(q: string) => { setQuery(q); handleGenerate(q); }}
                  />
                  <SuggestionCategory 
                    icon={FlaskConical} 
                    title="Chemistry" 
                    items={['Ideal Gas Law', 'pH Calculation', 'Molarity']} 
                    onSelect={(q: string) => { setQuery(q); handleGenerate(q); }}
                  />
                  <SuggestionCategory 
                    icon={Sigma} 
                    title="Algebra" 
                    items={['Quadratic Formula', 'Logarithms', 'System of Equations']} 
                    onSelect={(q: string) => { setQuery(q); handleGenerate(q); }}
                  />
                </div>
              </div>
            )}

            {/* Loading Skeleton (Content placeholder) */}
            {isLoading && <LoadingSkeleton />}

            {/* Main Formula UI */}
            {formula && !isLoading && (
              <div className="space-y-8 animate-slide-up">
                
                {/* Formula Title & Display / Editor */}
                {!isEditing ? (
                  <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center relative group/header">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-white">{formula.title}</h2>
                        <button 
                          onClick={startEditing}
                          className="opacity-0 group-hover/header:opacity-100 text-slate-500 hover:text-cyan-400 transition-all p-1 rounded bg-slate-900/50"
                          title="Edit Formula"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{formula.description}</p>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 min-w-[260px] flex justify-center items-center shadow-inner relative">
                       <img 
                         src={getLatexUrl(formula.displayFormula)} 
                         alt={formula.title} 
                         className="h-16 md:h-20 object-contain transition-transform hover:scale-105"
                         onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('bg-red-900/20', 'border-red-800');
                            const errorText = document.createElement('div');
                            errorText.className = 'text-red-400 text-xs font-mono p-2 text-center';
                            errorText.innerText = 'Equation render failed';
                            e.currentTarget.parentElement?.appendChild(errorText);
                         }}
                       />
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl animate-fade-in ring-1 ring-cyan-500/20">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Code className="w-5 h-5" />
                        <span className="font-mono font-bold text-sm uppercase tracking-wider">Formula Editor Mode</span>
                      </div>
                      
                      {/* Syncing Status */}
                      {isSyncing && (
                        <div className="flex items-center gap-2 text-indigo-400 animate-pulse px-3 py-1 bg-indigo-900/20 rounded-full border border-indigo-500/20">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span className="text-xs font-medium">Syncing via Gemini...</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button 
                          onClick={cancelEditing}
                          className="px-3 py-1.5 text-slate-400 hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                        <button 
                          onClick={saveEditing}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-lg shadow-cyan-900/20"
                        >
                          <Check className="w-3 h-3" /> Save Changes
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Formula Title</label>
                        <input 
                          type="text"
                          value={editState.title}
                          onChange={(e) => setEditState({...editState, title: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none font-medium"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                         <div className={`transition-opacity ${activeEditField === 'js' && isSyncing ? 'opacity-50' : 'opacity-100'}`}>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">LaTeX Display (Visual)</label>
                            <textarea 
                              value={editState.latex}
                              onChange={(e) => handleEditorChange('latex', e.target.value)}
                              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 font-mono text-sm focus:border-cyan-500 focus:outline-none resize-none"
                              spellCheck={false}
                              placeholder="Enter standard LaTeX..."
                            />
                            <p className="text-[10px] text-slate-600 mt-1">Changes here will auto-sync to JS logic.</p>
                         </div>
                         <div className={`transition-opacity ${activeEditField === 'latex' && isSyncing ? 'opacity-50' : 'opacity-100'}`}>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">JavaScript Logic (Calculation)</label>
                            <textarea 
                              value={editState.js}
                              onChange={(e) => handleEditorChange('js', e.target.value)}
                              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-cyan-300 font-mono text-sm focus:border-cyan-500 focus:outline-none resize-none"
                              spellCheck={false}
                              placeholder="Math.pow(x, 2) + ..."
                            />
                            <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <Variable className="w-3 h-3" />
                                  <span>Vars: </span>
                                  <span className="text-slate-300 font-mono">
                                    {formula.inputs.map(i => i.symbol).join(', ')}
                                  </span>
                                </div>
                                {/* Live Preview Result */}
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] text-slate-500 uppercase tracking-wider">Preview:</span>
                                   <span className={`text-xs font-mono font-bold ${previewError ? 'text-red-400' : 'text-cyan-400'}`}>
                                     {previewResult}
                                   </span>
                                </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visualization Area */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-3xl overflow-hidden relative group">
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 bg-slate-950/50 px-2 py-1 rounded border border-slate-800 backdrop-blur">
                      {formula.visualType.toUpperCase()} PREVIEW
                    </span>
                  </div>
                  
                  {/* Increased height and padding for better animation visibility */}
                  <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
                    {/* Ghost Layer */}
                    {showGhost && prevResult.current && (
                      <div className="absolute inset-0 z-0 pointer-events-none">
                        <Visualizer formulaData={formula} values={prevInputs.current} result={prevResult.current.value} isGhost={true} />
                      </div>
                    )}
                    
                    {/* Active Layer */}
                    <div className="w-full h-full z-10 relative transition-all duration-500">
                       <Visualizer formulaData={formula} values={inputs} result={result?.value || 0} />
                    </div>
                  </div>

                  {/* Result Bar */}
                  <div className="bg-slate-950 border-t border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Result</div>
                        <div className="text-3xl md:text-4xl font-mono font-bold text-cyan-400 break-all">
                          {typeof result?.value === 'number' 
                            ? result.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) 
                            : (result?.value || "...")}
                          <span className="text-lg text-slate-500 ml-2">{formula.resultUnit}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                       <button 
                        onClick={handleExplain}
                        disabled={isExplaining}
                        className="flex-1 md:flex-none bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                       >
                         {isExplaining ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <Sparkles className="w-4 h-4" />}
                         <span>Explain</span>
                       </button>
                       <button 
                        onClick={saveToHistory}
                        className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                       >
                         <History className="w-4 h-4" />
                         <span>Save</span>
                       </button>
                    </div>
                  </div>
                </div>

                {/* Inputs Grid */}
                <InputSection 
                  inputs={formula.inputs} 
                  values={inputs} 
                  onChange={(sym, val) => setInputs(prev => ({ ...prev, [sym]: val }))} 
                />

                {/* AI Insights Section */}
                {explanation && (
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-6 md:p-8 animate-fade-in">
                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-white">AI Insights</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-slate-300 leading-relaxed">{explanation.meaning}</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calculation Steps</h4>
                           <ul className="space-y-2">
                             {explanation.steps.map((step, i) => (
                               <li key={i} className="flex gap-3 text-sm text-slate-400 font-mono">
                                 <span className="text-cyan-500 select-none">{i+1}.</span>
                                 {step}
                               </li>
                             ))}
                           </ul>
                        </div>
                        <div className="bg-indigo-950/20 rounded-xl p-4 border border-indigo-900/30">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Did you know?</h4>
                          <p className="text-sm text-indigo-200 italic leading-relaxed">{explanation.insight}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Related Queries</h4>
                        <div className="flex flex-wrap gap-2">
                          {explanation.relatedQueries.map(q => (
                            <button 
                              key={q} 
                              onClick={() => { setQuery(q); setTimeout(() => handleGenerate(q), 0); }}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                            >
                              {q} <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Sidebar (Responsive) */}
      <aside className={`
        fixed inset-y-0 right-0 z-20 w-80 bg-slate-950 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:translate-x-0 md:w-80 md:border-l md:shadow-none
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4" /> History
            </h3>
            <div className="flex gap-2">
               {history.length > 0 && (
                 <button onClick={() => setHistory([])} className="text-red-400 hover:bg-red-950/30 p-2 rounded transition-colors" title="Clear">
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
               <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500">
                 <ChevronRight className="w-5 h-5" />
               </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Calculations will appear here.</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    // Load back into main view
                    if (formula?.title !== item.title) {
                      // If different formula, simplistic reload (in real app would verify formula structure matches)
                      setQuery(item.title); 
                      // We set inputs but don't regenerate formula from API to save calls if we had full persistence
                      // For now, we just update inputs, user might need to re-generate if formula structure changed
                    }
                    setInputs(item.inputs);
                    setIsSidebarOpen(false);
                  }}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-slate-200 line-clamp-1">{item.title}</h4>
                    <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div className="text-xs text-slate-500 space-y-0.5">
                       {Object.entries(item.inputs).slice(0, 2).map(([k, v]) => (
                         <div key={k}>{k} = {v}</div>
                       ))}
                       {Object.keys(item.inputs).length > 2 && <div>...</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-cyan-400">
                        {typeof item.result.value === 'number' ? Number(item.result.value).toFixed(2) : item.result.value}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;