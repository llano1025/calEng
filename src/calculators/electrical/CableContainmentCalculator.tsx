import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

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
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Cable Containment Calculator',
    discipline: 'electrical',
    calculatorType: 'cableContainment'
  });

  // State for the active tab
  const [activeTab, setActiveTab] = useState<string>('conduitTable');
  
  // State for calculator inputs
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
  const conduitFactorLong: Record<string, Record<number, Record<string, number>>> = {
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

  // Add a new cable to the list
  const addCable = () => {
    const newId = (cables.length + 1).toString();
    const isTableMethod = activeTab === 'conduitTable' || activeTab === 'trunkingTable';
    
    if (isTableMethod) {
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
  
  // Helper function to calculate CSA from diameter
  const calculateCsaFromDiameter = (diameter: number): number => {
    if (!diameter || diameter <= 0) return 0;
    
    // Calculate CSA using πr²
    const radius = diameter / 2;
    return Math.PI * Math.pow(radius, 2);
  };

  // Calculate compliance for conduit using table method
  const calculateConduitTableCompliance = () => {
    let totalFactor = 0;
    
    // Calculate total cable factor
    cables.forEach(cable => {
      let factor = 0;
      // Use appropriate conduit factor table
      const factorTable = conduitLength === 'short' ? cableFactor.short : cableFactor.long;
      if (factorTable[cable.conductorType][cable.csa]) {
        factor = factorTable[cable.conductorType][cable.csa] * cable.quantity;
      }
      
      // Update cable with its factor for display
      updateCable(cable.id, 'factor', factor);
      totalFactor += factor;
    });
    
    setTotalCableFactor(totalFactor);
    
    // Get containment factor
    let factor = 0;
    if (conduitLength === 'short') {
      factor = conduitFactorShort[conduitDiameter] || 0;
    } else {
      // Use run length from custom input
      const runLength = customConduitLength.toString();
      if (conduitFactorLong?.[conduitDiameter]?.[numberOfBends]?.[runLength]) {
        factor = conduitFactorLong[conduitDiameter][numberOfBends][runLength];
      }
    }
    
    setContainmentFactor(factor);
    
    // Check compliance: containment factor should be >= total cable factor
    setIsCompliant(factor >= totalFactor);
    setIsCalculated(true);
    
    // Save calculation and prepare export data
    const inputs = {
      containmentType: 'conduit',
      calculationMethod: 'table',
      conduitDiameter,
      conduitLength,
      customConduitLength,
      numberOfBends,
      cables
    };
    
    const results = {
      totalCableFactor,
      containmentFactor: factor,
      isCompliant: factor >= totalFactor,
      complianceStatus: factor >= totalFactor ? 'Compliant' : 'Non-compliant'
    };
    
    saveCalculation(inputs, results);
    prepareExportData(inputs, results);
  };

  // Calculate compliance for conduit using space factor method
  const calculateConduitSpaceFactorCompliance = () => {
    let totalCableArea = 0;
    
    // Calculate total cable area from outer diameters
    cables.forEach(cable => {
      if (cable.outerDiameter && cable.outerDiameter > 0) {
        const cableArea = calculateCsaFromDiameter(cable.outerDiameter);
        totalCableArea += cableArea * cable.quantity;
      }
    });
    
    // Calculate area from user-input diameter
    const diameter = parseFloat(conduitDiameter) || 0;
    let containmentArea = 0;
    
    if (diameter > 0) {
      containmentArea = calculateCsaFromDiameter(diameter);
    }
    
    // Calculate space factor percentage
    const spaceFactor = containmentArea > 0 ? (totalCableArea / containmentArea) * 100 : 100;
    setSpaceFactorPercentage(spaceFactor);
    
    // Check compliance: space factor should be <= 45%
    setIsCompliant(spaceFactor <= 45);
    setIsCalculated(true);
    
    // Save calculation and prepare export data
    const inputs = {
      containmentType: 'conduit',
      calculationMethod: 'spaceFactor',
      conduitDiameter,
      cables
    };
    
    const results = {
      totalCableArea,
      conduitArea: containmentArea,
      spaceFactorPercentage: spaceFactor,
      isCompliant: spaceFactor <= 45,
      complianceStatus: spaceFactor <= 45 ? 'Compliant' : 'Non-compliant'
    };
    
    saveCalculation(inputs, results);
    prepareExportData(inputs, results);
  };

  // Calculate compliance for trunking using table method
  const calculateTrunkingTableCompliance = () => {
    let totalFactor = 0;
    
    // Calculate total cable factor
    cables.forEach(cable => {
      let factor = 0;
      // Use trunking factor table
      if (cableFactor.trunking[cable.conductorType][cable.csa]) {
        factor = cableFactor.trunking[cable.conductorType][cable.csa] * cable.quantity;
      }
      
      // Update cable with its factor for display
      updateCable(cable.id, 'factor', factor);
      totalFactor += factor;
    });
    
    setTotalCableFactor(totalFactor);
    
    // Get containment factor from trunking factor table
    const factor = trunkingFactor[trunkingSize] || 0;
    setContainmentFactor(factor);
    
    // Check compliance: containment factor should be >= total cable factor
    setIsCompliant(factor >= totalFactor);
    setIsCalculated(true);
    
    // Save calculation and prepare export data
    const inputs = {
      containmentType: 'trunking',
      calculationMethod: 'table',
      trunkingSize,
      cables
    };
    
    const results = {
      totalCableFactor,
      containmentFactor: factor,
      isCompliant: factor >= totalFactor,
      complianceStatus: factor >= totalFactor ? 'Compliant' : 'Non-compliant'
    };
    
    saveCalculation(inputs, results);
    prepareExportData(inputs, results);
  };

  // Calculate compliance for trunking using space factor method
  const calculateTrunkingSpaceFactorCompliance = () => {
    let totalCableArea = 0;
    
    // Calculate total cable area from outer diameters
    cables.forEach(cable => {
      if (cable.outerDiameter && cable.outerDiameter > 0) {
        const cableArea = calculateCsaFromDiameter(cable.outerDiameter);
        totalCableArea += cableArea * cable.quantity;
      }
    });
    
    // Get width and height from inputs
    const widthInput = document.getElementById('trunkingWidth') as HTMLInputElement;
    const heightInput = document.getElementById('trunkingHeight') as HTMLInputElement;
    
    let containmentArea = 0;
    
    if (widthInput && heightInput && widthInput.value && heightInput.value) {
      const width = parseFloat(widthInput.value);
      const height = parseFloat(heightInput.value);
      
      if (!isNaN(width) && !isNaN(height)) {
        containmentArea = width * height;
      }
    }
    
    // Calculate space factor percentage
    const spaceFactor = containmentArea > 0 ? (totalCableArea / containmentArea) * 100 : 100;
    setSpaceFactorPercentage(spaceFactor);
    
    // Check compliance: space factor should be <= 45%
    setIsCompliant(spaceFactor <= 45);
    setIsCalculated(true);
    
    // Save calculation and prepare export data
    const inputs = {
      containmentType: 'trunking',
      calculationMethod: 'spaceFactor',
      trunkingSize,
      cables
    };
    
    const results = {
      totalCableArea,
      trunkingArea: containmentArea,
      spaceFactorPercentage: spaceFactor,
      isCompliant: spaceFactor <= 45,
      complianceStatus: spaceFactor <= 45 ? 'Compliant' : 'Non-compliant'
    };
    
    saveCalculation(inputs, results);
    prepareExportData(inputs, results);
  };

  // Main calculation function
  const handleCalculate = () => {
    switch (activeTab) {
      case 'conduitTable':
        calculateConduitTableCompliance();
        break;
      case 'conduitSpace':
        calculateConduitSpaceFactorCompliance();
        break;
      case 'trunkingTable':
        calculateTrunkingTableCompliance();
        break;
      case 'trunkingSpace':
        calculateTrunkingSpaceFactorCompliance();
        break;
      default:
        break;
    }
  };

  // Clear calculation results when tab changes
  useEffect(() => {
    setIsCalculated(false);
  }, [activeTab]);
  
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
  
  // Get the current calculation method based on active tab
  const isTableMethod = activeTab === 'conduitTable' || activeTab === 'trunkingTable';

  return (
    <CalculatorWrapper
      title="Cable Containment Calculator"
      discipline="electrical"
      calculatorType="cableContainment"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6 p-6">{/* Remove the outer div styling since it's handled by CalculatorWrapper */}
        
      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'conduitTable'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('conduitTable')}
        >
          Conduit (Table Method)
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'conduitSpace'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('conduitSpace')}
        >
          Conduit (Space Factor)
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'trunkingTable'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('trunkingTable')}
        >
          Trunking (Table Method)
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'trunkingSpace'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('trunkingSpace')}
        >
          Trunking (Space Factor)
        </button>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conduit Table Method */}
        {activeTab === 'conduitTable' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conduit Diameter (mm)
                </label>
                <select
                  value={conduitDiameter}
                  onChange={(e) => setConduitDiameter(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  {conduitDiameterOptions.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conduit Length
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`p-2 rounded-md text-center transition-colors text-sm ${
                      conduitLength === 'short'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                    onClick={() => setConduitLength('short')}
                  >
                    ≤ 3m (Straight)
                  </button>
                  <button
                    className={`p-2 rounded-md text-center transition-colors text-sm ${
                      conduitLength === 'long'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                    onClick={() => setConduitLength('long')}
                  >
                    &gt;3m or With Bends
                  </button>
                </div>
              </div>
              
              {/* Number of Bends (only if long) */}
              {conduitLength === 'long' && (
                <>
                  <div className="border-t border-gray-300 my-4"></div>
                  <h4 className="font-medium mb-3">Conduit Configuration</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Bends
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        className={`p-2 rounded-md text-center transition-colors text-sm ${
                          numberOfBends === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                        onClick={() => setNumberOfBends(0)}
                      >
                        No Bends
                      </button>
                      <button
                        className={`p-2 rounded-md text-center transition-colors text-sm ${
                          numberOfBends === 1
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                        onClick={() => setNumberOfBends(1)}
                      >
                        One Bend
                      </button>
                      <button
                        className={`p-2 rounded-md text-center transition-colors text-sm ${
                          numberOfBends === 2
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                        onClick={() => setNumberOfBends(2)}
                      >
                        Two Bends
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conduit Length (m)
                    </label>
                    <select
                      value={customConduitLength.toString()}
                      onChange={(e) => setCustomConduitLength(parseFloat(e.target.value))}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      {/* Dynamic options based on the number of bends */}
                      {numberOfBends === 0 && [3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                      
                      {numberOfBends === 1 && [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                      
                      {numberOfBends === 2 && [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              
              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Cable Configuration</h4>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cables
                  </label>
                  <button
                    onClick={addCable}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center"
                  >
                    <span className="mr-1">+</span> Add Cable
                  </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-md">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">CSA (mm²)</th>
                        <th className="px-3 py-2 text-left">Qty</th>
                        {isCalculated && <th className="px-3 py-2 text-left">Factor</th>}
                        <th className="px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cables.map((cable) => (
                        <tr key={cable.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">
                            <select
                              value={cable.conductorType}
                              onChange={(e) => 
                                updateCable(cable.id, 'conductorType', e.target.value as ConductorType)
                              }
                              className="w-full p-1 border rounded-md text-sm"
                            >
                              <option value="solid">Solid</option>
                              <option value="stranded">Stranded</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={cable.csa}
                              onChange={(e) => updateCable(cable.id, 'csa', e.target.value)}
                              className="w-full p-1 border rounded-md text-sm"
                            >
                              {csaOptions.map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={cable.quantity}
                              onChange={(e) => 
                                updateCable(cable.id, 'quantity', parseInt(e.target.value))
                              }
                              className="w-16 p-1 border rounded-md text-sm"
                            />
                          </td>
                          {isCalculated && <td className="px-3 py-2">{cable.factor}</td>}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeCable(cable.id)}
                              disabled={cables.length === 1}
                              className={`p-1 rounded-md ${
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

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              {!isCalculated ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Enter the parameters and click Calculate to see results</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Cable Factor</p>
                      <p className="text-lg">{totalCableFactor.toFixed(1)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Conduit Factor</p>
                      <p className="text-lg">{containmentFactor}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Compliance Status</p>
                      <p className={`text-lg ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                        {isCompliant ? 'Compliant ✓' : 'Non-Compliant ✗'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Compliance Assessment</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'The conduit installation is compliant with the requirements. The conduit factor is sufficient for the cables installed.'
                        : 'The conduit installation is non-compliant. The conduit factor must be equal to or greater than the total cable factor.'
                      }
                    </p>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Recommendation</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'Installation can proceed with the current configuration.'
                        : 'Consider increasing the conduit diameter, reducing the number of cables, or dividing cables between multiple conduits.'
                      }
                    </p>
                  </div>
                </>
              )}
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Reference Information</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Calculations are performed based on BS 7671 cable factor tables.</li>
                  <li>Conduit runs ≤ 3m can accommodate higher cable factors than longer runs.</li>
                  <li>Each bend in a conduit reduces its capacity to hold cables.</li>
                  <li>The conduit factor must be equal to or greater than the total cable factor.</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Conduit Space Factor */}
        {activeTab === 'conduitSpace' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conduit Inner Diameter (mm)
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
                  className="w-full p-2 border rounded-md text-sm"
                />
                <p className="text-xs text-gray-600 mt-1">Enter the exact conduit inner diameter in mm</p>
              </div>
              
              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Cable Configuration</h4>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cables
                  </label>
                  <button
                    onClick={addCable}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center"
                  >
                    <span className="mr-1">+</span> Add Cable
                  </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-md">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">Outer Dia. (mm)</th>
                        <th className="px-3 py-2 text-left">Qty</th>
                        {isCalculated && <th className="px-3 py-2 text-left">CSA (mm²)</th>}
                        <th className="px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cables.map((cable) => (
                        <tr key={cable.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder="Cable description"
                              className="w-full p-1 border rounded-md text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0.5"
                              step="0.1"
                              placeholder="Diameter"
                              value={cable.outerDiameter || ''}
                              onChange={(e) => 
                                updateCable(cable.id, 'outerDiameter', parseFloat(e.target.value))
                              }
                              className="w-full p-1 border rounded-md text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={cable.quantity}
                              onChange={(e) => 
                                updateCable(cable.id, 'quantity', parseInt(e.target.value))
                              }
                              className="w-16 p-1 border rounded-md text-sm"
                            />
                          </td>
                          {isCalculated && (
                            <td className="px-3 py-2">
                              {cable.outerDiameter ? 
                                calculateCsaFromDiameter(cable.outerDiameter).toFixed(2) 
                                : '0'}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeCable(cable.id)}
                              disabled={cables.length === 1}
                              className={`p-1 rounded-md ${
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

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              {!isCalculated ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Enter the parameters and click Calculate to see results</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm font-medium">Space Factor</p>
                      <p className="text-lg">{spaceFactorPercentage.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">(Maximum allowed: 45%)</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Compliance Status</p>
                      <p className={`text-lg ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                        {isCompliant ? 'Compliant ✓' : 'Non-Compliant ✗'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Compliance Assessment</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'The conduit installation is compliant with the 45% space factor rule. There is adequate space for cable pulling and prevention of overheating.'
                        : 'The conduit installation is non-compliant. The space factor exceeds the maximum 45% rule, which may impede cable pulling and lead to overheating.'
                      }
                    </p>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Recommendation</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'Installation can proceed with the current configuration.'
                        : 'Consider increasing the conduit diameter, reducing the number of cables, or dividing cables between multiple conduits.'
                      }
                    </p>
                  </div>
                </>
              )}
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Reference Information</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>The 45% space factor rule states that the total cross-sectional area of cables must not exceed 45% of the internal area of the conduit.</li>
                  <li>This allows adequate space for pulling cables and prevents overheating due to close packing.</li>
                  <li>Cable cross-sectional area is calculated using the formula: π × (diameter ÷ 2)²</li>
                  <li>Conduit cross-sectional area is calculated using the same formula.</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Trunking Table Method */}
        {activeTab === 'trunkingTable' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trunking Size (mm)
                </label>
                <select
                  value={trunkingSize}
                  onChange={(e) => setTrunkingSize(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  {trunkingSizeOptions.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              
              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Cable Configuration</h4>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cables
                  </label>
                  <button
                    onClick={addCable}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center"
                  >
                    <span className="mr-1">+</span> Add Cable
                  </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-md">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">CSA (mm²)</th>
                        <th className="px-3 py-2 text-left">Qty</th>
                        {isCalculated && <th className="px-3 py-2 text-left">Factor</th>}
                        <th className="px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cables.map((cable) => (
                        <tr key={cable.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">
                            <select
                              value={cable.conductorType}
                              onChange={(e) => 
                                updateCable(cable.id, 'conductorType', e.target.value as ConductorType)
                              }
                              className="w-full p-1 border rounded-md text-sm"
                            >
                              <option value="solid">Solid</option>
                              <option value="stranded">Stranded</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={cable.csa}
                              onChange={(e) => updateCable(cable.id, 'csa', e.target.value)}
                              className="w-full p-1 border rounded-md text-sm"
                            >
                              {csaOptions.map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={cable.quantity}
                              onChange={(e) => 
                                updateCable(cable.id, 'quantity', parseInt(e.target.value))
                              }
                              className="w-16 p-1 border rounded-md text-sm"
                            />
                          </td>
                          {isCalculated && <td className="px-3 py-2">{cable.factor}</td>}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeCable(cable.id)}
                              disabled={cables.length === 1}
                              className={`p-1 rounded-md ${
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

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              {!isCalculated ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Enter the parameters and click Calculate to see results</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Cable Factor</p>
                      <p className="text-lg">{totalCableFactor.toFixed(1)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Trunking Factor</p>
                      <p className="text-lg">{containmentFactor}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Compliance Status</p>
                      <p className={`text-lg ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                        {isCompliant ? 'Compliant ✓' : 'Non-Compliant ✗'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Compliance Assessment</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'The trunking installation is compliant with the requirements. The trunking factor is sufficient for the cables installed.'
                        : 'The trunking installation is non-compliant. The trunking factor must be equal to or greater than the total cable factor.'
                      }
                    </p>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Recommendation</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'Installation can proceed with the current configuration.'
                        : 'Consider increasing the trunking size, reducing the number of cables, or dividing cables between multiple trunking routes.'
                      }
                    </p>
                  </div>
                </>
              )}
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Reference Information</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Calculations are performed based on BS 7671 cable factor tables for trunking.</li>
                  <li>The trunking factor must be equal to or greater than the total cable factor.</li>
                  <li>Trunking sizing is given as width × height in millimeters.</li>
                  <li>The table method is more appropriate for standard cable types and trunking configurations.</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Trunking Space Factor */}
        {activeTab === 'trunkingSpace' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trunking Width (mm)
                  </label>
                  <input
                    type="number"
                    min="25"
                    max="300"
                    placeholder="Width"
                    id="trunkingWidth"
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trunking Height (mm)
                  </label>
                  <input
                    type="number"
                    min="25"
                    max="300"
                    placeholder="Height"
                    id="trunkingHeight"
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Cable Configuration</h4>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cables
                  </label>
                  <button
                    onClick={addCable}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center"
                  >
                    <span className="mr-1">+</span> Add Cable
                  </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-md">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">Outer Dia. (mm)</th>
                        <th className="px-3 py-2 text-left">Qty</th>
                        {isCalculated && <th className="px-3 py-2 text-left">CSA (mm²)</th>}
                        <th className="px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cables.map((cable) => (
                        <tr key={cable.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder="Cable description"
                              className="w-full p-1 border rounded-md text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0.5"
                              step="0.1"
                              placeholder="Diameter"
                              value={cable.outerDiameter || ''}
                              onChange={(e) => 
                                updateCable(cable.id, 'outerDiameter', parseFloat(e.target.value))
                              }
                              className="w-full p-1 border rounded-md text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={cable.quantity}
                              onChange={(e) => 
                                updateCable(cable.id, 'quantity', parseInt(e.target.value))
                              }
                              className="w-16 p-1 border rounded-md text-sm"
                            />
                          </td>
                          {isCalculated && (
                            <td className="px-3 py-2">
                              {cable.outerDiameter ? 
                                calculateCsaFromDiameter(cable.outerDiameter).toFixed(2) 
                                : '0'}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeCable(cable.id)}
                              disabled={cables.length === 1}
                              className={`p-1 rounded-md ${
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

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              {!isCalculated ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Enter the parameters and click Calculate to see results</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm font-medium">Space Factor</p>
                      <p className="text-lg">{spaceFactorPercentage.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">(Maximum allowed: 45%)</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Compliance Status</p>
                      <p className={`text-lg ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                        {isCompliant ? 'Compliant ✓' : 'Non-Compliant ✗'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Compliance Assessment</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'The trunking installation is compliant with the 45% space factor rule. There is adequate space for cable routing and prevention of overheating.'
                        : 'The trunking installation is non-compliant. The space factor exceeds the maximum 45% rule, which may lead to installation difficulties and overheating.'
                      }
                    </p>
                  </div>
                  
                  <div className="mt-6 bg-white p-3 rounded-md">
                    <h4 className="font-medium mb-2">Recommendation</h4>
                    <p className="text-sm text-gray-700">
                      {isCompliant 
                        ? 'Installation can proceed with the current configuration.'
                        : 'Consider increasing the trunking size, reducing the number of cables, or dividing cables between multiple trunking routes.'
                      }
                    </p>
                  </div>
                </>
              )}
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Reference Information</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>The 45% space factor rule states that the total cross-sectional area of cables must not exceed 45% of the internal area of the trunking.</li>
                  <li>This allows adequate space for adding cables in the future and prevents overheating due to close packing.</li>
                  <li>Trunking area is calculated as width × height in square millimeters.</li>
                  <li>Cable cross-sectional area is calculated using the formula: π × (diameter ÷ 2)²</li>
                  <li>The space factor method is more appropriate when dealing with custom cable types or non-standard configurations.</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Info section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Calculations are based on BS 7671 requirements for cable containment sizing.</li>
          <li>The table method uses predefined factors from the standard for common cable types.</li>
          <li>The space factor method (45% rule) is more flexible and can be used for any cable type provided you know the outer diameter.</li>
          <li>For conduits exceeding 3m in length or with bends, reduced capacity factors apply to account for increased pulling tensions.</li>
          <li>Always ensure proper cable support and appropriate bending radii during installation.</li>
        </ul>
      </div>
      </div>
    </CalculatorWrapper>
  );
};

export default CableContainmentCalculator;