
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FormulaData, ExplanationData, ChatMessage } from "../types";

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

const codeSnippetSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    python: { type: Type.STRING, description: "Python function using numpy if needed" },
    excel: { type: Type.STRING, description: "Excel formula (assuming cells A1, B1 etc maps to inputs)" },
    matlab: { type: Type.STRING, description: "MATLAB/Octave function script" }
  },
  required: ["python", "excel", "matlab"]
};

export const generateFormula = async (
  query: string, 
  useThinking: boolean = false,
  image?: { data: string, mimeType: string }
): Promise<FormulaData> => {
  // Use 'gemini-3-pro-preview' for complex thinking tasks, 'gemini-2.5-flash' for fast tasks.
  // Note: Multimodal requests (image input) are supported by both, but Flash is typically faster for vision.
  const model = useThinking ? "gemini-3-pro-preview" : "gemini-2.5-flash";
  
  const systemInstruction = `
    You are a high-end mathematical engine API. 
    Identify the math formula the user needs based on their query or image.
    
    IMAGE ANALYSIS RULES:
    - If an image is provided, it may contain a handwritten equation, a textbook problem, or a physics diagram.
    - Analyze the visual content to extract the core mathematical model.
    - If it's a word problem, formulate the solution model.
    - If it's a diagram (e.g., a triangle with sides), create a geometry model for it.

    Formula Rules:
    - displayFormula: Must be clean LaTeX. No Markdown. No surrounding $. No \text{} if possible.
    
    VISUALIZATION RULES (CRITICAL):
    1.  **Canvas Context**: SVG ViewBox is STRICTLY "0 0 400 300".
        - (0,0) is Top-Left. (400,300) is Bottom-Right.
        - Ground level line should be drawn at y=250.
        - Center of action is typically 200,150.
        - Ensure all key elements are within x=20 to x=380 and y=20 to y=280.
    
    2.  **Physics Accuracy**:
        - **Trajectory**: Use SMIL <animateMotion>. The 'path' attribute MUST be calculated using real physics (e.g. parabolas for projectiles).
        - **Timing**: Use 'calcMode="spline"' and 'keySplines="0.42 0 0.58 1"' (ease-in-out) or specific bezier curves to simulate gravity/acceleration. Do NOT use linear timing for physical objects unless they have constant velocity.
        - **Duration**: Control animation speed using {{expression}}. Example: dur="{{10/v}}s". Higher velocity = lower duration.
    
    3.  **Cyclic Animation**:
        - Use CSS Animations (@keyframes) inside a <style> tag.
        - ALWAYS set 'transform-box: fill-box' and 'transform-origin: center' for rotating elements (wheels, gears) to ensure they spin around their own center, not the canvas origin.
        - Use 'will-change: transform' for performance.
    
    4.  **Visual Consistency**:
        - **Stroke Scaling**: ALWAYS add 'vector-effect="non-scaling-stroke"' to all paths, rects, circles, and lines. This prevents strokes from becoming too thick or thin when objects are scaled.
        - **Colors (Dark Mode)**:
          - Stroke: #22d3ee (Cyan).
          - Fill: rgba(34, 211, 238, 0.1).
          - Axes/Guides: #475569 (Slate). Stroke-dasharray="4 4".
          - Text: #f1f5f9 (White/Slate).
          - **NEVER** use black fill/stroke. Use 'fill="none"' for outlines.
    
    5.  **Dynamic Values**:
        - Use {{expression}} for attributes. Example: r="{{radius * 5}}".
        - Scale inputs to fit the 400x300 canvas. If input is 1000m, maybe map it to 300px.
        - Use conditional logic for dynamic colors: stroke="{{ v > 50 ? '#ef4444' : '#22d3ee' }}".

    Visual Type Guidelines:
    - "geometry": Dynamic shapes (Circle, Triangle, Cone). Animate the dimension being calculated (e.g. radius growing).
    - "physics": Accurate simulation. Projectiles, Pendulums, Springs.
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

  // Construct request contents
  let contentParts: any[] = [];
  
  if (image) {
    contentParts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data
      }
    });
  }
  
  // Add text prompt (defaulting if empty when image is present)
  const textPrompt = query.trim() || (image ? "Analyze this image and create a mathematical model for it." : "");
  contentParts.push({ text: textPrompt });

  const response = await ai.models.generateContent({
    model,
    contents: { parts: contentParts },
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

export const generateCodeSnippets = async (
  formulaTitle: string,
  jsFormula: string,
  inputs: string[]
): Promise<{ python: string; excel: string; matlab: string }> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Convert this JavaScript formula logic into Python, Excel, and MATLAB code snippets.
    Title: ${formulaTitle}
    JS Logic: ${jsFormula}
    Variables: ${inputs.join(', ')}
    
    Requirements:
    - Python: Create a clean function with type hints.
    - Excel: Create a generic formula assuming cells A1, A2, etc. (Map variables to cells in comments).
    - MATLAB: Create a function script.
  `;
  
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: codeSnippetSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("Code generation failed");
  
  return JSON.parse(text);
};

export const sendChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  context: {
    formulaTitle: string;
    displayFormula: string;
    inputs: Record<string, number>;
    result: string | number;
  }
): Promise<string> => {
  const model = "gemini-3-pro-preview";
  
  const contextString = `
    [CURRENT MATH CONTEXT]
    Formula: ${context.formulaTitle}
    Expression: ${context.displayFormula}
    Current Inputs: ${JSON.stringify(context.inputs)}
    Current Result: ${context.result}
    [END CONTEXT]
  `;

  const systemInstruction = `
    You are an intelligent math tutor embedded in a calculator app.
    The user is currently viewing a specific math model (context provided above).
    Answer their follow-up questions specifically about this math context.
    
    Guidelines:
    - Be concise, conversational, and helpful.
    - If they ask "Why?", explain the relationship between variables in the formula.
    - If they ask "What if?", predict the outcome based on the formula logic.
    - Do NOT generate Python code or JSON unless asked. Just speak normally.
    - You represent the "AI Math Studio" intelligence.
  `;

  // Construct conversation history for the model
  const contents = [
    { role: 'user', parts: [{ text: systemInstruction + "\n" + contextString }] }, // Prime with context
    { role: 'model', parts: [{ text: "Understood. I am ready to help with this specific formula." }] }, // Ack
    ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: newMessage }] }
  ];

  const response = await ai.models.generateContent({
    model,
    contents
  });

  return response.text || "I couldn't generate a response.";
};
