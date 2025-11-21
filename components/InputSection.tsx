import React from 'react';
import { InputParam } from '../types';

interface InputSectionProps {
  inputs: InputParam[];
  values: Record<string, number>;
  onChange: (symbol: string, value: number) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ inputs, values, onChange }) => {
  return (
    <div className="grid gap-6 sm:grid-cols-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      {inputs.map((input) => (
        <div key={input.symbol} className="group relative">
          <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
            {input.label} <span className="text-slate-600 font-mono">({input.symbol})</span>
          </label>
          
          <div className="relative">
            <input
              type="number"
              value={values[input.symbol] ?? ''}
              onChange={(e) => onChange(input.symbol, parseFloat(e.target.value))}
              className="block w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-slate-100 shadow-sm 
                         focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all font-mono text-lg
                         group-hover:border-slate-600"
              placeholder={String(input.defaultValue)}
              step={input.step || "any"}
            />
            {input.unit && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <span className="text-slate-500 text-sm font-medium">{input.unit}</span>
              </div>
            )}
          </div>
          
          {/* Slider for quick adjustment if range is reasonable */}
          {input.min !== undefined && input.max !== undefined && (
             <input 
               type="range"
               min={input.min}
               max={input.max}
               step={input.step || (input.max - input.min) / 100}
               value={values[input.symbol] ?? input.defaultValue}
               onChange={(e) => onChange(input.symbol, parseFloat(e.target.value))}
               className="absolute -bottom-2 left-2 right-2 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
             />
          )}
        </div>
      ))}
    </div>
  );
};
