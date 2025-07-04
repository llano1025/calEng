import React from 'react'; // Needed for JSX in Icon definitions
import { Icons } from '../components/Icons'; // Import Icons

// --- Define Types for Structure ---

interface FormulaInputOption {
    value: string;
    label: string;
}

interface FormulaInput {
    id: string;
    name: string;
    unit: string;
    type: 'number' | 'select';
    options?: FormulaInputOption[]; // Only for type 'select'
}

interface FormulaData {
    name: string;
    description: string;
    inputs: FormulaInput[];
    calculate?: (inputs: { [key: string]: string }) => { value: number; unit: string }; // Optional for disciplines like 'broadcast'
}

// Using commas instead of semicolons as separators here
interface SystemData {
    name: string, // Changed to comma
    icon: React.ReactElement, // Changed to comma
    formulas: {
        [formulaKey: string]: FormulaData; // Semicolon inside index signature is standard
    } // No comma needed after the last property
}

export interface EngineeringSystemsData {
    [systemKey: string]: SystemData;
}


// --- Engineering Systems Data Definition ---
// (Data remains the same as the previous version with type assertions)
export const engineeringSystemsData: EngineeringSystemsData = {
    'electrical': {
      name: 'Electrical',
      icon: <Icons.Bolt /> as React.ReactElement,
      formulas: {
        'ohms_law': {
          name: "Ohm's Law", description: 'Relates Voltage, Current, and Resistance',
          inputs: [ { id: 'calculation', name: 'Calculate Which Variable?', unit: '', type: 'select', options: [ { value: 'voltage', label: 'Voltage (V)' }, { value: 'current', label: 'Current (I)' }, { value: 'resistance', label: 'Resistance (R)' } ]}, { id: 'voltage', name: 'Voltage (V)', unit: 'V', type: 'number' }, { id: 'current', name: 'Current (I)', unit: 'A', type: 'number' }, { id: 'resistance', name: 'Resistance (R)', unit: 'Ω', type: 'number' }, ],
          calculate: (inputs) => { const V = parseFloat(inputs.voltage); const I = parseFloat(inputs.current); const R = parseFloat(inputs.resistance); const calc = inputs.calculation; if (calc === 'voltage') { if (isNaN(I) || isNaN(R)) return { value: NaN, unit: 'V' }; return { value: I * R, unit: 'V' }; } else if (calc === 'current') { if (isNaN(V) || isNaN(R) || R === 0) return { value: NaN, unit: 'A' }; return { value: V / R, unit: 'A' }; } else if (calc === 'resistance') { if (isNaN(V) || isNaN(I) || I === 0) return { value: NaN, unit: 'Ω' }; return { value: V / I, unit: 'Ω' }; } return { value: NaN, unit: '' }; }
        },
        'power': {
          name: 'Electrical Power (DC)', description: 'Calculate DC electrical power',
          inputs: [ { id: 'voltage', name: 'Voltage (V)', unit: 'V', type: 'number' }, { id: 'current', name: 'Current (I)', unit: 'A', type: 'number' } ],
          calculate: (inputs) => { const V = parseFloat(inputs.voltage); const I = parseFloat(inputs.current); if (isNaN(V) || isNaN(I)) return { value: NaN, unit: 'W' }; return { value: V * I, unit: 'W' }; }
        }
      }
    },
    'mvac': {
      name: 'Mechanical Ventilation & Air Conditioning',
      icon: <Icons.TemperatureHigh /> as React.ReactElement,
      // No formulas needed here; the MVACalculator component handles its own logic
      formulas: {}
    },
    'broadcast': {
      name: 'Extra Low Voltage',
      icon: <Icons.BroadcastTower /> as React.ReactElement,
      // No formulas needed here; the BroadcastCalculator component handles its own logic.
      formulas: {}
    }
};