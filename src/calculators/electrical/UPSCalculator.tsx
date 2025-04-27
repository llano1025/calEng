import React, { useState } from 'react';
import { Icons } from '../../components/Icons';

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
    switch (activeTab) {
      case 'batteryPower':
        const batteryPower = calculateBatteryPower();
        setResults({
          ...results,
          batteryPower
        });
        break;
      case 'batteryBreaker':
        const batteryBreaker = calculateBatteryBreaker();
        setResults({
          ...results,
          batteryBreaker
        });
        break;
      case 'ventilation':
        const ventilation = calculateVentilation();
        setResults({
          ...results,
          ventilation
        });
        break;
      case 'chargingCurrent':
        const chargingCurrent = calculateChargingCurrent();
        setResults({
          ...results,
          chargingCurrent
        });
        break;
      default:
        break;
    }
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
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Uninterruptible Power Supply Calculator</h2>
        
        {onShowTutorial && (
          <button onClick={onShowTutorial} className="flex items-center text-blue-600 hover:text-blue-800">
            <Icons.InfoInline/> Tutorial
          </button>
        )}
      </div>
      
      <p className="mb-4 text-gray-600">
        Calculate UPS battery requirements, battery breaker sizing, ventilation needs, and charging current.
      </p>

      {/* Tabs for different calculators */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'batteryPower'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('batteryPower')}
          >
            Battery Power
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'batteryBreaker'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('batteryBreaker')}
          >
            Battery Breaker
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'ventilation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('ventilation')}
          >
            Ventilation
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'chargingCurrent'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('chargingCurrent')}
          >
            Charging Current
          </button>
        </nav>
      </div>

      {/* Battery Power Required */}
      {activeTab === 'batteryPower' && (
        <div>
          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-medium mb-1 text-sm">Load Power (kVA)</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Power Factor</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">UPS Efficiency</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Battery Voltage (V)</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Number of Battery Strings</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Batteries Per String</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Aging Factor</label>
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
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
          >
            Calculate Battery Power
          </button>
          
          {/* Results Display */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
              <div>
                <span className="font-medium">Required Power:</span> {(results.batteryPower.requiredPower / 1000).toFixed(2)} kW
              </div>
              <div>
                <span className="font-medium">Total Cell Number:</span> {results.batteryPower.cellNumber.toFixed(0)}
              </div>
              <div className="font-bold text-green-600">
                <span className="font-medium text-black">Battery Energy:</span> {results.batteryPower.batteryEnergy.toFixed(2)} W
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              Formula: Battery Energy = (Load Power × 1000 × PF / Efficiency) / (Strings × Batteries × Voltage / 2) × Aging Factor
            </div>
          </div>
        </div>
      )}

      {/* Battery Breaker */}
      {activeTab === 'batteryBreaker' && (
        <div>
          {/* Display key inputs that affect breaker sizing */}
          {/* <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icons.InfoCircle />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Battery breaker sizing is calculated using load power, efficiency, and cell configuration.
                </p>
              </div>
            </div>
          </div> */}

          {/* Key Parameters Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-medium mb-1 text-sm">Load Power (kVA)</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Power Factor</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">UPS Efficiency</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Battery Voltage (V)</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Batteries Per String</label>
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
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
          >
            Calculate Breaker Size
          </button>

          {/* Results Display */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="text-sm">
              <div className="font-bold text-green-600">
                <span className="font-medium text-black">Battery Breaker Rating:</span> {results.batteryBreaker.breakerRating.toFixed(2)} A
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              Formula: Breaker Rating = (Load Power × Power Factor / Efficiency × 1000) / 1.75 / (Batteries Per String × Battery Voltage / 2)
            </div>
          </div>

          {/* Formula Reference */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">Battery Breaker Sizing Guide</h3>
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
      )}

      {/* Ventilation */}
      {activeTab === 'ventilation' && (
        <div>
          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-medium mb-1 text-sm">Battery Type</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Charging Mode</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Number of Cells</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Battery Capacity (Ah)</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Number of Battery Strings</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Room Floor Area (m²)</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Lower Explosion Limit (%)</label>
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
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
          >
            Calculate Ventilation Requirements
          </button>

          {/* Results Display */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
              <div>
                <span className="font-medium">Total Battery Capacity:</span> {results.ventilation.totalBatteryCapacity.toFixed(0)} Ah
              </div>
              <div>
                <span className="font-medium">Gas Producing Current:</span> {results.ventilation.gasProducingCurrent.toFixed(2)} mA/Ah
              </div>
              <div>
                <span className="font-medium">Dilution Factor (v):</span> {results.ventilation.vFactor.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Calculated Air Flow Rate:</span> {results.ventilation.airFlowRate.toFixed(2)} m³/h
              </div>
              
              {results.ventilation.applyMinimumRate && (
                <div>
                  <span className="font-medium">Minimum Air Flow Rate:</span> {results.ventilation.minimumAirFlowRate.toFixed(2)} m³/h
                </div>
              )}
              
              <div className="font-bold text-green-600 col-span-2">
                <span className="font-medium text-black">Recommended Air Flow Rate:</span> {results.ventilation.recommendedAirFlowRate.toFixed(2)} m³/h
                {results.ventilation.applyMinimumRate && results.ventilation.recommendedAirFlowRate === results.ventilation.minimumAirFlowRate ? 
                  " (based on floor area)" : " (based on calculation)"}
              </div>
              
              {!results.ventilation.applyMinimumRate && (
                <div className="italic text-xs text-gray-600 col-span-2 mt-2">
                  Note: Minimum floor area rate (5.1 L/s/m²) does not apply as total battery capacity is less than 400 Ah.
                </div>
              )}
            </div>

            <div className="mt-2 text-xs text-gray-600">
              Formula: Q = v × q × s × n × Igas × Crt × 10⁻³ (m³/h)
            </div>
          </div>

          {/* Formula Reference */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">Ventilation Calculation Reference (EN 50272-2)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border">Symbol</th>
                    <th className="px-3 py-2 border">Description</th>
                    <th className="px-3 py-2 border">Value/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1 border">v</td>
                    <td className="px-3 py-1 border">Dilution factor</td>
                    <td className="px-3 py-1 border">(100% - LEL%) ÷ LEL%</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1 border">q</td>
                    <td className="px-3 py-1 border">Hydrogen generation rate</td>
                    <td className="px-3 py-1 border">0.42 × 1.095 × 10⁻³ m³/Ah</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1 border">s</td>
                    <td className="px-3 py-1 border">Safety factor</td>
                    <td className="px-3 py-1 border">5</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1 border">n</td>
                    <td className="px-3 py-1 border">Number of cells</td>
                    <td className="px-3 py-1 border">cells</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1 border">Igas</td>
                    <td className="px-3 py-1 border">Gas producing current</td>
                    <td className="px-3 py-1 border">mA/Ah</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-1 border">Crt</td>
                    <td className="px-3 py-1 border">Battery capacity</td>
                    <td className="px-3 py-1 border">Ah</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              The minimum 5.1 L/s/m² ventilation rate applies only if total battery capacity ≥ 400 Ah.
            </p>
          </div>
        </div>
      )}

      {/* Charging Current */}
      {activeTab === 'chargingCurrent' && (
        <div>
          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-medium mb-1 text-sm">Battery Capacity (Ah)</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Charging Efficiency</label>
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
            <div>
              <label className="block font-medium mb-1 text-sm">Desired Charging Time (hours)</label>
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
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
          >
            Calculate Charging Current
          </button>

          {/* Results Display */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="text-sm">
              <div className="font-bold text-green-600">
                <span className="font-medium text-black">Maximum Charging Current:</span> {results.chargingCurrent.maxChargingCurrent.toFixed(2)} A
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              Formula: Maximum Charging Current = (Battery Capacity ÷ Charging Time) ÷ Charging Efficiency
            </div>
          </div>

          {/* Charging Guidelines */}
          {/* <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">Battery Charging Current Guidelines</h3>
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
            <p className="mt-2 text-xs text-gray-600">
              Higher charging currents increase hydrogen gas production and battery temperature. Follow manufacturer recommendations.
            </p>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default UPSCalculator;