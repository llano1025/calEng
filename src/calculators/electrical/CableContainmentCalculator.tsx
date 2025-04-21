import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

// Type definitions
type ContainmentType = 'conduit' | 'trunking';
type ConduitLength = 'short' | 'long'; // short <= 3m, long > 3m
type ConductorType = 'solid' | 'stranded';
type CalculationMethod = 'table' | 'space-factor';

// Specific types for state variables used as keys
type ConduitDiameterType = '16' | '20' | '25' | '32';
type NumberOfBendsType = 0 | 1 | 2;
// Run length will be derived as string

interface Cable {
  id: string;
  conductorType: ConductorType;
  csa: string; // Cross-sectional area in mm² for table lookup
  quantity: number;
  factor?: number; // Cable factor from tables
  outerDiameter?: number; // Outer diameter in mm for 45% rule
  description?: string; // Added for space factor method clarity
}

interface CableContainmentCalculatorProps {
  onShowTutorial?: () => void;
}

// --- Type Definition for conduitFactorLong ---
// Defines the structure for factors based on run length (string keys)
type RunLengthFactors = { [key: string]: number }; 

// Defines the structure for factors based on number of bends (numeric literal keys)
type BendFactors = {
  [key in NumberOfBendsType]: RunLengthFactors;
};

// Defines the overall structure for conduitFactorLong (string literal keys for diameter)
type ConduitFactorLongType = {
  [key in ConduitDiameterType]: BendFactors;
};
// --- End Type Definition ---


const CableContainmentCalculator: React.FC<CableContainmentCalculatorProps> = ({ onShowTutorial }) => {
  // State for calculator inputs
  const [containmentType, setContainmentType] = useState<ContainmentType>('conduit');
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('table');
  const [conduitLength, setConduitLength] = useState<ConduitLength>('short');
  // Use the specific type for conduitDiameter state
  const [conduitDiameter, setConduitDiameter] = useState<ConduitDiameterType>('16'); 
  // Use the specific type for numberOfBends state
  const [numberOfBends, setNumberOfBends] = useState<NumberOfBendsType>(0); 
  const [customConduitLength, setCustomConduitLength] = useState<number>(3); // Actual length in meters
  const [trunkingSize, setTrunkingSize] = useState<string>('50x37.5');
  // State for manual trunking dimensions (used in space factor method)
  const [trunkingWidth, setTrunkingWidth] = useState<number>(50);
  const [trunkingHeight, setTrunkingHeight] = useState<number>(37.5);
  // State for manual conduit diameter (used in space factor method)
  const [manualConduitDiameter, setManualConduitDiameter] = useState<number>(16); 

  const [cables, setCables] = useState<Cable[]>([
    { id: '1', conductorType: 'stranded', csa: '1.5', quantity: 1, outerDiameter: 2.5, description: 'Example Cable' }
  ]);
  
  // Results state
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [isCompliant, setIsCompliant] = useState<boolean>(false);
  const [totalCableFactor, setTotalCableFactor] = useState<number>(0);
  const [containmentFactor, setContainmentFactor] = useState<number>(0);
  const [spaceFactorPercentage, setSpaceFactorPercentage] = useState<number>(0);
  const [totalCableArea, setTotalCableArea] = useState<number>(0);
  const [containmentArea, setContainmentArea] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // For displaying errors

  // Available options for dropdowns
  const csaOptions = ['1', '1.5', '2.5', '4', '6', '10'];
  // Use specific types for options to match state
  const conduitDiameterOptions: ConduitDiameterType[] = ['16', '20', '25', '32']; 
  const bendOptions: NumberOfBendsType[] = [0, 1, 2];
  const trunkingSizeOptions = [
    '50x37.5', '50x50', '75x25', '75x37.5', '75x50', 
    '75x75', '100x25', '100x37.5', '100x50', '100x75', '100x100'
  ];

  // --- Table Data ---
  // Cable factors (unchanged)
  const cableFactor: {
    short: { [key in ConductorType]: { [csa: string]: number } };
    long: { [key in ConductorType]: { [csa: string]: number } };
    trunking: { [key in ConductorType]: { [csa: string]: number } };
  } = {
    short: { solid: { '1': 22, '1.5': 27, '2.5': 39 }, stranded: { '1.5': 31, '2.5': 43, '4': 58, '6': 88, '10': 146 } },
    long: { solid: { '1': 16, '1.5': 22, '2.5': 30, '4': 43, '6': 58, '10': 105 }, stranded: { '1': 16, '1.5': 22, '2.5': 30, '4': 43, '6': 58, '10': 105 } },
    trunking: { solid: { '1.5': 7.1, '2.5': 10.2 }, stranded: { '1.5': 8.1, '2.5': 11.4, '4': 15.2, '6': 22.9, '10': 36.3 } }
  };

  // Conduit factors for straight runs <= 3m
  const conduitFactorShort: { [key in ConduitDiameterType]: number } = {
    '16': 290, '20': 460, '25': 800, '32': 1400
  };

  // Conduit factors for runs > 3m or with bends - Apply the specific type
  const conduitFactorLong: ConduitFactorLongType = {
    '16': {
      0: { '3': 167, '3.5': 179, '4': 177, '4.5': 174, '5': 171, '6': 167, '7': 162, '8': 158, '9': 154, '10': 150 },
      1: { '1': 188, '1.5': 182, '2': 177, '2.5': 171, '3': 167, '3.5': 162, '4': 158, '4.5': 154, '5': 150, '6': 143, '7': 136, '8': 130, '9': 125, '10': 120 },
      2: { '1': 177, '1.5': 167, '2': 158, '2.5': 150, '3': 143, '3.5': 136, '4': 130, '4.5': 125, '5': 120, '6': 111, '7': 103, '8': 97, '9': 91, '10': 86 }
    },
    '20': {
      0: { '3': 270, '3.5': 290, '4': 286, '4.5': 282, '5': 278, '6': 270, '7': 263, '8': 256, '9': 250, '10': 244 },
      1: { '1': 303, '1.5': 294, '2': 286, '2.5': 278, '3': 270, '3.5': 263, '4': 256, '4.5': 250, '5': 244, '6': 233, '7': 222, '8': 213, '9': 204, '10': 196 },
      2: { '1': 286, '1.5': 270, '2': 256, '2.5': 244, '3': 233, '3.5': 222, '4': 213, '4.5': 204, '5': 196, '6': 182, '7': 169, '8': 159, '9': 149, '10': 141 }
    },
    '25': {
      0: { '3': 487, '3.5': 521, '4': 514, '4.5': 507, '5': 500, '6': 487, '7': 475, '8': 463, '9': 452, '10': 442 },
      1: { '1': 543, '1.5': 528, '2': 514, '2.5': 500, '3': 487, '3.5': 475, '4': 463, '4.5': 452, '5': 442, '6': 422, '7': 404, '8': 388, '9': 373, '10': 358 },
      2: { '1': 514, '1.5': 487, '2': 463, '2.5': 442, '3': 422, '3.5': 404, '4': 388, '4.5': 373, '5': 358, '6': 333, '7': 311, '8': 292, '9': 275, '10': 260 }
    },
    '32': {
      0: { '3': 857, '3.5': 911, '4': 900, '4.5': 889, '5': 878, '6': 857, '7': 837, '8': 818, '9': 800, '10': 783 },
      1: { '1': 947, '1.5': 923, '2': 900, '2.5': 878, '3': 857, '3.5': 837, '4': 818, '4.5': 800, '5': 783, '6': 750, '7': 720, '8': 692, '9': 667, '10': 643 },
      2: { '1': 900, '1.5': 857, '2': 818, '2.5': 783, '3': 750, '3.5': 720, '4': 692, '4.5': 667, '5': 643, '6': 600, '7': 563, '8': 529, '9': 500, '10': 474 }
    }
  };

  // Trunking factors
  const trunkingFactor: { [key: string]: number } = {
    '50x37.5': 767, '50x50': 1037, '75x25': 738, '75x37.5': 1146, '75x50': 1555, 
    '75x75': 2371, '100x25': 993, '100x37.5': 1542, '100x50': 2091, '100x75': 3189, 
    '100x100': 4252
  };
  // --- End Table Data ---

  // Add a new cable to the list
  const addCable = () => {
    const newId = Date.now().toString(); // Use timestamp for unique ID
    const newCable: Cable = calculationMethod === 'table'
      ? { id: newId, conductorType: 'stranded', csa: '1.5', quantity: 1 }
      : { id: newId, conductorType: 'stranded', csa: '1.5', quantity: 1, outerDiameter: 2.5, description: '' };
    setCables([...cables, newCable]);
    resetCalculation(); // Reset results when cables change
  };

  // Remove a cable from the list
  const removeCable = (id: string) => {
    if (cables.length > 1) {
      setCables(cables.filter(cable => cable.id !== id));
      resetCalculation(); // Reset results when cables change
    }
  };

  // Update a cable property
  const updateCable = (id: string, field: keyof Cable, value: any) => {
    // Ensure quantity and outerDiameter are numbers
    let processedValue = value;
    if (field === 'quantity') {
        processedValue = parseInt(value, 10) || 1; // Default to 1 if parsing fails
        if (processedValue < 1) processedValue = 1; // Ensure quantity is at least 1
    } else if (field === 'outerDiameter') {
        processedValue = parseFloat(value) || undefined; // Store as number or undefined
        if (processedValue !== undefined && processedValue <= 0) processedValue = undefined; // Ensure positive diameter
    }

    setCables(cables.map(cable => 
      cable.id === id ? { ...cable, [field]: processedValue } : cable
    ));
    resetCalculation(); // Reset results when cables change
  };
  
  // Helper function to calculate CSA from diameter (Area = π * (d/2)^2)
  const calculateCsaFromDiameter = (diameter: number): number => {
    if (!diameter || diameter <= 0) return 0;
    return Math.PI * Math.pow(diameter / 2, 2);
  };

  // --- Calculate Compliance ---
  const calculateCompliance = () => {
    setIsCalculated(false); // Reset calculation state initially
    setErrorMessage(null); // Clear previous errors
    let calculatedIsCompliant = false;
    let calculatedTotalFactor = 0;
    let calculatedContainmentFactor = 0;
    let calculatedSpaceFactor = 0;
    let calculatedTotalCableArea = 0;
    let calculatedContainmentArea = 0;

    try { // Wrap calculation in try/catch for robustness
        if (calculationMethod === 'table') {
            // --- Table Lookup Method ---
            let runningTotalFactor = 0;
            const updatedCables = cables.map(cable => {
                let factor = 0;
                const factorTable = containmentType === 'conduit' 
                    ? (conduitLength === 'short' ? cableFactor.short : cableFactor.long)
                    : cableFactor.trunking;

                // Check if conductor type and csa exist in the selected table
                if (factorTable?.[cable.conductorType]?.[cable.csa]) {
                    factor = factorTable[cable.conductorType][cable.csa];
                } else {
                    // Handle missing factor data gracefully
                    console.warn(`Factor not found for: ${containmentType}, ${conduitLength}, ${cable.conductorType}, ${cable.csa}`);
                    // Optionally throw an error or set a default factor
                }
                
                const cableTotalFactor = factor * cable.quantity;
                runningTotalFactor += cableTotalFactor;
                return { ...cable, factor: cableTotalFactor }; // Store calculated factor per cable item
            });
            
            setCables(updatedCables); // Update state with calculated factors per cable
            calculatedTotalFactor = runningTotalFactor;

            // Get containment factor
            if (containmentType === 'conduit') {
                if (conduitLength === 'short') {
                    calculatedContainmentFactor = conduitFactorShort[conduitDiameter] || 0;
                } else {
                    // --- FIX APPLIED HERE ---
                    // Use the specific types for indexing conduitFactorLong
                    const runLengthKey = customConduitLength.toString();
                    
                    // Check existence safely using optional chaining and direct access
                    const factorValue = conduitFactorLong?.[conduitDiameter]?.[numberOfBends]?.[runLengthKey];

                    if (factorValue !== undefined) {
                        calculatedContainmentFactor = factorValue;
                    } else {
                        // Handle case where the specific combination is not in the table
                        console.warn(`Conduit factor not found for diameter: ${conduitDiameter}, bends: ${numberOfBends}, length: ${runLengthKey}`);
                        calculatedContainmentFactor = 0; // Set a default or throw error
                        setErrorMessage(`Conduit factor data missing for ${conduitDiameter}mm, ${numberOfBends} bends, ${runLengthKey}m length.`);
                    }
                    // --- END FIX ---
                }
            } else { // Trunking
                calculatedContainmentFactor = trunkingFactor[trunkingSize] || 0;
                if (calculatedContainmentFactor === 0 && trunkingSize) {
                     console.warn(`Trunking factor not found for size: ${trunkingSize}`);
                     setErrorMessage(`Trunking factor data missing for size ${trunkingSize}.`);
                }
            }
            
            // Check compliance: containment factor >= total cable factor
            calculatedIsCompliant = calculatedContainmentFactor > 0 && calculatedContainmentFactor >= calculatedTotalFactor;
            if (calculatedContainmentFactor <= 0 && !errorMessage) {
                 setErrorMessage("Containment factor could not be determined. Check inputs or data tables.");
            }

        } else {
            // --- 45% Space Factor Method ---
            let runningTotalCableArea = 0;
            let missingDiameter = false;
            cables.forEach(cable => {
                if (cable.outerDiameter && cable.outerDiameter > 0) {
                    const cableArea = calculateCsaFromDiameter(cable.outerDiameter);
                    runningTotalCableArea += cableArea * cable.quantity;
                } else {
                    missingDiameter = true; // Flag if any cable is missing diameter
                }
            });

            if (missingDiameter) {
                setErrorMessage("Please enter a valid outer diameter (mm) for all cables.");
                // Reset results and stop calculation if data is missing
                setTotalCableArea(0);
                setContainmentArea(0);
                setSpaceFactorPercentage(0);
                setIsCompliant(false);
                setIsCalculated(true); // Show results section with the error message
                return; 
            }
            
            calculatedTotalCableArea = runningTotalCableArea;

            // Get containment area based on type and inputs
            if (containmentType === 'conduit') {
                if (manualConduitDiameter > 0) {
                    calculatedContainmentArea = calculateCsaFromDiameter(manualConduitDiameter);
                } else {
                     setErrorMessage("Please enter a valid conduit diameter (mm).");
                }
            } else { // Trunking
                if (trunkingWidth > 0 && trunkingHeight > 0) {
                    calculatedContainmentArea = trunkingWidth * trunkingHeight;
                } else {
                     setErrorMessage("Please enter valid trunking width and height (mm).");
                }
            }

            // Calculate space factor percentage
            if (calculatedContainmentArea > 0) {
                calculatedSpaceFactor = (calculatedTotalCableArea / calculatedContainmentArea) * 100;
                // Check compliance: space factor <= 45%
                calculatedIsCompliant = calculatedSpaceFactor <= 45;
            } else {
                calculatedSpaceFactor = 0; // Avoid division by zero
                calculatedIsCompliant = false; // Cannot be compliant if containment area is zero
                 if (!errorMessage) setErrorMessage("Containment area is zero. Please check conduit/trunking dimensions.");
            }
        }

    } catch (error) {
        console.error("Calculation Error:", error);
        setErrorMessage("An unexpected error occurred during calculation.");
        calculatedIsCompliant = false; // Ensure non-compliant on error
    } finally {
        // Update all result states at once
        setTotalCableFactor(calculatedTotalFactor);
        setContainmentFactor(calculatedContainmentFactor);
        setTotalCableArea(calculatedTotalCableArea);
        setContainmentArea(calculatedContainmentArea);
        setSpaceFactorPercentage(calculatedSpaceFactor);
        setIsCompliant(calculatedIsCompliant);
        setIsCalculated(true); // Mark calculation as complete (even if errors occurred)
    }
  };
  // --- End Calculate Compliance ---


  // Clear calculation results and error messages
  const resetCalculation = () => {
    setIsCalculated(false);
    setErrorMessage(null);
    // Optionally reset factors shown in the table
    setCables(cables.map(c => ({ ...c, factor: undefined }))); 
  };

  // Reset form/results when major inputs change
  useEffect(() => {
    resetCalculation();
  }, [calculationMethod, containmentType, conduitLength, conduitDiameter, numberOfBends, trunkingSize, customConduitLength, manualConduitDiameter, trunkingWidth, trunkingHeight]); // Added dependencies
  
  // Effect to manage default customConduitLength based on bends (for table method)
  useEffect(() => {
    // Only adjust if using table method and long conduit
    if (calculationMethod === 'table' && containmentType === 'conduit' && conduitLength === 'long') {
      // Check if current custom length is valid for the selected number of bends
      const validLengths = Object.keys(conduitFactorLong[conduitDiameter][numberOfBends]);
      
      // If current length is not valid, set to the first valid length for that bend count
      if (!validLengths.includes(customConduitLength.toString())) {
          // Find the smallest valid length for the current bend configuration
          const smallestValidLength = Math.min(...validLengths.map(Number));
          setCustomConduitLength(smallestValidLength);
      }
    }
  }, [numberOfBends, conduitLength, conduitDiameter, calculationMethod, containmentType]); // Added dependencies

  // --- Render Logic ---
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Cable Containment Calculator</h2>
        {onShowTutorial && (
          <button
            onClick={onShowTutorial}
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
             Tutorial
          </button>
        )}
      </div>

      {/* Input Sections in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Column 1: Containment Type & Calculation Method */}
        <div className="space-y-6">
          {/* Containment Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Select Containment Type:
            </label>
            <div className="flex space-x-3">
              <button
                className={`flex-1 py-3 px-4 rounded-lg text-center transition-all duration-150 text-sm font-medium border ${
                  containmentType === 'conduit'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setContainmentType('conduit')}
              >
                Conduit
              </button>
              <button
                className={`flex-1 py-3 px-4 rounded-lg text-center transition-all duration-150 text-sm font-medium border ${
                  containmentType === 'trunking'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setContainmentType('trunking')}
              >
                Trunking
              </button>
            </div>
          </div>

          {/* Calculation Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Select Calculation Method:
            </label>
            <div className="flex space-x-3">
              <button
                className={`flex-1 py-3 px-4 rounded-lg text-center transition-all duration-150 text-sm font-medium border ${
                  calculationMethod === 'table'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setCalculationMethod('table')}
              >
                Table Lookup
              </button>
              <button
                className={`flex-1 py-3 px-4 rounded-lg text-center transition-all duration-150 text-sm font-medium border ${
                  calculationMethod === 'space-factor'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setCalculationMethod('space-factor')}
              >
                45% Space Factor
              </button>
            </div>
             <p className="text-xs text-gray-500 mt-2">
                {calculationMethod === 'table' 
                 ? "Uses predefined factors based on BS 7671 Appendix 4 tables."
                 : "Calculates based on cable/containment areas (max 45% fill)."
                }
            </p>
          </div>
        </div>

        {/* Column 2: Containment Details */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-md font-semibold mb-3 text-gray-700 border-b pb-2">
              3. {containmentType === 'conduit' ? 'Conduit Details' : 'Trunking Details'} ({calculationMethod === 'table' ? 'Table Lookup' : 'Space Factor'})
            </h3>
            
            {/* Conduit Inputs */}
            {containmentType === 'conduit' && (
              <>
                {calculationMethod === 'table' ? (
                  // Conduit - Table Lookup Inputs
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="conduitDiameterSelect" className="block text-sm font-medium text-gray-700 mb-1">
                        Conduit Diameter (mm)
                      </label>
                      <select
                        id="conduitDiameterSelect"
                        value={conduitDiameter}
                        // Use type assertion for onChange event
                        onChange={(e) => setConduitDiameter(e.target.value as ConduitDiameterType)} 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                      >
                        {conduitDiameterOptions.map((size) => (
                          <option key={size} value={size}> {size} mm </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Conduit Length / Bends
                      </label>
                      <div className="flex space-x-2">
                        <button
                          className={`flex-1 py-2 px-3 rounded-md text-center transition-colors text-xs font-medium border ${
                            conduitLength === 'short'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                          }`}
                          onClick={() => setConduitLength('short')}
                        >
                          ≤ 3m (Straight)
                        </button>
                        <button
                          className={`flex-1 py-2 px-3 rounded-md text-center transition-colors text-xs font-medium border ${
                            conduitLength === 'long'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                          }`}
                          onClick={() => setConduitLength('long')}
                        >
                           3m or With Bends
                        </button>
                      </div>
                    </div>

                    {/* Inputs only shown for 'long' conduit runs */}
                    {conduitLength === 'long' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Bends
                          </label>
                           <div className="flex space-x-2">
                            {bendOptions.map(bendCount => (
                                <button
                                  key={bendCount}
                                  className={`flex-1 py-2 px-3 rounded-md text-center transition-colors text-xs font-medium border ${
                                    numberOfBends === bendCount
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                  }`}
                                  onClick={() => setNumberOfBends(bendCount)}
                                >
                                  {bendCount === 0 ? 'No Bends' : `${bendCount} Bend${bendCount > 1 ? 's' : ''}`}
                                </button>
                            ))}
                           </div>
                        </div>
                        
                        <div>
                          <label htmlFor="customConduitLengthSelect" className="block text-sm font-medium text-gray-700 mb-1">
                            Actual Conduit Length (m)
                          </label>
                          <select
                            id="customConduitLengthSelect"
                            value={customConduitLength.toString()} // Value must be string for select
                            onChange={(e) => setCustomConduitLength(parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                          >
                            {/* Dynamically generate options based on valid lengths for the selected diameter/bends */}
                            {Object.keys(conduitFactorLong[conduitDiameter][numberOfBends]).map((length) => (
                              <option key={length} value={length}>
                                {length} m
                              </option>
                            ))}
                          </select>
                           <p className="text-xs text-gray-500 mt-1">Select the actual run length.</p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // Conduit - 45% Space Factor Input
                  <div>
                    <label htmlFor="manualConduitDiameterInput" className="block text-sm font-medium text-gray-700 mb-1">
                      Conduit Internal Diameter (mm)
                    </label>
                    <input
                      id="manualConduitDiameterInput"
                      type="number"
                      min="1"
                      step="0.1"
                      placeholder="e.g., 13.5"
                      value={manualConduitDiameter || ''}
                      onChange={(e) => setManualConduitDiameter(parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the internal diameter for area calculation.</p>
                  </div>
                )}
              </>
            )}

            {/* Trunking Inputs */}
            {containmentType === 'trunking' && (
              <>
                {calculationMethod === 'table' ? (
                  // Trunking Size - Table Lookup
                  <div>
                    <label htmlFor="trunkingSizeSelect" className="block text-sm font-medium text-gray-700 mb-1">
                      Trunking Size (mm)
                    </label>
                    <select
                      id="trunkingSizeSelect"
                      value={trunkingSize}
                      onChange={(e) => setTrunkingSize(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                    >
                      {trunkingSizeOptions.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Trunking Size - Manual Input for 45% Rule
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trunking Internal Dimensions (mm)
                    </label>
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <label htmlFor="trunkingWidthInput" className="block text-xs text-gray-500 mb-1">Width</label>
                        <input
                          id="trunkingWidthInput"
                          type="number"
                          min="1"
                          placeholder="Width"
                          value={trunkingWidth || ''}
                           onChange={(e) => setTrunkingWidth(parseFloat(e.target.value) || 0)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="trunkingHeightInput" className="block text-xs text-gray-500 mb-1">Height</label>
                        <input
                          id="trunkingHeightInput"
                          type="number"
                          min="1"
                          placeholder="Height"
                          value={trunkingHeight || ''}
                          onChange={(e) => setTrunkingHeight(parseFloat(e.target.value) || 0)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 text-sm"
                        />
                      </div>
                    </div>
                     <p className="text-xs text-gray-500 mt-1">Enter internal dimensions for area calculation.</p>
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      {/* Cables Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-semibold text-gray-800">4. Cable Details</h3>
          <button
            onClick={addCable}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ease-in-out duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
             Add Cable
          </button>
        </div>

        {/* Cable Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                {calculationMethod === 'table' ? (
                  // Headers for Table Lookup
                  <>
                    <th className="px-4 py-2 font-medium">Conductor Type</th>
                    <th className="px-4 py-2 font-medium">CSA (mm²)</th>
                    <th className="px-4 py-2 font-medium text-center">Quantity</th>
                    {isCalculated && <th className="px-4 py-2 font-medium text-right">Cable Factor</th>}
                  </>
                ) : (
                  // Headers for Space Factor
                  <>
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-4 py-2 font-medium">Outer Dia. (mm)</th>
                    <th className="px-4 py-2 font-medium text-center">Quantity</th>
                    {isCalculated && <th className="px-4 py-2 font-medium text-right">Area (mm²)</th>}
                  </>
                )}
                <th className="px-4 py-2 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cables.map((cable, index) => (
                <tr key={cable.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {calculationMethod === 'table' ? (
                    // Inputs for Table Lookup
                    <>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <select
                          value={cable.conductorType}
                          onChange={(e) => 
                            updateCable(cable.id, 'conductorType', e.target.value as ConductorType)
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 text-sm py-1"
                        >
                          <option value="solid">Solid</option>
                          <option value="stranded">Stranded</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <select
                          value={cable.csa}
                          onChange={(e) => updateCable(cable.id, 'csa', e.target.value)}
                           className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 text-sm py-1"
                        >
                          {/* Filter CSA options based on conductor type and method */}
                          {Object.keys(containmentType === 'trunking' ? cableFactor.trunking[cable.conductorType] : cableFactor.short[cable.conductorType] ?? {}).map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </td>
                    </>
                  ) : (
                    // Inputs for Space Factor
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          placeholder="e.g., 2.5mm² T&E"
                          value={cable.description || ''}
                          onChange={(e) => updateCable(cable.id, 'description', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 text-sm py-1"
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          placeholder="e.g., 9.2"
                          value={cable.outerDiameter || ''}
                          onChange={(e) => 
                            updateCable(cable.id, 'outerDiameter', e.target.value) // Pass string for parsing in updateCable
                          }
                          className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 text-sm py-1"
                        />
                      </td>
                    </>
                  )}
                  {/* Quantity Input (Common) */}
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      min="1"
                      value={cable.quantity}
                      onChange={(e) => 
                        updateCable(cable.id, 'quantity', e.target.value) // Pass string for parsing
                      }
                      className="block w-16 mx-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 text-sm py-1 text-center"
                    />
                  </td>
                  {/* Calculated Value (Factor or Area) */}
                  {isCalculated && (
                    <td className="px-4 py-2 text-right whitespace-nowrap text-gray-700">
                      {calculationMethod === 'table' 
                        ? cable.factor?.toFixed(1) ?? '-' // Show calculated factor
                        : cable.outerDiameter 
                          ? (calculateCsaFromDiameter(cable.outerDiameter) * cable.quantity).toFixed(2) // Show total area for this cable type
                          : '-'
                      }
                    </td>
                  )}
                  {/* Remove Button */}
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeCable(cable.id)}
                      disabled={cables.length === 1}
                      className={`p-1 rounded-md transition-colors ${
                        cables.length === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-100'
                      }`}
                      title="Remove Cable"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         {cables.length === 0 && <p className="text-center text-gray-500 mt-4">Please add at least one cable.</p>}
      </div>

      {/* Calculate Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={calculateCompliance}
          disabled={cables.length === 0} // Disable if no cables
          className="inline-flex items-center px-6 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:bg-blue-800 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icons.Calculator className="w-5 h-5 mr-2" /> Calculate Compliance
        </button>
      </div>

      {/* --- Results Section --- */}
      {isCalculated && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Calculation Results</h3>
          
          {/* Error Message Display */}
          {errorMessage && (
             <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md text-sm">
                <strong>Error:</strong> {errorMessage}
            </div>
          )}

          {/* Results Grid */}
          <div className={`grid grid-cols-1 ${calculationMethod === 'table' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-4`}>
            
            {/* Result Cards - Common Status Card */}
             <div className={`p-4 rounded-lg shadow-md border ${isCompliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-sm font-medium text-gray-600 mb-1">Compliance Status</p>
                <p className={`text-2xl font-bold ${isCompliant ? 'text-green-700' : 'text-red-700'}`}>
                  {isCompliant ? 'Compliant' : 'Non-Compliant'}
                </p>
                 <p className={`text-xs mt-1 ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                    {isCompliant 
                        ? 'Installation meets requirements.' 
                        : calculationMethod === 'table' 
                            ? 'Containment factor is less than total cable factor.' 
                            : 'Space factor exceeds 45% limit.'
                    }
                    {!isCompliant && errorMessage && ' (See error above)'}
                 </p>
              </div>

            {/* Result Cards - Method Specific */}
            {calculationMethod === 'table' ? (
              // Table Method Results
              <>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Cable Factor</p>
                  <p className="text-2xl font-bold text-gray-800">{totalCableFactor.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">Sum of factors for all cables.</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">{containmentType === 'conduit' ? 'Conduit' : 'Trunking'} Factor</p>
                  <p className="text-2xl font-bold text-gray-800">{containmentFactor}</p>
                   <p className="text-xs text-gray-500 mt-1">Capacity factor of the selected containment.</p>
                </div>
              </>
            ) : (
              // Space Factor Method Results
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-1">Space Factor Used</p>
                <p className="text-2xl font-bold text-gray-800">{spaceFactorPercentage.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  (Total Cable Area: {totalCableArea.toFixed(1)} mm² / Containment Area: {containmentArea.toFixed(1)} mm²)
                </p>
                 <p className="text-xs text-gray-500 mt-1">Maximum allowed: 45%</p>
              </div>
            )}
          </div>
          
          {/* Summary Message */}
          {!errorMessage && (
             <div className="mt-4 text-sm text-gray-700">
                {isCompliant 
                    ? `The selected ${containmentType} (${calculationMethod === 'table' ? 'Factor: ' + containmentFactor : 'Area: ' + containmentArea.toFixed(1) + 'mm²'}) has sufficient capacity for the specified cables.`
                    : `The selected ${containmentType} (${calculationMethod === 'table' ? 'Factor: ' + containmentFactor : 'Area: ' + containmentArea.toFixed(1) + 'mm²'}) does not have sufficient capacity. Consider a larger size, different type, or reducing the number/size of cables.`
                }
            </div>
          )}
        </div>
      )}
      {/* --- End Results Section --- */}

    </div> // End main container
  );
};

export default CableContainmentCalculator;

