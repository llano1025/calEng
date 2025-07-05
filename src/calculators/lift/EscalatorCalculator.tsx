import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface EscalatorCalculatorProps {
  onShowTutorial?: () => void;
}

// Standard escalator configurations
const ESCALATOR_CONFIGS = [
  { 
    width: 600, 
    avgPassengers: 1.25, 
    stepsPerMeter: 2.5, 
    description: '600mm (24 inches)', 
    passengerDescription: '1.25 passengers per step (5 passengers every 4 steps)' 
  },
  { 
    width: 800, 
    avgPassengers: 1.5, 
    stepsPerMeter: 2.5, 
    description: '800mm (32 inches)', 
    passengerDescription: '1.5 passengers per step (3 passengers every 2 steps)' 
  },
  { 
    width: 1000, 
    avgPassengers: 2.0, 
    stepsPerMeter: 2.5, 
    description: '1000mm (40 inches)', 
    passengerDescription: '2 passengers per step' 
  }
];

// European practical k factors based on real-world performance
const EUROPEAN_K_FACTORS = {
  600: 0.5,   // Practical factor for 600mm escalators
  800: 0.75,  // Practical factor for 800mm escalators
  1000: 1.0   // Practical factor for 1000mm escalators
};

// Speed variation data for European standards
const SPEED_VARIATIONS = {
  1000: {
    0.50: 1.33,
    0.65: 1.24,
    0.75: 1.22
  },
  800: {
    0.50: 1.07,
    0.65: 1.00,
    0.75: 0.98
  },
  600: {
    0.50: 0.80,
    0.65: 0.75,
    0.75: 0.73
  }
};

interface EscalatorResults {
  theoreticalCapacity: number;
  practicalCapacity: number;
  europeanCapacity: number;
  kFactorUsed: number;
  europeanKFactor: number;
  efficiencyRatio: number;
  speedVariationK: number;
  stepsPerMeter: number;
  avgPassengersPerStep: number;
}

const EscalatorCalculator: React.FC<EscalatorCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Escalator Traffic Analysis Calculator',
    discipline: 'electrical',
    calculatorType: 'escalator'
  });

  // Input states
  const [escalatorWidth, setEscalatorWidth] = useState<number>(800);
  const [escalatorSpeed, setEscalatorSpeed] = useState<number>(0.65);
  const [useEuropeanK, setUseEuropeanK] = useState<boolean>(true);
  const [customK, setCustomK] = useState<number>(1.5);
  const [useSpeedVariation, setUseSpeedVariation] = useState<boolean>(false);
  const [numberOfEscalators, setNumberOfEscalators] = useState<number>(1);
  const [operatingHours, setOperatingHours] = useState<number>(12);
  const [peakFactor, setPeakFactor] = useState<number>(1.5);
  
  // Results state
  const [results, setResults] = useState<EscalatorResults>({
    theoreticalCapacity: 0,
    practicalCapacity: 0,
    europeanCapacity: 0,
    kFactorUsed: 0,
    europeanKFactor: 0,
    efficiencyRatio: 0,
    speedVariationK: 0,
    stepsPerMeter: 0,
    avgPassengersPerStep: 0
  });

  // Additional analysis states
  const [totalDailyTraffic, setTotalDailyTraffic] = useState<number>(0);
  const [peakHourTraffic, setPeakHourTraffic] = useState<number>(0);
  const [systemUtilization, setSystemUtilization] = useState<number>(0);

  // Calculate all escalator results
  useEffect(() => {
    const config = ESCALATOR_CONFIGS.find(c => c.width === escalatorWidth) || ESCALATOR_CONFIGS[1];
    const europeanKFactor = EUROPEAN_K_FACTORS[escalatorWidth as keyof typeof EUROPEAN_K_FACTORS] || 1.0;
    
    // Get speed variation k-factor if enabled
    let speedVariationK = europeanKFactor;
    if (useSpeedVariation && SPEED_VARIATIONS[escalatorWidth as keyof typeof SPEED_VARIATIONS]) {
      const speedData = SPEED_VARIATIONS[escalatorWidth as keyof typeof SPEED_VARIATIONS];
      const speeds = Object.keys(speedData).map(Number).sort();
      const closestSpeed = speeds.reduce((prev, curr) => 
        Math.abs(curr - escalatorSpeed) < Math.abs(prev - escalatorSpeed) ? curr : prev
      );
      speedVariationK = speedData[closestSpeed as keyof typeof speedData] || europeanKFactor;
    }
    
    const kFactorUsed = useEuropeanK ? 
      (useSpeedVariation ? speedVariationK : europeanKFactor) : 
      customK;
    
    // Calculate capacities using Ce = 3600 × v × k × s
    const theoreticalCapacity = 3600 * escalatorSpeed * config.avgPassengers * config.stepsPerMeter;
    const practicalCapacity = 3600 * escalatorSpeed * kFactorUsed * config.stepsPerMeter;
    const europeanCapacity = 3600 * escalatorSpeed * europeanKFactor * config.stepsPerMeter;
    
    const efficiencyRatio = (practicalCapacity / theoreticalCapacity) * 100;

    setResults({
      theoreticalCapacity,
      practicalCapacity,
      europeanCapacity,
      kFactorUsed,
      europeanKFactor,
      efficiencyRatio,
      speedVariationK,
      stepsPerMeter: config.stepsPerMeter,
      avgPassengersPerStep: config.avgPassengers
    });

    // Calculate system analysis
    const dailyTraffic = practicalCapacity * operatingHours * numberOfEscalators;
    const peakTraffic = practicalCapacity * peakFactor * numberOfEscalators;
    
    setTotalDailyTraffic(dailyTraffic);
    setPeakHourTraffic(peakTraffic);
    
    // Calculate utilization (assuming some baseline demand)
    const baselineDemand = 1000; // passengers per hour as example
    setSystemUtilization((baselineDemand / (practicalCapacity * numberOfEscalators)) * 100);

    // Save calculation data
    const inputs = {
      'Escalator Width': `${escalatorWidth}mm`,
      'Speed': `${escalatorSpeed} m/s`,
      'Number of Escalators': numberOfEscalators,
      'K-Factor Type': useEuropeanK ? 'European Standard' : 'Custom',
      'K-Factor Value': kFactorUsed.toFixed(2),
      'Operating Hours': `${operatingHours} hours/day`,
      'Peak Factor': peakFactor
    };

    const calculationResults = {
      'Theoretical Capacity': `${theoreticalCapacity.toFixed(0)} passengers/hour`,
      'Practical Capacity': `${practicalCapacity.toFixed(0)} passengers/hour`,
      'Efficiency Ratio': `${efficiencyRatio.toFixed(1)}%`,
      'Total Daily Capacity': `${dailyTraffic.toFixed(0)} passengers/day`,
      'Peak Hour Capacity': `${peakTraffic.toFixed(0)} passengers/hour`,
      'System Utilization': `${systemUtilization.toFixed(1)}%`
    };

    // Note: saveCalculation and prepareExportData handled by CalculatorWrapper
  }, [escalatorWidth, escalatorSpeed, useEuropeanK, customK, useSpeedVariation, numberOfEscalators, operatingHours, peakFactor]);

  const currentConfig = ESCALATOR_CONFIGS.find(c => c.width === escalatorWidth) || ESCALATOR_CONFIGS[1];

  return (
    <CalculatorWrapper
      title="Escalator Traffic Analysis Calculator"
      discipline="electrical"
      calculatorType="escalator"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Escalator Configuration</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Step Width
            </label>
            <select
              value={escalatorWidth}
              onChange={(e) => setEscalatorWidth(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {ESCALATOR_CONFIGS.map(config => (
                <option key={config.width} value={config.width}>
                  {config.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">{currentConfig.passengerDescription}</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rated Speed (m/s)
            </label>
            <input
              type="number"
              value={escalatorSpeed}
              onChange={(e) => setEscalatorSpeed(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              step="0.05"
              min="0.5"
              max="1.0"
            />
            <p className="text-xs text-gray-600 mt-1">Typical range: 0.5 - 0.75 m/s</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Escalators
            </label>
            <input
              type="number"
              value={numberOfEscalators}
              onChange={(e) => setNumberOfEscalators(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="20"
            />
          </div>

          <div className="border-t border-gray-300 my-4"></div>
          <h4 className="font-medium mb-3">K-Factor Configuration</h4>
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="use-european-k"
                checked={useEuropeanK}
                onChange={(e) => setUseEuropeanK(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="use-european-k" className="text-sm font-medium text-gray-700">
                Use European Practical K-Factors
              </label>
            </div>
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <p className="font-medium text-blue-700 mb-1">European Standards:</p>
              <ul className="text-blue-600 space-y-1">
                <li>• 600mm: k = 0.5</li>
                <li>• 800mm: k = 0.75</li>
                <li>• 1000mm: k = 1.0</li>
              </ul>
            </div>
          </div>

          {useEuropeanK && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="use-speed-variation"
                  checked={useSpeedVariation}
                  onChange={(e) => setUseSpeedVariation(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="use-speed-variation" className="text-sm font-medium text-gray-700">
                  Apply Speed Variation Factors
                </label>
              </div>
              <p className="text-xs text-gray-600">
                Uses European speed-dependent k-factors for more accurate capacity estimation
              </p>
            </div>
          )}
          
          {!useEuropeanK && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom K-Factor (passengers per step)
              </label>
              <input
                type="number"
                value={customK}
                onChange={(e) => setCustomK(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                step="0.1"
                min="0.1"
                max="3.0"
              />
            </div>
          )}

          <div className="border-t border-gray-300 my-4"></div>
          <h4 className="font-medium mb-3">Operating Parameters</h4>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operating Hours/Day
              </label>
              <input
                type="number"
                value={operatingHours}
                onChange={(e) => setOperatingHours(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peak Factor
              </label>
              <input
                type="number"
                value={peakFactor}
                onChange={(e) => setPeakFactor(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                step="0.1"
                min="1.0"
                max="3.0"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {/* Primary Capacity Results */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Theoretical Handling Capacity</p>
              <p className="text-xl font-bold text-gray-800">
                {results.theoreticalCapacity.toFixed(0)} <span className="text-sm font-normal text-gray-600">passengers/hour</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ce = 3600 × {escalatorSpeed} × {results.avgPassengersPerStep} × {results.stepsPerMeter}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-md border border-green-200 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Practical Handling Capacity</p>
              <p className="text-xl font-bold text-green-600">
                {results.practicalCapacity.toFixed(0)} <span className="text-sm font-normal text-gray-600">passengers/hour</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Using k-factor: {results.kFactorUsed.toFixed(2)} 
                {useSpeedVariation && useEuropeanK && ` (speed-adjusted: ${results.speedVariationK.toFixed(2)})`}
              </p>
            </div>
            
            {/* <div className="bg-white p-4 rounded-md border border-blue-200 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Capacity Efficiency</p>
              <p className="text-xl font-bold text-blue-600">
                {results.efficiencyRatio.toFixed(1)}% <span className="text-sm font-normal text-gray-600">of theoretical</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Practical vs Theoretical Capacity Ratio
              </p>
            </div> */}
          </div>

          {/* System Analysis */}
          <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm mb-4">
            <h4 className="font-medium text-gray-800 mb-3">System Analysis ({numberOfEscalators} escalator{numberOfEscalators > 1 ? 's' : ''})</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Daily Capacity</p>
                <p className="font-semibold text-gray-800">{totalDailyTraffic.toFixed(0)} passengers</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Peak Hour Capacity</p>
                <p className="font-semibold text-gray-800">{peakHourTraffic.toFixed(0)} passengers</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Single Unit Capacity</p>
                <p className="font-semibold text-gray-800">{results.practicalCapacity.toFixed(0)} passengers/hour</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">System Utilization</p>
                <p className={`font-semibold ${
                  systemUtilization > 80 ? 'text-red-600' :
                  systemUtilization > 60 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {systemUtilization.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Technical Parameters */}
          <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm mb-4">
            <h4 className="font-medium text-gray-800 mb-3">Technical Parameters</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Step Width:</span>
                <span className="font-medium">{escalatorWidth}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Speed:</span>
                <span className="font-medium">{escalatorSpeed} m/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Steps per meter:</span>
                <span className="font-medium">{results.stepsPerMeter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Theoretical passengers/step:</span>
                <span className="font-medium">{results.avgPassengersPerStep}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">European k-factor:</span>
                <span className="font-medium">{results.europeanKFactor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Applied k-factor:</span>
                <span className="font-medium">{results.kFactorUsed.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Comparison with European Standard */}
          {!useEuropeanK && (
            <div className="bg-white p-4 rounded-md border border-orange-200 shadow-sm mb-4">
              <h4 className="font-medium text-orange-700 mb-2">European Standard Comparison</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">European capacity:</span>
                  <span className="font-medium">{results.europeanCapacity.toFixed(0)} passengers/hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difference:</span>
                  <span className={`font-medium ${
                    results.practicalCapacity > results.europeanCapacity ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {((results.practicalCapacity - results.europeanCapacity) / results.europeanCapacity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Information Section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Calculation Methodology</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>Theoretical Capacity:</strong> Ce = 3600 × v × k × s (passengers per hour)</li>
          <li><strong>Speed (v):</strong> Escalator rated speed in m/s, typically 0.5 - 0.75 m/s</li>
          <li><strong>K-factor (k):</strong> Average density of passengers per step</li>
          <li><strong>Steps per meter (s):</strong> Number of steps per meter of escalator length (typically 2.5)</li>
          <li><strong>European Standards:</strong> Practical k-factors account for real-world usage patterns and safety considerations</li>
          <li><strong>Speed Variation:</strong> European data shows k-factor varies with speed for maximum capacity estimation</li>
          <li><strong>Standard Widths:</strong> 600mm (1.25 p/step), 800mm (1.5 p/step), 1000mm (2 p/step)</li>
        </ul>
        
        <div className="mt-4 border-t pt-3">
          <h5 className="font-medium mb-2">Design Considerations</h5>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>European k-factors provide conservative estimates suitable for design purposes</li>
            <li>Peak factors should reflect building usage patterns (office: 1.2-1.5, retail: 2.0-3.0)</li>
            <li>Consider bidirectional traffic requirements for up and down directions</li>
            <li>Safety regulations may limit practical capacity below theoretical maximum</li>
          </ul>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default EscalatorCalculator;