import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface FSSupplyPumpCalculatorProps {
  onShowTutorial?: () => void;
}

// Define building types
const BUILDING_TYPES = [
  { value: 'industrial', label: 'Industrial/Godown Buildings' },
  { value: 'domestic', label: 'Domestic Buildings' },
  { value: 'other', label: 'Other Buildings' }
];

// Define pump efficiency ranges
const PUMP_EFFICIENCY_RANGES = {
  small: { min: 0.65, max: 0.75, default: 0.70 }, // < 10 kW
  medium: { min: 0.70, max: 0.80, default: 0.75 }, // 10-50 kW
  large: { min: 0.75, max: 0.85, default: 0.80 } // > 50 kW
};

// Interface for calculation results
interface SupplyTankResults {
  requiredVolume: number;
  selectedTankSize: number;
  floorAreaCategory: string;
  effectiveWaterQuantity: number;
  compliance: boolean;
}

interface FixedFirePumpResults {
  requiredFlow: number;
  numberOfHydrants: number;
  requiredPressure: number;
  hydraulicPower: number;
  motorRating: number;
  actualMotorPower: number;
  pumpEfficiency: number;
  flowPerHydrant: number;
  pressureAtHydrant: number;
  compliance: boolean;
}

interface BoosterPumpResults {
  isRequired: boolean;
  requiredFlow: number;
  numberOfRisers: number;
  numberOfHydrants: number;
  requiredPressure: number;
  hydraulicPower: number;
  motorRating: number;
  actualMotorPower: number;
  pumpEfficiency: number;
  buildingHeight: number;
  compliance: boolean;
}

const FSSupplyPumpCalculator: React.FC<FSSupplyPumpCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData } = useCalculatorActions({
    title: 'Fire Service Supply Tank and Pump Calculator',
    discipline: 'fs',
    calculatorType: 'supply-pump'
  });

  // State for active tab
  const [activeTab, setActiveTab] = useState<'tank' | 'pump' | 'booster'>('tank');

  // Supply Tank Inputs
  const [floorArea, setFloorArea] = useState<number>(500);
  const [numberOfFloors, setNumberOfFloors] = useState<number>(1);
  const [buildingType, setBuildingType] = useState<string>('other');
  const [hasBasement, setHasBasement] = useState<boolean>(false);

  // Fixed Fire Pump Inputs
  const [pumpBuildingType, setPumpBuildingType] = useState<string>('other');
  const [pumpEfficiency, setPumpEfficiency] = useState<number>(0.75);
  const [additionalPressureLoss, setAdditionalPressureLoss] = useState<number>(50);
  const [pumpSystemPressure, setPumpSystemPressure] = useState<number>(400);

  // Booster Pump Inputs
  const [boosterBuildingType, setBoosterBuildingType] = useState<string>('other');
  const [buildingHeight, setBuildingHeight] = useState<number>(80);
  const [numberOfRisers, setNumberOfRisers] = useState<number>(2);
  const [lowestFSInletHeight, setLowestFSInletHeight] = useState<number>(5);
  const [topmostHydrantHeight, setTopmostHydrantHeight] = useState<number>(75);
  const [boosterPumpEfficiency, setBoosterPumpEfficiency] = useState<number>(0.75);
  const [boosterSystemPressure, setBoosterSystemPressure] = useState<number>(450);

  // Results states
  const [supplyTankResults, setSupplyTankResults] = useState<SupplyTankResults | null>(null);
  const [fixedPumpResults, setFixedPumpResults] = useState<FixedFirePumpResults | null>(null);
  const [boosterPumpResults, setBoosterPumpResults] = useState<BoosterPumpResults | null>(null);

  // Calculate Supply Tank Requirements
  const calculateSupplyTank = (): SupplyTankResults => {
    const totalFloorArea = floorArea * numberOfFloors;
    let requiredVolume = 0;
    let floorAreaCategory = '';

    // Determine required volume based on floor area
    if (totalFloorArea <= 230) {
      requiredVolume = 9000; // 9 m³
      floorAreaCategory = 'Not exceeding 230 m²';
    } else if (totalFloorArea <= 460) {
      requiredVolume = 18000; // 18 m³
      floorAreaCategory = 'Over 230 m² but not exceeding 460 m²';
    } else if (totalFloorArea <= 920) {
      requiredVolume = 27000; // 27 m³
      floorAreaCategory = 'Over 460 m² but not exceeding 920 m²';
    } else {
      requiredVolume = 36000; // 36 m³
      floorAreaCategory = 'Over 920 m²';
    }

    // Standard tank sizes available
    const standardTankSizes = [9000, 18000, 27000, 36000, 45000, 54000, 72000, 90000];
    const selectedTankSize = standardTankSizes.find(size => size >= requiredVolume) || requiredVolume;

    return {
      requiredVolume,
      selectedTankSize,
      floorAreaCategory,
      effectiveWaterQuantity: requiredVolume,
      compliance: selectedTankSize >= requiredVolume
    };
  };

  // Calculate Fixed Fire Pump Requirements
  const calculateFixedPump = (): FixedFirePumpResults => {
    const flowPerHydrant = 450; // L/min per hydrant
    const pressureAtHydrant = 350; // kPa minimum
    
    let numberOfHydrants = 0;
    let requiredFlow = 0;

    // Determine number of hydrants based on building type
    if (pumpBuildingType === 'industrial') {
      numberOfHydrants = 3;
    } else {
      numberOfHydrants = 2;
    }

    requiredFlow = numberOfHydrants * flowPerHydrant; // L/min
    const requiredFlowM3S = requiredFlow / 60000; // Convert to m³/s
    const requiredPressure = pumpSystemPressure * 1000; // Convert kPa to Pa

    // Calculate hydraulic power: P = Q × H × ρ × g
    const density = 1000; // kg/m³ (water)
    const gravity = 9.81; // m/s²
    const pressureHead = requiredPressure / (density * gravity); // m

    const hydraulicPower = requiredFlowM3S * pressureHead * density * gravity; // W
    const hydraulicPowerKW = hydraulicPower / 1000; // kW

    // Motor rating with 20% safety factor
    const motorRating = hydraulicPowerKW * 1.2 / pumpEfficiency; // kW

    // Select standard motor power
    const standardMotorPowers = [0.75, 1.1, 1.5, 2.2, 3.0, 3.7, 4.0, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 400];
    const actualMotorPower = standardMotorPowers.find(power => power >= motorRating) || motorRating;

    return {
      requiredFlow,
      numberOfHydrants,
      requiredPressure: pumpSystemPressure,
      hydraulicPower: hydraulicPowerKW,
      motorRating,
      actualMotorPower,
      pumpEfficiency,
      flowPerHydrant,
      pressureAtHydrant,
      compliance: actualMotorPower >= motorRating
    };
  };

  // Calculate Booster Pump Requirements
  const calculateBoosterPump = (): BoosterPumpResults => {
    const heightDifference = topmostHydrantHeight - lowestFSInletHeight;
    const isRequired = heightDifference > 60;

    if (!isRequired) {
      return {
        isRequired: false,
        requiredFlow: 0,
        numberOfRisers,
        numberOfHydrants: 0,
        requiredPressure: 0,
        hydraulicPower: 0,
        motorRating: 0,
        actualMotorPower: 0,
        pumpEfficiency: boosterPumpEfficiency,
        buildingHeight: heightDifference,
        compliance: true
      };
    }

    let requiredFlow = 0;
    let numberOfHydrants = 0;

    // Determine flow requirements based on building type and risers
    if (boosterBuildingType === 'industrial') {
      if (numberOfRisers === 1) {
        requiredFlow = 1350; // L/min
        numberOfHydrants = 3;
      } else {
        requiredFlow = 2700; // L/min
        numberOfHydrants = 6;
      }
    } else if (boosterBuildingType === 'domestic') {
      requiredFlow = 900; // L/min
      numberOfHydrants = 2;
    } else { // other buildings
      if (numberOfRisers === 1) {
        requiredFlow = 900; // L/min
        numberOfHydrants = 2;
      } else {
        requiredFlow = 1800; // L/min
        numberOfHydrants = 4;
      }
    }

    const requiredFlowM3S = requiredFlow / 60000; // Convert to m³/s
    const requiredPressure = boosterSystemPressure * 1000; // Convert kPa to Pa

    // Calculate hydraulic power
    const density = 1000; // kg/m³ (water)
    const gravity = 9.81; // m/s²
    const pressureHead = requiredPressure / (density * gravity); // m

    const hydraulicPower = requiredFlowM3S * pressureHead * density * gravity; // W
    const hydraulicPowerKW = hydraulicPower / 1000; // kW

    // Motor rating with 20% safety factor
    const motorRating = hydraulicPowerKW * 1.2 / boosterPumpEfficiency; // kW

    // Select standard motor power
    const standardMotorPowers = [0.75, 1.1, 1.5, 2.2, 3.0, 3.7, 4.0, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 400];
    const actualMotorPower = standardMotorPowers.find(power => power >= motorRating) || motorRating;

    return {
      isRequired: true,
      requiredFlow,
      numberOfRisers,
      numberOfHydrants,
      requiredPressure: boosterSystemPressure,
      hydraulicPower: hydraulicPowerKW,
      motorRating,
      actualMotorPower,
      pumpEfficiency: boosterPumpEfficiency,
      buildingHeight: heightDifference,
      compliance: actualMotorPower >= motorRating
    };
  };

  // Calculate results when inputs change
  useEffect(() => {
    setSupplyTankResults(calculateSupplyTank());
  }, [floorArea, numberOfFloors, buildingType, hasBasement]);

  useEffect(() => {
    setFixedPumpResults(calculateFixedPump());
  }, [pumpBuildingType, pumpEfficiency, additionalPressureLoss, pumpSystemPressure]);

  useEffect(() => {
    setBoosterPumpResults(calculateBoosterPump());
  }, [boosterBuildingType, buildingHeight, numberOfRisers, lowestFSInletHeight, topmostHydrantHeight, boosterPumpEfficiency, boosterSystemPressure]);

  return (
    <CalculatorWrapper
      title="Fire Service Supply Tank and Pump Calculator"
      discipline="fs"
      calculatorType="supply-pump"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        {/* Tab Selector */}
        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'tank'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('tank')}
          >
            Supply Tank Sizing
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'pump'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('pump')}
          >
            Fixed Fire Pump
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'booster'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('booster')}
          >
            Intermediate Booster Pump
          </button>
        </div>

        {/* Supply Tank Tab */}
        {activeTab === 'tank' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Building Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Area (m²)
                </label>
                <input
                  type="number"
                  value={floorArea}
                  onChange={(e) => setFloorArea(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Floors
                </label>
                <input
                  type="number"
                  value={numberOfFloors}
                  onChange={(e) => setNumberOfFloors(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

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
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hasBasement}
                    onChange={(e) => setHasBasement(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Building has basement</span>
                </label>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Supply Tank Sizing Results</h3>
              
              {supplyTankResults && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-md shadow">
                    <h4 className="font-medium text-blue-800 mb-3">Calculated Requirements</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Floor Area:</span>
                        <span className="font-semibold">{(floorArea * numberOfFloors).toFixed(0)} m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Category:</span>
                        <span className="font-semibold text-blue-600">{supplyTankResults.floorAreaCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Required Volume:</span>
                        <span className="font-semibold text-green-600">{supplyTankResults.requiredVolume.toLocaleString()} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Required Volume (m³):</span>
                        <span className="font-semibold text-green-600">{(supplyTankResults.requiredVolume / 1000).toFixed(1)} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Selected Tank Size:</span>
                        <span className="font-semibold text-blue-600">{supplyTankResults.selectedTankSize.toLocaleString()} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Compliance Status:</span>
                        <span className={`font-semibold ${supplyTankResults.compliance ? 'text-green-600' : 'text-red-600'}`}>
                          {supplyTankResults.compliance ? 'COMPLIANT ✓' : 'NON-COMPLIANT ✗'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-md shadow">
                    <h4 className="font-medium text-blue-800 mb-3">Design Requirements</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Tank fed from approved water supply source</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Non-ferrous non-return valve required</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Effective water quantity measurement required</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Minimum operating duration compliance</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                      <li>Tank capacity based on largest floor area factor</li>
                      <li>Effective water quantity measurement method per Code of Practice</li>
                      <li>Water Authority and Fire Services approval required</li>
                      <li>Consider additional capacity for system testing and maintenance</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixed Fire Pump Tab */}
        {activeTab === 'pump' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Fire Pump Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Type
                </label>
                <select
                  value={pumpBuildingType}
                  onChange={(e) => setPumpBuildingType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {BUILDING_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Pressure (kPa)
                </label>
                <input
                  type="number"
                  value={pumpSystemPressure}
                  onChange={(e) => setPumpSystemPressure(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="350"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 350 kPa at hydrant outlets</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pump Efficiency
                </label>
                <input
                  type="number"
                  value={pumpEfficiency}
                  onChange={(e) => setPumpEfficiency(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0.5"
                  max="0.9"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Typical range: 0.65-0.85</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Pressure Loss (kPa)
                </label>
                <input
                  type="number"
                  value={additionalPressureLoss}
                  onChange={(e) => setAdditionalPressureLoss(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Pipework, fittings, and other losses</p>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Fixed Fire Pump Results</h3>
              
              {fixedPumpResults && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-md shadow">
                    <h4 className="font-medium text-blue-800 mb-3">Flow Requirements</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Number of Hydrants:</span>
                        <span className="font-semibold">{fixedPumpResults.numberOfHydrants}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Flow per Hydrant:</span>
                        <span className="font-semibold">{fixedPumpResults.flowPerHydrant} L/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Required Flow:</span>
                        <span className="font-semibold text-blue-600">{fixedPumpResults.requiredFlow} L/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Required Flow:</span>
                        <span className="font-semibold text-blue-600">{(fixedPumpResults.requiredFlow / 60).toFixed(1)} L/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Required Pressure:</span>
                        <span className="font-semibold text-blue-600">{fixedPumpResults.requiredPressure} kPa</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-md shadow">
                    <h4 className="font-medium text-blue-800 mb-3">Motor Sizing</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Hydraulic Power:</span>
                        <span className="font-semibold">{fixedPumpResults.hydraulicPower.toFixed(2)} kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pump Efficiency:</span>
                        <span className="font-semibold">{(fixedPumpResults.pumpEfficiency * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Required Motor (incl. 20% safety):</span>
                        <span className="font-semibold text-orange-600">{fixedPumpResults.motorRating.toFixed(2)} kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Selected Motor Power:</span>
                        <span className="font-semibold text-green-600">{fixedPumpResults.actualMotorPower} kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Compliance Status:</span>
                        <span className={`font-semibold ${fixedPumpResults.compliance ? 'text-green-600' : 'text-red-600'}`}>
                          {fixedPumpResults.compliance ? 'COMPLIANT ✓' : 'NON-COMPLIANT ✗'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-md shadow">
                    <h4 className="font-medium text-blue-800 mb-3">Design Requirements</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Electrically driven pump (preferred)</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Continuous operation until manual stop</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Selector switch for duty/standby operation</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">15-second start time for standby pump</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Intermediate Booster Pump Tab */}
        {activeTab === 'booster' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Booster Pump Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Type
                </label>
                <select
                  value={boosterBuildingType}
                  onChange={(e) => setBoosterBuildingType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {BUILDING_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lowest FS Inlet Height (m)
                </label>
                <input
                  type="number"
                  value={lowestFSInletHeight}
                  onChange={(e) => setLowestFSInletHeight(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topmost Hydrant Height (m)
                </label>
                <input
                  type="number"
                  value={topmostHydrantHeight}
                  onChange={(e) => setTopmostHydrantHeight(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Risers
                </label>
                <input
                  type="number"
                  value={numberOfRisers}
                  onChange={(e) => setNumberOfRisers(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Pressure (kPa)
                </label>
                <input
                  type="number"
                  value={boosterSystemPressure}
                  onChange={(e) => setBoosterSystemPressure(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="350"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pump Efficiency
                </label>
                <input
                  type="number"
                  value={boosterPumpEfficiency}
                  onChange={(e) => setBoosterPumpEfficiency(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0.5"
                  max="0.9"
                  step="0.01"
                />
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Booster Pump Results</h3>
              
              {boosterPumpResults && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-md shadow">
                    <h4 className="font-medium text-blue-800 mb-3">Requirements Assessment</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Height Difference:</span>
                        <span className="font-semibold">{boosterPumpResults.buildingHeight.toFixed(1)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Booster Pump Required:</span>
                        <span className={`font-semibold ${boosterPumpResults.isRequired ? 'text-red-600' : 'text-green-600'}`}>
                          {boosterPumpResults.isRequired ? 'YES (>60m)' : 'NO (≤60m)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {boosterPumpResults.isRequired && (
                    <>
                      <div className="bg-white p-4 rounded-md shadow">
                        <h4 className="font-medium text-blue-800 mb-3">Flow Requirements</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Number of Risers:</span>
                            <span className="font-semibold">{boosterPumpResults.numberOfRisers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Number of Hydrants:</span>
                            <span className="font-semibold">{boosterPumpResults.numberOfHydrants}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Required Flow:</span>
                            <span className="font-semibold text-blue-600">{boosterPumpResults.requiredFlow} L/min</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Required Flow:</span>
                            <span className="font-semibold text-blue-600">{(boosterPumpResults.requiredFlow / 60).toFixed(1)} L/s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Required Pressure:</span>
                            <span className="font-semibold text-blue-600">{boosterPumpResults.requiredPressure} kPa</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-md shadow">
                        <h4 className="font-medium text-blue-800 mb-3">Motor Sizing</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Hydraulic Power:</span>
                            <span className="font-semibold">{boosterPumpResults.hydraulicPower.toFixed(2)} kW</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Pump Efficiency:</span>
                            <span className="font-semibold">{(boosterPumpResults.pumpEfficiency * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Required Motor (incl. 20% safety):</span>
                            <span className="font-semibold text-orange-600">{boosterPumpResults.motorRating.toFixed(2)} kW</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Selected Motor Power:</span>
                            <span className="font-semibold text-green-600">{boosterPumpResults.actualMotorPower} kW</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Compliance Status:</span>
                            <span className={`font-semibold ${boosterPumpResults.compliance ? 'text-green-600' : 'text-red-600'}`}>
                              {boosterPumpResults.compliance ? 'COMPLIANT ✓' : 'NON-COMPLIANT ✗'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-white p-4 rounded-md shadow">
                    <h4 className="font-medium text-blue-800 mb-3">Design Requirements</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Fire engines boosting at constant 800 kPa</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Duplicated pumps for duty and standby</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">Sequential starting for multiple pumps</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.CheckCircle />
                        <span className="text-gray-700">20% additional motor power rating</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Standards Information */}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Design Standards & References</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Applicable Standards:</h5>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Fire Safety Code (local building authority)</li>
                <li>Code of Practice for Inspection, Testing and Maintenance</li>
                <li>Water Authority supply requirements</li>
                <li>Fire Services Department regulations</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Key Design Criteria:</h5>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Minimum 350 kPa pressure at hydrant outlets</li>
                <li>450 L/min flow rate per hydrant outlet</li>
                <li>20% motor power safety margin</li>
                <li>Booster pumps required for height 60m</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default FSSupplyPumpCalculator;