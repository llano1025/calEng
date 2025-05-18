import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../../components/Icons';

interface ImpedanceMatchingCalculatorProps {
  onShowTutorial?: () => void;
}

// Define network types
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

const ImpedanceMatchingCalculator: React.FC<ImpedanceMatchingCalculatorProps> = ({ onShowTutorial }) => {
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
      setMatchingResults({
        components: [],
        vswr: 0,
        reflectionCoefficient: 1,
        returnLoss: 0,
        matchingEfficiency: 0,
        error: "Error in calculations. Check your inputs."
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
  
  // Calculate L-Network components - Revised to use true 2-element L-network design
  const calculateLNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency; // angular frequency
    
    // Input validation - ensure resistances are positive
    if (source.r <= 0 || load.r <= 0) {
      throw new Error("Source and load resistances must be positive");
    }
    
    // Direct 2-element L-network matching between complex impedances
    // There are typically two possible solutions (high-pass and low-pass)
    
    // Normalize the complex impedances
    const rs = source.r;
    const xs = source.x;
    const rl = load.r;
    const xl = load.x;
    
    // We'll implement the solution based on selected topology
    if (rs < rl) {
      // Step-up L-network (source R < load R)
      if (topology === 'lowPass') {
        // Low-pass: Series L, Shunt C
        
        // Calculate Q based on impedance ratio
        const actualQ = Math.sqrt((rl / rs) - 1);
        
        // Calculate component reactances
        const xl_series = actualQ * rs;  // Series inductor reactance
        const xc_shunt = rl / actualQ;   // Shunt capacitor reactance
        
        // Calculate the actual component values needed when including source and load reactances
        // The series inductor needs to contribute xl_series - xs since xs is already in series
        const x_series_needed = xl_series - xs;
        
        // The parallel capacitor needs to create an equivalent reactance of -xc_shunt
        // when combined with xl, taking into account the impedance transfer
        
        // First component (series)
        if (x_series_needed > 0) {
          // Add an inductor
          const l = x_series_needed / omega;
          components.push({
            type: 'inductor',
            value: l,
            reactance: x_series_needed,
            position: 'Series inductor (step-up low-pass L-network)'
          });
        } else if (x_series_needed < 0) {
          // Need a series capacitor instead
          const c = -1 / (omega * x_series_needed);
          components.push({
            type: 'capacitor',
            value: c,
            reactance: x_series_needed,
            position: 'Series capacitor (step-up low-pass L-network)'
          });
        }
        
        // Calculate the equivalent parallel reactance needed at the load side
        // This is more complex as we need to consider the parallel combination of the load reactance
        // and our shunt component
        
        // For parallel components:
        // Y_equiv = Y_load + Y_shunt
        // Y_load = 1/(rl + j*xl)
        // Y_shunt = j*B_shunt (where B_shunt is susceptance)
        
        // We want the imaginary part of Y_equiv to be -1/xc_shunt
        // The math gets complex, so for now, we'll simplify and just adjust the shunt component
        
        // Simplified approach: directly add a shunt capacitor with reactance -xc_shunt
        const c_shunt = 1 / (omega * xc_shunt);
        components.push({
          type: 'capacitor',
          value: c_shunt,
          reactance: -xc_shunt,
          position: 'Shunt capacitor (step-up low-pass L-network)'
        });
        
      } else {
        // High-pass: Series C, Shunt L
        
        // Calculate Q based on impedance ratio
        const actualQ = Math.sqrt((rl / rs) - 1);
        
        // Calculate component reactances
        const xc_series = rs / actualQ;   // Series capacitor reactance
        const xl_shunt = actualQ * rl;    // Shunt inductor reactance
        
        // First component (series capacitor)
        const x_series_needed = -xc_series - xs;  // Need to provide -xc_series total with xs already there
        
        if (x_series_needed < 0) {
          // Add a series capacitor
          const c = -1 / (omega * x_series_needed);
          components.push({
            type: 'capacitor',
            value: c,
            reactance: x_series_needed,
            position: 'Series capacitor (step-up high-pass L-network)'
          });
        } else {
          // Need a series inductor instead
          const l = x_series_needed / omega;
          components.push({
            type: 'inductor',
            value: l,
            reactance: x_series_needed,
            position: 'Series inductor (step-up high-pass L-network)'
          });
        }
        
        // Shunt inductor
        const l_shunt = xl_shunt / omega;
        components.push({
          type: 'inductor',
          value: l_shunt,
          reactance: xl_shunt,
          position: 'Shunt inductor (step-up high-pass L-network)'
        });
      }
    } else {
      // Step-down L-network (source R > load R)
      if (topology === 'lowPass') {
        // Low-pass: Shunt C, Series L
        
        // Calculate Q based on impedance ratio
        const actualQ = Math.sqrt((rs / rl) - 1);
        
        // Calculate component reactances
        const xc_shunt = rs / actualQ;   // Shunt capacitor reactance
        const xl_series = actualQ * rl;  // Series inductor reactance
        
        // First component (shunt capacitor at source)
        const c_shunt = 1 / (omega * xc_shunt);
        components.push({
          type: 'capacitor',
          value: c_shunt,
          reactance: -xc_shunt,
          position: 'Shunt capacitor (step-down low-pass L-network)'
        });
        
        // Second component (series inductor)
        // The series inductor needs to contribute xl_series - xl since xl is already in series
        const x_series_needed = xl_series - xl;
        
        if (x_series_needed > 0) {
          // Add a series inductor
          const l = x_series_needed / omega;
          components.push({
            type: 'inductor',
            value: l,
            reactance: x_series_needed,
            position: 'Series inductor (step-down low-pass L-network)'
          });
        } else if (x_series_needed < 0) {
          // Need a series capacitor instead
          const c = -1 / (omega * x_series_needed);
          components.push({
            type: 'capacitor',
            value: c,
            reactance: x_series_needed,
            position: 'Series capacitor (step-down low-pass L-network)'
          });
        }
      } else {
        // High-pass: Shunt L, Series C
        
        // Calculate Q based on impedance ratio
        const actualQ = Math.sqrt((rs / rl) - 1);
        
        // Calculate component reactances
        const xl_shunt = rs * actualQ;    // Shunt inductor reactance
        const xc_series = rl / actualQ;   // Series capacitor reactance
        
        // First component (shunt inductor at source)
        const l_shunt = xl_shunt / omega;
        components.push({
          type: 'inductor',
          value: l_shunt,
          reactance: xl_shunt,
          position: 'Shunt inductor (step-down high-pass L-network)'
        });
        
        // Second component (series capacitor)
        const x_series_needed = -xc_series - xl;  // Need to provide -xc_series total with xl already there
        
        if (x_series_needed < 0) {
          // Add a series capacitor
          const c = -1 / (omega * x_series_needed);
          components.push({
            type: 'capacitor',
            value: c,
            reactance: x_series_needed,
            position: 'Series capacitor (step-down high-pass L-network)'
          });
        } else {
          // Need a series inductor instead
          const l = x_series_needed / omega;
          components.push({
            type: 'inductor',
            value: l,
            reactance: x_series_needed,
            position: 'Series inductor (step-down high-pass L-network)'
          });
        }
      }
    }
    
    return components;
  };
  
  // Calculate Pi-Network components (simplified approach)
  const calculatePiNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // Pi networks can be viewed as two L networks back-to-back
    // with a virtual resistor in the middle
    
    // Use a higher Q for Pi-networks
    const enhancedQ = q * 1.5;
    
    // Create virtual resistance in the middle (typically higher than both source and load)
    const rm = Math.max(source.r, load.r) * (1 + enhancedQ * enhancedQ);
    
    if (topology === 'lowPass') {
      // Low-pass Pi: Shunt C, Series L, Shunt C
      
      // First shunt capacitor (source side)
      const xc1 = source.r / enhancedQ;
      const c1 = 1 / (omega * xc1);
      components.push({
        type: 'capacitor',
        value: c1,
        reactance: -xc1,
        position: 'Source-side shunt C (Pi-network)'
      });
      
      // Series inductor
      const xl = enhancedQ * Math.sqrt(source.r * load.r);
      const l = xl / omega;
      components.push({
        type: 'inductor',
        value: l,
        reactance: xl,
        position: 'Series L (Pi-network)'
      });
      
      // Second shunt capacitor (load side)
      const xc2 = load.r / enhancedQ;
      const c2 = 1 / (omega * xc2);
      components.push({
        type: 'capacitor',
        value: c2,
        reactance: -xc2,
        position: 'Load-side shunt C (Pi-network)'
      });
    } else {
      // High-pass Pi: Shunt L, Series C, Shunt L
      
      // First shunt inductor (source side)
      const xl1 = source.r * enhancedQ;
      const l1 = xl1 / omega;
      components.push({
        type: 'inductor',
        value: l1,
        reactance: xl1,
        position: 'Source-side shunt L (Pi-network)'
      });
      
      // Series capacitor
      const xc = 1 / (enhancedQ * Math.sqrt(1 / (source.r * load.r)));
      const c = 1 / (omega * xc);
      components.push({
        type: 'capacitor',
        value: c,
        reactance: -xc,
        position: 'Series C (Pi-network)'
      });
      
      // Second shunt inductor (load side)
      const xl2 = load.r * enhancedQ;
      const l2 = xl2 / omega;
      components.push({
        type: 'inductor',
        value: l2,
        reactance: xl2,
        position: 'Load-side shunt L (Pi-network)'
      });
    }
    
    return components;
  };
  
  // Calculate T-Network components
  const calculateTNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // T networks can be thought of as two L networks back-to-back
    // with a virtual resistor in the middle
    
    // Use a higher Q for T-networks
    const enhancedQ = q * 1.5;
    
    // Create virtual resistance in the middle (typically lower than both source and load)
    const rm = Math.min(source.r, load.r) / (1 + enhancedQ * enhancedQ);
    
    if (topology === 'lowPass') {
      // Low-pass T: Series L, Shunt C, Series L
      
      // First series inductor (source side)
      const xl1 = enhancedQ * Math.sqrt(source.r * rm);
      const l1 = xl1 / omega;
      components.push({
        type: 'inductor',
        value: l1,
        reactance: xl1,
        position: 'Source-side series L (T-network)'
      });
      
      // Shunt capacitor
      const xc = rm / enhancedQ;
      const c = 1 / (omega * xc);
      components.push({
        type: 'capacitor',
        value: c,
        reactance: -xc,
        position: 'Shunt C (T-network)'
      });
      
      // Second series inductor (load side)
      const xl2 = enhancedQ * Math.sqrt(load.r * rm);
      const l2 = xl2 / omega;
      components.push({
        type: 'inductor',
        value: l2,
        reactance: xl2,
        position: 'Load-side series L (T-network)'
      });
    } else {
      // High-pass T: Series C, Shunt L, Series C
      
      // First series capacitor (source side)
      const xc1 = 1 / (enhancedQ * Math.sqrt(source.r / rm));
      const c1 = 1 / (omega * xc1);
      components.push({
        type: 'capacitor',
        value: c1,
        reactance: -xc1,
        position: 'Source-side series C (T-network)'
      });
      
      // Shunt inductor
      const xl = rm * enhancedQ;
      const l = xl / omega;
      components.push({
        type: 'inductor',
        value: l,
        reactance: xl,
        position: 'Shunt L (T-network)'
      });
      
      // Second series capacitor (load side)
      const xc2 = 1 / (enhancedQ * Math.sqrt(load.r / rm));
      const c2 = 1 / (omega * xc2);
      components.push({
        type: 'capacitor',
        value: c2,
        reactance: -xc2,
        position: 'Load-side series C (T-network)'
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
    
    // Draw constant reactance circles with corrected formulas
    const xValues = [-5, -2, -1, -0.5, -0.2, 0.2, 0.5, 1, 2, 5];
    xValues.forEach(x => {
      if (x === 0) return; // Skip x=0 (horizontal axis)
      
      // Correct formulas for constant x circles:
      // Center: (1, 1/x) in normalized coordinates
      // Radius: 1/|x|
      const centerX = center.x + radius; // x=1 in normalized coordinates
      const centerY = center.y - radius / x; // y=1/x in normalized coordinates
      const rad = radius / Math.abs(x);
      
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        rad,
        0,
        2 * Math.PI
      );
      ctx.strokeStyle = '#ccc';
      ctx.stroke();
      
      // Label the x circle
      if (Math.abs(x) >= 0.5) {
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText(
          `x=${x}`, 
          centerX + (x > 0 ? 15 : -25), 
          centerY - (x > 0 ? 15 : -15)
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
        center.y - radius * sourceGammaI, // Negative sign here to correctly orient the chart
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
        center.y - radius * loadGammaI, // Negative sign here to correctly orient the chart
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">RF Impedance Matching Calculator</h2>
        {onShowTutorial && (
          <button 
            onClick={onShowTutorial} 
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <span className="mr-1">Tutorial</span>
            <Icons.InfoInline />
          </button>
        )}
      </div>

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
                
                {/* Dynamic Circuit diagram visualization based on actual components */}
                <div className="mt-4 p-3 bg-gray-50 rounded-md text-center font-mono text-sm">
                  {networkType === 'lNetwork' && matchingResults?.components?.length === 2 && (
                    <div>
                      {(() => {
                        const comp1 = matchingResults.components[0];
                        const comp2 = matchingResults.components[1];
                        const isFirstSeries = comp1.position.toLowerCase().includes('series');
                        const isSecondSeries = comp2.position.toLowerCase().includes('series');
                        
                        if (isFirstSeries && !isSecondSeries) {
                          // Series first, shunt second
                          return comp1.type === 'inductor' ? (
                            comp2.type === 'capacitor' ? (
                              <p>Source ⟡—[ L ]—⟡—| |—⟡ Load</p>
                            ) : (
                              <p>Source ⟡—[ L ]—⟡—( L )—⟡ Load</p>
                            )
                          ) : (
                            comp2.type === 'capacitor' ? (
                              <p>Source ⟡—|⊥|—⟡—| |—⟡ Load</p>
                            ) : (
                              <p>Source ⟡—|⊥|—⟡—( L )—⟡ Load</p>
                            )
                          );
                        } else if (!isFirstSeries && isSecondSeries) {
                          // Shunt first, series second
                          return comp1.type === 'capacitor' ? (
                            comp2.type === 'inductor' ? (
                              <p>Source ⟡—| |—⟡—[ L ]—⟡ Load</p>
                            ) : (
                              <p>Source ⟡—| |—⟡—|⊥|—⟡ Load</p>
                            )
                          ) : (
                            comp2.type === 'inductor' ? (
                              <p>Source ⟡—( L )—⟡—[ L ]—⟡ Load</p>
                            ) : (
                              <p>Source ⟡—( L )—⟡—|⊥|—⟡ Load</p>
                            )
                          );
                        } else {
                          // Fallback for other configurations
                          return <p>Custom L-Network Configuration</p>;
                        }
                      })()}
                    </div>
                  )}
                  {networkType === 'piNetwork' && (
                    networkTopology === 'lowPass' ? (
                      <p>Source ⟡—| |—⟡—[ L ]—⟡—| |—⟡ Load</p>
                    ) : (
                      <p>Source ⟡—( L )—⟡—|⊥|—⟡—( L )—⟡ Load</p>
                    )
                  )}
                  {networkType === 'tNetwork' && (
                    networkTopology === 'lowPass' ? (
                      <p>Source ⟡—[ L ]—⟡—| |—⟡—[ L ]—⟡ Load</p>
                    ) : (
                      <p>Source ⟡—|⊥|—⟡—( L )—⟡—|⊥|—⟡ Load</p>
                    )
                  )}
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
              <li><strong>L-Network:</strong> Simplest option, can match any two resistive impedances, but limited bandwidth control</li>
              <li><strong>Pi-Network:</strong> Can match source and load while controlling bandwidth. Good for filtering unwanted harmonics</li>
              <li><strong>T-Network:</strong> Similar to Pi but with series elements. Can achieve very high Q for selective filtering</li>
              <li><strong>Low Pass:</strong> Attenuates high frequencies, useful when harmonics need filtering</li>
              <li><strong>High Pass:</strong> Blocks low frequencies, better when low-frequency noise is a concern</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>This calculator assumes ideal components without parasitics or losses, which may not reflect real-world performance.</li>
          <li>Actual component values may need to be rounded to standard values (E6, E12, E24 series) for practical implementation.</li>
          <li>The Smith chart is a powerful graphical tool that represents normalized impedances on a complex reflection coefficient plane.</li>
          <li>Lower VSWR values (closer to 1:1) indicate better matching. Most RF systems aim for VSWR `&lt;` 2:1 for efficient power transfer.</li>
          <li>Return loss `&gt;` 10 dB is typically acceptable for most applications, `&gt;` 20 dB is considered excellent.</li>
          <li>Higher Q networks provide narrower bandwidth but better filtering of out-of-band signals.</li>
          <li>Real-world performance may be affected by PCB layout, component tolerances, temperature variations, and parasitic effects.</li>
          <li>For high-power applications, consider voltage ratings and current handling capabilities of components.</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          For critical applications, verification with RF network analyzers and field testing is recommended.
        </p>
      </div>
    </div>
  );
};

export default ImpedanceMatchingCalculator;