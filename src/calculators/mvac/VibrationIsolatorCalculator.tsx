import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface VibrationIsolatorCalculatorProps {
  onShowTutorial?: () => void;
}

interface IsolatorSizingProps {
  onShowTutorial?: () => void;
}

interface TransmissionAnalysisProps {
  onShowTutorial?: () => void;
}

// Equipment types with typical characteristics
const EQUIPMENT_TYPES = [
  { value: 'centrifugal_fan', label: 'Centrifugal Fan', typicalRPM: 1200, dampingRatio: 0.05 },
  { value: 'axial_fan', label: 'Axial Fan', typicalRPM: 1800, dampingRatio: 0.05 },
  { value: 'centrifugal_chiller', label: 'Centrifugal Chiller', typicalRPM: 3600, dampingRatio: 0.08 },
  { value: 'screw_chiller', label: 'Screw Chiller', typicalRPM: 2400, dampingRatio: 0.06 },
  { value: 'centrifugal_pump', label: 'Centrifugal Pump', typicalRPM: 1800, dampingRatio: 0.04 },
  { value: 'cooling_tower', label: 'Cooling Tower', typicalRPM: 900, dampingRatio: 0.06 },
  { value: 'ahu', label: 'Air Handling Unit', typicalRPM: 1200, dampingRatio: 0.05 },
  { value: 'compressor', label: 'Reciprocating Compressor', typicalRPM: 1200, dampingRatio: 0.10 },
  { value: 'custom', label: 'Custom Equipment', typicalRPM: 1500, dampingRatio: 0.05 }
];

// Isolator types with characteristics
const ISOLATOR_TYPES = [
  { 
    value: 'spring', 
    label: 'Steel Spring Isolator', 
    minDeflection: 25, // mm
    maxDeflection: 150, // mm
    dampingRatio: 0.02,
    description: 'Low natural frequency, minimal creep'
  },
  { 
    value: 'rubber', 
    label: 'Rubber/Neoprene Isolator', 
    minDeflection: 2, // mm
    maxDeflection: 12, // mm
    dampingRatio: 0.15,
    description: 'Compact, integral damping'
  },
  { 
    value: 'air_spring', 
    label: 'Air Spring Isolator', 
    minDeflection: 100, // mm
    maxDeflection: 250, // mm
    dampingRatio: 0.05,
    description: 'Very low natural frequency, adjustable'
  },
  { 
    value: 'composite', 
    label: 'Spring-Rubber Composite', 
    minDeflection: 15, // mm
    maxDeflection: 75, // mm
    dampingRatio: 0.08,
    description: 'Combines spring and rubber benefits'
  }
];

// Main combined component with tabs
const VibrationIsolatorCalculator: React.FC<VibrationIsolatorCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Vibration Isolator Calculator',
    discipline: 'mvac',
    calculatorType: 'vibrationIsolator'
  });

  const [activeTab, setActiveTab] = useState<'sizing' | 'transmission'>('sizing');

  return (
    <CalculatorWrapper
      title="Vibration Isolator Calculator"
      discipline="mvac"
      calculatorType="vibrationIsolator"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">

      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'sizing'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('sizing')}
        >
          Isolator Sizing
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'transmission'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('transmission')}
        >
          Transmission Analysis
        </button>
      </div>
      
      {/* Content Based on Active Tab */}
      {activeTab === 'sizing' ? (
        <IsolatorSizingCalculator onShowTutorial={onShowTutorial} />
      ) : (
        <TransmissionAnalysisCalculator onShowTutorial={onShowTutorial} />
      )}
        </div>
      </div>
    </CalculatorWrapper>
  );
};

// ======================== ISOLATOR SIZING CALCULATOR ========================

const IsolatorSizingCalculator: React.FC<IsolatorSizingProps> = ({ onShowTutorial }) => {
  // Equipment specifications
  const [equipmentType, setEquipmentType] = useState<string>('centrifugal_fan');
  const [equipmentWeight, setEquipmentWeight] = useState<number>(500); // kg
  const [operatingRPM, setOperatingRPM] = useState<number>(1200);
  const [numberOfIsolators, setNumberOfIsolators] = useState<number>(4);
  const [desiredEfficiency, setDesiredEfficiency] = useState<number>(90); // %
  
  // Isolator specifications
  const [isolatorType, setIsolatorType] = useState<string>('spring');
  const [customDampingRatio, setCustomDampingRatio] = useState<number>(
    EQUIPMENT_TYPES.find(eq => eq.value === 'centrifugal_fan')?.dampingRatio || 0.05
  );
  
  // Environmental factors
  const [temperatureRange, setTemperatureRange] = useState<{ min: number; max: number }>({ min: -10, max: 50 });
  const [seismicConsideration, setSeismicConsideration] = useState<boolean>(false);
  
  // Calculation results
  const [results, setResults] = useState<any>({});
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);


  // Get equipment characteristics
  const selectedEquipment = EQUIPMENT_TYPES.find(eq => eq.value === equipmentType);
  const selectedIsolator = ISOLATOR_TYPES.find(iso => iso.value === isolatorType);

  // Update RPM and damping when equipment type changes
  useEffect(() => {
    const equipment = EQUIPMENT_TYPES.find(eq => eq.value === equipmentType);
    if (equipment) {
      // Always update typical RPM for consistency
      setOperatingRPM(equipment.typicalRPM);
      // Always update damping ratio to equipment typical
      setCustomDampingRatio(equipment.dampingRatio);
    }
  }, [equipmentType]);

  // Update damping ratio when isolator type changes
  useEffect(() => {
    const isolator = ISOLATOR_TYPES.find(iso => iso.value === isolatorType);
    if (isolator) {
      // Update damping ratio to typical for the selected isolator
      setCustomDampingRatio(isolator.dampingRatio);
    }
  }, [isolatorType]);

  // Automatic calculation when inputs change
  useEffect(() => {
    if (selectedEquipment && selectedIsolator && equipmentWeight > 0 && operatingRPM > 0) {
      performCalculation();
    } else {
      setResults({});
      setCalculationPerformed(false);
    }
  }, [
    equipmentType, equipmentWeight, operatingRPM, numberOfIsolators, 
    desiredEfficiency, isolatorType, customDampingRatio, temperatureRange, 
    seismicConsideration, selectedEquipment, selectedIsolator
  ]);

  // Perform calculation
  const performCalculation = () => {
    if (!selectedEquipment || !selectedIsolator) return;

    /*
     * VIBRATION ISOLATOR SIZING CALCULATIONS
     * Based on the relationship: fn = (1/2π) * √(k/m) = (1/2π) * √(g/δ)
     * Where: fn = natural frequency (Hz), k = spring constant (N/m), 
     *        m = mass (kg), g = 9.81 m/s², δ = static deflection (m)
     * Rearranging: δ = g / (4π²fn²)
     * For mm units: δ = 9810 / (4π²fn²) where 9810 = g in mm/s²
     */

    // Step 1: Calculate disturbing frequency
    const disturbingFrequency = operatingRPM / 60; // Hz
    
    // Step 2: Calculate required frequency ratio for desired efficiency
    const dampingRatio = customDampingRatio || selectedIsolator?.dampingRatio || 0.05;
    const requiredFrequencyRatio = calculateRequiredFrequencyRatio(desiredEfficiency, dampingRatio);
    
    // Step 3: Calculate required natural frequency
    const requiredNaturalFrequency = disturbingFrequency / requiredFrequencyRatio; // Hz
    
    // Step 4: Calculate required static deflection (CORRECTED FORMULA)
    const G_MM_S2 = 9810; // Acceleration due to gravity in mm/s²
    const staticDeflection = G_MM_S2 / (4 * Math.PI * Math.PI * requiredNaturalFrequency * requiredNaturalFrequency); // mm
    
    // Step 5: Check if selected isolator can achieve this deflection
    const deflectionFeasible = staticDeflection >= selectedIsolator.minDeflection && 
                              staticDeflection <= selectedIsolator.maxDeflection;
    
    // Step 6: Calculate load per isolator
    const loadPerIsolator = (equipmentWeight * 9.81) / numberOfIsolators; // N
    
    // Step 7: Calculate spring constant
    const springConstant = loadPerIsolator / (staticDeflection / 1000); // N/m
    
    // Step 8: Calculate actual natural frequency
    const actualNaturalFrequency = Math.sqrt(springConstant / (equipmentWeight / numberOfIsolators)) / (2 * Math.PI); // Hz
    
    // Step 9: Calculate transmission ratio
    const frequencyRatio = disturbingFrequency / actualNaturalFrequency;
    
    const transmissionRatio = Math.sqrt(
      (1 + (2 * dampingRatio * frequencyRatio) ** 2) / 
      ((1 - frequencyRatio ** 2) ** 2 + (2 * dampingRatio * frequencyRatio) ** 2)
    );
    
    // Step 10: Calculate actual isolation efficiency
    const actualIsolationEfficiency = Math.max(0, (1 - transmissionRatio) * 100); // %
    
    // Step 11: Performance assessment
    const efficiencyTarget = Math.abs(actualIsolationEfficiency - desiredEfficiency) < 2; // Within 2%
    const resonanceRisk = Math.abs(frequencyRatio - 1) < 0.3;
    const performanceGood = actualIsolationEfficiency >= (desiredEfficiency - 5) && !resonanceRisk;
    
    // Step 12: Calculate alternative efficiency scenarios
    const scenarios = [
      { efficiency: 80, ratio: calculateRequiredFrequencyRatio(80, dampingRatio) },
      { efficiency: 85, ratio: calculateRequiredFrequencyRatio(85, dampingRatio) },
      { efficiency: 90, ratio: calculateRequiredFrequencyRatio(90, dampingRatio) },
      { efficiency: 95, ratio: calculateRequiredFrequencyRatio(95, dampingRatio) }
    ];
    
    const scenarioDeflections = scenarios.map(s => ({
      ...s,
      naturalFreq: disturbingFrequency / s.ratio,
      deflection: G_MM_S2 / (4 * Math.PI * Math.PI * (disturbingFrequency / s.ratio) ** 2)
    }));
    
    const calculationResults = {
      // Input parameters
      disturbingFrequency,
      requiredFrequencyRatio,
      requiredNaturalFrequency,
      staticDeflection,
      loadPerIsolator,
      springConstant,
      actualNaturalFrequency,
      frequencyRatio,
      dampingRatio,
      transmissionRatio,
      actualIsolationEfficiency,
      desiredEfficiency,
      deflectionFeasible,
      performanceGood,
      efficiencyTarget,
      resonanceRisk,
      scenarioDeflections,
      // Additional calculations
      totalLoad: equipmentWeight * 9.81, // N
      deflectionInches: staticDeflection / 25.4, // inches
      springConstantLbsIn: springConstant * 0.00571, // lbs/inch
    };

    setResults(calculationResults);
    setCalculationPerformed(true);
  };

  const resetCalculation = () => {
    setCalculationPerformed(false);
    setResults({});
  };

  // Function to suggest isolator type based on static deflection
  const suggestIsolatorType = (deflection: number) => {
    if (deflection < 15) {
      return { type: 'Rubber/Neoprene', reason: 'Low deflection requirement suits compact isolators' };
    } else if (deflection >= 15 && deflection < 100) {
      return { type: 'Spring or Composite', reason: 'Medium deflection range ideal for spring-based isolators' };
    } else {
      return { type: 'Air Springs', reason: 'High deflection requirement needs air spring technology' };
    }
  };

  // Function to calculate required frequency ratio for desired isolation efficiency
  const calculateRequiredFrequencyRatio = (efficiencyPercent: number, dampingRatio: number): number => {
    // Target transmission ratio
    const targetTR = 1 - (efficiencyPercent / 100);
    
    // For very high efficiency targets, set minimum practical limits
    if (targetTR < 0.01) return 10; // 99%+ efficiency requires very high ratios
    
    // Iterative solution to find frequency ratio
    let r = 2.0; // Initial guess
    const maxIterations = 100;
    const tolerance = 0.001;
    
    for (let i = 0; i < maxIterations; i++) {
      // Calculate transmission ratio for current frequency ratio
      const numerator = 1 + (2 * dampingRatio * r) ** 2;
      const denominator = (1 - r ** 2) ** 2 + (2 * dampingRatio * r) ** 2;
      const calculatedTR = Math.sqrt(numerator / denominator);
      
      // Check if we're close enough
      if (Math.abs(calculatedTR - targetTR) < tolerance) {
        return r;
      }
      
      // Adjust frequency ratio (simple binary search approach)
      if (calculatedTR > targetTR) {
        r *= 1.1; // Need higher frequency ratio for lower transmission
      } else {
        r *= 0.95; // Need lower frequency ratio for higher transmission
      }
      
      // Ensure reasonable bounds
      if (r < 1.5) r = 1.5;
      if (r > 20) r = 20;
    }
    
    // Fallback approximations if iteration doesn't converge
    if (efficiencyPercent >= 95) return 6.0;
    if (efficiencyPercent >= 90) return 4.5;
    if (efficiencyPercent >= 85) return 3.5;
    if (efficiencyPercent >= 80) return 3.0;
    return 2.5;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Equipment Specifications</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipment Type
          </label>
          <select
            value={equipmentType}
            onChange={(e) => setEquipmentType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {EQUIPMENT_TYPES.map(eq => (
              <option key={eq.value} value={eq.value}>{eq.label}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment Weight (kg)
            </label>
            <input
              type="number"
              min="1"
              value={equipmentWeight}
              onChange={(e) => setEquipmentWeight(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operating RPM
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={operatingRPM}
              onChange={(e) => setOperatingRPM(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Isolators
            </label>
            <input
              type="number"
              min="2"
              max="12"
              value={numberOfIsolators}
              onChange={(e) => setNumberOfIsolators(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Isolation Efficiency (%)
            </label>
            <input
              type="number"
              min="70"
              max="98"
              step="1"
              value={desiredEfficiency}
              onChange={(e) => setDesiredEfficiency(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Target vibration isolation performance.
              <br />Typical: 85% (good), 90% (excellent), 95% (premium)
            </p>
          </div>
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Isolator Selection</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Isolator Type
          </label>
          <select
            value={isolatorType}
            onChange={(e) => setIsolatorType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {ISOLATOR_TYPES.map(iso => (
              <option key={iso.value} value={iso.value}>
                {iso.label} ({iso.minDeflection}-{iso.maxDeflection}mm)
              </option>
            ))}
          </select>
          {selectedIsolator && (
            <p className="text-xs text-gray-500 mt-1">{selectedIsolator.description}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Damping Ratio (ζ)
          </label>
          <input
            type="number"
            min="0.01"
            max="0.5"
            step="0.01"
            value={customDampingRatio}
            onChange={(e) => setCustomDampingRatio(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">
            Typical: {selectedIsolator?.dampingRatio || 'N/A'} for {selectedIsolator?.label || 'selected isolator'}
          </p>
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Environmental Factors</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Temperature (°C)
            </label>
            <input
              type="number"
              value={temperatureRange.min}
              onChange={(e) => setTemperatureRange({...temperatureRange, min: Number(e.target.value)})}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Temperature (°C)
            </label>
            <input
              type="number"
              value={temperatureRange.max}
              onChange={(e) => setTemperatureRange({...temperatureRange, max: Number(e.target.value)})}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={seismicConsideration}
              onChange={(e) => setSeismicConsideration(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Seismic Zone Consideration</span>
          </label>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!results.disturbingFrequency ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter equipment specifications to see calculations</p>
          </div>
        ) : (
          <>
            {/* Overall Assessment */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Performance Assessment</h4>
              <div className={`p-3 rounded-md ${results.performanceGood ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'}`}>
                <p className={`font-bold ${results.performanceGood ? 'text-green-700' : 'text-yellow-700'}`}>
                  {results.performanceGood ? 'EXCELLENT ✓' : 'ADEQUATE ⚠'} Isolation Performance
                </p>
                <p className="text-sm mt-1">
                  Isolation Efficiency: {results.actualIsolationEfficiency.toFixed(1)}%
                </p>
                {results.resonanceRisk && (
                  <p className="text-sm text-red-600 mt-1">⚠ Resonance risk detected</p>
                )}
              </div>

            {/* Isolator Type Suggestion */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Isolator Type Recommendation</h4>
              <div className="bg-white p-3 rounded-md border border-blue-200">
                {(() => {
                  const suggestion = suggestIsolatorType(results.staticDeflection);
                  return (
                    <>
                      <p className="font-medium text-blue-700">Suggested: {suggestion.type}</p>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Current Selection: {selectedIsolator?.label} 
                        ({selectedIsolator?.minDeflection}-{selectedIsolator?.maxDeflection}mm range)
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
            </div>

            {/* Key Results Summary */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Key Results</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Required Frequency Ratio:</p>
                    <p className="font-semibold">{results.requiredFrequencyRatio.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Actual Frequency Ratio:</p>
                    <p className="font-semibold">{results.frequencyRatio.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Required Static Deflection:</p>
                    <p className="font-semibold">{results.staticDeflection.toFixed(1)} mm</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Load per Isolator:</p>
                    <p className="font-semibold">{(results.loadPerIsolator / 9.81).toFixed(0)} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Target Efficiency:</p>
                    <p className="font-semibold text-blue-600">{results.desiredEfficiency}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Actual Efficiency:</p>
                    <p className={`font-semibold ${Math.abs(results.actualIsolationEfficiency - results.desiredEfficiency) <= 2 ? 'text-green-600' : 
                          results.actualIsolationEfficiency < results.desiredEfficiency ? 'text-red-600' : 'text-blue-600'}`}>
                      {results.actualIsolationEfficiency.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Calculations */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Step-by-Step Calculations</h4>
              <div className="space-y-3">
                
                {/* Step 1 */}
                <div className="bg-white p-3 rounded-md">
                  <p className="font-medium text-sm text-blue-700">Step 1: Disturbing Frequency</p>
                  <p className="text-sm">f<sub>d</sub> = RPM ÷ 60 = {operatingRPM} ÷ 60 = <strong>{results.disturbingFrequency?.toFixed(2)} Hz</strong></p>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-3 rounded-md">
                  <p className="font-medium text-sm text-blue-700">Step 2: Required Frequency Ratio</p>
                  <p className="text-sm">For {results.desiredEfficiency}% efficiency with ζ = {results.dampingRatio?.toFixed(3)}: <strong>r = {results.requiredFrequencyRatio?.toFixed(2)}</strong></p>
                  <p className="text-xs text-gray-600">Solved from transmission ratio equation iteratively</p>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-3 rounded-md">
                  <p className="font-medium text-sm text-blue-700">Step 3: Required Natural Frequency</p>
                  <p className="text-sm">f<sub>n</sub> = f<sub>d</sub> ÷ r = {results.disturbingFrequency?.toFixed(2)} ÷ {results.requiredFrequencyRatio?.toFixed(2)} = <strong>{results.requiredNaturalFrequency?.toFixed(2)} Hz</strong></p>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-3 rounded-md">
                  <p className="font-medium text-sm text-blue-700">Step 4: Required Static Deflection</p>
                  <p className="text-sm">δ = g ÷ (4π²f<sub>n</sub>²) = 9810 ÷ (4π² × {results.requiredNaturalFrequency?.toFixed(2)}²) = <strong>{results.staticDeflection?.toFixed(1)} mm</strong></p>
                </div>

                {/* Step 5 */}
                <div className="bg-white p-3 rounded-md">
                  <p className="font-medium text-sm text-blue-700">Step 5: Load Distribution</p>
                  <p className="text-sm">Load per isolator = {equipmentWeight} kg ÷ {numberOfIsolators} = <strong>{(results.loadPerIsolator / 9.81)?.toFixed(0)} kg</strong> ({results.loadPerIsolator?.toFixed(0)} N)</p>
                </div>

                {/* Step 6 */}
                <div className="bg-white p-3 rounded-md">
                  <p className="font-medium text-sm text-blue-700">Step 6: Spring Constant</p>
                  <p className="text-sm">k = Load ÷ Deflection = {results.loadPerIsolator?.toFixed(0)} N ÷ {(results.staticDeflection/1000)?.toFixed(3)} m = <strong>{results.springConstant?.toFixed(0)} N/m</strong></p>
                </div>

                {/* Step 7 */}
                <div className="bg-white p-3 rounded-md">
                  <p className="font-medium text-sm text-blue-700">Step 7: Actual Performance</p>
                  <p className="text-sm">Actual frequency ratio = {results.frequencyRatio?.toFixed(2)}</p>
                  <p className="text-sm">Actual efficiency = <strong>{results.actualIsolationEfficiency?.toFixed(1)}%</strong></p>
                  <p className="text-xs text-gray-600">Based on actual spring constant and system characteristics</p>
                </div>
              </div>
            </div>

            {/* Feasibility Check */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Isolator Feasibility</h4>
              <div className={`p-3 rounded-md ${results.deflectionFeasible ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                <p className={`font-medium ${results.deflectionFeasible ? 'text-green-700' : 'text-red-700'}`}>
                  {results.deflectionFeasible ? 'FEASIBLE ✓' : 'NOT FEASIBLE ✗'}
                </p>
                <p className="text-sm mt-1">
                  Required: {results.staticDeflection?.toFixed(1)} mm | 
                  Selected: {selectedIsolator?.label} (Range: {selectedIsolator?.minDeflection}-{selectedIsolator?.maxDeflection} mm)
                </p>
                {!results.deflectionFeasible && (
                  <p className="text-sm mt-2 text-red-600">
                    {results.staticDeflection < (selectedIsolator?.minDeflection || 0) && 
                      "⚠ Required deflection is too low for this isolator. Consider a stiffer isolator or one with a lower minimum deflection."}
                    {results.staticDeflection > (selectedIsolator?.maxDeflection || Infinity) &&
                      "⚠ Required deflection is too high for this isolator. Consider a softer isolator or one with a higher maximum deflection."}
                  </p>
                )}
              </div>
            </div>

            {/* Performance Recommendations */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Efficiency Scenarios</h4>
              <div className="bg-white p-3 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Target Efficiency</th>
                      <th className="px-2 py-1 text-right">Required Deflection</th>
                      <th className="px-2 py-1 text-right">Natural Frequency</th>
                      <th className="px-2 py-1 text-right">Frequency Ratio</th>
                      <th className="px-2 py-1 text-left">Feasibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.scenarioDeflections?.map((scenario: any, index: number) => (
                      <tr key={index} className={scenario.efficiency === results.desiredEfficiency ? 'bg-blue-50 font-medium' : ''}>
                        <td className="px-2 py-1">{scenario.efficiency}%</td>
                        <td className="px-2 py-1 text-right">{scenario.deflection?.toFixed(1)} mm</td>
                        <td className="px-2 py-1 text-right">{scenario.naturalFreq?.toFixed(2)} Hz</td>
                        <td className="px-2 py-1 text-right">{scenario.ratio?.toFixed(1)}</td>
                        <td className="px-2 py-1">
                          {scenario.deflection >= (selectedIsolator?.minDeflection || 0) && 
                           scenario.deflection <= (selectedIsolator?.maxDeflection || Infinity) ? (
                            <span className="text-green-600">✓ Feasible</span>
                          ) : (
                            <span className="text-red-600">✗ Not feasible</span>
                          )}
                        </td>
                      </tr>
                    )) || []}
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 mt-2">
                  Frequency Ratio = Disturbing Frequency ÷ Natural Frequency (f<sub>d</sub>/f<sub>n</sub>)
                </p>
              </div>
            </div>

            {/* Installation Guidelines */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Installation Guidelines</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Load Distribution:</strong> Ensure equal load on all isolators (±5% variation)</li>
                <li><strong>Snubbers:</strong> Install with {(results.staticDeflection * 0.25)?.toFixed(1)} mm gap for startup protection</li>
                <li><strong>Alignment:</strong> Check equipment alignment after installation and settling</li>
                {seismicConsideration && (
                  <li><strong>Seismic:</strong> Consider restraints and lateral stability for earthquake zones</li>
                )}
                <li><strong>Maintenance:</strong> Inspect isolators annually for wear and proper deflection</li>
                <li><strong>Verification:</strong> Measure actual static deflection after installation (target: {results.staticDeflection?.toFixed(1)} mm)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== TRANSMISSION ANALYSIS CALCULATOR ========================

const TransmissionAnalysisCalculator: React.FC<TransmissionAnalysisProps> = ({ onShowTutorial }) => {
  // Input parameters
  const [naturalFrequency, setNaturalFrequency] = useState<number>(5); // Hz
  const [dampingRatio, setDampingRatio] = useState<number>(0.05);
  const [frequencyRangeMin, setFrequencyRangeMin] = useState<number>(1); // Hz
  const [frequencyRangeMax, setFrequencyRangeMax] = useState<number>(50); // Hz
  const [operatingFrequencies, setOperatingFrequencies] = useState<string>('10, 20, 30'); // Hz

  // Analysis results
  const [frequencyResponse, setFrequencyResponse] = useState<any[]>([]);
  const [operatingPointsAnalysis, setOperatingPointsAnalysis] = useState<any[]>([]);

  // Perform transmission analysis
  const performAnalysis = () => {
    // Generate frequency response curve
    const frequencies = [];
    const step = (frequencyRangeMax - frequencyRangeMin) / 100;
    
    for (let f = frequencyRangeMin; f <= frequencyRangeMax; f += step) {
      const frequencyRatio = f / naturalFrequency;
      const transmissionRatio = Math.sqrt(
        (1 + (2 * dampingRatio * frequencyRatio) ** 2) / 
        ((1 - frequencyRatio ** 2) ** 2 + (2 * dampingRatio * frequencyRatio) ** 2)
      );
      
      frequencies.push({
        frequency: f,
        frequencyRatio,
        transmissionRatio,
        isolationEfficiency: Math.max(0, (1 - transmissionRatio) * 100)
      });
    }
    
    setFrequencyResponse(frequencies);

    // Analyze specific operating frequencies
    const opFreqs = operatingFrequencies.split(',').map(f => parseFloat(f.trim())).filter(f => !isNaN(f));
    const operatingAnalysis = opFreqs.map(f => {
      const frequencyRatio = f / naturalFrequency;
      const transmissionRatio = Math.sqrt(
        (1 + (2 * dampingRatio * frequencyRatio) ** 2) / 
        ((1 - frequencyRatio ** 2) ** 2 + (2 * dampingRatio * frequencyRatio) ** 2)
      );
      
      const isolationEfficiency = Math.max(0, (1 - transmissionRatio) * 100);
      const resonanceRisk = Math.abs(frequencyRatio - 1) < 0.3;
      const performanceRating = isolationEfficiency > 90 ? 'Excellent' : 
                               isolationEfficiency > 80 ? 'Good' : 
                               isolationEfficiency > 60 ? 'Fair' : 'Poor';

      return {
        frequency: f,
        frequencyRatio,
        transmissionRatio,
        isolationEfficiency,
        resonanceRisk,
        performanceRating
      };
    });
    
    setOperatingPointsAnalysis(operatingAnalysis);
  };

  // Auto-calculation when inputs change
  useEffect(() => {
    performAnalysis();
  }, [naturalFrequency, dampingRatio, frequencyRangeMin, frequencyRangeMax, operatingFrequencies]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">System Parameters</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Natural Frequency (Hz)
            </label>
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.1"
              value={naturalFrequency}
              onChange={(e) => setNaturalFrequency(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Damping Ratio (ζ)
            </label>
            <input
              type="number"
              min="0.01"
              max="0.5"
              step="0.01"
              value={dampingRatio}
              onChange={(e) => setDampingRatio(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Analysis Range</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Frequency (Hz)
            </label>
            <input
              type="number"
              min="0.1"
              value={frequencyRangeMin}
              onChange={(e) => setFrequencyRangeMin(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Frequency (Hz)
            </label>
            <input
              type="number"
              min="1"
              value={frequencyRangeMax}
              onChange={(e) => setFrequencyRangeMax(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operating Frequencies (Hz)
          </label>
          <input
            type="text"
            value={operatingFrequencies}
            onChange={(e) => setOperatingFrequencies(e.target.value)}
            placeholder="10, 20, 30"
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Transmission Analysis</h3>
        
        {operatingPointsAnalysis.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter system parameters to see live analysis</p>
          </div>
        ) : (
          <>
            {/* Operating Points Analysis */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Operating Frequencies Analysis</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Frequency (Hz)</th>
                      <th className="px-3 py-2 text-right">Freq. Ratio</th>
                      <th className="px-3 py-2 text-right">Trans. Ratio</th>
                      <th className="px-3 py-2 text-right">Efficiency (%)</th>
                      <th className="px-3 py-2 text-left">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatingPointsAnalysis.map((point, index) => (
                      <tr key={index} className={`border-t border-gray-200 ${point.resonanceRisk ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2">{point.frequency.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right">{point.frequencyRatio.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{point.transmissionRatio.toFixed(3)}</td>
                        <td className={`px-3 py-2 text-right ${
                          point.isolationEfficiency > 90 ? 'text-green-600 font-semibold' :
                          point.isolationEfficiency > 80 ? 'text-blue-600 font-semibold' :
                          point.isolationEfficiency > 60 ? 'text-yellow-600 font-semibold' :
                          'text-red-600 font-semibold'
                        }`}>
                          {point.isolationEfficiency.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2">
                          {point.performanceRating}
                          {point.resonanceRisk && <span className="text-red-600 ml-1">⚠</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Characteristics */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">System Characteristics</h4>
              <div className="bg-white p-3 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Natural Frequency:</p>
                    <p className="font-semibold">{naturalFrequency} Hz</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Damping Ratio:</p>
                    <p className="font-semibold">{dampingRatio}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Resonance Frequency:</p>
                    <p className="font-semibold">{naturalFrequency.toFixed(1)} Hz</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Effective Range:</p>
                    <p className="font-semibold"> {(naturalFrequency * 1.414).toFixed(1)} Hz</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Performance Summary</h4>
              <div className="space-y-2">
                {operatingPointsAnalysis.some(p => p.resonanceRisk) && (
                  <div className="bg-red-100 border border-red-300 p-2 rounded-md">
                    <p className="text-red-700 font-medium text-sm">
                      ⚠ Resonance Risk Detected
                    </p>
                    <p className="text-red-600 text-xs">
                      Some operating frequencies are near the natural frequency
                    </p>
                  </div>
                )}
                
                <div className="bg-white p-2 rounded-md">
                  <p className="text-sm">
                    <strong>Average Efficiency:</strong> {
                      operatingPointsAnalysis.length > 0 
                        ? (operatingPointsAnalysis.reduce((sum, p) => sum + p.isolationEfficiency, 0) / operatingPointsAnalysis.length).toFixed(1)
                        : 0
                    }%
                  </p>
                </div>
              </div>
            </div>

            {/* Design Guidelines */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Design Guidelines</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Isolation Region:</strong> f  {(naturalFrequency * 1.414).toFixed(1)} Hz for effective isolation</li>
                <li><strong>Resonance Avoidance:</strong> Keep operating frequencies away from {(naturalFrequency * 0.7).toFixed(1)}-{(naturalFrequency * 1.3).toFixed(1)} Hz</li>
                <li><strong>Optimal Range:</strong> f  {(naturalFrequency * 2.5).toFixed(1)} Hz for 80% efficiency</li>
                <li><strong>Damping Effects:</strong> Higher damping reduces resonance but limits high-frequency isolation</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VibrationIsolatorCalculator;