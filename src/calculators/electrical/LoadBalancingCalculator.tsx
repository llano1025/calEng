import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface LoadBalancingCalculatorProps {
  onShowTutorial?: () => void;
}

const LoadBalancingCalculator: React.FC<LoadBalancingCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Load Balancing Calculator',
    discipline: 'electrical',
    calculatorType: 'loadBalancing'
  });

  // Tab state to toggle between calculators
  const [activeTab, setActiveTab] = useState<'loadBalancing' | 'powerFactor'>('loadBalancing');

  // State for Load Balancing Calculator
  const [phaseCurrents, setPhaseCurrents] = useState<{
    phaseA: string;
    phaseB: string;
    phaseC: string;
  }>({
    phaseA: '400',
    phaseB: '425',
    phaseC: '370',
  });

  // State for Load Balancing Calculator results
  const [averageCurrent, setAverageCurrent] = useState<number | null>(null);
  const [maxDeviation, setMaxDeviation] = useState<number | null>(null);
  const [unbalancePercentage, setUnbalancePercentage] = useState<number | null>(null);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // State for Power Factor Correction Calculator inputs
  const [powerFactorInputs, setPowerFactorInputs] = useState({
    loadPower: '1000', // in kW
    initialPowerFactor: '0.7', // initial power factor
    targetPowerFactor: '0.85', // target power factor
    harmonicDistortion: '5', // percentage THD
  });

  // State for Power Factor calculation results
  const [powerFactorResults, setPowerFactorResults] = useState<any>(null);

  // Handle Load Balancing input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPhaseCurrents((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsCalculated(false);
  };

  // Handle Power Factor input changes
  const handlePowerFactorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPowerFactorInputs({ ...powerFactorInputs, [e.target.name]: e.target.value });
    setPowerFactorResults(null); // Clear results on input change
  };

  // Calculate load balancing
  const calculateLoadBalancing = () => {
    const { phaseA, phaseB, phaseC } = phaseCurrents;
    
    // Only calculate if all fields have valid values
    if (phaseA && phaseB && phaseC) {
      const currents = [parseFloat(phaseA), parseFloat(phaseB), parseFloat(phaseC)];
      
      // Calculate average current
      const avg = currents.reduce((sum, curr) => sum + curr, 0) / 3;
      setAverageCurrent(avg);
      
      // Find maximum deviation from average
      const deviations = currents.map(curr => Math.abs(curr - avg));
      const maxDev = Math.max(...deviations);
      setMaxDeviation(maxDev);
      
      // Calculate unbalance percentage as per BEC 7.6.3
      const unbalance = (maxDev / avg) * 100;
      setUnbalancePercentage(unbalance);
      
      // Check if compliant (unbalance should be <= 10%)
      const compliant = unbalance <= 10;
      setIsCompliant(compliant);
      setIsCalculated(true);
      
      // Save calculation and prepare export data
      const inputs = {
        'Phase A Current': `${phaseA} A`,
        'Phase B Current': `${phaseB} A`,
        'Phase C Current': `${phaseC} A`
      };
      
      const results = {
        'Average Current': `${avg.toFixed(2)} A`,
        'Maximum Deviation': `${maxDev.toFixed(2)} A`,
        'Unbalance Percentage': `${unbalance.toFixed(2)}%`,
        'Compliance Status': compliant ? 'PASS' : 'FAIL',
        'Standard Limit': '10%'
      };
      
      saveCalculation(inputs, results);
      prepareExportData(inputs, results);
    } else {
      // Alert user if inputs are invalid
      alert("Please enter valid current values for all three phases.");
    }
  };

  // Reset load balancing form
  const handleReset = () => {
    setPhaseCurrents({
      phaseA: '',
      phaseB: '',
      phaseC: '',
    });
    setAverageCurrent(null);
    setMaxDeviation(null);
    setUnbalancePercentage(null);
    setIsCompliant(null);
    setIsCalculated(false);
  };

  // Power factor calculation function
  const calculatePowerFactor = () => {
    const power = parseFloat(powerFactorInputs.loadPower);
    const initialPF = parseFloat(powerFactorInputs.initialPowerFactor);
    const targetPF = parseFloat(powerFactorInputs.targetPowerFactor);
    const thdValue = parseFloat(powerFactorInputs.harmonicDistortion);
    const thd = thdValue / 100;

    if (isNaN(power) || isNaN(initialPF) || isNaN(targetPF) || isNaN(thd)) {
      alert("Please enter valid numeric values for all fields.");
      return;
    }

    // Calculate total power factor with harmonics effect for both initial and target PF
    const initialTotalPF = initialPF;
    const targetTotalPF = targetPF * Math.sqrt(1 + Math.pow(thd, 2));
    
    // Calculate angles using the corrected power factors
    const initialAngle = Math.acos(initialTotalPF);
    const targetAngle = Math.acos(targetTotalPF);
    
    // Calculate tangents
    const initialTan = Math.tan(initialAngle);
    const targetTan = Math.tan(targetAngle);
    
    // Calculate required kVAr for power factor correction
    const kVArRequired = power * (initialTan - targetTan);
    
    // Calculate existing and new kVA values using corrected PFs
    const initialKVA = power / initialTotalPF;
    const targetKVA = power / targetTotalPF;
    const kVAReduction = initialKVA - targetKVA;
    
    // Calculate standard capacitor bank size
    // Standard sizes are typically in multiples of 25 kVAr
    const standardCapacitorSize = Math.ceil(kVArRequired / 25) * 25;

    // Set results
    const results = {
      initialTotalPF: initialTotalPF.toFixed(3),
      targetTotalPF: targetTotalPF.toFixed(3),
      initialAngleDegrees: (initialAngle * 180 / Math.PI).toFixed(2),
      targetAngleDegrees: (targetAngle * 180 / Math.PI).toFixed(2),
      initialTan: initialTan.toFixed(4),
      targetTan: targetTan.toFixed(4),
      kVArRequired: kVArRequired.toFixed(1),
      kVAReduction: kVAReduction.toFixed(1),
      initialKVA: initialKVA.toFixed(1),
      targetKVA: targetKVA.toFixed(1),
      standardCapacitorSize: standardCapacitorSize
    };
    setPowerFactorResults(results);
    
    // Save calculation and prepare export data
    const inputs = {
      'Load Power': `${powerFactorInputs.loadPower} kW`,
      'Initial Power Factor': powerFactorInputs.initialPowerFactor,
      'Target Power Factor': powerFactorInputs.targetPowerFactor,
      'Harmonic Distortion': `${powerFactorInputs.harmonicDistortion}%`
    };
    
    const exportResults = {
      'Initial Total Power Factor': results.initialTotalPF,
      'Target Total Power Factor': results.targetTotalPF,
      'kVAr Required': `${results.kVArRequired} kVAr`,
      'kVA Reduction': `${results.kVAReduction} kVA`,
      'Standard Capacitor Size': `${results.standardCapacitorSize} kVAr`
    };
    
    saveCalculation(inputs, exportResults);
    prepareExportData(inputs, exportResults);
  };

  // Render the Load Balancing Calculator
  const renderLoadBalancingCalculator = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
          
          <div className="mb-4 bg-blue-50 p-3 rounded-md text-sm text-gray-700">
            <p>
              BEC clause 7.6.3 specifies that for three-phase 4-wire circuits at or above 400A 
              (circuit protective device rating) with single-phase loads, the maximum allowable 
              percentage current unbalance is 10%.
            </p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Phase Currents</h4>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phase A Current (A)
                </label>
                <input
                  type="number"
                  name="phaseA"
                  value={phaseCurrents.phaseA}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Enter current"
                  step="0.1"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phase B Current (A)
                </label>
                <input
                  type="number"
                  name="phaseB"
                  value={phaseCurrents.phaseB}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Enter current"
                  step="0.1"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phase C Current (A)
                </label>
                <input
                  type="number"
                  name="phaseC"
                  value={phaseCurrents.phaseC}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Enter current"
                  step="0.1"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={calculateLoadBalancing}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Calculate
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {!isCalculated ? (
            <div className="text-center py-8 text-gray-500">
              <p>Enter the phase currents and click Calculate to see results</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="bg-white p-3 rounded-md">
                  <p className="text-sm font-medium">Average Current (Ia)</p>
                  <p className="text-lg">{averageCurrent?.toFixed(2)} A</p>
                </div>
                
                <div className="bg-white p-3 rounded-md">
                  <p className="text-sm font-medium">Maximum Deviation (Id)</p>
                  <p className="text-lg">{maxDeviation?.toFixed(2)} A</p>
                </div>
                
                <div className="bg-white p-3 rounded-md">
                  <p className="text-sm font-medium">Unbalance Percentage (Iu)</p>
                  <p className="text-lg">{unbalancePercentage?.toFixed(2)}%</p>
                  <p className="text-xs text-gray-500 mt-1">Maximum allowed: 10%</p>
                </div>
                
                <div className={`bg-white p-3 rounded-md border-l-4 ${isCompliant ? 'border-green-500' : 'border-red-500'}`}>
                  <p className="text-sm font-medium">Compliance Status</p>
                  <p className={`text-lg font-bold ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                    {isCompliant ? 'Compliant with BEC 7.6.3 ✓' : 'Non-compliant with BEC 7.6.3 ✗'}
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-md">
                <h4 className="font-medium mb-2">Calculation Method</h4>
                <p className="font-medium mb-2">Iu = (Id × 100) / Ia = {maxDeviation?.toFixed(2)} × 100 / {averageCurrent?.toFixed(2)} = {unbalancePercentage?.toFixed(2)}%</p>
                <p className="text-sm text-gray-600">Where:</p>
                <ul className="text-sm text-gray-600 list-disc pl-5 mt-1">
                  <li>Iu = percentage current unbalance</li>
                  <li>Id = maximum current deviation from the average current</li>
                  <li>Ia = average current among three phases</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Info section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Load balancing is important for three-phase systems to prevent overloading of any single phase.</li>
          <li>BEC clause 7.6.3 requires three-phase 4-wire circuits rated at or above 400A with single-phase loads to maintain current unbalance below 10%.</li>
          <li>Excessive phase unbalance can cause voltage unbalance, which may impact equipment performance and lifespan.</li>
          <li>Neutral current in a balanced three-phase system with linear loads should be close to zero.</li>
          <li>If your system is non-compliant, consider redistributing single-phase loads across phases to achieve better balance.</li>
        </ul>
      </div>
    </>
  );

  // Render the Power Factor Calculator
  const renderPowerFactorCalculator = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Load Information</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Load Power (kW)
              </label>
              <input
                type="number"
                name="loadPower"
                value={powerFactorInputs.loadPower}
                onChange={handlePowerFactorInputChange}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Displacement Power Factor
              </label>
              <input
                type="number"
                name="initialPowerFactor"
                value={powerFactorInputs.initialPowerFactor}
                onChange={handlePowerFactorInputChange}
                className="w-full p-2 border rounded-md text-sm"
                min="0.1"
                max="1"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Current power factor of the load (typically 0.7-0.8)</p>
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-4"></div>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Correction Parameters</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Power Factor
              </label>
              <input
                type="number"
                name="targetPowerFactor"
                value={powerFactorInputs.targetPowerFactor}
                onChange={handlePowerFactorInputChange}
                className="w-full p-2 border rounded-md text-sm"
                min="0.1"
                max="1"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Desired power factor after correction (typically 0.85-0.95)</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harmonic Distortion (THD %)
              </label>
              <input
                type="number"
                name="harmonicDistortion"
                value={powerFactorInputs.harmonicDistortion}
                onChange={handlePowerFactorInputChange}
                className="w-full p-2 border rounded-md text-sm"
                min="0"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">Total Harmonic Distortion in the current waveform</p>
            </div>
          </div>
          
          {/* Calculate Button */}
          <div className="mt-6">
            <button
              onClick={calculatePowerFactor}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Calculate Correction
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {!powerFactorResults ? (
            <div className="text-center py-8 text-gray-500">
              <p>Enter the parameters and click Calculate to see results</p>
            </div>
          ) : (
            <>
              <div className="bg-green-100 p-4 rounded-md mb-4">
                <h4 className="font-medium text-green-800 mb-2">Capacitor Bank Sizing</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-sm font-medium">Minimum Required Capacity</p>
                    <p className="text-xl font-bold text-green-700">{powerFactorResults.kVArRequired} kVAr</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Recommended Standard Size</p>
                    <p className="text-lg font-medium">{powerFactorResults.standardCapacitorSize} kVAr</p>
                    <p className="text-xs text-green-600">Based on standard capacitor bank sizes (multiples of 25 kVAr)</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">System Improvements</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Initial Power Factor</p>
                    <p className="text-lg">{powerFactorResults.initialTotalPF}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Target Power Factor</p>
                    <p className="text-lg">{powerFactorResults.targetTotalPF}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Initial Apparent Power</p>
                    <p className="text-lg">{powerFactorResults.initialKVA} kVA</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">New Apparent Power</p>
                    <p className="text-lg">{powerFactorResults.targetKVA} kVA</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium">Apparent Power Reduction</p>
                    <p className="text-lg text-green-600 font-medium">{powerFactorResults.kVAReduction} kVA ({((parseFloat(powerFactorResults.kVAReduction) / parseFloat(powerFactorResults.initialKVA)) * 100).toFixed(1)}%)</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Calculation Method</h4>
                <div className="text-xs text-gray-700 space-y-2">
                  <p className="font-medium">Step 1: Calculate angles from power factors</p>
                  <p className="pl-3">Initial φ = cos⁻¹({powerFactorResults.initialTotalPF}) = {powerFactorResults.initialAngleDegrees}°</p>
                  <p className="pl-3">Target φ = cos⁻¹({powerFactorResults.targetTotalPF}) = {powerFactorResults.targetAngleDegrees}°</p>
                  
                  <p className="font-medium">Step 2: Calculate tangent values</p>
                  <p className="pl-3">tan(φ₁) = {powerFactorResults.initialTan}</p>
                  <p className="pl-3">tan(φ₂) = {powerFactorResults.targetTan}</p>
                  
                  <p className="font-medium">Step 3: Calculate required reactive power</p>
                  <p className="pl-3">kVAr = P × [tan(φ₁) - tan(φ₂)]</p>
                  <p className="pl-3">kVAr = {powerFactorInputs.loadPower} × [{powerFactorResults.initialTan} - {powerFactorResults.targetTan}]</p>
                  <p className="pl-3">kVAr = {powerFactorResults.kVArRequired}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Info section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Power factor correction improves electrical efficiency by reducing reactive power demand.</li>
          <li>Low power factor (below 0.9) results in increased apparent power (kVA) for the same active power (kW), reducing system capacity.</li>
          <li>Capacitor banks provide reactive power locally, reducing the amount that must be supplied by the utility.</li>
          <li>Benefits include: reduced electricity bills (if utility charges for kVA or kVAr), lower voltage drop, reduced system losses, and increased capacity.</li>
          <li>Harmonic distortion can impact the effectiveness of power factor correction and should be considered in your calculations.</li>
          <li>For systems with significant harmonics, consider using detuned capacitor banks to avoid resonance issues.</li>
        </ul>
      </div>
    </>
  );

  return (
    <CalculatorWrapper
      title="Power Quality Calculators"
      discipline="electrical"
      calculatorType="loadBalancing"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'loadBalancing'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('loadBalancing')}
        >
          Load Balancing
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'powerFactor'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('powerFactor')}
        >
          Power Factor
        </button>
      </div>

      {/* Render the active calculator */}
      {activeTab === 'loadBalancing' ? renderLoadBalancingCalculator() : renderPowerFactorCalculator()}
    </div>
    </CalculatorWrapper>
  );
};

export default LoadBalancingCalculator;