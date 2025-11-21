import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FormulaData, ExplanationData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const formulaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Name of the formula" },
    description: { type: Type.STRING, description: "A concise 1-sentence description" },
    displayFormula: { 
      type: Type.STRING, 
      description: "Standard LaTeX math string (e.g., 'a^2 + b^2 = c^2'). Do NOT include wrapping delimiters like $, \\(, or \\[." 
    },
    jsFormula: { type: Type.STRING, description: "Executable JS formula using Math.* functions. Variable names must match inputs." },
    inputs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          label: { type: Type.STRING },
          unit: { type: Type.STRING },
          defaultValue: { type: Type.NUMBER },
          min: { type: Type.NUMBER },
          max: { type: Type.NUMBER },
          step: { type: Type.NUMBER },
        },
        required: ["symbol", "label", "defaultValue"],
      },
    },
    visualType: { 
      type: Type.STRING, 
      enum: ["geometry", "physics", "graph", "finance", "none"],
      description: "The type of visualization best suited for this formula."
    },
    svgTemplate: { 
      type: Type.STRING, 
      description: "For 'geometry' or 'physics': A raw SVG string (<svg viewBox='0 0 400 300'...>) containing CSS animations or SMIL. Use {{expression}} for dynamic values." 
    },
    graphConfig: {
      type: Type.OBJECT,
      description: "For 'graph' type: Configuration for the X-Y plot.",
      properties: {
        xLabel: { type: Type.STRING, description: "Symbol of the independent variable (e.g., 't' or 'x')" },
        yLabel: { type: Type.STRING, description: "Label for the Y axis" },
        xMin: { type: Type.NUMBER, description: "Suggested default min X" },
        xMax: { type: Type.NUMBER, description: "Suggested default max X" }
      }
    },
    resultUnit: { type: Type.STRING }
  },
  required: ["title", "description", "displayFormula", "jsFormula", "inputs", "visualType"]
};

const explanationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    meaning: { type: Type.STRING },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    insight: { type: Type.STRING },
    relatedQueries: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["meaning", "steps", "insight", "relatedQueries"]
};

export const generateFormula = async (query: string, useThinking: boolean = false): Promise<FormulaData> => {
  // Use 'gemini-3-pro-preview' for complex thinking tasks, 'gemini-2.5-flash' for fast tasks.
  const model = useThinking ? "gemini-3-pro-preview" : "gemini-2.5-flash";
  
  const systemInstruction = `
    You are a high-end mathematical engine API. 
    Identify the math formula the user needs based on their query.
    
    Formula Rules:
    - displayFormula: Must be clean LaTeX. No Markdown. No surrounding $. No \text{} if possible.
    
    VISUALIZATION RULES (CRITICAL):
    1.  **Canvas Context**: SVG ViewBox is "0 0 400 300". Coordinates: (0,0) is Top-Left, (400,300) is Bottom-Right.
        - Ground level is typically y=250 or y=280.
        - Center of action is typically 200,150.
    
    2.  **Animation Strategy**:
        - **Cyclic/Continuous (e.g., Wave, Pendulum, Wheel)**: Use **CSS Animations** (@keyframes) inside a <style> tag in the SVG.
          - Use 'will-change: transform' for performance.
          - Use standard easing: 'animation-timing-function: ease-in-out'.
          - Example: @keyframes spin { 100% { transform: rotate(360deg); } }
        - **Trajectory/Finite (e.g., Projectile, Falling Object)**: Use **SMIL <animateMotion>** or <animate>.
          - **CRITICAL**: Calculate the path 'd' using physics. 
          - Use {{expression}} to control duration based on input.
          - Example: <animateMotion dur="{{10/v}}s" repeatCount="indefinite" path="M 50,250 Q 200,0 350,250" calcMode="spline" keySplines="0.42 0 0.58 1" />
          - Ensure animations loop gracefully (repeatCount="indefinite").

    3.  **Dynamic Values & Colors**:
        - Use {{expression}} placeholders to control attributes like 'r', 'width', 'height', 'dur', 'path'.
        - **Dynamic Colors**: You can use conditional logic in {{}} to change colors based on thresholds.
          - Example: stroke="{{ v > 100 ? '#ef4444' : '#22d3ee' }}" (Red if fast, Cyan if slow).
        - **Scale inputs** appropriately so they fit in 400x300 viewbox.

    4.  **Visual Style (Dark Mode Optimized)**:
        - **Background**: Transparent.
        - **Lines/Paths**: stroke="#22d3ee" (Cyan-400). Use fill="none" for outlines to prevent black fills.
        - **Solid Shapes**: fill="rgba(34, 211, 238, 0.1)" (Cyan-400 with opacity).
        - **Accents**: stroke="#a78bfa" (Violet-400).
        - **Axes/Guides**: stroke="#475569" (Slate-600), stroke-dasharray="4 4".
        - **Text**: fill="#f1f5f9" (Slate-100). Font: sans-serif.
        - **Consistency**: Add 'vector-effect="non-scaling-stroke"' to all stroke elements.
        - **PROHIBITED**: Do NOT use black (#000000) or white (#ffffff) or leave shapes unstyled (defaults to black). Always specify stroke/fill.
    
    Visual Type Guidelines:
    - "geometry": Dynamic shapes. Animate the dimension being calculated (e.g. radius growing).
    - "physics": Accurate simulation. Projectiles follow parabolas. 
    - "graph": Functions, trends.
    - "finance": Bar charts or growth curves.
  `;

  const config: any = {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: formulaSchema
  };

  // Apply Thinking Config if enabled
  if (useThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const response = await ai.models.generateContent({
    model,
    contents: query,
    config
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text) as FormulaData;
};

export const generateExplanation = async (
  formulaTitle: string, 
  inputs: Record<string, number>, 
  result: number | string
): Promise<ExplanationData> => {
  // Use 'gemini-3-pro-preview' for complex text reasoning tasks.
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Explain the result of the calculation.
    Formula: ${formulaTitle}
    Inputs: ${JSON.stringify(inputs)}
    Result: ${result}
    
    Provide a practical interpretation, step-by-step breakdown, a fun insight, and related queries.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: explanationSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No explanation generated");

  return JSON.parse(text) as ExplanationData;
};

export const syncFormula = async (
  sourceCode: string,
  sourceType: 'latex' | 'js',
  variables: string[]
): Promise<string> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Translate the following math formula to the Target Type.
    Source Type: ${sourceType}
    Target Type: ${sourceType === 'latex' ? 'JavaScript (Math.* compliant)' : 'LaTeX'}
    Variables Context: ${variables.join(', ')}
    
    Source Code: "${sourceCode}"
    
    Rules:
    - If converting to JS: Use Math.PI, Math.pow, etc. strictly. Return executable logic.
    - If converting to LaTeX: Return clean LaTeX without delimiters ($).
    - Return ONLY the result string. No JSON. No Markdown.
  `;
  
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  
  return response.text?.trim() || "";
};
