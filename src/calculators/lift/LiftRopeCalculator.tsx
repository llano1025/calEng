import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface LiftRopeCalculatorProps {
  onShowTutorial?: () => void;
}

interface RopeCalculationResults {
  ratedLoadCapacity: number;
  carWeight: number;
  totalCarSideWeight: number;
  dynamicLoad: number;
  tensionPerRope: number;
  minimumRopes: number;
  actualSafetyFactor: number;
  isCompliant: boolean;
  calculationSteps: CalculationStep[];
}

interface CalculationStep {
  step: number;
  description: string;
  formula: string;
  calculation: string;
  result: string;
  unit: string;
}

const LiftRopeCalculator: React.FC<LiftRopeCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Lift Rope Sizing Calculator',
    discipline: 'electrical',
    calculatorType: 'lift-rope'
  });

  // Input states
  const [numberOfPassengers, setNumberOfPassengers] = useState<number>(16);
  const [weightPerPassenger, setWeightPerPassenger] = useState<number>(75);
  const [carWeight, setCarWeight] = useState<number>(700);
  const [counterweightSetting, setCounterweightSetting] = useState<number>(50);
  const [counterweightWeight, setCounterweightWeight] = useState<number>(1300);
  const [accelerationFactor, setAccelerationFactor] = useState<number>(0.1);
  const [ropeBreakingStrength, setRopeBreakingStrength] = useState<number>(64.5);
  const [ropeDiameter, setRopeDiameter] = useState<number>(13);
  const [safetyFactor, setSafetyFactor] = useState<number>(12);
  const [calculationMode, setCalculationMode] = useState<'passengers' | 'direct'>('passengers');
  const [directLoadCapacity, setDirectLoadCapacity] = useState<number>(1200);

  // Results state
  const [results, setResults] = useState<RopeCalculationResults | null>(null);

  // Calculate results whenever inputs change
  useEffect(() => {
    calculateResults();
  }, [
    numberOfPassengers,
    weightPerPassenger,
    carWeight,
    counterweightSetting,
    counterweightWeight,
    accelerationFactor,
    ropeBreakingStrength,
    safetyFactor,
    calculationMode,
    directLoadCapacity,
    ropeDiameter
  ]);

  const calculateResults = () => {
    try {
      const steps: CalculationStep[] = [];
      let stepCounter = 1;

      // Step 1: Calculate rated load capacity
      const ratedLoadCapacity = calculationMode === 'passengers' 
        ? numberOfPassengers * weightPerPassenger 
        : directLoadCapacity;
      
      if (calculationMode === 'passengers') {
        steps.push({
          step: stepCounter++,
          description: "Calculate rated load capacity",
          formula: "Rated Load = Number of Passengers × Weight per Passenger",
          calculation: `${numberOfPassengers} × ${weightPerPassenger}`,
          result: ratedLoadCapacity.toString(),
          unit: "kg"
        });
      }

      // Step 2: Calculate car weight from counterweight (if using counterweight method)
      let calculatedCarWeight = carWeight;
      const counterweightLoad = ratedLoadCapacity * (counterweightSetting / 100);
      
      if (counterweightWeight > 0) {
        calculatedCarWeight = counterweightWeight - counterweightLoad;
        steps.push({
          step: stepCounter++,
          description: "Calculate car weight from counterweight",
          formula: "Car Weight = Counterweight Weight - (Rated Load × Counterweight Setting %)",
          calculation: `${counterweightWeight} - (${ratedLoadCapacity} × ${counterweightSetting}%)`,
          result: calculatedCarWeight.toString(),
          unit: "kg"
        });
      }

      // Step 3: Calculate total weight on car side
      const totalCarSideWeight = calculatedCarWeight + ratedLoadCapacity;
      steps.push({
        step: stepCounter++,
        description: "Calculate total weight on car side",
        formula: "Total Car Side Weight = Car Weight + Rated Load",
        calculation: `${calculatedCarWeight} + ${ratedLoadCapacity}`,
        result: totalCarSideWeight.toString(),
        unit: "kg"
      });

      // Step 4: Apply acceleration factor
      const accelerationMultiplier = 1 + accelerationFactor;
      const dynamicLoad = totalCarSideWeight * accelerationMultiplier;
      steps.push({
        step: stepCounter++,
        description: "Apply acceleration factor",
        formula: "Dynamic Load = Total Car Side Weight × (1 + Acceleration Factor)",
        calculation: `${totalCarSideWeight} × (1 + ${accelerationFactor})`,
        result: dynamicLoad.toString(),
        unit: "kg"
      });

      // Step 5: Calculate tension per rope with safety factor
      const tensionPerRopeKg = (dynamicLoad * safetyFactor) / 1; // For 1 rope initially
      const tensionPerRopeN = tensionPerRopeKg * 9.81;
      const tensionPerRopeKN = tensionPerRopeN / 1000;
      
      steps.push({
        step: stepCounter++,
        description: "Calculate tension per rope (for 1 rope)",
        formula: "Tension per Rope = (Dynamic Load × Safety Factor × 9.81) / Number of Ropes",
        calculation: `(${dynamicLoad} × ${safetyFactor} × 9.81) / 1`,
        result: tensionPerRopeKN.toFixed(2),
        unit: "kN"
      });

      // Step 6: Calculate minimum number of ropes
      const minimumRopes = Math.ceil(tensionPerRopeKN / ropeBreakingStrength);
      steps.push({
        step: stepCounter++,
        description: "Calculate minimum number of ropes",
        formula: "Minimum Ropes = ceil(Tension per Rope / Rope Breaking Strength)",
        calculation: `ceil(${tensionPerRopeKN.toFixed(2)} / ${ropeBreakingStrength})`,
        result: minimumRopes.toString(),
        unit: "ropes"
      });

      // Step 7: Calculate actual tension per rope with minimum ropes
      const actualTensionPerRope = tensionPerRopeKN / minimumRopes;
      steps.push({
        step: stepCounter++,
        description: "Calculate actual tension per rope",
        formula: "Actual Tension per Rope = Total Tension / Minimum Ropes",
        calculation: `${tensionPerRopeKN.toFixed(2)} / ${minimumRopes}`,
        result: actualTensionPerRope.toFixed(2),
        unit: "kN"
      });

      // Step 8: Calculate actual safety factor
      const actualSafetyFactor = ropeBreakingStrength / actualTensionPerRope * safetyFactor;
      steps.push({
        step: stepCounter++,
        description: "Verify safety factor",
        formula: "Actual Safety Factor = Rope Breaking Strength / Actual Tension per Rope",
        calculation: `${ropeBreakingStrength} / ${actualTensionPerRope.toFixed(2)}`,
        result: actualSafetyFactor.toFixed(2),
        unit: "-"
      });

      // Check compliance
      const isCompliant = actualTensionPerRope <= ropeBreakingStrength && actualSafetyFactor >= safetyFactor;

      setResults({
        ratedLoadCapacity,
        carWeight: calculatedCarWeight,
        totalCarSideWeight,
        dynamicLoad,
        tensionPerRope: actualTensionPerRope,
        minimumRopes,
        actualSafetyFactor,
        isCompliant,
        calculationSteps: steps
      });

    } catch (error) {
      console.error('Calculation error:', error);
      setResults(null);
    }
  };

  return (
    <CalculatorWrapper
      title="Lift Rope Sizing Calculator"
      discipline="electrical"
      calculatorType="lift-rope"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
          
          {/* Calculation Mode Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calculation Mode
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="passengers"
                  checked={calculationMode === 'passengers'}
                  onChange={(e) => setCalculationMode(e.target.value as 'passengers' | 'direct')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">Calculate from Passengers</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="direct"
                  checked={calculationMode === 'direct'}
                  onChange={(e) => setCalculationMode(e.target.value as 'passengers' | 'direct')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">Direct Load Input</span>
              </label>
            </div>
          </div>

          {/* Load Capacity Inputs */}
          {calculationMode === 'passengers' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Passengers
                </label>
                <input
                  type="number"
                  value={numberOfPassengers}
                  onChange={(e) => setNumberOfPassengers(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight per Passenger (kg)
                </label>
                <input
                  type="number"
                  value={weightPerPassenger}
                  onChange={(e) => setWeightPerPassenger(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rated Load Capacity (kg)
              </label>
              <input
                type="number"
                value={directLoadCapacity}
                onChange={(e) => setDirectLoadCapacity(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
          )}

          <div className="border-t border-gray-300 my-4"></div>
          
          {/* Car and Counterweight Parameters */}
          <h4 className="font-medium mb-3">Car & Counterweight Parameters</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Car Weight (kg)
            </label>
            <input
              type="number"
              value={carWeight}
              onChange={(e) => setCarWeight(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Counterweight Setting (%)
            </label>
            <input
              type="number"
              value={counterweightSetting}
              onChange={(e) => setCounterweightSetting(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Counterweight Weight (kg)
              <span className="text-xs text-gray-500 ml-1">(Optional - for car weight calculation)</span>
            </label>
            <input
              type="number"
              value={counterweightWeight}
              onChange={(e) => setCounterweightWeight(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>

          <div className="border-t border-gray-300 my-4"></div>
          
          {/* Rope and Safety Parameters */}
          <h4 className="font-medium mb-3">Rope & Safety Parameters</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rope Diameter (mm)
            </label>
            <input
              type="number"
              value={ropeDiameter}
              onChange={(e) => setRopeDiameter(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rope Breaking Strength (kN)
            </label>
            <input
              type="number"
              value={ropeBreakingStrength}
              onChange={(e) => setRopeBreakingStrength(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Safety Factor
            </label>
            <input
              type="number"
              value={safetyFactor}
              onChange={(e) => setSafetyFactor(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acceleration Factor (g)
            </label>
            <input
              type="number"
              value={accelerationFactor}
              onChange={(e) => setAccelerationFactor(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          {results && (
            <>
              {/* Summary Results */}
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <div className={`p-3 rounded-md mb-4 ${
                  results.isCompliant 
                    ? 'bg-green-100 border border-green-300' 
                    : 'bg-red-100 border border-red-300'
                }`}>
                  <p className={`font-bold ${
                    results.isCompliant ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {results.isCompliant 
                      ? 'PASS ✓ Rope sizing is adequate'
                      : 'FAIL ✗ Rope sizing is inadequate'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Minimum Ropes Required:</p>
                    <p className="font-semibold text-lg text-gray-800">{results.minimumRopes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tension per Rope:</p>
                    <p className="font-semibold text-lg text-gray-800">{results.tensionPerRope.toFixed(2)} kN</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Actual Safety Factor:</p>
                    <p className={`font-semibold text-lg ${
                      results.actualSafetyFactor >= safetyFactor ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {results.actualSafetyFactor.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Dynamic Load:</p>
                    <p className="font-semibold text-lg text-gray-800">{results.dynamicLoad.toFixed(0)} kg</p>
                  </div>
                </div>
              </div>

              {/* Design Criteria Assessment */}
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <h5 className="font-medium text-gray-800 mb-3">Design Criteria Assessment</h5>
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Criteria</th>
                      <th className="px-3 py-2 text-left">Required</th>
                      <th className="px-3 py-2 text-left">Actual</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Rope Strength</td>
                      <td className="px-3 py-2">≥ {results.tensionPerRope.toFixed(2)} kN</td>
                      <td className="px-3 py-2">{ropeBreakingStrength} kN</td>
                      <td className={`px-3 py-2 font-medium ${
                        ropeBreakingStrength >= results.tensionPerRope ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {ropeBreakingStrength >= results.tensionPerRope ? 'PASS ✓' : 'FAIL ✗'}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">Safety Factor</td>
                      <td className="px-3 py-2">≥ {safetyFactor}</td>
                      <td className="px-3 py-2">{results.actualSafetyFactor.toFixed(2)}</td>
                      <td className={`px-3 py-2 font-medium ${
                        results.actualSafetyFactor >= safetyFactor ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {results.actualSafetyFactor >= safetyFactor ? 'PASS ✓' : 'FAIL ✗'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Step-by-Step Calculations */}
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <h5 className="font-medium text-gray-800 mb-3">Step-by-Step Calculations</h5>
                <div className="space-y-3">
                  {results.calculationSteps.map((step) => (
                    <div key={step.step} className="border-l-4 border-blue-400 pl-4 py-2">
                      <p className="font-medium text-sm text-gray-700">
                        Step {step.step}: {step.description}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Formula:</strong> {step.formula}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Calculation:</strong> {step.calculation}
                      </p>
                      <p className="text-sm text-blue-700 font-medium">
                        <strong>Result:</strong> {step.result} {step.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Load Summary */}
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <h5 className="font-medium text-gray-800 mb-3">Load Summary</h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Rated Load Capacity:</p>
                    <p className="font-semibold text-gray-800">{results.ratedLoadCapacity} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Car Weight:</p>
                    <p className="font-semibold text-gray-800">{results.carWeight} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Car Side Weight:</p>
                    <p className="font-semibold text-gray-800">{results.totalCarSideWeight} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Dynamic Load (with acceleration):</p>
                    <p className="font-semibold text-gray-800">{results.dynamicLoad.toFixed(0)} kg</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Information Panel */}
          <div className="bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">Design Notes</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800">
              <li>Calculations follow standard lift design principles with safety factors.</li>
              <li>Acceleration factor typically ranges from 0.1g to 0.2g for normal passenger lifts.</li>
              <li>Safety factor of 12 is commonly used for passenger lifts as per international standards.</li>
              <li>Rope breaking strength should be verified with manufacturer specifications.</li>
              <li>Consider additional factors like rope stretch, wear, and environmental conditions.</li>
              <li>Counterweight setting of 50% is typical but can vary from 40% to 50% depending on design.</li>
            </ul>
          </div>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default LiftRopeCalculator;