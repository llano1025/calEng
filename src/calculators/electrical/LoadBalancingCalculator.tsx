import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface LoadBalancingCalculatorProps {
  onShowTutorial?: () => void;
}

const LoadBalancingCalculator: React.FC<LoadBalancingCalculatorProps> = ({ onShowTutorial }) => {
  // State for input values
  const [phaseCurrents, setPhaseCurrents] = useState<{
    phaseA: string;
    phaseB: string;
    phaseC: string;
  }>({
    phaseA: '400',
    phaseB: '425',
    phaseC: '370',
  });

  // State for results
  const [averageCurrent, setAverageCurrent] = useState<number | null>(null);
  const [maxDeviation, setMaxDeviation] = useState<number | null>(null);
  const [unbalancePercentage, setUnbalancePercentage] = useState<number | null>(null);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPhaseCurrents((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsCalculated(false);
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
      setIsCompliant(unbalance <= 10);
      setIsCalculated(true);
    } else {
      // Alert user if inputs are invalid
      alert("Please enter valid current values for all three phases.");
    }
  };

  // Reset form
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Three-Phase Load Balancing Calculator</h2>
        
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
    </div>
  );
};

export default LoadBalancingCalculator;