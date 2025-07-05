import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

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
  elevationChange: number; // meters (positive for upward flow, negative for downward)
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

// Define calculation result - updated with missing properties
interface CalculationResult {
  sectionId: string;
  recommendedDiameter: number;  // mm
  velocity: number;             // m/s
  pressureDrop: number;         // bar (friction losses)
  staticHeadPressureDrop: number; // bar (due to elevation)
  totalPressureDrop: number;      // bar (friction + static)
  flowArea: number;             // m²
  reynoldsNumber: number;
  frictionFactor: number;
  specificVolume: number;       // m³/kg
  densityKgM3: number;          // kg/m³
  dynamicViscosity: number;     // Pa·s
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
  elevationChange?: number;     // Store elevation change in the result
  error?: string;               // Error message if calculation fails
  pressureDropPerMeter?: number; // Pressure drop per meter (bar/m)
  minVelocityRequirement?: number; // Added missing property
}

// Constants
const SUPPLY_VELOCITY_LIMIT_MAX = 35; // m/s for supply steam pipes (maximum)
const RETURN_VELOCITY_LIMIT_MAX = 20; // m/s for condensate return lines (maximum)
const SUPPLY_VELOCITY_LIMIT_MIN = 8;  // m/s for supply steam pipes (minimum)
const RETURN_VELOCITY_LIMIT_MIN = 5;  // m/s for condensate return lines (minimum)
const STANDARD_PIPE_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750]; // mm

const SteamPipeSizingCalculator: React.FC<SteamPipeSizingCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Steam Pipe Sizing Calculator',
    discipline: 'mvac',
    calculatorType: 'steamPipe'
  });

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
      elevationChange: 0, // No elevation change by default
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
    
    // More accurate calculation for saturation temperature based on pressure
    // Using Antoine equation for water (valid for pressure range 0.1-30 bar)
    const A = 7.96681;
    const B = 1668.21;
    const C = 228.0;
    // Convert pressure from bar to mmHg for Antoine equation
    const pressureInMmHg = absolutePressure * 750.062;
    // Calculate saturation temperature using Antoine equation (in °C)
    const saturationTemp = B / (A - Math.log10(pressureInMmHg)) - C;
    
    let specificVolume = 0;
    let steamType: SteamConditionType = '';
    let density = 0;
    
    let effectiveIsSuperheated = isSuperheated;
    if (isSuperheated && steamTemperature <= saturationTemp) {
      effectiveIsSuperheated = false; // Treat as saturated if temp is not above saturation
    }

    // Check if steam is superheated or saturated
    if (effectiveIsSuperheated) {
      // Improved calculation for superheated steam
      // Using ideal gas approximation with compressibility factor
      const Ra = 461.5; // Gas constant for water vapor (J/kg·K)
      const tempK = steamTemperature + 273.15; // Convert to Kelvin
      
      // Calculate compressibility factor (simplified approximation)
      // Z ≈ 1 + 0.0005 * P * (350 - T) / 100 for steam
      const Z = 1 + 0.0005 * absolutePressure * (350 - tempK/1.8) / 100;
      
      // V = Z·R·T/P
      specificVolume = Z * Ra * tempK / (absolutePressure * 100000);
      steamType = 'Superheated';
    } else {
      // More accurate saturated steam calculation with quality
      // Using polynomial approximation for specific volume at saturation
      // For saturation pressure range 1-25 bar
      const satTempK = saturationTemp + 273.15;
      
      // Specific volume of saturated steam (m³/kg) - polynomial fit to steam tables
      let vg = 0;
      if (absolutePressure <= 1) {
        vg = 1.696 / absolutePressure;
      } else if (absolutePressure <= 5) {
        vg = 0.3782 / Math.pow(absolutePressure, 0.89);
      } else if (absolutePressure <= 25) {
        vg = 0.24 / Math.pow(absolutePressure, 0.855);
      } else {
        vg = 0.18 / Math.pow(absolutePressure, 0.825);
      }
      
      // Specific volume of saturated water (m³/kg)
      const vf = 0.001; // Approximation, nearly constant at common steam pressures
      
      // Calculate specific volume based on quality
      const currentQuality = (isSuperheated && steamTemperature <= saturationTemp && steamQuality === 1) ? 1.0 : steamQuality;
      specificVolume = vf + (vg - vf) * currentQuality;
      
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
          recommendedDiameter: 0, velocity: 0, pressureDrop: 0, staticHeadPressureDrop: 0, totalPressureDrop: 0,
          flowArea: 0, reynoldsNumber: 0, frictionFactor: 0, specificVolume: steamProperties.specificVolume,
          densityKgM3: steamProperties.density, dynamicViscosity: 0, steamType: steamProperties.steamType,
          fittingDetails: [], flowRateActual: segment.flowRate,
          velocityLimit: segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT_MAX : RETURN_VELOCITY_LIMIT_MAX,
          isVelocityCompliant: false, error: "Flow rate must be greater than zero.",
          minVelocityRequirement: segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT_MIN : RETURN_VELOCITY_LIMIT_MIN
        });
        systemIsCompliant = false;
        return;
      }

      if (segment.length <= 0) {
        results.push({
          sectionId: segment.id,
          recommendedDiameter: 0, velocity: 0, pressureDrop: 0, staticHeadPressureDrop: 0, totalPressureDrop: 0,
          flowArea: 0, reynoldsNumber: 0, frictionFactor: 0, specificVolume: steamProperties.specificVolume,
          densityKgM3: steamProperties.density, dynamicViscosity: 0, steamType: steamProperties.steamType,
          fittingDetails: [], flowRateActual: segment.flowRate,
          velocityLimit: segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT_MAX : RETURN_VELOCITY_LIMIT_MAX,
          isVelocityCompliant: false, error: "Segment length must be greater than zero.",
          minVelocityRequirement: segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT_MIN : RETURN_VELOCITY_LIMIT_MIN
        });
        systemIsCompliant = false;
        return;
      }
      
      // Calculate volumetric flow rate (m³/s)
      const volumetricFlowRate = massFlowRate * steamProperties.specificVolume;
      
      // Set velocity limits based on pipe type
      const velocityMaxLimit = segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT_MAX : RETURN_VELOCITY_LIMIT_MAX;
      const velocityMinLimit = segment.type === 'supply' ? SUPPLY_VELOCITY_LIMIT_MIN : RETURN_VELOCITY_LIMIT_MIN;
      
      // Determine maximum pressure drop based on steam pressure
      // Values in mbar/m (millibars per meter)
      let maxAcceptablePressureDrop: number;
      let minAcceptablePressureDrop: number;
      
      if (steamPressure <= 4) {
        // Low pressure steam systems (up to 4 bar-g)
        minAcceptablePressureDrop = 0.2; // mbar/m
        maxAcceptablePressureDrop = 0.8; // mbar/m
      } else if (steamPressure <= 10) {
        // Medium pressure steam systems (4-10 bar-g)
        minAcceptablePressureDrop = 0.5; // mbar/m
        maxAcceptablePressureDrop = 1.5; // mbar/m
      } else {
        // High pressure steam systems (above 10 bar-g)
        minAcceptablePressureDrop = 1.0; // mbar/m
        maxAcceptablePressureDrop = 3.0; // mbar/m
      }
      
      // Calculate properties for pipe size
      const calculatePipeSizeProperties = (pipeSize: number) => {
        const diameterM = pipeSize / 1000;
        const area = Math.PI * Math.pow(diameterM / 2, 2);
        const vel = volumetricFlowRate / area;
        
        // Dynamic viscosity calculation
        let dynViscosity: number;
        const tempK = (isSuperheated ? steamTemperature : steamProperties.saturationTemp) + 273.15;
        
        if (isSuperheated) {
          const mu0 = 8.85e-6;
          const T0 = 273.15;
          const C = 120;
          dynViscosity = mu0 * Math.pow(tempK/T0, 1.5) * (T0 + C)/(tempK + C);
          if (steamPressure > 5) {
            const pressureFactor = 1 + 0.02 * steamPressure;
            dynViscosity *= pressureFactor;
          }
        } else {
          if (steamQuality > 0.9) {
            dynViscosity = 1.26e-5 * Math.pow(tempK/300, 0.7);
          } else {
            const muSteam = 1.26e-5 * Math.pow(tempK/300, 0.7);
            const muWater = 2.414e-5 * Math.pow(10, 247.8/(tempK-140));
            dynViscosity = muWater * (1 - steamQuality) + muSteam * steamQuality;
          }
        }
        
        const density = steamProperties.density;
        const kinViscosity = dynViscosity / density;
        const reynolds = (vel * diameterM) / kinViscosity;
        
        // Friction factor
        let friction: number;
        const relRoughness = (segment.roughness / 1000) / diameterM;
        
        if (reynolds < 2000) {
          friction = 64 / reynolds;
        } else {
          friction = 0.25 / Math.pow(Math.log10((relRoughness / 3.7) + (5.74 / Math.pow(reynolds, 0.9))), 2);
        }
        
        // Straight pipe pressure drop (bar)
        const straightPipePressureDrop = (friction * segment.length * density * Math.pow(vel, 2)) / (2 * diameterM * 100000);
        
        // Pressure drop per meter (bar/m)
        const pressureDropPerMeter = straightPipePressureDrop / segment.length;
        
        // Convert to mbar/m
        const pressureDropMbarPerM = pressureDropPerMeter * 1000;
        
        return {
          diameterM,
          area,
          vel,
          dynViscosity,
          density,
          kinViscosity,
          reynolds,
          friction,
          straightPipePressureDrop,
          pressureDropPerMeter,
          pressureDropMbarPerM
        };
      };
      
      // Start with the smallest pipe size
      let bestPipeSize = STANDARD_PIPE_SIZES[0];
      let bestPipeSizeProps = calculatePipeSizeProperties(bestPipeSize);
      
      // Check if the smallest pipe meets the maximum velocity limit
      if (bestPipeSizeProps.vel > velocityMaxLimit) {
        // Find a pipe size that meets the maximum velocity limit
        for (let i = 1; i < STANDARD_PIPE_SIZES.length; i++) {
          const props = calculatePipeSizeProperties(STANDARD_PIPE_SIZES[i]);
          if (props.vel <= velocityMaxLimit) {
            bestPipeSize = STANDARD_PIPE_SIZES[i];
            bestPipeSizeProps = props;
            break;
          }
          
          // If we've reached the largest pipe size and velocity is still too high
          if (i === STANDARD_PIPE_SIZES.length - 1) {
            bestPipeSize = STANDARD_PIPE_SIZES[i];
            bestPipeSizeProps = props;
          }
        }
      }
      
      // Check if the pressure drop is within limits
      if (bestPipeSizeProps.pressureDropMbarPerM > maxAcceptablePressureDrop) {
        // Find a pipe size that meets the maximum pressure drop limit
        for (let i = STANDARD_PIPE_SIZES.indexOf(bestPipeSize) + 1; i < STANDARD_PIPE_SIZES.length; i++) {
          const props = calculatePipeSizeProperties(STANDARD_PIPE_SIZES[i]);
          if (props.pressureDropMbarPerM <= maxAcceptablePressureDrop) {
            bestPipeSize = STANDARD_PIPE_SIZES[i];
            bestPipeSizeProps = props;
            break;
          }
          
          // If we've reached the largest pipe size and pressure drop is still too high
          if (i === STANDARD_PIPE_SIZES.length - 1) {
            bestPipeSize = STANDARD_PIPE_SIZES[i];
            bestPipeSizeProps = props;
          }
        }
      }
      
      // Check if the velocity is too low (below minimum)
      if (bestPipeSizeProps.vel < velocityMinLimit) {
        // Try to find a smaller pipe that meets the minimum velocity
        // while still respecting the maximum pressure drop limit
        let currentSizeIndex = STANDARD_PIPE_SIZES.indexOf(bestPipeSize);
        
        for (let i = currentSizeIndex - 1; i >= 0; i--) {
          const props = calculatePipeSizeProperties(STANDARD_PIPE_SIZES[i]);
          
          // If this size meets both min velocity and max pressure drop, use it
          if (props.vel >= velocityMinLimit && props.pressureDropMbarPerM <= maxAcceptablePressureDrop) {
            bestPipeSize = STANDARD_PIPE_SIZES[i];
            bestPipeSizeProps = props;
            break;
          }
          
          // If this size meets min velocity but exceeds max pressure drop, 
          // determine if it's within a reasonable tolerance (up to 20% above max)
          if (props.vel >= velocityMinLimit && 
              props.pressureDropMbarPerM <= maxAcceptablePressureDrop * 1.2) {
            // Accept this slightly higher pressure drop to achieve minimum velocity
            bestPipeSize = STANDARD_PIPE_SIZES[i];
            bestPipeSizeProps = props;
            break;
          }
        }
      }
      
      // Now we have the recommended pipe size
      const recommendedPipeSize = bestPipeSize;
      const actualDiameterM = bestPipeSizeProps.diameterM;
      const flowArea = bestPipeSizeProps.area;
      const velocity = bestPipeSizeProps.vel;
      
      // Check if velocity is compliant with both min and max limits
      const isVelocityCompliant = velocity >= velocityMinLimit && velocity <= velocityMaxLimit;
      
      if (!isVelocityCompliant) {
        systemIsCompliant = false;
      }
      
      if (velocity > highestOverallVelocity) {
        highestOverallVelocity = velocity;
      }
      
      // Calculate dynamic viscosity based on temperature and pressure
      // Using simplified Sutherland's formula for steam
      const tempK = (isSuperheated ? steamTemperature : steamProperties.saturationTemp) + 273.15;
      
      // Dynamic viscosity calculation for steam
      let dynamicViscosity = 0;
      if (isSuperheated) {
        // Viscosity for superheated steam - simplified correlation
        // Valid for temperature range 100-350°C and pressure up to 25 bar
        const mu0 = 8.85e-6; // Pa·s
        const T0 = 273.15;   // K
        const C = 120;       // Sutherland's constant for steam, K
        
        dynamicViscosity = mu0 * Math.pow(tempK/T0, 1.5) * (T0 + C)/(tempK + C);
        
        // Pressure correction for high pressure
        if (steamPressure > 5) {
          // Approximate pressure correction factor
          const pressureFactor = 1 + 0.02 * steamPressure;
          dynamicViscosity *= pressureFactor;
        }
      } else {
        // Viscosity for saturated/wet steam
        if (steamQuality > 0.9) {
          // For dry steam (x > 0.9)
          dynamicViscosity = 1.26e-5 * Math.pow(tempK/300, 0.7);
        } else {
          // For wet steam, interpolate between water and steam viscosity
          const muSteam = 1.26e-5 * Math.pow(tempK/300, 0.7);
          const muWater = 2.414e-5 * Math.pow(10, 247.8/(tempK-140)); // Simplified formula for water
          dynamicViscosity = muWater * (1 - steamQuality) + muSteam * steamQuality;
        }
      }
      
      const density = steamProperties.density;
      const kinematicViscosity = dynamicViscosity / density;
      const reynoldsNumber = (velocity * actualDiameterM) / kinematicViscosity;
      
      // Calculate friction factor using Colebrook-White equation approximation (Swamee-Jain)
      const relativeRoughness = (segment.roughness / 1000) / actualDiameterM;
      let frictionFactor: number;
      
      if (reynoldsNumber < 2000) { // Laminar flow
        frictionFactor = 64 / reynoldsNumber;
      } else { // Turbulent flow
        // Swamee-Jain equation (explicit approximation of Colebrook-White)
        frictionFactor = 0.25 / Math.pow(Math.log10((relativeRoughness / 3.7) + (5.74 / Math.pow(reynoldsNumber, 0.9))), 2);
      }
      
      // Calculate pressure drop for straight pipe (bar)
      // Using Darcy-Weisbach equation: dP = f * (L/D) * (rho * v^2 / 2)
      const straightPipePressureDrop = (frictionFactor * segment.length * density * Math.pow(velocity, 2)) / (2 * actualDiameterM * 100000); // Convert Pa to bar
      
      // Calculate pressure drop per meter (bar/m)
      const pressureDropPerMeter = straightPipePressureDrop / segment.length;
      
      // Calculate static head pressure drop due to elevation change
      // ΔP = ρ·g·h / 100000 (to convert Pa to bar)
      const g = 9.81; // m/s²
      const staticHeadPressureDrop = (density * g * segment.elevationChange) / 100000;
      
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
      
      // Total friction pressure drop for this segment
      const frictionPressureDrop = straightPipePressureDrop + totalFittingsPressureDrop;
      
      // Total pressure drop including static head
      const totalSegmentPressureDrop = frictionPressureDrop + staticHeadPressureDrop;
      currentTotalPressureDrop += totalSegmentPressureDrop;
      
      // Check if pressure drop is within allowable limit
      // Only check friction pressure drop against allowable limit (not static head)
      const pressureDropPercent = (frictionPressureDrop / steamPressure) * 100;
      const normalizedDropPer100m = segment.length > 0 ? (pressureDropPercent * 100) / segment.length : Infinity;
      const isPressureDropCompliant = normalizedDropPer100m <= allowablePressureDrop;
      
      if (!isPressureDropCompliant) {
        systemIsCompliant = false;
      }
      
      results.push({
        sectionId: segment.id,
        recommendedDiameter: recommendedPipeSize,
        velocity,
        pressureDrop: frictionPressureDrop,
        staticHeadPressureDrop,
        totalPressureDrop: totalSegmentPressureDrop,
        flowArea,
        reynoldsNumber,
        frictionFactor,
        specificVolume: steamProperties.specificVolume,
        densityKgM3: steamProperties.density,
        dynamicViscosity,
        steamType: steamProperties.steamType,
        fittingDetails: fittingDetailsResults,
        flowRateActual: segment.flowRate,
        velocityLimit: velocityMaxLimit,
        minVelocityRequirement: velocityMinLimit,
        isVelocityCompliant,
        normalizedDropPer100m,
        isPressureDropCompliant,
        elevationChange: segment.elevationChange,
        pressureDropPerMeter,
        error: undefined
      });
    });
    
    // Apply safety factor to total pressure drop
    const adjustedTotalDrop = currentTotalPressureDrop * safetyFactor;
    
    setSectionResults(results);
    setTotalPressureDrop(adjustedTotalDrop);
    setMaxOverallVelocity(highestOverallVelocity);
    setIsSystemCompliant(systemIsCompliant);
    
    // Save calculation and prepare export data
    if (results.length > 0 && adjustedTotalDrop > 0) {
      const inputs = {
        steamPressure,
        steamTemperature,
        steamQuality,
        isSuperheated,
        allowablePressureDrop,
        safetyFactor,
        pipeSegments
      };
      
      const calculationResults = {
        sectionResults: results,
        totalPressureDrop: adjustedTotalDrop,
        maxOverallVelocity: highestOverallVelocity,
        isSystemCompliant: systemIsCompliant,
        steamProperties
      };
      
      saveCalculation(inputs, calculationResults);
      prepareExportData(inputs, calculationResults);
    }
    
  }, [pipeSegments, steamProperties, allowablePressureDrop, safetyFactor, steamPressure, isSuperheated, steamQuality, steamTemperature]); 
  
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
      elevationChange: 0,
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
  
  // Function to get a pipe size recommendation for a given pressure drop per meter
  const recommendPipeSize = (result: CalculationResult) => {
    if (!result || !result.pressureDropPerMeter || !result.velocity) return null;
    
    // Industry standards for pressure drop per meter based on pressure range
    let lowPressureDropLimit: number;
    let mediumPressureDropLimit: number;
    let highPressureDropLimit: number;
    
    if (steamPressure <= 4) {
      // Low pressure steam systems (up to 4 bar-g)
      lowPressureDropLimit = 0.2;    // mbar/m
      mediumPressureDropLimit = 0.5; // mbar/m
      highPressureDropLimit = 0.8;   // mbar/m
    } else if (steamPressure <= 10) {
      // Medium pressure steam systems (4-10 bar-g)
      lowPressureDropLimit = 0.5;    // mbar/m
      mediumPressureDropLimit = 1.0; // mbar/m
      highPressureDropLimit = 1.5;   // mbar/m
    } else {
      // High pressure steam systems (above 10 bar-g)
      lowPressureDropLimit = 1.0;    // mbar/m
      mediumPressureDropLimit = 2.0; // mbar/m
      highPressureDropLimit = 3.0;   // mbar/m
    }
    
    // Velocity limits - use existing result's minVelocityRequirement or calculate
    const velocityMinLimit = result.minVelocityRequirement || 
      (result.velocityLimit === SUPPLY_VELOCITY_LIMIT_MAX ? SUPPLY_VELOCITY_LIMIT_MIN : RETURN_VELOCITY_LIMIT_MIN);
    const velocityMaxLimit = result.velocityLimit;
    
    const pressureDropMbarPerM = result.pressureDropPerMeter * 1000;
    let recommendation = '';
    
    // Check velocity first
    if (result.velocity < velocityMinLimit) {
      const currentIndex = STANDARD_PIPE_SIZES.indexOf(result.recommendedDiameter);
      if (currentIndex > 0) {
        const smallerSize = STANDARD_PIPE_SIZES[currentIndex - 1];
        recommendation = `Velocity (${result.velocity.toFixed(1)} m/s) is below minimum recommendation (${velocityMinLimit} m/s). Consider DN ${smallerSize} mm for better steam transportation.`;
      } else {
        recommendation = `Velocity (${result.velocity.toFixed(1)} m/s) is below minimum recommendation (${velocityMinLimit} m/s), but this is the smallest standard pipe size.`;
      }
    } else if (result.velocity > velocityMaxLimit) {
      const currentIndex = STANDARD_PIPE_SIZES.indexOf(result.recommendedDiameter);
      if (currentIndex < STANDARD_PIPE_SIZES.length - 1) {
        const largerSize = STANDARD_PIPE_SIZES[currentIndex + 1];
        recommendation = `Velocity exceeds maximum limit. Increase to DN ${largerSize} mm to reduce velocity.`;
      } else {
        recommendation = 'Velocity exceeds maximum limit. Consider reducing flow rate or using multiple pipes.';
      }
    }
    // Check pressure drop
    else if (pressureDropMbarPerM < lowPressureDropLimit) {
      // Current pipe is oversized
      const currentIndex = STANDARD_PIPE_SIZES.indexOf(result.recommendedDiameter);
      if (currentIndex > 0) {
        const smallerSize = STANDARD_PIPE_SIZES[currentIndex - 1];
        recommendation = `Pressure drop is very low. Consider DN ${smallerSize} mm for better economics.`;
      } else {
        recommendation = 'Pressure drop is very low, but this is the smallest standard pipe size.';
      }
    } else if (pressureDropMbarPerM > highPressureDropLimit) {
      // Current pipe is undersized
      const currentIndex = STANDARD_PIPE_SIZES.indexOf(result.recommendedDiameter);
      if (currentIndex < STANDARD_PIPE_SIZES.length - 1) {
        const largerSize = STANDARD_PIPE_SIZES[currentIndex + 1];
        recommendation = `Pressure drop exceeds recommended limit. Increase to DN ${largerSize} mm.`;
      } else {
        recommendation = 'Pressure drop is too high. Consider reducing flow rate or using multiple pipes.';
      }
    } else if (pressureDropMbarPerM > mediumPressureDropLimit) {
      recommendation = 'Pressure drop is in upper acceptable range, suitable for short runs.';
    } else {
      recommendation = 'Pipe size provides optimal balance between velocity and pressure drop.';
    }
    
    return recommendation;
  };
  
  return (
    <CalculatorWrapper
      title="Steam Pipe Sizing Calculator"
      discipline="mvac"
      calculatorType="steamPipe"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">

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
                  <option value="supply">Supply Steam (Max: {SUPPLY_VELOCITY_LIMIT_MAX} m/s, Min: {SUPPLY_VELOCITY_LIMIT_MIN} m/s)</option>
                  <option value="return">Condensate Return (Max: {RETURN_VELOCITY_LIMIT_MAX} m/s, Min: {RETURN_VELOCITY_LIMIT_MIN} m/s)</option>
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
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Elevation Change (m)</label>
                <div className="flex items-center">
                  <input 
                    type="number" 
                    value={segment.elevationChange} 
                    onChange={(e) => updatePipeSegment(segment.id, { elevationChange: Number(e.target.value) })} 
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                    step="0.1"
                  />
                  <div className="ml-2 text-xs text-gray-500">
                    (+) upward flow, (-) downward flow
                  </div>
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
                  <p className={`font-semibold ${maxOverallVelocity > SUPPLY_VELOCITY_LIMIT_MAX ? 'text-orange-600' : 'text-gray-800'}`}>
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
                
                {/* Pipe Size Recommendation */}
                <div className="mb-2 bg-gray-50 p-2 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Recommended Pipe Size:</p>
                  <p className="text-lg font-bold text-blue-600">DN {result.recommendedDiameter} mm</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <p className="text-xs text-gray-500">
                      Flow Rate: {result.flowRateActual.toFixed(1)} kg/h
                    </p>
                    <p className="text-xs text-gray-500">
                      Elevation Change: {result.elevationChange} m
                    </p>
                  </div>
                </div>
                
                {/* Pressure Drop Recommendation */}
                <div className="mb-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-sm font-medium text-gray-700">Pressure Drop Analysis:</p>
                  <p className="text-sm text-gray-700">{result.pressureDropPerMeter && (result.pressureDropPerMeter * 1000).toFixed(3)} mbar/m  ({result.pressureDropPerMeter?.toFixed(5)} bar/m)</p>
                  <p className="text-sm text-blue-800">{recommendPipeSize(result)}</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-gray-600">Velocity Range:</p>
                    <p className={`font-semibold ${!result.isVelocityCompliant ? 'text-red-600' : 'text-green-600'}`}>
                      {result.velocity.toFixed(2)} m/s 
                      {result.isVelocityCompliant ? ' (OK)' : (result.velocity < (result.minVelocityRequirement || 0) ? ' (Too Low)' : ' (Too High)')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Recommended: {result.minVelocityRequirement}-{result.velocityLimit} m/s
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Friction Loss:</p>
                    <p className="font-semibold text-gray-800">{result.pressureDrop.toFixed(3)} bar</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Static Head:</p>
                    <p className="font-semibold text-gray-800">{result.staticHeadPressureDrop.toFixed(3)} bar</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Pressure Drop:</p>
                    <p className="font-semibold text-gray-800">{result.totalPressureDrop.toFixed(3)} bar</p>
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
                  <div>
                    <p className="text-gray-600">Viscosity:</p>
                    <p className="font-semibold text-gray-800">{result.dynamicViscosity.toExponential(2)} Pa·s</p>
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
          
          <div className="mt-6 bg-green-100 p-4 rounded-md border border-green-300">
            <h4 className="font-medium mb-2 text-green-700">Pressure Drop and Velocity Recommendations</h4>
            <p className="text-sm text-green-800">Standard guidelines for steam pipe sizing:</p>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-green-800">
              <li><strong>Low Pressure Systems (up to 4 bar-g):</strong> 0.2-0.8 mbar/m</li>
              <li><strong>Medium Pressure Systems (4-10 bar-g):</strong> 0.5-1.5 mbar/m</li>
              <li><strong>High Pressure Systems (over 10 bar-g):</strong> 1.0-3.0 mbar/m</li>
              <li><strong>Minimum Velocity:</strong> 8 m/s for steam mains, 5 m/s for return lines</li>
              <li><strong>Maximum Velocity:</strong> 35 m/s for steam mains, 20 m/s for return lines</li>
              <li>Both pressure drop and velocity criteria are now used for optimal pipe sizing</li>
              <li>Lower velocities can cause condensate accumulation and water hammer</li>
              <li>Higher velocities can cause noise and erosion</li>
            </ul>
            <p className="text-sm text-green-800 mt-2">
              <strong>Note:</strong> The calculator now prioritizes achieving minimum velocity while keeping pressure drop within acceptable limits.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Calculations use the Darcy-Weisbach equation for pressure drop and an explicit approximation (Swamee-Jain) of the Colebrook-White equation for friction factor.</li>
          <li>Steam property estimation uses Antoine equation for saturation temperature and improved correlations for specific volume.</li>
          <li>Viscosity calculation dynamically adjusts based on steam temperature, pressure, and quality.</li>
          <li>Elevation changes affect pressure due to static head: rising steam lines lose pressure, descending lines gain pressure.</li>
          <li>Velocity limits: Supply Steam ({SUPPLY_VELOCITY_LIMIT_MIN}-{SUPPLY_VELOCITY_LIMIT_MAX} m/s), Condensate Return ({RETURN_VELOCITY_LIMIT_MIN}-{RETURN_VELOCITY_LIMIT_MAX} m/s) based on industry standards.</li>
          <li>Pipe sizes are selected from standard nominal diameters (DN) in millimeters.</li>
          <li>High velocity steam can cause noise, erosion, and water hammer in condensate lines.</li>
          <li>For wet steam (quality less than 1.0), consider installing separators to improve quality.</li>
          <li>This calculator provides sizing guidance only. Always consult relevant codes and standards.</li>
          <li>Insulation is highly recommended for all steam pipes to reduce heat loss and improve efficiency.</li>
          <li>Steam systems should include proper condensate drainage points at natural low points.</li>
        </ul>
      </div>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default SteamPipeSizingCalculator;