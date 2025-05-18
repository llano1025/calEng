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
  
  // Calculate L-Network components - updated to include the specialized variants
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
      
      if (rs < rl) {
        // Step-up L-network (source R < load R)
        if (topology === 'lowPass') {
          // Low-pass: Series L, Shunt C (LCLP configuration)
          // Directly implement the original LCLP method
          const rl = source.r;
          const xl = source.x;
          const rs = load.r;
          const xs = load.x;
          const qs = -xs / rs;
          const rp = rs * (1 + qs * qs);
          
          // Calculate Q based on impedance ratio - note this follows original LCLP function
          const actualQ = Math.sqrt(rp / rl - 1);
          if (isNaN(actualQ) || !isFinite(actualQ)) {
            throw new Error("Invalid Q factor calculated");
          }
          
          // Calculate L and C values
          const c1 = qs / (rp * omega);
          const l1 = xl / omega;
          
          // Calculate component values - note these mirror original LCLP calculation
          const cp = actualQ / (rp * omega);
          const c = cp - c1;
          const ls = actualQ * rl / omega;
          const l = ls - l1;
          
          // Add components to result
          if (isFinite(l) && l !== 0) {
            if (l > 0) {
              components.push({
                type: 'inductor',
                value: l,
                reactance: omega * l,
                position: 'Series inductor (LCLP configuration)'
              });
            } else {
              // Need a series capacitor instead
              const c_series = -1 / (omega * l);
              components.push({
                type: 'capacitor',
                value: c_series,
                reactance: -1 / (omega * c_series),
                position: 'Series capacitor (LCLP configuration)'
              });
            }
          }
          
          if (isFinite(c) && c !== 0) {
            if (c > 0) {
              components.push({
                type: 'capacitor',
                value: c,
                reactance: -1 / (omega * c),
                position: 'Shunt capacitor (LCLP configuration)'
              });
            } else {
              // Need a shunt inductor instead
              const l_shunt = -1 / (omega * c);
              components.push({
                type: 'inductor',
                value: l_shunt,
                reactance: omega * l_shunt,
                position: 'Shunt inductor (modified LCLP configuration)'
              });
            }
          }
        } else {
          // High-pass: Series C, Shunt L (LCHP configuration)
          // Implement matching LCHP logic
          const rl = source.r;
          const xl = source.x;
          const rs = load.r;
          const xs = load.x;
          const ql = -xl / rl;
          const qs = xs / rs;
          
          // Calculate inductance for source reactance compensation
          let l1 = 0;
          if (xs !== 0) {
            if (qs !== 0) {
              l1 = (1 + qs * qs) * xs / (omega * qs * qs);
            } else {
              throw new Error("Invalid source reactance calculation");
            }
          }
          
          // Calculate capacitance for load reactance
          let c1 = 0;
          if (xl !== 0) {
            c1 = -1 / (omega * xl);
          }
          
          // Calculate parallel equivalent of source impedance
          const rp = (1 + qs * qs) * rs;
          
          // Calculate Q based on impedance ratio
          const actualQ = Math.sqrt(rp / rl - 1);
          if (isNaN(actualQ) || !isFinite(actualQ)) {
            throw new Error("Invalid Q factor calculated");
          }
          
          // Calculate component values
          const lp = rp / (omega * actualQ);
          const cs = 1 / (actualQ * omega * rl);
          
          // Adjust for reactances
          let l = 0;
          let c = 0;
          
          if (xs === 0) {
            l = lp;
          } else {
            if (l1 === lp) {
              l = Number.POSITIVE_INFINITY;
            } else if (l1 - lp === 0) {
              throw new Error("Division by zero in inductor calculation");
            } else {
              l = lp * l1 / (l1 - lp);
            }
          }
          
          if (xl === 0) {
            c = cs;
          } else {
            if (c1 === cs) {
              c = Number.POSITIVE_INFINITY;
            } else if (c1 - cs === 0) {
              throw new Error("Division by zero in capacitor calculation");
            } else {
              c = c1 * cs / (c1 - cs);
            }
          }
          
          // Add components to result
          if (isFinite(c) && c > 0) {
            components.push({
              type: 'capacitor',
              value: c,
              reactance: -1 / (omega * c),
              position: 'Series capacitor (LCHP configuration)'
            });
          } else {
            // If c is invalid, use a simplified approach
            if (cs > 0 && isFinite(cs)) {
              components.push({
                type: 'capacitor',
                value: cs,
                reactance: -1 / (omega * cs),
                position: 'Series capacitor (LCHP configuration)'
              });
            } else {
              throw new Error("Invalid capacitor value calculated");
            }
          }
          
          if (isFinite(l) && l > 0) {
            components.push({
              type: 'inductor',
              value: l,
              reactance: omega * l,
              position: 'Shunt inductor (LCHP configuration)'
            });
          } else {
            // If l is invalid, use simplified value
            if (lp > 0 && isFinite(lp)) {
              components.push({
                type: 'inductor',
                value: lp,
                reactance: omega * lp,
                position: 'Shunt inductor (LCHP configuration)'
              });
            } else {
              throw new Error("Invalid inductor value calculated");
            }
          }
        }
      } else {
        // Step-down L-network (source R > load R)
        if (topology === 'lowPass') {
          // Low-pass: Shunt C, Series L (CLLP configuration)
          
          // Calculate key parameters - match original CLLP function
          const qs = -xs / rs;
          const ql = xl / rl;
          const rp = rs * (1 + qs * qs);
          
          // Calculate Q based on impedance ratio - follows original CLLP function
          const actualQ = Math.sqrt(rp / rl - 1);
          if (isNaN(actualQ) || !isFinite(actualQ)) {
            throw new Error("Invalid Q factor calculated");
          }
          
          // Calculate L and C values
          const c1 = qs / (rp * omega);
          const l1 = xl / omega;
          
          // Calculate component values - mirrors original CLLP calculation
          const cp = actualQ / (rp * omega);
          const c = cp - c1;
          const ls = actualQ * rl / omega;
          const l = ls - l1;
          
          // Add components to result
          if (isFinite(c) && c !== 0) {
            if (c > 0) {
              components.push({
                type: 'capacitor',
                value: c,
                reactance: -1 / (omega * c),
                position: 'Shunt capacitor (CLLP configuration)'
              });
            } else {
              // Need a shunt inductor instead
              const l_shunt = -1 / (omega * c);
              components.push({
                type: 'inductor',
                value: l_shunt,
                reactance: omega * l_shunt,
                position: 'Shunt inductor (modified CLLP configuration)'
              });
            }
          }
          
          if (isFinite(l) && l !== 0) {
            if (l > 0) {
              components.push({
                type: 'inductor',
                value: l,
                reactance: omega * l,
                position: 'Series inductor (CLLP configuration)'
              });
            } else {
              // Need a series capacitor instead
              const c_series = -1 / (omega * l);
              components.push({
                type: 'capacitor',
                value: c_series,
                reactance: -1 / (omega * c_series),
                position: 'Series capacitor (CLLP configuration)'
              });
            }
          }
        } else {
          // High-pass: Shunt L, Series C (CLHP configuration)
          
          // Implement matching the original CLHP calculation (with source and load swapped)
          const rs_clhp = rl;  // Swap source and load as in original CLHP
          const xs_clhp = xl;
          const rl_clhp = rs;
          const xl_clhp = xs;
          
          const ql_clhp = -xl_clhp / rl_clhp;
          const qs_clhp = xs_clhp / rs_clhp;
          
          // Calculate inductance for source reactance compensation
          let l1 = 0;
          if (xs_clhp !== 0) {
            if (qs_clhp !== 0) {
              l1 = (1 + qs_clhp * qs_clhp) * xs_clhp / (omega * qs_clhp * qs_clhp);
            } else {
              throw new Error("Invalid source reactance calculation");
            }
          }
          
          // Calculate capacitance for load reactance
          let c1 = 0;
          if (xl_clhp !== 0) {
            c1 = -1 / (omega * xl_clhp);
          }
          
          // Calculate parallel equivalent of source impedance
          const rp = (1 + qs_clhp * qs_clhp) * rs_clhp;
          
          // Calculate Q based on impedance ratio
          const actualQ = Math.sqrt(rp / rl_clhp - 1);
          if (isNaN(actualQ) || !isFinite(actualQ)) {
            throw new Error("Invalid Q factor calculated");
          }
          
          // Calculate component values
          const lp = rp / (omega * actualQ);
          const cs = 1 / (actualQ * omega * rl_clhp);
          
          // Adjust for reactances
          let l = 0;
          let c = 0;
          
          if (xs_clhp === 0) {
            l = lp;
          } else {
            if (l1 === lp) {
              l = Number.POSITIVE_INFINITY;
            } else if (l1 - lp === 0) {
              throw new Error("Division by zero in inductor calculation");
            } else {
              l = lp * l1 / (l1 - lp);
            }
          }
          
          if (xl_clhp === 0) {
            c = cs;
          } else {
            if (c1 === cs) {
              c = Number.POSITIVE_INFINITY;
            } else if (c1 - cs === 0) {
              throw new Error("Division by zero in capacitor calculation");
            } else {
              c = c1 * cs / (c1 - cs);
            }
          }
          
          // For CLHP, the shunt inductor comes first, then series capacitor
          if (isFinite(l) && l > 0) {
            components.push({
              type: 'inductor',
              value: l,
              reactance: omega * l,
              position: 'Shunt inductor (CLHP configuration)'
            });
          } else {
            // Fallback
            if (lp > 0 && isFinite(lp)) {
              components.push({
                type: 'inductor',
                value: lp,
                reactance: omega * lp,
                position: 'Shunt inductor (CLHP configuration)'
              });
            } else {
              throw new Error("Invalid inductor value calculated");
            }
          }
          
          if (isFinite(c) && c > 0) {
            components.push({
              type: 'capacitor',
              value: c,
              reactance: -1 / (omega * c),
              position: 'Series capacitor (CLHP configuration)'
            });
          } else {
            // Fallback
            if (cs > 0 && isFinite(cs)) {
              components.push({
                type: 'capacitor',
                value: cs,
                reactance: -1 / (omega * cs),
                position: 'Series capacitor (CLHP configuration)'
              });
            } else {
              throw new Error("Invalid capacitor value calculated");
            }
          }
        }
      }
      
      return components;
    } catch (error) {
      console.error("L-Network calculation error:", error);
      throw error; // Re-throw to be handled by the main calculation
    }
  };
  
  // Calculate Pi-Network components based on the original Pi() function
  const calculatePiNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    try {
      // Extract values from source and load
      const rs = source.r;
      const xs = source.x;
      const rl = load.r;
      const xl = load.x;
      
      if (q < 0) {
        throw new Error("Q factor must be positive for Pi network");
      }
      
      // Special case: if Q is 0 and Rs = Rl, no matching needed
      if (q === 0 && rs === rl) {
        return components;
      }
      
      // Verify if Q is sufficient for matching
      const minQ = Math.sqrt(Math.max(rs, rl) / Math.min(rs, rl) - 1);
      if (q < minQ) {
        throw new Error(`Q must be at least ${minQ.toFixed(2)} for Pi network with these impedances`);
      }
      
      // Calculate virtual resistance in the middle (as per original Pi function)
      const rv = Math.max(rs, rl) / (q * q + 1);
      if (rv <= 0 || !isFinite(rv)) {
        throw new Error("Invalid virtual resistance calculated");
      }
      
      // Find parallel circuit values
      const qs = -xs / rs;
      const ql = -xl / rl;
      const rps = rs * (1 + qs * qs);
      const rpl = rl * (1 + ql * ql);
      
      // Calculate parallel capacitances
      const cps = qs / (rps * omega);
      const cpl = ql / (rpl * omega);
      
      if (topology === 'lowPass') {
        // Low-pass Pi: Cs, L, Cl
        
        // Source side matching
        const q1 = Math.sqrt(rps / rv - 1);
        if (isNaN(q1) || !isFinite(q1)) {
          throw new Error("Invalid Q1 factor calculated for Pi network");
        }
        
        const cs = q1 / (omega * rps) - cps;
        
        // Load side matching
        const q2 = Math.sqrt(rpl / rv - 1);
        if (isNaN(q2) || !isFinite(q2)) {
          throw new Error("Invalid Q2 factor calculated for Pi network");
        }
        
        const cl = q2 / (omega * rpl) - cpl;
        
        // Series inductor
        const l = q1 * rv / omega + q2 * rv / omega;
        
        // Add components to result
        if (isFinite(cs) && cs !== 0) {
          components.push({
            type: 'capacitor',
            value: cs,
            reactance: -1 / (omega * cs),
            position: 'Source-side shunt capacitor (Pi-network)'
          });
        } else {
          throw new Error("Invalid source-side capacitor value");
        }
        
        if (isFinite(l) && l > 0) {
          components.push({
            type: 'inductor',
            value: l,
            reactance: omega * l,
            position: 'Series inductor (Pi-network)'
          });
        } else {
          throw new Error("Invalid inductor value");
        }
        
        if (isFinite(cl) && cl !== 0) {
          components.push({
            type: 'capacitor',
            value: cl,
            reactance: -1 / (omega * cl),
            position: 'Load-side shunt capacitor (Pi-network)'
          });
        } else {
          throw new Error("Invalid load-side capacitor value");
        }
      } else {
        // High-pass Pi: Ls, C, Ll
        
        // Source side matching
        const q1 = Math.sqrt(rps / rv - 1);
        if (isNaN(q1) || !isFinite(q1)) {
          throw new Error("Invalid Q1 factor calculated for Pi network");
        }
        
        let ls = rps / (omega * q1);
        
        // Account for source reactance
        if (qs !== 0) {
          const lps = rps / (qs * omega);
          if (ls === lps) {
            throw new Error("Division by zero in inductor calculation");
          }
          ls = ls * lps / (ls - lps);
        }
        
        // Load side matching
        const q2 = Math.sqrt(rpl / rv - 1);
        if (isNaN(q2) || !isFinite(q2)) {
          throw new Error("Invalid Q2 factor calculated for Pi network");
        }
        
        let ll = rpl / (omega * q2);
        
        // Account for load reactance
        if (ql !== 0) {
          const lpl = rpl / (ql * omega);
          if (ll === lpl) {
            throw new Error("Division by zero in inductor calculation");
          }
          ll = ll * lpl / (ll - lpl);
        }
        
        // Calculate series capacitor
        const cs = 1 / (omega * q1 * rv);
        const cl = 1 / (omega * q2 * rv);
        if (cs === 0 || cl === 0) {
          throw new Error("Division by zero in capacitor calculation");
        }
        
        const c = cs * cl / (cs + cl);
        
        // Add components to result
        if (isFinite(ls) && ls > 0) {
          components.push({
            type: 'inductor',
            value: ls,
            reactance: omega * ls,
            position: 'Source-side shunt inductor (Pi-network)'
          });
        } else {
          throw new Error("Invalid source-side inductor value");
        }
        
        if (isFinite(c) && c > 0) {
          components.push({
            type: 'capacitor',
            value: c,
            reactance: -1 / (omega * c),
            position: 'Series capacitor (Pi-network)'
          });
        } else {
          throw new Error("Invalid series capacitor value");
        }
        
        if (isFinite(ll) && ll > 0) {
          components.push({
            type: 'inductor',
            value: ll,
            reactance: omega * ll,
            position: 'Load-side shunt inductor (Pi-network)'
          });
        } else {
          throw new Error("Invalid load-side inductor value");
        }
      }
      
      return components;
    } catch (error) {
      console.error("Pi-Network calculation error:", error);
      throw error; // Re-throw to be handled by the main calculation
    }
  };
  
  // Calculate T-Network components based on the original Tnet() function
  const calculateTNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number, topology: NetworkTopology) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    try {
      // Extract values from source and load
      const rs = source.r;
      const xs = source.x;
      const rl = load.r;
      const xl = load.x;
      
      if (q < 0) {
        throw new Error("Q factor must be positive for T network");
      }
      
      // Special case: if Q is 0 and Rs = Rl, no matching needed
      if (q === 0 && rs === rl) {
        return components;
      }
      
      // Verify if Q is sufficient for matching
      const minQ = Math.sqrt(Math.max(rs, rl) / Math.min(rs, rl) - 1);
      if (q < minQ) {
        throw new Error(`Q must be at least ${minQ.toFixed(2)} for T network with these impedances`);
      }
      
      // Calculate virtual resistance in the middle (as per original Tnet function)
      const rv = Math.min(rs, rl) * (q * q + 1);
      if (rv <= 0 || !isFinite(rv)) {
        throw new Error("Invalid virtual resistance calculated");
      }
      
      if (topology === 'lowPass') {
        // Low-pass T: Ls, C, Ll
        
        // Source-side matching
        const q1 = Math.sqrt(rv / rs - 1);
        if (isNaN(q1) || !isFinite(q1)) {
          throw new Error("Invalid Q1 factor calculated for T network");
        }
        
        const ls = q1 * rs / omega - xs / omega;
        
        // Load-side matching
        const q2 = Math.sqrt(rv / rl - 1);
        if (isNaN(q2) || !isFinite(q2)) {
          throw new Error("Invalid Q2 factor calculated for T network");
        }
        
        const ll = q2 * rl / omega - xl / omega;
        
        // Shunt capacitor
        const c = (q1 + q2) / (omega * rv);
        
        // Add components to result
        if (isFinite(ls) && ls !== 0) {
          components.push({
            type: 'inductor',
            value: ls,
            reactance: omega * ls,
            position: 'Source-side series inductor (T-network)'
          });
        } else {
          throw new Error("Invalid source-side inductor value");
        }
        
        if (isFinite(c) && c > 0) {
          components.push({
            type: 'capacitor',
            value: c,
            reactance: -1 / (omega * c),
            position: 'Shunt capacitor (T-network)'
          });
        } else {
          throw new Error("Invalid shunt capacitor value");
        }
        
        if (isFinite(ll) && ll !== 0) {
          components.push({
            type: 'inductor',
            value: ll,
            reactance: omega * ll,
            position: 'Load-side series inductor (T-network)'
          });
        } else {
          throw new Error("Invalid load-side inductor value");
        }
      } else {
        // High-pass T: Cs, L, Cl
        
        // Source-side matching
        const q1 = Math.sqrt(rv / rs - 1);
        if (isNaN(q1) || !isFinite(q1)) {
          throw new Error("Invalid Q1 factor calculated for T network");
        }
        
        let cs = 1 / (omega * rs * q1);
        
        // Adjust for source reactance
        if (xs !== 0) {
          const cs_reactance = -1 / (omega * xs);
          if (cs === cs_reactance) {
            cs = Number.POSITIVE_INFINITY;
            throw new Error("Division by zero in source capacitor calculation");
          } else if (cs + cs_reactance === 0) {
            throw new Error("Division by zero in source capacitor adjustment");
          } else {
            cs = cs * cs_reactance / (cs + cs_reactance);
          }
        }
        
        // Load-side matching
        const q2 = Math.sqrt(rv / rl - 1);
        if (isNaN(q2) || !isFinite(q2)) {
          throw new Error("Invalid Q2 factor calculated for T network");
        }
        
        let cl = 1 / (omega * rl * q2);
        
        // Adjust for load reactance
        if (xl !== 0) {
          const cl_reactance = -1 / (omega * xl);
          if (cl === cl_reactance) {
            cl = Number.POSITIVE_INFINITY;
            throw new Error("Division by zero in load capacitor calculation");
          } else if (cl + cl_reactance === 0) {
            throw new Error("Division by zero in load capacitor adjustment");
          } else {
            cl = cl * cl_reactance / (cl + cl_reactance);
          }
        }
        
        // Shunt inductor
        const l = rv / (omega * (q1 + q2));
        
        // Add components to result
        if (isFinite(cs) && cs > 0) {
          components.push({
            type: 'capacitor',
            value: cs,
            reactance: -1 / (omega * cs),
            position: 'Source-side series capacitor (T-network)'
          });
        } else {
          throw new Error("Invalid source-side capacitor value");
        }
        
        if (isFinite(l) && l > 0) {
          components.push({
            type: 'inductor',
            value: l,
            reactance: omega * l,
            position: 'Shunt inductor (T-network)'
          });
        } else {
          throw new Error("Invalid shunt inductor value");
        }
        
        if (isFinite(cl) && cl > 0) {
          components.push({
            type: 'capacitor',
            value: cl,
            reactance: -1 / (omega * cl),
            position: 'Load-side series capacitor (T-network)'
          });
        } else {
          throw new Error("Invalid load-side capacitor value");
        }
      }
      
      return components;
    } catch (error) {
      console.error("T-Network calculation error:", error);
      throw error; // Re-throw to be handled by the main calculation
    }
  };
  
  // LCHP Network (LC High-Pass) based on the original LCHP() function
  const calculateLCHPNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // Extract values from source and load
    const rs = source.r;
    const xs = source.x;
    const rl = load.r;
    const xl = load.x;
    
    // Calculate key parameters
    const ql = -xl / rl;
    const qs = xs / rs;
    const c1 = -1 / (omega * xl);
    const l1 = (1 + qs * qs) * xs / (omega * qs * qs);
    const rp = (1 + qs * qs) * rs;
    
    // Use the load as the driving end (reversed in original LCHP)
    const r_source = rl;
    
    // Check if matching is possible
    if (r_source > rp) {
      throw new Error("Load resistance is larger than source resistance. Cannot use LC match");
    }
    
    // Calculate Q based on impedance ratio
    const actualQ = Math.sqrt(rp / r_source - 1);
    
    // Calculate primary component values
    const lp = rp / (omega * actualQ);
    const cs = 1 / (actualQ * omega * r_source);
    
    // Adjust for reactances
    let c = 0;
    let l = 0;
    
    if (xl === 0) {
      c = cs;
    } else {
      if (c1 === cs) {
        c = Number.POSITIVE_INFINITY;
      } else {
        c = c1 * cs / (c1 - cs);
      }
    }
    
    if (xs === 0) {
      l = lp;
    } else {
      if (l1 === lp) {
        l = Number.POSITIVE_INFINITY;
      } else {
        l = lp * l1 / (l1 - lp);
      }
    }
    
    // Add components to result
    components.push({
      type: 'inductor',
      value: l,
      reactance: omega * l,
      position: 'Series inductor (LCHP network)'
    });
    
    components.push({
      type: 'capacitor',
      value: c,
      reactance: -1 / (omega * c),
      position: 'Shunt capacitor (LCHP network)'
    });
    
    return components;
  };
  
  // CLLP Network (CL Low-Pass) based on the original CLLP() function
  const calculateCLLPNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // Extract values
    const rs = source.r;
    const xs = source.x;
    const rl = load.r;
    const xl = load.x;
    
    // Calculate key parameters
    const qs = -xs / rs;
    const ql = xl / rl;
    const rp = rs * (1 + qs * qs);
    const c1 = qs / (rp * omega);
    const l1 = xl / omega;
    
    // Check if matching is possible
    if (rl > rp) {
      throw new Error("Load Resistance is larger than source resistance. Cannot use C para, L series");
    }
    
    // Calculate Q and component values
    const actualQ = Math.sqrt(rp / rl - 1);
    const cp = actualQ / (rp * omega);
    const c = cp - c1;
    const ls = actualQ * rl / omega;
    const l = ls - l1;
    
    // Add components to result
    components.push({
      type: 'capacitor',
      value: c,
      reactance: -1 / (omega * c),
      position: 'Shunt capacitor (CLLP network)'
    });
    
    components.push({
      type: 'inductor',
      value: l,
      reactance: omega * l,
      position: 'Series inductor (CLLP network)'
    });
    
    return components;
  };
  
  // LCLP Network (LC Low-Pass) based on the original LCLP() function
  const calculateLCLPNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // Swap source and load (as per original LCLP function)
    const rs = load.r;
    const xs = load.x;
    const rl = source.r;
    const xl = source.x;
    
    // Calculate key parameters
    const qs = -xs / rs;
    const ql = xl / rl;
    const rp = rs * (1 + qs * qs);
    const c1 = qs / (rp * omega);
    const l1 = xl / omega;
    
    // Check if matching is possible
    if (rl > rp) {
      throw new Error("Load Resistance is larger than source resistance. Cannot use LCLP match");
    }
    
    // Calculate Q and component values
    const actualQ = Math.sqrt(rp / rl - 1);
    const cp = actualQ / (rp * omega);
    const c = cp - c1;
    const ls = actualQ * rl / omega;
    const l = ls - l1;
    
    // Add components to result
    components.push({
      type: 'inductor',
      value: l,
      reactance: omega * l,
      position: 'Series inductor (LCLP network)'
    });
    
    components.push({
      type: 'capacitor',
      value: c,
      reactance: -1 / (omega * c),
      position: 'Shunt capacitor (LCLP network)'
    });
    
    return components;
  };
  
  // CLHP Network (CL High-Pass) based on the original CLHP() function
  const calculateCLHPNetwork = (source: { r: number, x: number }, load: { r: number, x: number }, frequency: number, q: number) => {
    const components: Component[] = [];
    const omega = 2 * Math.PI * frequency;
    
    // Swap source and load (as per original CLHP function)
    const rs = load.r;
    const xs = load.x;
    const rl = source.r;
    const xl = source.x;
    
    // Calculate key parameters
    const ql = -xl / rl;
    const qs = xs / rs;
    const c1 = -1 / (omega * xl);
    const l1 = (1 + qs * qs) * xs / (omega * qs * qs);
    const rp = (1 + qs * qs) * rs;
    
    // Use rs as r_source
    const r_source = rl;
    
    // Check if matching is possible
    if (r_source > rp) {
      throw new Error("Load resistance is larger than source resistance. Cannot use CLHP match");
    }
    
    // Calculate Q based on impedance ratio
    const actualQ = Math.sqrt(rp / r_source - 1);
    
    // Calculate primary component values
    const lp = rp / (omega * actualQ);
    const cs = 1 / (actualQ * omega * r_source);
    
    // Adjust for reactances
    let c = 0;
    let l = 0;
    
    if (xl === 0) {
      c = cs;
    } else {
      if (c1 === cs) {
        c = Number.POSITIVE_INFINITY;
      } else {
        c = c1 * cs / (c1 - cs);
      }
    }
    
    if (xs === 0) {
      l = lp;
    } else {
      if (l1 === lp) {
        l = Number.POSITIVE_INFINITY;
      } else {
        l = lp * l1 / (l1 - lp);
      }
    }
    
    // Add components to result
    components.push({
      type: 'capacitor',
      value: c,
      reactance: -1 / (omega * c),
      position: 'Series capacitor (CLHP network)'
    });
    
    components.push({
      type: 'inductor',
      value: l,
      reactance: omega * l,
      position: 'Shunt inductor (CLHP network)'
    });
    
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

  // Get circuit diagram based on network type
  const getCircuitDiagram = () => {
    if (networkType === 'lNetwork') {
      if (networkTopology === 'lowPass') {
        if (sourceImpedance.resistance < loadImpedance.resistance) {
          return "Source ⟡—[ L ]—⟡—| |—⟡ Load"; // LCLP configuration
        } else {
          return "Source ⟡—| |—⟡—[ L ]—⟡ Load"; // CLLP configuration
        }
      } else { // highPass
        if (sourceImpedance.resistance < loadImpedance.resistance) {
          return "Source ⟡—|⊥|—⟡—( L )—⟡ Load"; // LCHP configuration
        } else {
          return "Source ⟡—( L )—⟡—|⊥|—⟡ Load"; // CLHP configuration
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
          
          {(networkType === 'lNetwork' || networkType === 'piNetwork' || networkType === 'tNetwork') && (
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
          )}
          
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
                
                {/* Dynamic Circuit diagram visualization */}
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
              <li><strong>L-Network:</strong> Simplest option, can match any two resistive impedances, but limited bandwidth control. Auto-selects between LCHP/CLHP/LCLP/CLLP configurations based on impedance ratio.</li>
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