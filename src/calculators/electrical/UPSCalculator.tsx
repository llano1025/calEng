import React, { useState } from 'react';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface UPSCalculatorProps {
  onShowTutorial?: () => void;
}

// Battery type options from EN 50272-2 standard
type BatteryType = 'lead_acid_vented' | 'lead_acid_vrla' | 'nicd';
type ChargingMode = 'float' | 'boost';

// Battery parameters based on type
const batteryParams = {
  lead_acid_vented: {
    gasEmissionFactor: 1, // fg
    safetyFactor: 5, // fs
    floatChargeCurrent: 5, // mA/Ah
    boostChargeCurrent: 20, // mA/Ah
    floatChargeVoltage: 2.23, // V/cell
    boostChargeVoltage: 2.40, // V/cell
  },
  lead_acid_vrla: {
    gasEmissionFactor: 0.2, // fg
    safetyFactor: 5, // fs
    floatChargeCurrent: 1, // mA/Ah
    boostChargeCurrent: 8, // mA/Ah
    floatChargeVoltage: 2.27, // V/cell
    boostChargeVoltage: 2.40, // V/cell
  },
  nicd: {
    gasEmissionFactor: 1, // fg
    safetyFactor: 5, // fs
    floatChargeCurrent: 5, // mA/Ah
    boostChargeCurrent: 50, // mA/Ah
    floatChargeVoltage: 1.40, // V/cell
    boostChargeVoltage: 1.55, // V/cell
  }
};

const UPSCalculator: React.FC<UPSCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'UPS Calculator',
    discipline: 'electrical',
    calculatorType: 'ups'
  });

  // State for the various calculator inputs
  const [activeTab, setActiveTab] = useState<string>('batteryPower');
  const [formData, setFormData] = useState({
    // Battery Power Required
    loadPower: '', // in kVA
    powerFactor: '0.85',
    efficiency: '0.95',
    batteryVoltage: '12', // in volts
    batteryString: '1',
    batteryPerString: '34',
    agingFactor: '1.15',
    
    // Ventilation
    batteryType: 'lead_acid_vrla' as BatteryType,
    chargingMode: 'boost' as ChargingMode,
    numCells: '120', // Total number of cells
    batteryCapacity: '100', // in Ah (C10 rated capacity)
    roomFloorArea: '20', // in m²
    lowerExplosionLimit: '4', // LEL in %
    
    // Charging Current
    chargingEfficiency: '0.85',
    chargingTime: '10', // in hours
  });

  // State for calculated results
  const [results, setResults] = useState({
    batteryPower: {
      batteryEnergy: 0, // in W
      requiredPower: 0, // in kW
      cellNumber: 0
    },
    batteryBreaker: {
      breakerRating: 0, // in A
    },
    ventilation: {
      totalBatteryCapacity: 0, // in Ah (total of all strings)
      gasProducingCurrent: 0, // Igas in mA/Ah
      vFactor: 0, // v value = (100% - LEL%) / LEL% 
      airFlowRate: 0, // Q in m³/h
      minimumAirFlowRate: 0, // based on floor area (5.1 L/s/m²)
      applyMinimumRate: false, // whether minimum rate applies (capacity ≥ 400 Ah)
      recommendedAirFlowRate: 0, // the higher of calculated vs minimum
    },
    chargingCurrent: {
      maxChargingCurrent: 0, // in A
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Calculate specific sections based on active tab
  const handleCalculate = () => {
    let newResults = { ...results };
    let currentTabResults: any = {};
    let currentTabInputs: any = {};
    
    switch (activeTab) {
      case 'batteryPower':
        const batteryPower = calculateBatteryPower();
        newResults = {
          ...results,
          batteryPower
        };
        currentTabResults = { batteryPower };
        currentTabInputs = {
          loadPower: formData.loadPower,
          powerFactor: formData.powerFactor,
          efficiency: formData.efficiency,
          batteryVoltage: formData.batteryVoltage,
          batteryString: formData.batteryString,
          batteryPerString: formData.batteryPerString,
          agingFactor: formData.agingFactor
        };
        break;
      case 'batteryBreaker':
        const batteryBreaker = calculateBatteryBreaker();
        newResults = {
          ...results,
          batteryBreaker
        };
        currentTabResults = { batteryBreaker };
        currentTabInputs = {
          loadPower: formData.loadPower,
          powerFactor: formData.powerFactor,
          efficiency: formData.efficiency,
          batteryVoltage: formData.batteryVoltage,
          batteryPerString: formData.batteryPerString
        };
        break;
      case 'ventilation':
        const ventilation = calculateVentilation();
        newResults = {
          ...results,
          ventilation
        };
        currentTabResults = { ventilation };
        currentTabInputs = {
          batteryType: formData.batteryType,
          chargingMode: formData.chargingMode,
          numCells: formData.numCells,
          batteryCapacity: formData.batteryCapacity,
          batteryString: formData.batteryString,
          roomFloorArea: formData.roomFloorArea,
          lowerExplosionLimit: formData.lowerExplosionLimit
        };
        break;
      case 'chargingCurrent':
        const chargingCurrent = calculateChargingCurrent();
        newResults = {
          ...results,
          chargingCurrent
        };
        currentTabResults = { chargingCurrent };
        currentTabInputs = {
          batteryCapacity: formData.batteryCapacity,
          chargingEfficiency: formData.chargingEfficiency,
          chargingTime: formData.chargingTime
        };
        break;
      default:
        break;
    }
    
    setResults(newResults);
    
    // Save calculation with both inputs and results
    saveCalculation(formData, newResults);
    
    // Prepare export data with only current tab's results and relevant inputs
    prepareExportData(currentTabInputs, currentTabResults);
  };

  // Calculate Battery Power Required
  const calculateBatteryPower = () => {
    const loadPower = parseFloat(formData.loadPower) || 0;
    const powerFactor = parseFloat(formData.powerFactor) || 0.85;
    const efficiency = parseFloat(formData.efficiency) || 0.95;
    const batteryVoltage = parseFloat(formData.batteryVoltage) || 12;
    const batteryString = parseFloat(formData.batteryString) || 1;
    const batteryPerString = parseFloat(formData.batteryPerString) || 34;
    const agingFactor = parseFloat(formData.agingFactor) || 1.15;
    
    // Actual power needed after efficiency (in W)
    const requiredPower = loadPower * 1000 * powerFactor / efficiency;

    // Total number of cell
    const cellNumber = batteryString * batteryPerString * batteryVoltage / 2;
    
    // Battery energy required
    const batteryEnergy = requiredPower / cellNumber * agingFactor; // in W

    return {
      batteryEnergy,
      requiredPower,
      cellNumber
    };
  };

  // Calculate Battery Breaker
  const calculateBatteryBreaker = () => {
    const loadPower = parseFloat(formData.loadPower) || 0;
    const powerFactor = parseFloat(formData.powerFactor) || 0.85;
    const efficiency = parseFloat(formData.efficiency) || 0.95;
    const batteryPerString = parseFloat(formData.batteryPerString) || 34;
    const batteryVoltage = parseFloat(formData.batteryVoltage) || 12;
    
    // Actual power needed after efficiency
    const requiredPower = loadPower * powerFactor / efficiency;
    
    // Total number of cell
    const cellNumber = batteryPerString * batteryVoltage / 2;
    
    // Battery breaker rating calculation
    const breakerRating = requiredPower * 1000 / 1.75 / cellNumber;
    
    return {
      breakerRating
    };
  };

  // Calculate Ventilation requirements based on EN 50272-2 standard
  const calculateVentilation = () => {
    const batteryType = formData.batteryType as BatteryType;
    const chargingMode = formData.chargingMode as ChargingMode;
    const numCells = parseInt(formData.numCells) || 0;
    const batteryCapacity = parseFloat(formData.batteryCapacity) || 0; // C10 capacity in Ah
    const batteryString = parseFloat(formData.batteryString) || 1;
    const roomFloorArea = parseFloat(formData.roomFloorArea) || 0; // in m²
    
    // Ventilation parameters
    const hydrogenGenerationRate = 0.42; // q (×10^-3)
    const safetyFactor = 5; // s
    const lowerExplosionLimit = parseFloat(formData.lowerExplosionLimit) || 4; // LEL in %
    
    // Calculate v factor based on LEL
    const vFactor = (100 - lowerExplosionLimit) / lowerExplosionLimit;
    
    // Get battery parameters
    const params = batteryParams[batteryType];
    
    // Calculate Igas (gas producing current in mA/Ah)
    const gasProducingCurrent = chargingMode === 'float' 
      ? params.floatChargeCurrent 
      : params.boostChargeCurrent;
    
    // Calculate total battery capacity (all strings combined)
    const totalBatteryCapacity = batteryCapacity * batteryString;
    
    // Calculate airflow using the detailed formula: 
    // Q = v × q × s × n × Igas × Crt × 10^-3
    // Including temperature correction factor 1.095
    const airFlowRate = vFactor * (hydrogenGenerationRate * 1.095 * Math.pow(10, -3)) * safetyFactor * 
                      numCells * gasProducingCurrent * 
                      batteryCapacity * 0.001; // in m³/h
    
    // Determine if minimum rate applies (only for battery installations ≥ 400 Ah)
    const applyMinimumRate = totalBatteryCapacity >= 400;
    
    // Calculate minimum required ventilation based on floor area (if applicable)
    // 5.1 L/s/m² = 5.1 * 3.6 = 18.36 m³/h/m²
    const minimumAirFlowRate = applyMinimumRate ? 18.36 * roomFloorArea : 0; // in m³/h
    
    // The recommended air flow rate is the higher of the two if minimum rate applies
    const recommendedAirFlowRate = applyMinimumRate 
      ? Math.max(airFlowRate, minimumAirFlowRate) 
      : airFlowRate;

    return {
      totalBatteryCapacity,
      gasProducingCurrent,
      vFactor,
      airFlowRate,
      minimumAirFlowRate,
      applyMinimumRate,
      recommendedAirFlowRate
    };
  };

  // Calculate Charging Current
  const calculateChargingCurrent = () => {
    const batteryCapacity = parseFloat(formData.batteryCapacity) || 0;
    const chargingEfficiency = parseFloat(formData.chargingEfficiency) || 0.85;
    const chargingTime = parseFloat(formData.chargingTime) || 10;
    
    // Maximum charging current
    // Typically, for deep cycle batteries, max charging current is C/10 (where C is capacity)
    // But we'll calculate based on the desired recharge time
    const maxChargingCurrent = (batteryCapacity / chargingTime) / chargingEfficiency;

    return {
      maxChargingCurrent,
    };
  };

  return (
    <CalculatorWrapper
      title="Uninterruptible Power Supply Calculator"
      discipline="electrical"
      calculatorType="ups"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">

      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'batteryPower'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('batteryPower')}
        >
          Battery Power
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'batteryBreaker'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('batteryBreaker')}
        >
          Battery Breaker
        </button>
                <button
          className={`py-2 px-4 ${
            activeTab === 'ventilation'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('ventilation')}
        >
          Ventilation
        </button>
                <button
          className={`py-2 px-4 ${
            activeTab === 'chargingCurrent'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('chargingCurrent')}
        >
          Charging Current
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Battery Power Required */}
        {activeTab === 'batteryPower' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Load Power (kVA)
                </label>
                <input
                  type="number"
                  id="loadPower"
                  name="loadPower"
                  value={formData.loadPower}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 10"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Power Factor
                </label>
                <input
                  type="number"
                  id="powerFactor"
                  name="powerFactor"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.powerFactor}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 0.85"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPS Efficiency
                </label>
                <input
                  type="number"
                  id="efficiency"
                  name="efficiency"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.efficiency}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 0.95"
                />
              </div>

              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Battery Configuration</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Voltage (V)
                </label>
                <input
                  type="number"
                  id="batteryVoltage"
                  name="batteryVoltage"
                  value={formData.batteryVoltage}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 12"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Battery Strings
                </label>
                <input
                  type="number"
                  id="batteryString"
                  name="batteryString"
                  value={formData.batteryString}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 1"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batteries Per String
                </label>
                <input
                  type="number"
                  id="batteryPerString"
                  name="batteryPerString"
                  value={formData.batteryPerString}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 34"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aging Factor
                </label>
                <input
                  type="number"
                  id="agingFactor"
                  name="agingFactor"
                  step="0.01"
                  value={formData.agingFactor}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 1.15"
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate Battery Power
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium">Required Power</p>
                  <p className="text-lg">
                    {(results.batteryPower.requiredPower / 1000).toFixed(2)} kW
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">Total Cell Number</p>
                  <p className="text-lg">
                    {results.batteryPower.cellNumber.toFixed(0)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">Battery Energy</p>
                  <p className="text-lg text-green-600">
                    {results.batteryPower.batteryEnergy.toFixed(2)} W
                  </p>
                </div>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">How This is Calculated</h4>
                <p className="text-sm text-gray-600">
                  Battery Energy = (Load Power × 1000 × PF / Efficiency) / (Strings × Batteries × Voltage / 2) × Aging Factor
                </p>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Notes</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>The aging factor accounts for battery capacity degradation over time.</li>
                  <li>Higher efficiency values result in lower battery energy requirements.</li>
                  <li>Battery string configurations significantly impact the total system capacity.</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Battery Breaker */}
        {activeTab === 'batteryBreaker' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Load Power (kVA)
                </label>
                <input
                  type="number"
                  id="loadPower"
                  name="loadPower"
                  value={formData.loadPower}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 10"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Power Factor
                </label>
                <input
                  type="number"
                  id="powerFactor"
                  name="powerFactor"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.powerFactor}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 0.85"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPS Efficiency
                </label>
                <input
                  type="number"
                  id="efficiency"
                  name="efficiency"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.efficiency}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 0.95"
                />
              </div>

              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Battery Configuration</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Voltage (V)
                </label>
                <input
                  type="number"
                  id="batteryVoltage"
                  name="batteryVoltage"
                  value={formData.batteryVoltage}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 12"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batteries Per String
                </label>
                <input
                  type="number"
                  id="batteryPerString"
                  name="batteryPerString"
                  value={formData.batteryPerString}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 34"
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate Breaker Size
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              <div>
                <p className="text-sm font-medium">Battery Breaker Rating</p>
                <p className="text-lg text-green-600">
                  {results.batteryBreaker.breakerRating.toFixed(2)} A
                </p>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">How This is Calculated</h4>
                <p className="text-sm text-gray-600">
                  Breaker Rating = (Load Power × Power Factor / Efficiency × 1000) / 1.75 / (Batteries Per String × Battery Voltage / 2)
                </p>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Battery Breaker Sizing Guide</h4>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>The battery circuit breaker should be properly sized to protect both the batteries and the UPS system.</p>
                  <p>The calculation takes into account:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Load power requirements</li>
                    <li>Power factor</li>
                    <li>System efficiency</li>
                    <li>Battery configuration (strings and cells)</li>
                  </ul>
                  <p>For VRLA batteries, use DC-rated circuit breakers with appropriate voltage rating.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Ventilation */}
        {activeTab === 'ventilation' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Type
                </label>
                <select
                  id="batteryType"
                  name="batteryType"
                  value={formData.batteryType}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="lead_acid_vented">Lead-acid Vented</option>
                  <option value="lead_acid_vrla">Lead-acid VRLA</option>
                  <option value="nicd">NiCd Batteries</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charging Mode
                </label>
                <select
                  id="chargingMode"
                  name="chargingMode"
                  value={formData.chargingMode}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="float">Float Charge</option>
                  <option value="boost">Boost Charge</option>
                </select>
              </div>

              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Battery Configuration</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Cells
                </label>
                <input
                  type="number"
                  id="numCells"
                  name="numCells"
                  value={formData.numCells}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 120"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Capacity (Ah)
                </label>
                <input
                  type="number"
                  id="batteryCapacity"
                  name="batteryCapacity"
                  value={formData.batteryCapacity}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Battery Strings
                </label>
                <input
                  type="number"
                  id="batteryString"
                  name="batteryString"
                  value={formData.batteryString}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 1"
                />
              </div>

              <div className="border-t border-gray-300 my-4"></div>
              
              <h4 className="font-medium mb-3">Room Parameters</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Floor Area (m²)
                </label>
                <input
                  type="number"
                  id="roomFloorArea"
                  name="roomFloorArea"
                  value={formData.roomFloorArea}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 20"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lower Explosion Limit (%)
                </label>
                <input
                  type="number"
                  id="lowerExplosionLimit"
                  name="lowerExplosionLimit"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.lowerExplosionLimit}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 4"
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate Ventilation Requirements
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Battery Capacity</p>
                  <p className="text-lg">
                    {results.ventilation.totalBatteryCapacity.toFixed(0)} Ah
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Gas Producing Current</p>
                  <p className="text-lg">
                    {results.ventilation.gasProducingCurrent.toFixed(2)} mA/Ah
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Dilution Factor (v)</p>
                  <p className="text-lg">
                    {results.ventilation.vFactor.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Air Flow Rate Details</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Calculated Air Flow Rate</p>
                    <p>{results.ventilation.airFlowRate.toFixed(2)} m³/h</p>
                  </div>
                  
                  {results.ventilation.applyMinimumRate && (
                    <div>
                      <p className="text-sm text-gray-600">Minimum Air Flow Rate</p>
                      <p>{results.ventilation.minimumAirFlowRate.toFixed(2)} m³/h</p>
                    </div>
                  )}
                  
                  <div className="font-bold text-green-600">
                    <p className="text-sm text-gray-600">Recommended Air Flow Rate</p>
                    <p>{results.ventilation.recommendedAirFlowRate.toFixed(2)} m³/h
                      {results.ventilation.applyMinimumRate && results.ventilation.recommendedAirFlowRate === results.ventilation.minimumAirFlowRate ? 
                        " (based on floor area)" : " (based on calculation)"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Ventilation Formula</h4>
                <p className="text-sm text-gray-600">
                  Q = v × q × s × n × Igas × Crt × 10⁻³ (m³/h)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Where: v = dilution factor, q = hydrogen generation rate, s = safety factor, n = number of cells, 
                  Igas = gas producing current, Crt = battery capacity
                </p>
                
                {!results.ventilation.applyMinimumRate && (
                  <p className="italic text-xs text-gray-600 mt-2">
                    Note: Minimum floor area rate (5.1 L/s/m²) does not apply as total battery capacity is less than 400 Ah.
                  </p>
                )}
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Notes</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Based on EN 50272-2 standard for battery ventilation requirements.</li>
                  <li>Higher charging currents increase hydrogen gas production.</li>
                  <li>VRLA batteries generally produce less hydrogen than vented types.</li>
                  <li>Minimum ventilation rate of 5.1 L/s/m² applies to installations ≥ 400 Ah.</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Charging Current */}
        {activeTab === 'chargingCurrent' && (
          <>
            {/* Input Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Capacity (Ah)
                </label>
                <input
                  type="number"
                  id="batteryCapacity"
                  name="batteryCapacity"
                  value={formData.batteryCapacity}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charging Efficiency
                </label>
                <input
                  type="number"
                  id="chargingEfficiency"
                  name="chargingEfficiency"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.chargingEfficiency}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 0.85"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Charging Time (hours)
                </label>
                <input
                  type="number"
                  id="chargingTime"
                  name="chargingTime"
                  value={formData.chargingTime}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g., 10"
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleCalculate}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Calculate Charging Current
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
              
              <div>
                <p className="text-sm font-medium">Maximum Charging Current</p>
                <p className="text-lg text-green-600">
                  {results.chargingCurrent.maxChargingCurrent.toFixed(2)} A
                </p>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">How This is Calculated</h4>
                <p className="text-sm text-gray-600">
                  Maximum Charging Current = (Battery Capacity ÷ Charging Time) ÷ Charging Efficiency
                </p>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Battery Charging Current Guidelines</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 border">Charging Type</th>
                        <th className="px-3 py-2 border">Typical Rate</th>
                        <th className="px-3 py-2 border">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="px-3 py-1 border">Float charging</td>
                        <td className="px-3 py-1 border">0.001C to 0.002C</td>
                        <td className="px-3 py-1 border">Maintenance charge (0.1-0.2% of capacity)</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-3 py-1 border">Boost/bulk charging</td>
                        <td className="px-3 py-1 border">0.05C to 0.2C</td>
                        <td className="px-3 py-1 border">Normal recharge (5-20% of capacity)</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-3 py-1 border">Fast charging</td>
                        <td className="px-3 py-1 border">up to 0.3C</td>
                        <td className="px-3 py-1 border">Rapid recharge (not recommended for regular use)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-6 bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Notes</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Higher charging currents increase hydrogen gas production and battery temperature.</li>
                  <li>Follow manufacturer recommendations for optimal charging current.</li>
                  <li>Charging too quickly may reduce battery lifespan.</li>
                  <li>Charging too slowly may not fully charge batteries before next discharge cycle.</li>
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
          <li>Calculations are based on industry standards for battery sizing and UPS system design.</li>
          <li>Battery ventilation requirements follow EN 50272-2 standard for stationary batteries.</li>
          <li>Battery breaker sizing must be verified against manufacturer specifications for the selected DC circuit breaker.</li>
          <li>Aging factor accounts for battery capacity loss over time and is typically 1.15-1.25 for VRLA batteries.</li>
        </ul>
      </div>
      </div>
    </CalculatorWrapper>
  );
};

export default UPSCalculator;