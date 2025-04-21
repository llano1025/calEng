import React, { useState, useEffect } from 'react';

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
    phaseA: '',
    phaseB: '',
    phaseC: '',
  });

  // State for results
  const [averageCurrent, setAverageCurrent] = useState<number | null>(null);
  const [maxDeviation, setMaxDeviation] = useState<number | null>(null);
  const [unbalancePercentage, setUnbalancePercentage] = useState<number | null>(null);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPhaseCurrents((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate results whenever inputs change
  useEffect(() => {
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
    } else {
      // Reset results if inputs are invalid
      setAverageCurrent(null);
      setMaxDeviation(null);
      setUnbalancePercentage(null);
      setIsCompliant(null);
    }
  }, [phaseCurrents]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculation is already done in useEffect
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
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Three-Phase Load Balancing Calculator</h2>
        {onShowTutorial && (
          <button
            onClick={onShowTutorial}
            className="text-blue-600 hover:text-blue-800"
          >
            Tutorial
          </button>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-md mb-6">
        <p className="text-sm">
          BEC clause 7.6.3 specifies that for three-phase 4-wire circuits at or above 400A 
          (circuit protective device rating) with single-phase loads, the maximum allowable 
          percentage current unbalance is 10%.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phase A Current (A)
            </label>
            <input
              type="number"
              name="phaseA"
              value={phaseCurrents.phaseA}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
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
              className="w-full p-2 border border-gray-300 rounded-md"
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
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter current"
              step="0.1"
              min="0"
              required
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Calculate
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </form>

      {unbalancePercentage !== null && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-medium mb-3">Results:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Average Current (Ia)</p>
              <p className="font-medium">{averageCurrent?.toFixed(2)} A</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Maximum Deviation (Id)</p>
              <p className="font-medium">{maxDeviation?.toFixed(2)} A</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Unbalance Percentage (Iu)</p>
              <p className="font-medium">{unbalancePercentage?.toFixed(2)}%</p>
            </div>
            <div className={`p-3 rounded-md ${isCompliant ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-600">Compliance Status</p>
              <p className={`font-medium ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                {isCompliant ? 'Compliant with BEC 7.6.3' : 'Non-compliant with BEC 7.6.3'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">Formula Used:</h4>
            <p className="mb-2">Iu = (Id × 100) / Ia</p>
            <p className="text-sm text-gray-600">Where:</p>
            <ul className="text-sm text-gray-600">
              <li>Iu = percentage current unbalance</li>
              <li>Id = maximum current deviation from the average current</li>
              <li>Ia = average current among three phases</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadBalancingCalculator;