import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../../components/Icons';

interface PsychrometricChartProps {
  onShowTutorial?: () => void;
  onBack?: () => void;
}

// Define parameter types
type ParameterType = 'dbTemp' | 'rh' | 'wbTemp' | 'dewPoint' | 'humidity' | 'enthalpy' | 'specificVolume' | 'vaporPressure';

// Define parameter display info
interface ParameterInfo {
  id: ParameterType;
  name: string;
  unit: string;
  description: string;
}

// Parameter display definitions
const PARAMETER_INFO: Record<ParameterType, ParameterInfo> = {
  dbTemp: { id: 'dbTemp', name: 'Dry Bulb Temp', unit: '°C', description: 'Air temperature measured by a regular thermometer' },
  rh: { id: 'rh', name: 'Relative Humidity', unit: '%', description: 'Ratio of actual water vapor pressure to saturation vapor pressure' },
  wbTemp: { id: 'wbTemp', name: 'Wet Bulb Temp', unit: '°C', description: 'Temperature indicated by a thermometer covered with a wet cloth in moving air' },
  dewPoint: { id: 'dewPoint', name: 'Dew Point', unit: '°C', description: 'Temperature at which air becomes saturated when cooled at constant pressure' },
  humidity: { id: 'humidity', name: 'Humidity Ratio', unit: 'g/kg', description: 'Mass of water vapor per unit mass of dry air' },
  enthalpy: { id: 'enthalpy', name: 'Enthalpy', unit: 'kJ/kg', description: 'Total heat content of the air (per kg of dry air)' },
  specificVolume: { id: 'specificVolume', name: 'Specific Volume', unit: 'm³/kg', description: 'Volume occupied by unit mass of dry air' },
  vaporPressure: { id: 'vaporPressure', name: 'Vapor Pressure', unit: 'kPa', description: 'Partial pressure of water vapor in the air' }
};

// Define the psychrometric point interface
interface PsychrometricPoint {
  id: string;
  name: string;
  // All potential properties - some will be input, others calculated
  dbTemp?: number; // Dry bulb temperature (°C)
  rh?: number; // Relative humidity (%)
  wbTemp?: number; // Wet bulb temperature (°C)
  dewPoint?: number; // Dew point temperature (°C)
  humidity?: number; // Humidity ratio (g/kg dry air)
  enthalpy?: number; // Enthalpy (kJ/kg dry air)
  specificVolume?: number; // Specific volume (m³/kg dry air)
  vaporPressure?: number; // Partial vapor pressure (kPa)
  
  // Track which parameters are the input parameters
  parameterOne: ParameterType;
  parameterTwo: ParameterType;
  
  color: string; // Color for visualization
}

// Interface for process calculation
interface Process {
  id: string;
  type: 'heating' | 'cooling' | 'humidification' | 'dehumidification' | 'mixing' | 'custom';
  startPointId: string;
  endPointId: string;
  mixingRatio?: number; // For mixing process (0-1)
  sensibleHeatRatio?: number; // For custom processes
  energyChange?: number; // kW or cooling/heating tons
  massFlowRate?: number; // kg/s
  processColor: string;
}

// Define standard atmospheric pressure (101.325 kPa)
const STANDARD_PRESSURE = 101.325;

// Air properties constants
const SPECIFIC_GAS_CONSTANT_DRY_AIR = 287.058; // J/(kg·K)
const SPECIFIC_GAS_CONSTANT_WATER_VAPOR = 461.52; // J/(kg·K)
const SPECIFIC_HEAT_CAPACITY_AIR = 1.005; // kJ/(kg·K)
const HEAT_VAPORIZATION_WATER = 2501; // kJ/kg at 0°C

// Chart configuration
const CHART_CONFIG = {
  tempMin: 0, // °C
  tempMax: 50, // °C
  rhCurves: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], // %
  wbCurves: [0, 5, 10, 15, 20, 25, 30, 35, 40], // °C
  humidityCurves: [0, 5, 10, 15, 20, 25, 30, 35], // g/kg
  enthalpyCurves: [0, 20, 40, 60, 80, 100, 120, 140], // kJ/kg
  specificVolumeCurves: [0.8, 0.85, 0.9, 0.95, 1.0, 1.05], // m³/kg
};

// Process color options
const PROCESS_COLORS = [
  "#FF5733", // Orange Red
  "#33FF57", // Green
  "#3357FF", // Blue
  "#8A33FF", // Purple
  "#FF33A8", // Pink
  "#33FFF6", // Cyan
  "#FFC433", // Gold
  "#FF3333", // Red
];

// Point color options
const POINT_COLORS = [
  "#2563EB", // Blue
  "#DC2626", // Red
  "#16A34A", // Green
  "#9333EA", // Purple
  "#EA580C", // Orange
  "#0891B2", // Cyan
  "#4F46E5", // Indigo
  "#0D9488", // Teal
];

const PsychrometricChart: React.FC<PsychrometricChartProps> = ({ onShowTutorial, onBack }) => {
  // State for altitude (affects pressure)
  const [altitude, setAltitude] = useState<number>(0); // meters above sea level
  const [barometricPressure, setBarometricPressure] = useState<number>(STANDARD_PRESSURE); // kPa
  const [unitSystem, setUnitSystem] = useState<'SI' | 'IP'>('SI');
  
  // State for points
  const [points, setPoints] = useState<PsychrometricPoint[]>([
    {
      id: '1',
      name: 'Point 1',
      dbTemp: 25,
      rh: 50,
      color: POINT_COLORS[0],
      parameterOne: 'dbTemp',
      parameterTwo: 'rh',
    }
  ]);
  
  // State for processes
  const [processes, setProcesses] = useState<Process[]>([]);
  
  // State for selected point and process
  const [selectedPointId, setSelectedPointId] = useState<string | null>('1');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  
  // State for new process creation
  const [newProcessType, setNewProcessType] = useState<Process['type']>('heating');
  const [newProcessStartId, setNewProcessStartId] = useState<string>('');
  const [newProcessEndId, setNewProcessEndId] = useState<string>('');
  const [newProcessMixingRatio, setNewProcessMixingRatio] = useState<number>(0.5);
  const [newProcessSHR, setNewProcessSHR] = useState<number>(0.7);
  const [newProcessMassFlow, setNewProcessMassFlow] = useState<number>(1); // kg/s
  
  // State for chart visibility - Chart is now only accessible via popup
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [chartWidth, setChartWidth] = useState<number>(600);
  const [chartHeight, setChartHeight] = useState<number>(400);
  const [expandedChartWidth, setExpandedChartWidth] = useState<number>(1200);
  const [expandedChartHeight, setExpandedChartHeight] = useState<number>(800);
  const [chartMargin, setChartMargin] = useState<{top: number, right: number, bottom: number, left: number}>({
    top: 40, right: 40, bottom: 60, left: 60
  });
  
  // Reference for the SVG chart
  const chartRef = useRef<SVGSVGElement | null>(null);
  
  // State for chart interactive elements
  const [hoverInfo, setHoverInfo] = useState<{
    visible: boolean,
    x: number,
    y: number,
    dbTemp: number,
    rh: number,
    humidity: number,
    enthalpy: number,
  } | null>(null);
  
  // State for actively adding a new point via the chart
  const [addingPointViaChart, setAddingPointViaChart] = useState<boolean>(false);
  
  // State for chart display options
  const [displayOptions, setDisplayOptions] = useState({
    showRHCurves: true,
    showWBCurves: true,
    showHumidityCurves: true,
    showEnthalpyCurves: true,
    showVolumeLines: false,
    showPoints: true,
    showProcesses: true,
    highlightSelectedPoint: true,
  });
  
  // Effect hook to calculate barometric pressure based on altitude
  useEffect(() => {
    // International Standard Atmosphere model
    const standardPressureAtSeaLevel = STANDARD_PRESSURE; // kPa
    const temperatureAtSeaLevel = 288.15; // K
    const lapseRate = 0.0065; // K/m
    const gravitationalAcceleration = 9.80665; // m/s²
    const molarMassAir = 0.0289644; // kg/mol
    const universalGasConstant = 8.31447; // J/(mol·K)
    
    const exponent = gravitationalAcceleration * molarMassAir / (universalGasConstant * lapseRate);
    const temperature = temperatureAtSeaLevel - lapseRate * altitude;
    const pressureRatio = Math.pow(temperature / temperatureAtSeaLevel, exponent);
    
    const calculatedPressure = standardPressureAtSeaLevel * pressureRatio;
    setBarometricPressure(Math.max(calculatedPressure, 10)); // Ensure pressure is positive
  }, [altitude]);
  
  // Effect hook to calculate psychrometric properties for all points
  useEffect(() => {
    const updatedPoints = points.map(point => {
      // Calculate properties using the available parameters
      // Create a copy of the point to avoid direct mutation if calculatePsychrometricProperties
      // returns the same object instance in some cases (though it shouldn't with current logic)
      const pointCopy = { ...point }; 
      const properties = calculatePsychrometricProperties(pointCopy, barometricPressure);
      return { ...pointCopy, ...properties };
    });
    
    setPoints(updatedPoints);
    
    // Calculate energy changes for processes
    if (updatedPoints.length > 0) { // Check if there are any points at all
      calculateProcessProperties(updatedPoints);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map(p => `${p.id}-${p.parameterOne}-${p[p.parameterOne]}-${p.parameterTwo}-${p[p.parameterTwo]}`).join(','), barometricPressure]); // More specific dependency array

  // Effect hook to handle escape key for closing expanded chart
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isChartExpanded) {
        setIsChartExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isChartExpanded]);
  
  // Calculate process properties
  const calculateProcessProperties = (currentPoints: PsychrometricPoint[]) => {
    const updatedProcesses = processes.map(process => {
      const startPoint = currentPoints.find(p => p.id === process.startPointId);
      const endPoint = currentPoints.find(p => p.id === process.endPointId);
      
      if (!startPoint || !endPoint || startPoint.enthalpy === undefined || endPoint.enthalpy === undefined || 
          startPoint.humidity === undefined || endPoint.humidity === undefined) {
        return { ...process, energyChange: undefined }; // Reset or clear if points are invalid
      }
      
      let energyChange: number | undefined = undefined;
      
      // Mass flow rate is in kg/s, enthalpy in kJ/kg
      if (process.massFlowRate && startPoint.enthalpy !== undefined && endPoint.enthalpy !== undefined) {
        // Energy change in kW
        energyChange = process.massFlowRate * (endPoint.enthalpy - startPoint.enthalpy);
      }
      
      return { ...process, energyChange };
    });
    
    setProcesses(updatedProcesses);
  };

// Function to calculate psychrometric properties from any two parameters
const calculatePsychrometricProperties = (point: Partial<PsychrometricPoint>, pressure: number): Partial<PsychrometricPoint> => {
  const paramOne = point.parameterOne;
  const paramTwo = point.parameterTwo;
  
  if (!paramOne || !paramTwo || paramOne === paramTwo) {
    return point; 
  }
  
  // Ensure the point object has the values for the specified parameters
  if (point[paramOne] === undefined || point[paramTwo] === undefined) {
    return point; // Not enough data to calculate
  }

  let result: Partial<PsychrometricPoint> = {};
  
  if ((paramOne === 'dbTemp' && paramTwo === 'rh') || (paramOne === 'rh' && paramTwo === 'dbTemp')) {
    result = calculateFromDBandRH(point.dbTemp!, point.rh!, pressure);
  } else if ((paramOne === 'dbTemp' && paramTwo === 'wbTemp') || (paramOne === 'wbTemp' && paramTwo === 'dbTemp')) {
    result = calculateFromDBandWB(point.dbTemp!, point.wbTemp!, pressure);
  } else if ((paramOne === 'dbTemp' && paramTwo === 'dewPoint') || (paramOne === 'dewPoint' && paramTwo === 'dbTemp')) {
    result = calculateFromDBandDP(point.dbTemp!, point.dewPoint!, pressure);
  } else if ((paramOne === 'dbTemp' && paramTwo === 'humidity') || (paramOne === 'humidity' && paramTwo === 'dbTemp')) {
    result = calculateFromDBandHumidity(point.dbTemp!, point.humidity!, pressure);
  } else if ((paramOne === 'dbTemp' && paramTwo === 'enthalpy') || (paramOne === 'enthalpy' && paramTwo === 'dbTemp')) {
    result = calculateFromDBandEnthalpy(point.dbTemp!, point.enthalpy!, pressure);
  } else if ((paramOne === 'rh' && paramTwo === 'wbTemp') || (paramOne === 'wbTemp' && paramTwo === 'rh')) {
    result = calculateFromRHandWB(point.rh!, point.wbTemp!, pressure);
  } else {
    return point; // Combination not handled, return original partial point
  }
  
  // Combine with original point to keep other potential properties like id, name, color
  // but prioritize calculated psychrometric values.
  return { 
    ...point, // Keep non-psychrometric properties
    ...result   // Calculated psychrometric properties
  };
};

// Calculate properties from dry bulb temperature and relative humidity
const calculateFromDBandRH = (dbTemp: number, rh: number, pressure: number): Partial<PsychrometricPoint> => {
  const dbTempK = dbTemp + 273.15;
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  const vaporPressure = satVaporPressure * (rh / 100);
  const humidityRatio = 0.622 * (vaporPressure / (pressure - vaporPressure));
  const humidity = humidityRatio * 1000;
  
  // CORRECTED Specific volume calculation (m³/kg dry air)
  // Using partial pressure of dry air: P_da = pressure - vaporPressure
  // v_da = R_da * T_K / P_da
  // P_da is in kPa, so multiply by 1000 to get Pa
  const specificVolume = (SPECIFIC_GAS_CONSTANT_DRY_AIR * dbTempK) / ((pressure - vaporPressure) * 1000);
  
  const enthalpy = SPECIFIC_HEAT_CAPACITY_AIR * dbTemp + humidityRatio * (HEAT_VAPORIZATION_WATER + 1.86 * dbTemp);
  const dewPoint = calculateDewPoint(vaporPressure);
  const wbTemp = calculateWetBulbFromDBandRH(dbTemp, humidityRatio, pressure);
  
  return {
    dbTemp, // Preserve input
    rh,     // Preserve input
    wbTemp,
    dewPoint,
    humidity,
    enthalpy,
    specificVolume,
    vaporPressure,
  };
};

// Calculate properties from dry bulb temperature and wet bulb temperature
const calculateFromDBandWB = (dbTemp: number, wbTemp: number, pressure: number): Partial<PsychrometricPoint> => {
  if (wbTemp > dbTemp) {
    return { dbTemp, wbTemp }; // Invalid input, return original
  }
  
  let humidityRatio = 0.01; // Initial guess in kg/kg
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 0.01; // Tolerance for wet bulb match in °C
  let calculatedWBforCurrentW: number;

  // Iteratively find humidityRatio that matches the input wbTemp
  while (iterations < maxIterations) {
    calculatedWBforCurrentW = calculateWetBulbFromDBandRH(dbTemp, humidityRatio, pressure);
    
    if (Math.abs(calculatedWBforCurrentW - wbTemp) < tolerance) {
      break;
    }
    
    const wbError = wbTemp - calculatedWBforCurrentW;
    // Adjust humidity ratio. If error is large, make a larger step initially.
    const adjustmentFactor = Math.abs(wbError) > 1 ? wbError * 0.0005 : wbError * 0.0002;
    humidityRatio = Math.max(0, humidityRatio + adjustmentFactor);
    // Cap humidity ratio at saturation for dbTemp to prevent overshooting
    humidityRatio = Math.min(humidityRatio, calculateSaturationHumidityRatio(dbTemp, pressure));

    iterations++;
  }
  
  const humidity = humidityRatio * 1000;
  const vaporPressureVal = (humidityRatio * pressure) / (0.622 + humidityRatio);
  const satVaporPressureAtDB = calculateSaturationVaporPressure(dbTemp);
  const rhVal = Math.min(100, Math.max(0, (vaporPressureVal / satVaporPressureAtDB) * 100));
  
  // Get all other properties using the derived RH and input DB
  const allProps = calculateFromDBandRH(dbTemp, rhVal, pressure);
  
  // Ensure the original input dbTemp and wbTemp are preserved
  return {
    ...allProps,
    dbTemp: dbTemp,
    wbTemp: wbTemp, // Preserve the input wbTemp
    humidity: humidity, // Use the derived humidity
    rh: rhVal,          // Use the derived RH
  };
};

// Calculate properties from dry bulb temperature and dew point
const calculateFromDBandDP = (dbTemp: number, dewPoint: number, pressure: number): Partial<PsychrometricPoint> => {
  if (dewPoint > dbTemp) { // Dew point cannot be higher than dry bulb
     return { dbTemp, dewPoint }; // Invalid
  }
  const vaporPressure = calculateSaturationVaporPressure(dewPoint);
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  const rh = Math.min(100, Math.max(0, (vaporPressure / satVaporPressure) * 100));
  
  const allProps = calculateFromDBandRH(dbTemp, rh, pressure);
  return {
    ...allProps,
    dbTemp: dbTemp,     // Preserve input
    dewPoint: dewPoint, // Preserve input
    rh: rh,             // Use derived RH
  };
};

// Calculate properties from dry bulb temperature and humidity ratio
const calculateFromDBandHumidity = (dbTemp: number, humidity: number, pressure: number): Partial<PsychrometricPoint> => {
  const humidityRatio = humidity / 1000; // Convert g/kg to kg/kg
  
  // Check if humidity ratio exceeds saturation at dbTemp
  const maxHumidityRatio = calculateSaturationHumidityRatio(dbTemp, pressure);
  if (humidityRatio > maxHumidityRatio) {
      // Cannot have humidity ratio greater than saturation at dbTemp
      // Adjust to saturation or handle as an error/return current values
      // For now, let's proceed, calculateFromDBandRH will cap RH at 100%
  }

  const vaporPressure = (humidityRatio * pressure) / (0.622 + humidityRatio);
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  const rh = Math.min(100, Math.max(0, (vaporPressure / satVaporPressure) * 100));
  
  const allProps = calculateFromDBandRH(dbTemp, rh, pressure);
  return {
    ...allProps,
    dbTemp: dbTemp,       // Preserve input
    humidity: humidity,   // Preserve input (in g/kg)
    rh: rh,               // Use derived RH
  };
};

// Calculate properties from dry bulb temperature and enthalpy
const calculateFromDBandEnthalpy = (dbTemp: number, enthalpy: number, pressure: number): Partial<PsychrometricPoint> => {
  const cp_air = SPECIFIC_HEAT_CAPACITY_AIR;
  const cp_vapor = 1.86; 
  const h_fg = HEAT_VAPORIZATION_WATER;
  
  let humidityRatio = (enthalpy - cp_air * dbTemp) / (h_fg + cp_vapor * dbTemp);
  humidityRatio = Math.max(0, humidityRatio); // Humidity ratio cannot be negative
  const humidity = humidityRatio * 1000; 
  
  const allPropsFromDBandHumidity = calculateFromDBandHumidity(dbTemp, humidity, pressure);
  return {
    ...allPropsFromDBandHumidity, // This already preserves dbTemp and humidity
    enthalpy: enthalpy,           // Preserve input enthalpy
  };
};

// Calculate properties from relative humidity and wet bulb temperature
const calculateFromRHandWB = (rh: number, wbTemp: number, pressure: number): Partial<PsychrometricPoint> => {
  let dbGuess = wbTemp + 2; // Start guess slightly above wbTemp
  const tolerance = 0.01; // Tolerance for wet bulb match
  let iterations = 0;
  const maxIterations = 100;
  let calculatedWB: number | undefined;

  // Iteratively find dbTemp
  while (iterations < maxIterations) {
    const propsAtGuess = calculateFromDBandRH(dbGuess, rh, pressure);
    calculatedWB = propsAtGuess.wbTemp;

    if (calculatedWB === undefined) { // Should not happen if calculateFromDBandRH is robust
      return { rh, wbTemp }; // Failed to calculate, return inputs
    }
    
    if (Math.abs(calculatedWB - wbTemp) < tolerance) {
      // Found a good match
      return {
        ...propsAtGuess,
        rh: rh,         // Preserve input RH
        wbTemp: wbTemp, // Preserve input WB
        dbTemp: dbGuess // Use the converged dbTemp
      };
    }
    
    // Adjust dbGuess using a simple proportional adjustment, or more sophisticated if needed
    // If calculatedWB is too low (wbTemp - calculatedWB > 0), dbGuess needs to increase.
    // If calculatedWB is too high (wbTemp - calculatedWB < 0), dbGuess needs to decrease.
    const error = wbTemp - calculatedWB;
    let adjustment = error * 0.5; // Proportional adjustment factor
    
    // Prevent excessive steps or oscillation
    adjustment = Math.sign(adjustment) * Math.min(Math.abs(adjustment), 2.0); 
    dbGuess += adjustment;

    // Ensure dbGuess stays above wbTemp
    dbGuess = Math.max(dbGuess, wbTemp); 
    // And within reasonable bounds for the chart or typical conditions
    dbGuess = Math.min(dbGuess, CHART_CONFIG.tempMax + 10); 
    dbGuess = Math.max(dbGuess, CHART_CONFIG.tempMin -10);


    iterations++;
  }
  
  // If convergence failed, return best guess or input values
  const finalProps = calculateFromDBandRH(dbGuess, rh, pressure);
  return {
    ...finalProps,
    rh: rh,
    wbTemp: wbTemp, // Preserve input wbTemp
    dbTemp: dbGuess
  };
};

// Calculate wet bulb temperature from dry bulb and RH (or humidityRatio)
const calculateWetBulbFromDBandRH = (dbTemp: number, humidityRatio: number, pressure: number): number => {
  let wbGuess = dbTemp - 5; // Initial reasonable guess
  wbGuess = Math.max(wbGuess, -20); // Prevent overly low initial guesses
  wbGuess = Math.min(wbGuess, dbTemp); // WB cannot be > DB

  let wbPrev = wbGuess;
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 0.01;

  while (iterations < maxIterations) {
    const wbSatVaporPressure = calculateSaturationVaporPressure(wbGuess);
    const wbSatHumidityRatio = 0.622 * (wbSatVaporPressure / (pressure - wbSatVaporPressure));
    
    // Using ASHRAE Fundamentals 2017, Chapter 1, Equation 33/35 form:
    // W = ((h_fg_wb + C_pv * T_wb) * W_s_wb - C_pa * (T_db - T_wb)) / (h_fg_wb + C_pv * T_db)
    // where h_fg_wb is latent heat at T_wb
    // C_pv is specific heat of water vapor, C_pa is specific heat of dry air.
    // This can be rearranged to solve for an error function f(T_wb) = 0.
    // f(T_wb) = W_s_wb * (h_L(T_wb) + 1.86*T_wb) - (1.006*(T_db - T_wb)) - W * (h_L(T_wb) + 1.86*T_db)
    // Simpler form using psychrometric constant (approximation):
    // W = W_s_wb - (C_pa / h_fg_approx) * (T_db - T_wb)
    // Psychrometric constant approach:
    // Let Cp_total = SPECIFIC_HEAT_CAPACITY_AIR + humidityRatio * 1.86 (approx specific heat of moist air)
    // The error term: W - W_wb_s + (Cp_total / HEAT_VAPORIZATION_WATER_AT_WB) * (T_db - T_wb) = 0

    // More direct from ASHRAE Eq. 35, solved for W:
    // W_calculated = ( (2501 - 2.326 * wbGuess) * wbSatHumidityRatio - 1.006 * (dbTemp - wbGuess) ) / 
    //                ( (2501 + 1.86 * dbTemp) - (4.186 * wbGuess) )
    // This formula is complex for direct iteration. Let's stick to the common iterative approach:
    // Error = W_actual - W_calculated_from_psych_equation
    
    // Psychrometric equation: h_da + W * h_v = h_da_wb_sat + W_s_wb * h_v_wb_sat
    // Cpa*Tdb + W*(hfg0 + Cpv*Tdb) = Cpa*Twb + Ws_wb*(hfg0 + Cpv*Twb)
    // W = (Cpa*(Twb-Tdb) + Ws_wb*(hfg0 + Cpv*Twb)) / (hfg0 + Cpv*Tdb)

    const hfg0 = HEAT_VAPORIZATION_WATER; // at 0C
    const cpv = 1.86; // kJ/kg.K for vapor
    const cpa = SPECIFIC_HEAT_CAPACITY_AIR; // kJ/kg.K for dry air

    // Calculate W based on current wbGuess
    const calculatedW = (cpa * (wbGuess - dbTemp) + wbSatHumidityRatio * (hfg0 + cpv * wbGuess)) / (hfg0 + cpv * dbTemp);
    
    const error = humidityRatio - calculatedW;

    if (Math.abs(error) < 0.00001) { // Tolerance for humidity ratio
      break;
    }

    // Adjust wbGuess. Using a simple step or a more robust method like secant.
    // For simplicity, a small proportional step.
    // If W_actual > W_calculated, wbGuess is too low, needs to increase.
    // If error > 0, wbGuess needs to increase.
    let dW_dTwb_approx = ( wbSatHumidityRatio * cpv - cpa + (hfg0 + cpv*wbGuess) * (0.622 * pressure * calculateSaturationVaporPressureDerivative(wbGuess) / Math.pow(pressure - wbSatVaporPressure, 2)) ) / (hfg0 + cpv*dbTemp);
    
    let step;
    if (Math.abs(dW_dTwb_approx) > 1e-4) { // Avoid division by zero or very small number
        step = error / dW_dTwb_approx;
    } else {
        step = error > 0 ? 0.1 : -0.1; // Fallback to small step
    }
    
    // Limit step size to avoid instability
    step = Math.max(-1.0, Math.min(1.0, step));
    wbGuess += step;
    
    wbGuess = Math.min(wbGuess, dbTemp); // wbTemp cannot exceed dbTemp
    wbGuess = Math.max(wbGuess, -50);    // Practical lower limit

    if (Math.abs(wbGuess - wbPrev) < tolerance && iterations > 0) break;
    wbPrev = wbGuess;
    iterations++;
  }
  return wbGuess;
};

// Helper for derivative of saturation vapor pressure (for Newton-Raphson type solvers if used)
const calculateSaturationVaporPressureDerivative = (tempC: number) => {
    // Using a finite difference for simplicity if exact derivative is complex
    const h = 0.001;
    return (calculateSaturationVaporPressure(tempC + h) - calculateSaturationVaporPressure(tempC - h)) / (2 * h);
};


// Calculate saturation humidity ratio
const calculateSaturationHumidityRatio = (temp: number, pressure: number): number => {
  const satVaporPressure = calculateSaturationVaporPressure(temp);
  return 0.622 * (satVaporPressure / (pressure - satVaporPressure));
};
  
  // Function to calculate saturation vapor pressure (kPa)
  const calculateSaturationVaporPressure = (tempC: number) => {
    // ASHRAE 2017 Fundamentals, Ch. 1, Eq. 5 & 6
    const T = tempC + 273.15; // Temperature in Kelvin
    // Constants for water over liquid (tempC >= 0)
    const C1 = -5.6745359E+03;
    const C2 = 6.3925247E+00;
    const C3 = -9.6778430E-03;
    const C4 = 6.2215701E-07;
    const C5 = 2.0747825E-09;
    const C6 = -9.4840240E-13;
    const C7 = 4.1635019E+00;
    // Constants for water over ice (tempC < 0)
    const C8 = -5.8666426E+03;
    const C9 = 2.2328702E+01;
    const C10 = 1.3938700E-02;
    const C11 = -3.4262402E-05;
    const C12 = 2.7040955E-08;
    const C13 = 6.7063522E-01;

    let ln_Psat;
    if (tempC >= 0) {
        ln_Psat = C1/T + C2 + C3*T + C4*T*T + C5*T*T*T + C6*T*T*T*T + C7*Math.log(T);
    } else {
        ln_Psat = C8/T + C9 + C10*T + C11*T*T + C12*T*T*T + C13*Math.log(T);
    }
    return Math.exp(ln_Psat) / 1000; // Result in kPa (original is Pa)
  };
  
  // Function to calculate dew point temperature (°C)
  const calculateDewPoint = (vaporPressure: number) => {
    // ASHRAE 2017 Fundamentals, Ch. 1, Eq. 39 & 40
    // Input vaporPressure in kPa
    if (vaporPressure <= 0) return -999; 
    const Pw = vaporPressure * 1000; // Convert to Pa
    const alpha = Math.log(Pw / 611.21); // 611.21 Pa is approx. saturation pressure at 0°C for Buck/Tetens

    let Tdp;
    // Constants from ASHRAE for T >= 0°C
    const C14 = 6.54;
    const C15 = 14.526;
    const C16 = 0.7389;
    const C17 = 0.09486;
    const C18 = 0.4569;

    // Constants for T < 0°C (over ice)
    const C_ice1 = 6.09; // slightly different from C14 for ice
    const C_ice2 = 18.0; // approx
    const C_ice3 = 2.0; // approx

    if (vaporPressure >= 0.61121) { // Approx. saturation pressure at 0°C (0.61121 kPa)
        Tdp = C14 + C15 * alpha + C16 * alpha * alpha + C17 * alpha * alpha * alpha + C18 * Math.pow(Pw / 1000, 0.1984);
    } else {
        // Equation 40 for Tdp < 0°C
        // Simpler Magnus-Tetens form for sub-zero, or use ASHRAE form for ice if available.
        // Using a simpler form for sub-zero as ASHRAE provided Eq 40 for Pw < Pws(0C)
        // Tdp = (243.5 * Math.log(vaporPressure / 0.6112)) / (17.67 - Math.log(vaporPressure / 0.6112)); // Arden Buck form for dew point
        // Alternative from ASHRAE if Pw < Pws(0C)
        Tdp = 6.09 + 12.608 * alpha + 0.4959 * alpha * alpha; // This is Eq 40 (for range 0 to -70C for Pw)
    }
    // Ensure Tdp is not above dbTemp if dbTemp context was available, but here it's standalone.
    return Tdp;
  };
  
  // Function to add a new psychrometric point
  const addPoint = () => {
    const newId = (points.length + Date.now()).toString(); // Ensure unique ID
    const newPoint: PsychrometricPoint = {
      id: newId,
      name: `Point ${points.length + 1}`,
      dbTemp: 25,
      rh: 50,
      color: POINT_COLORS[(points.length) % POINT_COLORS.length],
      parameterOne: 'dbTemp',
      parameterTwo: 'rh',
    };
    
    setPoints([...points, newPoint]);
    setSelectedPointId(newId);
  };
  
  // Function to update a psychrometric point
  const updatePoint = (id: string, updates: Partial<PsychrometricPoint>) => {
    setPoints(
      points.map(point => {
        if (point.id === id) {
          const updatedPoint = { ...point, ...updates };
          
          if (updates.parameterOne && updates.parameterOne === updatedPoint.parameterTwo) {
            const availableParams = Object.keys(PARAMETER_INFO) as ParameterType[];
            const alternativeParam = availableParams.find(p => p !== updates.parameterOne && p !== point.parameterTwo);
            if (alternativeParam) updatedPoint.parameterTwo = alternativeParam;
          } else if (updates.parameterTwo && updates.parameterTwo === updatedPoint.parameterOne) {
            const availableParams = Object.keys(PARAMETER_INFO) as ParameterType[];
            const alternativeParam = availableParams.find(p => p !== updates.parameterTwo && p !== point.parameterOne);
            if (alternativeParam) updatedPoint.parameterOne = alternativeParam;
          }
          
          // Clear values of old parameters if parameter types change
          if (updates.parameterOne && updates.parameterOne !== point.parameterOne) {
            // @ts-ignore
            delete updatedPoint[point.parameterOne];
          }
          if (updates.parameterTwo && updates.parameterTwo !== point.parameterTwo) {
            // @ts-ignore
            delete updatedPoint[point.parameterTwo];
          }

          return updatedPoint;
        }
        return point;
      })
    );
  };
  
  // Function to remove a psychrometric point
  const removePoint = (id: string) => {
    setProcesses(processes.filter(
      process => process.startPointId !== id && process.endPointId !== id
    ));
    
    const remainingPoints = points.filter(point => point.id !== id);
    setPoints(remainingPoints);
    
    if (selectedPointId === id) {
      setSelectedPointId(remainingPoints.length > 0 ? remainingPoints[0].id : null);
    }
  };
  
  // Function to add a new process
  const addProcess = () => {
    if (!newProcessStartId || !newProcessEndId || newProcessStartId === newProcessEndId) {
      alert("Please select valid and different start and end points for the process.");
      return;
    }
    
    const newId = (processes.length + Date.now()).toString(); // Ensure unique ID
    const newProcess: Process = {
      id: newId,
      type: newProcessType,
      startPointId: newProcessStartId,
      endPointId: newProcessEndId,
      processColor: PROCESS_COLORS[processes.length % PROCESS_COLORS.length],
      massFlowRate: newProcessMassFlow,
    };
    
    if (newProcessType === 'mixing') {
      newProcess.mixingRatio = newProcessMixingRatio;
    } else if (newProcessType === 'custom') {
      newProcess.sensibleHeatRatio = newProcessSHR;
    }
    
    setProcesses([...processes, newProcess]);
    setSelectedProcessId(newId);
    setNewProcessStartId('');
    setNewProcessEndId('');
  };
  
  // Function to update a process
  const updateProcess = (id: string, updates: Partial<Process>) => {
    setProcesses(
      processes.map(process => 
        process.id === id ? { ...process, ...updates } : process
      )
    );
  };
  
  // Function to remove a process
  const removeProcess = (id: string) => {
    const remainingProcesses = processes.filter(process => process.id !== id);
    setProcesses(remainingProcesses);
    
    if (selectedProcessId === id) {
      setSelectedProcessId(remainingProcesses.length > 0 ? remainingProcesses[0].id : null);
    }
  };
  
  // Function to handle chart mouse move
  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current && !isChartExpanded) return; // chartRef is for non-expanded, expanded chart renders directly
    
    const svgElement = isChartExpanded ? e.currentTarget : chartRef.current;
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const x = e.clientX - rect.left - chartMargin.left;
    const y = e.clientY - rect.top - chartMargin.top;
    
    const currentChartWidth = isChartExpanded ? expandedChartWidth : chartWidth;
    const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
    
    const chartContentWidth = currentChartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    
    const dbTemp = (x / chartContentWidth) * (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin) + CHART_CONFIG.tempMin;
    // Humidity ratio from Y (more direct than RH estimation for hover info)
    const maxHumidity = CHART_CONFIG.humidityCurves[CHART_CONFIG.humidityCurves.length - 1];
    const humidity = Math.max(0, (1 - (y / chartContentHeight)) * maxHumidity);

    const properties = calculateFromDBandHumidity(dbTemp, humidity, barometricPressure);
    
    setHoverInfo({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      dbTemp: properties.dbTemp || dbTemp, // Use calculated if available
      rh: properties.rh || 0,
      humidity: properties.humidity || humidity,
      enthalpy: properties.enthalpy || 0,
    });
  };
  
  // Function to handle chart mouse leave
  const handleChartMouseLeave = () => {
    setHoverInfo(null);
  };
  
  // Function to handle chart click for adding points
  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!addingPointViaChart) return;
    
    const svgElement = e.currentTarget;
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const x = e.clientX - rect.left - chartMargin.left;
    const y = e.clientY - rect.top - chartMargin.top;
    
    const currentChartWidth = isChartExpanded ? expandedChartWidth : chartWidth;
    const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
    
    const chartContentWidth = currentChartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    
    const dbTemp = (x / chartContentWidth) * (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin) + CHART_CONFIG.tempMin;
    const maxHumidity = CHART_CONFIG.humidityCurves[CHART_CONFIG.humidityCurves.length - 1];
    const humidity = Math.max(0, (1 - (y / chartContentHeight)) * maxHumidity);
    
    const constrainedDbTemp = Math.min(Math.max(dbTemp, CHART_CONFIG.tempMin), CHART_CONFIG.tempMax);
    const constrainedHumidity = Math.min(Math.max(humidity, 0), maxHumidity);

    const propsFromClick = calculateFromDBandHumidity(constrainedDbTemp, constrainedHumidity, barometricPressure);
    
    const newId = (points.length + Date.now()).toString();
    const newPoint: PsychrometricPoint = {
      id: newId,
      name: `Point ${points.length + 1}`,
      dbTemp: Math.round((propsFromClick.dbTemp || constrainedDbTemp) * 10) / 10,
      rh: Math.round(propsFromClick.rh || 0), // Fallback if calculation fails
      // We'll use dbTemp and RH as primary for points added via chart
      // So, ensure these are the primary parameters, then other props are calculated
      color: POINT_COLORS[(points.length) % POINT_COLORS.length],
      parameterOne: 'dbTemp',
      parameterTwo: 'rh',
      // ...propsFromClick, // Spread calculated properties but ensure dbTemp/rh are primary
    };
    
    setPoints([...points, newPoint]);
    setSelectedPointId(newId);
    setAddingPointViaChart(false);
  };
  
  // Function to convert chart coordinates to SVG coordinates
  const tempToX = (temp: number) => {
    const currentChartWidth = isChartExpanded ? expandedChartWidth : chartWidth;
    const chartContentWidth = currentChartWidth - chartMargin.left - chartMargin.right;
    return chartMargin.left + ((temp - CHART_CONFIG.tempMin) / (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin)) * chartContentWidth;
  };
  
  const humidityToY = (humidity: number) => {
    const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    const maxHumidity = CHART_CONFIG.humidityCurves[CHART_CONFIG.humidityCurves.length - 1];
    if (maxHumidity === 0) return chartMargin.top + chartContentHeight; // Avoid division by zero
    return chartMargin.top + chartContentHeight - ((Math.min(humidity, maxHumidity) / maxHumidity) * chartContentHeight);
  };
  
  const rhToY = (rh: number, temp: number) => {
    const props = calculateFromDBandRH(temp, rh, barometricPressure);
    return humidityToY(props.humidity || 0);
  };
  
  // Function to render chart axes and grid
  const renderChartAxes = (): JSX.Element => {
    const currentChartWidth = isChartExpanded ? expandedChartWidth : chartWidth;
    const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
    
    const chartContentWidth = currentChartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    
    return (
      <g className="chart-axes">
        {/* X axis */}
        <line 
          x1={chartMargin.left} 
          y1={chartMargin.top + chartContentHeight} 
          x2={chartMargin.left + chartContentWidth} 
          y2={chartMargin.top + chartContentHeight}
          stroke="#666"
          strokeWidth="1"
        />
        
        {/* Y axis */}
        <line 
          x1={chartMargin.left} 
          y1={chartMargin.top} 
          x2={chartMargin.left} 
          y2={chartMargin.top + chartContentHeight}
          stroke="#666"
          strokeWidth="1"
        />
        
        {/* X axis labels */}
        {Array.from({ length: 11 }, (_, i) => CHART_CONFIG.tempMin + (i * (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin) / 10)).map((temp, i) => (
          <g key={`x-tick-${i}`}>
            <line 
              x1={tempToX(temp)} 
              y1={chartMargin.top + chartContentHeight} 
              x2={tempToX(temp)} 
              y2={chartMargin.top + chartContentHeight + 5}
              stroke="#666"
              strokeWidth="1"
            />
            <text
              x={tempToX(temp)}
              y={chartMargin.top + chartContentHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {temp}°C
            </text>
          </g>
        ))}
        
        {/* X axis title */}
        <text
          x={chartMargin.left + chartContentWidth / 2}
          y={currentChartHeight - 10}
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#444"
        >
          Dry Bulb Temperature (°C)
        </text>
        
        {/* Y axis title */}
        <text
          x={-chartMargin.top - chartContentHeight / 2}
          y={20}
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#444"
          transform="rotate(-90)"
        >
          Humidity Ratio (g/kg dry air)
        </text>
      </g>
    );
  };
  
  // Function to render RH curves
  const renderRHCurves = (): JSX.Element | null => {
    if (!displayOptions.showRHCurves) return null;
    
    return (
      <g className="rh-curves">
        {CHART_CONFIG.rhCurves.map((rh) => {
          let pathData = "";
          const tempStep = (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin) / 50; // Finer steps for smoother curves

          for (let i = 0; i <= 50; i++) {
            const t = CHART_CONFIG.tempMin + i * tempStep;
            const props = calculateFromDBandRH(t, rh, barometricPressure);
            if (props.humidity !== undefined) {
              const x = tempToX(t);
              const y = humidityToY(props.humidity);
              if (y < chartMargin.top + (isChartExpanded ? expandedChartHeight : chartHeight) - chartMargin.bottom && y > chartMargin.top) { // Keep within chart bounds
                if (pathData === "") {
                  pathData = `M ${x} ${y}`;
                } else {
                  pathData += ` L ${x} ${y}`;
                }
              }
            }
          }
          
          if (!pathData) return null; // Skip if no valid points for the curve

          return (
            <g key={`rh-${rh}`} className="rh-curve">
              <path
                d={pathData}
                stroke={rh === 100 ? "#0077cc" : "#a0d2ff"}
                strokeWidth={rh === 100 ? "1.5" : "1"}
                strokeDasharray={rh === 100 ? "none" : "3,2"}
                fill="none"
              />
              
              {rh % 20 === 0 && rh < 100 && ( // Don't label 100% at the typical spot to avoid clutter
                <text
                  x={tempToX(CHART_CONFIG.tempMax - 3)} // Adjusted for visibility
                  y={Math.max(chartMargin.top + 10, rhToY(rh, CHART_CONFIG.tempMax -3) - 5)}
                  fontSize="10" // Smaller font for less clutter
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {rh}%
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render wet bulb temperature curves
  const renderWBCurves = (): JSX.Element | null => {
    if (!displayOptions.showWBCurves) return null;
    
    return (
      <g className="wb-curves">
        {CHART_CONFIG.wbCurves.map((wb) => {
          let pathData = "";
          let lastY = -1; // To ensure lines are mostly monotonic decreasing for humidity
          // Trace along the saturation line (RH=100%) as a starting point
          // WB lines are lines of constant enthalpy (approximately) and run diagonally
          // Start from saturation line (where DB=WB) and go towards lower RH

          for (let db = wb; db <= CHART_CONFIG.tempMax; db += 0.5) {
            // For a given db and wb, calculate humidity
            const props = calculateFromDBandWB(db, wb, barometricPressure);
            if (props.humidity !== undefined && props.dbTemp !== undefined) {
              const x = tempToX(props.dbTemp);
              const y = humidityToY(props.humidity);

              if (y < chartMargin.top + (isChartExpanded ? expandedChartHeight : chartHeight) - chartMargin.bottom && y > chartMargin.top) {
                if (pathData === "") {
                  pathData = `M ${x} ${y}`;
                } else {
                  // Ensure curve moves generally "down" or "right"
                  if (lastY === -1 || y <= lastY + 5) { // Allow small increases if necessary due to calc precision
                     pathData += ` L ${x} ${y}`;
                  }
                }
                lastY = y;
              } else if (pathData !== "") { // If point goes out of bounds, stop this line segment
                break;
              }
            }
          }

          if (!pathData) return null;

          return (
            <g key={`wb-${wb}`} className="wb-curve">
              <path
                d={pathData}
                stroke="#60a5fa"
                strokeWidth="1"
                strokeDasharray="5,3"
                fill="none"
              />
              
              {/* WB Label - place near saturation line */}
              { wb > CHART_CONFIG.tempMin && (
                <text
                  x={tempToX(wb) + 5}
                  y={humidityToY(calculateSaturationHumidityRatio(wb, barometricPressure) * 1000) - 5}
                  fontSize="10"
                  fill="#60a5fa"
                  dominantBaseline="alphabetic"
                >
                  {wb}°WB
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render enthalpy lines
  const renderEnthalpyLines = (): JSX.Element | null => {
    if (!displayOptions.showEnthalpyCurves) return null;
    
    return (
      <g className="enthalpy-lines">
        {CHART_CONFIG.enthalpyCurves.map((enthalpyVal) => {
          let pathData = "";
          // Enthalpy lines are somewhat parallel to WB lines.
          // Iterate through a range of DB temps and find corresponding humidity for this enthalpy.
          for (let t = CHART_CONFIG.tempMin; t <= CHART_CONFIG.tempMax; t += 1) {
            const props = calculateFromDBandEnthalpy(t, enthalpyVal, barometricPressure);
            if (props.humidity !== undefined && props.dbTemp !== undefined) {
              const x = tempToX(props.dbTemp);
              const y = humidityToY(props.humidity);

              // Check if point is within chart bounds
              if (y >= chartMargin.top && y <= chartMargin.top + (isChartExpanded ? expandedChartHeight : chartHeight) - chartMargin.bottom - chartMargin.top) {
                 if (pathData === "") {
                    pathData = `M ${x} ${y}`;
                  } else {
                    pathData += ` L ${x} ${y}`;
                  }
              } else if (pathData !== "" && y < chartMargin.top) { // If line goes above chart, stop
                  break;
              }
            }
          }
          
          if (!pathData) return null;

          return (
            <g key={`enthalpy-${enthalpyVal}`} className="enthalpy-line">
              <path
                d={pathData}
                stroke="#f97316"
                strokeWidth="1"
                strokeDasharray="8,4"
                fill="none"
              />
              
              {/* Enthalpy Label - find a suitable point on the line */}
              {(() => {
                  const midTemp = CHART_CONFIG.tempMin + (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin) * 0.2; // Label towards left
                  const propsForLabel = calculateFromDBandEnthalpy(midTemp, enthalpyVal, barometricPressure);
                  if (propsForLabel.humidity !== undefined && propsForLabel.dbTemp !== undefined) {
                      const xLabel = tempToX(propsForLabel.dbTemp);
                      const yLabel = humidityToY(propsForLabel.humidity);
                      if (yLabel > chartMargin.top + 20 && yLabel < chartMargin.top + (isChartExpanded ? expandedChartHeight : chartHeight) - chartMargin.bottom - 20 ) {
                         return (
                            <text
                                x={xLabel + 5}
                                y={yLabel - 5}
                                fontSize="10"
                                fill="#f97316"
                                dominantBaseline="auto"
                            >
                                {enthalpyVal} kJ/kg
                            </text>
                         );
                      }
                  }
                  return null;
              })()}
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render humidity curves
  const renderHumidityCurves = (): JSX.Element | null => {
    if (!displayOptions.showHumidityCurves) return null;
    
    const chartContentHeight = (isChartExpanded ? expandedChartHeight : chartHeight) - chartMargin.top - chartMargin.bottom;

    return (
      <g className="humidity-curves">
        {CHART_CONFIG.humidityCurves.map((humidity) => {
          if (humidity === 0 && CHART_CONFIG.tempMin > 0) return null; // Avoid 0 line if not starting at 0 temp
          const yPos = humidityToY(humidity);
          if (yPos < chartMargin.top || yPos > chartMargin.top + chartContentHeight) return null; // Out of bounds

          return (
            <g key={`humidity-${humidity}`} className="humidity-curve">
              <line
                x1={tempToX(CHART_CONFIG.tempMin)}
                y1={yPos}
                x2={tempToX(CHART_CONFIG.tempMax)}
                y2={yPos}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              
              <text
                x={tempToX(CHART_CONFIG.tempMin) - 8} // Further from axis line
                y={yPos}
                fontSize="10"
                fill="#6b7280"
                dominantBaseline="middle"
                textAnchor="end"
              >
                {humidity}
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render points on the chart
  const renderPoints = (): JSX.Element | null => {
    if (!displayOptions.showPoints) return null;
    
    return (
      <g className="points">
        {points.map((point) => {
          if (point.dbTemp === undefined || point.humidity === undefined) return null;
          
          const x = tempToX(point.dbTemp);
          const y = humidityToY(point.humidity);

          // Ensure point is within drawable area
          const currentChartWidth = isChartExpanded ? expandedChartWidth : chartWidth;
          const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
          if (x < chartMargin.left || x > currentChartWidth - chartMargin.right || 
              y < chartMargin.top || y > currentChartHeight - chartMargin.bottom) {
            // Point is outside chart boundaries, optionally render an indicator or skip
            return null; 
          }
          
          return (
            <g 
              key={`point-${point.id}`} 
              className={`point ${selectedPointId === point.id ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPointId(point.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={x}
                cy={y}
                r={selectedPointId === point.id && displayOptions.highlightSelectedPoint ? 8 : 6}
                fill={point.color}
                stroke={selectedPointId === point.id && displayOptions.highlightSelectedPoint ? "#000" : "#fff"}
                strokeWidth="2"
              />
              <text
                x={x + 10}
                y={y - 10}
                fontSize="12"
                fontWeight={selectedPointId === point.id && displayOptions.highlightSelectedPoint ? "bold" : "normal"}
                fill={point.color}
                stroke="#fff"
                strokeWidth="0.5"
                paintOrder="stroke" // Ensures stroke is behind fill for better readability
              >
                {point.name}
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render processes on the chart
  const renderProcesses = (): JSX.Element | null => {
    if (!displayOptions.showProcesses) return null;
    
    return (
      <g className="processes">
        {processes.map((process) => {
          const startPoint = points.find(p => p.id === process.startPointId);
          const endPoint = points.find(p => p.id === process.endPointId);
          
          if (!startPoint || !endPoint || 
              startPoint.dbTemp === undefined || startPoint.humidity === undefined || 
              endPoint.dbTemp === undefined || endPoint.humidity === undefined) {
            return null;
          }
          
          const startX = tempToX(startPoint.dbTemp);
          const startY = humidityToY(startPoint.humidity);
          const endX = tempToX(endPoint.dbTemp);
          const endY = humidityToY(endPoint.humidity);
          
          // Basic path
          let pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
          
          // Custom rendering for mixing can be more complex if showing intermediate state
          // For now, a straight line is used for all.

          const isSelected = selectedProcessId === process.id;
          
          return (
            <g 
              key={`process-${process.id}`} 
              className={`process ${isSelected ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProcessId(process.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={pathData}
                stroke={process.processColor}
                strokeWidth={isSelected ? "3.5" : "2.5"} // Slightly thicker lines
                fill="none"
                strokeDasharray={process.type === 'mixing' ? "6,3" : "none"} // Adjusted dash
                markerEnd={`url(#arrow-${process.id})`} // Arrow marker
              />
              
              <marker
                id={`arrow-${process.id}`}
                viewBox="0 0 10 10"
                refX="8" // Adjust refX to position arrow tip on the line end
                refY="5"
                markerWidth="5" // Smaller arrow
                markerHeight="5"
                orient="auto-start-reverse" // Correct orientation
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={process.processColor} />
              </marker>
              
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 12} // Adjusted label position
                fontSize="11" // Slightly smaller
                fontWeight={isSelected ? "bold" : "normal"}
                fill={process.processColor}
                stroke="#fff"
                strokeWidth="0.5"
                paintOrder="stroke"
                textAnchor="middle"
              >
                {process.type.charAt(0).toUpperCase() + process.type.slice(1)}
                {process.energyChange !== undefined && ` (${process.energyChange.toFixed(1)} kW)`}
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render hover info
  const renderHoverInfo = (): JSX.Element | null => {
    if (!hoverInfo || !hoverInfo.visible) return null;
    
    return (
      <g className="hover-info" pointerEvents="none">
        <rect
          x={hoverInfo.x + 10}
          y={hoverInfo.y + 10}
          width="170" // Slightly wider
          height="95" // Slightly taller
          fill="rgba(255, 255, 255, 0.95)" // More opaque
          stroke="#555" // Darker stroke
          strokeWidth="1"
          rx="5" // Rounded corners
          ry="5"
        />
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 30} fontSize="12" fill="#333" fontWeight="500">
          DB: {hoverInfo.dbTemp.toFixed(1)}°C
        </text>
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 50} fontSize="12" fill="#333">
          RH: {hoverInfo.rh.toFixed(1)}%
        </text>
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 70} fontSize="12" fill="#333">
          W: {hoverInfo.humidity.toFixed(2)} g/kg
        </text>
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 90} fontSize="12" fill="#333">
          h: {hoverInfo.enthalpy.toFixed(1)} kJ/kg
        </text>
      </g>
    );
  };
  
  // Function to reset chart zoom/view (currently just dimensions, could be extended for pan/zoom)
  const resetChartZoom = () => {
    // For now, this doesn't do much as pan/zoom isn't implemented
    // If pan/zoom were added, this would reset transform attributes
    // No explicit state change here as chart dimensions are fixed or set by expanded state
    console.log("Chart view reset (dimensions are fixed or per expanded state).");
  };

  // Function to render the chart SVG
  const renderChart = (expanded: boolean = false): JSX.Element => {
    const currentChartWidth = expanded ? expandedChartWidth : chartWidth;
    const currentChartHeight = expanded ? expandedChartHeight : chartHeight;
    
    return (
      <svg
        ref={expanded ? null : chartRef} // chartRef is for the non-expanded version only
        width={currentChartWidth}
        height={currentChartHeight}
        className="psychrometric-chart"
        onMouseMove={handleChartMouseMove}
        onMouseLeave={handleChartMouseLeave}
        onClick={handleChartClick}
        style={{
          cursor: addingPointViaChart ? 'crosshair' : 'default', // Default cursor, pointer on elements
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0", // Subtle border
          borderRadius: "0.375rem", // Rounded corners
        }}
      >
        {/* Chart Components */}
        {renderChartAxes()}
        {renderHumidityCurves()}
        {renderRHCurves()}
        {renderWBCurves()}
        {renderEnthalpyLines()}
        {renderProcesses()}
        {renderPoints()}
        {renderHoverInfo()}
        
        {addingPointViaChart && (
          <g className="adding-point-indicator" pointerEvents="none">
            <rect
              x={0}
              y={0}
              width={currentChartWidth}
              height={30} // Smaller banner
              fill="rgba(34, 139, 34, 0.15)" // Darker green, more subtle
            />
            <text 
              x={currentChartWidth / 2} 
              y={20} 
              textAnchor="middle" 
              fill="#166534" // Dark green text
              fontWeight="600"
              fontSize="13"
            >
              Click on chart to add a new point (DB Temp & Humidity Ratio)
            </text>
          </g>
        )}
      </svg>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Psychrometric Chart & Air Property Calculator</h2>
        <div className="flex space-x-4 items-center">
          <button 
            onClick={() => setIsChartExpanded(true)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm flex items-center"
          >
            <Icons.Table />
            <span className="ml-2">Show Chart</span>
          </button>
          {onShowTutorial && (
            <button 
              onClick={onShowTutorial} 
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <span className="mr-1">Tutorial</span>
              <Icons.InfoInline />
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <Icons.ArrowLeft /> Back to Disciplines
            </button>
          )}
        </div>
      </div>

      {/* MODIFIED: Layout changed to 50:50 (lg:col-span-5 for each child) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Chart Controls and Input Section */}
        <div className="lg:col-span-5 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          {/* System Parameters */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <h3 className="font-medium text-base mb-3 text-gray-700">System Parameters</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Altitude (m)</label>
                <input 
                  type="number" 
                  value={altitude} 
                  onChange={(e) => setAltitude(Math.max(0, Number(e.target.value)))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  step="50"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barometric Pressure (kPa)</label>
                <input 
                  type="number" 
                  value={barometricPressure.toFixed(2)} 
                  disabled 
                  className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm text-gray-600" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit System</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      name="unitSystem" 
                      value="SI"
                      checked={unitSystem === 'SI'} 
                      onChange={() => setUnitSystem('SI')} 
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">SI (°C, g/kg)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      name="unitSystem"
                      value="IP" 
                      checked={unitSystem === 'IP'} 
                      onChange={() => setUnitSystem('IP')} 
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled // IP system not fully implemented yet
                    />
                    <span className="text-sm text-gray-500 line-through">IP (°F, gr/lb) (WIP)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Air Points Section */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-base text-gray-700">Air Points</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={addPoint} 
                  className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
                >
                  Add Point
                </button>
                <button 
                  onClick={() => setAddingPointViaChart(!addingPointViaChart)} 
                  className={`px-3 py-1 rounded-md text-sm font-medium shadow-sm ${
                    addingPointViaChart 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {addingPointViaChart ? 'Cancel Add' : 'Add via Chart'}
                </button>
              </div>
            </div>
            
            {selectedPointId && points.find(p => p.id === selectedPointId) && (
              <div className="mb-3">
                {points.filter(point => point.id === selectedPointId).map(point => (
                      <div key={point.id} className="bg-blue-50 p-3 rounded-md border border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2 flex-shrink-0" 
                              style={{ backgroundColor: point.color }}
                            ></div>
                            <input 
                              type="text" 
                              value={point.name} 
                              onChange={(e) => updatePoint(point.id, { name: e.target.value })} 
                              className="font-medium text-gray-700 border-b border-dotted border-gray-300 bg-transparent focus:outline-none focus:border-blue-400 px-1 w-full"
                            />
                          </div>
                          <button 
                            onClick={() => removePoint(point.id)} 
                            className="text-red-600 hover:text-red-800 text-sm font-medium ml-2 flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Parameter 1
                            </label>
                            <select
                              value={point.parameterOne}
                              onChange={(e) => updatePoint(point.id, { 
                                parameterOne: e.target.value as ParameterType
                              })}
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              {Object.values(PARAMETER_INFO).map(param => (
                                <option key={`param1-${param.id}`} value={param.id}>
                                  {param.name} ({param.unit})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Parameter 2
                            </label>
                            <select
                              value={point.parameterTwo}
                              onChange={(e) => updatePoint(point.id, { 
                                parameterTwo: e.target.value as ParameterType
                              })}
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              {Object.values(PARAMETER_INFO)
                                .filter(param => param.id !== point.parameterOne)
                                .map(param => (
                                  <option key={`param2-${param.id}`} value={param.id}>
                                    {param.name} ({param.unit})
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label htmlFor={`paramVal1-${point.id}`} className="block text-sm font-medium text-gray-700 mb-1 truncate" title={PARAMETER_INFO[point.parameterOne].description}>
                              {PARAMETER_INFO[point.parameterOne].name} ({PARAMETER_INFO[point.parameterOne].unit})
                            </label>
                            <input 
                              id={`paramVal1-${point.id}`}
                              type="number" 
                              value={point[point.parameterOne] !== undefined ? String(point[point.parameterOne]) : ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                // Allow empty input to clear, otherwise update if valid number
                                if (e.target.value === '') {
                                    updatePoint(point.id, { [point.parameterOne]: undefined });
                                } else if (!isNaN(value)) {
                                  updatePoint(point.id, { [point.parameterOne]: value });
                                }
                              }} 
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" 
                              step={point.parameterOne === 'humidity' || point.parameterOne === 'vaporPressure' ? '0.01' : '0.1'}
                              placeholder="Enter value"
                            />
                          </div>
                          <div>
                            <label htmlFor={`paramVal2-${point.id}`} className="block text-sm font-medium text-gray-700 mb-1 truncate" title={PARAMETER_INFO[point.parameterTwo].description}>
                              {PARAMETER_INFO[point.parameterTwo].name} ({PARAMETER_INFO[point.parameterTwo].unit})
                            </label>
                            <input
                              id={`paramVal2-${point.id}`} 
                              type="number" 
                              value={point[point.parameterTwo] !== undefined ? String(point[point.parameterTwo]) : ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (e.target.value === '') {
                                    updatePoint(point.id, { [point.parameterTwo]: undefined });
                                } else if (!isNaN(value)) {
                                  updatePoint(point.id, { [point.parameterTwo]: value });
                                }
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" 
                              step={point.parameterTwo === 'humidity' || point.parameterTwo === 'vaporPressure' ? '0.01' : '0.1'}
                              placeholder="Enter value"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-blue-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Calculated Properties:</h5>
                          <div className="grid grid-cols-1 gap-y-2 text-xs"> {/* Smaller gap and text */}
                            {Object.values(PARAMETER_INFO)
                              .filter(param => param.id !== point.parameterOne && param.id !== point.parameterTwo)
                              .map(param => (
                                <div key={`calc-${param.id}-${point.id}`} className="flex justify-between items-center py-0.5">
                                  <span className="text-gray-600 flex-shrink-0 mr-2">{param.name}:</span>
                                  <span className="font-medium text-gray-800 text-right">
                                    {point[param.id] !== undefined ? 
                                      (param.id === 'humidity' || param.id === 'vaporPressure' || param.id === 'specificVolume' ? 
                                        (point[param.id] as number).toFixed(param.id === 'specificVolume' ? 3 : 2) : 
                                        (point[param.id] as number).toFixed(1)) : 
                                      '-'} {param.unit}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto border-t pt-2 mt-2">
              {points.length > 0 ? (
                <ul className="space-y-1">
                  {points.map(point => (
                    <li 
                      key={point.id} 
                      className={`flex items-center p-1.5 rounded cursor-pointer ${
                        selectedPointId === point.id ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedPointId(point.id)}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                        style={{ backgroundColor: point.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700 mr-2 truncate">{point.name}</span>
                      <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">
                        {point.dbTemp?.toFixed(1)}°C, {point.rh?.toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-2">No points added yet.</p>
              )}
            </div>
          </div>
          
          {/* Processes Section */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-base text-gray-700">Air Processes</h3>
              <button 
                onClick={addProcess} 
                disabled={!newProcessStartId || !newProcessEndId || newProcessStartId === newProcessEndId || points.length < 2}
                className={`bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium shadow-sm ${
                  (!newProcessStartId || !newProcessEndId || newProcessStartId === newProcessEndId || points.length < 2)
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                Add Process
              </button>
            </div>
            
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Point</label>
                <select 
                  value={newProcessStartId} 
                  onChange={(e) => setNewProcessStartId(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={points.length < 1}
                >
                  <option value="">Select...</option>
                  {points.map(point => (
                    <option key={`start-${point.id}`} value={point.id}>{point.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Point</label>
                <select 
                  value={newProcessEndId} 
                  onChange={(e) => setNewProcessEndId(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={points.length < 1}
                >
                  <option value="">Select...</option>
                  {points.filter(p => p.id !== newProcessStartId).map(point => ( // Prevent selecting same point
                    <option key={`end-${point.id}`} value={point.id}>{point.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Process Type</label>
                <select 
                  value={newProcessType} 
                  onChange={(e) => setNewProcessType(e.target.value as Process['type'])} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="heating">Heating</option>
                  <option value="cooling">Cooling</option>
                  <option value="humidification">Humidification</option>
                  <option value="dehumidification">Dehumidification</option>
                  <option value="mixing">Mixing (Conceptual)</option>
                  <option value="custom">Custom (SHR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mass Flow (kg/s)</label>
                <input 
                  type="number" 
                  value={newProcessMassFlow} 
                  onChange={(e) => setNewProcessMassFlow(Math.max(0.01, Number(e.target.value)))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" 
                  step="0.1"
                  min="0.01"
                />
              </div>
              
              {newProcessType === 'mixing' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mixing Ratio ({(newProcessMixingRatio * 100).toFixed(0)}% of Start Pt)
                  </label>
                  <input 
                    type="range" 
                    value={newProcessMixingRatio} 
                    onChange={(e) => setNewProcessMixingRatio(Number(e.target.value))} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                    min="0" 
                    max="1" 
                    step="0.01"
                  />
                </div>
              )}
              
              {newProcessType === 'custom' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sensible Heat Ratio (SHR): {newProcessSHR.toFixed(2)}
                  </label>
                  <input 
                    type="range" 
                    value={newProcessSHR} 
                    onChange={(e) => setNewProcessSHR(Number(e.target.value))} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                    min="0" 
                    max="1" 
                    step="0.01"
                  />
                </div>
              )}
            </div>
            
            <div className="max-h-48 overflow-y-auto border-t pt-2 mt-2">
              {processes.length > 0 ? (
                <ul className="space-y-2">
                  {processes.map(process => {
                    const startPoint = points.find(p => p.id === process.startPointId);
                    const endPoint = points.find(p => p.id === process.endPointId);
                    if (!startPoint || !endPoint) return null;
                    
                    return (
                      <li 
                        key={process.id} 
                        className={`p-2 rounded border cursor-pointer ${
                          selectedProcessId === process.id 
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedProcessId(process.id)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                              style={{ backgroundColor: process.processColor }}
                            ></div>
                            <span className="text-sm font-semibold text-gray-700 truncate">
                              {process.type.charAt(0).toUpperCase() + process.type.slice(1)}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeProcess(process.id); }} 
                            className="text-red-600 hover:text-red-800 text-xs font-medium ml-2"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-600">
                          <span className="truncate">{startPoint.name} → {endPoint.name}</span>
                          {process.energyChange !== undefined && (
                            <span className="font-medium whitespace-nowrap ml-2">
                              {process.energyChange.toFixed(1)} kW
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-2">No processes defined yet.</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Results Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
            
            {points.length === 0 && processes.length === 0 && (
                <p className="text-center text-gray-500 py-10">Add points and processes to see results here.</p>
            )}

            {points.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-base text-gray-700 mb-3">Air Properties Summary</h4>
                {points.map(point => (
                  <div key={point.id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                    <div className="flex items-center mb-3">
                      <div 
                        className="w-4 h-4 rounded-full mr-3 flex-shrink-0" 
                        style={{ backgroundColor: point.color }}
                      ></div>
                      <h5 className="font-semibold text-gray-800 text-lg truncate">{point.name}</h5>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {[
                        { label: 'Dry Bulb', value: point.dbTemp, unit: '°C', color: 'red', decimals: 1 },
                        { label: 'Rel. Humidity', value: point.rh, unit: '%', color: 'blue', decimals: 0 },
                        { label: 'Wet Bulb', value: point.wbTemp, unit: '°C', color: 'green', decimals: 1 },
                        { label: 'Dew Point', value: point.dewPoint, unit: '°C', color: 'purple', decimals: 1 },
                      ].map(prop => (
                        <div key={prop.label} className={`bg-${prop.color}-50 p-2.5 rounded-md border border-${prop.color}-200`}>
                          <div className={`text-xs font-medium text-${prop.color}-600 uppercase tracking-wide truncate`}>{prop.label}</div>
                          <div className={`text-md font-bold text-${prop.color}-700`}>
                            {prop.value !== undefined ? prop.value.toFixed(prop.decimals) : '-'}
                            <span className="text-xs">{prop.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {[
                        { label: 'Humidity Ratio', value: point.humidity, unit: 'g/kg', color: 'orange', decimals: 2 },
                        { label: 'Enthalpy', value: point.enthalpy, unit: 'kJ/kg', color: 'teal', decimals: 1 },
                        { label: 'Spec. Volume', value: point.specificVolume, unit: 'm³/kg', color: 'indigo', decimals: 3 },
                        { label: 'Vapor Press.', value: point.vaporPressure, unit: 'kPa', color: 'pink', decimals: 2 },
                      ].map(prop => (
                        <div key={prop.label} className={`bg-${prop.color}-50 p-2.5 rounded-md border border-${prop.color}-200`}>
                          <div className={`text-xs font-medium text-${prop.color}-600 uppercase tracking-wide truncate`}>{prop.label}</div>
                          <div className={`text-md font-bold text-${prop.color}-700`}>
                            {prop.value !== undefined ? prop.value.toFixed(prop.decimals) : '-'}
                             <span className="text-xs"> {prop.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {processes.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-base text-gray-700 mb-3">Air Processes Analysis</h4>
                {processes.map(process => {
                  const startPoint = points.find(p => p.id === process.startPointId);
                  const endPoint = points.find(p => p.id === process.endPointId);
                  
                  if (!startPoint || !endPoint || 
                      startPoint.enthalpy === undefined || endPoint.enthalpy === undefined ||
                      startPoint.humidity === undefined || endPoint.humidity === undefined ||
                      startPoint.dbTemp === undefined || endPoint.dbTemp === undefined) {
                    return (
                        <div key={process.id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                            <p className="text-sm text-red-600">Process "{process.type}" ({startPoint?.name || 'N/A'} → {endPoint?.name || 'N/A'}) cannot be fully analyzed due to missing point data.</p>
                        </div>
                    );
                  }
                  
                  const deltaTemp = endPoint.dbTemp - startPoint.dbTemp;
                  const deltaHumidity = endPoint.humidity - startPoint.humidity;
                  const deltaEnthalpy = endPoint.enthalpy - startPoint.enthalpy;
                  
                  return (
                    <div key={process.id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-4 h-4 rounded-full mr-3 flex-shrink-0" 
                          style={{ backgroundColor: process.processColor }}
                        ></div>
                        <h5 className="font-semibold text-gray-800 text-lg truncate">
                          {process.type.charAt(0).toUpperCase() + process.type.slice(1)} Process
                        </h5>
                        <span className="ml-auto text-sm text-gray-600 whitespace-nowrap">
                          {startPoint.name} → {endPoint.name}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="bg-red-50 p-2.5 rounded-md border border-red-200">
                          <div className="text-xs font-medium text-red-600 uppercase tracking-wide">ΔTemp</div>
                          <div className={`text-md font-bold ${ deltaTemp > 0 ? 'text-red-600' : deltaTemp < 0 ? 'text-blue-600' : 'text-gray-700'}`}>
                            {deltaTemp >= 0 ? '+' : ''}{deltaTemp.toFixed(1)}°C
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-2.5 rounded-md border border-blue-200">
                          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">ΔHumidity</div>
                          <div className={`text-md font-bold ${ deltaHumidity > 0 ? 'text-blue-600' : deltaHumidity < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                            {deltaHumidity >= 0 ? '+' : ''}{deltaHumidity.toFixed(2)} g/kg
                          </div>
                        </div>
                        
                        <div className="bg-orange-50 p-2.5 rounded-md border border-orange-200">
                          <div className="text-xs font-medium text-orange-600 uppercase tracking-wide">ΔEnthalpy</div>
                          <div className={`text-md font-bold text-orange-700`}>
                            {deltaEnthalpy >= 0 ? '+' : ''}{deltaEnthalpy.toFixed(1)} kJ/kg
                          </div>
                        </div>
                        
                        <div className="bg-green-50 p-2.5 rounded-md border border-green-200">
                          <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Mass Flow</div>
                          <div className="text-md font-bold text-green-700">
                            {process.massFlowRate?.toFixed(2) || '-'} kg/s
                          </div>
                        </div>
                      </div>
                      
                      {process.energyChange !== undefined && (
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-md border border-gray-300">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Energy Req.:</span>
                            <span className={`text-lg font-bold ${ process.energyChange >= 0 ? 'text-red-600' : 'text-blue-600' }`}>
                              {Math.abs(process.energyChange).toFixed(1)} kW
                              <span className="text-xs ml-1">
                                ({process.energyChange === 0 ? 'Neutral' : process.energyChange > 0 ? 'Heating' : 'Cooling'})
                              </span>
                            </span>
                          </div>
                          
                          <div className="mt-1.5 text-xs text-gray-600 space-y-0.5">
                            {process.type === 'cooling' && process.energyChange < 0 && (
                              <span>Equiv. {(Math.abs(process.energyChange) / 3.517).toFixed(1)} tons cooling</span>
                            )}
                             {process.type === 'heating' && process.energyChange > 0 && (
                              <span>Equiv. {(process.energyChange * 3412.14).toFixed(0)} BTU/hr heating</span>
                            )}
                            {process.type === 'humidification' && deltaHumidity > 0 && process.massFlowRate && (
                              <span>Water added: {(process.massFlowRate * deltaHumidity / 1000).toExponential(2)} kg/s</span>
                            )}
                            {process.type === 'dehumidification' && deltaHumidity < 0 && process.massFlowRate && (
                              <span>Water removed: {(process.massFlowRate * Math.abs(deltaHumidity) / 1000).toExponential(2)} kg/s</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isChartExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">Psychrometric Chart</h3>
              <div className="flex space-x-2 items-center">
                <button 
                  onClick={() => setAddingPointViaChart(!addingPointViaChart)} 
                  className={`px-3 py-1.5 rounded-md text-xs font-medium shadow-sm ${
                    addingPointViaChart 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {addingPointViaChart ? 'Cancel Add' : 'Add Point'}
                </button>
                <button
                  onClick={() => setIsChartExpanded(false)}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title="Close Chart"
                >
                  <Icons.Close/>
                </button>
              </div>
            </div>
            
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h4 className="font-medium text-xs text-gray-700 mb-2">Display Options</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-1.5">
                {[
                    {label: 'Points', key: 'showPoints'}, {label: 'RH Curves', key: 'showRHCurves'},
                    {label: 'WB Lines', key: 'showWBCurves'}, {label: 'Humidity Lines', key: 'showHumidityCurves'},
                    {label: 'Enthalpy Lines', key: 'showEnthalpyCurves'}, {label: 'Processes', key: 'showProcesses'},
                    {label: 'Highlight Sel.', key: 'highlightSelectedPoint'}
                ].map(opt => (
                    <label key={opt.key} className="inline-flex items-center">
                        <input type="checkbox" checked={displayOptions[opt.key as keyof typeof displayOptions]}
                               onChange={(e) => setDisplayOptions({...displayOptions, [opt.key]: e.target.checked})}
                               className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                        <span className="ml-1.5 text-xs text-gray-700">{opt.label}</span>
                    </label>
                ))}
                <button 
                  onClick={resetChartZoom} 
                  className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 justify-self-start"
                >
                  Reset View
                </button>
              </div>
            </div>
            
            <div className="p-4 flex-grow overflow-auto flex justify-center items-center">
                {renderChart(true)}
            </div>
            
            <div className="mt-auto p-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
                <h4 className="font-medium text-xs text-gray-700 mb-1.5">Chart Legend:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs text-gray-600">
                  <div className="flex items-center"><div className="w-3 h-0.5 bg-a0d2ff mr-1.5"></div>RH Curves (%)</div>
                  <div className="flex items-center"><div className="w-3 h-0.5 border-t border-dashed border-60a5fa mr-1.5"></div>WB Lines (°C)</div>
                  <div className="flex items-center"><div className="w-3 h-0.5 border-t border-dashed border-f97316 mr-1.5"></div>Enthalpy (kJ/kg)</div>
                  <div className="flex items-center"><div className="w-3 h-0.5 border-t border-dotted border-cbd5e1 mr-1.5"></div>Humidity (g/kg)</div>
                </div>
                 <p className="mt-1.5 text-xs text-gray-500">Hover for details. Click elements to select. Press Esc to close.</p>
              </div>
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Psychrometric calculations use ASHRAE methods. Barometric pressure adjusts with altitude.</li>
          <li>Define points with any two independent parameters. Inputs are editable; other properties are calculated.</li>
          <li>**DB & WB Temp pair is supported.** Wet bulb calculations use an iterative solver.</li>
          <li>Add points via inputs or by clicking on the chart (uses DB Temp & Humidity Ratio from click).</li>
          <li>Process energy calculations require a valid mass flow rate. Chart visualization is approximate.</li>
          <li><strong>Click "Show Chart" to open a larger, interactive psychrometric chart.</strong></li>
          <li>Results are displayed in color-coded cards for clarity.</li>
          <li>Make sure your input values for parameters are reasonable (e.g., RH 0-100%, WB ≤ DB).</li>
        </ul>
      </div>
    </div>
  );
};

export default PsychrometricChart;