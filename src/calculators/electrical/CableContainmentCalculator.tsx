import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

// Type definitions
type ContainmentType = 'conduit' | 'trunking';
type ConduitLength = 'short' | 'long'; // short <= 3m, long > 3m
type ConductorType = 'solid' | 'stranded';
type CalculationMethod = 'table' | 'space-factor';

interface Cable {
  id: string;
  conductorType: ConductorType;
  csa: string; // Cross-sectional area in mm² for table lookup
  quantity: number;
  factor?: number; // Cable factor from tables
  outerDiameter?: number; // Outer diameter in mm for 45% rule
}

interface CableContainmentCalculatorProps {
  onShowTutorial?: () => void;
}

const CableContainmentCalculator: React.FC<CableContainmentCalculatorProps> = ({ onShowTutorial }) => {
  // State for calculator inputs
  const [containmentType, setContainmentType] = useState<ContainmentType>('conduit');
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('table');
  const [conduitLength, setConduitLength] = useState<ConduitLength>('short');
  const [conduitDiameter, setConduitDiameter] = useState<string>('16');
  const [numberOfBends, setNumberOfBends] = useState<number>(0);
  const [customConduitLength, setCustomConduitLength] = useState<number>(3);
  const [trunkingSize, setTrunkingSize] = useState<string>('50x37.5');
  const [cables, setCables] = useState<Cable[]>([
    { id: '1', conductorType: 'stranded', csa: '1.5', quantity: 1, outerDiameter: 2.5 }
  ]);
  
  // Results state
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [isCompliant, setIsCompliant] = useState<boolean>(false);
  const [totalCableFactor, setTotalCableFactor] = useState<number>(0);
  const [containmentFactor, setContainmentFactor] = useState<number>(0);
  const [spaceFactorPercentage, setSpaceFactorPercentage] = useState<number>(0);

  // Available options for dropdowns
  const csaOptions = ['1', '1.5', '2.5', '4', '6', '10'];
  const conduitDiameterOptions = ['16', '20', '25', '32'];
  const bendOptions = [0, 1, 2];
  const trunkingSizeOptions = [
    '50x37.5', '50x50', '75x25', '75x37.5', '75x50', 
    '75x75', '100x25', '100x37.5', '100x50', '100x75', '100x100'
  ];

  // Table data
  const cableFactor: {
    short: {
      [conductorType: string]: {[key: string]: number}
    },
    long: {
      [conductorType: string]: {[key: string]: number}
    },
    trunking: {
      [conductorType: string]: {[key: string]: number}
    }
  } = {
    short: { // Straight runs not exceeding 3m
      solid: {
        '1': 22,
        '1.5': 27,
        '2.5': 39
      },
      stranded: {
        '1.5': 31,
        '2.5': 43,
        '4': 58,
        '6': 88,
        '10': 146
      }
    },
    long: { // Exceeding 3m or with bends
      solid: {
        '1': 16,
        '1.5': 22,
        '2.5': 30,
        '4': 43,
        '6': 58,
        '10': 105
      },
      stranded: {
        '1': 16,
        '1.5': 22,
        '2.5': 30,
        '4': 43,
        '6': 58,
        '10': 105
      }
    },
    trunking: {
      solid: {
        '1.5': 7.1,
        '2.5': 10.2
      },
      stranded: {
        '1.5': 8.1,
        '2.5': 11.4,
        '4': 15.2,
        '6': 22.9,
        '10': 36.3
      }
    }
  };

  // Conduit factors for straight runs <= 3m
  const conduitFactorShort: {[key: string]: number} = {
    '16': 290,
    '20': 460,
    '25': 800,
    '32': 1400
  };

  // Conduit factors for runs > 3m or with bends
  const conduitFactorLong = {
    // [diameter, bends] => factor
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
  const trunkingFactor: {[key: string]: number} = {
    '50x37.5': 767,
    '50x50': 1037,
    '75x25': 738,
    '75x37.5': 1146,
    '75x50': 1555,
    '75x75': 2371,
    '100x25': 993,
    '100x37.5': 1542,
    '100x50': 2091,
    '100x75': 3189,
    '100x100': 4252
  };

  // Cable cross-sectional areas (approximate for space factor calculation)
  const cableCsa: {[key: string]: number} = {
    '1': 3.5,
    '1.5': 4.5,
    '2.5': 6.5,
    '4': 9.5,
    '6': 13.5,
    '10': 20.5
  };

  // Containment internal areas (in mm²)
  const conduitArea: {[key: string]: number} = {
    '16': 201,
    '20': 314,
    '25': 491,
    '32': 804
  };

  const trunkingArea: {[key: string]: number} = {
    '50x37.5': 1875,
    '50x50': 2500,
    '75x25': 1875,
    '75x37.5': 2812.5,
    '75x50': 3750,
    '75x75': 5625,
    '100x25': 2500,
    '100x37.5': 3750,
    '100x50': 5000,
    '100x75': 7500,
    '100x100': 10000
  };

  // Add a new cable to the list
  const addCable = () => {
    const newId = (cables.length + 1).toString();
    if (calculationMethod === 'table') {
      setCables([...cables, { id: newId, conductorType: 'stranded', csa: '1.5', quantity: 1 }]);
    } else {
      setCables([...cables, { id: newId, conductorType: 'stranded', csa: '1.5', quantity: 1, outerDiameter: 2.5 }]);
    }
  };

  // Remove a cable from the list
  const removeCable = (id: string) => {
    if (cables.length > 1) {
      setCables(cables.filter(cable => cable.id !== id));
    }
  };

  // Update a cable property
  const updateCable = (id: string, field: keyof Cable, value: any) => {
    setCables(cables.map(cable => 
      cable.id === id ? { ...cable, [field]: value } : cable
    ));
  };

  // Helper to get run length from conduit length state and numeric input
  const getRunLength = (): number => {
    if (conduitLength === 'short') return 3;
    
    // Use custom conduit length (already set by dropdown)
    return customConduitLength;
  };
  
  // Helper function to calculate CSA from diameter
  const calculateCsaFromDiameter = (diameter: number): number => {
    if (!diameter || diameter <= 0) return 0;
    
    // Calculate CSA using πr²
    const radius = diameter / 2;
    return Math.PI * Math.pow(radius, 2);
  };

  // Calculate compliance
  const calculateCompliance = () => {
    if (calculationMethod === 'table') {
      // Table lookup method
      let totalFactor = 0;
      
      // Calculate total cable factor
      cables.forEach(cable => {
        let factor = 0;
        if (containmentType === 'conduit') {
          // Use appropriate conduit factor table
          const factorTable = conduitLength === 'short' ? cableFactor.short : cableFactor.long;
          if (factorTable[cable.conductorType][cable.csa]) {
            factor = factorTable[cable.conductorType][cable.csa] * cable.quantity;
          }
        } else {
          // Use trunking factor table
          if (cableFactor.trunking[cable.conductorType][cable.csa]) {
            factor = cableFactor.trunking[cable.conductorType][cable.csa] * cable.quantity;
          }
        }
        
        // Update cable with its factor for display
        updateCable(cable.id, 'factor', factor);
        totalFactor += factor;
      });
      
      setTotalCableFactor(totalFactor);
      
      // Get containment factor
      let factor = 0;
      if (containmentType === 'conduit') {
        if (conduitLength === 'short') {
          factor = conduitFactorShort[conduitDiameter] || 0;
        } else {
          // Use run length from custom input
          const runLength = customConduitLength.toString();
          if (conduitFactorLong?.[conduitDiameter]?.[numberOfBends]?.[runLength]) {
            factor = conduitFactorLong[conduitDiameter][numberOfBends][runLength];
          }
        }
      } else {
        factor = trunkingFactor[trunkingSize] || 0;
      }
      
      setContainmentFactor(factor);
      
      // Check compliance: containment factor should be >= total cable factor
      setIsCompliant(factor >= totalFactor);
    } else {
      // 45% space factor method
      let totalCableArea = 0;
      
      // Calculate total cable area from outer diameters
      cables.forEach(cable => {
        if (cable.outerDiameter && cable.outerDiameter > 0) {
          const cableArea = calculateCsaFromDiameter(cable.outerDiameter);
          totalCableArea += cableArea * cable.quantity;
        }
      });
      
      // Get containment area based on type
      let containmentArea = 0;
      
      if (containmentType === 'conduit') {
        // Calculate area from user-input diameter
        const diameter = parseFloat(conduitDiameter) || 0;
        if (diameter > 0) {
          containmentArea = calculateCsaFromDiameter(diameter);
        }
      } else {
        // Get width and height from inputs
        const widthInput = document.getElementById('trunkingWidth') as HTMLInputElement;
        const heightInput = document.getElementById('trunkingHeight') as HTMLInputElement;
        
        if (widthInput && heightInput && widthInput.value && heightInput.value) {
          const width = parseFloat(widthInput.value);
          const height = parseFloat(heightInput.value);
          
          if (!isNaN(width) && !isNaN(height)) {
            containmentArea = width * height;
          }
        }
      }
      
      // Calculate space factor percentage
      const spaceFactor = containmentArea > 0 ? (totalCableArea / containmentArea) * 100 : 100;
      setSpaceFactorPercentage(spaceFactor);
      
      // Check compliance: space factor should be <= 45%
      setIsCompliant(spaceFactor <= 45);
    }
    
    setIsCalculated(true);
  };

  // Clear calculation results
  const resetCalculation = () => {
    setIsCalculated(false);
  };

  // Reset form when calculation method changes
  useEffect(() => {
    resetCalculation();
  }, [calculationMethod, containmentType, conduitLength, conduitDiameter, numberOfBends, trunkingSize]);
  
  // Set default conduit lengths based on number of bends
  useEffect(() => {
    if (conduitLength === 'long') {
      // Set a valid default length based on the number of bends
      if (numberOfBends === 0) {
        setCustomConduitLength(3);
      } else {
        setCustomConduitLength(numberOfBends === 1 ? 1 : 1);
      }
    }
  }, [numberOfBends, conduitLength]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Cable Containment Calculator</h2>
        {onShowTutorial && (
          <button
            onClick={onShowTutorial}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <span className="w-5 h-5 mr-1">ⓘ</span> Tutorial
          </button>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Containment Type:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            className={`p-4 rounded-lg text-center transition-colors ${
              containmentType === 'conduit'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            onClick={() => setContainmentType('conduit')}
          >
            Conduit
          </button>
          <button
            className={`p-4 rounded-lg text-center transition-colors ${
              containmentType === 'trunking'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            onClick={() => setContainmentType('trunking')}
          >
            Trunking
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Calculation Method:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            className={`p-4 rounded-lg text-center transition-colors ${
              calculationMethod === 'table'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            onClick={() => setCalculationMethod('table')}
          >
            Table Lookup Method
          </button>
          <button
            className={`p-4 rounded-lg text-center transition-colors ${
              calculationMethod === 'space-factor'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            onClick={() => setCalculationMethod('space-factor')}
          >
            45% Space Factor Rule
          </button>
        </div>
      </div>

      {/* Containment Details */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">
          {containmentType === 'conduit' ? 'Conduit Details' : 'Trunking Details'}
        </h3>
        
        {containmentType === 'conduit' ? (
          <>
            {calculationMethod === 'table' ? (
              <div className="space-y-4">
                {/* Conduit Diameter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conduit Diameter (mm)
                  </label>
                  <select
                    value={conduitDiameter}
                    onChange={(e) => setConduitDiameter(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  >
                    {conduitDiameterOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conduit Length */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conduit Length
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`p-3 rounded-lg text-center transition-colors ${
                        conduitLength === 'short'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }`}
                      onClick={() => setConduitLength('short')}
                    >
                      ≤ 3m (Straight)
                    </button>
                    <button
                      className={`p-3 rounded-lg text-center transition-colors ${
                        conduitLength === 'long'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }`}
                      onClick={() => setConduitLength('long')}
                    >
                       3m or With Bends
                    </button>
                  </div>
                </div>

                {/* Number of Bends (only if long) */}
                {conduitLength === 'long' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Bends
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          className={`p-3 rounded-lg text-center transition-colors ${
                            numberOfBends === 0
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                          onClick={() => setNumberOfBends(0)}
                        >
                          No Bends
                        </button>
                        <button
                          className={`p-3 rounded-lg text-center transition-colors ${
                            numberOfBends === 1
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                          onClick={() => setNumberOfBends(1)}
                        >
                          One Bend
                        </button>
                        <button
                          className={`p-3 rounded-lg text-center transition-colors ${
                            numberOfBends === 2
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                          onClick={() => setNumberOfBends(2)}
                        >
                          Two Bends
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Conduit Length (m)
                      </label>
                      <select
                        value={customConduitLength.toString()}
                        onChange={(e) => setCustomConduitLength(parseFloat(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      >
                        {numberOfBends === 0 && <option value="3">3</option>}
                        {numberOfBends === 0 && <option value="3.5">3.5</option>}
                        {numberOfBends === 0 && <option value="4">4</option>}
                        {numberOfBends === 0 && <option value="4.5">4.5</option>}
                        {numberOfBends === 0 && <option value="5">5</option>}
                        {numberOfBends === 0 && <option value="6">6</option>}
                        {numberOfBends === 0 && <option value="7">7</option>}
                        {numberOfBends === 0 && <option value="8">8</option>}
                        {numberOfBends === 0 && <option value="9">9</option>}
                        {numberOfBends === 0 && <option value="10">10</option>}
                        
                        {numberOfBends === 1 && <option value="1">1</option>}
                        {numberOfBends === 1 && <option value="1.5">1.5</option>}
                        {numberOfBends === 1 && <option value="2">2</option>}
                        {numberOfBends === 1 && <option value="2.5">2.5</option>}
                        {numberOfBends === 1 && <option value="3">3</option>}
                        {numberOfBends === 1 && <option value="3.5">3.5</option>}
                        {numberOfBends === 1 && <option value="4">4</option>}
                        {numberOfBends === 1 && <option value="4.5">4.5</option>}
                        {numberOfBends === 1 && <option value="5">5</option>}
                        {numberOfBends === 1 && <option value="6">6</option>}
                        {numberOfBends === 1 && <option value="7">7</option>}
                        {numberOfBends === 1 && <option value="8">8</option>}
                        {numberOfBends === 1 && <option value="9">9</option>}
                        {numberOfBends === 1 && <option value="10">10</option>}
                        
                        {numberOfBends === 2 && <option value="1">1</option>}
                        {numberOfBends === 2 && <option value="1.5">1.5</option>}
                        {numberOfBends === 2 && <option value="2">2</option>}
                        {numberOfBends === 2 && <option value="2.5">2.5</option>}
                        {numberOfBends === 2 && <option value="3">3</option>}
                        {numberOfBends === 2 && <option value="3.5">3.5</option>}
                        {numberOfBends === 2 && <option value="4">4</option>}
                        {numberOfBends === 2 && <option value="4.5">4.5</option>}
                        {numberOfBends === 2 && <option value="5">5</option>}
                        {numberOfBends === 2 && <option value="6">6</option>}
                        {numberOfBends === 2 && <option value="7">7</option>}
                        {numberOfBends === 2 && <option value="8">8</option>}
                        {numberOfBends === 2 && <option value="9">9</option>}
                        {numberOfBends === 2 && <option value="10">10</option>}
                      </select>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // 45% Space Factor - Manual Conduit Input
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conduit Diameter (mm)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  placeholder="Enter diameter"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setConduitDiameter(val);
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the exact conduit diameter in mm</p>
              </div>
            )}
          </>
        ) : (
          // Trunking
          <>
            {calculationMethod === 'table' ? (
              // Trunking Size - Table Lookup
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trunking Size (mm)
                </label>
                <select
                  value={trunkingSize}
                  onChange={(e) => setTrunkingSize(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
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
                  Trunking Dimensions (mm)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Width (mm)</label>
                    <input
                      type="number"
                      min="25"
                      max="300"
                      placeholder="Width"
                      id="trunkingWidth"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Height (mm)</label>
                    <input
                      type="number"
                      min="25"
                      max="300"
                      placeholder="Height"
                      id="trunkingHeight"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cables Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">Cables</h3>
          <button
            onClick={addCable}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150"
          >
            <span className="w-4 h-4 mr-1">+</span> Add Cable
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100">
                {calculationMethod === 'table' ? (
                  <>
                    <th className="px-4 py-2 text-left">Conductor Type</th>
                    <th className="px-4 py-2 text-left">CSA (mm²)</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    {isCalculated && <th className="px-4 py-2 text-left">Factor</th>}
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2 text-left">Cable Description</th>
                    <th className="px-4 py-2 text-left">Outer Dia. (mm)</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    {isCalculated && <th className="px-4 py-2 text-left">CSA (mm²)</th>}
                  </>
                )}
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {cables.map((cable) => (
                <tr key={cable.id} className="border-t">
                  {calculationMethod === 'table' ? (
                    <>
                      <td className="px-4 py-2">
                        <select
                          value={cable.conductorType}
                          onChange={(e) => 
                            updateCable(cable.id, 'conductorType', e.target.value as ConductorType)
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                        >
                          <option value="solid">Solid</option>
                          <option value="stranded">Stranded</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={cable.csa}
                          onChange={(e) => updateCable(cable.id, 'csa', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                        >
                          {csaOptions.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          placeholder="Cable description"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0.5"
                          step="0.1"
                          placeholder="Diameter"
                          value={cable.outerDiameter || ''}
                          onChange={(e) => 
                            updateCable(cable.id, 'outerDiameter', parseFloat(e.target.value))
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="1"
                      value={cable.quantity}
                      onChange={(e) => 
                        updateCable(cable.id, 'quantity', parseInt(e.target.value))
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                    />
                  </td>
                  {isCalculated && (
                    calculationMethod === 'table' ? (
                      <td className="px-4 py-2">{cable.factor}</td>
                    ) : (
                      <td className="px-4 py-2">
                        {cable.outerDiameter ? 
                          calculateCsaFromDiameter(cable.outerDiameter).toFixed(2) 
                          : '0'}
                      </td>
                    )
                  )}
                  <td className="px-4 py-2">
                    <button
                      onClick={() => removeCable(cable.id)}
                      disabled={cables.length === 1}
                      className={`inline-flex items-center p-1 rounded-md ${
                        cables.length === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      <span className="text-xs">Remove</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={calculateCompliance}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150"
        >
          {Icons.Calculator && <Icons.Calculator className="w-5 h-5 mr-2" />} Calculate
        </button>
      </div>

      {/* Results Section */}
      {isCalculated && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Results</h3>
          
          {calculationMethod === 'table' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-3 rounded shadow">
                <p className="text-sm text-gray-500">Total Cable Factor</p>
                <p className="text-2xl font-bold">{totalCableFactor.toFixed(1)}</p>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <p className="text-sm text-gray-500">Containment Factor</p>
                <p className="text-2xl font-bold">{containmentFactor}</p>
              </div>
              <div className={`p-3 rounded shadow ${isCompliant ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm text-gray-500">Status</p>
                <p className={`text-2xl font-bold ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                  {isCompliant ? 'Compliant' : 'Non-Compliant'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-3 rounded shadow">
                <p className="text-sm text-gray-500">Space Factor</p>
                <p className="text-2xl font-bold">{spaceFactorPercentage.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">
                  (Maximum allowed: 45%)
                </p>
              </div>
              <div className={`p-3 rounded shadow ${isCompliant ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm text-gray-500">Status</p>
                <p className={`text-2xl font-bold ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                  {isCompliant ? 'Compliant' : 'Non-Compliant'}
                </p>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {isCompliant 
                ? 'The cable installation is compliant with the requirements.'
                : calculationMethod === 'table'
                  ? 'The containment factor must be equal to or greater than the total cable factor.'
                  : 'The space factor must not exceed 45% of the containment cross-sectional area.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CableContainmentCalculator;