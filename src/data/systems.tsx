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
    'structural': {
      name: 'Structural',
      icon: <Icons.DraftingCompass /> as React.ReactElement,
      formulas: {
        'beam_deflection': {
          name: 'Beam Deflection', description: 'Max deflection of a simply supported beam (UDL)',
          inputs: [ { id: 'load', name: 'Load (w)', unit: 'N/m', type: 'number' }, { id: 'length', name: 'Beam Length (L)', unit: 'm', type: 'number' }, { id: 'modulus', name: 'Elastic Modulus (E)', unit: 'Pa', type: 'number' }, { id: 'moment', name: 'Moment of Inertia (I)', unit: 'm⁴', type: 'number' } ],
          calculate: (inputs) => { const w = parseFloat(inputs.load); const L = parseFloat(inputs.length); const E = parseFloat(inputs.modulus); const I = parseFloat(inputs.moment); if (isNaN(w) || isNaN(L) || isNaN(E) || isNaN(I) || E === 0 || I === 0) return { value: NaN, unit: 'm' }; return { value: (5 * w * Math.pow(L, 4)) / (384 * E * I), unit: 'm' }; }
        },
        'column_buckling': {
          name: 'Column Buckling (Euler)', description: 'Critical axial load for column buckling',
          inputs: [ { id: 'modulus', name: 'Elastic Modulus (E)', unit: 'Pa', type: 'number' }, { id: 'moment', name: 'Min. Moment of Inertia (I)', unit: 'm⁴', type: 'number' }, { id: 'length', name: 'Column Length (L)', unit: 'm', type: 'number' }, { id: 'k', name: 'Effective Length Factor (K)', unit: '', type: 'number' } ],
          calculate: (inputs) => { const E = parseFloat(inputs.modulus); const I = parseFloat(inputs.moment); const L = parseFloat(inputs.length); const K = parseFloat(inputs.k); if (isNaN(E) || isNaN(I) || isNaN(L) || isNaN(K)) return { value: NaN, unit: 'N' }; const KL = K * L; if (KL === 0) return { value: NaN, unit: 'N' }; return { value: (Math.pow(Math.PI, 2) * E * I) / Math.pow(KL, 2), unit: 'N' }; }
        }
      }
    },
    'fluid': {
      name: 'Fluid Mechanics',
      icon: <Icons.Water /> as React.ReactElement,
      formulas: {
        'bernoulli': {
          name: 'Bernoulli Equation (Pressure)', description: 'Calculate final pressure P₂',
          inputs: [ { id: 'p1', name: 'Initial Pressure (P₁)', unit: 'Pa', type: 'number' }, { id: 'v1', name: 'Initial Velocity (v₁)', unit: 'm/s', type: 'number' }, { id: 'h1', name: 'Initial Height (h₁)', unit: 'm', type: 'number' }, { id: 'v2', name: 'Final Velocity (v₂)', unit: 'm/s', type: 'number' }, { id: 'h2', name: 'Final Height (h₂)', unit: 'm', type: 'number' }, { id: 'density', name: 'Fluid Density (ρ)', unit: 'kg/m³', type: 'number' } ],
          calculate: (inputs) => { const p1 = parseFloat(inputs.p1); const v1 = parseFloat(inputs.v1); const h1 = parseFloat(inputs.h1); const v2 = parseFloat(inputs.v2); const h2 = parseFloat(inputs.h2); const rho = parseFloat(inputs.density); const g = 9.81; if (isNaN(p1) || isNaN(v1) || isNaN(h1) || isNaN(v2) || isNaN(h2) || isNaN(rho)) return { value: NaN, unit: 'Pa' }; return { value: p1 + 0.5 * rho * (Math.pow(v1, 2) - Math.pow(v2, 2)) + rho * g * (h1 - h2), unit: 'Pa' }; }
        },
        'reynolds_number': {
          name: 'Reynolds Number', description: 'Determine flow regime (laminar/turbulent)',
          inputs: [ { id: 'velocity', name: 'Flow Velocity (v)', unit: 'm/s', type: 'number' }, { id: 'diameter', name: 'Characteristic Length (L)', unit: 'm', type: 'number' }, { id: 'density', name: 'Fluid Density (ρ)', unit: 'kg/m³', type: 'number' }, { id: 'viscosity', name: 'Dynamic Viscosity (μ)', unit: 'Pa·s', type: 'number' } ],
          calculate: (inputs) => { const rho = parseFloat(inputs.density); const v = parseFloat(inputs.velocity); const L = parseFloat(inputs.diameter); const mu = parseFloat(inputs.viscosity); if (isNaN(rho) || isNaN(v) || isNaN(L) || isNaN(mu) || mu === 0) return { value: NaN, unit: 'dimensionless' }; return { value: (rho * v * L) / mu, unit: 'dimensionless' }; }
        }
      }
    },
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
     'thermodynamics': {
      name: 'Thermodynamics',
       icon: <Icons.TemperatureHigh /> as React.ReactElement,
      formulas: {
        'heat_transfer': {
          name: 'Conduction Heat Transfer', description: 'Steady-state heat transfer through a plane wall',
          inputs: [ { id: 'k', name: 'Thermal Conductivity (k)', unit: 'W/(m·K)', type: 'number' }, { id: 'a', name: 'Cross-sectional Area (A)', unit: 'm²', type: 'number' }, { id: 't_hot', name: 'Hot Temperature (T₁)', unit: 'K or °C', type: 'number' }, { id: 't_cold', name: 'Cold Temperature (T₂)', unit: 'K or °C', type: 'number' }, { id: 'thickness', name: 'Material Thickness (L)', unit: 'm', type: 'number' } ],
          calculate: (inputs) => { const k = parseFloat(inputs.k); const A = parseFloat(inputs.a); const T_hot = parseFloat(inputs.t_hot); const T_cold = parseFloat(inputs.t_cold); const L = parseFloat(inputs.thickness); if (isNaN(k) || isNaN(A) || isNaN(T_hot) || isNaN(T_cold) || isNaN(L) || L === 0) return { value: NaN, unit: 'W' }; return { value: (k * A * (T_hot - T_cold)) / L, unit: 'W' }; }
        },
        'ideal_gas': {
          name: 'Ideal Gas Law', description: 'Relates P, V, n, T for an ideal gas',
          inputs: [ { id: 'calculation', name: 'Calculate Which Variable?', unit: '', type: 'select', options: [ { value: 'pressure', label: 'Pressure (P)' }, { value: 'volume', label: 'Volume (V)' }, { value: 'temperature', label: 'Temperature (T)' }, { value: 'moles', label: 'Moles (n)' } ]}, { id: 'pressure', name: 'Pressure (P)', unit: 'Pa', type: 'number' }, { id: 'volume', name: 'Volume (V)', unit: 'm³', type: 'number' }, { id: 'moles', name: 'Number of Moles (n)', unit: 'mol', type: 'number' }, { id: 'temperature', name: 'Temperature (T)', unit: 'K', type: 'number' }, ],
          calculate: (inputs) => { const P = parseFloat(inputs.pressure); const V = parseFloat(inputs.volume); const n = parseFloat(inputs.moles); const T = parseFloat(inputs.temperature); const R = 8.314; const calc = inputs.calculation; if (calc === 'pressure') { if (isNaN(n) || isNaN(T) || isNaN(V) || V === 0) return { value: NaN, unit: 'Pa' }; return { value: (n * R * T) / V, unit: 'Pa' }; } else if (calc === 'volume') { if (isNaN(n) || isNaN(T) || isNaN(P) || P === 0) return { value: NaN, unit: 'm³' }; return { value: (n * R * T) / P, unit: 'm³' }; } else if (calc === 'temperature') { if (isNaN(P) || isNaN(V) || isNaN(n) || n === 0) return { value: NaN, unit: 'K' }; return { value: (P * V) / (n * R), unit: 'K' }; } else if (calc === 'moles') { if (isNaN(P) || isNaN(V) || isNaN(T) || T === 0) return { value: NaN, unit: 'mol' }; return { value: (P * V) / (R * T), unit: 'mol' }; } return { value: NaN, unit: '' }; }
        }
      }
    },
    'broadcast': {
      name: 'Broadcast Reception',
      icon: <Icons.BroadcastTower /> as React.ReactElement,
      // No formulas needed here; the BroadcastCalculator component handles its own logic.
      formulas: {}
    }
};
