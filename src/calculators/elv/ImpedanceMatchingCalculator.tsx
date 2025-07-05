import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface ImpedanceMatchingCalculatorProps {
  onBack?: () => void;
  onShowTutorial?: () => void;
}

// ======================== SHARED TYPES AND INTERFACES ========================

// Define network types for impedance matching
type NetworkType = 'lNetwork' | 'piNetwork' | 'tNetwork';
type NetworkTopology = 'lowPass' | 'highPass';
type MatchingPosition = 'source' | 'load';

// Source and Load impedances
interface Impedance {
  resistance: number;   // Real part in ohms
  reactance: number;    // Imaginary part in ohms
}

// Component (inductor or capacitor)
interface Component {
  type: 'inductor' | 'capacitor';
  value: number;        // Value in H or F
  reactance: number;    // Calculated reactance in ohms
  position: string;     // Description of position in circuit
}

// MatchingResult with added calculatedQ property
interface MatchingResult {
  components: Component[];
  vswr: number;
  reflectionCoefficient: number;
  returnLoss: number;
  matchingEfficiency: number;
  calculatedQ?: number;  // Store the calculated Q for bandwidth calculation
  error?: string;
}

// PCB substrate material interface
interface SubstrateMaterial {
  id: string;
  name: string;
  dielectricConstant: number; // εr
  lossTangent: number;        // tan δ
  conductivity?: number;      // S/m (optional for some materials)
}

// Parameter for calculation method selection
type CalculationMode = 'impedance' | 'dimensions';

// Define parameter types for RF Parameter Converter
type ParameterType = 'S' | 'ABCD' | 'Y' | 'Z';

// Define complex number type
interface ComplexNumber {
  real: number;
  imag: number;
}

// Define input parameters structure
interface ParameterInputs {
  p11: ComplexNumber;
  p12: ComplexNumber;
  p21: ComplexNumber;
  p22: ComplexNumber;
  frequency: number;
  z0: number; // Reference impedance, default 50 ohms
}

// Define the 2x2 matrix type for network parameters
interface Matrix2x2 {
  m11: ComplexNumber;
  m12: ComplexNumber;
  m21: ComplexNumber;
  m22: ComplexNumber;
}

// ======================== MAIN COMPONENT ========================

const ImpedanceMatchingCalculator: React.FC<ImpedanceMatchingCalculatorProps> = ({ onBack, onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Impedance Matching Calculator',
    discipline: 'elv',
    calculatorType: 'impedance-matching'
  });
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'impedance' | 'microstrip' | 'parameters'>('impedance');

  return (
    <CalculatorWrapper
      title="Impedance Matching Calculator"
      discipline="elv"
      calculatorType="impedance-matching"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'impedance'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('impedance')}
        >
          Impedance Matching
        </button>
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'microstrip'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('microstrip')}
        >
          Microstrip Calculator
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'parameters'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('parameters')}
        >
          Parameter Converter
        </button>
      </div>
      
      {/* Content Based on Active Tab */}
      {activeTab === 'impedance' && <ImpedanceMatchingSubCalculator onShowTutorial={onShowTutorial} saveCalculation={saveCalculation} prepareExportData={prepareExportData} />}
      {activeTab === 'microstrip' && <MicrostripSubCalculator onShowTutorial={onShowTutorial} />}
      {activeTab === 'parameters' && <ParameterConverterSubCalculator onShowTutorial={onShowTutorial} />}
    </CalculatorWrapper>
  );
};

// ======================== IMPEDANCE MATCHING SUB-CALCULATOR ========================

interface ImpedanceMatchingSubCalculatorProps {
  onShowTutorial?: () => void;
  saveCalculation?: (inputs: Record<string, any>, results: Record<string, any>, notes?: string) => void;
  prepareExportData?: (inputs: Record<string, any>, results: Record<string, any>, projectName?: string) => void;
}

const ImpedanceMatchingSubCalculator: React.FC<ImpedanceMatchingSubCalculatorProps> = ({ onShowTutorial, saveCalculation, prepareExportData }) => {
  // Reference constants
  const Z0 = 50; // Standard characteristic impedance (ohms)
  
  // State for input system parameters
  const [frequency, setFrequency] = useState<number>(100); // MHz
  const [customZ0, setCustomZ0] = useState<number>(50); // ohms
  const [useCustomZ0, setUseCustomZ0] = useState<boolean>(false);
  
  // Source and Load impedances
  const [sourceImpedance, setSourceImpedance] = useState<Impedance>({
    resistance: 50,
    reactance: 0
  });
  const [loadImpedance, setLoadImpedance] = useState<Impedance>({
    resistance: 100,
    reactance: 50
  });
  
  // Matching network configuration
  const [networkType, setNetworkType] = useState<NetworkType>('lNetwork');
  const [networkTopology, setNetworkTopology] = useState<NetworkTopology>('lowPass');
  const [matchingPosition, setMatchingPosition] = useState<MatchingPosition>('load');
  
  // State for Q factor (selectivity/bandwidth control)
  const [desiredQ, setDesiredQ] = useState<number>(1);
  const [useCustomQ, setUseCustomQ] = useState<boolean>(false);

  // Smith chart canvas reference
  const smithChartRef = useRef<HTMLCanvasElement>(null);
  
  // Calculation results
  const [matchingResults, setMatchingResults] = useState<MatchingResult | null>(null);
  const [showAdvancedResults, setShowAdvancedResults] = useState<boolean>(false);
  
  // Function to calculate matching network components
  useEffect(() => {
    calculateMatchingNetwork();
  }, [
    frequency, 
    sourceImpedance, 
    loadImpedance, 
    networkType, 
    networkTopology, 
    matchingPosition,
    useCustomZ0,
    customZ0,
    useCustomQ,
    desiredQ
  ]);
  
  // Function to draw the Smith chart (simplified version)
  useEffect(() => {
    drawSmithChart();
  }, [matchingResults, sourceImpedance, loadImpedance]);
  
  // Calculate the matching network
  const calculateMatchingNetwork = () => {
    try {
      const freqHz = frequency * 1e6; // Convert MHz to Hz
      const referenceZ = useCustomZ0 ? customZ0 : Z0;
      
      // Get normalized impedances
      const normalizedSource = {
        resistance: sourceImpedance.resistance / referenceZ,
        reactance: sourceImpedance.reactance / referenceZ
      };
      
      const normalizedLoad = {
        resistance: loadImpedance.resistance / referenceZ,
        reactance: loadImpedance.reactance / referenceZ
      };
      
      // Determine which impedance to match to which
      const sourceZ = matchingPosition === 'source' ? 
        { r: sourceImpedance.resistance, x: sourceImpedance.reactance } : 
        { r: referenceZ, x: 0 };
      
      const loadZ = matchingPosition === 'load' ? 
        { r: loadImpedance.resistance, x: loadImpedance.reactance } : 
        { r: referenceZ, x: 0 };
      
      // Calculate the reflection coefficient for the impedance being matched
      const impedanceToMatch = matchingPosition === 'source' ? sourceImpedance : loadImpedance;
      const numerator = Math.sqrt(Math.pow(impedanceToMatch.resistance - referenceZ, 2) + Math.pow(impedanceToMatch.reactance, 2));
      const denominator = Math.sqrt(Math.pow(impedanceToMatch.resistance + referenceZ, 2) + Math.pow(impedanceToMatch.reactance, 2));
      const gamma = numerator / denominator;
      
      // Calculate VSWR
      const vswr = (1 + gamma) / (1 - gamma);
      
      // Calculate return loss in dB
      const returnLoss = -20 * Math.log10(gamma);
      
      // Calculate matching efficiency
      const matchingEfficiency = (1 - Math.pow(gamma, 2)) * 100;
      
      // Determine Q factor for the network
      const q = useCustomQ ? desiredQ : calculateDefaultQ(sourceZ, loadZ);

      // Calculate components based on network type
      let components: Component[] = [];
      
      if (networkType === 'lNetwork') {
        components = calculateLNetwork(sourceZ, loadZ, freqHz, q, networkTopology);
      } else if (networkType === 'piNetwork') {
        components = calculatePiNetwork(sourceZ, loadZ, freqHz, q, networkTopology);
      } else if (networkType === 'tNetwork') {
        components = calculateTNetwork(sourceZ, loadZ, freqHz, q, networkTopology);
      }
      
      // Save the calculated Q in the result (for bandwidth estimation)
      const calculatedQ = q;
      
      // Set the results
      setMatchingResults({
        components,
        vswr,
        reflectionCoefficient: gamma,
        returnLoss,
        matchingEfficiency,
        calculatedQ
      });
      
    } catch (error) {
      console.error("Matching network calculation error:", error);
      setMatchingResults({
        components: [],
        vswr: 0,
        reflectionCoefficient: 1,
        returnLoss: 0,
        matchingEfficiency: 0,
        error: (error instanceof Error) ? error.message : "Error in calculations. Check your inputs."
      });
    }
  };
  
  // Calculate the default Q factor based on impedance ratio
  const calculateDefaultQ = (source: { r: number, x: number }, load: { r: number, x: number }) => {
    // Strip reactances for Q calculation
    const rs = source.r;
    const rl = load.r;
    
    // Ensure positive resistances
    if (rs <= 0 || rl <= 0) {
      return 1; // Default Q if invalid resistance
    }
    
    // Calculate minimum required Q based on impedance ratio
    let q = 1;
    
    try {
      if (rs < rl) {
        const value = (rl / rs) - 1;
        q = value > 0 ? Math.sqrt(value) : 1;
      } else {
        const value = (rs / rl) - 1;
        q = value > 0 ? Math.sqrt(value) : 1;
      }
    } catch (error) {
      q = 1; // Default Q if calculation fails
    }
    
    // Ensure Q is a positive, finite number
    return isNaN(q) || !isFinite(q) || q <= 0 ? 1 : q;
  };
  
  // Calculate L-Network components
  const calculateLNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency; // angular frequency
    
    try {
      // Input validation - ensure resistances are positive
      if (source.r <= 0 || load.r <= 0) {
        throw new Error("Source and load resistances must be positive");
      }
      
      // Extract impedance parameters
      const rs = source.r;
      const xs = source.x;
      const rl = load.r;
      const xl = load.x;
      
      // Special case: if Rs = Rl and Xs = -Xl, no matching needed
      if (rs === rl && xs === -xl) {
        return components;
      }
      
      // Simplified L-network calculation for demonstration
      if (rs < rl) {
        // Step-up L-network
        const Qmin = Math.sqrt((rl/rs) - 1);
        const actualQ = Math.max(Qmin, q);
        
        if (topology === 'lowPass') {
          // Series L, Shunt C
          const Xs = actualQ * rs;
          const Bp = actualQ / rl;
          
          const L = (Xs - xs) / omega;
          const C = (Bp + xl/(rl*rl + xl*xl)) / omega;
          
          if (L > 0) {
            components.push({
              type: 'inductor',
              value: L,
              reactance: omega * L,
              position: 'Series inductor'
            });
          }
          
          if (C > 0) {
            components.push({
              type: 'capacitor',
              value: C,
              reactance: -1 / (omega * C),
              position: 'Shunt capacitor'
            });
          }
        } else {
          // Series C, Shunt L
          const Xs = -1 / (actualQ * rs);
          const Bp = -actualQ / rl;
          
          const C = 1 / (omega * Math.abs(Xs - xs));
          const L = 1 / (omega * Math.abs(Bp + xl/(rl*rl + xl*xl)));
          
          if (C > 0) {
            components.push({
              type: 'capacitor',
              value: C,
              reactance: -1 / (omega * C),
              position: 'Series capacitor'
            });
          }
          
          if (L > 0) {
            components.push({
              type: 'inductor',
              value: L,
              reactance: omega * L,
              position: 'Shunt inductor'
            });
          }
        }
      } else {
        // Step-down L-network
        const Qmin = Math.sqrt((rs/rl) - 1);
        const actualQ = Math.max(Qmin, q);
        
        if (topology === 'lowPass') {
          // Shunt C, Series L
          const Bp = actualQ / rs;
          const Xs = actualQ * rl;
          
          const C = (Bp + xs/(rs*rs + xs*xs)) / omega;
          const L = (Xs - xl) / omega;
          
          if (C > 0) {
            components.push({
              type: 'capacitor',
              value: C,
              reactance: -1 / (omega * C),
              position: 'Shunt capacitor'
            });
          }
          
          if (L > 0) {
            components.push({
              type: 'inductor',
              value: L,
              reactance: omega * L,
              position: 'Series inductor'
            });
          }
        } else {
          // Shunt L, Series C
          const Bp = -actualQ / rs;
          const Xs = -1 / (actualQ * rl);
          
          const L = 1 / (omega * Math.abs(Bp + xs/(rs*rs + xs*xs)));
          const C = 1 / (omega * Math.abs(Xs - xl));
          
          if (L > 0) {
            components.push({
              type: 'inductor',
              value: L,
              reactance: omega * L,
              position: 'Shunt inductor'
            });
          }
          
          if (C > 0) {
            components.push({
              type: 'capacitor',
              value: C,
              reactance: -1 / (omega * C),
              position: 'Series capacitor'
            });
          }
        }
      }
      
      return components;
    } catch (error) {
      console.error("L-Network calculation error:", error);
      throw error;
    }
  };
  
  // Calculate Pi-Network components (simplified)
  const calculatePiNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // Simplified Pi-network calculation
    const rs = source.r;
    const rl = load.r;
    
    if (topology === 'lowPass') {
      // C-L-C configuration
      const rv = Math.min(rs, rl) / (q * q + 1);
      
      const C1 = q / (omega * Math.max(rs, rv));
      const C2 = q / (omega * Math.max(rl, rv));
      const L = Math.max(rs, rl) / (omega * q);
      
      components.push({
        type: 'capacitor',
        value: C1,
        reactance: -1 / (omega * C1),
        position: 'Input shunt capacitor'
      });
      
      components.push({
        type: 'inductor',
        value: L,
        reactance: omega * L,
        position: 'Series inductor'
      });
      
      components.push({
        type: 'capacitor',
        value: C2,
        reactance: -1 / (omega * C2),
        position: 'Output shunt capacitor'
      });
    }
    
    return components;
  };
  
  // Calculate T-Network components (simplified)
  const calculateTNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // Simplified T-network calculation
    const rs = source.r;
    const rl = load.r;
    
    if (topology === 'lowPass') {
      // L-C-L configuration
      const rv = Math.max(rs, rl) * (q * q + 1);
      
      const L1 = q * Math.min(rs, rv) / omega;
      const L2 = q * Math.min(rl, rv) / omega;
      const C = (q + q) / (omega * rv);
      
      components.push({
        type: 'inductor',
        value: L1,
        reactance: omega * L1,
        position: 'Input series inductor'
      });
      
      components.push({
        type: 'capacitor',
        value: C,
        reactance: -1 / (omega * C),
        position: 'Shunt capacitor'
      });
      
      components.push({
        type: 'inductor',
        value: L2,
        reactance: omega * L2,
        position: 'Output series inductor'
      });
    }
    
    return components;
  };

  // Draw a simplified Smith chart
  const drawSmithChart = () => {
    const canvas = smithChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const radius = Math.min(width, height) / 2 - 20;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw the outer circle (|Γ| = 1)
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#999';
    ctx.stroke();
    
    // Draw constant resistance circles
    const rValues = [0, 0.2, 0.5, 1, 2, 5];
    rValues.forEach(r => {
      const normalizedR = r / (r + 1);
      ctx.beginPath();
      ctx.arc(
        center.x + radius * normalizedR, 
        center.y, 
        radius * (1 - normalizedR), 
        0, 
        2 * Math.PI
      );
      ctx.strokeStyle = r === 1 ? '#666' : '#ccc';
      ctx.stroke();
      
      // Label the r circle
      if (r > 0) {
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText(
          `r=${r}`, 
          center.x + radius * normalizedR - 15, 
          center.y - 5
        );
      }
    });
    
    // Draw the real axis
    ctx.beginPath();
    ctx.moveTo(center.x - radius, center.y);
    ctx.lineTo(center.x + radius, center.y);
    ctx.strokeStyle = '#333';
    ctx.stroke();
    
    // Draw the center point (normalized Z = 1)
    ctx.beginPath();
    ctx.arc(center.x, center.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    // If we have valid source and load impedances, plot them
    const referenceZ = useCustomZ0 ? customZ0 : Z0;
    
    if (sourceImpedance && loadImpedance && referenceZ > 0) {
      // Plot source impedance (normalized)
      const normalizedSourceR = sourceImpedance.resistance / referenceZ;
      const normalizedSourceX = sourceImpedance.reactance / referenceZ;
      
      // Calculate reflection coefficient for source
      const sourceGammaR = (normalizedSourceR * normalizedSourceR + normalizedSourceX * normalizedSourceX - 1) / 
                          ((normalizedSourceR + 1) * (normalizedSourceR + 1) + normalizedSourceX * normalizedSourceX);
      const sourceGammaI = (2 * normalizedSourceX) / 
                         ((normalizedSourceR + 1) * (normalizedSourceR + 1) + normalizedSourceX * normalizedSourceX);
      
      // Plot source point
      ctx.beginPath();
      ctx.arc(
        center.x + radius * sourceGammaR, 
        center.y - radius * sourceGammaI,
        5, 
        0, 
        2 * Math.PI
      );
      ctx.fillStyle = 'blue';
      ctx.fill();
      ctx.font = '12px Arial';
      ctx.fillText('Source', center.x + radius * sourceGammaR + 10, center.y - radius * sourceGammaI);
      
      // Plot load impedance
      const normalizedLoadR = loadImpedance.resistance / referenceZ;
      const normalizedLoadX = loadImpedance.reactance / referenceZ;
      
      // Calculate reflection coefficient for load
      const loadGammaR = (normalizedLoadR * normalizedLoadR + normalizedLoadX * normalizedLoadX - 1) / 
                          ((normalizedLoadR + 1) * (normalizedLoadR + 1) + normalizedLoadX * normalizedLoadX);
      const loadGammaI = (2 * normalizedLoadX) / 
                         ((normalizedLoadR + 1) * (normalizedLoadR + 1) + normalizedLoadX * normalizedLoadX);
      
      // Plot load point
      ctx.beginPath();
      ctx.arc(
        center.x + radius * loadGammaR, 
        center.y - radius * loadGammaI,
        5, 
        0, 
        2 * Math.PI
      );
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.font = '12px Arial';
      ctx.fillText('Load', center.x + radius * loadGammaR + 10, center.y - radius * loadGammaI);
    }
  };
  
  // Format component values for display in engineering notation
  const formatValue = (value: number, type: 'inductor' | 'capacitor'): string => {
    if (value === 0 || isNaN(value)) return '0';
    
    let unit = type === 'inductor' ? 'H' : 'F';
    let prefixes = ['p', 'n', 'µ', 'm', '', 'k', 'M', 'G'];
    let prefixIndex = 4; // No prefix
    
    // Find appropriate prefix
    if (value < 1e-9) {
      value *= 1e12; // Convert to pico
      prefixIndex = 0;
    } else if (value < 1e-6) {
      value *= 1e9; // Convert to nano
      prefixIndex = 1;
    } else if (value < 1e-3) {
      value *= 1e6; // Convert to micro
      prefixIndex = 2;
    } else if (value < 1) {
      value *= 1e3; // Convert to milli
      prefixIndex = 3;
    } else if (value >= 1e3 && value < 1e6) {
      value /= 1e3; // Convert to kilo
      prefixIndex = 5;
    } else if (value >= 1e6 && value < 1e9) {
      value /= 1e6; // Convert to mega
      prefixIndex = 6;
    } else if (value >= 1e9) {
      value /= 1e9; // Convert to giga
      prefixIndex = 7;
    }
    
    return value.toFixed(3) + ' ' + prefixes[prefixIndex] + unit;
  };

  // Get circuit diagram based on network type
  const getCircuitDiagram = () => {
    if (networkType === 'lNetwork') {
      if (networkTopology === 'lowPass') {
        if (sourceImpedance.resistance < loadImpedance.resistance) {
          return "Source ⟡—[ L ]—⟡—| |—⟡ Load";
        } else {
          return "Source ⟡—| |—⟡—[ L ]—⟡ Load";
        }
      } else {
        if (sourceImpedance.resistance < loadImpedance.resistance) {
          return "Source ⟡—|⊥|—⟡—( L )—⟡ Load";
        } else {
          return "Source ⟡—( L )—⟡—|⊥|—⟡ Load";
        }
      }
    } else if (networkType === 'piNetwork') {
      return networkTopology === 'lowPass' 
        ? "Source ⟡—| |—⟡—[ L ]—⟡—| |—⟡ Load"
        : "Source ⟡—( L )—⟡—|⊥|—⟡—( L )—⟡ Load";
    } else if (networkType === 'tNetwork') {
      return networkTopology === 'lowPass'
        ? "Source ⟡—[ L ]—⟡—| |—⟡—[ L ]—⟡ Load"
        : "Source ⟡—|⊥|—⟡—( L )—⟡—|⊥|—⟡ Load";
    } else {
      return "Custom Network Configuration";
    }
  };

  // Update source impedance
  const updateSourceImpedance = (field: 'resistance' | 'reactance', value: number) => {
    setSourceImpedance({
      ...sourceImpedance,
      [field]: value
    });
  };
  
  // Update load impedance
  const updateLoadImpedance = (field: 'resistance' | 'reactance', value: number) => {
    setLoadImpedance({
      ...loadImpedance,
      [field]: value
    });
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-4 text-gray-700">RF Circuit Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (MHz)</label>
          <input 
            type="number" 
            value={frequency} 
            onChange={(e) => setFrequency(Number(e.target.value))} 
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            min="1"
          />
        </div>
        
        <div className="mb-4">
          <div className="flex items-center">
            <label className="block text-sm font-medium text-gray-700 mb-1 mr-2">Reference Impedance Z₀</label>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                checked={useCustomZ0} 
                onChange={(e) => setUseCustomZ0(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Custom Z₀</span>
            </div>
          </div>
          {useCustomZ0 ? (
            <input 
              type="number" 
              value={customZ0} 
              onChange={(e) => setCustomZ0(Number(e.target.value))} 
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          ) : (
            <div className="text-sm text-gray-600 p-2">Standard 50 Ω (typical for RF circuits)</div>
          )}
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        <div className="mb-4">
          <h4 className="font-medium text-base text-gray-700 mb-2">Source Impedance (ZS)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resistance (Ω)</label>
              <input 
                type="number" 
                value={sourceImpedance.resistance} 
                onChange={(e) => updateSourceImpedance('resistance', Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reactance (Ω)</label>
              <input 
                type="number" 
                value={sourceImpedance.reactance} 
                onChange={(e) => updateSourceImpedance('reactance', Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="font-medium text-base text-gray-700 mb-2">Load Impedance (ZL)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resistance (Ω)</label>
              <input 
                type="number" 
                value={loadImpedance.resistance} 
                onChange={(e) => updateLoadImpedance('resistance', Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reactance (Ω)</label>
              <input 
                type="number" 
                value={loadImpedance.reactance} 
                onChange={(e) => updateLoadImpedance('reactance', Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        <h4 className="font-medium text-base text-gray-700 mb-4">Matching Network Configuration</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Network Type</label>
          <select
            value={networkType}
            onChange={(e) => setNetworkType(e.target.value as NetworkType)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="lNetwork">L-Network (2 Components, Simplest)</option>
            <option value="piNetwork">Pi-Network (3 Components, More Flexible)</option>
            <option value="tNetwork">T-Network (3 Components, High Q Possible)</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Topology</label>
          <select
            value={networkTopology}
            onChange={(e) => setNetworkTopology(e.target.value as NetworkTopology)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="lowPass">Low Pass (Better for lower frequencies)</option>
            <option value="highPass">High Pass (Better for higher frequencies)</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Match At</label>
          <select
            value={matchingPosition}
            onChange={(e) => setMatchingPosition(e.target.value as MatchingPosition)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="load">Load End (Most common)</option>
            <option value="source">Source End (For source other than 50Ω)</option>
          </select>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center">
            <label className="block text-sm font-medium text-gray-700 mb-1 mr-2">Quality Factor (Q)</label>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                checked={useCustomQ} 
                onChange={(e) => setUseCustomQ(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Custom Q</span>
            </div>
          </div>
          {useCustomQ ? (
            <input 
              type="number" 
              value={desiredQ} 
              onChange={(e) => setDesiredQ(Number(e.target.value))} 
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="0.1"
              step="0.1"
            />
          ) : (
            <div className="text-sm text-gray-600 p-2">Calculated automatically based on impedance ratio</div>
          )}
          <p className="text-xs text-gray-500 mt-1">Higher Q = narrower bandwidth but sharper filtering</p>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
        
        {/* Smith Chart Visualization */}
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium mb-3 text-gray-700">Smith Chart Visualization</h4>
          <div className="flex justify-center">
            <canvas 
              ref={smithChartRef} 
              width="300" 
              height="300" 
              className="border border-gray-300 rounded-md"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Blue dot: Source impedance, Red dot: Load impedance
          </p>
        </div>
        
        {/* Matching Network Results */}
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium mb-3 text-gray-700">Matching Network Components</h4>
          
          {matchingResults?.error ? (
            <div className="bg-red-100 p-3 rounded-md text-red-700 text-sm">
              {matchingResults.error}
            </div>
          ) : matchingResults?.components.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No matching components found. Check your input parameters.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 border border-gray-300">Component</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 border border-gray-300">Value</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 border border-gray-300">Reactance</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 border border-gray-300">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingResults?.components.map((component, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 border border-gray-300 font-medium">
                          {component.type === 'inductor' ? 'Inductor (L)' : 'Capacitor (C)'}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          {formatValue(component.value, component.type)}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          {Math.abs(component.reactance).toFixed(2)} Ω
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          {component.position}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Circuit diagram visualization */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-center font-mono text-sm">
                <p>{getCircuitDiagram()}</p>
                <p className="text-xs mt-1">
                  [ L ] = Series Inductor, |⊥| = Series Capacitor
                  <br/>
                  | | = Shunt Capacitor, ( L ) = Shunt Inductor
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Performance Metrics */}
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-700">Initial Mismatch Metrics (before matching)</h4>
            <button
              onClick={() => setShowAdvancedResults(!showAdvancedResults)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showAdvancedResults ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-sm text-gray-600">VSWR:</p>
              <p className={`font-semibold ${matchingResults?.vswr && matchingResults.vswr <= 1.5 ? 'text-green-600' : 'text-gray-800'}`}>
                {matchingResults?.vswr ? matchingResults.vswr.toFixed(2) : 'N/A'}:1
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Return Loss:</p>
              <p className={`font-semibold ${matchingResults?.returnLoss && matchingResults.returnLoss >= 10 ? 'text-green-600' : 'text-gray-800'}`}>
                {matchingResults?.returnLoss ? matchingResults.returnLoss.toFixed(2) : 'N/A'} dB
              </p>
            </div>
          </div>
          
          {showAdvancedResults && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Reflection Coefficient (|Γ|):</p>
                <p className="font-semibold text-gray-800">
                  {matchingResults?.reflectionCoefficient ? matchingResults.reflectionCoefficient.toFixed(4) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Matching Efficiency:</p>
                <p className={`font-semibold ${matchingResults?.matchingEfficiency && matchingResults.matchingEfficiency >= 90 ? 'text-green-600' : 'text-gray-800'}`}>
                  {matchingResults?.matchingEfficiency ? matchingResults.matchingEfficiency.toFixed(2) : 'N/A'} %
                </p>
              </div>
              <div className="col-span-2 mt-2">
                <p className="text-sm text-gray-600">Bandwidth Estimation:</p>
                <p className="font-semibold text-gray-800">
                  {matchingResults && !matchingResults.error && matchingResults.calculatedQ ? 
                    `~${(frequency / (useCustomQ ? desiredQ : matchingResults.calculatedQ)).toFixed(2)} MHz` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  (Center frequency ÷ Q factor, approximate)
                </p>
              </div>
            </div>
          )}
          
          {/* After matching (theoretical ideal) */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h5 className="font-medium text-sm text-gray-700 mb-2">After Matching (Theoretical Ideal)</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">VSWR:</p>
                <p className="font-semibold text-green-600">1.00:1</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Return Loss:</p>
                <p className="font-semibold text-green-600">∞ dB (ideal)</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reflection Coefficient:</p>
                <p className="font-semibold text-green-600">0.000</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Matching Efficiency:</p>
                <p className="font-semibold text-green-600">100.00 %</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: Actual performance will depend on component tolerances, parasitic effects, and implementation details.
            </p>
          </div>
        </div>
        
        <div className="bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Matching Network Selection Guide</h4>
          <ul className="list-disc pl-5 text-sm space-y-1 text-blue-800">
            <li><strong>L-Network:</strong> Simplest option, can match any two resistive impedances, but limited bandwidth control.</li>
            <li><strong>Pi-Network:</strong> Can match source and load while controlling bandwidth. Good for filtering unwanted harmonics</li>
            <li><strong>T-Network:</strong> Similar to Pi but with series elements. Can achieve very high Q for selective filtering</li>
            <li><strong>Low Pass:</strong> Attenuates high frequencies, useful when harmonics need filtering</li>
            <li><strong>High Pass:</strong> Blocks low frequencies, better when low-frequency noise is a concern</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== MICROSTRIP SUB-CALCULATOR ========================

interface MicrostripSubCalculatorProps {
  onShowTutorial?: () => void;
}

const MicrostripSubCalculator: React.FC<MicrostripSubCalculatorProps> = ({ onShowTutorial }) => {
  // Substrate parameters
  const [substrateHeight, setSubstrateHeight] = useState<number>(1.6); // mm
  const [substrateThickness, setSubstrateThickness] = useState<number>(0.035); // mm (copper thickness)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('fr4');
  const [customDielectricConstant, setCustomDielectricConstant] = useState<number>(4.4);
  const [customLossTangent, setCustomLossTangent] = useState<number>(0.02);
  const [useCustomMaterial, setUseCustomMaterial] = useState<boolean>(false);
  
  // Microstrip parameters
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('impedance');
  const [frequency, setFrequency] = useState<number>(1000); // MHz
  const [targetImpedance, setTargetImpedance] = useState<number>(50); // Ohms
  const [stripWidth, setStripWidth] = useState<number>(3); // mm
  const [stripLength, setStripLength] = useState<number>(10); // mm
  
  // Advanced parameters
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(25); // °C
  const [roughness, setRoughness] = useState<number>(0.0015); // mm (RMS roughness)
  
  // Calculation results
  const [results, setResults] = useState<{
    impedance: number;
    effectiveDielectricConstant: number;
    wavelength: number;
    electricalLength: number;
    phaseLengthDeg: number;
    conductorLoss: number;
    dielectricLoss: number;
    totalLoss: number;
    propagationDelay: number;
    calculatedWidth?: number;
    calculatedLength?: number;
  } | null>(null);
  
  // Substrate material options
  const substrateMaterials: SubstrateMaterial[] = [
    { id: 'fr4', name: 'FR-4', dielectricConstant: 4.4, lossTangent: 0.02 },
    { id: 'rogers4350b', name: 'Rogers 4350B', dielectricConstant: 3.48, lossTangent: 0.0037 },
    { id: 'rogers5880', name: 'Rogers RT/duroid 5880', dielectricConstant: 2.2, lossTangent: 0.0009 },
    { id: 'alumina', name: 'Alumina (Al₂O₃)', dielectricConstant: 9.8, lossTangent: 0.0001 },
    { id: 'rogers3003', name: 'Rogers RO3003', dielectricConstant: 3.0, lossTangent: 0.0013 },
    { id: 'rogers3006', name: 'Rogers RO3006', dielectricConstant: 6.15, lossTangent: 0.0025 },
    { id: 'rogers3010', name: 'Rogers RO3010', dielectricConstant: 10.2, lossTangent: 0.0035 },
    { id: 'custom', name: 'Custom Material', dielectricConstant: 0, lossTangent: 0 }
  ];
  
  // Get the current substrate material
  const getCurrentMaterial = (): SubstrateMaterial => {
    if (useCustomMaterial) {
      return {
        id: 'custom',
        name: 'Custom Material',
        dielectricConstant: customDielectricConstant,
        lossTangent: customLossTangent
      };
    }
    const selectedMaterial = substrateMaterials.find(m => m.id === selectedMaterialId);
    return selectedMaterial || substrateMaterials.find(m => m.id === 'fr4')!;
  };
  
  // Handle material selection change
  const handleMaterialChange = (materialId: string) => {
    if (materialId === 'custom') {
      setUseCustomMaterial(true);
      if (customDielectricConstant === 0 && customLossTangent === 0) {
        const fr4 = substrateMaterials.find(m => m.id === 'fr4')!;
        setCustomDielectricConstant(fr4.dielectricConstant);
        setCustomLossTangent(fr4.lossTangent);
      }
    } else {
      setUseCustomMaterial(false);
      setSelectedMaterialId(materialId);
    }
  };
  
  // Calculation function for microstrip parameters
  useEffect(() => {
    calculateMicrostrip();
  }, [
    calculationMode,
    substrateHeight, 
    substrateThickness, 
    selectedMaterialId, 
    useCustomMaterial,
    customDielectricConstant,
    customLossTangent,
    frequency,
    targetImpedance,
    stripWidth,
    stripLength,
    temperature,
    roughness
  ]);
  
  const calculateMicrostrip = () => {
    const material = getCurrentMaterial();
    const er = material.dielectricConstant;
    const tanDelta = material.lossTangent;
    const h = substrateHeight; // mm
    const t = substrateThickness; // mm
    const f_mhz = frequency; // MHz
    const w_input = stripWidth; // mm

    if (h <= 0 || er <= 0 || f_mhz <= 0 || t <= 0) {
      setResults(null);
      return; 
    }
    
    const freq_hz = f_mhz * 1e6;
    
    let Z0_final: number;
    let er_eff_final: number;
    let w_eff_final_val: number; 
    let current_physical_width: number;
    let calculatedWidth_val: number | undefined = undefined;

    if (calculationMode === 'dimensions') {
      if (w_input <= 0) {
        setResults(null);
        return;
      }
      
      // Simplified microstrip impedance calculation
      const w_h_ratio = w_input / h;
      
      if (w_h_ratio < 1) {
        er_eff_final = (er + 1) / 2 + ((er - 1) / 2) * (1 / Math.sqrt(1 + 12 / w_h_ratio) + 0.04 * Math.pow(1 - w_h_ratio, 2));
        Z0_final = (60 / Math.sqrt(er_eff_final)) * Math.log(8 / w_h_ratio + 0.25 * w_h_ratio);
      } else {
        er_eff_final = (er + 1) / 2 + ((er - 1) / 2) * (1 / Math.sqrt(1 + 12 / w_h_ratio));
        Z0_final = (120 * Math.PI) / (Math.sqrt(er_eff_final) * (w_h_ratio + 1.393 + 0.667 * Math.log(w_h_ratio + 1.444)));
      }
      
      current_physical_width = w_input;
      w_eff_final_val = w_input + (t / Math.PI) * (1.0 + Math.log(4 * Math.PI * w_input / t));
    } else { // calculationMode === 'impedance'
      if (targetImpedance <= 0) {
        setResults(null);
        return;
      }
      
      // Simplified width calculation for target impedance
      const A = (targetImpedance / 60) * Math.sqrt((er + 1) / 2) + ((er - 1) / (er + 1)) * (0.23 + 0.11 / er);
      const B = 377 * Math.PI / (2 * targetImpedance * Math.sqrt(er));
      
      let w_h_ratio: number;
      if (A < 1.52) {
        w_h_ratio = (8 * Math.exp(A)) / (Math.exp(2 * A) - 2);
      } else {
        w_h_ratio = (2 / Math.PI) * (B - 1 - Math.log(2 * B - 1) + ((er - 1) / (2 * er)) * (Math.log(B - 1) + 0.39 - 0.61 / er));
      }
      
      calculatedWidth_val = w_h_ratio * h;
      current_physical_width = calculatedWidth_val;
      
      // Calculate effective dielectric constant for calculated width
      if (w_h_ratio < 1) {
        er_eff_final = (er + 1) / 2 + ((er - 1) / 2) * (1 / Math.sqrt(1 + 12 / w_h_ratio) + 0.04 * Math.pow(1 - w_h_ratio, 2));
      } else {
        er_eff_final = (er + 1) / 2 + ((er - 1) / 2) * (1 / Math.sqrt(1 + 12 / w_h_ratio));
      }
      
      Z0_final = targetImpedance;
      w_eff_final_val = current_physical_width + (t / Math.PI) * (1.0 + Math.log(4 * Math.PI * current_physical_width / t));
    }
    
    if (isNaN(Z0_final) || isNaN(er_eff_final) || current_physical_width <= 0) {
      setResults(null);
      return;
    }
        
    const c0 = 299792458; // speed of light in m/s
    const wavelength_m = c0 / (freq_hz * Math.sqrt(er_eff_final));
    const wavelength_mm = wavelength_m * 1000;
    
    const electrical_length_rad = (stripLength / wavelength_mm) * 2 * Math.PI;
    const phase_length_deg = electrical_length_rad * (180 / Math.PI);
    
    const propagation_delay_s_per_m = Math.sqrt(er_eff_final) / c0;
    const propagation_delay_ns = (stripLength / 1000) * propagation_delay_s_per_m * 1e9;

    // Simplified loss calculations
    const mu0 = 4 * Math.PI * 1e-7; // H/m
    const sigma_conductor = 5.8e7; // S/m (copper)
    const skin_depth_m = Math.sqrt(2 / (2 * Math.PI * freq_hz * mu0 * sigma_conductor));
    const Rs_ohm_per_sq = 1 / (skin_depth_m * sigma_conductor);
    
    const roughness_factor = 1 + (2/Math.PI) * Math.atan(1.4 * Math.pow((roughness/(skin_depth_m*1000)), 2));
    const Rs_rough_ohm_per_sq = Rs_ohm_per_sq * roughness_factor;
    
    const current_physical_width_m = current_physical_width / 1000;
    const conductor_loss_db_per_m = (Rs_rough_ohm_per_sq / (Z0_final * current_physical_width_m)) * 8.686;
    
    const temp_factor = 1 + 0.00393 * (temperature - 25);
    const final_conductor_loss_db_per_m = conductor_loss_db_per_m * temp_factor;
    const conductor_loss_db_per_mm = final_conductor_loss_db_per_m / 1000;
    
    let dielectric_loss_db_per_mm = 0;
    if (tanDelta > 0) {
        dielectric_loss_db_per_mm = 27.3 * er * tanDelta * (er_eff_final / (er * Math.sqrt(er_eff_final))) * (freq_hz / 1e9) / 1000;
    }

    const total_loss_db_per_mm = conductor_loss_db_per_mm + dielectric_loss_db_per_mm;
    
    let calculatedLength_val: number | undefined;
    if (calculationMode === 'impedance') {
      calculatedLength_val = wavelength_mm / 4;
    }
    
    setResults({
      impedance: Z0_final,
      effectiveDielectricConstant: er_eff_final,
      wavelength: wavelength_mm,
      electricalLength: electrical_length_rad,
      phaseLengthDeg: phase_length_deg,
      conductorLoss: isNaN(conductor_loss_db_per_mm) ? NaN : conductor_loss_db_per_mm * stripLength,
      dielectricLoss: isNaN(dielectric_loss_db_per_mm) ? NaN : dielectric_loss_db_per_mm * stripLength,
      totalLoss: isNaN(total_loss_db_per_mm) ? NaN : total_loss_db_per_mm * stripLength,
      propagationDelay: propagation_delay_ns,
      calculatedWidth: calculatedWidth_val,
      calculatedLength: calculatedLength_val
    });
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        {/* Calculation Mode Selection */}
        <div className="mb-4">
          <h3 className="font-medium text-lg mb-3 text-gray-700">Calculation Mode</h3>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                checked={calculationMode === 'impedance'} 
                onChange={() => setCalculationMode('impedance')}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Calculate Width for Target Impedance</span>
            </label>
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                checked={calculationMode === 'dimensions'} 
                onChange={() => setCalculationMode('dimensions')}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Calculate Impedance for Given Width</span>
            </label>
          </div>
        </div>
        
        {/* Substrate Parameters */}
        <div className="mb-6">
          <h3 className="font-medium text-lg mb-3 text-gray-700">Substrate Parameters</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <select 
              value={useCustomMaterial ? 'custom' : selectedMaterialId}
              onChange={(e) => handleMaterialChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {substrateMaterials.filter(m => m.id !== 'custom').map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} (εr={material.dielectricConstant.toFixed(2)}, tanδ={material.lossTangent.toFixed(4)})
                </option>
              ))}
              <option value="custom">Custom Material</option>
            </select>
          </div>
          
          {useCustomMaterial && (
            <div className="mb-3 pl-4 border-l-4 border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dielectric Constant (εr)
                  </label>
                  <input 
                    type="number" 
                    value={customDielectricConstant} 
                    onChange={(e) => setCustomDielectricConstant(Number(e.target.value))} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="0.01"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loss Tangent (tanδ)
                  </label>
                  <input 
                    type="number" 
                    value={customLossTangent} 
                    onChange={(e) => setCustomLossTangent(Number(e.target.value))} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="0.0001"
                    min="0"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter values for your custom substrate. Typical εr ranges from 2.1 to 10.2 for RF PCB materials.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Substrate Height (h) [mm]</label>
              <input 
                type="number" 
                value={substrateHeight} 
                onChange={(e) => setSubstrateHeight(Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.01"
                min="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Copper Thickness (t) [mm]</label>
              <input 
                type="number" 
                value={substrateThickness} 
                onChange={(e) => setSubstrateThickness(Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.001"
                min="0.001"
              />
              <p className="text-xs text-gray-500 mt-1">
                Standard values: 1oz=0.035mm, 2oz=0.07mm
              </p>
            </div>
          </div>
        </div>
        
        {/* Microstrip Line Parameters */}
        <div className="mb-6">
          <h3 className="font-medium text-lg mb-3 text-gray-700">Line Parameters</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency [MHz]</label>
            <input 
              type="number" 
              value={frequency} 
              onChange={(e) => setFrequency(Number(e.target.value))} 
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
              step="1"
              min="1"
            />
          </div>
          
          {calculationMode === 'impedance' ? (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Impedance [Ω]</label>
              <input 
                type="number" 
                value={targetImpedance} 
                onChange={(e) => setTargetImpedance(Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.1"
                min="10"
                max="200"
              />
              <p className="text-xs text-gray-500 mt-1">
                Common values: 50Ω for systems, 75Ω for video/cable, 100Ω for differential pairs
              </p>
            </div>
          ) : (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trace Width (w) [mm]</label>
              <input 
                type="number" 
                value={stripWidth} 
                onChange={(e) => setStripWidth(Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.01"
                min="0.01"
              />
            </div>
          )}
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Trace Length [mm]</label>
            <input 
              type="number" 
              value={stripLength} 
              onChange={(e) => setStripLength(Number(e.target.value))} 
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
              step="0.1"
              min="0.1"
            />
          </div>
        </div>
        
        {/* Advanced Parameters (Collapsible) */}
        <div className="mb-4">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Parameters</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 ml-1 transition-transform duration-200 ${showAdvanced ? 'transform rotate-180' : ''}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {showAdvanced && (
            <div className="mt-3 pl-4 border-l-4 border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature [°C]</label>
                  <input 
                    type="number" 
                    value={temperature} 
                    onChange={(e) => setTemperature(Number(e.target.value))} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="1"
                    min="-55"
                    max="125"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surface Roughness [mm]</label>
                  <input 
                    type="number" 
                    value={roughness} 
                    onChange={(e) => setRoughness(Number(e.target.value))} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="0.0001"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard values: smooth=0.0005mm, standard=0.0015mm
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
        
        {results === null && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p className="font-bold">Input Error or Unachievable Parameters</p>
            <p>Please check your input values. The desired parameters might be unachievable with the current settings, or some inputs might be invalid (e.g., zero or negative dimensions).</p>
          </div>
        )}

        {/* Microstrip Visualization */}
        {results && (
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-gray-700 mb-3">Microstrip Line Structure</h4>
            <div className="w-full h-40 relative bg-gray-100 border border-gray-300 rounded overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
                <rect x="50" y="110" width="300" height="10" fill="#B87333" />
                <rect x="50" y="50" width="300" height="60" fill={useCustomMaterial ? "#E6F2FF" : "#D1E8E2"} />
                
                {(() => {
                    let display_w_for_svg_unscaled: number;
                    if (calculationMode === 'impedance' && results.calculatedWidth !== undefined) {
                        display_w_for_svg_unscaled = results.calculatedWidth;
                    } else {
                        display_w_for_svg_unscaled = stripWidth;
                    }
                    const svg_rect_width_scaled = substrateHeight > 0 
                        ? Math.min(300, Math.max(10, (display_w_for_svg_unscaled / substrateHeight) * 100))
                        : 50;

                    return (
                        <rect 
                            x={50 + (300 - svg_rect_width_scaled) / 2}
                            y="40" 
                            width={svg_rect_width_scaled}
                            height="10" 
                            fill="#B87333" 
                            className="transition-all duration-300 ease-in-out"
                        />
                    );
                })()}
                
                <line x1="40" y1="40" x2="40" y2="120" stroke="#555" strokeWidth="1" strokeDasharray="5,5" />
                <line x1="40" y1="40" x2="30" y2="40" stroke="#555" strokeWidth="1" />
                <line x1="40" y1="50" x2="30" y2="50" stroke="#555" strokeWidth="1" />
                <line x1="40" y1="110" x2="30" y2="110" stroke="#555" strokeWidth="1" />
                <line x1="40" y1="120" x2="30" y2="120" stroke="#555" strokeWidth="1" />
                <text x="20" y="45" fontSize="10" textAnchor="end" fill="#555">t</text>
                <text x="20" y="80" fontSize="10" textAnchor="end" fill="#555">h</text>
                <text x="20" y="115" fontSize="10" textAnchor="end" fill="#555">t</text>
                <text x="35" y="75" fontSize="10" transform="rotate(-90, 35, 75)" textAnchor="middle" fill="#555">Substrate (εr)</text>
                
                {(() => {
                    let display_w_for_svg_unscaled: number;
                    if (calculationMode === 'impedance' && results.calculatedWidth !== undefined) {
                        display_w_for_svg_unscaled = results.calculatedWidth;
                    } else {
                        display_w_for_svg_unscaled = stripWidth;
                    }
                    const svg_rect_width_scaled = substrateHeight > 0
                        ? Math.min(300, Math.max(10, (display_w_for_svg_unscaled / substrateHeight) * 100))
                        : 50;
                    return (
                        <>
                            <line x1={50 + (300 - svg_rect_width_scaled) / 2} y1="30" x2={50 + (300 - svg_rect_width_scaled) / 2 + svg_rect_width_scaled} y2="30" stroke="#555" strokeWidth="1" />
                            <text x={50 + (300 - svg_rect_width_scaled) / 2 + svg_rect_width_scaled / 2} y="25" fontSize="10" textAnchor="middle" fill="#555">w</text>
                        </>
                    );
                })()}
              </svg>
            </div>
            <div className="text-xs text-center text-gray-500 mt-1">Cross-section view (not to scale)</div>
          </div>
        )}
        
        {/* Primary Results */}
        {results && (
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-base text-gray-700">Geometry & Impedance</h4>
                
                {calculationMode === 'impedance' && results.calculatedWidth !== undefined && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Required Width (w):</p>
                    <p className="font-bold text-lg text-blue-600">{results.calculatedWidth.toFixed(3)} mm</p>
                  </div>
                )}
                
                {results.calculatedLength !== undefined && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Quarter-Wave Length (λ/4):</p>
                    <p className="font-semibold text-gray-800">{results.calculatedLength.toFixed(3)} mm</p>
                  </div>
                )}
                
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Impedance (Z₀):</p>
                  <p className={`font-semibold ${calculationMode === 'dimensions' ? 'text-blue-600 font-bold text-lg' : 'text-gray-800'}`}>
                    {results.impedance.toFixed(2)} Ω
                  </p>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Effective Dielectric Constant (εᵣₑ):</p>
                  <p className="font-semibold text-gray-800">{results.effectiveDielectricConstant.toFixed(3)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-base text-gray-700">Electrical Properties</h4>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Wavelength at {frequency} MHz:</p>
                  <p className="font-semibold text-gray-800">{results.wavelength.toFixed(2)} mm</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Electrical Length ({stripLength} mm):</p>
                  <p className="font-semibold text-gray-800">{results.phaseLengthDeg.toFixed(1)}° ({results.electricalLength.toFixed(3)} rad)</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Propagation Delay ({stripLength} mm):</p>
                  <p className="font-semibold text-gray-800">{results.propagationDelay.toFixed(3)} ns</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loss Calculation Results */}
        {results && (
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-gray-700 mb-2">Loss Calculation (for {stripLength} mm length)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <p className="text-sm text-gray-600">Conductor Loss:</p>
                <p className="font-semibold text-gray-800">{isNaN(results.conductorLoss) ? "N/A" : results.conductorLoss.toFixed(3) + " dB"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dielectric Loss:</p>
                <p className="font-semibold text-gray-800">{isNaN(results.dielectricLoss) ? "N/A" : results.dielectricLoss.toFixed(3) + " dB"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Loss:</p>
                <p className="font-bold text-blue-600">{isNaN(results.totalLoss) ? "N/A" : results.totalLoss.toFixed(3) + " dB"}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Design Considerations */}
        {results && (
          <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">Design Considerations</h4>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
              <li>For {frequency >= 1000 ? 'high' : 'low'} frequency design ({frequency} MHz), keep trace length as short as possible to minimize losses. Total loss for {stripLength}mm is {isNaN(results.totalLoss) ? "N/A" : results.totalLoss.toFixed(3) + " dB"}.</li>
              <li>Ensure minimum trace width (calculated: {results.calculatedWidth ? results.calculatedWidth.toFixed(3) + " mm" : "N/A for current mode"}) is compatible with your PCB fabrication capabilities.</li>
              <li>For impedance-controlled PCBs, specify {targetImpedance}Ω (typically ±10%) to manufacturer. Current calculated impedance is {results.impedance.toFixed(2)}Ω.</li>
              <li>Consider adding test coupons for impedance verification.</li>
              {results.calculatedLength && <li>Quarter-wave sections ({results.calculatedLength.toFixed(2)} mm at {frequency} MHz) can be used for impedance matching networks.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ======================== PARAMETER CONVERTER SUB-CALCULATOR ========================

interface ParameterConverterSubCalculatorProps {
  onShowTutorial?: () => void;
}

// Default complex number
const defaultComplex: ComplexNumber = { real: 0, imag: 0 };

// Create a Complex number helper class
class Complex {
  static add(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    return {
      real: a.real + b.real,
      imag: a.imag + b.imag
    };
  }

  static subtract(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    return {
      real: a.real - b.real,
      imag: a.imag - b.imag
    };
  }

  static multiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    return {
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real
    };
  }

  static divide(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const denominator = b.real * b.real + b.imag * b.imag;
    if (denominator === 0) {
      return { real: NaN, imag: NaN };
    }
    return {
      real: (a.real * b.real + a.imag * b.imag) / denominator,
      imag: (a.imag * b.real - a.real * b.imag) / denominator
    };
  }

  static inverse(a: ComplexNumber): ComplexNumber {
    const denominator = a.real * a.real + a.imag * a.imag;
    if (denominator === 0) {
      return { real: NaN, imag: NaN };
    }
    return {
      real: a.real / denominator,
      imag: -a.imag / denominator
    };
  }

  static magnitude(a: ComplexNumber): number {
    return Math.sqrt(a.real * a.real + a.imag * a.imag);
  }

  static phase(a: ComplexNumber): number {
    return Math.atan2(a.imag, a.real) * 180 / Math.PI;
  }

  static toString(a: ComplexNumber, precision: number = 4): string {
    const realPart = a.real.toFixed(precision);
    const imagPart = Math.abs(a.imag).toFixed(precision);
    
    if (a.imag === 0) {
      return realPart;
    } else if (a.real === 0) {
      return a.imag > 0 ? `j${imagPart}` : `-j${imagPart}`;
    } else {
      return a.imag > 0 ? `${realPart} + j${imagPart}` : `${realPart} - j${imagPart}`;
    }
  }

  static fromPolar(magnitude: number, phaseInDegrees: number): ComplexNumber {
    const phaseInRadians = phaseInDegrees * Math.PI / 180;
    return {
      real: magnitude * Math.cos(phaseInRadians),
      imag: magnitude * Math.sin(phaseInRadians)
    };
  }
}

// Matrix operations
class Matrix {
  static determinant(m: Matrix2x2): ComplexNumber {
    return Complex.subtract(
      Complex.multiply(m.m11, m.m22),
      Complex.multiply(m.m12, m.m21)
    );
  }

  static inverse(m: Matrix2x2): Matrix2x2 {
    const det = Matrix.determinant(m);
    return {
      m11: Complex.divide(m.m22, det),
      m12: Complex.divide({ real: -m.m12.real, imag: -m.m12.imag }, det),
      m21: Complex.divide({ real: -m.m21.real, imag: -m.m21.imag }, det),
      m22: Complex.divide(m.m11, det)
    };
  }
}

const ParameterConverterSubCalculator: React.FC<ParameterConverterSubCalculatorProps> = ({ onShowTutorial }) => {
  // State for selected parameter type
  const [parameterType, setParameterType] = useState<ParameterType>('S');
  
  // State for input format (rectangular or polar)
  const [inputFormat, setInputFormat] = useState<'rectangular' | 'polar'>('rectangular');
  
  // State for input parameters
  const [inputs, setInputs] = useState<ParameterInputs>({
    p11: { ...defaultComplex },
    p12: { ...defaultComplex },
    p21: { ...defaultComplex },
    p22: { ...defaultComplex },
    frequency: 1000, // MHz
    z0: 50 // Ohms
  });

  // State for polar input values (magnitude and phase)
  const [polarInputs, setPolarInputs] = useState({
    p11: { magnitude: 0, phase: 0 },
    p12: { magnitude: 0, phase: 0 },
    p21: { magnitude: 0, phase: 0 },
    p22: { magnitude: 0, phase: 0 }
  });

  // State for calculation results
  const [results, setResults] = useState<{
    S: Matrix2x2;
    ABCD: Matrix2x2;
    Y: Matrix2x2;
    Z: Matrix2x2;
  } | null>(null);

  // State for calculation errors
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Update polarInputs when inputs change (for rectangular to polar conversion)
  useEffect(() => {
    if (inputFormat === 'rectangular') {
      setPolarInputs({
        p11: { 
          magnitude: Complex.magnitude(inputs.p11), 
          phase: Complex.phase(inputs.p11) 
        },
        p12: { 
          magnitude: Complex.magnitude(inputs.p12), 
          phase: Complex.phase(inputs.p12) 
        },
        p21: { 
          magnitude: Complex.magnitude(inputs.p21), 
          phase: Complex.phase(inputs.p21) 
        },
        p22: { 
          magnitude: Complex.magnitude(inputs.p22), 
          phase: Complex.phase(inputs.p22) 
        }
      });
    }
  }, [inputs, inputFormat]);

  // Update inputs when polarInputs change (for polar to rectangular conversion)
  useEffect(() => {
    if (inputFormat === 'polar') {
      setInputs(prev => ({
        ...prev,
        p11: Complex.fromPolar(polarInputs.p11.magnitude, polarInputs.p11.phase),
        p12: Complex.fromPolar(polarInputs.p12.magnitude, polarInputs.p12.phase),
        p21: Complex.fromPolar(polarInputs.p21.magnitude, polarInputs.p21.phase),
        p22: Complex.fromPolar(polarInputs.p22.magnitude, polarInputs.p22.phase)
      }));
    }
  }, [polarInputs, inputFormat]);

  // Handle input changes for rectangular format
  const handleInputChange = (parameter: keyof ParameterInputs, value: number | ComplexNumber) => {
    setInputs(prev => ({
      ...prev,
      [parameter]: value
    }));
  };

  // Handle complex input changes
  const handleComplexInputChange = (
    parameter: 'p11' | 'p12' | 'p21' | 'p22', 
    part: 'real' | 'imag', 
    value: number
  ) => {
    setInputs(prev => ({
      ...prev,
      [parameter]: {
        ...prev[parameter],
        [part]: value
      }
    }));
  };

  // Handle polar input changes
  const handlePolarInputChange = (
    parameter: 'p11' | 'p12' | 'p21' | 'p22',
    part: 'magnitude' | 'phase',
    value: number
  ) => {
    setPolarInputs(prev => ({
      ...prev,
      [parameter]: {
        ...prev[parameter],
        [part]: value
      }
    }));
  };

  // Convert from S parameters to Z parameters
  const StoZ = (s: Matrix2x2, z0: number): Matrix2x2 => {
    const z0Complex: ComplexNumber = { real: z0, imag: 0 };
    const one: ComplexNumber = { real: 1, imag: 0 };
    
    // Calculate denominator: (1-S11)*(1-S22) - S12*S21
    const term1 = Complex.multiply(
      Complex.subtract(one, s.m11),
      Complex.subtract(one, s.m22)
    );
    const term2 = Complex.multiply(s.m12, s.m21);
    const denominator = Complex.subtract(term1, term2);
    
    // Calculate Z11 = Z0 * ((1+S11)*(1-S22) + S12*S21) / denominator
    const z11Numerator = Complex.add(
      Complex.multiply(
        Complex.add(one, s.m11),
        Complex.subtract(one, s.m22)
      ),
      Complex.multiply(s.m12, s.m21)
    );
    const z11 = Complex.multiply(
      z0Complex,
      Complex.divide(z11Numerator, denominator)
    );
    
    // Calculate Z12 = Z0 * 2*S12 / denominator
    const z12Numerator = Complex.multiply({ real: 2, imag: 0 }, s.m12);
    const z12 = Complex.multiply(
      z0Complex,
      Complex.divide(z12Numerator, denominator)
    );
    
    // Calculate Z21 = Z0 * 2*S21 / denominator
    const z21Numerator = Complex.multiply({ real: 2, imag: 0 }, s.m21);
    const z21 = Complex.multiply(
      z0Complex,
      Complex.divide(z21Numerator, denominator)
    );
    
    // Calculate Z22 = Z0 * ((1-S11)*(1+S22) + S12*S21) / denominator
    const z22Numerator = Complex.add(
      Complex.multiply(
        Complex.subtract(one, s.m11),
        Complex.add(one, s.m22)
      ),
      Complex.multiply(s.m12, s.m21)
    );
    const z22 = Complex.multiply(
      z0Complex,
      Complex.divide(z22Numerator, denominator)
    );
    
    return { m11: z11, m12: z12, m21: z21, m22: z22 };
  };
  
  // Convert from Z parameters to S parameters
  const ZtoS = (z: Matrix2x2, z0: number): Matrix2x2 => {
    const z0Complex: ComplexNumber = { real: z0, imag: 0 };
    
    // Calculate denominator: (Z11+Z0)*(Z22+Z0) - Z12*Z21
    const term1 = Complex.multiply(
      Complex.add(z.m11, z0Complex),
      Complex.add(z.m22, z0Complex)
    );
    const term2 = Complex.multiply(z.m12, z.m21);
    const denominator = Complex.subtract(term1, term2);
    
    // Calculate S11 = ((Z11-Z0)*(Z22+Z0) - Z12*Z21) / denominator
    const s11Numerator = Complex.subtract(
      Complex.multiply(
        Complex.subtract(z.m11, z0Complex),
        Complex.add(z.m22, z0Complex)
      ),
      Complex.multiply(z.m12, z.m21)
    );
    const s11 = Complex.divide(s11Numerator, denominator);
    
    // Calculate S12 = 2*Z0*Z12 / denominator
    const s12Numerator = Complex.multiply(
      Complex.multiply({ real: 2, imag: 0 }, z0Complex),
      z.m12
    );
    const s12 = Complex.divide(s12Numerator, denominator);
    
    // Calculate S21 = 2*Z0*Z21 / denominator
    const s21Numerator = Complex.multiply(
      Complex.multiply({ real: 2, imag: 0 }, z0Complex),
      z.m21
    );
    const s21 = Complex.divide(s21Numerator, denominator);
    
    // Calculate S22 = ((Z22-Z0)*(Z11+Z0) - Z12*Z21) / denominator
    const s22Numerator = Complex.subtract(
      Complex.multiply(
        Complex.subtract(z.m22, z0Complex),
        Complex.add(z.m11, z0Complex)
      ),
      Complex.multiply(z.m12, z.m21)
    );
    const s22 = Complex.divide(s22Numerator, denominator);
    
    return { m11: s11, m12: s12, m21: s21, m22: s22 };
  };
  
  // Convert from Z parameters to Y parameters
  const ZtoY = (z: Matrix2x2): Matrix2x2 => {
    // Y = Z^-1
    return Matrix.inverse(z);
  };
  
  // Convert from Y parameters to Z parameters
  const YtoZ = (y: Matrix2x2): Matrix2x2 => {
    // Z = Y^-1
    return Matrix.inverse(y);
  };
  
  // Convert from Z parameters to ABCD parameters
  const ZtoABCD = (z: Matrix2x2): Matrix2x2 => {
    // A = Z11/Z21
    const a = Complex.divide(z.m11, z.m21);
    
    // B = (Z11*Z22 - Z12*Z21)/Z21 = det(Z)/Z21
    const b = Complex.divide(Matrix.determinant(z), z.m21);
    
    // C = 1/Z21
    const c = Complex.inverse(z.m21);
    
    // D = Z22/Z21
    const d = Complex.divide(z.m22, z.m21);
    
    return { m11: a, m12: b, m21: c, m22: d };
  };
  
  // Convert from ABCD parameters to Z parameters
  const ABCDtoZ = (abcd: Matrix2x2): Matrix2x2 => {
    // Z11 = A/C
    const z11 = Complex.divide(abcd.m11, abcd.m21);
    
    // Z12 = (A*D - B*C)/C = det(ABCD)/C
    const z12 = Complex.divide(Matrix.determinant(abcd), abcd.m21);
    
    // Z21 = 1/C
    const z21 = Complex.inverse(abcd.m21);
    
    // Z22 = D/C
    const z22 = Complex.divide(abcd.m22, abcd.m21);
    
    return { m11: z11, m12: z12, m21: z21, m22: z22 };
  };

  // Function to convert all parameters
  const convertParameters = () => {
    try {
      setCalculationError(null);
      
      let zParams: Matrix2x2;
      let sParams: Matrix2x2;
      let yParams: Matrix2x2;
      let abcdParams: Matrix2x2;
      
      // Start by creating the matrix based on the selected parameter type
      const inputMatrix: Matrix2x2 = {
        m11: inputs.p11,
        m12: inputs.p12,
        m21: inputs.p21,
        m22: inputs.p22
      };
      
      // Convert to Z parameters first as a common intermediate
      switch (parameterType) {
        case 'S':
          zParams = StoZ(inputMatrix, inputs.z0);
          sParams = inputMatrix;
          break;
          
        case 'Z':
          zParams = inputMatrix;
          sParams = ZtoS(zParams, inputs.z0);
          break;
          
        case 'Y':
          zParams = YtoZ(inputMatrix);
          sParams = ZtoS(zParams, inputs.z0);
          break;
          
        case 'ABCD':
          zParams = ABCDtoZ(inputMatrix);
          sParams = ZtoS(zParams, inputs.z0);
          break;
          
        default:
          throw new Error("Invalid parameter type");
      }
      
      // Calculate the remaining parameter types
      yParams = ZtoY(zParams);
      abcdParams = ZtoABCD(zParams);
      
      // Set the results
      setResults({
        S: sParams,
        Z: zParams,
        Y: yParams,
        ABCD: abcdParams
      });
    } catch (error) {
      console.error("Calculation error:", error);
      setCalculationError("Error in parameter conversion. Check your input values and try again.");
    }
  };

  // Format the matrix display for results
  const formatMatrix = (matrix: Matrix2x2 | undefined, label: string) => {
    if (!matrix) return null;
    
    return (
      <div className="bg-white p-3 rounded-md mb-3 shadow-sm border border-gray-200">
        <h4 className="font-medium text-gray-700">{label} Parameters</h4>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m11)}</td>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m12)}</td>
              </tr>
              <tr>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m21)}</td>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m22)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm text-gray-600">{label}₁₁ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m11).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₁₁ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m11).toFixed(2)}°</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₁₂ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m12).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₁₂ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m12).toFixed(2)}°</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₁ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m21).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₁ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m21).toFixed(2)}°</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₂ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m22).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₂ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m22).toFixed(2)}°</p>
          </div>
        </div>
      </div>
    );
  };

  // Format a 2x2 parameter matrix for display
  const parameterDisplayNames: Record<ParameterType, string> = {
    'S': 'Scattering (S)',
    'Z': 'Impedance (Z)',
    'Y': 'Admittance (Y)',
    'ABCD': 'Transmission (ABCD)'
  };

  // Unit labels for each parameter type
  const parameterUnits: Record<ParameterType, string> = {
    'S': 'dimensionless',
    'Z': 'Ω (ohms)',
    'Y': 'S (siemens)',
    'ABCD': 'mixed'
  };

  // Parameter descriptions
  const parameterDescriptions: Record<ParameterType, string> = {
    'S': 'Scattering parameters represent reflection and transmission coefficients',
    'Z': 'Impedance parameters relate voltages to currents',
    'Y': 'Admittance parameters relate currents to voltages',
    'ABCD': 'Transmission parameters relate input voltage/current to output voltage/current'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-4 text-gray-700">Parameter Input</h3>
        
        {/* Parameter Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Parameter Type</label>
          <select
            value={parameterType}
            onChange={(e) => setParameterType(e.target.value as ParameterType)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="S">Scattering (S) Parameters</option>
            <option value="Z">Impedance (Z) Parameters</option>
            <option value="Y">Admittance (Y) Parameters</option>
            <option value="ABCD">Transmission (ABCD) Parameters</option>
          </select>
          <p className="text-xs mt-1 text-gray-500">{parameterDescriptions[parameterType]}</p>
        </div>
        
        {/* Input Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Input Format</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input type="radio" name="inputFormat" checked={inputFormat === 'rectangular'} onChange={() => setInputFormat('rectangular')} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
              <span className="text-sm text-gray-700">Rectangular (Real + Imaginary)</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="inputFormat" checked={inputFormat === 'polar'} onChange={() => setInputFormat('polar')} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
              <span className="text-sm text-gray-700">Polar (Magnitude & Phase)</span>
            </label>
          </div>
        </div>
        
        {/* Global settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (MHz)</label>
            <input
              type="number"
              value={inputs.frequency}
              onChange={(e) => handleInputChange('frequency', Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              step="any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Impedance (Z₀, Ω)</label>
            <input
              type="number"
              value={inputs.z0}
              onChange={(e) => handleInputChange('z0', Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              step="any"
            />
          </div>
        </div>
        
        {/* Parameter Matrix Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {parameterDisplayNames[parameterType]} Matrix Input ({parameterUnits[parameterType]})
          </label>
          
          <div className="bg-white p-3 rounded-md border border-gray-200 mb-4">
            {inputFormat === 'rectangular' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* P11 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₁</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Real</label>
                      <input
                        type="number"
                        value={inputs.p11.real}
                        onChange={(e) => handleComplexInputChange('p11', 'real', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Imag</label>
                      <input
                        type="number"
                        value={inputs.p11.imag}
                        onChange={(e) => handleComplexInputChange('p11', 'imag', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
                
                {/* P12 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₂</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Real</label>
                      <input
                        type="number"
                        value={inputs.p12.real}
                        onChange={(e) => handleComplexInputChange('p12', 'real', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Imag</label>
                      <input
                        type="number"
                        value={inputs.p12.imag}
                        onChange={(e) => handleComplexInputChange('p12', 'imag', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
                
                {/* P21 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₁</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Real</label>
                      <input
                        type="number"
                        value={inputs.p21.real}
                        onChange={(e) => handleComplexInputChange('p21', 'real', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Imag</label>
                      <input
                        type="number"
                        value={inputs.p21.imag}
                        onChange={(e) => handleComplexInputChange('p21', 'imag', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
                
                {/* P22 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₂</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Real</label>
                      <input
                        type="number"
                        value={inputs.p22.real}
                        onChange={(e) => handleComplexInputChange('p22', 'real', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Imag</label>
                      <input
                        type="number"
                        value={inputs.p22.imag}
                        onChange={(e) => handleComplexInputChange('p22', 'imag', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* P11 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₁</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                      <input
                        type="number"
                        value={polarInputs.p11.magnitude}
                        onChange={(e) => handlePolarInputChange('p11', 'magnitude', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                      <input
                        type="number"
                        value={polarInputs.p11.phase}
                        onChange={(e) => handlePolarInputChange('p11', 'phase', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
                
                {/* P12 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₂</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                      <input
                        type="number"
                        value={polarInputs.p12.magnitude}
                        onChange={(e) => handlePolarInputChange('p12', 'magnitude', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                      <input
                        type="number"
                        value={polarInputs.p12.phase}
                        onChange={(e) => handlePolarInputChange('p12', 'phase', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
                
                {/* P21 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₁</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                      <input
                        type="number"
                        value={polarInputs.p21.magnitude}
                        onChange={(e) => handlePolarInputChange('p21', 'magnitude', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                      <input
                        type="number"
                        value={polarInputs.p21.phase}
                        onChange={(e) => handlePolarInputChange('p21', 'phase', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
                
                {/* P22 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₂</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                      <input
                        type="number"
                        value={polarInputs.p22.magnitude}
                        onChange={(e) => handlePolarInputChange('p22', 'magnitude', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                      <input
                        type="number"
                        value={polarInputs.p22.phase}
                        onChange={(e) => handlePolarInputChange('p22', 'phase', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        step="any"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Convert Button */}
        <div className="flex justify-center">
          <button
            onClick={convertParameters}
            className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
          >
            Convert Parameters
          </button>
        </div>

        {/* Error Display */}
        {calculationError && (
          <div className="mt-4 bg-red-100 p-3 rounded-md border border-red-300">
            <p className="text-sm text-red-700">{calculationError}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
        
        {!results ? (
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200 text-center">
            <p className="text-gray-500">Enter values and click "Convert Parameters" to see results</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
              <h4 className="font-medium text-base text-gray-700">Conversion Summary</h4>
              <p className="text-sm text-gray-600 mt-2">
                Converted from {parameterDisplayNames[parameterType]} at {inputs.frequency} MHz with Z₀ = {inputs.z0} Ω
              </p>
              
              {/* Parameter Determinants - useful to verify valid network */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Z Matrix Determinant:</p>
                  <p className="font-semibold text-gray-800">
                    {Complex.toString(Matrix.determinant(results.Z))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reciprocal Network:</p>
                  <p className="font-semibold text-gray-800">
                    {Complex.magnitude(Complex.subtract(results.Z.m12, results.Z.m21)) < 0.0001 ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Display different parameter matrices */}
            {formatMatrix(results.S, 'S')}
            {formatMatrix(results.Z, 'Z')}
            {formatMatrix(results.Y, 'Y')}
            {formatMatrix(results.ABCD, 'ABCD')}
          </>
        )}
        
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Network Properties</h4>
          {results ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {/* Show network properties based on S-parameters */}
              <div>
                <p className="text-blue-800">Input Return Loss:</p>
                <p className="font-semibold text-blue-900">
                  {(-20 * Math.log10(Complex.magnitude(results.S.m11))).toFixed(2)} dB
                </p>
              </div>
              <div>
                <p className="text-blue-800">Output Return Loss:</p>
                <p className="font-semibold text-blue-900">
                  {(-20 * Math.log10(Complex.magnitude(results.S.m22))).toFixed(2)} dB
                </p>
              </div>
              <div>
                <p className="text-blue-800">Forward Insertion Loss:</p>
                <p className="font-semibold text-blue-900">
                  {(-20 * Math.log10(Complex.magnitude(results.S.m21))).toFixed(2)} dB
                </p>
              </div>
              <div>
                <p className="text-blue-800">Reverse Insertion Loss:</p>
                <p className="font-semibold text-blue-900">
                  {(-20 * Math.log10(Complex.magnitude(results.S.m12))).toFixed(2)} dB
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-blue-800">Convert parameters to see network properties</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpedanceMatchingCalculator;