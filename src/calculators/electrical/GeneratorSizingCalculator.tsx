import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface GensetLouverSizingProps {
  onShowTutorial?: () => void;
}

interface GeneratorSizingProps {
  onShowTutorial?: () => void;
}

interface CombinedGeneratorCalculatorProps {
  onShowTutorial?: () => void;
}

// Define starting methods for dropdown options
const STARTING_METHODS = [
  { value: 'dol', label: 'DOL', multiplier: 6 },
  { value: 'sd', label: 'Star-Delta (S/D)', multiplier: 2.5 },
  { value: 'vsd', label: 'VSD/VVVF', multiplier: 1.8 },
  { value: 'softstart', label: 'Soft Start', multiplier: 2 },
  { value: 'none', label: 'None (Resistive Load)', multiplier: 1 }
];

// Define interface for load items
interface LoadItem {
  id: string;
  name: string;
  powerFactor: number;
  steadyKW: number;
  startingMethod: string;
  currentMultiplier: number;
  stepAssignment: number;
  steadyKVA: number;
  startingKW: number;
  startingKVA: number;
}

// Main combined component
const CombinedGeneratorCalculator: React.FC<CombinedGeneratorCalculatorProps> = ({ onShowTutorial }) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'generator' | 'louver'>('generator');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Generator Calculators</h2>
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
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium transition-colors ${
            activeTab === 'generator'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('generator')}
        >
          Generator Sizing
        </button>
        <button
          className={`py-2 px-4 font-medium transition-colors ${
            activeTab === 'louver'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('louver')}
        >
          Louver Sizing
        </button>
      </div>
      
      {/* Content Based on Active Tab */}
      {activeTab === 'generator' ? (
        <GeneratorSizingCalculator onShowTutorial={onShowTutorial} />
      ) : (
        <GensetLouverSizingCalculator onShowTutorial={onShowTutorial} />
      )}
    </div>
  );
};

// ======================== GENERATOR SIZING CALCULATOR ========================

const GeneratorSizingCalculator: React.FC<GeneratorSizingProps> = ({ onShowTutorial }) => {
  // State for generator specifications
  const [gensetRatingKVA, setGensetRatingKVA] = useState<number>(1000);
  const [gensetPowerFactor, setGensetPowerFactor] = useState<number>(0.8);
  const [stepLoadAcceptance, setStepLoadAcceptance] = useState<number>(60);
  const [maxVoltageDropAllowed, setMaxVoltageDropAllowed] = useState<number>(20);
  
  // State for load list
  const [loads, setLoads] = useState<LoadItem[]>([
    {
      id: '1',
      name: 'Emergency Lighting',
      powerFactor: 0.95,
      steadyKW: 50,
      startingMethod: 'none',
      currentMultiplier: 1,
      stepAssignment: 3,
      steadyKVA: 52.63,
      startingKW: 50,
      startingKVA: 52.63
    }
  ]);
  
  // State for number of steps
  const [numberOfSteps, setNumberOfSteps] = useState<number>(3);
  
  // State for calculation results
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [stepTotals, setStepTotals] = useState<any[]>([]);
  const [gensetCriteria, setGensetCriteria] = useState({
    steadyKWPassed: false,
    steadyKVAPassed: false,
    stepLoadPassed: false,
    overloadCapacityPassed: false,
    voltageDipPassed: false,
    overallPassed: false
  });
  
  // Calculate derived generator values
  const gensetRatingKW = gensetRatingKVA * gensetPowerFactor;
  const maxAcceptableStepLoad = gensetRatingKW * (stepLoadAcceptance / 100);
  const overloadCapacity = gensetRatingKW * 1.1;

  // Calculate load KVA and starting values whenever loads are updated
  useEffect(() => {
    const updatedLoads = loads.map(load => {
      const steadyKVA = load.steadyKW / load.powerFactor;
      const startingKW = load.steadyKW * load.currentMultiplier;
      const startingKVA = steadyKVA * load.currentMultiplier;
      
      return {
        ...load,
        steadyKVA,
        startingKW,
        startingKVA
      };
    });
    
    setLoads(updatedLoads);
  }, [loads.map(l => `${l.steadyKW}-${l.powerFactor}-${l.currentMultiplier}`)]);

  // Function to add a new load
  const addLoad = () => {
    const newId = (loads.length + 1).toString();
    
    setLoads([
      ...loads,
      {
        id: newId,
        name: '',
        powerFactor: 0.85,
        steadyKW: 0,
        startingMethod: 'sd',
        currentMultiplier: 2.5,
        stepAssignment: 1,
        steadyKVA: 0,
        startingKW: 0,
        startingKVA: 0
      }
    ]);
  };

  // Function to remove a load
  const removeLoad = (id: string) => {
    if (loads.length > 1) {
      setLoads(loads.filter(load => load.id !== id));
    }
  };

  // Function to update a load property
  const updateLoad = (id: string, field: keyof LoadItem, value: any) => {
    setLoads(loads.map(load => {
      if (load.id === id) {
        const updatedLoad = { ...load, [field]: value };
        
        // If we're changing the starting method, update the current multiplier
        if (field === 'startingMethod') {
          const method = STARTING_METHODS.find(m => m.value === value);
          if (method) {
            updatedLoad.currentMultiplier = method.multiplier;
          }
        }
        
        // If we're updating power factor, steady kW, or current multiplier, recalculate derived values
        if (['powerFactor', 'steadyKW', 'currentMultiplier'].includes(field)) {
          updatedLoad.steadyKVA = updatedLoad.steadyKW / updatedLoad.powerFactor;
          updatedLoad.startingKW = updatedLoad.steadyKW * updatedLoad.currentMultiplier;
          updatedLoad.startingKVA = updatedLoad.steadyKVA * updatedLoad.currentMultiplier;
        }
        
        return updatedLoad;
      }
      return load;
    }));
  };

  // Function to perform the generator sizing calculation
  const performCalculation = () => {
    // Calculate totals for each step
    const stepData = [];
    for (let i = 1; i <= numberOfSteps; i++) {
      const loadsInStep = loads.filter(load => load.stepAssignment === i);
      
      const stepSteadyKW = loadsInStep.reduce((sum, load) => sum + load.steadyKW, 0);
      const stepSteadyKVA = loadsInStep.reduce((sum, load) => sum + load.steadyKVA, 0);
      const stepStartingKW = loadsInStep.reduce((sum, load) => sum + load.startingKW, 0);
      const stepStartingKVA = loadsInStep.reduce((sum, load) => sum + load.startingKVA, 0);
      
      stepData.push({
        step: i,
        steadyKW: stepSteadyKW,
        steadyKVA: stepSteadyKVA,
        startingKW: stepStartingKW,
        startingKVA: stepStartingKVA
      });
    }
    setStepTotals(stepData);
    
    // Calculate total steady loads
    const totalSteadyKW = loads.reduce((sum, load) => sum + load.steadyKW, 0);
    const totalSteadyKVA = loads.reduce((sum, load) => sum + load.steadyKVA, 0);
    
    // Find the max transient load in any step
    const maxStepStartingKW = Math.max(...stepData.map(step => step.startingKW));
    const maxStepStartingKVA = Math.max(...stepData.map(step => step.startingKVA));
    
    // Calculate maximum transient load
    let maxTransientLoad = 0;
    
    // Assuming steps are executed in sequence
    let cumulativeSteadyKW = 0;
    for (let i = 0; i < stepData.length; i++) {
      // Previous steps' steady load + current step's starting load
      const transientLoad = cumulativeSteadyKW + stepData[i].startingKW;
      maxTransientLoad = Math.max(maxTransientLoad, transientLoad);
      
      // Add current step's steady load for next iteration
      cumulativeSteadyKW += stepData[i].steadyKW;
    }
    
    // Calculate voltage dip (simple estimation without actual curve)
    // This is a simplified assumption - in reality, would use manufacturer's curve
    const maxStepLoadRatio = maxStepStartingKVA / gensetRatingKVA;
    const estimatedVoltageDip = maxStepLoadRatio * 100 * 0.2; // Simple linear estimation
    
    // Evaluate criteria
    const criteriaResults = {
      steadyKWPassed: gensetRatingKW > totalSteadyKW,
      steadyKVAPassed: gensetRatingKVA > totalSteadyKVA,
      stepLoadPassed: maxAcceptableStepLoad >= maxStepStartingKW,
      overloadCapacityPassed: overloadCapacity > maxTransientLoad,
      voltageDipPassed: estimatedVoltageDip <= maxVoltageDropAllowed,
      overallPassed: false
    };
    
    criteriaResults.overallPassed = 
      criteriaResults.steadyKWPassed && 
      criteriaResults.steadyKVAPassed && 
      criteriaResults.stepLoadPassed && 
      criteriaResults.overloadCapacityPassed && 
      criteriaResults.voltageDipPassed;
    
    setGensetCriteria(criteriaResults);
    setCalculationPerformed(true);
  };

  // Reset calculation
  const resetCalculation = () => {
    setCalculationPerformed(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Generator Specifications</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genset Rating (kVA)
            </label>
            <input
              type="number"
              min="10"
              value={gensetRatingKVA}
              onChange={(e) => setGensetRatingKVA(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genset Power Factor
            </label>
            <input
              type="number"
              min="0.1"
              max="1"
              step="0.01"
              value={gensetPowerFactor}
              onChange={(e) => setGensetPowerFactor(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Step Load Acceptance (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={stepLoadAcceptance}
              onChange={(e) => setStepLoadAcceptance(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Typically 60% for most generators</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Voltage Dip Allowed (%)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={maxVoltageDropAllowed}
              onChange={(e) => setMaxVoltageDropAllowed(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Typically 20% maximum</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Steps
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={numberOfSteps}
            onChange={(e) => setNumberOfSteps(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">How many sequential starting steps</p>
        </div>
        
        <div className="mt-4 p-2 bg-blue-50 rounded-md">
          <p className="text-sm font-medium text-blue-700">Calculated Values:</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-xs text-gray-700">Genset Rating (kW):</p>
              <p className="font-medium">{gensetRatingKW.toFixed(1)} kW</p>
            </div>
            <div>
              <p className="text-xs text-gray-700">Max Step Load Acceptance:</p>
              <p className="font-medium">{maxAcceptableStepLoad.toFixed(1)} kW</p>
            </div>
            <div>
              <p className="text-xs text-gray-700">Overload Capacity (110%):</p>
              <p className="font-medium">{overloadCapacity.toFixed(1)} kW</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg">Load Configuration</h3>
            <button
              onClick={addLoad}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center"
            >
              <span className="mr-1">+</span> Add Load
            </button>
          </div>
          
          <div className="overflow-x-auto bg-white rounded-md">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">Equipment</th>
                  <th className="px-3 py-2 text-left">PF</th>
                  <th className="px-3 py-2 text-left">kW</th>
                  <th className="px-3 py-2 text-left">Starting</th>
                  <th className="px-3 py-2 text-left">Step</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((load) => (
                  <tr key={load.id} className="border-t border-gray-200">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={load.name}
                        onChange={(e) => updateLoad(load.id, 'name', e.target.value)}
                        className="w-full p-1 border rounded-md text-sm"
                        placeholder="Equipment name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.01"
                        value={load.powerFactor}
                        onChange={(e) => updateLoad(load.id, 'powerFactor', Number(e.target.value))}
                        className="w-16 p-1 border rounded-md text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={load.steadyKW}
                        onChange={(e) => updateLoad(load.id, 'steadyKW', Number(e.target.value))}
                        className="w-16 p-1 border rounded-md text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={load.startingMethod}
                        onChange={(e) => updateLoad(load.id, 'startingMethod', e.target.value)}
                        className="w-full p-1 border rounded-md text-sm"
                      >
                        {STARTING_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label} ({method.multiplier}x)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={load.stepAssignment}
                        onChange={(e) => updateLoad(load.id, 'stepAssignment', Number(e.target.value))}
                        className="w-16 p-1 border rounded-md text-sm"
                      >
                        {Array.from({ length: numberOfSteps }, (_, i) => i + 1).map(step => (
                          <option key={step} value={step}>{step}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeLoad(load.id)}
                        disabled={loads.length === 1}
                        className={`p-1 rounded-md ${
                          loads.length === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-800'
                        }`}
                      >
                        <span className="text-xs">Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={performCalculation}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Calculate
          </button>
          {calculationPerformed && (
            <button
              onClick={resetCalculation}
              className="ml-2 bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!calculationPerformed ? (
          <div className="text-center py-8 text-gray-500">
            <p>Enter generator specifications and load details, then click Calculate</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Overall Assessment</h4>
              <div className={`p-3 rounded-md ${gensetCriteria.overallPassed ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                <p className={`font-bold ${gensetCriteria.overallPassed ? 'text-green-700' : 'text-red-700'}`}>
                  {gensetCriteria.overallPassed 
                    ? 'PASS ✓ Generator size is adequate'
                    : 'FAIL ✗ Generator size is inadequate'}
                </p>
                <p className="text-sm mt-1">
                  {gensetCriteria.overallPassed 
                    ? 'All sizing criteria are satisfied' 
                    : 'One or more sizing criteria not satisfied - see details below'}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Criteria Assessment</h4>
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
                  {/* Criteria 1: Genset Rating (kW) > Total Steady Load (kW) */}
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">1. Steady kW</td>
                    <td className="px-3 py-2">
                      Genset kW &gt; Total Steady kW
                    </td>
                    <td className="px-3 py-2">
                      {gensetRatingKW.toFixed(1)} &gt; {loads.reduce((sum, load) => sum + load.steadyKW, 0).toFixed(1)}
                    </td>
                    <td className={`px-3 py-2 font-medium ${gensetCriteria.steadyKWPassed ? 'text-green-600' : 'text-red-600'}`}>
                      {gensetCriteria.steadyKWPassed ? 'PASS ✓' : 'FAIL ✗'}
                    </td>
                  </tr>
                  
                  {/* Criteria 2: Genset Rating (kVA) > Total Steady Load (kVA) */}
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">2. Steady kVA</td>
                    <td className="px-3 py-2">
                      Genset kVA &gt; Total Steady kVA
                    </td>
                    <td className="px-3 py-2">
                      {gensetRatingKVA.toFixed(1)} &gt; {loads.reduce((sum, load) => sum + load.steadyKVA, 0).toFixed(1)}
                    </td>
                    <td className={`px-3 py-2 font-medium ${gensetCriteria.steadyKVAPassed ? 'text-green-600' : 'text-red-600'}`}>
                      {gensetCriteria.steadyKVAPassed ? 'PASS ✓' : 'FAIL ✗'}
                    </td>
                  </tr>
                  
                  {/* Criteria 3: Max. Transient Load in any step (kW) <= Step Load Acceptance */}
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">3. Step Load</td>
                    <td className="px-3 py-2">
                      Step Load Acceptance &gt;= Max Step kW
                    </td>
                    <td className="px-3 py-2">
                      {maxAcceptableStepLoad.toFixed(1)} &gt;= {Math.max(...stepTotals.map(step => step.startingKW)).toFixed(1)}
                    </td>
                    <td className={`px-3 py-2 font-medium ${gensetCriteria.stepLoadPassed ? 'text-green-600' : 'text-red-600'}`}>
                      {gensetCriteria.stepLoadPassed ? 'PASS ✓' : 'FAIL ✗'}
                    </td>
                  </tr>
                  
                  {/* Criteria 4: Genset Overload Capacity (kW) > Max. Transient Load (kW) */}
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-medium">4. Overload</td>
                    <td className="px-3 py-2">
                      110% Capacity &gt; Max Transient
                    </td>
                    <td className="px-3 py-2">
                      {overloadCapacity.toFixed(1)} &gt; {/* Get max transient load value */}
                      {(() => {
                        // Calculate max transient load here to display it
                        let maxTL = 0;
                        let cumulativeSteadyKW = 0;
                        
                        for (let i = 0; i < stepTotals.length; i++) {
                          const tLoad = cumulativeSteadyKW + stepTotals[i].startingKW;
                          maxTL = Math.max(maxTL, tLoad);
                          cumulativeSteadyKW += stepTotals[i].steadyKW;
                        }
                        
                        return maxTL.toFixed(1);
                      })()}
                    </td>
                    <td className={`px-3 py-2 font-medium ${gensetCriteria.overloadCapacityPassed ? 'text-green-600' : 'text-red-600'}`}>
                      {gensetCriteria.overloadCapacityPassed ? 'PASS ✓' : 'FAIL ✗'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Step Load Details</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Step</th>
                      <th className="px-3 py-2 text-right">Steady kW</th>
                      <th className="px-3 py-2 text-right">Steady kVA</th>
                      <th className="px-3 py-2 text-right">Starting kW</th>
                      <th className="px-3 py-2 text-right">Starting kVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stepTotals.map((step) => (
                      <tr key={step.step} className="border-t border-gray-200">
                        <td className="px-3 py-2">{step.step}</td>
                        <td className="px-3 py-2 text-right">{step.steadyKW.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right">{step.steadyKVA.toFixed(1)}</td>
                        <td className={`px-3 py-2 text-right ${step.startingKW > maxAcceptableStepLoad ? 'text-red-600 font-medium' : ''}`}>
                          {step.startingKW.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">{step.startingKVA.toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                      <td className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right">
                        {stepTotals.reduce((sum, step) => sum + step.steadyKW, 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {stepTotals.reduce((sum, step) => sum + step.steadyKVA, 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right">-</td>
                      <td className="px-3 py-2 text-right">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {!gensetCriteria.overallPassed && (
              <div className="mt-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
                <h4 className="font-medium text-yellow-800 mb-2">Recommendations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                  {!gensetCriteria.steadyKWPassed && (
                    <li>Increase generator kW rating to handle the total steady load</li>
                  )}
                  {!gensetCriteria.steadyKVAPassed && (
                    <li>Increase generator kVA rating or improve overall power factor</li>
                  )}
                  {!gensetCriteria.stepLoadPassed && (
                    <li>Redistribute loads into more steps or increase generator size for better step load acceptance</li>
                  )}
                  {!gensetCriteria.overloadCapacityPassed && (
                    <li>Increase generator size to handle the maximum transient load</li>
                  )}
                  {!gensetCriteria.voltageDipPassed && (
                    <li>Increase generator size to reduce voltage dip or use soft starters/VFDs to reduce starting current</li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
        
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Sizing Criteria Reference</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>Genset Rating (kW) &gt; Total Steady Load (kW)</strong> - Ensures generator can handle the continuous power requirements</li>
            <li><strong>Genset Rating (kVA) &gt; Total Steady Load (kVA)</strong> - Accounts for power factor variations in the loads</li>
            <li><strong>Max Step Starting Load (kW) &lt;= Step Load Acceptance</strong> - Prevents overloading during startup of each step</li>
            <li><strong>Genset Overload Capacity &gt; Max Transient Load</strong> - Ensures generator can handle peak demands during sequence starting</li>
            <li><strong>Voltage Dip &lt;= 20%</strong> - Prevents excessive voltage drops that may trip equipment</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== GENSET LOUVER SIZING CALCULATOR ========================

const GensetLouverSizingCalculator: React.FC<GensetLouverSizingProps> = ({ onShowTutorial }) => {
  // State for input values
  const [gensetCapacity, setGensetCapacity] = useState<number>(2000); // Default 2000 kVA
  const [radiatorAirFlow, setRadiatorAirFlow] = useState<number>(1584); // Default 1584 m³/min
  const [combustionRate, setCombustionRate] = useState<number>(135.8); // Default 135.8 m³/min
  
  // Split intake and exhaust louver areas
  const [intakeLouverArea, setIntakeLouverArea] = useState<number>(17); // Default 17 m²
  const [exhaustLouverArea, setExhaustLouverArea] = useState<number>(17); // Default 17 m²
  const [louverEfficiency, setLouverEfficiency] = useState<number>(50); // Default 50%
  
  // Split silencer K-factors
  const [intakeSilencerKFactor, setIntakeSilencerKFactor] = useState<number>(5.1); // Default 5.1
  const [exhaustSilencerKFactor, setExhaustSilencerKFactor] = useState<number>(5.1); // Default 5.1
  
  // User input pressure drops
  const [intakeLouverPressureDrop, setIntakeLouverPressureDrop] = useState<number>(0.055); // Default 0.055 inch w.g.
  const [exhaustLouverPressureDrop, setExhaustLouverPressureDrop] = useState<number>(0.05); // Default 0.05 inch w.g.

  // State for calculated values
  const [intakeEffectiveArea, setIntakeEffectiveArea] = useState<number>(0);
  const [exhaustEffectiveArea, setExhaustEffectiveArea] = useState<number>(0);
  const [intakeVelocity, setIntakeVelocity] = useState<number>(0);
  const [exhaustVelocity, setExhaustVelocity] = useState<number>(0);
  const [intakeSilencerVelocity, setIntakeSilencerVelocity] = useState<number>(0);
  const [exhaustSilencerVelocity, setExhaustSilencerVelocity] = useState<number>(0);
  const [intakeSilencerPressureDrop, setIntakeSilencerPressureDrop] = useState<number>(0);
  const [exhaustSilencerPressureDrop, setExhaustSilencerPressureDrop] = useState<number>(0);
  const [totalSystemPressureDrop, setTotalSystemPressureDrop] = useState<number>(0);
  const [isPressureDropAcceptable, setIsPressureDropAcceptable] = useState<boolean>(true);

  // Calculate all values whenever inputs change
  useEffect(() => {
    // Calculate effective areas
    const intakeEffectiveAreaValue = intakeLouverArea * (louverEfficiency / 100);
    const exhaustEffectiveAreaValue = exhaustLouverArea * (louverEfficiency / 100);
    
    setIntakeEffectiveArea(intakeEffectiveAreaValue);
    setExhaustEffectiveArea(exhaustEffectiveAreaValue);

    // Calculate velocities
    const intakeVelocityValue = (radiatorAirFlow + combustionRate) / intakeEffectiveAreaValue;
    const exhaustVelocityValue = radiatorAirFlow / exhaustEffectiveAreaValue;
    
    setIntakeVelocity(intakeVelocityValue);
    setExhaustVelocity(exhaustVelocityValue);

    // Calculate silencer velocities and pressure drops
    const intakeSilencerVelocityValue = (radiatorAirFlow + combustionRate) / intakeLouverArea;
    const exhaustSilencerVelocityValue = radiatorAirFlow / exhaustLouverArea;
    
    setIntakeSilencerVelocity(intakeSilencerVelocityValue);
    setExhaustSilencerVelocity(exhaustSilencerVelocityValue);

    // Convert to m/s for pressure drop calculation
    const intakeSilencerVelocityMS = intakeSilencerVelocityValue / 60;
    const exhaustSilencerVelocityMS = exhaustSilencerVelocityValue / 60;

    // Calculate silencer pressure drops using K x V² formula
    const intakeSilencerPressureDropPa = intakeSilencerKFactor * intakeSilencerVelocityMS * intakeSilencerVelocityMS;
    const exhaustSilencerPressureDropPa = exhaustSilencerKFactor * exhaustSilencerVelocityMS * exhaustSilencerVelocityMS;
    
    // Convert Pa to inch w.g. (1 Pa = 0.004 inch w.g. approx)
    const intakeSilencerPressureDropInch = intakeSilencerPressureDropPa / 249.08;
    const exhaustSilencerPressureDropInch = exhaustSilencerPressureDropPa / 249.08;
    
    setIntakeSilencerPressureDrop(intakeSilencerPressureDropInch);
    setExhaustSilencerPressureDrop(exhaustSilencerPressureDropInch);

    // Calculate total system pressure drop
    const totalPressureDrop = 
      Number(intakeLouverPressureDrop) + 
      Number(exhaustLouverPressureDrop) + 
      intakeSilencerPressureDropInch + 
      exhaustSilencerPressureDropInch;
    
    setTotalSystemPressureDrop(totalPressureDrop);
    
    // Check if pressure drop is acceptable (less than 0.5 inch w.g.)
    setIsPressureDropAcceptable(totalPressureDrop <= 0.5);
  }, [
    gensetCapacity, 
    radiatorAirFlow, 
    combustionRate, 
    intakeLouverArea, 
    exhaustLouverArea, 
    louverEfficiency, 
    intakeSilencerKFactor, 
    exhaustSilencerKFactor,
    intakeLouverPressureDrop,
    exhaustLouverPressureDrop
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genset Capacity (kVA)
          </label>
          <input
            type="number"
            value={gensetCapacity}
            onChange={(e) => setGensetCapacity(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Radiator Air Flow Rate (m³/min)
          </label>
          <input
            type="number"
            value={radiatorAirFlow}
            onChange={(e) => setRadiatorAirFlow(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Combustion Rate (m³/min)
          </label>
          <input
            type="number"
            value={combustionRate}
            onChange={(e) => setCombustionRate(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Louver Parameters</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Intake Louver Area (m²)
          </label>
          <input
            type="number"
            value={intakeLouverArea}
            onChange={(e) => setIntakeLouverArea(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exhaust Louver Area (m²)
          </label>
          <input
            type="number"
            value={exhaustLouverArea}
            onChange={(e) => setExhaustLouverArea(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Louver Efficiency (%)
          </label>
          <input
            type="number"
            value={louverEfficiency}
            onChange={(e) => setLouverEfficiency(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Pressure Drop Values</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Intake Louver Pressure Drop (inch w.g.)
          </label>
          <input
            type="number"
            value={intakeLouverPressureDrop}
            onChange={(e) => setIntakeLouverPressureDrop(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
            step="0.001"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exhaust Louver Pressure Drop (inch w.g.)
          </label>
          <input
            type="number"
            value={exhaustLouverPressureDrop}
            onChange={(e) => setExhaustLouverPressureDrop(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
            step="0.001"
          />
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h4 className="font-medium mb-3">Silencer Parameters</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Intake Silencer K-Factor
          </label>
          <input
            type="number"
            value={intakeSilencerKFactor}
            onChange={(e) => setIntakeSilencerKFactor(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
            step="0.1"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exhaust Silencer K-Factor
          </label>
          <input
            type="number"
            value={exhaustSilencerKFactor}
            onChange={(e) => setExhaustSilencerKFactor(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
            step="0.1"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Total System Pressure Drop</p>
            <p className={`text-lg ${isPressureDropAcceptable ? 'text-green-600' : 'text-red-600'}`}>
              {totalSystemPressureDrop.toFixed(3)} inch w.g.
              {isPressureDropAcceptable ? ' ✓' : ' ✗'}
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="font-medium mb-2">Intake Louver Details</h4>
          
          <div className="bg-white p-3 rounded-md mb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-600">Effective Area</p>
                <p>{intakeEffectiveArea.toFixed(2)} m²</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pressure Drop</p>
                <p>{Number(intakeLouverPressureDrop).toFixed(3)} inch w.g.</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Velocity (m/min)</p>
                <p>{intakeVelocity.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Velocity (m/s)</p>
                <p>{(intakeVelocity / 60).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Velocity (fpm)</p>
                <p>{(intakeVelocity * 3.28084).toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <h4 className="font-medium mb-2">Exhaust Louver Details</h4>
          
          <div className="bg-white p-3 rounded-md mb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-600">Effective Area</p>
                <p>{exhaustEffectiveArea.toFixed(2)} m²</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pressure Drop</p>
                <p>{Number(exhaustLouverPressureDrop).toFixed(3)} inch w.g.</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Velocity (m/min)</p>
                <p>{exhaustVelocity.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Velocity (m/s)</p>
                <p>{(exhaustVelocity / 60).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Velocity (fpm)</p>
                <p>{(exhaustVelocity * 3.28084).toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <h4 className="font-medium mb-2">Silencer Details</h4>
          
          <div className="bg-white p-3 rounded-md mb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-600">Intake Silencer</p>
                <p>K-Factor: {intakeSilencerKFactor.toFixed(1)}</p>
                <p>Velocity: {(intakeSilencerVelocity / 60).toFixed(2)} m/s</p>
                <p>Pressure Drop: {intakeSilencerPressureDrop.toFixed(3)} inch w.g.</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Exhaust Silencer</p>
                <p>K-Factor: {exhaustSilencerKFactor.toFixed(1)}</p>
                <p>Velocity: {(exhaustSilencerVelocity / 60).toFixed(2)} m/s</p>
                <p>Pressure Drop: {exhaustSilencerPressureDrop.toFixed(3)} inch w.g.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-md mb-4">
            <h5 className="font-medium mb-2">Pressure Drop Summary</h5>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Component</th>
                  <th className="p-2 text-right">Pressure Drop (inch w.g.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-t">Intake Louver</td>
                  <td className="p-2 border-t text-right">{Number(intakeLouverPressureDrop).toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="p-2 border-t">Intake Silencer</td>
                  <td className="p-2 border-t text-right">{intakeSilencerPressureDrop.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="p-2 border-t">Exhaust Louver</td>
                  <td className="p-2 border-t text-right">{Number(exhaustLouverPressureDrop).toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="p-2 border-t">Exhaust Silencer</td>
                  <td className="p-2 border-t text-right">{exhaustSilencerPressureDrop.toFixed(3)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="p-2 border-t">Total System</td>
                  <td className={`p-2 border-t text-right ${isPressureDropAcceptable ? 'text-green-600' : 'text-red-600'}`}>
                    {totalSystemPressureDrop.toFixed(3)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Info section */}
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Important Notes</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>According to Building Department regulations, Intake Louvers must be at least 5m away from any exhaust source (genset exhaust, flues, car park exhaust, etc.).</li>
            <li>The system pressure drop should not exceed 0.5 inch w.g. for most applications.</li>
            <li>Pressure drop values should be verified against manufacturer's specifications for the selected louver model.</li>
            <li>K-factors for silencers can typically be obtained from suppliers. The default value of 5.1 is an estimate.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CombinedGeneratorCalculator;