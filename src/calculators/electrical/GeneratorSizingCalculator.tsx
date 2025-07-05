import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

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

// Standard generator ratings
const STANDARD_GENERATOR_SIZES = [200, 250, 300, 400, 500, 625, 750, 1000, 1250, 1500, 2000, 2500, 3000]; // kVA

// Define generator types
type GeneratorType = 'emergency' | 'fsi' | 'general';

// Define generator interface
interface Generator {
  id: string;
  name: string;
  type: GeneratorType;
  rating: number; // kVA
  powerFactor: number;
  stepLoadAcceptance: number;
  maxVoltageDropAllowed: number;
  numberOfSteps: number;
  assignedLoads: string[];
}

// Define load interface for generator loads
interface GeneratorLoad {
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
  category: string;
  floorNumber: number;
  riserNumber: number;
  emergencyPower: boolean;
  fsi: boolean;
  assignedTo: string[]; // Array of generator IDs
  originalConnectedLoad: number;
}

// Define results interface for each generator
interface GeneratorResults {
  id: string;
  totalSteadyKW: number;
  totalSteadyKVA: number;
  maxStepStartingKW: number;
  maxStepStartingKVA: number;
  maxTransientLoad: number;
  utilizationPercentage: number;
  overallPowerFactor: number;
  estimatedVoltageDip: number;
  stepTotals: StepTotal[];
  criteriaResults: {
    steadyKWPassed: boolean;
    steadyKVAPassed: boolean;
    stepLoadPassed: boolean;
    overloadCapacityPassed: boolean;
    voltageDipPassed: boolean;
    overallPassed: boolean;
  };
  loadDetails: GeneratorLoad[];
}

interface StepTotal {
  step: number;
  steadyKW: number;
  steadyKVA: number;
  startingKW: number;
  startingKVA: number;
}

// Main combined component
const CombinedGeneratorCalculator: React.FC<CombinedGeneratorCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Generator Sizing Calculator',
    discipline: 'electrical',
    calculatorType: 'genset'
  });

  // State for the active tab
  const [activeTab, setActiveTab] = useState<'generator' | 'louver'>('generator');

  return (
    <CalculatorWrapper
      title="Generator Calculators"
      discipline="electrical"
      calculatorType="genset"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'generator'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('generator')}
        >
          Generator Sizing
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'louver'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
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
    </CalculatorWrapper>
  );
};

// ======================== GENERATOR SIZING CALCULATOR ========================

const GeneratorSizingCalculator: React.FC<GeneratorSizingProps> = ({ onShowTutorial }) => {
  // State for generators
  const [generators, setGenerators] = useState<Generator[]>([
    {
      id: '1',
      name: 'Emergency Generator',
      type: 'emergency',
      rating: 1000,
      powerFactor: 0.8,
      stepLoadAcceptance: 60,
      maxVoltageDropAllowed: 20,
      numberOfSteps: 3,
      assignedLoads: []
    }
  ]);
  
  // State for loads
  const [loads, setLoads] = useState<GeneratorLoad[]>([
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
      startingKVA: 52.63,
      category: 'Lighting',
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: true,
      fsi: false,
      assignedTo: [],
      originalConnectedLoad: 52.63
    }
  ]);
  
  // State for calculation results
  const [generatorResults, setGeneratorResults] = useState<Record<string, GeneratorResults>>({});
  
  // State for editing generator and load
  const [editingGeneratorId, setEditingGeneratorId] = useState<string | null>(null);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  
  // State for load details expansion
  const [expandedGenerators, setExpandedGenerators] = useState<Set<string>>(new Set());
  
  // State for imported project info
  const [projectInfo, setProjectInfo] = useState<any>(null);

  // Toggle generator load details expansion
  const toggleGeneratorExpansion = (generatorId: string) => {
    setExpandedGenerators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(generatorId)) {
        newSet.delete(generatorId);
      } else {
        newSet.add(generatorId);
      }
      return newSet;
    });
  };

  // Function to import data from Electrical Load Estimation
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string) as any;
          if (importedData && importedData.projectInfo) {
            setProjectInfo(importedData.projectInfo);
            
            // Create generators for Emergency and FSI loads
            const newGenerators: Generator[] = [
              {
                id: 'emergency',
                name: 'Emergency Power Generator',
                type: 'emergency',
                rating: 1000,
                powerFactor: 0.8,
                stepLoadAcceptance: 60,
                maxVoltageDropAllowed: 20,
                numberOfSteps: 3,
                assignedLoads: []
              },
              {
                id: 'fsi',
                name: 'Fire Service Installation Generator',
                type: 'fsi',
                rating: 750,
                powerFactor: 0.8,
                stepLoadAcceptance: 60,
                maxVoltageDropAllowed: 20,
                numberOfSteps: 3,
                assignedLoads: []
              }
            ];
            
            // Convert electrical loads to generator loads
            const newLoads: GeneratorLoad[] = [];
            let loadIdCounter = 1;
            
            // Helper function to map starting method
            const mapStartingMethod = (startingMethod?: string): string => {
              if (!startingMethod) return 'none';
              switch (startingMethod) {
                case 'dol': return 'dol';
                case 'sd': return 'sd';
                case 'vsd': return 'vsd';
                case 'softstart': return 'softstart';
                case 'none': return 'none';
                default: return 'none';
              }
            };
            
            // Process each load category
            const processLoadCategory = (loads: any[], categoryName: string) => {
              loads.forEach((load: any) => {
                if (load.connectedLoad > 0.1 && (load.emergencyPower || load.fsi)) { // Only emergency or FSI loads
                  const powerKW = load.connectedLoad * (load.powerFactor || 0.9); // Convert kVA to kW
                  const mappedStartingMethod = mapStartingMethod(load.startingMethod);
                  const startingMultiplier = STARTING_METHODS.find(m => m.value === mappedStartingMethod)?.multiplier || 1;
                  
                  const newLoad: GeneratorLoad = {
                    id: `load-${loadIdCounter++}`,
                    name: `${load.name || load.type || load.description || 'Unnamed'} (${categoryName})`,
                    powerFactor: load.powerFactor || 0.9,
                    steadyKW: powerKW,
                    startingMethod: mappedStartingMethod,
                    currentMultiplier: startingMultiplier,
                    stepAssignment: 1,
                    steadyKVA: load.connectedLoad,
                    startingKW: powerKW * startingMultiplier,
                    startingKVA: load.connectedLoad * startingMultiplier,
                    category: categoryName,
                    floorNumber: load.floorNumber || 1,
                    riserNumber: load.riserNumber || 1,
                    emergencyPower: load.emergencyPower || false,
                    fsi: load.fsi || (categoryName === 'Fire Service'),
                    assignedTo: [],
                    originalConnectedLoad: load.connectedLoad
                  };
                  
                  // Auto-assign to appropriate generator
                  if (newLoad.fsi) {
                    newLoad.assignedTo = ['fsi'];
                  } else if (newLoad.emergencyPower) {
                    newLoad.assignedTo = ['emergency'];
                  }
                  
                  newLoads.push(newLoad);
                }
              });
            };
            
            // Process all load categories
            if (importedData.lightingSpaces) processLoadCategory(importedData.lightingSpaces, 'Lighting');
            if (importedData.generalPowerSpaces) processLoadCategory(importedData.generalPowerSpaces, 'General Power');
            if (importedData.hvacPlants) processLoadCategory(importedData.hvacPlants, 'HVAC Plant');
            if (importedData.hvacWaterDistributions) processLoadCategory(importedData.hvacWaterDistributions, 'HVAC Water');
            if (importedData.hvacAirDistributions) processLoadCategory(importedData.hvacAirDistributions, 'HVAC Air');
            if (importedData.hvacVentilations) processLoadCategory(importedData.hvacVentilations, 'HVAC Ventilation');
            if (importedData.fireServices) processLoadCategory(importedData.fireServices, 'Fire Service');
            if (importedData.waterPumps) processLoadCategory(importedData.waterPumps, 'Water Pumps');
            if (importedData.liftEscalators) processLoadCategory(importedData.liftEscalators, 'Lift & Escalator');
            if (importedData.hotWaterSystems) processLoadCategory(importedData.hotWaterSystems, 'Hot Water');
            if (importedData.miscInstallations) processLoadCategory(importedData.miscInstallations, 'Miscellaneous');
            
            // Update generator assignments
            newGenerators.forEach(generator => {
              const assignedLoadIds = newLoads
                .filter(load => load.assignedTo.includes(generator.id))
                .map(load => load.id);
              generator.assignedLoads = assignedLoadIds;
            });
            
            // Calculate recommended generator sizes based on total load
            newGenerators.forEach(generator => {
              const totalLoad = newLoads
                .filter(load => load.assignedTo.includes(generator.id))
                .reduce((sum, load) => sum + load.steadyKVA, 0);
              
              // Size generator at ~70% utilization
              const recommendedSize = Math.ceil(totalLoad / 0.7 / 100) * 100;
              const availableSize = STANDARD_GENERATOR_SIZES.find(size => size >= recommendedSize) || STANDARD_GENERATOR_SIZES[STANDARD_GENERATOR_SIZES.length - 1];
              generator.rating = availableSize;
            });
            
            setGenerators(newGenerators);
            setLoads(newLoads);
            setExpandedGenerators(new Set(newGenerators.map(g => g.id))); // Expand all by default
            
            event.target.value = '';
            alert(`Data imported successfully! Created ${newGenerators.length} generators and ${newLoads.length} loads.`);
          } else {
            alert('Invalid file format. Please import a valid Electrical Load Estimation export file.');
          }
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Error importing data. Make sure the file is a valid JSON export from Electrical Load Estimation Calculator.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Calculate results whenever generators or loads change
  useEffect(() => {
    const results: Record<string, GeneratorResults> = {};
    
    generators.forEach(generator => {
      const assignedLoads = loads.filter(load => load.assignedTo.includes(generator.id));
      
      // Calculate totals for each step
      const stepData: StepTotal[] = [];
      for (let i = 1; i <= generator.numberOfSteps; i++) {
        const loadsInStep = assignedLoads.filter(load => load.stepAssignment === i);
        
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
      
      // Calculate totals
      const totalSteadyKW = assignedLoads.reduce((sum, load) => sum + load.steadyKW, 0);
      const totalSteadyKVA = assignedLoads.reduce((sum, load) => sum + load.steadyKVA, 0);
      const maxStepStartingKW = Math.max(...stepData.map(step => step.startingKW));
      const maxStepStartingKVA = Math.max(...stepData.map(step => step.startingKVA));
      
      // Calculate maximum transient load
      let maxTransientLoad = 0;
      let cumulativeSteadyKW = 0;
      for (let i = 0; i < stepData.length; i++) {
        const transientLoad = cumulativeSteadyKW + stepData[i].startingKW;
        maxTransientLoad = Math.max(maxTransientLoad, transientLoad);
        cumulativeSteadyKW += stepData[i].steadyKW;
      }
      
      // Calculate utilization and power factor
      const gensetRatingKW = generator.rating * generator.powerFactor;
      const utilizationPercentage = generator.rating > 0 ? (totalSteadyKVA / generator.rating) * 100 : 0;
      const overallPowerFactor = totalSteadyKVA > 0 ? totalSteadyKW / totalSteadyKVA : 0;
      
      // Calculate voltage dip estimation
      const maxStepLoadRatio = maxStepStartingKVA / generator.rating;
      const estimatedVoltageDip = maxStepLoadRatio * 100 * 0.2; // Simple linear estimation
      
      // Calculate step load acceptance
      const maxAcceptableStepLoad = gensetRatingKW * (generator.stepLoadAcceptance / 100);
      const overloadCapacity = gensetRatingKW * 1.1;
      
      // Evaluate criteria
      const criteriaResults = {
        steadyKWPassed: gensetRatingKW > totalSteadyKW,
        steadyKVAPassed: generator.rating > totalSteadyKVA,
        stepLoadPassed: maxAcceptableStepLoad >= maxStepStartingKW,
        overloadCapacityPassed: overloadCapacity > maxTransientLoad,
        voltageDipPassed: estimatedVoltageDip <= generator.maxVoltageDropAllowed,
        overallPassed: false
      };
      
      criteriaResults.overallPassed = 
        criteriaResults.steadyKWPassed && 
        criteriaResults.steadyKVAPassed && 
        criteriaResults.stepLoadPassed && 
        criteriaResults.overloadCapacityPassed && 
        criteriaResults.voltageDipPassed;
      
      results[generator.id] = {
        id: generator.id,
        totalSteadyKW,
        totalSteadyKVA,
        maxStepStartingKW,
        maxStepStartingKVA,
        maxTransientLoad,
        utilizationPercentage,
        overallPowerFactor,
        estimatedVoltageDip,
        stepTotals: stepData,
        criteriaResults,
        loadDetails: assignedLoads
      };
    });
    
    setGeneratorResults(results);
    
    // Save calculation and prepare export data for generator sizing
    const inputs = {
      'Number of Generators': generators.length,
      'Number of Loads': loads.length,
      'Generator Configurations': generators.map(gen => ({
        'Name': gen.name,
        'Type': gen.type,
        'Rating': `${gen.rating} kVA`,
        'Power Factor': gen.powerFactor,
        'Step Load Acceptance': `${gen.stepLoadAcceptance}%`,
        'Max Voltage Drop': `${gen.maxVoltageDropAllowed}%`
      }))
    };
    
    const exportResults = Object.fromEntries(
      generators.map(generator => {
        const result = results[generator.id];
        if (result) {
          return [`${generator.name} Results`, {
            'Total Steady Load': `${result.totalSteadyKVA.toFixed(1)} kVA`,
            'Utilization': `${result.utilizationPercentage.toFixed(1)}%`,
            'Overall Power Factor': result.overallPowerFactor.toFixed(2),
            'Max Step Starting Load': `${result.maxStepStartingKW.toFixed(1)} kW`,
            'Compliance Status': result.criteriaResults.overallPassed ? 'PASS' : 'FAIL',
            'Assigned Loads': result.loadDetails.length
          }];
        }
        return [`${generator.name} Results`, 'No data'];
      })
    );
    
    // Note: saveCalculation and prepareExportData handled by CalculatorWrapper
  }, [generators, loads]);

  // Function to add a new generator
  const addGenerator = () => {
    const newGenerator: Generator = {
      id: Date.now().toString(),
      name: `Generator ${generators.length + 1}`,
      type: 'general',
      rating: 1000,
      powerFactor: 0.8,
      stepLoadAcceptance: 60,
      maxVoltageDropAllowed: 20,
      numberOfSteps: 3,
      assignedLoads: []
    };
    setGenerators([...generators, newGenerator]);
  };

  // Function to remove a generator
  const removeGenerator = (id: string) => {
    // Remove this generator from any loads assigned to it
    setLoads(loads.map(load => {
      if (load.assignedTo.includes(id)) {
        return {
          ...load,
          assignedTo: load.assignedTo.filter(assignedId => assignedId !== id)
        };
      }
      return load;
    }));

    // Then remove the generator
    setGenerators(generators.filter(g => g.id !== id));
  };

  // Function to update a generator
  const updateGenerator = (id: string, updates: Partial<Generator>) => {
    setGenerators(
      generators.map(generator => 
        generator.id === id ? { ...generator, ...updates } : generator
      )
    );
  };

  // Function to add a new load
  const addLoad = () => {
    const newLoad: GeneratorLoad = {
      id: Date.now().toString(),
      name: `Load ${loads.length + 1}`,
      powerFactor: 0.85,
      steadyKW: 20,
      startingMethod: 'sd',
      currentMultiplier: 2.5,
      stepAssignment: 1,
      steadyKVA: 23.5,
      startingKW: 50,
      startingKVA: 58.8,
      category: 'General',
      floorNumber: 1,
      riserNumber: 1,
      emergencyPower: false,
      fsi: false,
      assignedTo: [],
      originalConnectedLoad: 23.5
    };
    setLoads([...loads, newLoad]);
  };

  // Function to remove a load
  const removeLoad = (id: string) => {
    // Remove this load from any generators it's assigned to
    setGenerators(generators.map(generator => {
      if (generator.assignedLoads.includes(id)) {
        return {
          ...generator,
          assignedLoads: generator.assignedLoads.filter(loadId => loadId !== id)
        };
      }
      return generator;
    }));

    // Then remove the load
    setLoads(loads.filter(load => load.id !== id));
  };

  // Function to update a load
  const updateLoad = (id: string, updates: Partial<GeneratorLoad>) => {
    setLoads(loads.map(load => {
      if (load.id === id) {
        const updatedLoad = { ...load, ...updates };
        
        // If we're changing the starting method, update the current multiplier
        if (updates.startingMethod) {
          const method = STARTING_METHODS.find(m => m.value === updates.startingMethod);
          if (method) {
            updatedLoad.currentMultiplier = method.multiplier;
          }
        }
        
        // Recalculate derived values
        updatedLoad.steadyKVA = updatedLoad.steadyKW / updatedLoad.powerFactor;
        updatedLoad.startingKW = updatedLoad.steadyKW * updatedLoad.currentMultiplier;
        updatedLoad.startingKVA = updatedLoad.steadyKVA * updatedLoad.currentMultiplier;
        
        return updatedLoad;
      }
      return load;
    }));
  };

  // Function to toggle load assignment to a generator
  const toggleLoadAssignment = (loadId: string, generatorId: string) => {
    const load = loads.find(l => l.id === loadId);
    if (!load) return;

    if (load.assignedTo.includes(generatorId)) {
      // Remove assignment
      updateLoad(loadId, {
        assignedTo: load.assignedTo.filter(id => id !== generatorId)
      });
      
      // Also remove from generator's assigned loads
      const generator = generators.find(g => g.id === generatorId);
      if (generator) {
        updateGenerator(generatorId, {
          assignedLoads: generator.assignedLoads.filter(id => id !== loadId)
        });
      }
    } else {
      // Add assignment
      updateLoad(loadId, {
        assignedTo: [...load.assignedTo, generatorId]
      });
      
      // Also add to generator's assigned loads
      const generator = generators.find(g => g.id === generatorId);
      if (generator) {
        updateGenerator(generatorId, {
          assignedLoads: [...generator.assignedLoads, loadId]
        });
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Generator Configuration</h3>
          <div className="flex items-center space-x-2">
            <label
              htmlFor="import-electrical-data"
              className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 shadow-sm cursor-pointer"
            >
              Import Data
            </label>
            <input
              type="file"
              id="import-electrical-data"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </div>
        </div>

        {/* Project Information Display */}
        {projectInfo && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-700 mb-2">Imported Project</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-blue-600">Project:</p>
                <p className="font-semibold text-blue-800">{projectInfo.projectName || 'Unnamed'}</p>
              </div>
              <div>
                <p className="text-blue-600">Building Type:</p>
                <p className="font-semibold text-blue-800">{projectInfo.buildingType || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Generators Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-700">Generators ({generators.length})</h4>
            <button 
              onClick={addGenerator}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Generator
            </button>
          </div>
          
          {generators.map((generator) => (
            <div key={generator.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-medium text-gray-700">{generator.name}</h5>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    generator.type === 'emergency' ? 'bg-red-100 text-red-700' :
                    generator.type === 'fsi' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {generator.type.toUpperCase()}
                  </span>
                  {generators.length > 1 && (
                    <button 
                      onClick={() => removeGenerator(generator.id)} 
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              {editingGeneratorId === generator.id ? (
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Generator Name</label>
                    <input
                      type="text"
                      value={generator.name}
                      onChange={(e) => updateGenerator(generator.id, { name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={generator.type}
                        onChange={(e) => updateGenerator(generator.id, { type: e.target.value as GeneratorType })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="emergency">Emergency Power</option>
                        <option value="fsi">Fire Service Installation</option>
                        <option value="general">General Purpose</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating (kVA)</label>
                      <select
                        value={generator.rating}
                        onChange={(e) => updateGenerator(generator.id, { rating: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {STANDARD_GENERATOR_SIZES.map(size => (
                          <option key={size} value={size}>{size} kVA</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Power Factor</label>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.01"
                        value={generator.powerFactor}
                        onChange={(e) => updateGenerator(generator.id, { powerFactor: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Steps</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={generator.numberOfSteps}
                        onChange={(e) => updateGenerator(generator.id, { numberOfSteps: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Step Load Acceptance (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={generator.stepLoadAcceptance}
                        onChange={(e) => updateGenerator(generator.id, { stepLoadAcceptance: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Voltage Drop (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={generator.maxVoltageDropAllowed}
                        onChange={(e) => updateGenerator(generator.id, { maxVoltageDropAllowed: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={() => setEditingGeneratorId(null)} 
                      className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Rating:</p>
                      <p className="font-semibold text-gray-800">{generator.rating} kVA</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Power Factor:</p>
                      <p className="font-semibold text-gray-800">{generator.powerFactor}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Steps:</p>
                      <p className="font-semibold text-gray-800">{generator.numberOfSteps}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Step Load:</p>
                      <p className="font-semibold text-gray-800">{generator.stepLoadAcceptance}%</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Max Voltage Drop:</p>
                      <p className="font-semibold text-gray-800">{generator.maxVoltageDropAllowed}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Assigned Loads:</p>
                      <p className="font-semibold text-gray-800">{generator.assignedLoads.length}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setEditingGeneratorId(generator.id)} 
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"
                    >
                      <Icons.Edit />
                      <span className="ml-1">Edit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        {/* Loads Section */}
        <div className="border-t border-gray-300 my-6"></div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-700">Loads ({loads.length} total)</h4>
            <button 
              onClick={addLoad} 
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Load
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loads.map((load) => (
              <div key={load.id} className="mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-sm text-gray-700 truncate">{load.name}</h5>
                  <div className="flex space-x-1">
                    {loads.length > 1 && (
                      <button 
                        onClick={() => removeLoad(load.id)} 
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                
                {editingLoadId === load.id ? (
                  <div className="pl-2 border-l-4 border-blue-400">
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Load Name</label>
                      <input 
                        type="text" 
                        value={load.name} 
                        onChange={(e) => updateLoad(load.id, { name: e.target.value })} 
                        className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Steady kW</label>
                        <input 
                          type="number" 
                          value={load.steadyKW} 
                          onChange={(e) => updateLoad(load.id, { steadyKW: Number(e.target.value) })} 
                          className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.1" min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Power Factor</label>
                        <input 
                          type="number" 
                          value={load.powerFactor} 
                          onChange={(e) => updateLoad(load.id, { powerFactor: Number(e.target.value) })} 
                          className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="0.01" min="0.1" max="1"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Starting Method</label>
                        <select 
                          value={load.startingMethod} 
                          onChange={(e) => updateLoad(load.id, { startingMethod: e.target.value })}
                          className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {STARTING_METHODS.map(method => (
                            <option key={method.value} value={method.value}>
                              {method.label} ({method.multiplier}x)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Step Assignment</label>
                        <select 
                          value={load.stepAssignment} 
                          onChange={(e) => updateLoad(load.id, { stepAssignment: Number(e.target.value) })}
                          className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Array.from({ length: Math.max(...generators.map(g => g.numberOfSteps)) }, (_, i) => i + 1).map(step => (
                            <option key={step} value={step}>Step {step}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-2">
                      <button 
                        onClick={() => setEditingLoadId(null)} 
                        className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-700"
                      >
                        <Icons.Check />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                      <div>
                        <p className="text-gray-600">Steady kW:</p>
                        <p className="font-semibold text-gray-800">{load.steadyKW.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Starting kW:</p>
                        <p className="font-semibold text-gray-800">{load.startingKW.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Step:</p>
                        <p className="font-semibold text-gray-800">Step {load.stepAssignment}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                      <div>
                        <p className="text-gray-600">Starting Method:</p>
                        <p className="font-semibold text-gray-800">
                          {STARTING_METHODS.find(m => m.value === load.startingMethod)?.label || 'None'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Multiplier:</p>
                        <p className="font-semibold text-gray-800">{load.currentMultiplier}x</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Floor:</p>
                        <p className="font-semibold text-gray-800">{load.floorNumber}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          load.emergencyPower ? 'bg-red-100 text-red-700' : 
                          load.fsi ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {load.category}
                        </span>
                        {load.emergencyPower && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Emergency
                          </span>
                        )}
                        {load.fsi && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            FSI
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Generator Assignment */}
                    <div className="border-t border-gray-200 pt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Assigned to:</p>
                      <div className="flex flex-wrap gap-1">
                        {generators.map(generator => (
                          <label key={generator.id} className="inline-flex items-center bg-gray-100 p-1 rounded text-xs">
                            <input 
                              type="checkbox" 
                              checked={load.assignedTo.includes(generator.id)} 
                              onChange={() => toggleLoadAssignment(load.id, generator.id)} 
                              className="mr-1 h-3 w-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{generator.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-2">
                      <button 
                        onClick={() => setEditingLoadId(load.id)} 
                        className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md text-xs hover:bg-blue-50 flex items-center"
                      >
                        <Icons.Edit />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {/* Each Generator Results */}
        {generators.map(generator => {
          const results = generatorResults[generator.id];
          if (!results) return null;
          
          const isExpanded = expandedGenerators.has(generator.id);
          const gensetRatingKW = generator.rating * generator.powerFactor;
          const maxAcceptableStepLoad = gensetRatingKW * (generator.stepLoadAcceptance / 100);
          const overloadCapacity = gensetRatingKW * 1.1;
          
          return (
            <div key={generator.id} className="mb-6">
              <div 
                className="flex justify-between items-center mb-3 pb-2 border-b border-blue-200 cursor-pointer"
                onClick={() => toggleGeneratorExpansion(generator.id)}
              >
                <h4 className="font-medium text-base text-blue-800">
                  {generator.name} ({generator.rating} kVA)
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    results.criteriaResults.overallPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {results.criteriaResults.overallPassed ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="text-blue-600">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Load:</p>
                    <p className="font-semibold text-gray-800">{results.totalSteadyKVA.toFixed(1)} kVA</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Utilization:</p>
                    <p className={`font-semibold ${
                      results.utilizationPercentage > 90 ? 'text-red-600' :
                      results.utilizationPercentage > 80 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {results.utilizationPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Power Factor:</p>
                    <p className="font-semibold text-gray-800">{results.overallPowerFactor.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned Loads:</p>
                    <p className="font-semibold text-gray-800">{results.loadDetails.length}</p>
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <>
                  <div className="mb-4">
                    <div className={`p-3 rounded-md ${results.criteriaResults.overallPassed ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                      <p className={`font-bold ${results.criteriaResults.overallPassed ? 'text-green-700' : 'text-red-700'}`}>
                        {results.criteriaResults.overallPassed 
                          ? 'PASS ✓ Generator size is adequate'
                          : 'FAIL ✗ Generator size is inadequate'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-3">Criteria Assessment</h5>
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
                          <td className="px-3 py-2 font-medium">Steady kW</td>
                          <td className="px-3 py-2">Genset kW `&gt;` Total Steady kW</td>
                          <td className="px-3 py-2">{gensetRatingKW.toFixed(1)} `&gt;` {results.totalSteadyKW.toFixed(1)}</td>
                          <td className={`px-3 py-2 font-medium ${results.criteriaResults.steadyKWPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {results.criteriaResults.steadyKWPassed ? 'PASS ✓' : 'FAIL ✗'}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">Steady kVA</td>
                          <td className="px-3 py-2">Genset kVA `&gt;` Total Steady kVA</td>
                          <td className="px-3 py-2">{generator.rating.toFixed(1)} `&gt;` {results.totalSteadyKVA.toFixed(1)}</td>
                          <td className={`px-3 py-2 font-medium ${results.criteriaResults.steadyKVAPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {results.criteriaResults.steadyKVAPassed ? 'PASS ✓' : 'FAIL ✗'}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">Step Load</td>
                          <td className="px-3 py-2">Step Load Acceptance `&gt;`= Max Step kW</td>
                          <td className="px-3 py-2">{maxAcceptableStepLoad.toFixed(1)} `&gt;`= {results.maxStepStartingKW.toFixed(1)}</td>
                          <td className={`px-3 py-2 font-medium ${results.criteriaResults.stepLoadPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {results.criteriaResults.stepLoadPassed ? 'PASS ✓' : 'FAIL ✗'}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium">Overload</td>
                          <td className="px-3 py-2">110% Capacity `&gt;` Max Transient</td>
                          <td className="px-3 py-2">{overloadCapacity.toFixed(1)} `&gt;` {results.maxTransientLoad.toFixed(1)}</td>
                          <td className={`px-3 py-2 font-medium ${results.criteriaResults.overloadCapacityPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {results.criteriaResults.overloadCapacityPassed ? 'PASS ✓' : 'FAIL ✗'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Step Load Details */}
                  <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-3">Step Load Details</h5>
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
                          {results.stepTotals.map((step) => (
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
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Assigned Loads Table */}
                  {results.loadDetails.length > 0 && (
                    <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200 overflow-x-auto">
                      <h5 className="font-medium text-gray-800 mb-3">Assigned Loads ({results.loadDetails.length})</h5>
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load</th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Steady kW</th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Starting kW</th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PF</th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                            <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.loadDetails.map((load) => (
                            <tr key={load.id} className={load.emergencyPower || load.fsi ? 'bg-yellow-50' : ''}>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700">
                                {load.name}
                                {load.emergencyPower && (
                                  <span className="ml-1 text-xs text-red-600">(Emergency)</span>
                                )}
                                {load.fsi && (
                                  <span className="ml-1 text-xs text-orange-600">(FSI)</span>
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">{load.steadyKW.toFixed(1)}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">{load.startingKW.toFixed(1)}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                                <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                                  load.stepAssignment === 1 ? 'bg-green-100 text-green-700' :
                                  load.stepAssignment === 2 ? 'bg-blue-100 text-blue-700' :
                                  load.stepAssignment === 3 ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {load.stepAssignment}
                                </span>
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">{load.powerFactor.toFixed(2)}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">{load.floorNumber}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-right text-gray-700">{load.category}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-700">Total</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-right text-gray-700">{results.totalSteadyKW.toFixed(1)}</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-right text-gray-700">-</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-right text-gray-700">-</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-right text-gray-700">{results.overallPowerFactor.toFixed(2)}</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-right text-gray-700">-</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-right text-gray-700">-</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              )}
              
              <div className="mt-3 bg-blue-100 p-3 rounded-md border border-blue-300">
                <h5 className="font-medium text-blue-700 mb-2">Evaluation</h5>
                {results.loadDetails.length === 0 ? (
                  <p className="text-sm text-blue-800">No loads assigned to this generator.</p>
                ) : results.utilizationPercentage > 90 ? (
                  <p className="text-sm text-red-700">
                    <strong>Warning:</strong> Generator is heavily loaded ({results.utilizationPercentage.toFixed(1)}%). 
                    Consider upgrading to the next size or redistributing loads.
                  </p>
                ) : results.utilizationPercentage < 40 ? (
                  <p className="text-sm text-orange-700">
                    <strong>Note:</strong> Generator is lightly loaded ({results.utilizationPercentage.toFixed(1)}%).
                    Consider using a smaller generator for better efficiency.
                  </p>
                ) : (
                  <p className="text-sm text-green-700">
                    <strong>Good:</strong> Generator is properly sized with good utilization ({results.utilizationPercentage.toFixed(1)}%).
                  </p>
                )}
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Import Instructions</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800">
            <li>Use the "Import Data" button to load JSON files exported from the Electrical Load Estimation Calculator.</li>
            <li>The system will automatically create Emergency and FSI generators based on your load requirements.</li>
            <li>Only loads marked as Emergency Power or FSI will be imported and assigned to appropriate generators.</li>
            <li>Generator sizes will be initially estimated based on total load with ~70% utilization target.</li>
            <li>Review and adjust generator specifications, load assignments, and sizing as needed.</li>
            <li>Click on generator headers to expand/collapse detailed information for better visual management.</li>
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