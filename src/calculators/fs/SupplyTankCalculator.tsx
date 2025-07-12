import React, { useState, useEffect } from 'react';

// Define building types with design criteria
const BUILDING_TYPES = [
  { 
    value: 'industrial', 
    label: 'Industrial/Godown Buildings',
    fixedPump: {
      hydrants: 3,
      minFlow: 1350,
      flowPerHydrant: 450,
      pressureRange: '350-850 kPa'
    },
    boosterPump: {
      singleRiser: { hydrants: 3, minFlow: 1350 },
      multipleRisers: { hydrants: 6, minFlow: 2700 }
    }
  },
  { 
    value: 'domestic', 
    label: 'Domestic Buildings',
    fixedPump: {
      hydrants: 2,
      minFlow: 900,
      flowPerHydrant: 450,
      pressureRange: '350-850 kPa'
    },
    boosterPump: {
      singleRiser: { hydrants: 2, minFlow: 900 },
      multipleRisers: { hydrants: 2, minFlow: 900 }
    }
  },
  { 
    value: 'other', 
    label: 'Other Buildings',
    fixedPump: {
      hydrants: 2,
      minFlow: 900,
      flowPerHydrant: 450,
      pressureRange: '350-850 kPa'
    },
    boosterPump: {
      singleRiser: { hydrants: 2, minFlow: 900 },
      multipleRisers: { hydrants: 4, minFlow: 1800 }
    }
  }
];

// Interface for calculation results
interface DesignCriteriaResults {
  largestFloorArea: number;
  requiredVolume: number;
  selectedTankSize: number;
  floorAreaCategory: string;
  buildingType: string;
  fixedPumpCriteria: {
    hydrants: number;
    minFlow: number;
    flowPerHydrant: number;
    pressureRange: string;
  };
  boosterPumpCriteria: {
    singleRiser: { hydrants: number; minFlow: number };
    multipleRisers: { hydrants: number; minFlow: number };
    heightThreshold: number;
  };
  compliance: boolean;
}

const SupplyTankCalculator: React.FC = () => {
  // Design Criteria Inputs
  const [largestFloorArea, setLargestFloorArea] = useState<number>(1000);
  const [buildingType, setBuildingType] = useState<string>('other');

  // Results state
  const [designResults, setDesignResults] = useState<DesignCriteriaResults | null>(null);

  // Calculate Design Criteria (tank requirements and pump criteria)
  const calculateDesignCriteria = (): DesignCriteriaResults => {
    let requiredVolume = 0;
    let floorAreaCategory = '';

    // Determine required volume based on largest floor area (not total)
    if (largestFloorArea <= 230) {
      requiredVolume = 9000; // 9 m³
      floorAreaCategory = 'Not exceeding 230 m²';
    } else if (largestFloorArea <= 460) {
      requiredVolume = 18000; // 18 m³
      floorAreaCategory = 'Over 230 m² but not exceeding 460 m²';
    } else if (largestFloorArea <= 920) {
      requiredVolume = 27000; // 27 m³
      floorAreaCategory = 'Over 460 m² but not exceeding 920 m²';
    } else {
      requiredVolume = 36000; // 36 m³
      floorAreaCategory = 'Over 920 m²';
    }

    // Standard tank sizes available
    const standardTankSizes = [9000, 18000, 27000, 36000, 45000, 54000, 72000, 90000];
    const selectedTankSize = standardTankSizes.find(size => size >= requiredVolume) || requiredVolume;

    // Get building type configuration
    const buildingConfig = BUILDING_TYPES.find(type => type.value === buildingType) || BUILDING_TYPES[2];

    return {
      largestFloorArea,
      requiredVolume,
      selectedTankSize,
      floorAreaCategory,
      buildingType: buildingConfig.label,
      fixedPumpCriteria: buildingConfig.fixedPump,
      boosterPumpCriteria: {
        singleRiser: buildingConfig.boosterPump.singleRiser,
        multipleRisers: buildingConfig.boosterPump.multipleRisers,
        heightThreshold: 60 // meters
      },
      compliance: selectedTankSize >= requiredVolume
    };
  };

  // Calculate results when inputs change
  useEffect(() => {
    setDesignResults(calculateDesignCriteria());
  }, [largestFloorArea, buildingType]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Building Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Building Type
          </label>
          <select
            value={buildingType}
            onChange={(e) => setBuildingType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {BUILDING_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Building classification determines pump design criteria</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Largest Floor Area (m²)
          </label>
          <input
            type="number"
            value={largestFloorArea}
            onChange={(e) => setLargestFloorArea(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            min="1"
          />
          <p className="text-xs text-gray-500 mt-1">Based on floor area factor of the largest floor</p>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Design Criteria Results</h3>
        
        {designResults && (
          <div className="space-y-4">
            {/* Supply Tank Requirements */}
            <div className="bg-white p-4 rounded-md shadow">
              <h4 className="font-medium text-blue-800 mb-3">Supply Tank Requirements</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Building Type:</span>
                  <span className="font-semibold text-blue-600">{designResults.buildingType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Floor Area Category:</span>
                  <span className="font-semibold">{designResults.floorAreaCategory}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Required Volume:</span>
                  <span className="font-semibold text-green-600">{designResults.requiredVolume.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Required Volume (m³):</span>
                  <span className="font-semibold text-green-600">{(designResults.requiredVolume / 1000).toFixed(1)} m³</span>
                </div>
              </div>
            </div>

            {/* Fixed Fire Pump Design Criteria */}
            <div className="bg-white p-4 rounded-md shadow">
              <h4 className="font-medium text-blue-800 mb-3">Fixed Fire Pump Design Criteria</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="text-gray-600">Number of Hydrants:</span>
                    <div className="font-semibold text-blue-600">{designResults.fixedPumpCriteria.hydrants}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Minimum Flow:</span>
                    <div className="font-semibold text-green-600">{designResults.fixedPumpCriteria.minFlow} L/min</div>
                  </div>
                </div>
                <div className="border-t pt-2 text-sm">
                  <span className="text-gray-600">Flow per Hydrant:</span>
                  <div className="font-semibold text-purple-600">
                    {designResults.fixedPumpCriteria.flowPerHydrant} L/min @ {designResults.fixedPumpCriteria.pressureRange}
                  </div>
                </div>
              </div>
            </div>

            {/* Booster Pump Design Criteria */}
            <div className="bg-white p-4 rounded-md shadow">
              <h4 className="font-medium text-blue-800 mb-3">Intermediate Booster Pump Design Criteria</h4>
              <div className="space-y-4">
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-medium">
                    Required when height between topmost hydrant and FS inlet &gt; {designResults.boosterPumpCriteria.heightThreshold}m
                  </p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 text-sm">Single Riser System</h5>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
                    <div className="text-sm">
                      <span className="text-gray-600">Number of Hydrants:</span>
                      <div className="font-semibold text-blue-600">{designResults.boosterPumpCriteria.singleRiser.hydrants}</div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Minimum Flow:</span>
                      <div className="font-semibold text-green-600">{designResults.boosterPumpCriteria.singleRiser.minFlow} L/min</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 text-sm">Multiple Riser System</h5>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
                    <div className="text-sm">
                      <span className="text-gray-600">Number of Hydrants:</span>
                      <div className="font-semibold text-blue-600">{designResults.boosterPumpCriteria.multipleRisers.hydrants}</div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Minimum Flow:</span>
                      <div className="font-semibold text-green-600">{designResults.boosterPumpCriteria.multipleRisers.minFlow} L/min</div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-2 text-sm">
                  <span className="text-gray-600">Flow per Hydrant:</span>
                  <div className="font-semibold text-purple-600">
                    450 L/min @ 350-850 kPa
                  </div>
                </div>
              </div>
            </div>

            {/* Water Storage Requirements Table */}
            <div className="bg-white p-4 rounded-md shadow">
              <h4 className="font-medium text-blue-800 mb-3">Water Storage Requirements Table</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Floor Area (Gross)</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Water Storage Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={designResults.largestFloorArea <= 230 ? 'bg-blue-100' : ''}>
                      <td className="border border-gray-300 px-3 py-2">Not exceeding 230 m²</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">9,000 L (9 m³)</td>
                    </tr>
                    <tr className={designResults.largestFloorArea > 230 && designResults.largestFloorArea <= 460 ? 'bg-blue-100' : ''}>
                      <td className="border border-gray-300 px-3 py-2">Over 230 m² but not exceeding 460 m²</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">18,000 L (18 m³)</td>
                    </tr>
                    <tr className={designResults.largestFloorArea > 460 && designResults.largestFloorArea <= 920 ? 'bg-blue-100' : ''}>
                      <td className="border border-gray-300 px-3 py-2">Over 460 m² but not exceeding 920 m²</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">27,000 L (27 m³)</td>
                    </tr>
                    <tr className={designResults.largestFloorArea > 920 ? 'bg-blue-100' : ''}>
                      <td className="border border-gray-300 px-3 py-2">Over 920 m²</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">36,000 L (36 m³)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Design Standards and Notes */}
            <div className="bg-white p-4 rounded-md shadow">
              <h4 className="font-medium text-blue-800 mb-3">Design Standards & Requirements</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 text-sm">Fire Pump Requirements:</h5>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                    <li>Each hydrant: 450 L/min at 350-850 kPa</li>
                    <li>Industrial: 3 hydrants simultaneous (≥1350 L/min)</li>
                    <li>Other buildings: 2 hydrants simultaneous (≥900 L/min)</li>
                    <li>Running pressure: 350-850 kPa range</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 text-sm">General Requirements:</h5>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                    <li>Tank capacity based on largest floor area factor</li>
                    <li>Water Authority and Fire Services approval required</li>
                    <li>Non-ferrous non-return valve required between tank and pump</li>
                    <li>Booster pumps required for height &gt;60m</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyTankCalculator;