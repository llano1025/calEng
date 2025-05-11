import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface DuctStaticPressureCalculatorProps {
  onShowTutorial?: () => void;
}

// Define duct section type
type DuctType = 'main' | 'branch';

// Define duct section interface
interface DuctSection {
  id: string;
  length: number;         // meters
  diameter: number;       // mm (for circular ducts)
  width?: number;         // mm (for rectangular ducts)
  height?: number;        // mm (for rectangular ducts)
  isCircular: boolean;    // shape flag
  materialRoughness: number; // mm
  customMaterial: boolean; // whether using custom roughness
  flowRate: number;       // m³/h
  fittings: DuctFitting[];
  type: DuctType; // Added duct type
}

// Define duct fitting interface
interface DuctFitting {
  id: string;
  type: string;          // e.g., 'elbow', 'transition', 'damper'
  lossCoefficient?: number; // Optional K value (when using K method)
  directPressureDrop?: number; // Optional direct pressure drop in Pa (when using direct method)
  pressureDropMethod: 'kValue' | 'direct'; // Method used for this fitting
  quantity: number;
  isCustom: boolean;     // Flag for custom fitting
}

// Interface for fitting being edited
interface EditableFitting {
  sectionId: string;
  fittingId: string;
  newCoefficient?: number;
  newDirectPressureDrop?: number;
  newName?: string;
  newMethod?: 'kValue' | 'direct';
}

// Constants for velocity limits
const MAIN_DUCT_VELOCITY_LIMIT = 7.5; // m/s
const BRANCH_DUCT_VELOCITY_LIMIT = 6.0; // m/s

const DuctStaticPressureCalculator: React.FC<DuctStaticPressureCalculatorProps> = ({ onShowTutorial }) => {
  // State for input system parameters
  const [systemFlowRate, setSystemFlowRate] = useState<number>(1000); // m³/h
  const [airTemperature, setAirTemperature] = useState<number>(20); // °C
  const [elevation, setElevation] = useState<number>(0); // meters above sea level
  const [safetyFactor, setSafetyFactor] = useState<number>(1.3); // 30% safety factor
  
  // State for duct sections
  const [ductSections, setDuctSections] = useState<DuctSection[]>([
    {
      id: '1',
      length: 10,
      diameter: 300,
      isCircular: true,
      materialRoughness: 0.15, // Default galvanized steel
      customMaterial: false, // Default to non-custom material
      flowRate: 1000,
      fittings: [],
      type: 'main', // Default type
    }
  ]);
  
  // State for editing custom fitting
  const [customFittingName, setCustomFittingName] = useState<string>('');
  const [customFittingCoefficient, setCustomFittingCoefficient] = useState<number>(0.5);
  const [customFittingPressureDrop, setCustomFittingPressureDrop] = useState<number>(10);
  const [customFittingMethod, setCustomFittingMethod] = useState<'kValue' | 'direct'>('kValue');
  const [editingFitting, setEditingFitting] = useState<EditableFitting | null>(null);
  
  // Material options with roughness factors (mm)
  const materialOptions = [
    { id: 'galvanizedSteel', name: 'Galvanized Steel', roughness: 0.15 },
    { id: 'aluminum', name: 'Aluminum', roughness: 0.05 },
    { id: 'flexibleSpiral', name: 'Flexible Spiral', roughness: 4.6 },
    { id: 'concrete', name: 'Concrete', roughness: 3.0 },
    { id: 'fiberBoard', name: 'Fiber Board', roughness: 4.5 },
    { id: 'custom', name: 'Custom Material', roughness: 0 } // Added custom option
  ];
  
  // Fitting options with loss coefficients (based on ASHRAE)
  const fittingOptions = [
    { id: 'elbow90', name: '90° Elbow', coefficient: 0.3 },
    { id: 'elbow45', name: '45° Elbow', coefficient: 0.2 },
    { id: 'teePassThrough', name: 'Tee (Pass-Through)', coefficient: 0.5 },
    { id: 'teeBranch', name: 'Tee (Branch)', coefficient: 1.0 },
    { id: 'entranceSharp', name: 'Sharp Entrance', coefficient: 0.5 },
    { id: 'exitSharp', name: 'Sharp Exit', coefficient: 1.0 },
    { id: 'damper', name: 'Damper (Full Open)', coefficient: 0.2 },
    { id: 'contraction', name: 'Contraction (1.5:1)', coefficient: 0.3 },
    { id: 'expansion', name: 'Expansion (1:1.5)', coefficient: 0.45 },
    { id: 'custom', name: 'Custom Fitting', coefficient: 0.5 }
  ];
  
  // State for calculated results
  const [airDensity, setAirDensity] = useState<number>(0);
  const [kinematicViscosity, setKinematicViscosity] = useState<number>(0);
  const [sectionResults, setSectionResults] = useState<any[]>([]);
  const [totalPressureDrop, setTotalPressureDrop] = useState<number>(0);
  const [isSystemCompliant, setIsSystemCompliant] = useState<boolean>(true); // Renamed for clarity
  const [maxOverallVelocity, setMaxOverallVelocity] = useState<number>(0); // Renamed for clarity
  
  // Calculate air density and kinematic viscosity based on temperature and elevation
  useEffect(() => {
    // Standard atmospheric pressure at sea level (101.325 kPa)
    const standardPressureAtSeaLevel = 101.325; // kPa
    const molarMassAir = 0.0289644; // kg/mol
    const gasConstantR = 8.31447; // J/(mol·K)
    const gravity = 9.80665; // m/s²
    
    const temperatureKelvin = 273.15 + airTemperature;

    const atmosphericPressureKPa = standardPressureAtSeaLevel * Math.exp(- (gravity * molarMassAir * elevation) / (gasConstantR * temperatureKelvin));
    const atmosphericPressurePa = atmosphericPressureKPa * 1000; // Convert kPa to Pa
    const density = (atmosphericPressurePa * molarMassAir) / (gasConstantR * temperatureKelvin);
    setAirDensity(density);

    // Calculate Kinematic Viscosity using Sutherland's formula for dynamic viscosity first
    // mu = mu_0 * (T0 + C) / (T + C) * (T / T0)^(3/2)
    // mu_0: reference viscosity at T0 (1.716e-5 Pa.s at 273.15 K for air)
    // C: Sutherland's constant for air (110.4 K)
    const mu_0 = 1.716e-5; // Pa·s
    const T0_sutherland = 273.15; // K
    const C_sutherland = 110.4; // K

    const dynamicViscosity = mu_0 * ((T0_sutherland + C_sutherland) / (temperatureKelvin + C_sutherland)) * Math.pow(temperatureKelvin / T0_sutherland, 1.5);
    
    if (density > 0) {
      setKinematicViscosity(dynamicViscosity / density);
    } else {
      setKinematicViscosity(0); // Avoid division by zero if density is not yet calculated or invalid
    }

  }, [airTemperature, elevation]);
  
  // Calculate pressure drops when inputs change
  useEffect(() => {
    if (!airDensity || airDensity === 0 || !kinematicViscosity || kinematicViscosity === 0) return; 
    
    const results: any[] = [];
    let currentTotalPressureDrop = 0;
    let highestOverallVelocity = 0;
    let systemIsCompliant = true; // Assume compliant initially
    
    ductSections.forEach(section => {
      let flowArea: number;
      let hydraulicDiameter: number;
      let velocity: number;
      let aspectRatio: number | null = null;
      
      if (section.isCircular) {
        const radius = section.diameter / 2000; 
        flowArea = Math.PI * radius * radius; 
        hydraulicDiameter = section.diameter / 1000;
      } else {
        const width = (section.width || 0) / 1000; 
        const height = (section.height || 0) / 1000; 
        if (width === 0 || height === 0) { 
            results.push({ sectionId: section.id, error: "Invalid dimensions for rectangular duct." });
            systemIsCompliant = false; // Mark system as non-compliant due to error
            return; 
        }
        flowArea = width * height; 
        hydraulicDiameter = (2 * width * height) / (width + height);
        
        // Calculate aspect ratio (height/width)
        aspectRatio = height / width;
      }

      if (flowArea === 0) { 
        results.push({ sectionId: section.id, error: "Flow area is zero, cannot calculate velocity." });
        systemIsCompliant = false;
        return; 
      }
      
      velocity = (section.flowRate / 3600) / flowArea; 
      
      if (velocity > highestOverallVelocity) {
        highestOverallVelocity = velocity;
      }
      
      const velocityLimit = section.type === 'main' ? MAIN_DUCT_VELOCITY_LIMIT : BRANCH_DUCT_VELOCITY_LIMIT;
      const isSectionCompliant = velocity <= velocityLimit;
      if (!isSectionCompliant) {
        systemIsCompliant = false; // If any section is non-compliant, the system is
      }

      if (hydraulicDiameter === 0) { 
        results.push({ sectionId: section.id, error: "Hydraulic diameter is zero." });
        systemIsCompliant = false;
        return; 
      }
      
      const reynoldsNumber = (velocity * hydraulicDiameter) / kinematicViscosity;
      const relativeRoughness = (section.materialRoughness / 1000) / hydraulicDiameter; 
      let frictionFactor: number;
      
      if (reynoldsNumber < 2000) {
        frictionFactor = 64 / reynoldsNumber;
      } else {
        const term1 = Math.pow(relativeRoughness / 3.7, 1.11);
        const term2 = 6.9 / reynoldsNumber;
        if (term1 + term2 <= 0) { // Prevent log of non-positive number
            frictionFactor = 0.02; // Fallback, or handle error appropriately
             results.push({ sectionId: section.id, error: "Invalid input for friction factor calculation (log argument)." });
             systemIsCompliant = false; // An error in calculation makes it non-compliant
        } else {
            frictionFactor = Math.pow(-1.8 * Math.log10(term1 + term2), -2);
        }
      }
      
      const straightDuctPressureDrop = frictionFactor * (section.length / hydraulicDiameter) * (airDensity * Math.pow(velocity, 2) / 2);
      const dynamicPressure = 0.5 * airDensity * Math.pow(velocity, 2);
      
      let fittingsPressureDrop = 0;
      const fittingDetails: any[] = [];
      section.fittings.forEach(fitting => {
        let fittingPressureDrop = 0;
        
        if (fitting.pressureDropMethod === 'kValue' && fitting.lossCoefficient !== undefined) {
          // Calculate pressure drop using K-value method
          fittingPressureDrop = fitting.lossCoefficient * dynamicPressure * fitting.quantity;
        } else if (fitting.pressureDropMethod === 'direct' && fitting.directPressureDrop !== undefined) {
          // Use direct pressure drop value
          fittingPressureDrop = fitting.directPressureDrop * fitting.quantity;
        }
        
        fittingsPressureDrop += fittingPressureDrop;
        fittingDetails.push({
          type: fitting.type,
          quantity: fitting.quantity,
          dropPerUnit: fitting.pressureDropMethod === 'kValue' 
            ? (fitting.lossCoefficient !== undefined ? fitting.lossCoefficient * dynamicPressure : 0) 
            : (fitting.directPressureDrop || 0),
          totalDrop: fittingPressureDrop,
          lossCoefficient: fitting.lossCoefficient,
          directPressureDrop: fitting.directPressureDrop,
          pressureDropMethod: fitting.pressureDropMethod,
          isCustom: fitting.isCustom || false
        });
      });
      
      const sectionTotalDrop = straightDuctPressureDrop + fittingsPressureDrop;
      currentTotalPressureDrop += sectionTotalDrop;
      
      results.push({
        sectionId: section.id,
        ductType: section.type,
        flowArea,
        hydraulicDiameter,
        velocity,
        velocityLimit,
        isSectionCompliant,
        reynoldsNumber,
        frictionFactor,
        straightDuctPressureDrop,
        fittingsPressureDrop,
        dynamicPressure,
        sectionTotalDrop,
        fittingDetails,
        aspectRatio, // Add aspect ratio to results (null for circular ducts)
        isCircular: section.isCircular,
        height: section.isCircular ? null : (section.height || 0),
        width: section.isCircular ? null : (section.width || 0)
      });
    });
    
    const adjustedTotalDrop = currentTotalPressureDrop * safetyFactor;
    
    setSectionResults(results);
    setTotalPressureDrop(adjustedTotalDrop);
    setMaxOverallVelocity(highestOverallVelocity);
    setIsSystemCompliant(systemIsCompliant);
    
  }, [ductSections, airDensity, kinematicViscosity, safetyFactor]);
  
  const addDuctSection = () => {
    const newSection: DuctSection = {
      id: Date.now().toString(),
      length: 5,
      diameter: 300,
      isCircular: true,
      materialRoughness: 0.15, 
      customMaterial: false,
      flowRate: systemFlowRate, 
      fittings: [],
      type: 'main', // Default new sections to 'main'
    };
    setDuctSections([...ductSections, newSection]);
  };
  
  const removeDuctSection = (id: string) => {
    setDuctSections(ductSections.filter(section => section.id !== id));
  };
  
  const updateDuctSection = (id: string, updates: Partial<DuctSection>) => {
    setDuctSections(
      ductSections.map(section => 
        section.id === id ? { ...section, ...updates } : section
      )
    );
  };
  
  const addFitting = (sectionId: string, fittingType: string) => {
    if (fittingType === 'custom') {
      // Add a custom fitting with default values and user-provided name
      const newFitting: DuctFitting = {
        id: Date.now().toString(),
        type: customFittingName || 'Custom Fitting',
        // Set the appropriate property based on the method
        ...(customFittingMethod === 'kValue' 
          ? { lossCoefficient: customFittingCoefficient }
          : { directPressureDrop: customFittingPressureDrop }),
        quantity: 1,
        isCustom: true,
        pressureDropMethod: customFittingMethod
      };
      
      setDuctSections(
        ductSections.map(section => {
          if (section.id === sectionId) {
            return {
              ...section,
              fittings: [...section.fittings, newFitting]
            };
          }
          return section;
        })
      );
      
      // Reset custom fitting values
      setCustomFittingName('');
      setCustomFittingCoefficient(0.5);
      // Don't reset customFittingPressureDrop to keep last value
    } else {
      // Add a standard fitting
      const fitting = fittingOptions.find(f => f.id === fittingType);
      if (!fitting) return;
      
      setDuctSections(
        ductSections.map(section => {
          if (section.id === sectionId) {
            const newFitting: DuctFitting = {
              id: Date.now().toString(),
              type: fitting.name,
              lossCoefficient: fitting.coefficient,
              quantity: 1,
              isCustom: false,
              pressureDropMethod: 'kValue'
            };
            
            return {
              ...section,
              fittings: [...section.fittings, newFitting]
            };
          }
          return section;
        })
      );
    }
  };
  
  const removeFitting = (sectionId: string, fittingId: string) => {
    setDuctSections(
      ductSections.map(section => {
        if (section.id === sectionId) {
          return { ...section, fittings: section.fittings.filter(fitting => fitting.id !== fittingId) };
        }
        return section;
      })
    );
    
    // Cancel editing if this fitting was being edited
    if (editingFitting && editingFitting.fittingId === fittingId) {
      setEditingFitting(null);
    }
  };
  
  const updateFitting = (sectionId: string, fittingId: string, updates: Partial<DuctFitting>) => {
    setDuctSections(
      ductSections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            fittings: section.fittings.map(fitting => 
              fitting.id === fittingId ? { ...fitting, ...updates } : fitting
            )
          };
        }
        return section;
      })
    );
  };
  
  // Start editing a fitting's K value and name (for custom fittings)
  const startEditingFitting = (sectionId: string, fittingId: string) => {
    const section = ductSections.find(s => s.id === sectionId);
    if (!section) return;
    
    const fitting = section.fittings.find(f => f.id === fittingId);
    if (!fitting) return;
    
    setEditingFitting({
      sectionId,
      fittingId,
      newCoefficient: fitting.lossCoefficient,
      newDirectPressureDrop: fitting.directPressureDrop,
      newName: fitting.type,
      newMethod: fitting.pressureDropMethod
    });
  };
  
  // Save the edited fitting properties
  const saveEditedFitting = () => {
    if (!editingFitting) return;
    
    const section = ductSections.find(s => s.id === editingFitting.sectionId);
    if (!section) return;
    
    const fitting = section.fittings.find(f => f.id === editingFitting.fittingId);
    if (!fitting) return;
    
    const updates: Partial<DuctFitting> = {};
    
    // Update method if changed
    if (editingFitting.newMethod && editingFitting.newMethod !== fitting.pressureDropMethod) {
      updates.pressureDropMethod = editingFitting.newMethod;
    }
    
    // Update the appropriate value based on the method
    if (editingFitting.newMethod === 'kValue' && editingFitting.newCoefficient !== undefined) {
      updates.lossCoefficient = editingFitting.newCoefficient;
      updates.directPressureDrop = undefined; // Clear direct pressure drop if changing to K-value method
    } else if (editingFitting.newMethod === 'direct' && editingFitting.newDirectPressureDrop !== undefined) {
      updates.directPressureDrop = editingFitting.newDirectPressureDrop;
      updates.lossCoefficient = undefined; // Clear loss coefficient if changing to direct method
    }
    
    // Only update name for custom fittings
    if (fitting.isCustom && editingFitting.newName) {
      updates.type = editingFitting.newName;
    }
    
    updateFitting(
      editingFitting.sectionId,
      editingFitting.fittingId,
      updates
    );
    
    setEditingFitting(null);
  };
  
  // Cancel editing a fitting
  const cancelEditingFitting = () => {
    setEditingFitting(null);
  };
  
  const convertPressure = (pascals: number, unit: 'pa' | 'mmwg' | 'inwg') => {
    if (isNaN(pascals) || pascals === undefined) return 0;
    switch (unit) {
      case 'mmwg': return pascals / 9.80665; 
      case 'inwg': return pascals / 249.0889; 
      default: return pascals;
    }
  };

  // Helper function to get material selection for a duct section
  const getMaterialSelection = (section: DuctSection) => {
    if (section.customMaterial) {
      return 'custom';
    }
    const material = materialOptions.find(m => m.roughness === section.materialRoughness);
    return material ? material.id : '';
  };

  // Handle material change with support for custom roughness
  const handleMaterialChange = (sectionId: string, materialId: string) => {
    if (materialId === 'custom') {
      // Switch to custom material mode
      const section = ductSections.find(s => s.id === sectionId);
      updateDuctSection(sectionId, { 
        customMaterial: true,
        // Keep current roughness value as starting point for custom
        materialRoughness: section?.materialRoughness || 0.1
      });
    } else {
      // Use predefined material
      const material = materialOptions.find(m => m.id === materialId);
      if (material) {
        updateDuctSection(sectionId, { 
          customMaterial: false,
          materialRoughness: material.roughness 
        });
      }
    }
  };

  // Format aspect ratio for display
  const formatAspectRatio = (ratio: number): string => {
    if (ratio === 1) return "1:1 (Square)";
    
    // Round to 2 decimal places
    const roundedRatio = Math.round(ratio * 100) / 100;
    
    // If ratio > 1, it's height:width format
    if (roundedRatio > 1) {
      return `${roundedRatio}:1 (H:W)`;
    }
    
    // If ratio < 1, invert it for width:height format
    const invertedRatio = Math.round((1 / roundedRatio) * 100) / 100;
    return `1:${invertedRatio} (W:H)`;
  };
  
  // Suggest optimal H:W ratio for rectangular ducts (typically 1:1.5)
  const suggestOptimalRatio = (width: number, height: number): string => {
    const currentRatio = height / width;
    
    // If already close to optimal (within 10% of 1:1.5 ratio), don't suggest change
    if (currentRatio >= 0.57 && currentRatio <= 0.77) {
      return "Current ratio is good for airflow efficiency";
    }
    
    // Calculate optimal dimensions keeping the same cross-sectional area
    const area = width * height;
    const optimalWidth = Math.sqrt(area * 1.5);
    const optimalHeight = area / optimalWidth;
    
    return `Consider adjusting to ${Math.round(optimalWidth)}mm × ${Math.round(optimalHeight)}mm for better efficiency`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Air Duct Static Pressure Calculator</h2>
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
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-4 text-gray-700">System Parameters</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">System Flow Rate (m³/h)</label>
            <input type="number" value={systemFlowRate} onChange={(e) => setSystemFlowRate(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Air Temperature (°C)</label>
            <input type="number" value={airTemperature} onChange={(e) => setAirTemperature(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Elevation (m)</label>
            <input type="number" value={elevation} onChange={(e) => setElevation(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Safety Factor (e.g., 1.1 for 10%)</label>
            <input type="number" value={safetyFactor} onChange={(e) => setSafetyFactor(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.05" min="1"/>
          </div>
          
          <div className="border-t border-gray-300 my-6"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Duct Sections</h3>
            <button onClick={addDuctSection} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm">Add Section</button>
          </div>
          
          {ductSections.map((section, index) => (
            <div key={section.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">Section {index + 1}</h4>
                {ductSections.length > 1 && (<button onClick={() => removeDuctSection(section.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>)}
              </div>
              
              {/* Duct Type Selection */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Duct Type</label>
                <select
                  value={section.type}
                  onChange={(e) => updateDuctSection(section.id, { type: e.target.value as DuctType })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="main">Main Duct (Limit: {MAIN_DUCT_VELOCITY_LIMIT} m/s)</option>
                  <option value="branch">Branch Duct (Limit: {BRANCH_DUCT_VELOCITY_LIMIT} m/s)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                  <input type="number" value={section.length} onChange={(e) => updateDuctSection(section.id, { length: Number(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" step="0.1" min="0"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flow Rate (m³/h)</label>
                  <input type="number" value={section.flowRate} onChange={(e) => updateDuctSection(section.id, { flowRate: Number(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Duct Shape</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input type="radio" name={`ductShape-${section.id}`} checked={section.isCircular} onChange={() => updateDuctSection(section.id, { isCircular: true })} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                    <span className="text-sm text-gray-700">Circular</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="radio" name={`ductShape-${section.id}`} checked={!section.isCircular} onChange={() => updateDuctSection(section.id, { isCircular: false, diameter: section.diameter || 300 })} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                    <span className="text-sm text-gray-700">Rectangular</span>
                  </label>
                </div>
              </div>
              
              {section.isCircular ? (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diameter (mm)</label>
                  <input type="number" value={section.diameter} onChange={(e) => updateDuctSection(section.id, { diameter: Number(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width (mm)</label>
                    <input type="number" value={section.width || ''} onChange={(e) => updateDuctSection(section.id, { width: Number(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                    <input type="number" value={section.height || ''} onChange={(e) => updateDuctSection(section.id, { height: Number(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
                  </div>
                </div>
              )}
              
              {/* Updated Material Selection with Custom Option */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <select 
                  value={getMaterialSelection(section)} 
                  onChange={(e) => handleMaterialChange(section.id, e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {materialOptions.filter(m => m.id !== 'custom').map(material => (
                    <option key={material.id} value={material.id}>
                      {material.name} ({material.roughness} mm)
                    </option>
                  ))}
                  <option value="custom">Custom Material</option>
                </select>
              </div>

              {/* Custom Roughness Input (shows only when custom material is selected) */}
              {section.customMaterial && (
                <div className="mb-4 pl-4 border-l-4 border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Material Roughness (mm)
                  </label>
                  <input 
                    type="number" 
                    value={section.materialRoughness} 
                    onChange={(e) => updateDuctSection(section.id, { materialRoughness: Number(e.target.value) })} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="0.01"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter absolute roughness in millimeters. Typical values range from 0.03 mm (very smooth) to 3.0 mm (very rough).
                  </p>
                </div>
              )}
              
              {/* Fittings Section with Improved Layout */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fittings</label>
                
                {/* Standard Fittings Dropdown - Full Width */}
                <div className="mb-2">
                  <select
                    className="w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        addFitting(section.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Add standard fitting...</option>
                    {fittingOptions.filter(f => f.id !== 'custom').map(fitting => (
                      <option key={fitting.id} value={fitting.id}>
                        {fitting.name} (K={fitting.coefficient})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Custom Fitting Controls - Grid Layout with Method Selection */}
                <div className="mb-3">
                  {/* Method Selection */}
                  <div className="mb-2">
                    <label className="block text-xs text-gray-600 mb-1">Pressure Drop Method</label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          checked={customFittingMethod === 'kValue'}
                          onChange={() => setCustomFittingMethod('kValue')}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">K-Value Method</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          checked={customFittingMethod === 'direct'}
                          onChange={() => setCustomFittingMethod('direct')}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Direct Pressure Drop</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Input fields grid */}
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-600 mb-1">Custom Fitting Name</label>
                      <input
                        type="text"
                        value={customFittingName}
                        onChange={(e) => setCustomFittingName(e.target.value)}
                        placeholder="Enter name"
                        className="w-full p-2 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    {customFittingMethod === 'kValue' ? (
                      <div className="col-span-5">
                        <label className="block text-xs text-gray-600 mb-1">K-Value</label>
                        <input
                          type="number"
                          value={customFittingCoefficient}
                          onChange={(e) => setCustomFittingCoefficient(Number(e.target.value))}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md"
                          step="0.1"
                          min="0"
                        />
                      </div>
                    ) : (
                      <div className="col-span-5">
                        <label className="block text-xs text-gray-600 mb-1">Pressure Drop (Pa)</label>
                        <input
                          type="number"
                          value={customFittingPressureDrop}
                          onChange={(e) => setCustomFittingPressureDrop(Number(e.target.value))}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md"
                          step="1"
                          min="0"
                        />
                      </div>
                    )}
                    
                    <div className="col-span-2 flex items-end">
                      <button
                        onClick={() => addFitting(section.id, 'custom')}
                        className="w-full h-10 bg-blue-600 text-white px-1 py-2 rounded-md text-xl font-medium hover:bg-blue-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Fittings List */}
                <div className="mt-3">
                  {section.fittings.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No fittings added.</p>
                  ) : (
                    <ul className="space-y-2">
                      {section.fittings.map(fitting => (
                        <li key={fitting.id} className="bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex items-center p-2">
                            {/* Fitting Name - Left Side */}
                            <div className="flex-grow">
                              <span className="text-sm font-medium text-gray-700">{fitting.type}</span>
                              {fitting.pressureDropMethod === 'direct' && (
                                <span className="text-xs text-blue-600 ml-2">(Direct: {fitting.directPressureDrop} Pa)</span>
                              )}
                            </div>
                            
                            {/* Controls - Right Side */}
                            <div className="flex items-center space-x-3">
                              {/* Fitting details (editable) */}
                              {editingFitting && editingFitting.fittingId === fitting.id ? (
                                <div className="flex flex-col items-start space-y-1">
                                  {/* Method selection */}
                                  {fitting.isCustom && (
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-xs text-gray-600">Method:</span>
                                      <label className="inline-flex items-center">
                                        <input
                                          type="radio"
                                          checked={editingFitting.newMethod === 'kValue'}
                                          onChange={() => setEditingFitting({
                                            ...editingFitting,
                                            newMethod: 'kValue'
                                          })}
                                          className="mr-1 h-3 w-3 text-blue-600 border-gray-300"
                                        />
                                        <span className="text-xs">K-Value</span>
                                      </label>
                                      <label className="inline-flex items-center">
                                        <input
                                          type="radio"
                                          checked={editingFitting.newMethod === 'direct'}
                                          onChange={() => setEditingFitting({
                                            ...editingFitting,
                                            newMethod: 'direct'
                                          })}
                                          className="mr-1 h-3 w-3 text-blue-600 border-gray-300"
                                        />
                                        <span className="text-xs">Direct Pa</span>
                                      </label>
                                    </div>
                                  )}
                                  
                                  {/* Name input (only for custom fittings) */}
                                  {fitting.isCustom && (
                                    <div className="flex items-center w-full mb-1">
                                      <span className="text-xs text-gray-600 mr-1 w-8">Name:</span>
                                      <input
                                        type="text"
                                        value={editingFitting.newName}
                                        onChange={(e) => setEditingFitting({
                                          ...editingFitting,
                                          newName: e.target.value
                                        })}
                                        className="flex-grow p-1 text-sm border border-gray-300 rounded-md"
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Value input based on method */}
                                  <div className="flex items-center w-full">
                                    {editingFitting.newMethod === 'kValue' ? (
                                      <>
                                        <span className="text-xs text-gray-600 mr-1 w-8">K:</span>
                                        <input
                                          type="number"
                                          value={editingFitting.newCoefficient || 0}
                                          onChange={(e) => setEditingFitting({
                                            ...editingFitting,
                                            newCoefficient: Number(e.target.value)
                                          })}
                                          className="flex-grow p-1 text-sm border border-gray-300 rounded-md"
                                          step="0.1"
                                          min="0"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-xs text-gray-600 mr-1 w-8">Pa:</span>
                                        <input
                                          type="number"
                                          value={editingFitting.newDirectPressureDrop || 0}
                                          onChange={(e) => setEditingFitting({
                                            ...editingFitting,
                                            newDirectPressureDrop: Number(e.target.value)
                                          })}
                                          className="flex-grow p-1 text-sm border border-gray-300 rounded-md"
                                          step="1"
                                          min="0"
                                        />
                                      </>
                                    )}
                                    <button
                                      onClick={saveEditedFitting}
                                      className="text-green-500 hover:text-green-700 p-1 ml-1 rounded-full hover:bg-green-100"
                                    >
                                      <Icons.Check />
                                    </button>
                                    <button
                                      onClick={cancelEditingFitting}
                                      className="text-red-500 hover:text-red-700 p-1 ml-1 rounded-full hover:bg-red-100"
                                    >
                                      <Icons.Close />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditingFitting(section.id, fitting.id)}
                                  className="flex items-center text-blue-600 hover:text-blue-800"
                                >
                                  {fitting.pressureDropMethod === 'kValue' ? (
                                    <span className="text-sm mr-1">K: {fitting.lossCoefficient?.toFixed(2) || 'N/A'}</span>
                                  ) : (
                                    <span className="text-sm mr-1">Edit</span>
                                  )}
                                  <Icons.Edit />
                                </button>
                              )}
                              
                              {/* Quantity */}
                              <div className="flex items-center">
                                <label className="text-xs text-gray-600 mr-1">Qty:</label>
                                <input
                                  type="number"
                                  value={fitting.quantity}
                                  onChange={(e) => updateFitting(section.id, fitting.id, { quantity: Math.max(1, Number(e.target.value)) })}
                                  className="w-14 p-1 text-sm border border-gray-300 rounded-md"
                                  min="1"
                                />
                              </div>
                              
                              {/* Remove button */}
                              <button
                                onClick={() => removeFitting(section.id, fitting.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                              >
                                <Icons.Close />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-base text-gray-700">System Summary</h4>
                <div className="mt-2"><p className="text-sm text-gray-600">Air Density:</p><p className="font-semibold text-gray-800">{airDensity.toFixed(3)} kg/m³</p></div>
                <div className="mt-2"><p className="text-sm text-gray-600">Kinematic Viscosity:</p><p className="font-semibold text-gray-800">{kinematicViscosity.toExponential(3)} m²/s</p></div>
                <div className="mt-2"><p className="text-sm text-gray-600">Highest Overall Velocity:</p><p className={`font-semibold ${maxOverallVelocity > MAIN_DUCT_VELOCITY_LIMIT ? 'text-orange-600' : 'text-gray-800'}`}>{maxOverallVelocity.toFixed(2)} m/s</p></div>
                <div className="mt-2"><p className="text-sm text-gray-600">Total System Flow Rate:</p><p className="font-semibold text-gray-800">{systemFlowRate.toFixed(0)} m³/h</p></div>
              </div>
              <div>
                <h4 className="font-medium text-base text-gray-700">System Pressure Drop</h4>
                <div className="mt-2"><p className="text-sm text-gray-600">Total Drop (incl. Safety Factor):</p><p className="font-bold text-lg text-blue-600">{totalPressureDrop.toFixed(2)} Pa</p></div>
                <div className="mt-2"><p className="text-sm text-gray-600">In mmWG:</p><p className="font-semibold text-gray-800">{convertPressure(totalPressureDrop, 'mmwg').toFixed(2)} mmWG</p></div>
                <div className="mt-2"><p className="text-sm text-gray-600">In inWG:</p><p className="font-semibold text-gray-800">{convertPressure(totalPressureDrop, 'inwg').toFixed(3)} inWG</p></div>
              </div>
            </div>
            <div className="mt-4">
              <div className={`rounded-md p-3 ${isSystemCompliant ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                <p className={`text-sm font-medium ${isSystemCompliant ? 'text-green-800' : 'text-red-800'}`}>
                  {isSystemCompliant 
                    ? 'System Velocity Compliance: All duct sections are within their respective ASHRAE recommended velocity limits.'
                    : 'System Velocity Compliance: Warning! One or more duct sections exceed recommended velocity limits. Review section details.'}
                </p>
              </div>
            </div>
          </div>
          
          <h4 className="font-medium mb-3 text-blue-700">Section Details</h4>
          {sectionResults.length === 0 && <p className="text-sm text-gray-500 italic">No sections defined or calculation pending.</p>}
          {sectionResults.map((result, index) => (
            result.error ? (
                 <div key={`error-${index}`} className="bg-red-100 p-3 rounded-md mb-3 border border-red-300">
                    <h5 className="font-medium text-red-700">Section {ductSections.find(s => s.id === result.sectionId)?.id || index + 1} - Error</h5>
                    <p className="text-sm text-red-600">{result.error}</p>
                 </div>
            ) : (
            <div key={result.sectionId || index} className="bg-white p-3 rounded-md mb-3 shadow-sm border border-gray-200">
              <h5 className="font-medium text-gray-700">Section {index + 1} (Type: <span className="capitalize">{result.ductType}</span>)</h5>
              
              {/* Add Duct Dimensions and Aspect Ratio */}
              <div className="mb-2 bg-gray-50 p-2 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Duct Dimensions:</p>
                {result.isCircular ? (
                  <p className="text-sm text-gray-600">Circular: {ductSections[index].diameter} mm diameter</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">Rectangular: {result.width} mm × {result.height} mm</p>
                    <p className="text-sm text-gray-600">
                      Aspect Ratio: {formatAspectRatio(result.aspectRatio)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {suggestOptimalRatio(result.width, result.height)}
                    </p>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm">
                <div><p className="text-gray-600">Velocity (Limit: {result.velocityLimit.toFixed(1)} m/s):</p><p className={`font-semibold ${!result.isSectionCompliant ? 'text-red-600' : 'text-green-600'}`}>{result.velocity.toFixed(2)} m/s {result.isSectionCompliant ? '(Compliant)' : '(Exceeded)'}</p></div>
                <div><p className="text-gray-600">Reynolds No.:</p><p className="font-semibold text-gray-800">{result.reynoldsNumber.toExponential(2)}</p></div>
                <div><p className="text-gray-600">Friction Factor:</p><p className="font-semibold text-gray-800">{result.frictionFactor ? result.frictionFactor.toFixed(4) : 'N/A'}</p></div>
                <div><p className="text-gray-600">Straight Loss:</p><p className="font-semibold text-gray-800">{result.straightDuctPressureDrop.toFixed(2)} Pa</p></div>
                <div><p className="text-gray-600">Fittings Loss:</p><p className="font-semibold text-gray-800">{result.fittingsPressureDrop.toFixed(2)} Pa</p></div>
                <div><p className="text-gray-600">Section Total:</p><p className="font-bold text-gray-800">{result.sectionTotalDrop.toFixed(2)} Pa</p></div>
              </div>
              
              {/* Enhanced Fitting Breakdown Table showing K-values */}
              {result.fittingDetails && result.fittingDetails.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Fitting Breakdown:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left font-semibold text-gray-600 border border-gray-300">Fitting</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">K-Value</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Qty</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Loss/Unit (Pa)</th>
                          <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Total Loss (Pa)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.fittingDetails.map((fitting: any, i: number) => (
                          <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 text-gray-700 border border-gray-300">
                              {fitting.type}
                              {fitting.isCustom && <span className="text-xs text-blue-500 ml-1">(Custom)</span>}
                              {fitting.pressureDropMethod === 'direct' && <span className="text-xs text-blue-500 ml-1">(Direct)</span>}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                              {fitting.pressureDropMethod === 'kValue' 
                                ? (fitting.lossCoefficient?.toFixed(2) || 'N/A') 
                                : 'N/A'}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                              {fitting.quantity}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                              {fitting.dropPerUnit.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-medium text-gray-700 border border-gray-300">
                              {fitting.totalDrop.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            )
          ))}
          
          <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">Fan Selection Guidance</h4>
            <p className="text-sm text-blue-800">The selected fan should be capable of providing at least:</p>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
              <li>Static Pressure: <strong className="text-blue-900">{totalPressureDrop.toFixed(1)} Pa</strong> ({convertPressure(totalPressureDrop, 'mmwg').toFixed(2)} mmWG)</li>
              <li>Flow Rate: <strong className="text-blue-900">{systemFlowRate.toFixed(0)} m³/h</strong> ({(systemFlowRate / 1.699).toFixed(0)} CFM)</li>
              <li>Consider Fan Type: {systemFlowRate > 3000 ? 'Centrifugal (often better for higher SP)' : 'Axial or Mixed Flow (can be suitable)'}</li>
            </ul>
            <p className="text-xs mt-2 text-blue-700">Note: Always consult fan curves and account for system effects not modeled here.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Calculations use Sutherland's formula for temperature-dependent air viscosity and the Haaland equation for friction factor.</li>
          <li>Velocity limits: Main Ducts ({MAIN_DUCT_VELOCITY_LIMIT} m/s), Branch Ducts ({BRANCH_DUCT_VELOCITY_LIMIT} m/s) based on typical ASHRAE guidelines for noise.</li>
          <li>For rectangular ducts, an aspect ratio (H:W) between 1:1 and 1:1.5 is generally optimal for efficient air flow.</li>
          <li>Rectangular ducts with extreme aspect ratios (e.g., 1:8) can increase pressure drops by up to 50% versus square ducts.</li>
          <li>Material roughness values significantly impact friction factor. For custom materials, consult manufacturer specifications.</li>
          <li>Fitting loss coefficients (K-values) can vary based on specific designs and flow conditions.</li>
          <li>The safety factor helps account for uncertainties. Common range is 10-30%.</li>
        </ul>
      </div>
    </div>
  );
};

export default DuctStaticPressureCalculator;