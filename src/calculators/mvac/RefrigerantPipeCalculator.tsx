import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface RefrigerantPipeCalculatorProps {
  onShowTutorial?: () => void;
}

interface SuctionLineSizingProps {
  onShowTutorial?: () => void;
}

interface LiquidLineSizingProps {
  onShowTutorial?: () => void;
}

interface DischargeLineSizingProps {
  onShowTutorial?: () => void;
}

// Enhanced refrigerant properties with saturation curves and thermodynamic data
const REFRIGERANT_TYPES = [
  { 
    value: 'R410A', 
    label: 'R-410A',
    // Antoine equation coefficients for saturation pressure (kPa) vs temperature (°C)
    // log10(P_sat) = A - B/(C + T)
    antoine_A: 4.0648,
    antoine_B: 1002.7,
    antoine_C: 232.05,
    // Reference properties at standard conditions
    ref_density_liquid_25C: 1060, // kg/m³ at 25°C
    ref_density_vapor_5C: 23.5, // kg/m³ at 5°C
    ref_viscosity_liquid: 0.00015, // Pa·s
    ref_viscosity_vapor: 0.000013, // Pa·s
    // Typical cycle data for mass flow estimation
    typical_h_evap_in: 420, // kJ/kg (after expansion valve)
    typical_h_evap_out: 450, // kJ/kg (with 5°C superheat)
    typical_cop: 3.5
  },
  { 
    value: 'R134A', 
    label: 'R-134a',
    antoine_A: 4.0211,
    antoine_B: 988.2,
    antoine_C: 226.4,
    ref_density_liquid_25C: 1200,
    ref_density_vapor_5C: 21.2,
    ref_viscosity_liquid: 0.00019,
    ref_viscosity_vapor: 0.000012,
    typical_h_evap_in: 240,
    typical_h_evap_out: 270,
    typical_cop: 3.2
  },
  { 
    value: 'R22', 
    label: 'R-22',
    antoine_A: 3.9963,
    antoine_B: 897.8,
    antoine_C: 215.2,
    ref_density_liquid_25C: 1180,
    ref_density_vapor_5C: 19.8,
    ref_viscosity_liquid: 0.00016,
    ref_viscosity_vapor: 0.000014,
    typical_h_evap_in: 190,
    typical_h_evap_out: 220,
    typical_cop: 3.0
  },
  { 
    value: 'R32', 
    label: 'R-32',
    antoine_A: 4.1245,
    antoine_B: 1021.3,
    antoine_C: 241.6,
    ref_density_liquid_25C: 960,
    ref_density_vapor_5C: 26.1,
    ref_viscosity_liquid: 0.00012,
    ref_viscosity_vapor: 0.000011,
    typical_h_evap_in: 380,
    typical_h_evap_out: 415,
    typical_cop: 4.0
  }
];

// Standard copper pipe sizes (outer diameter in mm)
const PIPE_SIZES = [
  { od: 6.35, id: 4.83, label: '1/4"' },
  { od: 9.52, id: 7.75, label: '3/8"' },
  { od: 12.7, id: 10.93, label: '1/2"' },
  { od: 15.88, id: 14.11, label: '5/8"' },
  { od: 19.05, id: 17.28, label: '3/4"' },
  { od: 22.22, id: 20.45, label: '7/8"' },
  { od: 25.4, id: 23.63, label: '1"' },
  { od: 28.58, id: 26.81, label: '1-1/8"' },
  { od: 31.75, id: 29.98, label: '1-1/4"' },
  { od: 34.92, id: 33.15, label: '1-3/8"' },
  { od: 41.28, id: 39.51, label: '1-5/8"' },
  { od: 47.62, id: 45.85, label: '1-7/8"' },
  { od: 53.98, id: 52.21, label: '2-1/8"' },
  { od: 66.68, id: 64.91, label: '2-5/8"' },
  { od: 79.38, id: 77.61, label: '3-1/8"' },
  { od: 92.08, id: 90.31, label: '3-5/8"' },
  { od: 104.78, id: 103.01, label: '4-1/8"' }
];

// Enhanced thermodynamic property calculations
class RefrigerantProperties {
  static getSaturationPressure(refrigerant: any, tempC: number): number {
    // Antoine equation: log10(P_sat) = A - B/(C + T)
    const logP = refrigerant.antoine_A - refrigerant.antoine_B / (refrigerant.antoine_C + tempC);
    return Math.pow(10, logP); // kPa
  }

  static getSaturationTemperature(refrigerant: any, pressureKPa: number): number {
    // Inverse Antoine equation: T = B/(A - log10(P)) - C
    if (pressureKPa <= 0) return -273.15;
    const logP = Math.log10(pressureKPa);
    return refrigerant.antoine_B / (refrigerant.antoine_A - logP) - refrigerant.antoine_C;
  }

  static getLiquidDensity(refrigerant: any, tempC: number): number {
    // Simplified temperature correlation for liquid density
    const refTemp = 25; // Reference temperature for density
    const tempCorrection = 1 - 0.002 * (tempC - refTemp); // Approximate 0.2%/°C decrease
    return refrigerant.ref_density_liquid_25C * tempCorrection;
  }

  static getVaporDensity(refrigerant: any, tempC: number, pressureKPa: number): number {
    // Ideal gas approximation adjusted for real gas behavior
    const refTemp = 5; // Reference temperature
    const refPressure = this.getSaturationPressure(refrigerant, refTemp);
    
    // Temperature and pressure correction
    const tempRatio = (273.15 + refTemp) / (273.15 + tempC);
    const pressureRatio = pressureKPa / refPressure;
    
    return refrigerant.ref_density_vapor_5C * tempRatio * pressureRatio;
  }

  static getLiquidViscosity(refrigerant: any, tempC: number): number {
    // Exponential temperature dependence for liquid viscosity
    const tempK = tempC + 273.15;
    const refTempK = 25 + 273.15;
    const tempRatio = refTempK / tempK;
    return refrigerant.ref_viscosity_liquid * Math.pow(tempRatio, 1.5);
  }

  static getVaporViscosity(refrigerant: any, tempC: number): number {
    // Power law temperature dependence for vapor viscosity
    const tempK = tempC + 273.15;
    const refTempK = 5 + 273.15;
    const tempRatio = tempK / refTempK;
    return refrigerant.ref_viscosity_vapor * Math.pow(tempRatio, 0.7);
  }

  static calculateMassFlowRate(refrigerant: any, capacityKW: number, evapTempC: number, superheatK: number = 5): number {
    // More accurate mass flow calculation using enthalpy difference
    const h_evap_in = refrigerant.typical_h_evap_in; // kJ/kg
    const h_evap_out = refrigerant.typical_h_evap_out + superheatK * 0.5; // Approximate superheat effect
    
    const enthalpy_diff = h_evap_out - h_evap_in; // kJ/kg
    return (capacityKW * 1000) / (enthalpy_diff * 1000); // kg/s
  }
}

// Main combined component
const RefrigerantPipeCalculator: React.FC<RefrigerantPipeCalculatorProps> = ({ onShowTutorial }) => {
  const [activeTab, setActiveTab] = useState<'suction' | 'liquid' | 'discharge'>('suction');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Refrigerant Pipe Sizing Calculator</h2>
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

      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'suction'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('suction')}
        >
          Suction Line
        </button>
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'liquid'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('liquid')}
        >
          Liquid Line
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'discharge'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('discharge')}
        >
          Discharge Line
        </button>
      </div>
      
      {/* Content Based on Active Tab */}
      {activeTab === 'suction' ? (
        <SuctionLineSizing onShowTutorial={onShowTutorial} />
      ) : activeTab === 'liquid' ? (
        <LiquidLineSizing onShowTutorial={onShowTutorial} />
      ) : (
        <DischargeLineSizing onShowTutorial={onShowTutorial} />
      )}
    </div>
  );
};

// ======================== SUCTION LINE SIZING ========================
const SuctionLineSizing: React.FC<SuctionLineSizingProps> = ({ onShowTutorial }) => {
  // Input states
  const [refrigerantType, setRefrigerantType] = useState<string>('R410A');
  const [systemCapacity, setSystemCapacity] = useState<number>(10); // kW
  const [evaporatingTemp, setEvaporatingTemp] = useState<number>(5); // °C
  const [superheat, setSuperheat] = useState<number>(5); // K
  const [pipeLength, setPipeLength] = useState<number>(15); // meters
  const [verticalRise, setVerticalRise] = useState<number>(0); // meters
  const [equivalentLength, setEquivalentLength] = useState<number>(5); // meters
  const [maxTempDrop, setMaxTempDrop] = useState<number>(0.5); // °C
  const [maxVelocity, setMaxVelocity] = useState<number>(20); // m/s
  const [minVelocity, setMinVelocity] = useState<number>(7); // m/s for oil return
  
  // Calculation states
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [massFlowRate, setMassFlowRate] = useState<number>(0);
  const [volumetricFlowRate, setVolumetricFlowRate] = useState<number>(0);
  const [recommendedPipeSize, setRecommendedPipeSize] = useState<any>(null);
  const [pipeResults, setPipeResults] = useState<any[]>([]);
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<any>(null);
  const [suctionPressure, setSuctionPressure] = useState<number>(0);
  const [suctionTemp, setSuctionTemp] = useState<number>(0);

  // Get refrigerant properties
  useEffect(() => {
    const refrigerant = REFRIGERANT_TYPES.find(r => r.value === refrigerantType);
    setSelectedRefrigerant(refrigerant);
    
    if (refrigerant) {
      // Calculate suction conditions
      const satPressure = RefrigerantProperties.getSaturationPressure(refrigerant, evaporatingTemp);
      const actualSuctionTemp = evaporatingTemp + superheat;
      
      setSuctionPressure(satPressure);
      setSuctionTemp(actualSuctionTemp);
    }
  }, [refrigerantType, evaporatingTemp, superheat]);

  const performCalculation = () => {
    if (!selectedRefrigerant) return;

    // Calculate mass flow rate using improved method
    const massFlow = RefrigerantProperties.calculateMassFlowRate(
      selectedRefrigerant, 
      systemCapacity, 
      evaporatingTemp, 
      superheat
    );
    setMassFlowRate(massFlow);

    // Get suction vapor properties at actual conditions
    const vaporDensity = RefrigerantProperties.getVaporDensity(
      selectedRefrigerant, 
      suctionTemp, 
      suctionPressure
    );
    const vaporViscosity = RefrigerantProperties.getVaporViscosity(
      selectedRefrigerant, 
      suctionTemp
    );

    // Calculate volumetric flow rate
    const volumetricFlow = massFlow / vaporDensity; // m³/s
    setVolumetricFlowRate(volumetricFlow);

    // Calculate results for each pipe size
    const results = PIPE_SIZES.map(pipe => {
      const area = Math.PI * Math.pow(pipe.id / 2000, 2); // m²
      const velocity = volumetricFlow / area; // m/s
      
      // Calculate pressure drop using Darcy-Weisbach equation
      const reynolds = (vaporDensity * velocity * (pipe.id / 1000)) / vaporViscosity;
      const frictionFactor = reynolds > 2300 ? 0.316 / Math.pow(reynolds, 0.25) : 64 / reynolds;
      const totalLength = pipeLength + equivalentLength;
      
      // Friction pressure drop
      const frictionDropPa = frictionFactor * (totalLength / (pipe.id / 1000)) * 
                           (vaporDensity * Math.pow(velocity, 2) / 2);
      
      // Static pressure drop for vertical rise (vapor column)
      const staticDropPa = vaporDensity * 9.81 * verticalRise;
      
      // Total pressure drop
      const totalPressureDropPa = frictionDropPa + staticDropPa;
      const totalPressureDropKPa = totalPressureDropPa / 1000;
      
      // Calculate equivalent temperature drop using actual saturation curve
      const pressureAtExit = suctionPressure - totalPressureDropKPa;
      const satTempAtExit = RefrigerantProperties.getSaturationTemperature(
        selectedRefrigerant, 
        pressureAtExit
      );
      const tempDropEquivalent = evaporatingTemp - satTempAtExit;
      
      // Check criteria
      const isVelocityOK = velocity <= maxVelocity && velocity >= minVelocity;
      const isTempDropOK = tempDropEquivalent <= maxTempDrop;
      const isAcceptable = isVelocityOK && isTempDropOK;

      return {
        pipeSize: pipe,
        velocity,
        frictionDropPa,
        staticDropPa,
        totalPressureDropPa,
        totalPressureDropKPa,
        tempDropEquivalent,
        pressureAtExit,
        satTempAtExit,
        reynolds,
        frictionFactor,
        vaporDensity,
        isVelocityOK,
        isTempDropOK,
        isAcceptable,
        velocityTooHigh: velocity > maxVelocity,
        velocityTooLow: velocity < minVelocity
      };
    });

    setPipeResults(results);

    // Find recommended pipe size (smallest acceptable size)
    const acceptableSizes = results.filter(r => r.isAcceptable);
    if (acceptableSizes.length > 0) {
      setRecommendedPipeSize(acceptableSizes[0]);
    } else {
      setRecommendedPipeSize(null);
    }

    setCalculationPerformed(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Suction Line Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refrigerant Type
          </label>
          <select
            value={refrigerantType}
            onChange={(e) => setRefrigerantType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {REFRIGERANT_TYPES.map(ref => (
              <option key={ref.value} value={ref.value}>{ref.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Capacity (kW)
            </label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={systemCapacity}
              onChange={(e) => setSystemCapacity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Evaporating Temp (°C)
            </label>
            <input
              type="number"
              value={evaporatingTemp}
              onChange={(e) => setEvaporatingTemp(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Superheat (K)
            </label>
            <input
              type="number"
              min="0"
              value={superheat}
              onChange={(e) => setSuperheat(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Typical: 5-10K</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Length (m)
            </label>
            <input
              type="number"
              min="1"
              value={pipeLength}
              onChange={(e) => setPipeLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vertical Rise (m)
            </label>
            <input
              type="number"
              min="0"
              value={verticalRise}
              onChange={(e) => setVerticalRise(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Height to overcome</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equivalent Length (m)
            </label>
            <input
              type="number"
              min="0"
              value={equivalentLength}
              onChange={(e) => setEquivalentLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Fittings & bends</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Temp Drop (°C)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={maxTempDrop}
              onChange={(e) => setMaxTempDrop(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">ASHRAE: 0.5°C max</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Velocity (m/s)
            </label>
            <input
              type="number"
              min="1"
              value={maxVelocity}
              onChange={(e) => setMaxVelocity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">ASHRAE: 15-20 m/s</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Velocity (m/s)
          </label>
          <input
            type="number"
            min="1"
            value={minVelocity}
            onChange={(e) => setMinVelocity(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Oil return: 7+ m/s for risers</p>
        </div>

        {selectedRefrigerant && (
          <div className="mt-4 p-2 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-blue-700">Calculated Conditions:</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <p className="text-gray-700">Suction Pressure:</p>
                <p className="font-medium">{suctionPressure.toFixed(1)} kPa</p>
              </div>
              <div>
                <p className="text-gray-700">Suction Temperature:</p>
                <p className="font-medium">{suctionTemp.toFixed(1)} °C</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={performCalculation}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Calculate Suction Line
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!calculationPerformed ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter system parameters and click Calculate</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">System Flow Rates</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Mass Flow Rate</p>
                    <p className="font-semibold text-gray-800">{massFlowRate.toFixed(3)} kg/s</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Volumetric Flow Rate</p>
                    <p className="font-semibold text-gray-800">{(volumetricFlowRate * 1000).toFixed(2)} L/s</p>
                  </div>
                </div>
              </div>
            </div>

            {recommendedPipeSize ? (
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Recommended Pipe Size</h4>
                <div className="bg-green-100 border border-green-300 p-3 rounded-md">
                  <p className="font-bold text-green-700">
                    {recommendedPipeSize.pipeSize.label} 
                    ({recommendedPipeSize.pipeSize.od} mm OD)
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-gray-700">Velocity:</p>
                      <p className="font-medium">{recommendedPipeSize.velocity.toFixed(2)} m/s</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Temp Drop:</p>
                      <p className="font-medium">{recommendedPipeSize.tempDropEquivalent.toFixed(2)} °C</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Pressure Drop:</p>
                      <p className="font-medium">{recommendedPipeSize.totalPressureDropKPa.toFixed(1)} kPa</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Exit Pressure:</p>
                      <p className="font-medium">{recommendedPipeSize.pressureAtExit.toFixed(1)} kPa</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="bg-red-100 border border-red-300 p-3 rounded-md">
                  <p className="font-bold text-red-700">No suitable pipe size found</p>
                  <p className="text-sm text-red-600">Check velocity limits and temperature drop requirements</p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Detailed Analysis</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Pipe Size</th>
                      <th className="px-3 py-2 text-right">Velocity (m/s)</th>
                      <th className="px-3 py-2 text-right">ΔP (kPa)</th>
                      <th className="px-3 py-2 text-right">ΔT (°C)</th>
                      <th className="px-3 py-2 text-center">Oil Return</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeResults.map((result, index) => (
                      <tr key={index} className={`border-t border-gray-200 ${result.isAcceptable ? 'bg-green-50' : ''}`}>
                        <td className="px-3 py-2 font-medium">
                          {result.pipeSize.label}
                          <br />
                          <span className="text-xs text-gray-500">
                            {result.pipeSize.od} mm OD
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right ${
                          result.velocityTooHigh ? 'text-red-600 font-medium' : 
                          result.velocityTooLow ? 'text-orange-600 font-medium' : ''
                        }`}>
                          {result.velocity.toFixed(2)}
                          {result.velocityTooHigh && <><br /><span className="text-xs">Too High</span></>}
                          {result.velocityTooLow && <><br /><span className="text-xs">Too Low</span></>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {result.totalPressureDropKPa.toFixed(1)}
                        </td>
                        <td className={`px-3 py-2 text-right ${!result.isTempDropOK ? 'text-red-600 font-medium' : ''}`}>
                          {result.tempDropEquivalent.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {result.velocity >= minVelocity ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {result.isAcceptable ? (
                            <span className="text-green-600 font-medium">✓ OK</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗ Fail</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">ASHRAE/CIBSE Design Guidelines</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Velocity Range:</strong> 7-20 m/s (min for oil return, max for noise/erosion)</li>
                <li><strong>Temperature Drop:</strong> Max 0.5°C to maintain system capacity</li>
                <li><strong>Oil Return:</strong> Minimum 7 m/s in vertical risers, consider double risers for long runs</li>
                <li><strong>Pressure Drop:</strong> Calculated using actual saturation curve, not fixed factors</li>
                <li><strong>Properties:</strong> Based on actual suction temperature and superheat conditions</li>
                <li><strong>Part Load:</strong> Check minimum velocities at reduced capacity for oil return</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== LIQUID LINE SIZING ========================
const LiquidLineSizing: React.FC<LiquidLineSizingProps> = ({ onShowTutorial }) => {
  // Input states
  const [refrigerantType, setRefrigerantType] = useState<string>('R410A');
  const [systemCapacity, setSystemCapacity] = useState<number>(10); // kW
  const [condensingTemp, setCondensingTemp] = useState<number>(40); // °C
  const [evaporatingTemp, setEvaporatingTemp] = useState<number>(5); // °C
  const [subcooling, setSubcooling] = useState<number>(5); // K
  const [pipeLength, setPipeLength] = useState<number>(15); // meters
  const [verticalRise, setVerticalRise] = useState<number>(0); // meters
  const [equivalentLength, setEquivalentLength] = useState<number>(5); // meters
  const [maxVelocity, setMaxVelocity] = useState<number>(1.5); // m/s (ASHRAE recommendation)
  
  // Calculation states
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [massFlowRate, setMassFlowRate] = useState<number>(0);
  const [volumetricFlowRate, setVolumetricFlowRate] = useState<number>(0);
  const [recommendedPipeSize, setRecommendedPipeSize] = useState<any>(null);
  const [pipeResults, setPipeResults] = useState<any[]>([]);
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<any>(null);
  const [liquidTemp, setLiquidTemp] = useState<number>(0);
  const [availableSubcooling, setAvailableSubcooling] = useState<number>(0);

  // Get refrigerant properties
  useEffect(() => {
    const refrigerant = REFRIGERANT_TYPES.find(r => r.value === refrigerantType);
    setSelectedRefrigerant(refrigerant);
    
    if (refrigerant) {
      // Calculate liquid temperature (condensing temp - subcooling)
      const liquidTemperature = condensingTemp - subcooling;
      setLiquidTemp(liquidTemperature);
      setAvailableSubcooling(subcooling);
    }
  }, [refrigerantType, condensingTemp, subcooling]);

  const performCalculation = () => {
    if (!selectedRefrigerant) return;

    // Calculate mass flow rate using improved method
    const massFlow = RefrigerantProperties.calculateMassFlowRate(
      selectedRefrigerant, 
      systemCapacity, 
      evaporatingTemp
    );
    setMassFlowRate(massFlow);

    // Get liquid properties at actual conditions
    const liquidDensity = RefrigerantProperties.getLiquidDensity(
      selectedRefrigerant, 
      liquidTemp
    );
    const liquidViscosity = RefrigerantProperties.getLiquidViscosity(
      selectedRefrigerant, 
      liquidTemp
    );

    // Calculate volumetric flow rate for liquid
    const volumetricFlow = massFlow / liquidDensity; // m³/s
    setVolumetricFlowRate(volumetricFlow);

    // Get saturation pressure at evaporating temperature (TXV inlet pressure requirement)
    const evapSatPressure = RefrigerantProperties.getSaturationPressure(
      selectedRefrigerant, 
      evaporatingTemp
    );

    // Calculate results for each pipe size
    const results = PIPE_SIZES.map(pipe => {
      const area = Math.PI * Math.pow(pipe.id / 2000, 2); // m²
      const velocity = volumetricFlow / area; // m/s
      
      // Calculate pressure drop using Darcy-Weisbach equation
      const reynolds = (liquidDensity * velocity * (pipe.id / 1000)) / liquidViscosity;
      const frictionFactor = reynolds > 2300 ? 0.316 / Math.pow(reynolds, 0.25) : 64 / reynolds;
      const totalLength = pipeLength + equivalentLength;
      
      // Friction pressure drop
      const frictionDropPa = frictionFactor * (totalLength / (pipe.id / 1000)) * 
                           (liquidDensity * Math.pow(velocity, 2) / 2);
      
      // Static pressure drop (vertical rise)
      const staticDropPa = liquidDensity * 9.81 * verticalRise;
      
      // Total pressure drop
      const totalPressureDropPa = frictionDropPa + staticDropPa;
      const totalPressureDropKPa = totalPressureDropPa / 1000;
      
      // Calculate subcooling required to prevent flashing
      const liquidSatPressure = RefrigerantProperties.getSaturationPressure(
        selectedRefrigerant, 
        liquidTemp
      );
      const pressureAtTXV = liquidSatPressure - totalPressureDropKPa;
      const satTempAtTXV = RefrigerantProperties.getSaturationTemperature(
        selectedRefrigerant, 
        pressureAtTXV
      );
      const requiredSubcooling = liquidTemp - satTempAtTXV;
      
      // Check for flashing (pressure at TXV must be above evap pressure for proper operation)
      const noFlashing = pressureAtTXV > evapSatPressure && requiredSubcooling <= availableSubcooling;
      
      // Check criteria
      const isVelocityOK = velocity <= maxVelocity;
      const isAcceptable = isVelocityOK && noFlashing;

      return {
        pipeSize: pipe,
        velocity,
        frictionDropPa,
        staticDropPa,
        totalPressureDropPa,
        totalPressureDropKPa,
        liquidSatPressure,
        pressureAtTXV,
        satTempAtTXV,
        requiredSubcooling,
        reynolds,
        frictionFactor,
        liquidDensity,
        isVelocityOK,
        noFlashing,
        isAcceptable
      };
    });

    setPipeResults(results);

    // Find recommended pipe size (smallest acceptable size)
    const acceptableSizes = results.filter(r => r.isAcceptable);
    if (acceptableSizes.length > 0) {
      setRecommendedPipeSize(acceptableSizes[0]);
    } else {
      setRecommendedPipeSize(null);
    }

    setCalculationPerformed(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Liquid Line Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refrigerant Type
          </label>
          <select
            value={refrigerantType}
            onChange={(e) => setRefrigerantType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {REFRIGERANT_TYPES.map(ref => (
              <option key={ref.value} value={ref.value}>{ref.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Capacity (kW)
            </label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={systemCapacity}
              onChange={(e) => setSystemCapacity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condensing Temp (°C)
            </label>
            <input
              type="number"
              value={condensingTemp}
              onChange={(e) => setCondensingTemp(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Evaporating Temp (°C)
            </label>
            <input
              type="number"
              value={evaporatingTemp}
              onChange={(e) => setEvaporatingTemp(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcooling (K)
            </label>
            <input
              type="number"
              min="0"
              value={subcooling}
              onChange={(e) => setSubcooling(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Available at condenser</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Length (m)
            </label>
            <input
              type="number"
              min="1"
              value={pipeLength}
              onChange={(e) => setPipeLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vertical Rise (m)
            </label>
            <input
              type="number"
              min="0"
              value={verticalRise}
              onChange={(e) => setVerticalRise(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Height difference</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equivalent Length (m)
            </label>
            <input
              type="number"
              min="0"
              value={equivalentLength}
              onChange={(e) => setEquivalentLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Fittings & bends</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Velocity (m/s)
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={maxVelocity}
              onChange={(e) => setMaxVelocity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">ASHRAE: 0.5-1.5 m/s</p>
          </div>
        </div>

        {selectedRefrigerant && (
          <div className="mt-4 p-2 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-blue-700">Calculated Conditions:</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <p className="text-gray-700">Liquid Temperature:</p>
                <p className="font-medium">{liquidTemp.toFixed(1)} °C</p>
              </div>
              <div>
                <p className="text-gray-700">Available Subcooling:</p>
                <p className="font-medium">{availableSubcooling.toFixed(1)} K</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={performCalculation}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Calculate Liquid Line
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!calculationPerformed ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter system parameters and click Calculate</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">System Flow Rates</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Mass Flow Rate</p>
                    <p className="font-semibold text-gray-800">{massFlowRate.toFixed(3)} kg/s</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Volumetric Flow Rate</p>
                    <p className="font-semibold text-gray-800">{(volumetricFlowRate * 1000000).toFixed(2)} mL/s</p>
                  </div>
                </div>
              </div>
            </div>

            {recommendedPipeSize ? (
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Recommended Pipe Size</h4>
                <div className="bg-green-100 border border-green-300 p-3 rounded-md">
                  <p className="font-bold text-green-700">
                    {recommendedPipeSize.pipeSize.label} 
                    ({recommendedPipeSize.pipeSize.od} mm OD)
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-gray-700">Velocity:</p>
                      <p className="font-medium">{recommendedPipeSize.velocity.toFixed(2)} m/s</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Pressure Drop:</p>
                      <p className="font-medium">{recommendedPipeSize.totalPressureDropKPa.toFixed(1)} kPa</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Required Subcooling:</p>
                      <p className="font-medium">{recommendedPipeSize.requiredSubcooling.toFixed(1)} K</p>
                    </div>
                    <div>
                      <p className="text-gray-700">TXV Pressure:</p>
                      <p className="font-medium">{recommendedPipeSize.pressureAtTXV.toFixed(1)} kPa</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="bg-red-100 border border-red-300 p-3 rounded-md">
                  <p className="font-bold text-red-700">No suitable pipe size found</p>
                  <p className="text-sm text-red-600">Check velocity limits and subcooling requirements</p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Detailed Analysis</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Pipe Size</th>
                      <th className="px-3 py-2 text-right">Velocity (m/s)</th>
                      <th className="px-3 py-2 text-right">ΔP (kPa)</th>
                      <th className="px-3 py-2 text-right">Req. Subcool (K)</th>
                      <th className="px-3 py-2 text-center">No Flash</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeResults.map((result, index) => (
                      <tr key={index} className={`border-t border-gray-200 ${result.isAcceptable ? 'bg-green-50' : ''}`}>
                        <td className="px-3 py-2 font-medium">
                          {result.pipeSize.label}
                          <br />
                          <span className="text-xs text-gray-500">
                            {result.pipeSize.od} mm OD
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right ${!result.isVelocityOK ? 'text-red-600 font-medium' : ''}`}>
                          {result.velocity.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {result.totalPressureDropKPa.toFixed(1)}
                        </td>
                        <td className={`px-3 py-2 text-right ${result.requiredSubcooling > availableSubcooling ? 'text-red-600 font-medium' : ''}`}>
                          {result.requiredSubcooling.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {result.noFlashing ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {result.isAcceptable ? (
                            <span className="text-green-600 font-medium">✓ OK</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗ Fail</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">ASHRAE/CIBSE Design Guidelines</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Velocity Range:</strong> 0.5-1.5 m/s to minimize noise and flashing risk</li>
                <li><strong>Flashing Prevention:</strong> Ensure adequate subcooling at TXV inlet</li>
                <li><strong>Subcooling Analysis:</strong> Required subcooling calculated from actual pressure drop</li>
                <li><strong>Properties:</strong> Liquid density and viscosity adjusted for actual temperature</li>
                <li><strong>Filter Drier:</strong> Include in pressure drop calculations (typically 10-20 kPa)</li>
                <li><strong>Sight Glass:</strong> Install before TXV to verify liquid state</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== DISCHARGE LINE SIZING ========================
const DischargeLineSizing: React.FC<DischargeLineSizingProps> = ({ onShowTutorial }) => {
  // Input states
  const [refrigerantType, setRefrigerantType] = useState<string>('R410A');
  const [systemCapacity, setSystemCapacity] = useState<number>(10); // kW
  const [dischargeTemp, setDischargeTemp] = useState<number>(80); // °C
  const [condensingTemp, setCondensingTemp] = useState<number>(40); // °C
  const [evaporatingTemp, setEvaporatingTemp] = useState<number>(5); // °C
  const [pipeLength, setPipeLength] = useState<number>(5); // meters (typically short)
  const [verticalRise, setVerticalRise] = useState<number>(0); // meters
  const [equivalentLength, setEquivalentLength] = useState<number>(2); // meters
  const [maxVelocity, setMaxVelocity] = useState<number>(25); // m/s
  const [minVelocity, setMinVelocity] = useState<number>(7); // m/s for oil return
  
  // Calculation states
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [massFlowRate, setMassFlowRate] = useState<number>(0);
  const [volumetricFlowRate, setVolumetricFlowRate] = useState<number>(0);
  const [recommendedPipeSize, setRecommendedPipeSize] = useState<any>(null);
  const [pipeResults, setPipeResults] = useState<any[]>([]);
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<any>(null);
  const [dischargePressure, setDischargePressure] = useState<number>(0);

  // Get refrigerant properties
  useEffect(() => {
    const refrigerant = REFRIGERANT_TYPES.find(r => r.value === refrigerantType);
    setSelectedRefrigerant(refrigerant);
    
    if (refrigerant) {
      // Calculate discharge pressure (approximately condensing pressure)
      const dischPress = RefrigerantProperties.getSaturationPressure(refrigerant, condensingTemp);
      setDischargePressure(dischPress);
    }
  }, [refrigerantType, condensingTemp]);

  const performCalculation = () => {
    if (!selectedRefrigerant) return;

    // Calculate mass flow rate using improved method
    const massFlow = RefrigerantProperties.calculateMassFlowRate(
      selectedRefrigerant, 
      systemCapacity, 
      evaporatingTemp
    );
    setMassFlowRate(massFlow);

    // Get discharge vapor properties at actual conditions
    const dischargeDensity = RefrigerantProperties.getVaporDensity(
      selectedRefrigerant, 
      dischargeTemp, 
      dischargePressure
    );
    const dischargeViscosity = RefrigerantProperties.getVaporViscosity(
      selectedRefrigerant, 
      dischargeTemp
    );

    // Calculate volumetric flow rate for discharge vapor
    const volumetricFlow = massFlow / dischargeDensity; // m³/s
    setVolumetricFlowRate(volumetricFlow);

    // Calculate results for each pipe size
    const results = PIPE_SIZES.map(pipe => {
      const area = Math.PI * Math.pow(pipe.id / 2000, 2); // m²
      const velocity = volumetricFlow / area; // m/s
      
      // Calculate pressure drop using Darcy-Weisbach equation
      const reynolds = (dischargeDensity * velocity * (pipe.id / 1000)) / dischargeViscosity;
      const frictionFactor = reynolds > 2300 ? 0.316 / Math.pow(reynolds, 0.25) : 64 / reynolds;
      const totalLength = pipeLength + equivalentLength;
      
      // Friction pressure drop
      const frictionDropPa = frictionFactor * (totalLength / (pipe.id / 1000)) * 
                           (dischargeDensity * Math.pow(velocity, 2) / 2);
      
      // Static pressure drop for vertical rise (vapor column)
      const staticDropPa = dischargeDensity * 9.81 * verticalRise;
      
      // Total pressure drop
      const totalPressureDropPa = frictionDropPa + staticDropPa;
      const totalPressureDropKPa = totalPressureDropPa / 1000;
      
      // Check criteria
      const isVelocityOK = velocity <= maxVelocity && velocity >= minVelocity;
      const isAcceptable = isVelocityOK;

      return {
        pipeSize: pipe,
        velocity,
        frictionDropPa,
        staticDropPa,
        totalPressureDropPa,
        totalPressureDropKPa,
        reynolds,
        frictionFactor,
        dischargeDensity,
        isVelocityOK,
        isAcceptable,
        velocityTooHigh: velocity > maxVelocity,
        velocityTooLow: velocity < minVelocity
      };
    });

    setPipeResults(results);

    // Find recommended pipe size (smallest acceptable size)
    const acceptableSizes = results.filter(r => r.isAcceptable);
    if (acceptableSizes.length > 0) {
      setRecommendedPipeSize(acceptableSizes[0]);
    } else {
      setRecommendedPipeSize(null);
    }

    setCalculationPerformed(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Discharge Line Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refrigerant Type
          </label>
          <select
            value={refrigerantType}
            onChange={(e) => setRefrigerantType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {REFRIGERANT_TYPES.map(ref => (
              <option key={ref.value} value={ref.value}>{ref.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Capacity (kW)
            </label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={systemCapacity}
              onChange={(e) => setSystemCapacity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discharge Temp (°C)
            </label>
            <input
              type="number"
              value={dischargeTemp}
              onChange={(e) => setDischargeTemp(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condensing Temp (°C)
            </label>
            <input
              type="number"
              value={condensingTemp}
              onChange={(e) => setCondensingTemp(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Evaporating Temp (°C)
            </label>
            <input
              type="number"
              value={evaporatingTemp}
              onChange={(e) => setEvaporatingTemp(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Length (m)
            </label>
            <input
              type="number"
              min="1"
              value={pipeLength}
              onChange={(e) => setPipeLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Keep as short as possible</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vertical Rise (m)
            </label>
            <input
              type="number"
              min="0"
              value={verticalRise}
              onChange={(e) => setVerticalRise(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equivalent Length (m)
            </label>
            <input
              type="number"
              min="0"
              value={equivalentLength}
              onChange={(e) => setEquivalentLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Fittings & bends</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Velocity (m/s)
            </label>
            <input
              type="number"
              min="1"
              value={maxVelocity}
              onChange={(e) => setMaxVelocity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">ASHRAE: up to 25 m/s</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Velocity (m/s)
          </label>
          <input
            type="number"
            min="1"
            value={minVelocity}
            onChange={(e) => setMinVelocity(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Oil return: 7+ m/s</p>
        </div>

        {selectedRefrigerant && (
          <div className="mt-4 p-2 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-blue-700">Calculated Conditions:</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <p className="text-gray-700">Discharge Pressure:</p>
                <p className="font-medium">{dischargePressure.toFixed(1)} kPa</p>
              </div>
              <div>
                <p className="text-gray-700">Discharge Temperature:</p>
                <p className="font-medium">{dischargeTemp.toFixed(1)} °C</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={performCalculation}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Calculate Discharge Line
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!calculationPerformed ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter system parameters and click Calculate</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">System Flow Rates</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Mass Flow Rate</p>
                    <p className="font-semibold text-gray-800">{massFlowRate.toFixed(3)} kg/s</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Volumetric Flow Rate</p>
                    <p className="font-semibold text-gray-800">{(volumetricFlowRate * 1000).toFixed(2)} L/s</p>
                  </div>
                </div>
              </div>
            </div>

            {recommendedPipeSize ? (
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Recommended Pipe Size</h4>
                <div className="bg-green-100 border border-green-300 p-3 rounded-md">
                  <p className="font-bold text-green-700">
                    {recommendedPipeSize.pipeSize.label} 
                    ({recommendedPipeSize.pipeSize.od} mm OD)
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-gray-700">Velocity:</p>
                      <p className="font-medium">{recommendedPipeSize.velocity.toFixed(2)} m/s</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Pressure Drop:</p>
                      <p className="font-medium">{recommendedPipeSize.totalPressureDropKPa.toFixed(1)} kPa</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Reynolds Number:</p>
                      <p className="font-medium">{recommendedPipeSize.reynolds.toExponential(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-700">Vapor Density:</p>
                      <p className="font-medium">{recommendedPipeSize.dischargeDensity.toFixed(2)} kg/m³</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="bg-red-100 border border-red-300 p-3 rounded-md">
                  <p className="font-bold text-red-700">No suitable pipe size found</p>
                  <p className="text-sm text-red-600">Check velocity limits for given conditions</p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Detailed Analysis</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Pipe Size</th>
                      <th className="px-3 py-2 text-right">Velocity (m/s)</th>
                      <th className="px-3 py-2 text-right">ΔP (kPa)</th>
                      <th className="px-3 py-2 text-right">Reynolds</th>
                      <th className="px-3 py-2 text-center">Oil Return</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeResults.map((result, index) => (
                      <tr key={index} className={`border-t border-gray-200 ${result.isAcceptable ? 'bg-green-50' : ''}`}>
                        <td className="px-3 py-2 font-medium">
                          {result.pipeSize.label}
                          <br />
                          <span className="text-xs text-gray-500">
                            {result.pipeSize.od} mm OD
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right ${
                          result.velocityTooHigh ? 'text-red-600 font-medium' : 
                          result.velocityTooLow ? 'text-orange-600 font-medium' : ''
                        }`}>
                          {result.velocity.toFixed(2)}
                          {result.velocityTooHigh && <><br /><span className="text-xs">Too High</span></>}
                          {result.velocityTooLow && <><br /><span className="text-xs">Too Low</span></>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {result.totalPressureDropKPa.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {result.reynolds.toExponential(1)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {result.velocity >= minVelocity ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {result.isAcceptable ? (
                            <span className="text-green-600 font-medium">✓ OK</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗ Fail</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">ASHRAE/CIBSE Design Guidelines</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Velocity Range:</strong> 7-25 m/s (min for oil return, max for erosion/noise)</li>
                <li><strong>Line Length:</strong> Keep as short as possible to minimize heat loss</li>
                <li><strong>Properties:</strong> Based on actual discharge temperature and pressure</li>
                <li><strong>Oil Return:</strong> Minimum velocity critical for oil entrainment back to compressor</li>
                <li><strong>Insulation:</strong> Essential to maintain gas temperature and prevent condensation</li>
                <li><strong>Supports:</strong> Account for thermal expansion in hot gas lines</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RefrigerantPipeCalculator;