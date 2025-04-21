import React, { useState, useEffect } from 'react';

interface FuseOperationTimeCalculatorProps {
  onShowTutorial?: () => void;
}

const FuseOperationTimeCalculator: React.FC<FuseOperationTimeCalculatorProps> = ({ onShowTutorial }) => {
  // State for input values
  const [ratedCurrent, setRatedCurrent] = useState<number | string>('');
  const [actualCurrent, setActualCurrent] = useState<number | string>('');
  const [fuseType, setFuseType] = useState<string>('gG'); // Default to general purpose (gG)
  const [operationTime, setOperationTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Calculate operation time based on BS88 part 2 characteristics
  const calculateOperationTime = () => {
    // Clear previous error messages
    setErrorMessage('');
    
    // Validate inputs
    if (!ratedCurrent || !actualCurrent) {
      setOperationTime(null);
      return;
    }
    
    const ratedCurrentNum = Number(ratedCurrent);
    const actualCurrentNum = Number(actualCurrent);
    
    if (isNaN(ratedCurrentNum) || isNaN(actualCurrentNum) || ratedCurrentNum <= 0 || actualCurrentNum <= 0) {
      setErrorMessage('Please enter valid positive numbers for both current values.');
      setOperationTime(null);
      return;
    }
    
    const ratio = actualCurrentNum / ratedCurrentNum;
    
    // If current is less than rating, the fuse won't blow
    if (ratio <= 1.1) {
      setOperationTime(Infinity);
      return;
    }
    
    // Different calculation based on fuse type and current ratio
    // These values are approximations based on typical BS88 part 2 fuse characteristics
    let time: number;
    
    if (fuseType === 'gG') {
      // General purpose fuse (gG) calculation
      if (ratio <= 1.5) {
        // Region 1: Overload zone (slow operation)
        time = 10000 / Math.pow(ratio - 1, 2);
      } else if (ratio <= 3) {
        // Region 2: Transition zone
        time = 100 / Math.pow(ratio - 1.2, 1.8);
      } else if (ratio <= 10) {
        // Region 3: Fast operation zone
        time = 30 / Math.pow(ratio - 0.9, 1.5);
      } else {
        // Region 4: Very high overcurrent
        time = 8 / Math.pow(ratio, 0.8);
      }
    } else if (fuseType === 'aM') {
      // Motor circuit fuse (aM) calculation - higher tolerance for brief overloads
      if (ratio <= 3) {
        // aM fuses allow higher overloads without operating
        time = 20000 / Math.pow(ratio - 1.8, 2.2);
      } else if (ratio <= 7) {
        // Transition zone
        time = 80 / Math.pow(ratio - 1.5, 1.7);
      } else {
        // Fast operation zone
        time = 10 / Math.pow(ratio, 0.7);
      }
    } else {
      // Default to general formula if type not recognized
      time = 100 / Math.pow(ratio - 1, 1.8);
    }
    
    setOperationTime(time);
  };
  
  // Calculate on input change
  useEffect(() => {
    calculateOperationTime();
  }, [ratedCurrent, actualCurrent, fuseType]);
  
  // Format time display
  const formatTime = (time: number | null): string => {
    if (time === null) return '-';
    if (time === Infinity) return 'Will not operate';
    
    if (time < 0.1) {
      return `${(time * 1000).toFixed(1)} ms`;
    } else if (time < 60) {
      return `${time.toFixed(2)} seconds`;
    } else if (time < 3600) {
      const minutes = Math.floor(time / 60);
      const seconds = time % 60;
      return `${minutes} min ${seconds.toFixed(0)} sec`;
    } else {
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      return `${hours} hr ${minutes} min`;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">BS88 Part 2 Fuse Operation Time Calculator</h2>
        {onShowTutorial && (
          <button
            onClick={onShowTutorial}
            className="text-blue-600 hover:text-blue-800"
          >
            Tutorial
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-700 mb-2" htmlFor="ratedCurrent">
            Fuse Rated Current (In) [A]
          </label>
          <input
            id="ratedCurrent"
            type="number"
            min="0.1"
            step="0.1"
            value={ratedCurrent}
            onChange={(e) => setRatedCurrent(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter rated current"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2" htmlFor="actualCurrent">
            Actual Current (I) [A]
          </label>
          <input
            id="actualCurrent"
            type="number"
            min="0.1"
            step="0.1"
            value={actualCurrent}
            onChange={(e) => setActualCurrent(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter actual current"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2" htmlFor="fuseType">
            Fuse Type
          </label>
          <select
            id="fuseType"
            value={fuseType}
            onChange={(e) => setFuseType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="gG">General Purpose (gG)</option>
            <option value="aM">Motor Circuit (aM)</option>
          </select>
          <p className="text-sm text-gray-600 mt-1">
            gG: General purpose fuses for conductor protection
            <br />
            aM: Motor circuit fuses with high overload tolerance
          </p>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={calculateOperationTime}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Calculate
          </button>
        </div>
      </div>
      
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {errorMessage}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Operation Time:</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatTime(operationTime)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Current Ratio (I/In):</p>
            <p className="text-2xl font-bold text-blue-700">
              {ratedCurrent && actualCurrent && !isNaN(Number(ratedCurrent)) && !isNaN(Number(actualCurrent)) && Number(ratedCurrent) > 0
                ? (Number(actualCurrent) / Number(ratedCurrent)).toFixed(2)
                : '-'}
            </p>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium">Note:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>This calculator provides an approximation based on typical BS88 Part 2 fuse characteristics.</li>
            <li>Actual fuse operation may vary based on manufacturer-specific data.</li>
            <li>The calculator considers total clearance time, not just pre-arcing time.</li>
            <li>For precise protection coordination, always refer to manufacturer's data sheets.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FuseOperationTimeCalculator;