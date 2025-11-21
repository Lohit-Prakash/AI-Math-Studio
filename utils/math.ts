export const safeEvaluate = (formula: string, values: Record<string, number>): number | string => {
  try {
    const keys = Object.keys(values);
    const args = keys.map(k => values[k]);
    
    // Allow standard Math functions to be called directly
    const mathFormula = `
      const { sin, cos, tan, asin, acos, atan, PI, E, pow, sqrt, abs, log, exp, floor, ceil, round, min, max } = Math;
      return ${formula};
    `;
    
    // eslint-disable-next-line no-new-func
    const func = new Function(...keys, mathFormula);
    const result = func(...args);
    
    if (typeof result === 'object' && result !== null) return "Error";
    if (typeof result === 'number' && (!isFinite(result) || isNaN(result))) return "Error";
    
    return result;
  } catch (e) {
    return "Error";
  }
};

export const generateGraphPoints = (
  formula: string, 
  values: Record<string, number>, 
  variableKey: string, 
  minX: number, 
  maxX: number, 
  steps: number = 500
) => {
  const points = [];
  const range = maxX - minX;
  
  for (let i = 0; i <= steps; i++) {
    const x = minX + (i / steps) * range;
    // Create a temporary values object where the independent variable is replaced by the loop x
    const tempValues = { ...values, [variableKey]: x };
    const y = safeEvaluate(formula, tempValues);
    
    if (typeof y === 'number' && isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
};