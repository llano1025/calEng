import React, { useState, useEffect } from 'react';

// Interface for the component props
interface CopperLossCalculatorProps {
  onShowTutorial?: () => void;
}

// Define types for circuit types (updated based on table 7.4(b)(ii))
type CircuitType = 'main' | 'feeder' | 'submain-nonres-short' | 'submain-nonres-long' | 'submain-res' | 'final';

// Define types for branch types
type BranchType = 'riser' | 'lateral';

// Define types for cable types
type CableType = 'pvc' | 'xlpe';

// Define types for installation methods
type InstallationMethod = 'enclosed' | 'touching' | 'spaced';

// Define types for cable configurations
type CableConfig = 'multicore' | 'singlecore';

// Interface for a branch portion in sub-main circuit
interface BranchPortion {
  id: number;
  type: BranchType;                        // Type: 'riser' or 'lateral'
  floorNumber: string;                     // e.g., "12/F", "13/F", etc.
  fundamentalCurrent: number;              // I1 (fundamental current)
  thd: number;                             // Total Harmonic Distortion (%)
  designCurrent: number;                   // Ib = I1 × √(1+THD²)
  cableType: CableType;                    // 'pvc' or 'xlpe'
  cableConfig: CableConfig;                // 'multicore' or 'singlecore'
  cableSize: number;                       // Cable size in mm²
  installationMethod: InstallationMethod;  // Installation method
  baseResistance: number;                  // Base resistance from table
  resistance: number;                      // Temperature-corrected resistance
  length: number;                          // L1, L2, etc.
  ambientTemperature: number;              // Ambient temperature (°C)
  operatingTemperature: number;            // Operating temperature (°C)
  quantity: number;                        // Number of identical branches with same rating
  tabulatedCurrent: number;                // Conductor tabulated current carrying capacity (A)
  neutralCurrent: number;                  // Neutral current (A)
}

// Interface for common portion in sub-main circuit
interface CommonPortion {
  fundamentalCurrent: number;               // Fundamental current (I1)
  thd: number;                             // Total Harmonic Distortion (%)
  designCurrent: number;                   // Im = I1 × √(1+THD²)
  cableType: CableType;                    // 'pvc' or 'xlpe'
  cableConfig: CableConfig;                // 'multicore' or 'singlecore'
  cableSize: number;                       // Cable size in mm²
  installationMethod: InstallationMethod;  // Installation method
  baseResistance: number;                  // Base resistance from table
  resistance: number;                      // Temperature-corrected resistance
  length: number;                          // Lm
  neutralCurrent: number;                  // IN
  powerFactor: number;                     // cos φ
  floorRange: string;                      // e.g., "G/F to 12/F"
  ambientTemperature: number;              // Ambient temperature (°C)
  operatingTemperature: number;            // Operating temperature (°C)
  tabulatedCurrent: number;                // Conductor tabulated current carrying capacity (A)
}

// Interface for calculation detail
interface CalculationDetail {
  description: string;
  formula: string;
  result: number;
  unit: string;
}

// Cable resistance data from Table 7.8
// Contains exactly the 6 columns from the table:
// 1. Multicore PVC (70°C)
// 2. Multicore XLPE (90°C) 
// 3. Single-core PVC enclosed (70°C)
// 4. Single-core PVC direct/touching (70°C)
// 5. Single-core XLPE enclosed (90°C)
// 6. Single-core XLPE direct/touching (90°C)
const cableResistanceData: {
  [size: number]: {
    multicore: {
      pvc: number;
      xlpe: number;
    };
    singlecore: {
      pvc: { enclosed: number; touching: number };
      xlpe: { enclosed: number; touching: number };
    };
  };
} = {
  1.5: { 
    multicore: { pvc: 14.4, xlpe: 15.6 },
    singlecore: { 
      pvc: { enclosed: 14.4, touching: 14.4 }, 
      xlpe: { enclosed: 15.6, touching: 15.6 } 
    }
  },
  2.5: { 
    multicore: { pvc: 9.0, xlpe: 9.0 },
    singlecore: { 
      pvc: { enclosed: 9.0, touching: 9.0 }, 
      xlpe: { enclosed: 9.0, touching: 9.0 } 
    }
  },
  4: { 
    multicore: { pvc: 5.5, xlpe: 5.8 },
    singlecore: { 
      pvc: { enclosed: 5.5, touching: 5.5 }, 
      xlpe: { enclosed: 5.8, touching: 5.8 } 
    }
  },
  6: { 
    multicore: { pvc: 3.70, xlpe: 3.93 },
    singlecore: { 
      pvc: { enclosed: 3.70, touching: 3.70 }, 
      xlpe: { enclosed: 3.93, touching: 3.93 } 
    }
  },
  10: { 
    multicore: { pvc: 2.2, xlpe: 2.3 },
    singlecore: { 
      pvc: { enclosed: 2.2, touching: 2.2 }, 
      xlpe: { enclosed: 2.3, touching: 2.3 } 
    }
  },
  16: { 
    multicore: { pvc: 1.4, xlpe: 1.4 },
    singlecore: { 
      pvc: { enclosed: 1.4, touching: 1.4 }, 
      xlpe: { enclosed: 1.4, touching: 1.4 } 
    }
  },
  25: { 
    multicore: { pvc: 0.866, xlpe: 0.924 },
    singlecore: { 
      pvc: { enclosed: 0.866, touching: 0.866 }, 
      xlpe: { enclosed: 0.924, touching: 0.924 } 
    }
  },
  35: { 
    multicore: { pvc: 0.635, xlpe: 0.664 },
    singlecore: { 
      pvc: { enclosed: 0.635, touching: 0.635 }, 
      xlpe: { enclosed: 0.664, touching: 0.664 } 
    }
  },
  50: { 
    multicore: { pvc: 0.462, xlpe: 0.497 },
    singlecore: { 
      pvc: { enclosed: 0.468, touching: 0.462 }, 
      xlpe: { enclosed: 0.508, touching: 0.497 } 
    }
  },
  70: { 
    multicore: { pvc: 0.318, xlpe: 0.341 },
    singlecore: { 
      pvc: { enclosed: 0.318, touching: 0.318 }, 
      xlpe: { enclosed: 0.346, touching: 0.341 } 
    }
  },
  95: { 
    multicore: { pvc: 0.237, xlpe: 0.248 },
    singlecore: { 
      pvc: { enclosed: 0.242, touching: 0.237 }, 
      xlpe: { enclosed: 0.254, touching: 0.248 } 
    }
  },
  120: { 
    multicore: { pvc: 0.191, xlpe: 0.196 },
    singlecore: { 
      pvc: { enclosed: 0.191, touching: 0.185 }, 
      xlpe: { enclosed: 0.202, touching: 0.196 } 
    }
  },
  150: { 
    multicore: { pvc: 0.150, xlpe: 0.162 },
    singlecore: { 
      pvc: { enclosed: 0.156, touching: 0.150 }, 
      xlpe: { enclosed: 0.167, touching: 0.162 } 
    }
  },
  185: { 
    multicore: { pvc: 0.121, xlpe: 0.127 },
    singlecore: { 
      pvc: { enclosed: 0.127, touching: 0.121 }, 
      xlpe: { enclosed: 0.133, touching: 0.127 } 
    }
  },
  240: { 
    multicore: { pvc: 0.095, xlpe: 0.101 },
    singlecore: { 
      pvc: { enclosed: 0.098, touching: 0.092 }, 
      xlpe: { enclosed: 0.107, touching: 0.098 } 
    }
  },
  300: { 
    multicore: { pvc: 0.078, xlpe: 0.081 },
    singlecore: { 
      pvc: { enclosed: 0.081, touching: 0.075 }, 
      xlpe: { enclosed: 0.087, touching: 0.081 } 
    }
  },
  400: { 
    multicore: { pvc: 0.058, xlpe: 0.066 },
    singlecore: { 
      pvc: { enclosed: 0.069, touching: 0.061 }, 
      xlpe: { enclosed: 0.072, touching: 0.064 } 
    }
  },
  500: { 
    multicore: { pvc: 0.050, xlpe: 0.052 },
    singlecore: { 
      pvc: { enclosed: 0.058, touching: 0.050 }, 
      xlpe: { enclosed: 0.058, touching: 0.052 } 
    }
  },
  630: { 
    multicore: { pvc: 0.042, xlpe: 0.043 },
    singlecore: { 
      pvc: { enclosed: 0.046, touching: 0.042 }, 
      xlpe: { enclosed: 0.051, touching: 0.043 } 
    }
  },
  800: { 
    multicore: { pvc: 0.035, xlpe: 0.035 },
    singlecore: { 
      pvc: { enclosed: 0.035, touching: 0.035 }, 
      xlpe: { enclosed: 0.036, touching: 0.036 } 
    }
  },
  1000: { 
    multicore: { pvc: 0.030, xlpe: 0.032 },
    singlecore: { 
      pvc: { enclosed: 0.030, touching: 0.030 }, 
      xlpe: { enclosed: 0.032, touching: 0.032 } 
    }
  }
};

const CopperLossCalculator: React.FC<CopperLossCalculatorProps> = ({ onShowTutorial }) => {
  // State for selected circuit type
  const [circuitType, setCircuitType] = useState<CircuitType>('submain-nonres-short');
  
  // Remove separate state variables for main and feeder circuit inputs
  // All calculations will use common portion now
  
  // State for sub-main circuit inputs
  const [commonPortion, setCommonPortion] = useState<CommonPortion>({
    fundamentalCurrent: 0,
    thd: 0,
    designCurrent: 0,
    cableType: 'pvc',
    cableConfig: 'multicore',
    cableSize: 16,
    installationMethod: 'enclosed',
    baseResistance: 1.4,
    resistance: 1.4,
    length: 0,
    neutralCurrent: 0,
    powerFactor: 0.85,
    floorRange: '',
    ambientTemperature: 30,
    operatingTemperature: 70,
    tabulatedCurrent: 0
  });
  
  // Reset initial branch portions to empty array for optional branches
  const [branchPortions, setBranchPortions] = useState<BranchPortion[]>([]);
  
  // State for calculation results
  const [copperLoss, setCopperLoss] = useState<number | null>(null);
  const [copperLossPercentage, setCopperLossPercentage] = useState<number | null>(null);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
  const [activePower, setActivePower] = useState<number | null>(null);
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetail[]>([]);
  const [calculatedDiversityFactor, setCalculatedDiversityFactor] = useState<number | null>(null);
  
  // Function to calculate design current from fundamental current and THD
  const calculateDesignCurrent = (fundamentalCurrent: number, thd: number): number => {
    const thdDecimal = thd / 100; // Convert from percentage to decimal
    return fundamentalCurrent * Math.sqrt(1 + Math.pow(thdDecimal, 2));
  };
  
  // Function to get base resistance value from cable properties
  const getBaseResistance = (
    cableType: CableType,
    cableConfig: CableConfig, 
    cableSize: number, 
    installationMethod: InstallationMethod
  ): number => {
    // Default to the smallest cable size if the requested size is not in the table
    const validSizes = Object.keys(cableResistanceData).map(Number);
    const closestSize = validSizes.reduce((prev, curr) => {
      return (Math.abs(curr - cableSize) < Math.abs(prev - cableSize)) ? curr : prev;
    });
    
    // For multicore cables, installation method is not applicable
    if (cableConfig === 'multicore') {
      return cableResistanceData[closestSize].multicore[cableType];
    } else {
      // For single-core, only allow 'enclosed' or 'touching'
      const method = installationMethod === 'spaced' ? 'touching' : installationMethod;
      return cableResistanceData[closestSize].singlecore[cableType][method];
    }
  };
  
  // Function to calculate temperature-corrected resistance using updated formulas from the image
  const calculateCorrectedResistance = (
    baseResistance: number,
    ambientTemperature: number,
    maxOperatingTemperature: number,
    designCurrent: number,
    fundamentalCurrent: number = 0,
    thd: number = 0,
    tabulatedCurrent: number = 0,
    neutralCurrent: number = 0
  ): number => {
    // If design current is not valid or tabulated current is zero, return base resistance
    if (designCurrent <= 0) {
      return baseResistance;
    }
    
    // Use tabulated current as the denominator if provided, otherwise use a default value
    const ratedCurrent = tabulatedCurrent > 0 ? tabulatedCurrent : 100;
    
    // Determine fundamental current: use provided value or estimate from design current
    let actualFundamentalCurrent = fundamentalCurrent;
    if (actualFundamentalCurrent <= 0) {
      // If no THD is provided or THD is 0, assume design current = fundamental current
      if (thd <= 0) {
        actualFundamentalCurrent = designCurrent;
      } else {
        // Otherwise, calculate fundamental current from design current and THD
        const thdDecimal = thd / 100;
        actualFundamentalCurrent = designCurrent / Math.sqrt(1 + Math.pow(thdDecimal, 2));
      }
    }
    
    // Step 1: Calculate actual conductor temperature using formula from image
    // t₁ = t₂ + [(3I₁ + I₁N)²/(3I₁)²] × (tₚ - 30)
    let currentRatio = 1; // Default to 1 to avoid division by zero
    
    if (actualFundamentalCurrent > 0) {
      const numerator = Math.pow(3 * actualFundamentalCurrent + neutralCurrent, 2);
      const denominator = Math.pow(3 * ratedCurrent, 2);
      currentRatio = numerator / denominator;
    }
    
    const actualTemp = ambientTemperature + currentRatio * (maxOperatingTemperature - 30);
    
    // Step 2: Calculate resistance correction factor using formula from image
    // R₁/Rₚ = (230 + t₁)/(230 + tₚ)
    const correctionFactor = (230 + actualTemp) / (230 + maxOperatingTemperature);
    
    // Step 3: Apply correction factor to base resistance
    const correctedResistance = baseResistance * correctionFactor;
    
    return correctedResistance;
  };
  
  // Function to calculate diversity factor based on Image 1
  // MODIFIED: Only include lateral portions in diversity calculation and handle empty branch case
  const calculateDiversityFactor = (): number => {
    // Calculate total design current for all LATERAL branch portions only
    const totalBranchDesignCurrent = branchPortions
      .filter(branch => branch.type === 'lateral') // Only include lateral portions
      .reduce((sum, branch) => {
        return sum + (branch.designCurrent * branch.quantity);
      }, 0);
    
    // If there's no branch current or common portion current is zero, return 1 (no diversity)
    if (totalBranchDesignCurrent === 0 || commonPortion.designCurrent === 0) return 1;
    
    // The diversity factor is the ratio of common portion current to sum of branch currents
    // If common current is smaller than the sum of branch currents, there is diversity
    return Math.min(commonPortion.designCurrent / totalBranchDesignCurrent, 1);
  };
  
  // Function to add a new branch portion
  const addBranchPortion = (type: BranchType) => {
    // Find the highest ID currently in use to prevent ID conflicts after deletions
    const highestId = Math.max(...branchPortions.map(portion => portion.id), 0);
    
    // Get appropriate resistance based on type
    const baseResistance = getBaseResistance('pvc', 'multicore', 16, 'enclosed');
    const newResistance = type === 'riser' ? commonPortion.resistance : baseResistance;
    
    setBranchPortions(prevPortions => [
      ...prevPortions,
      { 
        id: highestId + 1, 
        type: type,
        floorNumber: '', 
        fundamentalCurrent: 0,
        thd: 0,
        designCurrent: 0,
        cableType: 'pvc',
        cableConfig: 'multicore',
        cableSize: 16,
        installationMethod: 'enclosed',
        baseResistance: newResistance,
        resistance: newResistance,
        length: 0,
        ambientTemperature: 30,
        operatingTemperature: 70,
        quantity: 1,
        tabulatedCurrent: 0,
        neutralCurrent: 0
      }
    ]);
  };
  
  // Function to duplicate a branch portion
  const duplicateBranchPortion = (id: number) => {
    const branchToCopy = branchPortions.find(portion => portion.id === id);
    if (!branchToCopy) return;
    
    // Find the highest ID currently in use
    const highestId = Math.max(...branchPortions.map(portion => portion.id), 0);
    
    // Create a new branch with copied values but a new ID
    const newBranch = {
      ...branchToCopy,
      id: highestId + 1,
      floorNumber: `${branchToCopy.floorNumber} (copy)`
    };
    
    setBranchPortions([...branchPortions, newBranch]);
  };
  
  // Function to remove a branch portion
  const removeBranchPortion = (id: number) => {
    setBranchPortions(branchPortions.filter(portion => portion.id !== id));
  };
  
  // Function to update a branch portion
  // MODIFIED: Special handling for riser portions
  const updateBranchPortion = (id: number, field: keyof BranchPortion, value: any) => {
    setBranchPortions(
      branchPortions.map(portion => {
        if (portion.id !== id) return portion;
        
        const updatedPortion = { ...portion, [field]: value };
        
        // If type is changing, apply special handling for risers/laterals
        if (field === 'type') {
          const newType = value as BranchType;
          
          if (newType === 'riser') {
            // For risers, always use common portion resistance directly
            updatedPortion.resistance = commonPortion.resistance;
            updatedPortion.baseResistance = commonPortion.resistance;
          } else if (newType === 'lateral' && portion.type === 'riser') {
            // When changing from riser to lateral, recalculate resistance based on cable properties
            const newBaseResistance = getBaseResistance(
              portion.cableType,
              portion.cableConfig,
              portion.cableSize,
              portion.installationMethod
            );
            updatedPortion.baseResistance = newBaseResistance;
            updatedPortion.resistance = calculateCorrectedResistance(
              newBaseResistance,
              portion.ambientTemperature,
              portion.operatingTemperature,
              portion.designCurrent,
              portion.fundamentalCurrent,
              portion.thd,
              portion.tabulatedCurrent,
              portion.neutralCurrent
            );
          }
        }
        
        // For risers, handle direct design current input (no THD correction)
        if (portion.type === 'riser' || (field === 'type' && value === 'riser')) {
          // Always ensure risers use the common portion resistance
          updatedPortion.resistance = commonPortion.resistance;
          updatedPortion.baseResistance = commonPortion.resistance;
          
          // If updating fundamental current for riser, set design current equal to it
          if (field === 'fundamentalCurrent') {
            updatedPortion.designCurrent = value;
          }
          // If explicitly updating design current for riser, keep it as is
          else if (field === 'designCurrent') {
            // Keep the value as is
          }
          // For risers, THD doesn't affect design current, so we don't need special handling
        } else {
          // For laterals, calculate design current from THD and fundamental current
          if (field === 'fundamentalCurrent' || field === 'thd') {
            updatedPortion.designCurrent = calculateDesignCurrent(
              field === 'fundamentalCurrent' ? value : portion.fundamentalCurrent,
              field === 'thd' ? value : portion.thd
            );
          }
        }
        
        // If we're updating cable properties for lateral portions
        if (portion.type === 'lateral' && (field === 'cableType' || field === 'cableConfig' || 
            field === 'cableSize' || field === 'installationMethod')) {
          const newBaseResistance = getBaseResistance(
            field === 'cableType' ? value as CableType : portion.cableType,
            field === 'cableConfig' ? value as CableConfig : portion.cableConfig,
            field === 'cableSize' ? value as number : portion.cableSize,
            field === 'installationMethod' ? value as InstallationMethod : portion.installationMethod
          );
          
          updatedPortion.baseResistance = newBaseResistance;
          updatedPortion.resistance = calculateCorrectedResistance(
            newBaseResistance,
            portion.ambientTemperature,
            portion.operatingTemperature,
            portion.designCurrent,
            portion.fundamentalCurrent,
            portion.thd,
            portion.tabulatedCurrent,
            portion.neutralCurrent
          );
        }
        
        // If we're updating temperature values, tabulated current, or neutral current for laterals only
        if (portion.type === 'lateral' && (field === 'ambientTemperature' || field === 'operatingTemperature' || 
            field === 'tabulatedCurrent' || field === 'neutralCurrent')) {
          updatedPortion.resistance = calculateCorrectedResistance(
            portion.baseResistance,
            field === 'ambientTemperature' ? value : portion.ambientTemperature,
            field === 'operatingTemperature' ? value : portion.operatingTemperature,
            portion.designCurrent,
            portion.fundamentalCurrent,
            portion.thd,
            field === 'tabulatedCurrent' ? value : portion.tabulatedCurrent,
            field === 'neutralCurrent' ? value : portion.neutralCurrent
          );
        }
        
        return updatedPortion;
      })
    );
  };
  
  // Function to update all riser resistances when common portion changes
  const updateRiserResistances = () => {
    setBranchPortions(
      branchPortions.map(portion => {
        if (portion.type !== 'riser') return portion;
        
        return {
          ...portion,
          resistance: commonPortion.resistance,
          baseResistance: commonPortion.resistance
        };
      })
    );
  };
  
  // Function to update common portion
  // MODIFIED: Update riser resistances when common portion resistance changes
  const updateCommonPortion = (field: keyof CommonPortion, value: any) => {
    setCommonPortion(prevPortion => {
      const updatedPortion = { ...prevPortion, [field]: value };
      
      // If we're updating fundamental current or THD, recalculate design current
      if (field === 'fundamentalCurrent' || field === 'thd') {
        updatedPortion.designCurrent = calculateDesignCurrent(
          field === 'fundamentalCurrent' ? value : prevPortion.fundamentalCurrent,
          field === 'thd' ? value : prevPortion.thd
        );
      }
      
      // If we're updating cable properties, recalculate resistance
      if (field === 'cableType' || field === 'cableConfig' || field === 'cableSize' || field === 'installationMethod') {
        const newBaseResistance = getBaseResistance(
          field === 'cableType' ? value as CableType : prevPortion.cableType,
          field === 'cableConfig' ? value as CableConfig : prevPortion.cableConfig,
          field === 'cableSize' ? value as number : prevPortion.cableSize,
          field === 'installationMethod' ? value as InstallationMethod : prevPortion.installationMethod
        );
        
        updatedPortion.baseResistance = newBaseResistance;
        updatedPortion.resistance = calculateCorrectedResistance(
          newBaseResistance,
          prevPortion.ambientTemperature,
          prevPortion.operatingTemperature,
          prevPortion.designCurrent,
          prevPortion.fundamentalCurrent,
          prevPortion.thd,
          prevPortion.tabulatedCurrent,
          prevPortion.neutralCurrent
        );
      }
      
      // If we're updating temperature values, tabulated current, or neutral current, recalculate resistance
      if (field === 'ambientTemperature' || field === 'operatingTemperature' || 
          field === 'tabulatedCurrent' || field === 'neutralCurrent') {
        updatedPortion.resistance = calculateCorrectedResistance(
          prevPortion.baseResistance,
          field === 'ambientTemperature' ? value : prevPortion.ambientTemperature,
          field === 'operatingTemperature' ? value : prevPortion.operatingTemperature,
          prevPortion.designCurrent,
          prevPortion.fundamentalCurrent,
          prevPortion.thd,
          field === 'tabulatedCurrent' ? value : prevPortion.tabulatedCurrent,
          field === 'neutralCurrent' ? value : prevPortion.neutralCurrent
        );
      }
      
      return updatedPortion;
    });
    
    // Check if fields that affect resistance were updated, and if so, update risers
    if (['cableType', 'cableConfig', 'cableSize', 'installationMethod', 
         'ambientTemperature', 'operatingTemperature', 'tabulatedCurrent', 'neutralCurrent'].includes(field)) {
      // We need to update the resistances of all riser portions in the next render cycle
      setTimeout(updateRiserResistances, 0);
    }
  };
  
  // Function to get the maximum allowable copper loss percentage based on circuit type
  const getMaxAllowablePercentage = (type: CircuitType): number => {
    switch (type) {
      case 'main':
        return 0.5; // Main circuit: ≤ 0.5%
      case 'feeder':
        return 2.5; // Feeder circuit: ≤ 2.5%
      case 'submain-nonres-short':
        return 1.5; // Sub-main, non-residential, ≤100m: ≤ 1.5%
      case 'submain-nonres-long':
        return 2.5; // Sub-main, non-residential, >100m: ≤ 2.5%
      case 'submain-res':
        return 2.5; // Sub-main, residential: ≤ 2.5%
      case 'final':
        return 1.0; // Final circuit >32A: ≤ 1.0%
      default:
        return 1.5; // Default to most conservative limit
    }
  };
  
  // Function to calculate copper loss for all circuit types
  const calculateCopperLoss = () => {
    if (commonPortion.designCurrent <= 0 || commonPortion.length <= 0 || commonPortion.tabulatedCurrent <= 0) {
      alert("Please enter valid values for the common portion including Tabulated Current");
      return;
    }
    
    // Only validate branch portions if they exist
    if (branchPortions.length > 0 && branchPortions.some(branch => 
      (branch.type === 'lateral' && (branch.fundamentalCurrent <= 0 || branch.tabulatedCurrent <= 0)) || 
      (branch.type === 'riser' && branch.designCurrent <= 0) || 
      branch.length <= 0 || 
      branch.quantity <= 0)) {
      alert("Please enter valid values for all branch portions (including Tabulated Current for lateral portions)");
      return;
    }
    
    // Calculate diversity factor (will return 1 if no branches)
    const df = calculateDiversityFactor();
    setCalculatedDiversityFactor(df);
    
    // Initialize calculation details array
    const details: CalculationDetail[] = [];
    
    // Add circuit type information
    let circuitTypeDescription = "";
    switch (circuitType) {
      case 'main':
        circuitTypeDescription = "Main Circuit (≤ 0.5% of total active power)";
        break;
      case 'feeder':
        circuitTypeDescription = "Feeder Circuit (≤ 2.5% of total active power)";
        break;
      case 'submain-nonres-short':
        circuitTypeDescription = "Sub-main Circuit - Non-residential building, ≤100m (≤ 1.5% of total active power)";
        break;
      case 'submain-nonres-long':
        circuitTypeDescription = "Sub-main Circuit - Non-residential building, &gt;100m (≤ 2.5% of total active power)";
        break;
      case 'submain-res':
        circuitTypeDescription = "Sub-main Circuit - Residential building (≤ 2.5% of total active power)";
        break;
      case 'final':
        circuitTypeDescription = "Final Circuit &gt;32A (≤ 1.0% of total active power)";
        break;
    }
    
    details.push({
      description: "Circuit Type",
      formula: circuitTypeDescription,
      result: 0,
      unit: ""
    });
    
    // Add diversity factor calculation details if branches exist
    if (branchPortions.length > 0) {
      details.push({
        description: "Diversity Factor Calculation (Laterals Only)",
        formula: "Common Current / Sum of Lateral Currents",
        result: df,
        unit: ""
      });
    }
    
    // Calculate copper loss for common portion
    const commonCopperLoss = 3 * Math.pow(commonPortion.designCurrent, 2) * commonPortion.resistance * commonPortion.length / 1000;
    
    details.push({
      description: `Common Portion Copper Loss (${commonPortion.floorRange || 'Common Portion'})`,
      formula: `3 × ${commonPortion.designCurrent}² × ${commonPortion.resistance} × ${commonPortion.length} / 1000`,
      result: commonCopperLoss,
      unit: "W"
    });
    
    // Calculate neutral current loss if provided
    let neutralLoss = 0;
    if (commonPortion.neutralCurrent > 0) {
      neutralLoss = Math.pow(commonPortion.neutralCurrent, 2) * commonPortion.resistance * commonPortion.length / 1000;
      
      details.push({
        description: "Neutral Conductor Loss in Common Portion",
        formula: `${commonPortion.neutralCurrent}² × ${commonPortion.resistance} × ${commonPortion.length} / 1000`,
        result: neutralLoss,
        unit: "W"
      });
    }
    
    // Calculate copper loss for each branch portion (if any)
    let totalBranchLoss = 0;
    
    if (branchPortions.length > 0) {
      // Group branches by floor for better organization
      const floorGroups: {[key: string]: BranchPortion[]} = {};
      
      branchPortions.forEach(branch => {
        const floorKey = branch.floorNumber || `Floor ${branch.id}`;
        if (!floorGroups[floorKey]) {
          floorGroups[floorKey] = [];
        }
        floorGroups[floorKey].push(branch);
      });
      
      // Process each floor group
      Object.entries(floorGroups).forEach(([floorKey, branches]) => {
        let floorLoss = 0;
        
        branches.forEach(branch => {
          // For risers, we use design current directly (no diversity)
          // For laterals, we apply diversity factor to the design current
          const adjustedDesignCurrent = branch.type === 'riser' ? 
            branch.designCurrent : 
            branch.designCurrent * df;
          
          // Calculate branch copper loss
          let formula = "";
          let branchLoss = 0;
          
          if (branch.type === 'riser') {
            // Riser formula: 3 × Ib² × r × L × 1/1000
            branchLoss = 3 * Math.pow(adjustedDesignCurrent, 2) * branch.resistance * branch.length / 1000;
            formula = `3 × ${branch.designCurrent}² × ${branch.resistance} × ${branch.length} / 1000`;
          } else {
            // Lateral formula: 3 × (Ib × df)² × r × L × 1/1000
            branchLoss = 3 * Math.pow(adjustedDesignCurrent, 2) * branch.resistance * branch.length / 1000;
            formula = `3 × (${branch.designCurrent} × ${df})² × ${branch.resistance} × ${branch.length} / 1000`;
          }
          
          // Calculate neutral loss if provided
          if (branch.neutralCurrent > 0) {
            const neutralBranchLoss = Math.pow(branch.neutralCurrent, 2) * branch.resistance * branch.length / 1000;
            branchLoss += neutralBranchLoss;
            formula += ` + ${branch.neutralCurrent}² × ${branch.resistance} × ${branch.length} / 1000`;
          }
          
          // Multiply by quantity (number of identical branches)
          branchLoss *= branch.quantity;
          formula = `${branch.quantity} × (${formula})`;
          
          floorLoss += branchLoss;
          
          details.push({
            description: `${branch.type === 'riser' ? 'Riser' : 'Lateral'} Portion ${branch.floorNumber || branch.id} (×${branch.quantity})`,
            formula: formula,
            result: branchLoss,
            unit: "W"
          });
        });
        
        totalBranchLoss += floorLoss;
      });
    }
    
    // Calculate total copper loss (including neutral loss)
    const totalLoss = commonCopperLoss + neutralLoss + totalBranchLoss;
    
    // Only add branch loss to formula if branches exist
    let totalLossFormula = branchPortions.length > 0 ?
      `${commonCopperLoss.toFixed(2)} + ${neutralLoss.toFixed(2)} + ${totalBranchLoss.toFixed(2)}` :
      `${commonCopperLoss.toFixed(2)} + ${neutralLoss.toFixed(2)}`;
    
    details.push({
      description: "Total Copper Loss",
      formula: totalLossFormula,
      result: totalLoss,
      unit: "W"
    });
    
    // Calculate total active power using ONLY common portion
    // Active Power = √3 × I × V × cos φ
    const totalActivePower = Math.sqrt(3) * commonPortion.designCurrent * 380 * commonPortion.powerFactor;
    
    details.push({
      description: "Total Active Power (Common Portion Only)",
      formula: `√3 × ${commonPortion.designCurrent} × 380 × ${commonPortion.powerFactor}`,
      result: totalActivePower,
      unit: "W"
    });
    
    // Calculate copper loss percentage
    const lossPercentage = (totalLoss / totalActivePower) * 100;
    
    details.push({
      description: "Copper Loss Percentage",
      formula: `(${totalLoss.toFixed(2)} / ${totalActivePower.toFixed(2)}) × 100`,
      result: lossPercentage,
      unit: "%"
    });
    
    setCopperLoss(totalLoss);
    setCopperLossPercentage(lossPercentage);
    setActivePower(totalActivePower);
    setCalculationDetails(details);
    
    // Get the maximum allowable percentage based on circuit type
    const maxAllowedPercentage = getMaxAllowablePercentage(circuitType);
    
    // Check compliance
    setIsCompliant(lossPercentage <= maxAllowedPercentage);
  };
  
  // Reset results when circuit type changes
  useEffect(() => {
    setCopperLoss(null);
    setCopperLossPercentage(null);
    setIsCompliant(null);
    setActivePower(null);
    setCalculationDetails([]);
  }, [circuitType]);
  
  // Update riser resistances when common portion resistance changes
  useEffect(() => {
    updateRiserResistances();
  }, [commonPortion.resistance]);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Copper Loss Calculator</h2>
        {onShowTutorial && (
          <button
            onClick={onShowTutorial}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <span className="mr-1">Tutorial</span>
          </button>
        )}
      </div>
      
      {/* Circuit Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Circuit Type:</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <button
            className={`px-4 py-2 rounded text-sm ${
              circuitType === 'main'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setCircuitType('main')}
          >
            Main Circuit (≤0.5%)
          </button>
          <button
            className={`px-4 py-2 rounded text-sm ${
              circuitType === 'feeder'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setCircuitType('feeder')}
          >
            Feeder Circuit (≤2.5%)
          </button>
          <button
            className={`px-4 py-2 rounded text-sm ${
              circuitType === 'submain-nonres-short'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setCircuitType('submain-nonres-short')}
          >
            Sub-main (Non-residential, ≤100m) (≤1.5%)
          </button>
                      <button
            className={`px-4 py-2 rounded text-sm ${
              circuitType === 'submain-nonres-long'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setCircuitType('submain-nonres-long')}
          >
            Sub-main (Non-residential, &gt;100m) (≤2.5%)
          </button>
          <button
            className={`px-4 py-2 rounded text-sm ${
              circuitType === 'submain-res'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setCircuitType('submain-res')}
          >
            Sub-main (Residential) (≤2.5%)
          </button>
          <button
            className={`px-4 py-2 rounded text-sm ${
              circuitType === 'final'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setCircuitType('final')}
          >
            Final Circuit &gt;32A (≤1.0%)
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Based on Table 7.4(b)(ii): Summary of Maximum Allowable Circuit Copper Loss
        </p>
      </div>
      
      {/* Inputs based on selected circuit type - now all types use the same form */}
      <div>
        {/* Common Portion Inputs */}
        <div className="mb-6 bg-gray-50 p-4 rounded">
          <h3 className="font-medium mb-3">Common Portion:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Floor Range:</label>
                <input
                  type="text"
                  value={commonPortion.floorRange}
                  onChange={(e) => updateCommonPortion('floorRange', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. G/F to 12/F"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fundamental Current (A):</label>
                <input
                  type="number"
                  value={commonPortion.fundamentalCurrent || ''}
                  onChange={(e) => updateCommonPortion('fundamentalCurrent', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="I1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">THD (%):</label>
                <input
                  type="number"
                  value={commonPortion.thd || ''}
                  onChange={(e) => updateCommonPortion('thd', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="Total Harmonic Distortion"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Design Current (A):</label>
                <input
                  type="number"
                  value={commonPortion.designCurrent || ''}
                  className="w-full p-2 border rounded bg-gray-100"
                  readOnly
                  placeholder="Im = I1 × √(1+THD²)"
                />
                <p className="text-xs text-gray-500 mt-1">Calculated from I1 and THD</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cable Configuration:</label>
                <select
                  value={commonPortion.cableConfig}
                  onChange={(e) => updateCommonPortion('cableConfig', e.target.value as CableConfig)}
                  className="w-full p-2 border rounded"
                >
                  <option value="multicore">Multicore</option>
                  <option value="singlecore">Single-core</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cable Type:</label>
                <select
                  value={commonPortion.cableType}
                  onChange={(e) => updateCommonPortion('cableType', e.target.value as CableType)}
                  className="w-full p-2 border rounded"
                >
                  <option value="pvc">PVC</option>
                  <option value="xlpe">XLPE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cable Size (mm²):</label>
                <select
                  value={commonPortion.cableSize}
                  onChange={(e) => updateCommonPortion('cableSize', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  {Object.keys(cableResistanceData).map(size => (
                    <option key={size} value={size}>{size} mm²</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Installation Method:</label>
                <select
                  value={commonPortion.installationMethod}
                  onChange={(e) => updateCommonPortion('installationMethod', e.target.value as InstallationMethod)}
                  className="w-full p-2 border rounded"
                  disabled={commonPortion.cableConfig === 'multicore'}
                >
                  <option value="enclosed">Enclosed</option>
                  <option value="touching">Touching</option>
                  <option value="spaced">Spaced</option>
                </select>
                {commonPortion.cableConfig === 'multicore' && (
                  <p className="text-xs text-gray-500 mt-1">Not applicable for multicore cables</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Resistance (mΩ/metre):</label>
                <input
                  type="number"
                  value={commonPortion.resistance || ''}
                  className="w-full p-2 border rounded bg-gray-100"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from cable properties</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Length (metre):</label>
                <input
                  type="number"
                  value={commonPortion.length || ''}
                  onChange={(e) => updateCommonPortion('length', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="Lm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Neutral Current (A):</label>
                <input
                  type="number"
                  value={commonPortion.neutralCurrent || ''}
                  onChange={(e) => updateCommonPortion('neutralCurrent', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="IN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Power Factor:</label>
                <input
                  type="number"
                  value={commonPortion.powerFactor || ''}
                  onChange={(e) => updateCommonPortion('powerFactor', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="cos φ"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tabulated Current (A): <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={commonPortion.tabulatedCurrent || ''}
                  onChange={(e) => updateCommonPortion('tabulatedCurrent', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="Current carrying capacity"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">From cable manufacturer data (required)</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ambient Temp (°C):</label>
                <input
                  type="number"
                  value={commonPortion.ambientTemperature || ''}
                  onChange={(e) => updateCommonPortion('ambientTemperature', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="Ambient temperature"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Operating Temp (°C):</label>
                <input
                  type="number"
                  value={commonPortion.operatingTemperature || ''}
                  onChange={(e) => updateCommonPortion('operatingTemperature', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  placeholder="Operating temperature"
                />
              </div>
            </div>
          </div>
          
          {/* Diversity Calculator Information */}
          {branchPortions.length > 0 && (
            <div className="mb-6 bg-yellow-50 p-4 rounded border border-yellow-200">
              <h3 className="font-medium mb-2">Diversity Factor Information:</h3>
              <p className="text-sm text-gray-700 mb-2">
                The diversity factor (df) for the <strong>lateral branches only</strong> will be auto-calculated based on the lateral currents and quantities.
                It will be applied to each lateral branch's design current for copper loss calculation. <strong>Riser portions are not included in diversity calculations.</strong>
              </p>
              {calculatedDiversityFactor !== null && (
                <p className="font-medium">
                  Calculated Diversity Factor: {calculatedDiversityFactor.toFixed(3)}
                </p>
              )}
            </div>
          )}
          
          {/* Branch Portions */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Branch Portions:</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => addBranchPortion('riser')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Add Riser Portion
                </button>
                <button
                  onClick={() => addBranchPortion('lateral')}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add Lateral Tee-off
                </button>
              </div>
            </div>
            
            {branchPortions.map((portion) => (
              <div 
                key={portion.id} 
                className={`${
                  portion.type === 'riser' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-blue-50 border-l-4 border-blue-500'
                } p-4 rounded mb-4`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">
                    {portion.type === 'riser' ? 'Riser Portion' : 'Lateral Tee-off'} {portion.id}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => duplicateBranchPortion(portion.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Duplicate
                    </button>
                    {branchPortions.length > 1 && (
                      <button
                        onClick={() => removeBranchPortion(portion.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type:</label>
                    <select
                      value={portion.type}
                      onChange={(e) => updateBranchPortion(portion.id, 'type', e.target.value as BranchType)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="riser">Riser Portion</option>
                      <option value="lateral">Lateral Tee-off</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Floor Number:</label>
                    <input
                      type="text"
                      value={portion.floorNumber}
                      onChange={(e) => updateBranchPortion(portion.id, 'floorNumber', e.target.value)}
                      className="w-full p-2 border rounded"
                      placeholder="e.g. 12/F"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity:</label>
                    <input
                      type="number"
                      value={portion.quantity || 1}
                      onChange={(e) => updateBranchPortion(portion.id, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 border rounded"
                      min="1"
                      placeholder="Number of identical branches"
                    />
                  </div>
                  {portion.type === 'riser' ? (
                    // For risers, we directly input design current
                    <div>
                      <label className="block text-sm font-medium mb-1">Design Current (A):</label>
                      <input
                        type="number"
                        value={portion.designCurrent || ''}
                        onChange={(e) => updateBranchPortion(portion.id, 'designCurrent', Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        placeholder="Direct design current input"
                      />
                    </div>
                  ) : (
                    // For laterals, we calculate design current from fundamental current and THD
                    <div>
                      <label className="block text-sm font-medium mb-1">Fundamental Current (A):</label>
                      <input
                        type="number"
                        value={portion.fundamentalCurrent || ''}
                        onChange={(e) => updateBranchPortion(portion.id, 'fundamentalCurrent', Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        placeholder="I1"
                      />
                    </div>
                  )}
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">THD (%):</label>
                      <input
                        type="number"
                        value={portion.thd || ''}
                        onChange={(e) => updateBranchPortion(portion.id, 'thd', Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        placeholder="Total Harmonic Distortion"
                      />
                    </div>
                  )}
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Design Current (A):</label>
                      <input
                        type="number"
                        value={portion.designCurrent || ''}
                        className="w-full p-2 border rounded bg-gray-100"
                        readOnly
                        placeholder="Ib = I1 × √(1+THD²)"
                      />
                      <p className="text-xs text-gray-500 mt-1">Calculated from I1 and THD</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Neutral Current (A):</label>
                    <input
                      type="number"
                      value={portion.neutralCurrent || ''}
                      onChange={(e) => updateBranchPortion(portion.id, 'neutralCurrent', Number(e.target.value))}
                      className="w-full p-2 border rounded"
                      placeholder="Branch neutral current"
                    />
                  </div>
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Cable Configuration:</label>
                      <select
                        value={portion.cableConfig}
                        onChange={(e) => updateBranchPortion(portion.id, 'cableConfig', e.target.value as CableConfig)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="multicore">Multicore</option>
                        <option value="singlecore">Single-core</option>
                      </select>
                    </div>
                  )}
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Cable Type:</label>
                      <select
                        value={portion.cableType}
                        onChange={(e) => updateBranchPortion(portion.id, 'cableType', e.target.value as CableType)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="pvc">PVC</option>
                        <option value="xlpe">XLPE</option>
                      </select>
                    </div>
                  )}
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Cable Size (mm²):</label>
                      <select
                        value={portion.cableSize}
                        onChange={(e) => updateBranchPortion(portion.id, 'cableSize', Number(e.target.value))}
                        className="w-full p-2 border rounded"
                      >
                        {Object.keys(cableResistanceData).map(size => (
                          <option key={size} value={size}>{size} mm²</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {portion.type === 'lateral' && portion.cableConfig === 'singlecore' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Installation Method:</label>
                      <select
                        value={portion.installationMethod}
                        onChange={(e) => updateBranchPortion(portion.id, 'installationMethod', e.target.value as InstallationMethod)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="enclosed">Enclosed</option>
                        <option value="touching">Touching</option>
                        <option value="spaced">Spaced</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Resistance (mΩ/metre):</label>
                    <input
                      type="number"
                      value={portion.resistance || ''}
                      className="w-full p-2 border rounded bg-gray-100"
                      readOnly
                    />
                    {portion.type === 'riser' ? (
                      <p className="text-xs text-gray-500 mt-1">Using resistance from common portion</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Auto-calculated from cable properties</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Length (metre):</label>
                    <input
                      type="number"
                      value={portion.length || ''}
                      onChange={(e) => updateBranchPortion(portion.id, 'length', Number(e.target.value))}
                      className="w-full p-2 border rounded"
                      placeholder={`L${portion.id}`}
                    />
                  </div>
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tabulated Current (A): <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        value={portion.tabulatedCurrent || ''}
                        onChange={(e) => updateBranchPortion(portion.id, 'tabulatedCurrent', Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        placeholder="Current carrying capacity"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">From cable manufacturer data (required)</p>
                    </div>
                  )}
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Ambient Temp (°C):</label>
                      <input
                        type="number"
                        value={portion.ambientTemperature || ''}
                        onChange={(e) => updateBranchPortion(portion.id, 'ambientTemperature', Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        placeholder="Ambient temperature"
                      />
                    </div>
                  )}
                  {portion.type === 'lateral' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Operating Temp (°C):</label>
                      <input
                        type="number"
                        value={portion.operatingTemperature || ''}
                        onChange={(e) => updateBranchPortion(portion.id, 'operatingTemperature', Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        placeholder="Operating temperature"
                      />
                    </div>
                  )}
                </div>
                {portion.type === 'riser' && (
                  <div className="mt-2 px-2 py-1 bg-green-100 text-sm rounded">
                    <strong>Note:</strong> Riser portions use direct design current input and resistance from common portion.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      
      {/* Calculate Button */}
      <div className="mb-6">
        <button
          onClick={calculateCopperLoss}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Calculate Copper Loss
        </button>
      </div>
      
      {/* Results */}
      {copperLoss !== null && (
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-medium mb-2">Results:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium">Copper Loss:</p>
              <p className="text-lg">{copperLoss.toFixed(2)} W</p>
            </div>
            <div>
              <p className="text-sm font-medium">Copper Loss Percentage:</p>
              <p className="text-lg">{copperLossPercentage?.toFixed(2)}%</p>
            </div>
            {activePower !== null && (
              <div>
                <p className="text-sm font-medium">Active Power:</p>
                <p className="text-lg">{activePower.toFixed(2)} W</p>
              </div>
            )}
            {calculatedDiversityFactor !== null && (
              <div>
                <p className="text-sm font-medium">Diversity Factor:</p>
                <p className="text-lg">{calculatedDiversityFactor.toFixed(3)}</p>
              </div>
            )}
          </div>
          
          {isCompliant !== null && (
            <div className={`mb-4 p-2 rounded ${isCompliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <p className="font-medium flex items-center">
                {isCompliant 
                  ? <><span className="text-green-600 mr-1">✓</span> Compliant: The copper loss is within allowable limits.</>
                  : <><span className="text-red-600 mr-1">✗</span> Non-Compliant: The copper loss exceeds allowable limits.</>}
              </p>
                <p className="text-sm">
                  For {
                    circuitType === 'main' ? 'Main Circuit' :
                    circuitType === 'feeder' ? 'Feeder Circuit' :
                    circuitType === 'submain-nonres-short' ? 'Sub-main Circuit (Non-residential ≤100m)' :
                    circuitType === 'submain-nonres-long' ? 'Sub-main Circuit (Non-residential &gt;100m)' :
                    circuitType === 'submain-res' ? 'Sub-main Circuit (Residential)' :
                    'Final Circuit &gt;32A'
                  }, the maximum allowable copper loss is {getMaxAllowablePercentage(circuitType)}% of total active power.
                </p>
            </div>
          )}
          
          {/* Detailed Calculation Steps */}
          {calculationDetails.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Detailed Calculation Steps:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 border">Description</th>
                      <th className="px-4 py-2 border">Formula</th>
                      <th className="px-4 py-2 border">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculationDetails.map((detail, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 border">{detail.description}</td>
                        <td className="px-4 py-2 border font-mono text-sm">{detail.formula}</td>
                        <td className="px-4 py-2 border text-right">
                          {detail.result.toFixed(2)} {detail.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CopperLossCalculator;