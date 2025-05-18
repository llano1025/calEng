import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../../components/Icons';

interface PsychrometricChartProps {
  onShowTutorial?: () => void;
  onBack?: () => void;
}

// Define the psychrometric point interface
interface PsychrometricPoint {
  id: string;
  name: string;
  dbTemp: number; // Dry bulb temperature (°C)
  rh: number; // Relative humidity (%)
  // Calculated properties:
  wbTemp?: number; // Wet bulb temperature (°C)
  dewPoint?: number; // Dew point temperature (°C)
  humidity?: number; // Humidity ratio (g/kg dry air)
  enthalpy?: number; // Enthalpy (kJ/kg dry air)
  specificVolume?: number; // Specific volume (m³/kg dry air)
  vaporPressure?: number; // Partial vapor pressure (kPa)
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
  
  // State for psychrometric points
  const [points, setPoints] = useState<PsychrometricPoint[]>([
    {
      id: '1',
      name: 'Point 1',
      dbTemp: 25,
      rh: 50,
      color: POINT_COLORS[0],
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
  
  // State for chart visualization
  const [chartWidth, setChartWidth] = useState<number>(800);
  const [chartHeight, setChartHeight] = useState<number>(600);
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
      // Calculate humidity, enthalpy, wet bulb temp, etc.
      const properties = calculatePsychrometricProperties(point.dbTemp, point.rh, barometricPressure);
      return { ...point, ...properties };
    });
    
    setPoints(updatedPoints);
    
    // Calculate energy changes for processes
    if (updatedPoints.length > 1) {
      calculateProcessProperties(updatedPoints);
    }
  }, [points, barometricPressure]);
  
  // Calculate process properties
  const calculateProcessProperties = (updatedPoints: PsychrometricPoint[]) => {
    const updatedProcesses = processes.map(process => {
      const startPoint = updatedPoints.find(p => p.id === process.startPointId);
      const endPoint = updatedPoints.find(p => p.id === process.endPointId);
      
      if (!startPoint || !endPoint || !startPoint.enthalpy || !endPoint.enthalpy || 
          !startPoint.humidity || !endPoint.humidity) {
        return process;
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
  
  // Function to calculate psychrometric properties
  const calculatePsychrometricProperties = (dbTemp: number, rh: number, pressure: number) => {
    // Convert dry bulb temperature to Kelvin for some calculations
    const dbTempK = dbTemp + 273.15;
    
    // Saturation vapor pressure calculation (kPa)
    // Using Hyland and Wexler equation
    const satVaporPressure = calculateSaturationVaporPressure(dbTemp);
    
    // Actual vapor pressure (kPa)
    const vaporPressure = satVaporPressure * (rh / 100);
    
    // Humidity ratio (kg water / kg dry air)
    const humidityRatio = 0.622 * (vaporPressure / (pressure - vaporPressure));
    
    // Convert to g/kg for display
    const humidity = humidityRatio * 1000;
    
    // Specific volume calculation (m³/kg dry air)
    const specificVolume = (SPECIFIC_GAS_CONSTANT_DRY_AIR * dbTempK) / 
                          ((pressure - vaporPressure) * 1000) * 
                          (1 + 1.608 * humidityRatio);
    
    // Enthalpy calculation (kJ/kg dry air)
    const enthalpy = SPECIFIC_HEAT_CAPACITY_AIR * dbTemp + 
                    humidityRatio * (HEAT_VAPORIZATION_WATER + 1.86 * dbTemp);
    
    // Dew point calculation
    const dewPoint = calculateDewPoint(vaporPressure);
    
    // Wet bulb calculation (iterative process)
    const wbTemp = calculateWetBulbTemperature(dbTemp, humidityRatio, pressure);
    
    return {
      wbTemp,
      dewPoint,
      humidity,
      enthalpy,
      specificVolume,
      vaporPressure,
    };
  };
  
  // Function to calculate saturation vapor pressure (kPa)
  const calculateSaturationVaporPressure = (tempC: number) => {
    // Simplified method using Buck equation
    // Valid for -80 to 50°C
    const tempAdjust = 273.15 + tempC;
    
    if (tempC >= 0) {
      return 0.61121 * Math.exp((18.678 - tempC / 234.5) * (tempC / (257.14 + tempC)));
    } else {
      return 0.61115 * Math.exp((23.036 - tempC / 333.7) * (tempC / (279.82 + tempC)));
    }
  };
  
  // Function to calculate dew point temperature (°C)
  const calculateDewPoint = (vaporPressure: number) => {
    // Simplified calculation using Magnus-Tetens formula
    if (vaporPressure <= 0) return -999; // Invalid input
    
    const lnVP = Math.log(vaporPressure);
    
    // For vapor pressure > 0.61 kPa (approximate freezing point)
    if (vaporPressure > 0.61) {
      return (243.5 * lnVP - 440.8) / (19.48 - lnVP);
    } else {
      return (272.62 * lnVP - 622.61) / (22.5 - lnVP);
    }
  };
  
  // Function to calculate wet bulb temperature (°C)
  const calculateWetBulbTemperature = (dbTemp: number, humidityRatio: number, pressure: number) => {
    // This is an iterative solver for wet bulb temperature
    let wbGuess = dbTemp;
    let deltaT = 1.0;
    let wbPrev = wbGuess;
    let maxIterations = 100;
    let iterations = 0;
    
    // First guess - closer to dew point than dry bulb for higher RH
    if (humidityRatio > 0.01) { // Higher humidity
      wbGuess = dbTemp - 2.0;
    } else { // Lower humidity
      wbGuess = dbTemp - 8.0;
    }
    
    // Don't go below freezing for first guess
    wbGuess = Math.max(wbGuess, 0.5);
    
    while (Math.abs(deltaT) > 0.01 && iterations < maxIterations) {
      // Calculate saturation vapor pressure at wet bulb temp
      const wbSatVaporPressure = calculateSaturationVaporPressure(wbGuess);
      
      // Calculate humidity ratio at saturation for wet bulb temp (Carrier equation)
      const wbSatHumidityRatio = 0.622 * (wbSatVaporPressure / (pressure - wbSatVaporPressure));
      
      // Calculate humidity ratio using psychrometric equation
      const psychrometricConstant = 0.000662; // simplified constant
      const calculatedHumidityRatio = ((HEAT_VAPORIZATION_WATER - 1.86 * wbGuess) * wbSatHumidityRatio - 
                                      SPECIFIC_HEAT_CAPACITY_AIR * (dbTemp - wbGuess)) / 
                                      (HEAT_VAPORIZATION_WATER + 1.86 * dbTemp - 1.86 * wbGuess);
      
      // Calculate error and adjust wet bulb guess
      const error = humidityRatio - calculatedHumidityRatio;
      
      if (Math.abs(error) < 0.0001) break;
      
      // Use modified secant method for faster convergence
      if (iterations > 0) {
        const slope = error / (wbGuess - wbPrev);
        wbPrev = wbGuess;
        
        if (Math.abs(slope) < 0.0001) {
          // Prevent division by near-zero
          wbGuess += error > 0 ? 0.5 : -0.5;
        } else {
          wbGuess += error / slope;
        }
      } else {
        // For first iteration, use simpler step
        wbPrev = wbGuess;
        wbGuess += error > 0 ? 1.0 : -1.0;
      }
      
      // Ensure wet bulb is within reasonable range
      wbGuess = Math.max(Math.min(wbGuess, dbTemp), -50);
      
      iterations++;
      deltaT = wbGuess - wbPrev;
    }
    
    return wbGuess;
  };
  
  // Function to add a new psychrometric point
  const addPoint = () => {
    const newId = (points.length + 1).toString();
    const newPoint: PsychrometricPoint = {
      id: newId,
      name: `Point ${newId}`,
      dbTemp: 25,
      rh: 50,
      color: POINT_COLORS[(points.length) % POINT_COLORS.length],
    };
    
    setPoints([...points, newPoint]);
    setSelectedPointId(newId);
  };
  
  // Function to update a psychrometric point
  const updatePoint = (id: string, updates: Partial<PsychrometricPoint>) => {
    setPoints(
      points.map(point => 
        point.id === id ? { ...point, ...updates } : point
      )
    );
  };
  
  // Function to remove a psychrometric point
  const removePoint = (id: string) => {
    // Remove any processes that use this point
    setProcesses(processes.filter(
      process => process.startPointId !== id && process.endPointId !== id
    ));
    
    // Remove the point
    setPoints(points.filter(point => point.id !== id));
    
    // Update selected point if needed
    if (selectedPointId === id) {
      setSelectedPointId(points.length > 1 ? points[0].id : null);
    }
  };
  
  // Function to add a new process
  const addProcess = () => {
    if (!newProcessStartId || !newProcessEndId || newProcessStartId === newProcessEndId) {
      return;
    }
    
    const newId = (processes.length + 1).toString();
    const newProcess: Process = {
      id: newId,
      type: newProcessType,
      startPointId: newProcessStartId,
      endPointId: newProcessEndId,
      processColor: PROCESS_COLORS[processes.length % PROCESS_COLORS.length],
      massFlowRate: newProcessMassFlow,
    };
    
    // Add additional properties based on process type
    if (newProcessType === 'mixing') {
      newProcess.mixingRatio = newProcessMixingRatio;
    } else if (newProcessType === 'custom') {
      newProcess.sensibleHeatRatio = newProcessSHR;
    }
    
    setProcesses([...processes, newProcess]);
    setSelectedProcessId(newId);
    
    // Reset selection
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
    setProcesses(processes.filter(process => process.id !== id));
    
    // Update selected process if needed
    if (selectedProcessId === id) {
      setSelectedProcessId(processes.length > 1 ? processes[0].id : null);
    }
  };
  
  // Function to handle chart mouse move
  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - chartMargin.left;
    const y = e.clientY - rect.top - chartMargin.top;
    
    // Convert position to psychrometric values
    const chartContentWidth = chartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = chartHeight - chartMargin.top - chartMargin.bottom;
    
    const dbTemp = (x / chartContentWidth) * (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin) + CHART_CONFIG.tempMin;
    
    // Estimate RH (this is a simplification, as psychrometric chart isn't linear in RH)
    // Here, we're approximating the RH based on y position
    const rh = 100 - (y / chartContentHeight) * 100;
    
    // Calculate other properties for this point
    const properties = calculatePsychrometricProperties(dbTemp, rh, barometricPressure);
    
    setHoverInfo({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      dbTemp,
      rh,
      humidity: properties.humidity || 0,
      enthalpy: properties.enthalpy || 0,
    });
  };
  
  // Function to handle chart mouse leave
  const handleChartMouseLeave = () => {
    setHoverInfo(null);
  };
  
  // Function to handle chart click for adding points
  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || !addingPointViaChart) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - chartMargin.left;
    const y = e.clientY - rect.top - chartMargin.top;
    
    // Convert position to psychrometric values
    const chartContentWidth = chartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = chartHeight - chartMargin.top - chartMargin.bottom;
    
    const dbTemp = (x / chartContentWidth) * (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin) + CHART_CONFIG.tempMin;
    
    // Estimate RH (this is a simplification)
    const rh = 100 - (y / chartContentHeight) * 100;
    
    // Constrain values to reasonable ranges
    const constrainedDbTemp = Math.min(Math.max(dbTemp, CHART_CONFIG.tempMin), CHART_CONFIG.tempMax);
    const constrainedRH = Math.min(Math.max(rh, 1), 99);
    
    // Add the new point
    const newId = (points.length + 1).toString();
    const newPoint: PsychrometricPoint = {
      id: newId,
      name: `Point ${newId}`,
      dbTemp: Math.round(constrainedDbTemp * 10) / 10, // Round to 1 decimal
      rh: Math.round(constrainedRH),
      color: POINT_COLORS[(points.length) % POINT_COLORS.length],
    };
    
    setPoints([...points, newPoint]);
    setSelectedPointId(newId);
    
    // Exit adding point mode
    setAddingPointViaChart(false);
  };
  
  // Function to convert chart coordinates to SVG coordinates
  const tempToX = (temp: number) => {
    const chartContentWidth = chartWidth - chartMargin.left - chartMargin.right;
    return chartMargin.left + ((temp - CHART_CONFIG.tempMin) / (CHART_CONFIG.tempMax - CHART_CONFIG.tempMin)) * chartContentWidth;
  };
  
  const humidityToY = (humidity: number) => {
    const chartContentHeight = chartHeight - chartMargin.top - chartMargin.bottom;
    const maxHumidity = CHART_CONFIG.humidityCurves[CHART_CONFIG.humidityCurves.length - 1];
    return chartMargin.top + chartContentHeight - ((humidity / maxHumidity) * chartContentHeight);
  };
  
  const rhToY = (rh: number, temp: number) => {
    const props = calculatePsychrometricProperties(temp, rh, barometricPressure);
    return humidityToY(props.humidity || 0);
  };
  
  // Function to render chart axes and grid
  const renderChartAxes = () => {
    const chartContentWidth = chartWidth - chartMargin.left - chartMargin.right;
    const chartContentHeight = chartHeight - chartMargin.top - chartMargin.bottom;
    
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
          y={chartHeight - 10}
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
  const renderRHCurves = () => {
    if (!displayOptions.showRHCurves) return null;
    
    return (
      <g className="rh-curves">
        {CHART_CONFIG.rhCurves.map((rh, i) => {
          // Create path for RH curve
          let pathData = "";
          
          // Start at lowest temp
          const startTemp = CHART_CONFIG.tempMin;
          const startProps = calculatePsychrometricProperties(startTemp, rh, barometricPressure);
          pathData = `M ${tempToX(startTemp)} ${humidityToY(startProps.humidity || 0)}`;
          
          // Add points along the curve
          for (let t = startTemp + 1; t <= CHART_CONFIG.tempMax; t++) {
            const props = calculatePsychrometricProperties(t, rh, barometricPressure);
            pathData += ` L ${tempToX(t)} ${humidityToY(props.humidity || 0)}`;
          }
          
          return (
            <g key={`rh-${rh}`} className="rh-curve">
              <path
                d={pathData}
                stroke={rh === 100 ? "#0077cc" : "#a0d2ff"}
                strokeWidth={rh === 100 ? "1.5" : "1"}
                strokeDasharray={rh === 100 ? "none" : "3,2"}
                fill="none"
              />
              
              {/* RH Label */}
              {rh % 20 === 0 && (
                <text
                  x={tempToX(CHART_CONFIG.tempMax - 5)}
                  y={rhToY(rh, CHART_CONFIG.tempMax - 5) - 5}
                  fontSize="11"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {rh}% RH
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render wet bulb temperature curves
  const renderWBCurves = () => {
    if (!displayOptions.showWBCurves) return null;
    
    return (
      <g className="wb-curves">
        {CHART_CONFIG.wbCurves.map((wb) => {
          // Create path for wet bulb curve
          let pathData = "";
          let started = false;
          
          // Trace through temperatures and find points with this wet bulb
          for (let t = CHART_CONFIG.tempMin; t <= CHART_CONFIG.tempMax; t += 1) {
            // Try different RH values to find where WB matches
            for (let rh = 1; rh <= 100; rh += 2) {
              const props = calculatePsychrometricProperties(t, rh, barometricPressure);
              
              if (props.wbTemp && Math.abs(props.wbTemp - wb) < 0.3) {
                const x = tempToX(t);
                const y = humidityToY(props.humidity || 0);
                
                if (!started) {
                  pathData = `M ${x} ${y}`;
                  started = true;
                } else {
                  pathData += ` L ${x} ${y}`;
                }
                
                break; // Found a point, move to next temperature
              }
            }
          }
          
          return (
            <g key={`wb-${wb}`} className="wb-curve">
              <path
                d={pathData}
                stroke="#60a5fa"
                strokeWidth="1"
                strokeDasharray="5,3"
                fill="none"
              />
              
              {/* Wet Bulb Label */}
              <text
                x={tempToX(Math.min(wb + 1, CHART_CONFIG.tempMax))}
                y={rhToY(90, Math.min(wb + 1, CHART_CONFIG.tempMax))}
                fontSize="11"
                fill="#6b7280"
              >
                {wb}°C WB
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render enthalpy lines
  const renderEnthalpyLines = () => {
    if (!displayOptions.showEnthalpyCurves) return null;
    
    return (
      <g className="enthalpy-lines">
        {CHART_CONFIG.enthalpyCurves.map((enthalpy) => {
          // Create path for enthalpy line
          let pathData = "";
          let started = false;
          
          // Trace through temperatures and find points with this enthalpy
          for (let t = CHART_CONFIG.tempMin; t <= CHART_CONFIG.tempMax; t += 1) {
            // Try different RH values to find where enthalpy matches
            for (let rh = 1; rh <= 100; rh += 2) {
              const props = calculatePsychrometricProperties(t, rh, barometricPressure);
              
              if (props.enthalpy && Math.abs(props.enthalpy - enthalpy) < 1) {
                const x = tempToX(t);
                const y = humidityToY(props.humidity || 0);
                
                if (!started) {
                  pathData = `M ${x} ${y}`;
                  started = true;
                } else {
                  pathData += ` L ${x} ${y}`;
                }
                
                break; // Found a point, move to next temperature
              }
            }
          }
          
          return (
            <g key={`enthalpy-${enthalpy}`} className="enthalpy-line">
              <path
                d={pathData}
                stroke="#f97316"
                strokeWidth="1"
                strokeDasharray="8,4"
                fill="none"
              />
              
              {/* Enthalpy Label */}
              <text
                x={tempToX(CHART_CONFIG.tempMax - 2)}
                y={rhToY(20, CHART_CONFIG.tempMax - 2)}
                fontSize="11"
                fill="#f97316"
                textAnchor="end"
              >
                {enthalpy} kJ/kg
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render humidity curves
  const renderHumidityCurves = () => {
    if (!displayOptions.showHumidityCurves) return null;
    
    return (
      <g className="humidity-curves">
        {CHART_CONFIG.humidityCurves.map((humidity) => {
          return (
            <g key={`humidity-${humidity}`} className="humidity-curve">
              <line
                x1={tempToX(CHART_CONFIG.tempMin)}
                y1={humidityToY(humidity)}
                x2={tempToX(CHART_CONFIG.tempMax)}
                y2={humidityToY(humidity)}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              
              {/* Humidity Label */}
              <text
                x={tempToX(CHART_CONFIG.tempMin) - 5}
                y={humidityToY(humidity)}
                fontSize="11"
                fill="#6b7280"
                dominantBaseline="middle"
                textAnchor="end"
              >
                {humidity} g/kg
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  
  // Function to render points on the chart
  const renderPoints = () => {
    if (!displayOptions.showPoints) return null;
    
    return (
      <g className="points">
        {points.map((point) => {
          if (point.humidity === undefined) return null;
          
          const x = tempToX(point.dbTemp);
          const y = humidityToY(point.humidity);
          
          return (
            <g 
              key={`point-${point.id}`} 
              className={`point ${selectedPointId === point.id ? 'selected' : ''}`}
              onClick={() => setSelectedPointId(point.id)}
            >
              <circle
                cx={x}
                cy={y}
                r={selectedPointId === point.id && displayOptions.highlightSelectedPoint ? 8 : 6}
                fill={point.color}
                stroke={selectedPointId === point.id && displayOptions.highlightSelectedPoint ? "#000" : "#fff"}
                strokeWidth="2"
                cursor="pointer"
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
  const renderProcesses = () => {
    if (!displayOptions.showProcesses) return null;
    
    return (
      <g className="processes">
        {processes.map((process) => {
          const startPoint = points.find(p => p.id === process.startPointId);
          const endPoint = points.find(p => p.id === process.endPointId);
          
          if (!startPoint || !endPoint || 
              startPoint.humidity === undefined || endPoint.humidity === undefined) {
            return null;
          }
          
          const startX = tempToX(startPoint.dbTemp);
          const startY = humidityToY(startPoint.humidity);
          const endX = tempToX(endPoint.dbTemp);
          const endY = humidityToY(endPoint.humidity);
          
          let pathData = `M ${startX} ${startY} `;
          
          // Different rendering for different process types
          if (process.type === 'mixing') {
            pathData += `L ${endX} ${endY}`;
          } else if (process.type === 'custom' && process.sensibleHeatRatio !== undefined) {
            // For custom process, follow the SHR line (sensible heat ratio)
            const shr = process.sensibleHeatRatio;
            
            // Calculate total enthalpy change
            const totalEnthalpyChange = (endPoint.enthalpy || 0) - (startPoint.enthalpy || 0);
            
            // Calculate humidity change
            const humidityChange = endPoint.humidity - startPoint.humidity;
            
            // X direction is temperature change (sensible heat)
            // Y direction is humidity change (latent heat)
            pathData += `L ${endX} ${endY}`;
          } else {
            // For standard processes, use straight lines
            pathData += `L ${endX} ${endY}`;
          }
          
          return (
            <g 
              key={`process-${process.id}`} 
              className={`process ${selectedProcessId === process.id ? 'selected' : ''}`}
              onClick={() => setSelectedProcessId(process.id)}
            >
              <path
                d={pathData}
                stroke={process.processColor}
                strokeWidth={selectedProcessId === process.id ? "3" : "2"}
                fill="none"
                strokeDasharray={process.type === 'mixing' ? "5,3" : "none"}
                cursor="pointer"
              />
              
              {/* Process direction arrow */}
              <marker
                id={`arrow-${process.id}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,10 L10,5 Z" fill={process.processColor} />
              </marker>
              
              {/* Process label */}
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 10}
                fontSize="12"
                fontWeight={selectedProcessId === process.id ? "bold" : "normal"}
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
  const renderHoverInfo = () => {
    if (!hoverInfo || !hoverInfo.visible) return null;
    
    return (
      <g className="hover-info" pointerEvents="none">
        <rect
          x={hoverInfo.x + 10}
          y={hoverInfo.y + 10}
          width="160"
          height="90"
          fill="white"
          fillOpacity="0.9"
          stroke="#666"
          strokeWidth="1"
          rx="4"
          ry="4"
        />
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 30} fontSize="12" fill="#333">
          Dry Bulb: {hoverInfo.dbTemp.toFixed(1)}°C
        </text>
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 50} fontSize="12" fill="#333">
          RH: {hoverInfo.rh.toFixed(1)}%
        </text>
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 70} fontSize="12" fill="#333">
          Humidity: {hoverInfo.humidity.toFixed(1)} g/kg
        </text>
        <text x={hoverInfo.x + 20} y={hoverInfo.y + 90} fontSize="12" fill="#333">
          Enthalpy: {hoverInfo.enthalpy.toFixed(1)} kJ/kg
        </text>
      </g>
    );
  };
  
  // Function to reset chart zoom
  const resetChartZoom = () => {
    // Reset chart dimensions
    setChartWidth(800);
    setChartHeight(600);
    setChartMargin({top: 40, right: 40, bottom: 60, left: 60});
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Psychrometric Chart & Air Property Calculator</h2>
        <div className="flex space-x-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart Controls and Input Section */}
        <div className="lg:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          {/* System Parameters */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <h3 className="font-medium text-base mb-3 text-gray-700">System Parameters</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Altitude (m)</label>
                <input 
                  type="number" 
                  value={altitude} 
                  onChange={(e) => setAltitude(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  step="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barometric Pressure (kPa)</label>
                <input 
                  type="number" 
                  value={barometricPressure.toFixed(2)} 
                  disabled 
                  className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-600" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit System</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input 
                      type="radio" 
                      name="unitSystem" 
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
                      checked={unitSystem === 'IP'} 
                      onChange={() => setUnitSystem('IP')} 
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">IP (°F, gr/lb)</span>
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
                  {addingPointViaChart ? 'Cancel' : 'Add via Chart'}
                </button>
              </div>
            </div>
            
            {/* Selected Point Editor */}
            {selectedPointId && (
              <div className="mb-3">
                {points.map(point => {
                  if (point.id === selectedPointId) {
                    return (
                      <div key={point.id} className="bg-blue-50 p-3 rounded-md border border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: point.color }}
                            ></div>
                            <input 
                              type="text" 
                              value={point.name} 
                              onChange={(e) => updatePoint(point.id, { name: e.target.value })} 
                              className="font-medium text-gray-700 border-b border-dotted border-gray-300 bg-transparent focus:outline-none focus:border-blue-400 px-1"
                            />
                          </div>
                          <button 
                            onClick={() => removePoint(point.id)} 
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Dry Bulb Temp (°C)
                            </label>
                            <input 
                              type="number" 
                              value={point.dbTemp} 
                              onChange={(e) => updatePoint(point.id, { dbTemp: Number(e.target.value) })} 
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                              step="0.1"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Relative Humidity (%)
                            </label>
                            <input 
                              type="number" 
                              value={point.rh} 
                              onChange={(e) => updatePoint(point.id, { rh: Number(e.target.value) })} 
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                              min="0" 
                              max="100" 
                              step="1"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Wet Bulb Temp (°C)
                            </label>
                            <input 
                              type="number" 
                              value={point.wbTemp?.toFixed(1) || ''} 
                              disabled 
                              className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-600" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Dew Point (°C)
                            </label>
                            <input 
                              type="number" 
                              value={point.dewPoint?.toFixed(1) || ''} 
                              disabled 
                              className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-600" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Humidity Ratio (g/kg)
                            </label>
                            <input 
                              type="number" 
                              value={point.humidity?.toFixed(2) || ''} 
                              disabled 
                              className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-600" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Enthalpy (kJ/kg)
                            </label>
                            <input 
                              type="number" 
                              value={point.enthalpy?.toFixed(1) || ''} 
                              disabled 
                              className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-600" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Specific Volume (m³/kg)
                            </label>
                            <input 
                              type="number" 
                              value={point.specificVolume?.toFixed(3) || ''} 
                              disabled 
                              className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-600" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Vapor Pressure (kPa)
                            </label>
                            <input 
                              type="number" 
                              value={point.vaporPressure?.toFixed(3) || ''} 
                              disabled 
                              className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm text-gray-600" 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
            
            {/* Points List */}
            <div className="max-h-40 overflow-y-auto">
              {points.length > 0 ? (
                <ul className="space-y-1">
                  {points.map(point => (
                    <li 
                      key={point.id} 
                      className={`flex items-center p-2 rounded cursor-pointer ${
                        selectedPointId === point.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedPointId(point.id)}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: point.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700 mr-2">{point.name}</span>
                      <span className="text-xs text-gray-500">
                        {point.dbTemp.toFixed(1)}°C, {point.rh.toFixed(0)}% RH
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No points added yet.</p>
              )}
            </div>
          </div>
          
          {/* Processes Section */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-base text-gray-700">Air Processes</h3>
              <button 
                onClick={addProcess} 
                disabled={!newProcessStartId || !newProcessEndId || newProcessStartId === newProcessEndId}
                className={`bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium shadow-sm ${
                  (!newProcessStartId || !newProcessEndId || newProcessStartId === newProcessEndId) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                Add Process
              </button>
            </div>
            
            {/* Process Creation Controls */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Point</label>
                <select 
                  value={newProcessStartId} 
                  onChange={(e) => setNewProcessStartId(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select point...</option>
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
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select point...</option>
                  {points.map(point => (
                    <option key={`end-${point.id}`} value={point.id}>{point.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Process Type</label>
                <select 
                  value={newProcessType} 
                  onChange={(e) => setNewProcessType(e.target.value as Process['type'])} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="heating">Heating</option>
                  <option value="cooling">Cooling</option>
                  <option value="humidification">Humidification</option>
                  <option value="dehumidification">Dehumidification</option>
                  <option value="mixing">Mixing</option>
                  <option value="custom">Custom (SHR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mass Flow Rate (kg/s)</label>
                <input 
                  type="number" 
                  value={newProcessMassFlow} 
                  onChange={(e) => setNewProcessMassFlow(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                  step="0.1"
                  min="0.1"
                />
              </div>
              
              {/* Additional fields based on process type */}
              {newProcessType === 'mixing' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mixing Ratio ({(newProcessMixingRatio * 100).toFixed(0)}% of Start Point)
                  </label>
                  <input 
                    type="range" 
                    value={newProcessMixingRatio} 
                    onChange={(e) => setNewProcessMixingRatio(Number(e.target.value))} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
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
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
                    min="0" 
                    max="1" 
                    step="0.01"
                  />
                </div>
              )}
            </div>
            
            {/* Process List */}
            <div className="max-h-60 overflow-y-auto">
              {processes.length > 0 ? (
                <ul className="space-y-2">
                  {processes.map(process => {
                    const startPoint = points.find(p => p.id === process.startPointId);
                    const endPoint = points.find(p => p.id === process.endPointId);
                    if (!startPoint || !endPoint) return null;
                    
                    return (
                      <li 
                        key={process.id} 
                        className={`p-2 rounded border ${
                          selectedProcessId === process.id 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedProcessId(process.id)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: process.processColor }}
                            ></div>
                            <span className="text-sm font-semibold text-gray-700">
                              {process.type.charAt(0).toUpperCase() + process.type.slice(1)}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeProcess(process.id);
                            }} 
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{startPoint.name} → {endPoint.name}</span>
                          {process.energyChange !== undefined && (
                            <span className="font-medium">
                              Energy: {process.energyChange.toFixed(1)} kW
                              {Math.abs(process.energyChange) > 0 ? (
                                process.energyChange > 0 ? 
                                  ' (Heating)' : 
                                  ' (Cooling)'
                              ) : null}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No processes defined yet.</p>
              )}
            </div>
          </div>
          
          {/* Chart Controls */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <h3 className="font-medium text-base mb-2 text-gray-700">Chart Display Options</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={displayOptions.showRHCurves} 
                  onChange={(e) => setDisplayOptions({...displayOptions, showRHCurves: e.target.checked})} 
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">RH Curves</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={displayOptions.showWBCurves} 
                  onChange={(e) => setDisplayOptions({...displayOptions, showWBCurves: e.target.checked})} 
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Wet Bulb Lines</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={displayOptions.showHumidityCurves} 
                  onChange={(e) => setDisplayOptions({...displayOptions, showHumidityCurves: e.target.checked})} 
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Humidity Lines</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={displayOptions.showEnthalpyCurves} 
                  onChange={(e) => setDisplayOptions({...displayOptions, showEnthalpyCurves: e.target.checked})} 
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enthalpy Lines</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={displayOptions.showPoints} 
                  onChange={(e) => setDisplayOptions({...displayOptions, showPoints: e.target.checked})} 
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show Points</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={displayOptions.showProcesses} 
                  onChange={(e) => setDisplayOptions({...displayOptions, showProcesses: e.target.checked})} 
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show Processes</span>
              </label>
            </div>
            
            <div className="mt-2 flex justify-end">
              <button 
                onClick={resetChartZoom} 
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                Reset View
              </button>
            </div>
          </div>
        </div>
        
        {/* Chart and Results Section */}
        <div className="lg:col-span-3 space-y-4">
          {/* SVG Psychrometric Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <div className="min-w-[800px] min-h-[600px]">
              <svg
                ref={chartRef}
                width={chartWidth}
                height={chartHeight}
                className="psychrometric-chart"
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
                onClick={handleChartClick}
                style={{
                  cursor: addingPointViaChart ? 'crosshair' : 'default',
                  backgroundColor: "#f8fafc"
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
                
                {/* Adding Point Indicator */}
                {addingPointViaChart && (
                  <g className="adding-point-indicator" pointerEvents="none">
                    <rect
                      x={0}
                      y={0}
                      width={chartWidth}
                      height={40}
                      fill="rgba(0, 128, 0, 0.1)"
                    />
                    <text x={chartWidth / 2} y={25} textAnchor="middle" fill="#065f46" fontWeight="bold">
                      Click anywhere on the chart to add a new point
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
          
          {/* Calculation Results */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
            
            {/* Air Properties Summary */}
            <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
              <h4 className="font-medium text-base text-gray-700 mb-2">Air Properties Summary</h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left font-semibold text-gray-600 border border-gray-300">Point</th>
                      <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Dry Bulb (°C)</th>
                      <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">RH (%)</th>
                      <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Wet Bulb (°C)</th>
                      <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Dew Point (°C)</th>
                      <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Humidity (g/kg)</th>
                      <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Enthalpy (kJ/kg)</th>
                      <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Volume (m³/kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map(point => (
                      <tr key={point.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-700 border border-gray-300">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: point.color }}
                            ></div>
                            {point.name}
                          </div>
                        </td>
                        <td className="p-2 text-right text-gray-700 border border-gray-300">{point.dbTemp.toFixed(1)}</td>
                        <td className="p-2 text-right text-gray-700 border border-gray-300">{point.rh.toFixed(0)}</td>
                        <td className="p-2 text-right text-gray-700 border border-gray-300">{point.wbTemp?.toFixed(1) || '-'}</td>
                        <td className="p-2 text-right text-gray-700 border border-gray-300">{point.dewPoint?.toFixed(1) || '-'}</td>
                        <td className="p-2 text-right text-gray-700 border border-gray-300">{point.humidity?.toFixed(2) || '-'}</td>
                        <td className="p-2 text-right text-gray-700 border border-gray-300">{point.enthalpy?.toFixed(1) || '-'}</td>
                        <td className="p-2 text-right text-gray-700 border border-gray-300">{point.specificVolume?.toFixed(3) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Process Results */}
            {processes.length > 0 && (
              <div className="bg-white p-4 rounded-md shadow border border-gray-200">
                <h4 className="font-medium text-base text-gray-700 mb-2">Air Processes Analysis</h4>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left font-semibold text-gray-600 border border-gray-300">Process</th>
                        <th className="p-2 text-left font-semibold text-gray-600 border border-gray-300">From → To</th>
                        <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">ΔTemp (°C)</th>
                        <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">ΔHumidity (g/kg)</th>
                        <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">ΔEnthalpy (kJ/kg)</th>
                        <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Mass Flow (kg/s)</th>
                        <th className="p-2 text-right font-semibold text-gray-600 border border-gray-300">Energy (kW)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processes.map(process => {
                        const startPoint = points.find(p => p.id === process.startPointId);
                        const endPoint = points.find(p => p.id === process.endPointId);
                        
                        if (!startPoint || !endPoint || 
                            startPoint.enthalpy === undefined || endPoint.enthalpy === undefined ||
                            startPoint.humidity === undefined || endPoint.humidity === undefined) {
                          return null;
                        }
                        
                        const deltaTemp = endPoint.dbTemp - startPoint.dbTemp;
                        const deltaHumidity = endPoint.humidity - startPoint.humidity;
                        const deltaEnthalpy = endPoint.enthalpy - startPoint.enthalpy;
                        
                        return (
                          <tr key={process.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 font-medium text-gray-700 border border-gray-300">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: process.processColor }}
                                ></div>
                                {process.type.charAt(0).toUpperCase() + process.type.slice(1)}
                              </div>
                            </td>
                            <td className="p-2 text-gray-700 border border-gray-300">
                              {startPoint.name} → {endPoint.name}
                            </td>
                            <td className={`p-2 text-right border border-gray-300 ${
                              deltaTemp > 0 ? 'text-red-600' : deltaTemp < 0 ? 'text-blue-600' : 'text-gray-700'
                            }`}>
                              {deltaTemp.toFixed(1)}
                            </td>
                            <td className={`p-2 text-right border border-gray-300 ${
                              deltaHumidity > 0 ? 'text-blue-600' : deltaHumidity < 0 ? 'text-green-600' : 'text-gray-700'
                            }`}>
                              {deltaHumidity.toFixed(2)}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                              {deltaEnthalpy.toFixed(1)}
                            </td>
                            <td className="p-2 text-right text-gray-700 border border-gray-300">
                              {process.massFlowRate?.toFixed(2) || '-'}
                            </td>
                            <td className={`p-2 text-right font-medium border border-gray-300 ${
                              process.energyChange ? (
                                process.energyChange > 0 ? 'text-red-600' : 'text-blue-600'
                              ) : 'text-gray-700'
                            }`}>
                              {process.energyChange?.toFixed(1) || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Extra process details when selected */}
                {selectedProcessId && (
                  <div className="mt-4 bg-blue-50 p-3 rounded-md">
                    {processes.map(process => {
                      if (process.id !== selectedProcessId) return null;
                      
                      const startPoint = points.find(p => p.id === process.startPointId);
                      const endPoint = points.find(p => p.id === process.endPointId);
                      
                      if (!startPoint || !endPoint) return null;
                      
                      // Process-specific analysis based on type
                      let analysisText = '';
                      
                      if (process.type === 'heating' && process.energyChange) {
                        analysisText = `This heating process requires ${Math.abs(process.energyChange).toFixed(1)} kW of thermal energy.`;
                      } else if (process.type === 'cooling' && process.energyChange) {
                        const tons = Math.abs(process.energyChange) / 3.517;
                        analysisText = `This cooling process requires ${Math.abs(process.energyChange).toFixed(1)} kW (${tons.toFixed(1)} refrigeration tons) of cooling capacity.`;
                      } else if (process.type === 'humidification' && startPoint.humidity !== undefined && endPoint.humidity !== undefined) {
                        const waterRequired = process.massFlowRate ? 
                          process.massFlowRate * (endPoint.humidity - startPoint.humidity) / 1000 : 0;
                        analysisText = `This humidification process requires ${waterRequired.toFixed(4)} kg/s of water to be added.`;
                      } else if (process.type === 'dehumidification' && startPoint.humidity !== undefined && endPoint.humidity !== undefined) {
                        const waterRemoved = process.massFlowRate ? 
                          process.massFlowRate * (startPoint.humidity - endPoint.humidity) / 1000 : 0;
                        analysisText = `This dehumidification process removes ${waterRemoved.toFixed(4)} kg/s of water.`;
                      } else if (process.type === 'mixing' && process.mixingRatio !== undefined) {
                        analysisText = `This mixing process combines ${(process.mixingRatio * 100).toFixed(0)}% of ${startPoint.name} with ${(100 - process.mixingRatio * 100).toFixed(0)}% of ${endPoint.name}.`;
                      }
                      
                      return (
                        <div key={`analysis-${process.id}`}>
                          <h5 className="font-medium text-sm text-blue-800 mb-1">Process Analysis:</h5>
                          <p className="text-sm text-blue-700">{analysisText}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Psychrometric calculations are based on ASHRAE fundamentals and include temperature-dependent air properties.</li>
          <li>Barometric pressure affects all psychrometric properties and is automatically calculated based on altitude.</li>
          <li>For wet bulb temperature calculations, an iterative solver is used to ensure high accuracy.</li>
          <li>Add points by specifying dry bulb temperature and relative humidity, or by clicking directly on the chart.</li>
          <li>Process energy calculations assume steady-state conditions and require a valid mass flow rate.</li>
          <li>Chart visualization is approximate; hover over the chart for precise values at any point.</li>
        </ul>
      </div>
    </div>
  );
};

export default PsychrometricChart;