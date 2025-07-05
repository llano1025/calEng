import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

// Define props type for the component
interface PowerFactorCalculatorProps {
  onShowTutorial?: () => void; // Function to show tutorial
}

// Power Factor Calculator Component
const PowerFactorCalculator: React.FC<PowerFactorCalculatorProps> = ({ onShowTutorial }) => {
  // State for power factor correction calculator inputs
  const [powerFactorInputs, setPowerFactorInputs] = useState({
    loadPower: '1000', // in kW
    initialPowerFactor: '0.7', // initial power factor
    targetPowerFactor: '0.85', // target power factor
    harmonicDistortion: '5', // percentage THD
  });

  // State for calculation results
  const [powerFactorResults, setPowerFactorResults] = useState<any>(null);

  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Power Factor Correction Calculator',
    discipline: 'electrical',
    calculatorType: 'powerFactor'
  });

  // Handler for input changes
  const handlePowerFactorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPowerFactorInputs({ ...powerFactorInputs, [e.target.name]: e.target.value });
    setPowerFactorResults(null); // Clear results on input change
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

    // Save to history and prepare export data
    const inputs = {
      'Load Power': `${powerFactorInputs.loadPower} kW`,
      'Initial Power Factor': powerFactorInputs.initialPowerFactor,
      'Target Power Factor': powerFactorInputs.targetPowerFactor,
      'Harmonic Distortion': `${powerFactorInputs.harmonicDistortion}%`
    };

    const exportResults = {
      'Initial Total Power Factor': results.initialTotalPF,
      'Target Total Power Factor': results.targetTotalPF,
      'Required Capacitor kVAr': `${results.kVArRequired} kVAr`,
      'Standard Capacitor Size': `${results.standardCapacitorSize} kVAr`,
      'kVA Reduction': `${results.kVAReduction} kVA`,
      'Initial kVA': `${results.initialKVA} kVA`,
      'Target kVA': `${results.targetKVA} kVA`
    };

    saveCalculation(inputs, exportResults);
    prepareExportData(inputs, exportResults);
  };

  return (
    <CalculatorWrapper
      title="Power Factor Correction Calculator"
      discipline="electrical"
      calculatorType="powerFactor"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="p-6">

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
      </div>
    </CalculatorWrapper>
  );
};

export default PowerFactorCalculator;