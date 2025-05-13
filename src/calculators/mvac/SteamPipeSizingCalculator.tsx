import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

// Define props type for the component
interface SteamPipeSizingCalculatorProps {
  onShowTutorial?: () => void;
}

// Define pipe segment interface
interface PipeSegment {
  id: string;
  length: number;        // meters
  material: string;      // pipe material type
  roughness: number;     // mm - surface roughness
  customMaterial: boolean; // whether using custom roughness
  flowRate: number;      // kg/h
  fittings: PipeFitting[];
  type: PipeType;        // supply or return
}

// Define pipe fitting interface
interface PipeFitting {
  id: string;
  type: string;          // e.g., 'elbow', 'valve', 'tee'
  equivalentLength: number; // meters for custom, diameters for standard
  quantity: number;
  isCustom: boolean;     // Flag for custom fitting
}

// Define pipe types
type PipeType = 'supply' | 'return';

// Define steam state
interface SteamState {
  pressure: number;       // bar(g)
  temperature: number;    // °C
  quality: number;        // 0-1 (fraction)
  isSuperheated: boolean; // true if superheated
}

type SteamConditionType = 'Superheated' | 'Saturated' | 'Wet Steam' | '';

// Define calculation result
interface CalculationResult {
  sectionId: string;
  recommendedDiameter: number;  // mm
  velocity: number;             // m/s
  pressureDrop: number;         // bar
  flowArea: number;             // m²
  reynoldsNumber: number;
  frictionFactor: number;
  specificVolume: number;       // m³/kg
  densityKgM3: number;          // kg/m³
  steamType: SteamConditionType;
  fittingDetails: {
    type: string;
    quantity: number;
    equivalentLength: number; // Total equivalent length in meters for this fitting type & quantity
    pressureDrop: number;
    isCustom: boolean;
  }[];
  flowRateActual: number;       // Actual steam flow kg/h
  velocityLimit: number;        // m/s
  isVelocityCompliant: boolean;
  normalizedDropPer100m?: number;
  isPressureDropCompliant?: boolean;
  error?: string;               // Error message if calculation fails
}

// Constants
const SUPPLY_VELOCITY_LIMIT = 35; // m/s for supply steam pipes
const RETURN_VELOCITY_LIMIT = 20; // m/s for condensate return lines
const STANDARD_PIPE_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750]; // mm

const SteamPipeSizingCalculator: React.FC<SteamPipeSizingCalculatorProps> = ({ onShowTutorial }) => {
  // State for steam parameters
  const [steamPressure, setSteamPressure] = useState<number>(5);  // bar(g)
  const [steamTemperature, setSteamTemperature] = useState<number>(160); // °C
  const [steamQuality, setSteamQuality] = useState<number>(1);    // Default to 100% quality
  const [isSuperheated, setIsSuperheated] = useState<boolean>(true);
  const [allowablePressureDrop, setAllowablePressureDrop] = useState<number>(5); // % pressure drop per 100m
  const [safetyFactor, setSafetyFactor] = useState<number>(1.2);  // 20% safety factor
  
  // State for pipe segments
  const [pipeSegments, setPipeSegments] = useState<PipeSegment[]>([
    {
      id: '1',
      length: 20,
      material: 'carbon_steel',
      roughness: 0.045, // Default carbon steel
      customMaterial: false,
      flowRate: 100,    // kg/h
      fittings: [],
      type: 'supply',   // Default type
    }
  ]);
  
  // State for calculated results
  const [sectionResults, setSectionResults] = useState<CalculationResult[]>([]);
  const [totalPressureDrop, setTotalPressureDrop] = useState<number>(0);
  const [isSystemCompliant, setIsSystemCompliant] = useState<boolean>(true);
  const [maxOverallVelocity, setMaxOverallVelocity] = useState<number>(0);
  const [steamProperties, setSteamProperties] = useState<{
    specificVolume: number;
    density: number;
    saturationTemp: number;
    steamType: SteamConditionType;
  }>({
    specificVolume: 0,
    density: 0,
    saturationTemp: 0,
    steamType: ''
  });
  
  // State for editing custom fitting
  const [customFittingName, setCustomFittingName] = useState<string>('');
  const [customFittingEquivLength, setCustomFittingEquivLength] = useState<number>(1);
  
  // Material options with roughness factors (mm)
  const materialOptions = [
    { id: 'carbon_steel', name: 'Carbon Steel', roughness: 0.045 },
    { id: 'stainless_steel', name: 'Stainless Steel', roughness: 0.015 },
    { id: 'cast_iron', name: 'Cast Iron', roughness: 0.26 },
    { id: 'copper', name: 'Copper', roughness: 0.0015 },
    { id: 'aluminum', name: 'Aluminum', roughness: 0.0015 },
    { id: 'custom', name: 'Custom Material', roughness: 0 }
  ];
  
  // Fitting options with equivalent length values (as multiples of pipe diameter)
  const fittingOptions = [
    { id: 'elbow90', name: '90° Elbow', eqDiameters: 30 },
    { id: 'elbow45', name: '45° Elbow', eqDiameters: 16 },
    { id: 'tee_branch', name: 'Tee (Branch Flow)', eqDiameters: 60 },
    { id: 'tee_line', name: 'Tee (Line Flow)', eqDiameters: 20 },
    { id: 'gate_valve', name: 'Gate Valve (Full Open)', eqDiameters: 7 },
    { id: 'globe_valve', name: 'Globe Valve', eqDiameters: 300 },
    { id: 'check_valve', name: 'Check Valve', eqDiameters: 100 },
    { id: 'entry', name: 'Pipe Entry', eqDiameters: 20 },
    { id: 'exit', name: 'Pipe Exit', eqDiameters: 10 },
    // 'custom' fitting is handled separately
  ];
  
  // Calculate steam properties based on pressure and temperature
  useEffect(() => {
    // Convert gauge pressure to absolute
    const absolutePressure = steamPressure + 1.013; // bar absolute
    
    // Calculate saturation temperature based on pressure (approximation)
    const saturationTemp = 100 * Math.pow((absolutePressure/1.013), 0.25);
    
    let specificVolume = 0;
    let steamType: SteamConditionType = '';
    let density = 0;
    
    let effectiveIsSuperheated = isSuperheated;
    if (isSuperheated && steamTemperature <= saturationTemp) {
      effectiveIsSuperheated = false; // Treat as saturated if temp is not above saturation
    }

    // Check if steam is superheated or saturated
    if (effectiveIsSuperheated) {
      // Simplified calculation for superheated steam
      specificVolume = 0.461 * (steamTemperature + 273.15) / (absolutePressure * 100); // R_steam = 0.461 kJ/kg.K
      steamType = 'Superheated';
    } else {
      // Saturated steam calculation with quality
      // Using approximate formula for saturated steam
      const currentQuality = (isSuperheated && steamTemperature <= saturationTemp && steamQuality === 1) ? 1.0 : steamQuality; 
      specificVolume = 0.0015 + (1.696 / absolutePressure) * currentQuality; // This is a rough approximation
      steamType = currentQuality >= 0.98 ? 'Saturated' : 'Wet Steam';
      // If user selected superheated but temp was too low, or selected saturated, force temp to saturation
      if (!effectiveIsSuperheated || (isSuperheated && steamTemperature <= saturationTemp)) {
        setSteamTemperature(saturationTemp);
      }
    }
    
    density = 1 / specificVolume;
    
    setSteamProperties({
      specificVolume,
      density,
      saturationTemp,
      steamType
    });
  }, [steamPressure, steamTemperature, steamQuality, isSuperheated]);
  
  // Calculate pipe sizing and pressure drops
  useEffect(() => {
    if (!steamProperties.specificVolume || steamProperties.specificVolume === 0) return;
    
    const results: CalculationResult[] = [];
    let currentTotalPressureDrop = 0;
    let highestOverallVelocity = 0;
    let systemIsCompliant = true;
    
    pipeSegments.forEach(segment => {
      // Convert flow rate from kg/h to kg/s
      const massFlowRate = segment.flowRate / 3600;
      
      // Check if mass flow rate is valid
      if (massFlowRate <= 0) {
        results.push({
          sectionId: segment.id,
          recommendedDiameter: 0, velocity: 0, pressureDrop: 0, flowArea: 0, reynoldsNumber: 0,
          frictionFactor: 0, specificVolume: steamProperties.specificVolume,
          densityKgM3: steamProperties.density, steamType: steamProperties.steamType,
          fittingDetails: [], flowRateActual: segment.flowRate,
          velocityLimit: segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT : RETURN_VELOCITY_LIMIT,
          isVelocityCompliant: false, error: "Flow rate must be greater than zero."
        });
        systemIsCompliant = false;
        return;
      }

      if (segment.length <= 0) {
        results.push({
          sectionId: segment.id,
          recommendedDiameter: 0, velocity: 0, pressureDrop: 0, flowArea: 0, reynoldsNumber: 0,
          frictionFactor: 0, specificVolume: steamProperties.specificVolume,
          densityKgM3: steamProperties.density, steamType: steamProperties.steamType,
          fittingDetails: [], flowRateActual: segment.flowRate,
          velocityLimit: segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT : RETURN_VELOCITY_LIMIT,
          isVelocityCompliant: false, error: "Segment length must be greater than zero."
        });
        systemIsCompliant = false;
        return;
      }
      
      // Calculate volumetric flow rate (m³/s)
      const volumetricFlowRate = massFlowRate * steamProperties.specificVolume;
      
      // Initial guess for diameter based on velocity limit
      const velocityLimit = segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT : RETURN_VELOCITY_LIMIT;
      
      // Calculate minimum area required based on velocity limit
      const minArea = volumetricFlowRate / velocityLimit;
      
      // Calculate minimum diameter required (m)
      const minDiameterM = Math.sqrt((4 * minArea) / Math.PI);
      
      // Convert to mm and find next standard size up
      const minDiameterMm = minDiameterM * 1000;
      const recommendedPipeSize = STANDARD_PIPE_SIZES.find(size => size >= minDiameterMm) || STANDARD_PIPE_SIZES[STANDARD_PIPE_SIZES.length - 1];
      
      // Calculate actual flow area with the recommended size
      const actualDiameterM = recommendedPipeSize / 1000;
      const flowArea = Math.PI * Math.pow(actualDiameterM / 2, 2);
      
      // Calculate actual velocity
      const velocity = volumetricFlowRate / flowArea;
      
      // Check if velocity is compliant
      const isVelocityCompliant = velocity <= velocityLimit;
      if (!isVelocityCompliant) {
        systemIsCompliant = false;
      }
      
      if (velocity > highestOverallVelocity) {
        highestOverallVelocity = velocity;
      }
      
      // Calculate Reynolds number
      // Dynamic viscosity of steam (approximate value in Pa·s)
      const dynamicViscosity = 1.5e-5; // For steam at moderate pressure. More accurate models would vary this with temp/pressure.
      const density = steamProperties.density;
      const kinematicViscosity = dynamicViscosity / density;
      const reynoldsNumber = (velocity * actualDiameterM) / kinematicViscosity;
      
      // Calculate friction factor using Colebrook-White equation approximation (Swamee-Jain)
      const relativeRoughness = (segment.roughness / 1000) / actualDiameterM;
      let frictionFactor;
      
      if (reynoldsNumber < 2000) { // Laminar flow
        frictionFactor = 64 / reynoldsNumber;
      } else { // Turbulent flow
        // Swamee-Jain equation (explicit approximation of Colebrook-White)
        frictionFactor = 0.25 / Math.pow(Math.log10((relativeRoughness / 3.7) + (5.74 / Math.pow(reynoldsNumber, 0.9))), 2);
      }
      
      // Calculate pressure drop for straight pipe (bar)
      // Using Darcy-Weisbach equation: dP = f * (L/D) * (rho * v^2 / 2)
      const straightPipePressureDrop = (frictionFactor * segment.length * density * Math.pow(velocity, 2)) / (2 * actualDiameterM * 100000); // Convert Pa to bar
      
      // Calculate pressure drop for fittings
      let totalFittingsPressureDrop = 0;
      const fittingDetailsResults: CalculationResult['fittingDetails'] = [];
      
      segment.fittings.forEach(fitting => {
        let individualFittingTotalEqLengthM: number; 

        if (fitting.isCustom) {
          // For custom fittings, equivalentLength is already in meters
          individualFittingTotalEqLengthM = fitting.equivalentLength * fitting.quantity;
        } else {
          // For standard fittings, fitting.equivalentLength stores eqDiameters from fittingOptions
          individualFittingTotalEqLengthM = fitting.equivalentLength * actualDiameterM * fitting.quantity;
        }

        const pressureDropForThisFittingGroup = (frictionFactor * individualFittingTotalEqLengthM * density * Math.pow(velocity, 2)) / (2 * actualDiameterM * 100000); // Convert Pa to bar
        
        totalFittingsPressureDrop += pressureDropForThisFittingGroup;
        fittingDetailsResults.push({
          type: fitting.type,
          quantity: fitting.quantity,
          equivalentLength: individualFittingTotalEqLengthM, // Store the calculated total equivalent length in meters
          pressureDrop: pressureDropForThisFittingGroup,
          isCustom: fitting.isCustom
        });
      });
      
      // Total pressure drop for this segment
      const totalSegmentPressureDrop = straightPipePressureDrop + totalFittingsPressureDrop;
      currentTotalPressureDrop += totalSegmentPressureDrop;
      
      // Check if pressure drop is within allowable limit
      const pressureDropPercent = (totalSegmentPressureDrop / steamPressure) * 100;
      const normalizedDropPer100m = segment.length > 0 ? (pressureDropPercent * 100) / segment.length : Infinity;
      const isPressureDropCompliant = normalizedDropPer100m <= allowablePressureDrop;
      
      if (!isPressureDropCompliant) {
        systemIsCompliant = false;
      }
      
      results.push({
        sectionId: segment.id,
        recommendedDiameter: recommendedPipeSize,
        velocity,
        pressureDrop: totalSegmentPressureDrop,
        flowArea,
        reynoldsNumber,
        frictionFactor,
        specificVolume: steamProperties.specificVolume,
        densityKgM3: steamProperties.density,
        steamType: steamProperties.steamType,
        fittingDetails: fittingDetailsResults,
        flowRateActual: segment.flowRate,
        velocityLimit,
        isVelocityCompliant,
        normalizedDropPer100m,
        isPressureDropCompliant,
        error: undefined
      });
    });
    
    // Apply safety factor to total pressure drop
    const adjustedTotalDrop = currentTotalPressureDrop * safetyFactor;
    
    setSectionResults(results);
    setTotalPressureDrop(adjustedTotalDrop);
    setMaxOverallVelocity(highestOverallVelocity);
    setIsSystemCompliant(systemIsCompliant);
    
  }, [pipeSegments, steamProperties, allowablePressureDrop, safetyFactor, steamPressure]); // Added steamPressure dependency for pressureDropPercent calc
  
  // Functions to manage pipe segments
  const addPipeSegment = () => {
    const newSegment: PipeSegment = {
      id: Date.now().toString(),
      length: 10,
      material: 'carbon_steel',
      roughness: 0.045,
      customMaterial: false,
      flowRate: 100,
      fittings: [],
      type: 'supply',
    };
    setPipeSegments([...pipeSegments, newSegment]);
  };
  
  const removePipeSegment = (id: string) => {
    setPipeSegments(pipeSegments.filter(segment => segment.id !== id));
  };
  
  const updatePipeSegment = (id: string, updates: Partial<PipeSegment>) => {
    setPipeSegments(
      pipeSegments.map(segment => 
        segment.id === id ? { ...segment, ...updates } : segment
      )
    );
  };
  
  // Functions to manage fittings
  const addFittingToSegment = (segmentId: string, fittingTypeOrId: string) => {
    const segment = pipeSegments.find(s => s.id === segmentId);
    if (!segment) return;

    let newFitting: PipeFitting;

    if (fittingTypeOrId === 'custom') {
      if (!customFittingName.trim() || customFittingEquivLength <= 0) {
        alert("Please provide a name and a valid equivalent length (>0) for the custom fitting.");
        return;
      }
      newFitting = {
        id: Date.now().toString(),
        type: customFittingName || 'Custom Fitting',
        equivalentLength: customFittingEquivLength, // This is in meters for custom
        quantity: 1,
        isCustom: true
      };
      setCustomFittingName('');
      setCustomFittingEquivLength(1);
    } else {
      const fittingOption = fittingOptions.find(f => f.id === fittingTypeOrId);
      if (!fittingOption) return;
      newFitting = {
        id: Date.now().toString(),
        type: fittingOption.name,
        equivalentLength: fittingOption.eqDiameters, // This is in diameters for standard
        quantity: 1,
        isCustom: false
      };
    }
    
    updatePipeSegment(segmentId, { fittings: [...segment.fittings, newFitting] });
  };
  
  const removeFitting = (segmentId: string, fittingId: string) => {
    setPipeSegments(
      pipeSegments.map(segment => {
        if (segment.id === segmentId) {
          return { 
            ...segment, 
            fittings: segment.fittings.filter(fitting => fitting.id !== fittingId) 
          };
        }
        return segment;
      })
    );
  };
  
  const updateFitting = (segmentId: string, fittingId: string, updates: Partial<PipeFitting>) => {
    setPipeSegments(
      pipeSegments.map(segment => {
        if (segment.id === segmentId) {
          return {
            ...segment,
            fittings: segment.fittings.map(fitting => 
              fitting.id === fittingId ? { ...fitting, ...updates } : fitting
            )
          };
        }
        return segment;
      })
    );
  };
  
  // Helper function to get material selection for a pipe segment
  const getMaterialSelection = (segment: PipeSegment) => {
    if (segment.customMaterial) {
      return 'custom';
    }
    const material = materialOptions.find(m => Math.abs(m.roughness - segment.roughness) < 0.0001 && m.id !== 'custom');
    return material ? material.id : 'custom'; // Fallback to custom if somehow not found or if it's the custom placeholder
  };

  // Handle material change with support for custom roughness
  const handleMaterialChange = (segmentId: string, materialId: string) => {
    if (materialId === 'custom') {
      // Switch to custom material mode
      const segment = pipeSegments.find(s => s.id === segmentId);
      updatePipeSegment(segmentId, { 
        customMaterial: true,
        // Keep current roughness value as starting point for custom, or default if none
        roughness: segment?.roughness || 0.05 
      });
    } else {
      // Use predefined material
      const material = materialOptions.find(m => m.id === materialId);
      if (material) {
        updatePipeSegment(segmentId, { 
          material: material.id, // Store the material ID
          customMaterial: false,
          roughness: material.roughness 
        });
      }
    }
  };
  
  // Handle toggle for steam type (superheated vs saturated)
  const handleSteamTypeChange = (newIsSuperheated: boolean) => {
    setIsSuperheated(newIsSuperheated);
    if (!newIsSuperheated) {
      // If switching to saturated, force quality to 1 for dry saturated steam by default
      setSteamQuality(1);
      // Temperature will be set to saturation temp in the useEffect
    } else {
      // If switching to superheated, ensure temperature is above current saturation temp or a sensible default
      const currentSaturationTemp = steamProperties.saturationTemp || 100 * Math.pow(((steamPressure + 1.013)/1.013), 0.25);
      if (steamTemperature <= currentSaturationTemp) {
        setSteamTemperature(currentSaturationTemp + 10); // Set slightly above
      }
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Steam Pipe Sizing Calculator</h2>
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
          <h3 className="font-medium text-lg mb-4 text-gray-700">Steam System Parameters</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Steam Pressure (bar-g)</label>
            <input 
              type="number" 
              value={steamPressure} 
              onChange={(e) => setSteamPressure(Number(e.target.value) > 0 ? Number(e.target.value) : 0.1)} 
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
              step="0.1"
              min="0.1"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Steam Type</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="steamType" 
                  checked={isSuperheated} 
                  onChange={() => handleSteamTypeChange(true)} 
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Superheated</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="steamType" 
                  checked={!isSuperheated} 
                  onChange={() => handleSteamTypeChange(false)} 
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Saturated</span>
              </label>
            </div>
          </div>
          
          {isSuperheated ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Steam Temperature (°C)</label>
              <input 
                type="number" 
                value={steamTemperature} 
                onChange={(e) => setSteamTemperature(Number(e.target.value))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="1"
                min={steamProperties.saturationTemp ? (steamProperties.saturationTemp + 0.1).toFixed(1) : "0"}
              />
              <p className="text-xs text-blue-600 mt-1">
                Saturation temperature at this pressure: {steamProperties.saturationTemp.toFixed(1)}°C. 
                Superheated steam must be above this temperature.
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Steam Quality (0-1)</label>
              <input 
                type="number" 
                value={steamQuality} 
                onChange={(e) => setSteamQuality(Math.min(1, Math.max(0, Number(e.target.value))))} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.01"
                min="0"
                max="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                1.0 = Dry saturated steam, less than 1.0 = Wet steam. Temp: {steamProperties.saturationTemp.toFixed(1)}°C
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowable Pressure Drop (%/100m)</label>
              <input 
                type="number" 
                value={allowablePressureDrop} 
                onChange={(e) => setAllowablePressureDrop(Number(e.target.value) > 0 ? Number(e.target.value) : 0.1)} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.5"
                min="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Typically 5-10% per 100m
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Safety Factor</label>
              <input 
                type="number" 
                value={safetyFactor} 
                onChange={(e) => setSafetyFactor(Number(e.target.value) >=1 ? Number(e.target.value) : 1)} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                step="0.05"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Typically 1.1-1.5 (10-50%)
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-6"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Pipe Segments</h3>
            <button 
              onClick={addPipeSegment} 
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Segment
            </button>
          </div>
          
          {pipeSegments.map((segment, index) => (
            <div key={segment.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">Segment {index + 1}</h4>
                {pipeSegments.length > 1 && (
                  <button 
                    onClick={() => removePipeSegment(segment.id)} 
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pipe Type</label>
                <select
                  value={segment.type}
                  onChange={(e) => updatePipeSegment(segment.id, { type: e.target.value as PipeType })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="supply">Supply Steam (Limit: {SUPPLY_VELOCITY_LIMIT} m/s)</option>
                  <option value="return">Condensate Return (Limit: {RETURN_VELOCITY_LIMIT} m/s)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                  <input 
                    type="number" 
                    value={segment.length} 
                    onChange={(e) => updatePipeSegment(segment.id, { length: Number(e.target.value) > 0 ? Number(e.target.value) : 0.1 })} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="0.1"
                    min="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Steam Flow Rate (kg/h)</label>
                  <input 
                    type="number" 
                    value={segment.flowRate} 
                    onChange={(e) => updatePipeSegment(segment.id, { flowRate: Number(e.target.value) > 0 ? Number(e.target.value) : 1 })} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    min="1"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pipe Material</label>
                <select 
                  value={getMaterialSelection(segment)} 
                  onChange={(e) => handleMaterialChange(segment.id, e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {materialOptions.filter(m => m.id !== 'custom').map(material => (
                    <option key={material.id} value={material.id}>
                      {material.name} (Roughness: {material.roughness} mm)
                    </option>
                  ))}
                  <option value="custom">Custom Material</option>
                </select>
              </div>
              
              {segment.customMaterial && (
                <div className="mb-4 pl-4 border-l-4 border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Material Roughness (mm)
                  </label>
                  <input 
                    type="number" 
                    value={segment.roughness} 
                    onChange={(e) => updatePipeSegment(segment.id, { roughness: Number(e.target.value) >= 0 ? Number(e.target.value) : 0 })} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="0.001"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter absolute roughness in millimeters
                  </p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fittings and Valves</label>
                
                <div className="mb-2">
                  <select
                    className="w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        addFittingToSegment(segment.id, e.target.value);
                        e.target.value = ''; // Reset dropdown
                      }
                    }}
                    value="" // Controlled by onChange to reset
                  >
                    <option value="" disabled>Add standard fitting...</option>
                    {fittingOptions.map(fitting => (
                      <option key={fitting.id} value={fitting.id}>
                        {fitting.name} (EqL: {fitting.eqDiameters} dia.)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
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
                    
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-600 mb-1">Equivalent Length (m)</label>
                      <input
                        type="number"
                        value={customFittingEquivLength}
                        onChange={(e) => setCustomFittingEquivLength(Number(e.target.value) > 0 ? Number(e.target.value) : 0.1)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md"
                        step="0.1"
                        min="0.1"
                      />
                    </div>
                    
                    <div className="col-span-2 flex items-end">
                      <button
                        onClick={() => addFittingToSegment(segment.id, 'custom')}
                        className="w-full h-10 bg-blue-600 text-white px-1 py-2 rounded-md text-xl font-medium hover:bg-blue-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  {segment.fittings.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No fittings added.</p>
                  ) : (
                    <ul className="space-y-2">
                      {segment.fittings.map(fitting => (
                        <li key={fitting.id} className="bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex items-center p-2">
                            <div className="flex-grow">
                              <span className="text-sm font-medium text-gray-700">{fitting.type}</span>
                              <span className="text-xs text-blue-600 ml-2">
                                (Eq. Length: {fitting.equivalentLength.toFixed(2)} {fitting.isCustom ? 'm' : 'dia.'})
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center">
                                <label className="text-xs text-gray-600 mr-1">Qty:</label>
                                <input
                                  type="number"
                                  value={fitting.quantity}
                                  onChange={(e) => updateFitting(
                                    segment.id, 
                                    fitting.id, 
                                    { quantity: Math.max(1, Number(e.target.value)) }
                                  )}
                                  className="w-14 p-1 text-sm border border-gray-300 rounded-md"
                                  min="1"
                                />
                              </div>
                              
                              <button
                                onClick={() => removeFitting(segment.id, fitting.id)}
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
                <h4 className="font-medium text-base text-gray-700">Steam Properties</h4>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Steam Type:</p>
                  <p className="font-semibold text-gray-800">{steamProperties.steamType}</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Specific Volume:</p>
                  <p className="font-semibold text-gray-800">{steamProperties.specificVolume > 0 ? steamProperties.specificVolume.toFixed(4) : 'N/A'} m³/kg</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Density:</p>
                  <p className="font-semibold text-gray-800">{steamProperties.density > 0 ? steamProperties.density.toFixed(4) : 'N/A'} kg/m³</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Saturation Temperature:</p>
                  <p className="font-semibold text-gray-800">{steamProperties.saturationTemp.toFixed(1)} °C</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-base text-gray-700">System Summary</h4>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Total Pressure Drop:</p>
                  <p className="font-bold text-lg text-blue-600">{totalPressureDrop.toFixed(3)} bar</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">As % of Supply Pressure:</p>
                  <p className="font-semibold text-gray-800">
                    {steamPressure > 0 ? ((totalPressureDrop / steamPressure) * 100).toFixed(2) : 'N/A'}% of {steamPressure.toFixed(1)} bar-g
                  </p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Highest Overall Velocity:</p>
                  <p className={`font-semibold ${maxOverallVelocity > SUPPLY_VELOCITY_LIMIT ? 'text-orange-600' : 'text-gray-800'}`}>
                    {maxOverallVelocity.toFixed(2)} m/s
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className={`rounded-md p-3 ${isSystemCompliant ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                <p className={`text-sm font-medium ${isSystemCompliant ? 'text-green-800' : 'text-red-800'}`}>
                  {sectionResults.length === 0 ? "Enter parameters to calculate." : 
                   isSystemCompliant 
                    ? 'System Compliance: All pipe segments meet velocity and pressure drop requirements.'
                    : 'System Compliance: Warning! One or more pipe segments exceed recommended velocity or pressure drop limits. Review section details.'}
                </p>
              </div>
            </div>
          </div>
          
          <h4 className="font-medium mb-3 text-blue-700">Segment Details</h4>
          {sectionResults.length === 0 && <p className="text-sm text-gray-500 italic">No segments defined or calculation pending.</p>}
          {sectionResults.map((result, index) => (
            result.error ? (
              <div key={`error-${index}`} className="bg-red-100 p-3 rounded-md mb-3 border border-red-300">
                <h5 className="font-medium text-red-700">Segment {index + 1} - Error</h5>
                <p className="text-sm text-red-600">{result.error}</p>
              </div>
            ) : (
              <div key={result.sectionId || index} className="bg-white p-3 rounded-md mb-3 shadow-sm border border-gray-200">
                <h5 className="font-medium text-gray-700">Segment {index + 1} (Type: <span className="capitalize">{pipeSegments[index]?.type || 'N/A'}</span>)</h5>
                
                <div className="mb-2 bg-gray-50 p-2 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Recommended Pipe Size:</p>
                  <p className="text-lg font-bold text-blue-600">DN {result.recommendedDiameter} mm</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Flow Rate: {result.flowRateActual.toFixed(1)} kg/h
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-gray-600">Velocity (Limit: {result.velocityLimit.toFixed(1)} m/s):</p>
                    <p className={`font-semibold ${!result.isVelocityCompliant ? 'text-red-600' : 'text-green-600'}`}>
                      {result.velocity.toFixed(2)} m/s {result.isVelocityCompliant ? '(OK)' : '(High)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pressure Drop:</p>
                    <p className="font-semibold text-gray-800">{result.pressureDrop.toFixed(3)} bar</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reynolds No.:</p>
                    <p className="font-semibold text-gray-800">{result.reynoldsNumber.toExponential(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Friction Factor:</p>
                    <p className="font-semibold text-gray-800">{result.frictionFactor.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pressure Drop / 100m:</p>
                    <p className={`font-semibold ${result.isPressureDropCompliant === false ? 'text-red-600' : (result.isPressureDropCompliant === true ? 'text-green-600' : 'text-gray-800')}`}>
                      {result.normalizedDropPer100m !== undefined ? result.normalizedDropPer100m.toFixed(2) : 'N/A'}% 
                      {result.isPressureDropCompliant === true ? ' (OK)' : (result.isPressureDropCompliant === false ? ' (High)' : '')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cross-Section Area:</p>
                    <p className="font-semibold text-gray-800">{(result.flowArea * 1000000).toFixed(1)} mm²</p>
                  </div>
                </div>
                
                {result.fittingDetails && result.fittingDetails.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Fitting Breakdown:</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left font-semibold text-gray-600 border border-gray-300">Fitting</th>
                            <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Qty</th>
                            <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Total Eq. L (m)</th>
                            <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Pressure Drop (bar)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.fittingDetails.map((fitting, i) => (
                            <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2 text-gray-700 border border-gray-300">
                                {fitting.type}
                                {fitting.isCustom && <span className="text-xs text-blue-500 ml-1">(Custom)</span>}
                              </td>
                              <td className="p-2 text-right text-gray-700 border border-gray-300">
                                {fitting.quantity}
                              </td>
                              <td className="p-2 text-right text-gray-700 border border-gray-300">
                                {fitting.equivalentLength.toFixed(2)} 
                              </td>
                              <td className="p-2 text-right font-medium text-gray-700 border border-gray-300">
                                {fitting.pressureDrop.toFixed(4)}
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
            <h4 className="font-medium mb-2 text-blue-700">Steam Trap Selection Guidance</h4>
            <p className="text-sm text-blue-800">For condensate handling, consider the following:</p>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
              <li>Steam traps should be sized for at least 3 times the normal condensate load</li>
              <li>Pressure differential across trap: up to {(steamPressure * 0.8).toFixed(1)} bar</li>
              <li>Choose trap type based on application:
                <ul className="list-disc pl-5 mt-1 mb-1 text-xs">
                  <li>Mechanical (Float & Thermostatic) - For even loads, low pressure</li>
                  <li>Thermodynamic - For high pressure, superheated steam</li>
                  <li>Thermostatic - For heating, tracing, low loads</li>
                </ul>
              </li>
              <li>Install check valves on condensate return lines if backpressure may occur</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Calculations use the Darcy-Weisbach equation for pressure drop and an explicit approximation (Swamee-Jain) of the Colebrook-White equation for friction factor.</li>
          <li>Steam properties (specific volume, density, saturation temperature, viscosity) are calculated using simplified engineering approximations. For high-precision or critical design, industry-standard steam tables (e.g., IAPWS-IF97) or specialized software should be consulted.</li>
          <li>Velocity limits: Supply Steam ({SUPPLY_VELOCITY_LIMIT} m/s), Condensate Return ({RETURN_VELOCITY_LIMIT} m/s) based on industry standards.</li>
          <li>Pipe sizes are selected from standard nominal diameters (DN) in millimeters.</li>
          <li>High velocity steam can cause noise, erosion, and water hammer in condensate lines.</li>
          <li>For wet steam (quality less than 1.0), consider installing separators to improve quality.</li>
          <li>This calculator provides sizing guidance only. Always consult relevant codes and standards.</li>
          <li>Insulation is highly recommended for all steam pipes to reduce heat loss and improve efficiency.</li>
          <li>Steam systems should include proper condensate drainage points at natural low points.</li>
        </ul>
      </div>
    </div>
  );
};

export default SteamPipeSizingCalculator;