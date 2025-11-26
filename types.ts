
export interface InputParam {
  symbol: string;
  label: string;
  unit?: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface FormulaData {
  title: string;
  description: string;
  displayFormula: string; // LaTeX
  jsFormula: string; // Executable JS string
  inputs: InputParam[];
  visualType: 'geometry' | 'physics' | 'graph' | 'finance' | 'none';
  // svgTemplate is used for geometry/physics dynamic SVG generation
  svgTemplate?: string; 
  // graphConfig is used if visualType is 'graph' to guide Recharts
  graphConfig?: {
    xLabel: string;
    yLabel: string;
    xMin?: number;
    xMax?: number;
  };
  resultUnit?: string;
}

export interface CalculationResult {
  value: number | string;
  numericValue: number; // For graphing
}

export interface ExplanationData {
  meaning: string;
  steps: string[];
  insight: string;
  relatedQueries: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface HistoryItem {
  id: number;
  timestamp: number;
  title: string;
  formulaData: FormulaData;
  inputs: Record<string, number>;
  result: CalculationResult;
  explanation: ExplanationData | null;
  chatMessages: ChatMessage[];
}
