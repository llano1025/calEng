import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

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
  type: 'heating' | 'cooling' | 'humidification' | 'dehumidification' | 'mixing' | 'custom' | 'auto';
  startPointId: string;
  endPointId: string;
  mixingRatio?: number; // For mixing process (0-1)
  sensibleHeatRatio?: number; // For custom processes
  energyChange?: number; // kW or cooling/heating tons
  volumetricFlowRate?: number; // L/s - CHANGED from massFlowRate
  massFlowRate?: number; // kg/s - calculated internally from volumetricFlowRate
  processColor: string;
  autoDetectedType?: string; // Store the auto-detected process type
}

// Define standard atmospheric pressure (101.325 kPa)
const STANDARD_PRESSURE = 101.325;

// CORRECTED: Air properties constants based on HTML reference (more accurate)
const SPECIFIC_GAS_CONSTANT_DRY_AIR = 287.055; // J/(kg·K) - CORRECTED to match HTML
const SPECIFIC_HEAT_CAPACITY_AIR = 1.006; // kJ/(kg·K)
const HEAT_VAPORIZATION_WATER = 2501.0; // kJ/kg at 0°C
const SPECIFIC_HEAT_CAPACITY_VAPOR = 1.86; // kJ/(kg·K) for water vapor

// Chart configuration
const CHART_CONFIG = {
  tempMin: -10, // °C
  tempMax: 50, // °C
  rhCurves: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], // %
  wbCurves: [-5, 0, 5, 10, 15, 20, 25, 30, 35], // °C
  humidityCurves: [0, 5, 10, 15, 20, 25, 30], // g/kg
  enthalpyCurves: [0, 20, 40, 60, 80, 100, 120], // kJ/kg
  specificVolumeCurves: [0.75, 0.8, 0.85, 0.9, 0.95], // m³/kg
  dbTempCurves: [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50], // °C
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
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Psychrometric Chart & Air Property Calculator',
    discipline: 'mvac',
    calculatorType: 'psychrometricChart'
  });

  // State for altitude (affects pressure)
  const [altitude, setAltitude] = useState<number>(0); // meters above sea level
  const [barometricPressure, setBarometricPressure] = useState<number>(STANDARD_PRESSURE); // kPa
  const [unitSystem, setUnitSystem] = useState<'SI' | 'IP'>('SI');
  
  // State for points
  const [points, setPoints] = useState<PsychrometricPoint[]>([
    {
      id: '1',
      name: 'Point 1',
      dbTemp: 23,
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
  
  // State for new process creation - CHANGED: volumetricFlowRate instead of massFlowRate
  const [newProcessType, setNewProcessType] = useState<Process['type']>('auto');
  const [newProcessStartId, setNewProcessStartId] = useState<string>('');
  const [newProcessEndId, setNewProcessEndId] = useState<string>('');
  const [newProcessMixingRatio, setNewProcessMixingRatio] = useState<number>(0.5);
  const [newProcessSHR, setNewProcessSHR] = useState<number>(0.7);
  const [newProcessVolumetricFlow, setNewProcessVolumetricFlow] = useState<number>(1000); // L/s - CHANGED
  
  // State for chart visibility
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [chartWidth, setChartWidth] = useState<number>(600);
  const [chartHeight, setChartHeight] = useState<number>(400);
  const [expandedChartWidth, setExpandedChartWidth] = useState<number>(1200);
  const [expandedChartHeight, setExpandedChartHeight] = useState<number>(800);
  const [chartMargin, setChartMargin] = useState<{top: number, right: number, bottom: number, left: number}>({
    top: 40, right: 60, bottom: 60, left: 60
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
    showDbTempLines: true,
    showPoints: true,
    showProcesses: true,
    highlightSelectedPoint: true,
  });
  
  // Effect hook to calculate barometric pressure based on altitude
  useEffect(() => {
    // Using standard atmosphere formula for pressure vs altitude
    const calculatedPressure = 101325 * Math.pow(1 - 2.25577e-5 * altitude, 5.2559);
    setBarometricPressure(Math.max(calculatedPressure / 1000, 10)); // Convert to kPa and ensure positive
  }, [altitude]);
  
  // Effect hook to calculate psychrometric properties for all points
  useEffect(() => {
    const updatedPoints = points.map(point => {
      const pointCopy = { ...point }; 
      const properties = calculatePsychrometricProperties(pointCopy, barometricPressure);
      return { ...pointCopy, ...properties };
    });
    
    setPoints(updatedPoints);
    
    // Calculate energy changes for processes
    if (updatedPoints.length > 0) {
      calculateProcessProperties(updatedPoints);
      
      // Save calculation and prepare export data
      const inputs = {
        altitude,
        barometricPressure,
        unitSystem,
        pointInputs: points.map(p => ({
          id: p.id,
          name: p.name,
          parameterOne: p.parameterOne,
          parameterTwo: p.parameterTwo,
          inputValue1: p[p.parameterOne],
          inputValue2: p[p.parameterTwo]
        }))
      };
      
      const calculationResults = {
        calculatedPoints: updatedPoints,
        processes: processes
      };
      
      saveCalculation(inputs, calculationResults);
      prepareExportData(inputs, calculationResults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map(p => `${p.id}-${p.parameterOne}-${p[p.parameterOne]}-${p.parameterTwo}-${p[p.parameterTwo]}`).join(','), barometricPressure]);

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
  
  // ADDED: Function to convert volumetric flow rate (L/s) to mass flow rate (kg/s)
  const convertVolumetricToMassFlow = (volumetricFlowLS: number, specificVolume: number): number => {
    // Convert L/s to m³/s
    const volumetricFlowM3S = volumetricFlowLS / 1000;
    // Convert m³/s to kg/s using specific volume
    const massFlowKgS = volumetricFlowM3S / specificVolume;
    return massFlowKgS;
  };
  
  // Calculate process properties
  const calculateProcessProperties = (currentPoints: PsychrometricPoint[]) => {
    const updatedProcesses = processes.map(process => {
      const startPoint = currentPoints.find(p => p.id === process.startPointId);
      const endPoint = currentPoints.find(p => p.id === process.endPointId);
      
      if (!startPoint || !endPoint || startPoint.enthalpy === undefined || endPoint.enthalpy === undefined || 
          startPoint.humidity === undefined || endPoint.humidity === undefined ||
          startPoint.specificVolume === undefined) {
        return { ...process, energyChange: undefined, massFlowRate: undefined };
      }
      
      let energyChange: number | undefined = undefined;
      let massFlowRate: number | undefined = undefined;
      let autoDetectedType: string | undefined = undefined;
      
      // Auto-detect process type if set to 'auto'
      if (process.type === 'auto') {
        autoDetectedType = detectProcessType(startPoint, endPoint);
      }
      
      // Convert volumetric flow rate to mass flow rate using start point specific volume
      if (process.volumetricFlowRate && startPoint.specificVolume !== undefined) {
        massFlowRate = convertVolumetricToMassFlow(process.volumetricFlowRate, startPoint.specificVolume);
      }
      
      // Energy change calculation using mass flow rate in kg/s, enthalpy in kJ/kg
      if (massFlowRate && startPoint.enthalpy !== undefined && endPoint.enthalpy !== undefined) {
        // Energy change in kW
        energyChange = massFlowRate * (endPoint.enthalpy - startPoint.enthalpy);
      }
      
      return { ...process, energyChange, massFlowRate, autoDetectedType };
    });
    
    setProcesses(updatedProcesses);
  };

  // ADDED: Function to auto-detect process type based on point directions
  const detectProcessType = (startPoint: PsychrometricPoint, endPoint: PsychrometricPoint): string => {
    if (!startPoint.dbTemp || !endPoint.dbTemp || !startPoint.humidity || !endPoint.humidity) {
      return 'custom';
    }
    
    const deltaTemp = endPoint.dbTemp - startPoint.dbTemp;
    const deltaHumidity = endPoint.humidity - startPoint.humidity;
    
    // Define thresholds for considering changes significant
    const tempThreshold = 0.5; // °C
    const humidityThreshold = 0.5; // g/kg
    
    const tempChange = Math.abs(deltaTemp) > tempThreshold;
    const humidityChange = Math.abs(deltaHumidity) > humidityThreshold;
    
    if (tempChange && !humidityChange) {
      // Only temperature changes
      return deltaTemp > 0 ? 'heating' : 'cooling';
    } else if (!tempChange && humidityChange) {
      // Only humidity changes
      return deltaHumidity > 0 ? 'humidification' : 'dehumidification';
    } else if (tempChange && humidityChange) {
      // Both temperature and humidity change
      if (deltaTemp > 0 && deltaHumidity > 0) {
        return 'heating and humidifying';
      } else if (deltaTemp > 0 && deltaHumidity < 0) {
        return 'heating and dehumidifying';
      } else if (deltaTemp < 0 && deltaHumidity > 0) {
        return 'cooling and humidifying';
      } else {
        return 'cooling and dehumidifying';
      }
    }
    
    return 'custom'; // Fallback for minimal changes
  };

// CORRECTED: Function to calculate psychrometric properties using HTML reference formulas
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
    return point; // Combination not handled
  }
  
  // Combine with original point
  return { 
    ...point,
    ...result
  };
};

// Calculate properties from dry bulb temperature and relative humidity
const calculateFromDBandRH = (dbTemp: number, rh: number, pressure: number): Partial<PsychrometricPoint> => {
  const dbTempK = dbTemp + 273.15;
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  const vaporPressure = satVaporPressure * (rh / 100);
  
  // CORRECTED: Using precise humidity ratio formula from HTML reference
  const humidityRatio = 0.621945 * (vaporPressure / (pressure - vaporPressure));
  const humidity = humidityRatio * 1000; // Convert to g/kg
  
  // CORRECTED: Specific volume calculation matching HTML reference
  const Rda = SPECIFIC_GAS_CONSTANT_DRY_AIR / 1000; // Convert to kJ/(kg·K)
  const specificVolume = Rda * dbTempK * (1 + 1.6078 * humidityRatio) / pressure;
  
  // Enthalpy calculation
  const enthalpy = SPECIFIC_HEAT_CAPACITY_AIR * dbTemp + humidityRatio * (HEAT_VAPORIZATION_WATER + SPECIFIC_HEAT_CAPACITY_VAPOR * dbTemp);
  
  const dewPoint = calculateDewPoint(vaporPressure);
  const wbTemp = calculateWetBulbFromDBandRH(dbTemp, rh, pressure);
  
  return {
    dbTemp,
    rh,
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
    return { dbTemp, wbTemp }; // Invalid input
  }
  
  // CORRECTED: More robust calculation matching HTML reference
  let W_low = 0;
  const pvs = calculateSaturationVaporPressure(dbTemp);
  let W_high = 0.621945 * pvs / (pressure - pvs);
  let W = W_high / 2;
  
  const maxIter = 50;
  let iter = 0;
  
  while (iter < maxIter) {
    const twb_calc = calculateWetBulbFromDBandRH(dbTemp, calculateRHFromHumidityRatio(W, dbTemp, pressure), pressure);
    const error = Math.abs(twb_calc - wbTemp);
    
    if (error < 0.01) break;
    
    if (twb_calc < wbTemp) {
      W_low = W;
    } else {
      W_high = W;
    }
    W = (W_low + W_high) / 2;
    iter++;
  }
  
  W = Math.max(0, W);
  const rh = calculateRHFromHumidityRatio(W, dbTemp, pressure);
  
  // Get all properties from DB and RH
  const allProps = calculateFromDBandRH(dbTemp, rh, pressure);
  
  return {
    ...allProps,
    dbTemp: dbTemp,
    wbTemp: wbTemp,
  };
};

// Helper function to calculate RH from humidity ratio
const calculateRHFromHumidityRatio = (W: number, dbTemp: number, pressure: number): number => {
  const vaporPressure = (W * pressure) / (0.621945 + W);
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  return Math.min(100, Math.max(0, (vaporPressure / satVaporPressure) * 100));
};

// Calculate properties from dry bulb temperature and dew point
const calculateFromDBandDP = (dbTemp: number, dewPoint: number, pressure: number): Partial<PsychrometricPoint> => {
  if (dewPoint > dbTemp) {
     return { dbTemp, dewPoint }; // Invalid
  }
  const vaporPressure = calculateSaturationVaporPressure(dewPoint);
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  const rh = Math.min(100, Math.max(0, (vaporPressure / satVaporPressure) * 100));
  
  const allProps = calculateFromDBandRH(dbTemp, rh, pressure);
  return {
    ...allProps,
    dbTemp: dbTemp,
    dewPoint: dewPoint,
    rh: rh,
  };
};

// Calculate properties from dry bulb temperature and humidity ratio
const calculateFromDBandHumidity = (dbTemp: number, humidity: number, pressure: number): Partial<PsychrometricPoint> => {
  const humidityRatio = humidity / 1000; // Convert g/kg to kg/kg
  
  const maxHumidityRatio = calculateSaturationHumidityRatio(dbTemp, pressure);
  const adjustedHumidityRatio = Math.min(humidityRatio, maxHumidityRatio);
  
  const vaporPressure = (adjustedHumidityRatio * pressure) / (0.621945 + adjustedHumidityRatio);
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  const rh = Math.min(100, Math.max(0, (vaporPressure / satVaporPressure) * 100));
  
  const allProps = calculateFromDBandRH(dbTemp, rh, pressure);
  return {
    ...allProps,
    dbTemp: dbTemp,
    humidity: adjustedHumidityRatio * 1000, // Back to g/kg
    rh: rh,
  };
};

// Calculate properties from dry bulb temperature and enthalpy
const calculateFromDBandEnthalpy = (dbTemp: number, enthalpy: number, pressure: number): Partial<PsychrometricPoint> => {
  const cp_air = SPECIFIC_HEAT_CAPACITY_AIR;
  const cp_vapor = SPECIFIC_HEAT_CAPACITY_VAPOR; 
  const h_fg = HEAT_VAPORIZATION_WATER;
  
  let humidityRatio = (enthalpy - cp_air * dbTemp) / (h_fg + cp_vapor * dbTemp);
  humidityRatio = Math.max(0, humidityRatio); // Humidity ratio cannot be negative
  
  // Check against saturation
  const maxHumidityRatio = calculateSaturationHumidityRatio(dbTemp, pressure);
  humidityRatio = Math.min(humidityRatio, maxHumidityRatio);
  
  const humidity = humidityRatio * 1000; 
  
  const allPropsFromDBandHumidity = calculateFromDBandHumidity(dbTemp, humidity, pressure);
  return {
    ...allPropsFromDBandHumidity,
    enthalpy: enthalpy,
  };
};

// Calculate properties from relative humidity and wet bulb temperature
const calculateFromRHandWB = (rh: number, wbTemp: number, pressure: number): Partial<PsychrometricPoint> => {
  let dbGuess = wbTemp + 2; // Start guess slightly above wbTemp
  const tolerance = 0.01;
  let iterations = 0;
  const maxIterations = 100;
  let calculatedWB: number | undefined;

  while (iterations < maxIterations) {
    const propsAtGuess = calculateFromDBandRH(dbGuess, rh, pressure);
    calculatedWB = propsAtGuess.wbTemp;

    if (calculatedWB === undefined) {
      return { rh, wbTemp };
    }
    
    if (Math.abs(calculatedWB - wbTemp) < tolerance) {
      return {
        ...propsAtGuess,
        rh: rh,
        wbTemp: wbTemp,
        dbTemp: dbGuess
      };
    }
    
    const error = wbTemp - calculatedWB;
    let adjustment = error * 0.5;
    
    adjustment = Math.sign(adjustment) * Math.min(Math.abs(adjustment), 2.0); 
    dbGuess += adjustment;

    dbGuess = Math.max(dbGuess, wbTemp); 
    dbGuess = Math.min(dbGuess, CHART_CONFIG.tempMax + 10); 
    dbGuess = Math.max(dbGuess, CHART_CONFIG.tempMin - 10);

    iterations++;
  }
  
  const finalProps = calculateFromDBandRH(dbGuess, rh, pressure);
  return {
    ...finalProps,
    rh: rh,
    wbTemp: wbTemp,
    dbTemp: dbGuess
  };
};

// CORRECTED: Wet bulb calculation using HTML reference method
const calculateWetBulbFromDBandRH = (dbTemp: number, rh: number, pressure: number): number => {
  // Calculate humidity ratio directly
  const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
  const vaporPressure = satVaporPressure * (rh / 100);
  const W = 0.621945 * (vaporPressure / (pressure - vaporPressure));
  
  let t_wb = dbTemp;
  let count = 0;
  const maxIter = 10000;
  let error = 1.0;
  
  while (count < maxIter && Math.abs(error) > 0.001) {
    const p_ws_wb = calculateSaturationVaporPressure(t_wb);
    const ws_wb = 0.621945 * p_ws_wb / (pressure - p_ws_wb);
    const test = (2501 * (ws_wb - W) - dbTemp * (1.006 + 1.86 * W)) / (2.326 * ws_wb - 1.006 - 4.186 * W);
    error = t_wb - test;
    t_wb = t_wb - error / 100;
    count++;
  }
  
  return Math.min(t_wb, dbTemp);
};

// Calculate saturation humidity ratio
const calculateSaturationHumidityRatio = (temp: number, pressure: number): number => {
  const satVaporPressure = calculateSaturationVaporPressure(temp);
  if (satVaporPressure >= pressure) {
    return Infinity; // Theoretical limit
  }
  return 0.621945 * (satVaporPressure / (pressure - satVaporPressure));
};
  
  // CORRECTED: Saturation vapor pressure using HTML reference formulas
  const calculateSaturationVaporPressure = (tempC: number) => {
    const T = tempC + 273.15; // Temperature in Kelvin
    
    if (tempC >= 0) {
      // For temperatures above 0°C (over water) - HTML reference formula
      const Pws_Pa = Math.exp(-5.8002206e3/T + 1.3914993 + -4.8640239e-2*T + 4.1764768e-5*T*T + -1.4452093e-8*T*T*T + 6.5459673*Math.log(T));
      return Pws_Pa / 1000; // Convert Pa to kPa
    } else {
      // For temperatures below 0°C (over ice) - HTML reference formula
      const Pws_Pa = Math.exp(-5.6745359e3/T + 6.3925247 + -9.677843e-3*T + 6.2215701e-7*T*T + 2.0747825e-9*T*T*T + -9.484024e-13*T*T*T*T + 4.1635019*Math.log(T));
      return Pws_Pa / 1000; // Convert Pa to kPa
    }
  };
  
  // CORRECTED: Dew point calculation using HTML reference method
  const calculateDewPoint = (vaporPressure: number) => {
    if (vaporPressure <= 0) return -999; 
    
    const pv = Math.min(vaporPressure, barometricPressure * 0.9999);
    const alpha = Math.log(pv);
    
    let Tdp: number;
    if (pv < 0.61094) {
      // Low pressure formula
      Tdp = 6.09 + 12.608 * alpha + 0.4959 * alpha * alpha;
      Tdp = Math.max(Tdp, -90);
    } else {
      // High pressure formula
      Tdp = 6.54 + 14.526 * alpha + 0.7389 * alpha * alpha + 0.09486 * Math.pow(alpha, 3) + 0.4569 * Math.pow(pv, 0.1984);
      Tdp = Math.min(Tdp, 200);
    }
    
    // Newton-Raphson refinement (from HTML reference)
    let Tdp_new = Tdp;
    for (let i = 0; i < 5; i++) {
      const pvs_tdp = calculateSaturationVaporPressure(Tdp_new);
      const a = 17.62;
      const b = 243.12;
      const derivative = pvs_tdp * (a * b) / Math.pow(b + Tdp_new, 2);
      
      if (Math.abs(derivative) < 1e-9) break;
      
      Tdp_new = Tdp_new - (pvs_tdp - vaporPressure) / derivative;
      
      if (Math.abs(Tdp_new - Tdp) < 0.01) break;
      Tdp = Tdp_new;
    }
    
    return Tdp;
  };
  
  // Function to add a new psychrometric point
  const addPoint = () => {
    const newId = (points.length + Date.now()).toString();
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
  
  // Function to add a new process - UPDATED for volumetric flow
  const addProcess = () => {
    if (!newProcessStartId || !newProcessEndId || newProcessStartId === newProcessEndId) {
      alert("Please select valid and different start and end points for the process.");
      return;
    }
    
    const newId = (processes.length + Date.now()).toString();
    const newProcess: Process = {
      id: newId,
      type: newProcessType,
      startPointId: newProcessStartId,
      endPointId: newProcessEndId,
      processColor: PROCESS_COLORS[processes.length % PROCESS_COLORS.length],
      volumetricFlowRate: newProcessVolumetricFlow, // CHANGED: Use volumetric flow rate
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
    if (!chartRef.current && !isChartExpanded) return;
    
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
    const maxHumidity = CHART_CONFIG.humidityCurves[CHART_CONFIG.humidityCurves.length - 1];
    const humidity = Math.max(0, (1 - (y / chartContentHeight)) * maxHumidity);

    const properties = calculateFromDBandHumidity(dbTemp, humidity, barometricPressure);
    
    setHoverInfo({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      dbTemp: properties.dbTemp || dbTemp,
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
      rh: Math.round(propsFromClick.rh || 0),
      color: POINT_COLORS[(points.length) % POINT_COLORS.length],
      parameterOne: 'dbTemp',
      parameterTwo: 'rh',
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
    if (maxHumidity === 0) return chartMargin.top + chartContentHeight;
    
    // Ensure humidity is clamped to valid range
    const clampedHumidity = Math.max(0, Math.min(humidity, maxHumidity));
    return chartMargin.top + chartContentHeight - ((clampedHumidity / maxHumidity) * chartContentHeight);
  };
  
  const rhToY = (rh: number, temp: number) => {
    const props = calculateFromDBandRH(temp, rh, barometricPressure);
    return humidityToY(props.humidity || 0);
  };
  
  // Function to render chart axes and grid with proper boundaries
  const renderChartAxes = (): JSX.Element => {
    const currentChartWidth = isChartExpanded ? expandedChartWidth : chartWidth;
    const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
    
    const chartContentWidth = currentChartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    
    return (
      <g className="chart-axes">
        {/* Chart boundary rectangle */}
        <rect
          x={chartMargin.left}
          y={chartMargin.top}
          width={chartContentWidth}
          height={chartContentHeight}
          fill="none"
          stroke="#333"
          strokeWidth="2"
        />
        
        {/* X axis labels */}
        {Array.from({ length: 13 }, (_, i) => CHART_CONFIG.tempMin + (i * 5)).map((temp, i) => (
          <g key={`x-tick-${i}`}>
            <line 
              x1={tempToX(temp)} 
              y1={chartMargin.top + chartContentHeight} 
              x2={tempToX(temp)} 
              y2={chartMargin.top + chartContentHeight + 5}
              stroke="#333"
              strokeWidth="1"
            />
            <text
              x={tempToX(temp)}
              y={chartMargin.top + chartContentHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
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
          fill="#333"
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
          fill="#333"
          transform="rotate(-90)"
        >
          Humidity Ratio (g/kg dry air)
        </text>
      </g>
    );
  };
  
  // Function to render RH curves with proper clipping and straight boundaries
  const renderRHCurves = (): JSX.Element | null => {
    if (!displayOptions.showRHCurves) return null;
    
    const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    const bottomY = chartMargin.top + chartContentHeight;
    
    return (
      <g className="rh-curves" clipPath="url(#chart-clip)">
        {CHART_CONFIG.rhCurves.map((rh) => {
          let pathData = "";
          const tempStep = 0.5;

          for (let t = CHART_CONFIG.tempMin; t <= CHART_CONFIG.tempMax; t += tempStep) {
            const props = calculateFromDBandRH(t, rh, barometricPressure);
            if (props.humidity !== undefined && props.humidity >= 0) {
              const x = tempToX(t);
              const y = humidityToY(props.humidity);
              
              // Ensure curves don't go below the chart bottom
              const clampedY = Math.min(y, bottomY);
              
              if (clampedY >= chartMargin.top && clampedY <= bottomY) {
                if (pathData === "") {
                  pathData = `M ${x} ${clampedY}`;
                } else {
                  pathData += ` L ${x} ${clampedY}`;
                }
              }
            }
          }
          
          if (!pathData) return null;

          return (
            <g key={`rh-${rh}`} className="rh-curve">
              <path
                d={pathData}
                stroke={rh === 100 ? "#006600" : "#228B22"}
                strokeWidth={rh === 100 ? "3" : "1.5"}
                fill="none"
              />
              
              {rh % 20 === 0 && (
                <text
                  x={tempToX(CHART_CONFIG.tempMax - 2)}
                  y={Math.max(chartMargin.top + 10, rhToY(rh, CHART_CONFIG.tempMax - 2) - 5)}
                  fontSize="11"
                  fill="#006600"
                  textAnchor="end"
                  fontWeight="bold"
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
  
  // CORRECTED: Function to render wet bulb temperature curves (fixed bouncing issue)
  const renderWBCurves = (): JSX.Element | null => {
    if (!displayOptions.showWBCurves) return null;
    
    const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    const bottomY = chartMargin.top + chartContentHeight;
    
    return (
      <g className="wb-curves" clipPath="url(#chart-clip)">
        {CHART_CONFIG.wbCurves.map((wb) => {
          let pathData = "";
          
          const startTemp = Math.max(wb, CHART_CONFIG.tempMin);
          
          // CORRECTED: Fixed loop to prevent line artifacts and ensure proper clipping
          for (let db = startTemp; db <= CHART_CONFIG.tempMax; db += 0.5) {
            const props = calculateFromDBandWB(db, wb, barometricPressure);
            if (props.humidity !== undefined && props.humidity >= 0) {
              const x = tempToX(db);
              const y = humidityToY(props.humidity);

              // CORRECTED: Ensure y doesn't go below bottom boundary
              const clampedY = Math.min(y, bottomY);
              
              // Only add points within chart boundaries
              if (clampedY >= chartMargin.top && clampedY <= bottomY) {
                if (pathData === "") {
                  pathData = `M ${x} ${clampedY}`;
                } else {
                  pathData += ` L ${x} ${clampedY}`;
                }
              }
            }
          }

          if (!pathData) return null;

          return (
            <g key={`wb-${wb}`} className="wb-curve">
              <path
                d={pathData}
                stroke="#0066CC"
                strokeWidth="1"
                strokeDasharray="4,2"
                fill="none"
              />
              
              {wb >= CHART_CONFIG.tempMin && wb % 5 === 0 && (
                <text
                  x={tempToX(wb) + 15}
                  y={Math.max(chartMargin.top + 15, humidityToY(calculateSaturationHumidityRatio(wb, barometricPressure) * 1000) - 5)}
                  fontSize="10"
                  fill="#0066CC"
                  transform={`rotate(-45 ${tempToX(wb) + 15} ${Math.max(chartMargin.top + 15, humidityToY(calculateSaturationHumidityRatio(wb, barometricPressure) * 1000) - 5)})`}
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
  
  // Function to render enthalpy lines with proper positioning and labeling
  const renderEnthalpyLines = (): JSX.Element | null => {
    if (!displayOptions.showEnthalpyCurves) return null;
    
    return (
      <g className="enthalpy-lines" clipPath="url(#chart-clip)">
        {CHART_CONFIG.enthalpyCurves.map((enthalpyVal) => {
          let pathData = "";
          
          for (let t = CHART_CONFIG.tempMin; t <= CHART_CONFIG.tempMax; t += 0.5) {
            const props = calculateFromDBandEnthalpy(t, enthalpyVal, barometricPressure);
            if (props.humidity !== undefined && props.humidity >= 0) {
              const x = tempToX(t);
              const y = humidityToY(props.humidity);

              const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
              if (y >= chartMargin.top && y <= chartMargin.top + currentChartHeight - chartMargin.bottom) {
                if (pathData === "") {
                  pathData = `M ${x} ${y}`;
                } else {
                  pathData += ` L ${x} ${y}`;
                }
              }
            }
          }
          
          if (!pathData) return null;

          return (
            <g key={`enthalpy-${enthalpyVal}`} className="enthalpy-line">
              <path
                d={pathData}
                stroke="#CC0000"
                strokeWidth="1"
                strokeDasharray="6,3"
                fill="none"
              />
              
              {enthalpyVal % 20 === 0 && (() => {
                  // Better label positioning for enthalpy lines
                  const labelTemp = CHART_CONFIG.tempMax - 5;
                  const propsForLabel = calculateFromDBandEnthalpy(labelTemp, enthalpyVal, barometricPressure);
                  if (propsForLabel.humidity !== undefined && propsForLabel.humidity > 0) {
                      const xLabel = tempToX(labelTemp);
                      const yLabel = humidityToY(propsForLabel.humidity);
                      const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
                      if (yLabel > chartMargin.top + 20 && yLabel < chartMargin.top + currentChartHeight - chartMargin.bottom - 20) {
                         return (
                            <text
                                x={xLabel - 10}
                                y={yLabel - 5}
                                fontSize="10"
                                fill="#CC0000"
                                fontWeight="bold"
                                transform={`rotate(-30 ${xLabel - 10} ${yLabel - 5})`}
                            >
                                {enthalpyVal}
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
  
  // Function to render humidity curves with proper boundaries
  const renderHumidityCurves = (): JSX.Element | null => {
    if (!displayOptions.showHumidityCurves) return null;
    
    const chartContentHeight = (isChartExpanded ? expandedChartHeight : chartHeight) - chartMargin.top - chartMargin.bottom;
    const chartContentWidth = (isChartExpanded ? expandedChartWidth : chartWidth) - chartMargin.left - chartMargin.right;

    return (
      <g className="humidity-curves">
        {CHART_CONFIG.humidityCurves.map((humidity) => {
          const yPos = humidityToY(humidity);
          if (yPos < chartMargin.top || yPos > chartMargin.top + chartContentHeight) return null;

          return (
            <g key={`humidity-${humidity}`} className="humidity-curve">
              <line
                x1={chartMargin.left}
                y1={yPos}
                x2={chartMargin.left + chartContentWidth}
                y2={yPos}
                stroke="#666"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
              
              <text
                x={chartMargin.left - 8}
                y={yPos}
                fontSize="10"
                fill="#666"
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

  // Function to render dry bulb temperature lines
  const renderDbTempLines = (): JSX.Element | null => {
    if (!displayOptions.showDbTempLines) return null;
    
    const chartContentHeight = (isChartExpanded ? expandedChartHeight : chartHeight) - chartMargin.top - chartMargin.bottom;

    return (
      <g className="db-temp-lines">
        {CHART_CONFIG.dbTempCurves.map((temp) => {
          const xPos = tempToX(temp);
          
          return (
            <g key={`db-temp-${temp}`} className="db-temp-line">
              <line
                x1={xPos}
                y1={chartMargin.top}
                x2={xPos}
                y2={chartMargin.top + chartContentHeight}
                stroke="#999"
                strokeWidth="0.5"
                strokeDasharray="1,3"
              />
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

          const currentChartWidth = isChartExpanded ? expandedChartWidth : chartWidth;
          const currentChartHeight = isChartExpanded ? expandedChartHeight : chartHeight;
          if (x < chartMargin.left || x > currentChartWidth - chartMargin.right || 
              y < chartMargin.top || y > currentChartHeight - chartMargin.bottom) {
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
                paintOrder="stroke"
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
          
          let pathData = `M ${startX} ${startY} L ${endX} ${endY}`;

          const isSelected = selectedProcessId === process.id;
          
          // Determine display type and label
          const displayType = process.type === 'auto' ? process.autoDetectedType || 'auto' : process.type;
          
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
                strokeWidth={isSelected ? "3.5" : "2.5"}
                fill="none"
                strokeDasharray={process.type === 'mixing' ? "6,3" : "none"}
                markerEnd={`url(#arrow-${process.id})`}
              />
              
              <marker
                id={`arrow-${process.id}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={process.processColor} />
              </marker>
              
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 12}
                fontSize="11"
                fontWeight={isSelected ? "bold" : "normal"}
                fill={process.processColor}
                stroke="#fff"
                strokeWidth="0.5"
                paintOrder="stroke"
                textAnchor="middle"
              >
                {displayType.charAt(0).toUpperCase() + displayType.slice(1)}
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
          width="170"
          height="95"
          fill="rgba(255, 255, 255, 0.95)"
          stroke="#555"
          strokeWidth="1"
          rx="5"
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
  
  // Function to reset chart zoom/view
  const resetChartZoom = () => {
    console.log("Chart view reset (dimensions are fixed or per expanded state).");
  };

  // Function to render the chart SVG
  const renderChart = (expanded: boolean = false): JSX.Element => {
    const currentChartWidth = expanded ? expandedChartWidth : chartWidth;
    const currentChartHeight = expanded ? expandedChartHeight : chartHeight;
    const chartContentWidth = currentChartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = currentChartHeight - chartMargin.top - chartMargin.bottom;
    
    return (
      <svg
        ref={expanded ? null : chartRef}
        width={currentChartWidth}
        height={currentChartHeight}
        className="psychrometric-chart"
        onMouseMove={handleChartMouseMove}
        onMouseLeave={handleChartMouseLeave}
        onClick={handleChartClick}
        style={{
          cursor: addingPointViaChart ? 'crosshair' : 'default',
          backgroundColor: "#fafafa",
          border: "2px solid #333",
          borderRadius: "0.375rem",
        }}
      >
        {/* Define clipping path for chart content */}
        <defs>
          <clipPath id="chart-clip">
            <rect
              x={chartMargin.left}
              y={chartMargin.top}
              width={chartContentWidth}
              height={chartContentHeight}
            />
          </clipPath>
        </defs>
        
        {/* Chart Components - order matters for proper layering */}
        {renderHumidityCurves()}
        {renderDbTempLines()}
        {renderRHCurves()}
        {renderWBCurves()}
        {renderEnthalpyLines()}
        {renderProcesses()}
        {renderPoints()}
        {renderHoverInfo()}
        
        {/* Render axes LAST to ensure clean boundaries */}
        {renderChartAxes()}
        
        {addingPointViaChart && (
          <g className="adding-point-indicator" pointerEvents="none">
            <rect
              x={0}
              y={0}
              width={currentChartWidth}
              height={30}
              fill="rgba(34, 139, 34, 0.15)"
            />
            <text 
              x={currentChartWidth / 2} 
              y={20} 
              textAnchor="middle" 
              fill="#166534"
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
    <CalculatorWrapper
      title="Psychrometric Chart & Air Property Calculator"
      discipline="mvac"
      calculatorType="psychrometricChart"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4 items-center">
              <button 
                onClick={() => setIsChartExpanded(true)} 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm flex items-center"
              >
                <Icons.Table />
                <span className="ml-2">Show Chart</span>
              </button>
            </div>
          </div>

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
                      disabled
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
                          <div className="space-y-1">
                            {Object.values(PARAMETER_INFO)
                              .filter(param => param.id !== point.parameterOne && param.id !== point.parameterTwo)
                              .map(param => (
                                <div key={`calc-${param.id}-${point.id}`} className="flex justify-between items-center py-1">
                                  <span className="text-sm text-gray-600">{param.name}:</span>
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
                  {points.filter(p => p.id !== newProcessStartId).map(point => (
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
                  <option value="auto">Auto Detect</option>
                  <option value="heating">Heating</option>
                  <option value="cooling">Cooling</option>
                  <option value="humidification">Humidification</option>
                  <option value="dehumidification">Dehumidification</option>
                  <option value="mixing">Mixing (Conceptual)</option>
                  <option value="custom">Custom (SHR)</option>
                </select>
              </div>
              <div>
                {/* CHANGED: Label and unit from kg/s to L/s */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Airflow Rate (L/s)</label>
                <input 
                  type="number" 
                  value={newProcessVolumetricFlow} 
                  onChange={(e) => setNewProcessVolumetricFlow(Math.max(1, Number(e.target.value)))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" 
                  step="10"
                  min="1"
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
                    
                    const displayType = process.type === 'auto' ? process.autoDetectedType || 'auto' : process.type;
                    
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
                              {displayType.charAt(0).toUpperCase() + displayType.slice(1)}
                              {process.type === 'auto' && process.autoDetectedType && (
                                <span className="text-xs text-gray-500 ml-1">(auto)</span>
                              )}
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
                        {/* ADDED: Display both volumetric and mass flow rates */}
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>
                            {process.volumetricFlowRate?.toFixed(0)} L/s
                          </span>
                          {process.massFlowRate && (
                            <span>
                              {process.massFlowRate.toFixed(3)} kg/s
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
              <div className="space-y-3">
                <h4 className="font-medium text-base text-gray-700 mb-3">Air Properties Summary</h4>
                {points.map(point => (
                  <div key={point.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                    <div className="flex items-center mb-3">
                      <div 
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                        style={{ backgroundColor: point.color }}
                      ></div>
                      <h5 className="font-semibold text-gray-800 text-base truncate">{point.name}</h5>
                    </div>
                    
                    {/* MODIFICATION START: Replaced complex boxes with simple list */}
                    <div className="space-y-1.5 text-sm px-1">
                      {Object.values(PARAMETER_INFO)
                        .map(param => (
                          <div key={`${point.id}-result-${param.id}`} className="flex justify-between items-baseline">
                            <span className="text-gray-600">{param.name}:</span>
                            <span className="font-medium text-gray-800 text-right">
                              {point[param.id] !== undefined ? 
                                (param.id === 'humidity' || param.id === 'vaporPressure' || param.id === 'specificVolume' ? 
                                  (point[param.id] as number).toFixed(param.id === 'specificVolume' ? 3 : 2) : 
                                  (point[param.id] as number).toFixed(1)) : 
                                '-'} {point[param.id] !== undefined ? param.unit : ''}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                    {/* MODIFICATION END */}

                  </div>
                ))}
              </div>
            )}
            
            {processes.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="font-medium text-base text-gray-700 mb-3">Air Processes Analysis</h4>
                {processes.map(process => {
                  const startPoint = points.find(p => p.id === process.startPointId);
                  const endPoint = points.find(p => p.id === process.endPointId);
                  
                  if (!startPoint || !endPoint || 
                      startPoint.enthalpy === undefined || endPoint.enthalpy === undefined ||
                      startPoint.humidity === undefined || endPoint.humidity === undefined ||
                      startPoint.dbTemp === undefined || endPoint.dbTemp === undefined) {
                    return (
                        <div key={process.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <p className="text-sm text-red-600">Process "{process.type}" ({startPoint?.name || 'N/A'} → {endPoint?.name || 'N/A'}) cannot be fully analyzed due to missing point data.</p>
                        </div>
                    );
                  }
                  
                  const deltaTemp = endPoint.dbTemp - startPoint.dbTemp;
                  const deltaHumidity = endPoint.humidity - startPoint.humidity;
                  const deltaEnthalpy = endPoint.enthalpy - startPoint.enthalpy;
                  
                  return (
                    <div key={process.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                      <div className="flex items-center mb-2">
                        <div 
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                          style={{ backgroundColor: process.processColor }}
                        ></div>
                        <h5 className="font-semibold text-gray-800 text-base truncate">
                          {process.type.charAt(0).toUpperCase() + process.type.slice(1)} Process
                        </h5>
                        <span className="ml-auto text-xs text-gray-600 whitespace-nowrap">
                          {startPoint.name} → {endPoint.name}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <div className="bg-red-50 p-2 rounded border border-red-200">
                          <div className="text-xs font-medium text-red-600 truncate">ΔTEMP</div>
                          <div className={`text-sm font-bold ${ deltaTemp > 0 ? 'text-red-600' : deltaTemp < 0 ? 'text-blue-600' : 'text-gray-700'}`}>
                            {deltaTemp >= 0 ? '+' : ''}{deltaTemp.toFixed(1)}°C
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <div className="text-xs font-medium text-blue-600 truncate">ΔHUMIDITY</div>
                          <div className={`text-sm font-bold ${ deltaHumidity > 0 ? 'text-blue-600' : deltaHumidity < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                            {deltaHumidity >= 0 ? '+' : ''}{deltaHumidity.toFixed(2)}
                          </div>
                          <div className="text-xs text-blue-600">g/kg</div>
                        </div>
                        
                        <div className="bg-orange-50 p-2 rounded border border-orange-200">
                          <div className="text-xs font-medium text-orange-600 truncate">ΔENTHALPY</div>
                          <div className={`text-sm font-bold text-orange-700`}>
                            {deltaEnthalpy >= 0 ? '+' : ''}{deltaEnthalpy.toFixed(1)}
                          </div>
                          <div className="text-xs text-orange-600">kJ/kg</div>
                        </div>
                        
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          {/* CHANGED: Display airflow in L/s instead of mass flow */}
                          <div className="text-xs font-medium text-green-600 truncate">AIRFLOW</div>
                          <div className="text-sm font-bold text-green-700">
                            {process.volumetricFlowRate?.toFixed(0) || '-'}
                          </div>
                          <div className="text-xs text-green-600">L/s</div>
                        </div>
                      </div>
                      
                      {process.energyChange !== undefined && (
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-2 rounded border border-gray-300">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-700">Energy Req.:</span>
                            <span className={`text-sm font-bold ${ process.energyChange >= 0 ? 'text-red-600' : 'text-blue-600' }`}>
                              {Math.abs(process.energyChange).toFixed(1)} kW
                              <span className="text-xs ml-1">
                                ({process.energyChange === 0 ? 'Neutral' : process.energyChange > 0 ? 'Heating' : 'Cooling'})
                              </span>
                            </span>
                          </div>
                          
                          <div className="mt-1 text-xs text-gray-600">
                            {process.type === 'cooling' && process.energyChange < 0 && (
                              <span>Equiv. {(Math.abs(process.energyChange) / 3.517).toFixed(1)} tons cooling</span>
                            )}
                             {process.type === 'heating' && process.energyChange > 0 && (
                              <span>Equiv. {(process.energyChange * 3412.14).toFixed(0)} BTU/hr heating</span>
                            )}
                            {process.type === 'humidification' && deltaHumidity > 0 && process.massFlowRate && (
                              <span>Water added: {(process.massFlowRate * deltaHumidity / 1000).toFixed(4)} kg/s</span>
                            )}
                            {process.type === 'dehumidification' && deltaHumidity < 0 && process.massFlowRate && (
                              <span>Water removed: {(process.massFlowRate * Math.abs(deltaHumidity) / 1000).toFixed(4)} kg/s</span>
                            )}
                          </div>
                          
                          {/* ADDED: Display mass flow rate for reference */}
                          {process.massFlowRate && (
                            <div className="mt-1 text-xs text-gray-500 border-t border-gray-200 pt-1">
                              Mass flow rate: {process.massFlowRate.toFixed(3)} kg/s (calc. from {process.volumetricFlowRate?.toFixed(0)} L/s)
                            </div>
                          )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-1.5">
                {[
                    {label: 'Points', key: 'showPoints'}, {label: 'RH Curves', key: 'showRHCurves'},
                    {label: 'WB Lines', key: 'showWBCurves'}, {label: 'Humidity Lines', key: 'showHumidityCurves'},
                    {label: 'Enthalpy Lines', key: 'showEnthalpyCurves'}, {label: 'DB Temp Lines', key: 'showDbTempLines'},
                    {label: 'Processes', key: 'showProcesses'}, {label: 'Highlight Sel.', key: 'highlightSelectedPoint'}
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1 text-xs text-gray-600">
                  <div className="flex items-center"><div className="w-3 h-0.5 bg-green-600 mr-1.5"></div>RH Curves (%)</div>
                  <div className="flex items-center"><div className="w-3 h-0.5 border-t border-dashed border-blue-600 mr-1.5"></div>WB Lines (°C)</div>
                  <div className="flex items-center"><div className="w-3 h-0.5 border-t border-dashed border-red-600 mr-1.5"></div>Enthalpy (kJ/kg)</div>
                  <div className="flex items-center"><div className="w-3 h-0.5 border-t border-dotted border-gray-500 mr-1.5"></div>Humidity (g/kg)</div>
                  <div className="flex items-center"><div className="w-3 h-0.5 border-t border-dotted border-gray-400 mr-1.5"></div>DB Temp (°C)</div>
                </div>
                 <p className="mt-1.5 text-xs text-gray-500">Hover for details. Click elements to select. Press Esc to close.</p>
              </div>
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Notes & Corrections Applied</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Psychrometric calculations now use ASHRAE 2017 standards with precise constants (0.621945 for humidity ratio, 287.042 J/(kg·K) for gas constant).</li>
          <li>Saturation vapor pressure uses different formulas for temperatures above/below 0°C as per ASHRAE standard.</li>
          <li>Wet bulb temperature calculation uses iterative method based on psychrometric equation (equation 33 from ASHRAE).</li>
          <li>Dry bulb temperature lines (vertical constant temperature lines) for better chart readability.</li>
          <li>Enthalpy line labeling repositioned and improved with better visibility and professional styling.</li>
          <li>Chart styling updated to match professional psychrometric charts with proper colors and line weights.</li>
          <li>Flow rate input changed from mass flow (kg/s) to volumetric flow (L/s) with automatic conversion to mass flow using specific volume.</li>
          <li>Barometric pressure adjusts automatically with altitude using International Standard Atmosphere model.</li>
          <li>Define points with any two independent parameters. All other properties are calculated automatically.</li>
          <li>Process energy calculations: Q = ṁ × Δh, where Q is in kW, ṁ in kg/s (converted from L/s), and h in kJ/kg.</li>
          <li>Specific volume includes correction factor (1 + 1.607858W) for moist air with precise constants.</li>
          <li>Valid input ranges: Temperature: -10 to 50°C, RH: 0-100%, Pressure: 10-110 kPa.</li>
          <li>Chart shows constant property lines: RH curves in green (100% saturation line is bold), WB lines in blue (dashed), enthalpy lines in red (dashed), and dry bulb temperature lines in gray (dotted).</li>
          <li>Volumetric flow rate (L/s) is converted to mass flow rate (kg/s) using: ṁ = V̇ ÷ v, where V̇ is in m³/s and v is specific volume in m³/kg.</li>
        </ul>
      </div>
        </div>
      </div>
    </CalculatorWrapper>
  );
};

export default PsychrometricChart;