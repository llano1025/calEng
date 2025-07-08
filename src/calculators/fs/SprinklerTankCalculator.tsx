import React, { useState } from 'react';
import { Icons } from '../../components/Icons';

// Define props type for the component
interface SprinklerTankCalculatorProps {}

// Define interfaces for calculation results
interface TankSizingResult {
  basicCapacity: number;
  requiredInflowRate: number;
  pumpSuctionCapacity: number;
  hazardGroup: string;
  systemType: string;
  height: number;
  effectiveWaterCapacity: number;
  systemFlowRate: number;
  maxInflowPeriod: number;
  designDensity: number;
  areaOfOperation: number;
  systemFlow: number;
  pressureAtControlValve: number;
  maxDemandFlow: number;
  maxDemandPressure: number;
  spacingData: any;
  calculations: string[];
}

// Water tank capacity lookup table based on standards
const TANK_CAPACITY_TABLE = {
  'LH': {
    'wet': { 15: 9, 30: 10, 45: 11 },
    'pre-action': { 15: 9, 30: 10, 45: 11 },
    'dry': { 15: 0, 30: 0, 45: 0 },
    'alternate': { 15: 0, 30: 0, 45: 0 }
  },
  'OH1': {
    'wet': { 15: 55, 30: 70, 45: 80 },
    'pre-action': { 15: 55, 30: 70, 45: 80 },
    'dry': { 15: 105, 30: 125, 45: 140 },
    'alternate': { 15: 105, 30: 125, 45: 140 }
  },
  'OH2': {
    'wet': { 15: 105, 30: 125, 45: 140 },
    'pre-action': { 15: 105, 30: 125, 45: 140 },
    'dry': { 15: 135, 30: 160, 45: 185 },
    'alternate': { 15: 135, 30: 160, 45: 185 }
  },
  'OH3': {
    'wet': { 15: 135, 30: 160, 45: 185 },
    'pre-action': { 15: 135, 30: 160, 45: 185 },
    'dry': { 15: 160, 30: 185, 45: 200 },
    'alternate': { 15: 160, 30: 185, 45: 200 }
  },
  'OH4': {
    'wet': { 15: 160, 30: 185, 45: 200 },
    'pre-action': { 15: 160, 30: 185, 45: 200 },
    'dry': { 15: 0, 30: 0, 45: 0 },
    'alternate': { 15: 0, 30: 0, 45: 0 }
  }
};

// Double-end-feed inflow parameters table
const INFLOW_PARAMETERS = {
  'LH': { minCapacity: 2.5, maxInflowPeriod: 30 },
  'OH1': { minCapacity: 25, maxInflowPeriod: 60 },
  'OH2': { minCapacity: 50, maxInflowPeriod: 60 },
  'OH3': { minCapacity: 75, maxInflowPeriod: 60 },
  'OH4': { minCapacity: 100, maxInflowPeriod: 90 }
};

// Design criteria table (Table 3 from image)
const DESIGN_CRITERIA = {
  'LH': {
    designDensity: 2.25, // mm/min
    areaOfOperation: {
      'wet': 84,
      'pre-action': 84,
      'dry': 0, // Not allowed
      'alternate': 0 // Not allowed
    }
  },
  'OH1': {
    designDensity: 5.0,
    areaOfOperation: {
      'wet': 72,
      'pre-action': 72,
      'dry': 90,
      'alternate': 90
    }
  },
  'OH2': {
    designDensity: 5.0,
    areaOfOperation: {
      'wet': 144,
      'pre-action': 144,
      'dry': 180,
      'alternate': 180
    }
  },
  'OH3': {
    designDensity: 5.0,
    areaOfOperation: {
      'wet': 216,
      'pre-action': 216,
      'dry': 270,
      'alternate': 270
    }
  },
  'OH4': {
    designDensity: 5.0,
    areaOfOperation: {
      'wet': 360,
      'pre-action': 360,
      'dry': 0, // Not allowed
      'alternate': 0 // Not allowed
    }
  }
};

// Spacing and Location of Sprinklers table
const SPRINKLER_SPACING_LOCATION = {
  'LH': {
    maxAreaCoverage: {
      sidewall: 17, // m²
      others: 21, // m²
      specialArea: 9 // m²
    },
    maxDistanceBetween: {
      sidewall: 4.6, // m
      others: 4.6, // m
      specialArea: 3.7, // m to 3.0 m
      staggered: 4.6 // m
    },
    minDistanceBetweenSprinklers: 2, // m
    maxDistanceFromWallPartition: 2.3, // m
    maxDistanceFromOpenFace: 1.5, // m
    maxDistanceBelowCeiling: [75, 150, 300, 450], // mm for different ceiling types
    maxDistanceFromColumn: 0.6, // m
    clearMinSpaceBelow: 0.3, // to 0.5 m
    maxDepthCeilingVoid: 0.8, // m
    maxWidthCanopy: {
      rectangular: 0.8, // plus 1m
      circular: 1 // plus 1.2 m
    },
    maxExtentCanopyFromBuilding: 1.5 // m
  },
  'OH1': {
    maxAreaCoverage: {
      sidewall: 9, // m²
      others: 12, // m²
      specialArea: 9 // m²
    },
    maxDistanceBetween: {
      sidewall: 3.7, // to 3.4 m
      others: 4, // m
      specialArea: 3, // m
      staggered: 4.6, // to 4 m
    },
    minDistanceBetweenSprinklers: 2, // m
    maxDistanceFromWallPartition: 2, // m (standard)
    maxDistanceFromOpenFace: 1.5, // m
    maxDistanceBelowCeiling: [75, 150, 300, 450], // mm
    maxDistanceFromColumn: 0.6, // m
    clearMinSpaceBelow: 0.3, // to 0.5 m
    maxDepthCeilingVoid: 0.8, // m
    maxWidthCanopy: {
      rectangular: 0.8, // plus 1m
      circular: 1 // plus 1.2 m
    },
    maxExtentCanopyFromBuilding: 1.5 // m
  },
  'OH2': {
    maxAreaCoverage: {
      sidewall: 9, // m²
      others: 12, // m²
      specialArea: 9 // m²
    },
    maxDistanceBetween: {
      sidewall: 3.7, // to 3.4 m
      others: 4, // m
      specialArea: 3, // m
      staggered: 4.6, // to 4 m
    },
    minDistanceBetweenSprinklers: 2, // m
    maxDistanceFromWallPartition: 2, // m (standard)
    maxDistanceFromOpenFace: 1.5, // m
    maxDistanceBelowCeiling: [75, 150, 300, 450], // mm
    maxDistanceFromColumn: 0.6, // m
    clearMinSpaceBelow: 0.3, // to 0.5 m
    maxDepthCeilingVoid: 0.8, // m
    maxWidthCanopy: {
      rectangular: 0.8, // plus 1m
      circular: 1 // plus 1.2 m
    },
    maxExtentCanopyFromBuilding: 1.5 // m
  },
  'OH3': {
    maxAreaCoverage: {
      sidewall: 9, // m²
      others: 12, // m²
      specialArea: 9 // m²
    },
    maxDistanceBetween: {
      sidewall: 3.7, // to 3.4 m
      others: 4, // m
      specialArea: 3, // m
      staggered: 4.6, // to 4 m
    },
    minDistanceBetweenSprinklers: 2, // m
    maxDistanceFromWallPartition: 2, // m (standard)
    maxDistanceFromOpenFace: 1.5, // m
    maxDistanceBelowCeiling: [75, 150, 300, 450], // mm
    maxDistanceFromColumn: 0.6, // m
    clearMinSpaceBelow: 0.3, // to 0.5 m
    maxDepthCeilingVoid: 0.8, // m
    maxWidthCanopy: {
      rectangular: 0.8, // plus 1m
      circular: 1 // plus 1.2 m
    },
    maxExtentCanopyFromBuilding: 1.5 // m
  },
  'OH4': {
    maxAreaCoverage: {
      sidewall: 9, // m²
      others: 9, // m²
      specialArea: 9 // m²
    },
    maxDistanceBetween: {
      sidewall: 3.7, // m
      others: 3.7, // m
      specialArea: 3, // m
      staggered: 3.7 // m
    },
    minDistanceBetweenSprinklers: 2, // m
    maxDistanceFromWallPartition: 2, // m
    maxDistanceFromOpenFace: 1.5, // m
    maxDistanceBelowCeiling: [75, 150, 300, 450], // mm
    maxDistanceFromColumn: 0.6, // m
    clearMinSpaceBelow: 1.0, // m
    maxDepthCeilingVoid: 0.8, // m
    maxWidthCanopy: {
      rectangular: 0.8, // plus 1m
      circular: 1 // plus 1.2 m
    },
    maxExtentCanopyFromBuilding: 1.5 // m
  }
};
const FLOW_PRESSURE_REQUIREMENTS = {
  'LH': {
    'wet': { flow: 225, pressure: 2.2, maxDemandFlow: 540, maxDemandPressure: 0 },
    'pre-action': { flow: 225, pressure: 2.2, maxDemandFlow: 540, maxDemandPressure: 0 }
  },
  'OH1': {
    'wet': { flow: 375, pressure: 1.0, maxDemandFlow: 540, maxDemandPressure: 0.7 },
    'pre-action': { flow: 375, pressure: 1.0, maxDemandFlow: 540, maxDemandPressure: 0.7 },
    'dry': { flow: 725, pressure: 1.4, maxDemandFlow: 1000, maxDemandPressure: 1.0 },
    'alternate': { flow: 725, pressure: 1.4, maxDemandFlow: 1000, maxDemandPressure: 1.0 }
  },
  'OH2': {
    'wet': { flow: 725, pressure: 1.4, maxDemandFlow: 1000, maxDemandPressure: 1.0 },
    'pre-action': { flow: 725, pressure: 1.4, maxDemandFlow: 1000, maxDemandPressure: 1.0 },
    'dry': { flow: 1100, pressure: 1.7, maxDemandFlow: 1350, maxDemandPressure: 1.4 },
    'alternate': { flow: 1100, pressure: 1.7, maxDemandFlow: 1350, maxDemandPressure: 1.4 }
  },
  'OH3': {
    'wet': { flow: 1100, pressure: 1.7, maxDemandFlow: 1350, maxDemandPressure: 1.4 },
    'pre-action': { flow: 1100, pressure: 1.7, maxDemandFlow: 1350, maxDemandPressure: 1.4 },
    'dry': { flow: 1800, pressure: 2.0, maxDemandFlow: 2100, maxDemandPressure: 1.5 },
    'alternate': { flow: 1800, pressure: 2.0, maxDemandFlow: 2100, maxDemandPressure: 1.5 }
  },
  'OH4': {
    'wet': { flow: 1800, pressure: 2.0, maxDemandFlow: 2100, maxDemandPressure: 1.5 },
    'pre-action': { flow: 1800, pressure: 2.0, maxDemandFlow: 2100, maxDemandPressure: 1.5 }
  }
};

// Main Sprinkler Tank Calculator Component
const SprinklerTankCalculator: React.FC<SprinklerTankCalculatorProps> = () => {
  // Input parameters
  const [hazardGroup, setHazardGroup] = useState<string>('OH3');
  const [systemType, setSystemType] = useState<string>('wet');
  const [height, setHeight] = useState<number>(15);
  const [effectiveWaterCapacity, setEffectiveWaterCapacity] = useState<number>(90);
  const [systemFlowRate, setSystemFlowRate] = useState<number>(3600);

  // Results
  const [result, setResult] = useState<TankSizingResult | null>(null);

  const calculateTankSizing = () => {
    try {
      const calculations: string[] = [];
      
      // Step 1: Basic Tank Sizing
      calculations.push('=== BASIC TANK SIZING ===');
      const basicCapacity = TANK_CAPACITY_TABLE[hazardGroup as keyof typeof TANK_CAPACITY_TABLE]?.[systemType as keyof typeof TANK_CAPACITY_TABLE.LH]?.[height as keyof typeof TANK_CAPACITY_TABLE.LH.wet];
      
      if (basicCapacity === undefined) {
        throw new Error('Invalid combination of parameters');
      }
      
      calculations.push(`Hazard Group: ${hazardGroup}`);
      calculations.push(`System Type: ${systemType}`);
      calculations.push(`Height Range: ${height} m`);
      calculations.push(`Basic Required Capacity: ${basicCapacity} m³`);
      
      // Step 2: Design Criteria
      calculations.push('\n=== DESIGN CRITERIA ===');
      const designCriteria = DESIGN_CRITERIA[hazardGroup as keyof typeof DESIGN_CRITERIA];
      const designDensity = designCriteria.designDensity;
      const areaOfOperation = designCriteria.areaOfOperation[systemType as keyof typeof designCriteria.areaOfOperation];
      
      calculations.push(`Design Density: ${designDensity} mm/min`);
      calculations.push(`Area of Operation: ${areaOfOperation} m²`);
      
      if (areaOfOperation === 0) {
        calculations.push(`WARNING: ${systemType} system not allowed for ${hazardGroup} hazard class`);
      }
      
      // Step 3: Flow and Pressure Requirements
      calculations.push('\n=== FLOW AND PRESSURE REQUIREMENTS ===');
      const flowPressure = FLOW_PRESSURE_REQUIREMENTS[hazardGroup as keyof typeof FLOW_PRESSURE_REQUIREMENTS]?.[systemType as keyof typeof FLOW_PRESSURE_REQUIREMENTS.LH];
      
      let systemFlow = 0;
      let pressureAtControlValve = 0;
      let maxDemandFlow = 0;
      let maxDemandPressure = 0;
      
      if (flowPressure) {
        systemFlow = flowPressure.flow;
        pressureAtControlValve = flowPressure.pressure;
        maxDemandFlow = flowPressure.maxDemandFlow;
        maxDemandPressure = flowPressure.maxDemandPressure;
        
        calculations.push(`System Flow Requirement: ${systemFlow} L/min`);
        calculations.push(`Pressure at Control Valve: ${pressureAtControlValve} bar`);
        calculations.push(`Maximum Demand Flow: ${maxDemandFlow} L/min`);
        calculations.push(`Maximum Demand Pressure: ${maxDemandPressure} bar`);
      } else {
        calculations.push(`No flow/pressure data available for ${systemType} ${hazardGroup} system`);
      }
      
      // Step 4: Required Water Inflow for Double-End-Feed
      calculations.push('\n=== REQUIRED WATER INFLOW FOR DOUBLE-END-FEED ===');
      const inflowData = INFLOW_PARAMETERS[hazardGroup as keyof typeof INFLOW_PARAMETERS];
      const maxInflowPeriod = inflowData.maxInflowPeriod; // minutes
      const effectiveWaterCapacityLiters = effectiveWaterCapacity * 1000; // Convert m³ to liters
      
      // Use the higher of user input or system requirement
      const actualSystemFlowRate = Math.max(systemFlowRate, systemFlow);
      
      // Formula: [required water flow rate × minimum period - effective water capacity] / maximum period of in-fill
      const totalWaterRequired = actualSystemFlowRate * maxInflowPeriod; // L
      const requiredInflowRate = (totalWaterRequired - effectiveWaterCapacityLiters) / maxInflowPeriod;
      
      calculations.push(`User Input Flow Rate: ${systemFlowRate} L/min`);
      calculations.push(`System Required Flow Rate: ${systemFlow} L/min`);
      calculations.push(`Design Flow Rate (higher of above): ${actualSystemFlowRate} L/min`);
      calculations.push(`Maximum Inflow Period: ${maxInflowPeriod} minutes`);
      calculations.push(`Effective Water Storage: ${effectiveWaterCapacity} m³ (${effectiveWaterCapacityLiters.toLocaleString()} L)`);
      calculations.push(`Total Water Required: ${actualSystemFlowRate} × ${maxInflowPeriod} = ${totalWaterRequired.toLocaleString()} L`);
      calculations.push(`Required Water Inflow Calculation:`);
      calculations.push(`  = [${totalWaterRequired.toLocaleString()} L - ${effectiveWaterCapacityLiters.toLocaleString()} L] / ${maxInflowPeriod} min`);
      calculations.push(`  = ${(totalWaterRequired - effectiveWaterCapacityLiters).toLocaleString()} L / ${maxInflowPeriod} min`);
      calculations.push(`  = ${requiredInflowRate.toFixed(0)} L/min`);
      calculations.push(`Inflow Duration: ${maxInflowPeriod} minutes`);
      
      // Step 5: Pump Suction Tank
      calculations.push('\n=== PUMP SUCTION TANK SIZING ===');
      const pumpSuctionCapacity = inflowData.minCapacity;
      
      calculations.push(`Minimum Pump Suction Tank Capacity: ${pumpSuctionCapacity} m³`);
      calculations.push(`Based on ${hazardGroup} hazard classification`);
      
      // Step 6: Sprinkler Spacing and Location Requirements
      calculations.push('\n=== SPRINKLER SPACING AND LOCATION REQUIREMENTS ===');
      const spacingData = SPRINKLER_SPACING_LOCATION[hazardGroup as keyof typeof SPRINKLER_SPACING_LOCATION];
      
      calculations.push(`Maximum Area Coverage per Sprinkler:`);
      calculations.push(`  Sidewall: ${spacingData.maxAreaCoverage.sidewall} m²`);
      calculations.push(`  Others: ${spacingData.maxAreaCoverage.others} m²`);
      calculations.push(`  Special Area: ${spacingData.maxAreaCoverage.specialArea} m²`);
      
      calculations.push(`Maximum Distance Between Sprinklers:`);
      calculations.push(`  Sidewall: ${spacingData.maxDistanceBetween.sidewall} m`);
      calculations.push(`  Others: ${spacingData.maxDistanceBetween.others} m`);
      calculations.push(`  Special Area: ${spacingData.maxDistanceBetween.specialArea} m`);
      calculations.push(`  Staggered: ${spacingData.maxDistanceBetween.staggered} m`);
      
      calculations.push(`Minimum Distance Between Sprinklers: ${spacingData.minDistanceBetweenSprinklers} m`);
      calculations.push(`Maximum Distance from Wall/Partition: ${spacingData.maxDistanceFromWallPartition} m`);
      calculations.push(`Maximum Distance from Open Face: ${spacingData.maxDistanceFromOpenFace} m`);
      calculations.push(`Maximum Distance Below Ceiling: ${spacingData.maxDistanceBelowCeiling.join('/')} mm`);
      calculations.push(`Maximum Distance from Column: ${spacingData.maxDistanceFromColumn} m`);
      calculations.push(`Clear Minimum Space Below: ${spacingData.clearMinSpaceBelow} m`);
      calculations.push(`Maximum Depth of Ceiling Void: ${spacingData.maxDepthCeilingVoid} m`);
      calculations.push(`Maximum Width of Canopy Below Sprinkler:`);
      calculations.push(`  Rectangular: ${spacingData.maxWidthCanopy.rectangular}±1m`);
      calculations.push(`  Circular: ${spacingData.maxWidthCanopy.circular}±1.2m`);
      calculations.push(`Maximum Extent of Canopy from Building: ${spacingData.maxExtentCanopyFromBuilding} m`);
      
      setResult({
        basicCapacity,
        requiredInflowRate,
        pumpSuctionCapacity,
        hazardGroup,
        systemType,
        height,
        effectiveWaterCapacity,
        systemFlowRate: actualSystemFlowRate,
        maxInflowPeriod,
        designDensity,
        areaOfOperation,
        systemFlow,
        pressureAtControlValve,
        maxDemandFlow,
        maxDemandPressure,
        spacingData,
        calculations
      });
    } catch (error) {
      console.error('Calculation error:', error);
      setResult(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Sprinkler Design Criteria</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">System Parameters</h3>
          
          {/* Basic Tank Sizing Parameters */}
          <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Basic Tank Sizing</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hazard Group Classification
              </label>
              <select
                value={hazardGroup}
                onChange={(e) => setHazardGroup(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LH">LH - Light Hazard</option>
                <option value="OH1">OH Group 1 - Ordinary Hazard Group 1</option>
                <option value="OH2">OH Group 2 - Ordinary Hazard Group 2</option>
                <option value="OH3">OH Group 3 - Ordinary Hazard Group 3</option>
                <option value="OH4">OH Group 4 - Ordinary Hazard Group 4</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Type
              </label>
              <select
                value={systemType}
                onChange={(e) => setSystemType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="wet">Wet System</option>
                <option value="pre-action">Pre-action System</option>
                <option value="dry">Dry System</option>
                <option value="alternate">Alternate System</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height Between High and Low Sprinklers (m)
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15 m</option>
                <option value={30}>30 m</option>
                <option value={45}>45 m</option>
              </select>
            </div>
          </div>

          {/* Effective Water Capacity */}
          <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Effective Water Capacity</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Water Storage (m³)
              </label>
              <input
                type="number"
                value={effectiveWaterCapacity}
                onChange={(e) => setEffectiveWaterCapacity(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the actual usable water volume excluding dead storage, reserves, and unusable volumes.
              </p>
            </div>
          </div>

          {/* System Flow Parameters */}
          <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">System Flow Parameters</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required System Flow Rate (L/min)
              </label>
              <input
                type="number"
                value={systemFlowRate}
                onChange={(e) => setSystemFlowRate(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Water flow rate required by the sprinkler system during fire conditions. System will use the higher of this value or the standard requirement.
              </p>
            </div>
          </div>

          <button
            onClick={calculateTankSizing}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
          >
            Calculate Design Criteria
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {result ? (
            <div className="space-y-4">
              {/* Summary Results */}
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h4 className="font-medium text-blue-800 mb-3">Tank Sizing Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Basic Tank Capacity:</span>
                    <div className="font-bold text-blue-600">{result.basicCapacity} m³</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Required Inflow Rate:</span>
                    <div className="font-bold text-red-600">{result.requiredInflowRate.toFixed(0)} L/min</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Inflow Duration:</span>
                    <div className="font-bold text-orange-600">{result.maxInflowPeriod} minutes</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Pump Suction Capacity:</span>
                    <div className="font-bold text-green-600">{result.pumpSuctionCapacity} m³</div>
                  </div>
                </div>
              </div>

              {/* Design Criteria */}
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h4 className="font-medium text-blue-800 mb-3">Design Criteria</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Design Density:</span>
                    <div className="font-bold text-purple-600">{result.designDensity} mm/min</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Area of Operation:</span>
                    <div className={`font-bold ${result.areaOfOperation === 0 ? 'text-red-600' : 'text-purple-600'}`}>
                      {result.areaOfOperation === 0 ? 'Not Allowed' : `${result.areaOfOperation} m²`}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">System Flow:</span>
                    <div className="font-bold text-blue-600">{result.systemFlow} L/min</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Control Valve Pressure:</span>
                    <div className="font-bold text-blue-600">{result.pressureAtControlValve} bar</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Demand Flow:</span>
                    <div className="font-bold text-green-600">{result.maxDemandFlow} L/min</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Demand Pressure:</span>
                    <div className="font-bold text-green-600">{result.maxDemandPressure} bar</div>
                  </div>
                </div>
              </div>

              {/* Sprinkler Spacing and Location Requirements */}
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h4 className="font-medium text-blue-800 mb-3">Sprinkler Spacing and Location Requirements</h4>
                
                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Maximum Area Coverage per Sprinkler</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Sidewall:</span>
                      <div className="font-bold text-purple-600">{result.spacingData.maxAreaCoverage.sidewall} m²</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Others:</span>
                      <div className="font-bold text-purple-600">{result.spacingData.maxAreaCoverage.others} m²</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Special Area:</span>
                      <div className="font-bold text-purple-600">{result.spacingData.maxAreaCoverage.specialArea} m²</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Maximum Distance Between Sprinklers</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Sidewall:</span>
                      <div className="font-bold text-orange-600">{result.spacingData.maxDistanceBetween.sidewall} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Others:</span>
                      <div className="font-bold text-orange-600">{result.spacingData.maxDistanceBetween.others} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Special Area:</span>
                      <div className="font-bold text-orange-600">{result.spacingData.maxDistanceBetween.specialArea} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Staggered:</span>
                      <div className="font-bold text-orange-600">{result.spacingData.maxDistanceBetween.staggered} m</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Distance Requirements</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Min. Between Sprinklers:</span>
                      <div className="font-bold text-green-600">{result.spacingData.minDistanceBetweenSprinklers} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Max. from Wall/Partition:</span>
                      <div className="font-bold text-green-600">{result.spacingData.maxDistanceFromWallPartition} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Max. from Open Face:</span>
                      <div className="font-bold text-green-600">{result.spacingData.maxDistanceFromOpenFace} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Max. from Column:</span>
                      <div className="font-bold text-green-600">{result.spacingData.maxDistanceFromColumn} m</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Clearance Requirements</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Clear Min. Space Below:</span>
                      <div className="font-bold text-blue-600">{result.spacingData.clearMinSpaceBelow} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Max. Ceiling Void Depth:</span>
                      <div className="font-bold text-blue-600">{result.spacingData.maxDepthCeilingVoid} m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Max. Distance Below Ceiling:</span>
                      <div className="font-bold text-blue-600">{result.spacingData.maxDistanceBelowCeiling.join('/')} mm</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Max. Canopy Extent:</span>
                      <div className="font-bold text-blue-600">{result.spacingData.maxExtentCanopyFromBuilding} m</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-2">Maximum Width of Canopy Below Sprinkler</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Rectangular:</span>
                      <div className="font-bold text-indigo-600">{result.spacingData.maxWidthCanopy.rectangular}±1 m</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Circular:</span>
                      <div className="font-bold text-indigo-600">{result.spacingData.maxWidthCanopy.circular}±1.2 m</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Compatibility Check */}
              {result.areaOfOperation === 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                  <div className="flex items-center">
                    <div className="text-red-600 mr-2">⚠️</div>
                    <div>
                      <h5 className="font-medium text-red-800">System Compatibility Warning</h5>
                      <p className="text-sm text-red-700 mt-1">
                        {result.systemType.charAt(0).toUpperCase() + result.systemType.slice(1)} systems are not allowed for {result.hazardGroup} hazard classification.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Calculations */}
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">Detailed Calculations</h4>
                <div className="bg-gray-50 p-3 rounded-md">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {result.calculations.join('\n')}
                  </pre>
                </div>
              </div>

              {/* Design Notes */}
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-3">Design Notes</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  <li>All calculations based on BS 12485 standards</li>
                  <li>Design density and area values from Table 3 (LH, OH and HHP criteria)</li>
                  <li>Flow and pressure requirements from Table 6 (Pre-calculated systems)</li>
                  <li>Sprinkler spacing and location requirements per BS EN 12845 standards</li>
                  <li>Special area coverage may require additional considerations (Tables 19 & 20)</li>
                  <li>Distance requirements comply with Clauses 12.3, 12.4.1, 12.4.2, 12.4.6, 12.4.7, 12.4.9</li>
                  <li>Clearance requirements per Clauses 12.1.2, 26.6 & TB11, 12.4.10, 12.4.4</li>
                  <li>Minimum 150mm clearance from adjacent wall required for rectangular canopies</li>
                  <li>Effective storage excludes unusable volumes and reserves</li>
                  <li>City supply integration requires double-end-fed supply</li>
                  <li>System compatibility verified against hazard classification</li>
                  <li>Regular testing and maintenance schedules required</li>
                  <li>Consider freeze protection in cold climates</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="mx-auto mb-4 w-12 h-12 text-gray-400">
                <Icons.Droplet />
              </div>
              <p>Enter parameters and click calculate to see design criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SprinklerTankCalculator;