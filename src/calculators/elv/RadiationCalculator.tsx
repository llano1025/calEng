import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface RadiationCalculatorProps {
  onShowTutorial?: () => void;
}

interface RoomDimensions {
  length: number;  // meters
  width: number;   // meters
  height: number;  // meters
}

interface XRaySource {
  id: string;
  name: string;
  equipmentType: string;
  kVp: number;            // Peak kilovoltage
  mA: number;             // Tube current
  exposureTime: number;   // seconds (for single exposures) - currently informational
  workload: number;       // mA⋅min per week
  useFactorPercent: number; // Percentage of time beam is directed towards the barrier
  occupancyFactor: number; // Factor for area occupancy (T)
  positionX: number;      // meters from origin
  positionY: number;      // meters from origin
  positionZ: number;      // meters from origin (height)
  beamDirectionAngle: number; // degrees from positive X-axis
}

interface WallMaterial {
  id: string;                 // e.g., 'north', 'south' (unique key for the wall)
  label: string;              // e.g., 'North Wall', 'South Wall' (display label)
  selectedMaterialId: string; // e.g., 'concrete', 'lead' (ID from SHIELDING_MATERIALS)
  thickness: number;          // mm
  hvl: number;                // mm, stores the custom HVL if customHVL is true, or a reference HVL (e.g., for 100kVp) if false for display
  customHVL: boolean;         // true if user has manually set HVL
}

interface SurveyPoint {
  id: string;
  name: string;
  positionX: number;      // meters
  positionY: number;      // meters
  positionZ: number;      // meters (height)
  calculatedDose: number; // mGy/week
  isCompliant: boolean;   // whether below dose limit
}

// Predefined X-ray equipment types with typical parameters
const XRAY_EQUIPMENT_TYPES = [
  { id: 'general_xray', name: 'General Radiography (100 kVp)', defaultKVp: 100, outputConstant: 2.0 },
  { id: 'fluoroscopy', name: 'Fluoroscopy (110 kVp)', defaultKVp: 110, outputConstant: 2.2 },
  { id: 'ct_scanner', name: 'CT Scanner (120 kVp)', defaultKVp: 120, outputConstant: 2.4 },
  { id: 'mammography', name: 'Mammography (28 kVp)', defaultKVp: 28, outputConstant: 0.4 },
  { id: 'dental_intraoral', name: 'Dental Intraoral (70 kVp)', defaultKVp: 70, outputConstant: 1.2 },
  { id: 'dental_panoramic', name: 'Dental Panoramic (85 kVp)', defaultKVp: 85, outputConstant: 1.5 },
  { id: 'mobile_xray', name: 'Mobile X-ray (100 kVp)', defaultKVp: 100, outputConstant: 1.8 },
  { id: 'custom', name: 'Custom Equipment', defaultKVp: 100, outputConstant: 2.0 }
];

// Predefined material HVL values for different kVp ranges (mm Pb equivalent)
const SHIELDING_MATERIALS = [
  { id: 'concrete', name: 'Concrete', hvl_100kVp: 11.0, hvl_150kVp: 17.0 },
  { id: 'steel', name: 'Steel', hvl_100kVp: 3.2, hvl_150kVp: 5.0 },
  { id: 'lead', name: 'Lead', hvl_100kVp: 0.27, hvl_150kVp: 0.30 },
  { id: 'leadglass', name: 'Lead Glass', hvl_100kVp: 0.30, hvl_150kVp: 0.33 },
  { id: 'gypsum', name: 'Gypsum Board', hvl_100kVp: 28.0, hvl_150kVp: 42.0 },
  { id: 'brick', name: 'Brick', hvl_100kVp: 13.0, hvl_150kVp: 20.0 },
  { id: 'wood', name: 'Wood', hvl_100kVp: 50.0, hvl_150kVp: 75.0 },
  { id: 'custom', name: 'Custom Material', hvl_100kVp: 1.0, hvl_150kVp: 1.5 } // For custom material, these are default HVLs if selected
];

// Get HVL for material based on kVp (using materialId)
const getHVLForMaterial = (materialId: string, kVp: number): number => {
  const material = SHIELDING_MATERIALS.find(m => m.id === materialId);
  if (!material) return 1.0; // Fallback HVL

  // Use hvl_100kVp if kVp is at or below 100, or if hvl_150kVp is not defined (e.g. for custom material defaults)
  if (kVp <= 100 || material.hvl_150kVp === undefined) return material.hvl_100kVp;
  // Use hvl_150kVp if kVp is at or above 150
  if (kVp >= 150) return material.hvl_150kVp;
  
  // Linear interpolation for kVp between 100 and 150
  const hvl_100 = material.hvl_100kVp;
  const hvl_150 = material.hvl_150kVp;

  const ratio = (kVp - 100) / (150 - 100); // Denominator is 50
  return hvl_100 + ratio * (hvl_150 - hvl_100);
};


const RadiationShieldingCalculator: React.FC<RadiationCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'X-ray Shielding Calculator',
    discipline: 'elv',
    calculatorType: 'radiation-shielding'
  });

  // State for room dimensions
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>({
    length: 7.0,
    width: 4.0,
    height: 3.0
  });

  // State for X-ray sources
  const [sources, setSources] = useState<XRaySource[]>([
    {
      id: '1',
      name: 'Main X-ray Unit',
      equipmentType: 'general_xray',
      kVp: 100,
      mA: 400,
      exposureTime: 0.1,
      workload: 500,
      useFactorPercent: 25,
      occupancyFactor: 1.0,
      positionX: 2.5,
      positionY: 2.0,
      positionZ: 1.5,
      beamDirectionAngle: 0
    }
  ]);

  // State for wall materials (6 walls: North, South, East, West, Floor, Ceiling)
  const [wallMaterials, setWallMaterials] = useState<WallMaterial[]>([
    { id: 'north', label: 'North Wall', selectedMaterialId: 'concrete', thickness: 200, hvl: getHVLForMaterial('concrete', 100), customHVL: false },
    { id: 'south', label: 'South Wall', selectedMaterialId: 'concrete', thickness: 200, hvl: getHVLForMaterial('concrete', 100), customHVL: false },
    { id: 'east', label: 'East Wall', selectedMaterialId: 'concrete', thickness: 200, hvl: getHVLForMaterial('concrete', 100), customHVL: false },
    { id: 'west', label: 'West Wall', selectedMaterialId: 'concrete', thickness: 200, hvl: getHVLForMaterial('concrete', 100), customHVL: false },
    { id: 'floor', label: 'Floor', selectedMaterialId: 'concrete', thickness: 200, hvl: getHVLForMaterial('concrete', 100), customHVL: false },
    { id: 'ceiling', label: 'Ceiling', selectedMaterialId: 'concrete', thickness: 200, hvl: getHVLForMaterial('concrete', 100), customHVL: false }
  ]);

  // State for survey points
  const [surveyPoints, setSurveyPoints] = useState<SurveyPoint[]>([
    {
      id: '1',
      name: 'Point A',
      positionX: 7.5, // Outside West wall by default
      positionY: 4.0,
      positionZ: 1.5,
      calculatedDose: 0,
      isCompliant: true
    }
  ]);

  // State for dose limit
  const [doseLimit, setDoseLimit] = useState<number>(0.02); // mGy/week (equivalent to ~1 mSv/year)

  // State for calculation results
  const [maxDoseRate, setMaxDoseRate] = useState<number>(0);
  const [systemCompliant, setSystemCompliant] = useState<boolean>(true);

  // Calculate distance between two 3D points
  const calculateDistance = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
  };

  // Determine which wall the survey point is outside of
  const getShieldingMaterial = (surveyPoint: SurveyPoint): WallMaterial | null => {
    const { positionX, positionY, positionZ } = surveyPoint;
    const { length, width, height } = roomDimensions;

    if (positionX < 0) return wallMaterials.find(w => w.id === 'west') || null;
    if (positionX > length) return wallMaterials.find(w => w.id === 'east') || null;
    if (positionY < 0) return wallMaterials.find(w => w.id === 'south') || null;
    if (positionY > width) return wallMaterials.find(w => w.id === 'north') || null;
    if (positionZ < 0) return wallMaterials.find(w => w.id === 'floor') || null;
    if (positionZ > height) return wallMaterials.find(w => w.id === 'ceiling') || null;

    return null; // Point is inside the room
  };

  // Calculate dose rate at a survey point from all X-ray sources
  const calculateDoseAtPoint = (surveyPoint: SurveyPoint): number => {
    let totalDose = 0;

    sources.forEach(source => {
      const distance = calculateDistance(
        source.positionX, source.positionY, source.positionZ,
        surveyPoint.positionX, surveyPoint.positionY, surveyPoint.positionZ
      );

      if (distance === 0) {
        totalDose += Infinity; 
        return; 
      }

      const equipment = XRAY_EQUIPMENT_TYPES.find(e => e.id === source.equipmentType);
      const outputConstant = equipment?.outputConstant || 2.0; 

      const useFactorDecimal = source.useFactorPercent / 100;
      let doseRate = (outputConstant * source.workload * useFactorDecimal * source.occupancyFactor) / Math.pow(distance, 2);

      const shieldingMaterial = getShieldingMaterial(surveyPoint);
      if (shieldingMaterial) {
        let hvlToUse: number;
        if (shieldingMaterial.customHVL) {
          hvlToUse = shieldingMaterial.hvl;
        } else {
          hvlToUse = getHVLForMaterial(shieldingMaterial.selectedMaterialId, source.kVp);
        }
        
        if (hvlToUse <= 0) { 
           // No attenuation if HVL is invalid
        } else {
            const numberOfHVLs = shieldingMaterial.thickness / hvlToUse;
            const attenuationFactor = Math.pow(0.5, numberOfHVLs);
            doseRate *= attenuationFactor;
        }
      }
      totalDose += doseRate;
    });
    return totalDose;
  };

  useEffect(() => {
    const updatedSurveyPoints = surveyPoints.map(point => {
      const calculatedDose = calculateDoseAtPoint(point);
      const isCompliant = calculatedDose <= doseLimit;
      return { ...point, calculatedDose, isCompliant };
    });

    setSurveyPoints(updatedSurveyPoints);

    const maxDose = updatedSurveyPoints.length > 0 ? Math.max(...updatedSurveyPoints.map(p => p.calculatedDose)) : 0;
    const allCompliant = updatedSurveyPoints.every(p => p.isCompliant);

    setMaxDoseRate(maxDose);
    setSystemCompliant(allCompliant);
    
    // Save calculation and prepare export data
    const inputs = {
      roomDimensions,
      sources,
      wallMaterials,
      surveyPoints: surveyPoints.map(p => ({ id: p.id, name: p.name, positionX: p.positionX, positionY: p.positionY, positionZ: p.positionZ })),
      doseLimit
    };
    
    const results = {
      maxDoseRate: maxDose,
      systemCompliant: allCompliant,
      calculatedSurveyPoints: updatedSurveyPoints
    };
    
    saveCalculation(inputs, results);
    prepareExportData(inputs, results);
  }, [
    roomDimensions, 
    sources, 
    wallMaterials, 
    doseLimit,
    // This complex dependency string ensures re-calculation when individual point properties change.
    // It's a common pattern when dealing with arrays of objects in useEffect dependencies.
    surveyPoints.map(p => `${p.id}-${p.positionX}-${p.positionY}-${p.positionZ}-${p.name}`).join(','),
    // calculateDoseAtPoint is not memoized, its dependencies (sources, roomDimensions, wallMaterials, etc.) are listed.
  ]);

  const addSource = () => {
    const newSource: XRaySource = {
      id: Date.now().toString(),
      name: `X-ray Unit ${sources.length + 1}`,
      equipmentType: 'general_xray',
      kVp: XRAY_EQUIPMENT_TYPES.find(e=>e.id === 'general_xray')?.defaultKVp || 100,
      mA: 400, exposureTime: 0.1, workload: 500, useFactorPercent: 25, occupancyFactor: 1.0,
      positionX: roomDimensions.length / 2, positionY: roomDimensions.width / 2, positionZ: 1.5,
      beamDirectionAngle: 0
    };
    setSources([...sources, newSource]);
  };

  const removeSource = (id: string) => {
    if (sources.length > 1) {
      setSources(sources.filter(s => s.id !== id));
    }
  };

  const updateSource = (id: string, field: keyof XRaySource, value: any) => {
    setSources(prevSources => prevSources.map(source => {
      if (source.id === id) {
        const updatedSource = { ...source, [field]: value };
        if (field === 'equipmentType') {
          const equipment = XRAY_EQUIPMENT_TYPES.find(e => e.id === value);
          if (equipment) {
            updatedSource.kVp = equipment.defaultKVp;
          }
        }
        return updatedSource;
      }
      return source;
    }));
  };

  const addSurveyPoint = () => {
    const newPoint: SurveyPoint = {
      id: Date.now().toString(),
      name: `Point ${String.fromCharCode(65 + surveyPoints.length % 26)}${Math.floor(surveyPoints.length / 26) || ''}`,
      positionX: -0.5, positionY: roomDimensions.width / 2, positionZ: 1.5,
      calculatedDose: 0, isCompliant: true
    };
    setSurveyPoints([...surveyPoints, newPoint]);
  };

  const removeSurveyPoint = (id: string) => {
    if (surveyPoints.length > 1) {
      setSurveyPoints(surveyPoints.filter(p => p.id !== id));
    }
  };

  const updateSurveyPoint = (id: string, field: keyof SurveyPoint, value: any) => {
    setSurveyPoints(prevPoints => prevPoints.map(point => 
      point.id === id ? { ...point, [field]: value } : point
    ));
  };

  const updateWallMaterial = (wallId: string, field: keyof WallMaterial, value: any) => {
    setWallMaterials(prevWalls => prevWalls.map(wall => {
      if (wall.id === wallId) {
        const updatedWall = { ...wall, [field]: value };

        if (field === 'selectedMaterialId') {
          // Update display HVL to the material's 100kVp HVL
          updatedWall.hvl = getHVLForMaterial(value as string, 100); 
          updatedWall.customHVL = false; // Reset custom flag when material type changes
        } else if (field === 'hvl') { // User manually changed HVL value in the input
          updatedWall.customHVL = true; // Mark as custom
        }
        return updatedWall;
      }
      return wall;
    }));
  };

  const RoomIllustration = () => {
    const scale = 40; 
    const roomWidthSvg = roomDimensions.length * scale;
    const roomHeightSvg = roomDimensions.width * scale;
    const svgWidth = roomWidthSvg + 100;
    const svgHeight = roomHeightSvg + 100;
    const offsetX = 50;
    const offsetY = 50;

    return (
      <div className="mb-6">
        <h4 className="font-medium text-blue-800 mb-2 text-center">Room Layout (Top View)</h4>
        <div className="flex justify-center"> {/* Center the diagram container */}
          <div className="bg-white p-4 rounded-md border border-gray-200 inline-block"> {/* inline-block for shrink-to-fit */}
            <svg width={svgWidth} height={svgHeight} className="border border-gray-300">
              <rect
                x={offsetX} y={offsetY}
                width={roomWidthSvg} height={roomHeightSvg}
                fill="rgba(240, 248, 255, 0.3)" stroke="#4A90E2" strokeWidth="2"
              />
              <text x={offsetX + roomWidthSvg/2} y={offsetY - 10} textAnchor="middle" className="text-xs fill-gray-600">
                {roomDimensions.length}m (Length)
              </text>
              <text x={offsetX - 30} y={offsetY + roomHeightSvg/2} textAnchor="middle" className="text-xs fill-gray-600" transform={`rotate(-90, ${offsetX - 30}, ${offsetY + roomHeightSvg/2})`}>
                {roomDimensions.width}m (Width)
              </text>
              
              <text x={offsetX + roomWidthSvg/2} y={offsetY - 25} textAnchor="middle" className="text-xs fill-gray-800 font-medium">South</text>
              <text x={offsetX + roomWidthSvg/2} y={offsetY + roomHeightSvg + 20} textAnchor="middle" className="text-xs fill-gray-800 font-medium">North</text>
              <text x={offsetX - 45} y={offsetY + roomHeightSvg/2} textAnchor="middle" className="text-xs fill-gray-800 font-medium" transform={`rotate(-90, ${offsetX - 45}, ${offsetY + roomHeightSvg/2})`}>West</text>
              <text x={offsetX + roomWidthSvg + 20} y={offsetY + roomHeightSvg/2} textAnchor="middle" className="text-xs fill-gray-800 font-medium" transform={`rotate(90, ${offsetX + roomWidthSvg + 20}, ${offsetY + roomHeightSvg/2})`}>East</text>
              
              {sources.map((source) => {
                const x = offsetX + source.positionX * scale;
                const y = offsetY + source.positionY * scale;
                const beamLength = 30;
                const beamAngleRad = (source.beamDirectionAngle * Math.PI) / 180;
                const beamEndX = x + Math.cos(beamAngleRad) * beamLength;
                const beamEndY = y + Math.sin(beamAngleRad) * beamLength;
                
                return (
                  <g key={source.id}>
                    <line x1={x} y1={y} x2={beamEndX} y2={beamEndY} stroke="#FF6B35" strokeWidth="2" markerEnd="url(#arrowhead)"/>
                    <rect x={x - 8} y={y - 8} width="16" height="16" fill="#FF6B35" stroke="#D63031" strokeWidth="2" rx="2"/>
                    <text x={x} y={y - 12} textAnchor="middle" className="text-xs fill-gray-800 font-medium">{source.name}</text>
                    <text x={x} y={y + 25} textAnchor="middle" className="text-xs fill-gray-600">({source.positionX.toFixed(1)}, {source.positionY.toFixed(1)})</text>
                  </g>
                );
              })}
              
              {surveyPoints.map((point) => {
                const x = offsetX + point.positionX * scale;
                const y = offsetY + point.positionY * scale;
                const isOutsideRoom = getShieldingMaterial(point) !== null;
                
                return (
                  <g key={point.id}>
                    <circle cx={x} cy={y} r="6" fill={point.isCompliant ? "#00B894" : "#E17055"} stroke={point.isCompliant ? "#00A085" : "#D63031"} strokeWidth="2"/>
                    <text x={x} y={y - 12} textAnchor="middle" className="text-xs fill-gray-800 font-medium">{point.name}</text>
                    <text x={x} y={y + 20} textAnchor="middle" className="text-xs fill-gray-600">({point.positionX.toFixed(1)}, {point.positionY.toFixed(1)})</text>
                    {/* <text x={x} y={y + 32} textAnchor="middle" className="text-xs fill-gray-800">{(isFinite(point.calculatedDose) ? point.calculatedDose.toFixed(4) : "High")} mGy/wk</text> */}
                    {isOutsideRoom && (
                      <text x={x} y={y + 44} textAnchor="middle" className="text-xs fill-blue-600">Shielded</text>
                    )}
                  </g>
                );
              })}
              
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#FF6B35" />
                </marker>
              </defs>
            </svg>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center"><div className="w-4 h-4 bg-orange-500 border border-red-600 rounded mr-2"></div><span>X-ray Source</span></div>
              <div className="flex items-center"><div className="w-4 h-4 bg-green-500 border border-green-600 rounded-full mr-2"></div><span>Compliant Point</span></div>
              <div className="flex items-center"><div className="w-4 h-4 bg-red-500 border border-red-600 rounded-full mr-2"></div><span>Non-compliant</span></div>
              <div className="flex items-center"><svg width="20" height="10" className="mr-1"><line x1="0" y1="5" x2="15" y2="5" stroke="#FF6B35" strokeWidth="2" markerEnd="url(#arrowhead)"/></svg><span>Beam Direction</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <CalculatorWrapper
      title="X-ray Shielding Calculator"
      discipline="elv"
      calculatorType="radiation-shielding"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Room Configuration</h3>
          
          {/* Room Dimensions */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 text-gray-700">Room Dimensions</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                <input type="number" min="0.1" step="0.1" value={roomDimensions.length}
                  onChange={(e) => setRoomDimensions({...roomDimensions, length: Math.max(0.1, Number(e.target.value))})}
                  className="w-full p-2 border rounded-md"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (m)</label>
                <input type="number" min="0.1" step="0.1" value={roomDimensions.width}
                  onChange={(e) => setRoomDimensions({...roomDimensions, width: Math.max(0.1, Number(e.target.value))})}
                  className="w-full p-2 border rounded-md"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (m)</label>
                <input type="number" min="0.1" step="0.1" value={roomDimensions.height}
                  onChange={(e) => setRoomDimensions({...roomDimensions, height: Math.max(0.1, Number(e.target.value))})}
                  className="w-full p-2 border rounded-md"/>
              </div>
            </div>
          </div>
          
          {/* Dose Limit */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dose Limit (mGy/week)</label>
            <input type="number" min="0.001" step="0.001" value={doseLimit}
              onChange={(e) => setDoseLimit(Math.max(0.001, Number(e.target.value)))}
              className="w-full p-2 border rounded-md"/>
            <p className="text-xs text-gray-500 mt-1">Typical: 0.02 (public), 0.1 (controlled B), 0.4 (controlled A)</p>
          </div>

        {/* Survey Points - MOVED HERE */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-700">Survey Points</h4>
              <button onClick={addSurveyPoint} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Add Point</button>
            </div>
            {surveyPoints.map((point) => (
              <div key={point.id} className="mb-3 bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                   <input type="text" value={point.name} onChange={(e) => updateSurveyPoint(point.id, 'name', e.target.value)} className="font-medium text-gray-700 p-1 border rounded-md flex-grow mr-2"/>
                  {surveyPoints.length > 1 && (<button onClick={() => removeSurveyPoint(point.id)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">X (m)</label><input type="number" step="0.1" value={point.positionX} onChange={(e) => updateSurveyPoint(point.id, 'positionX', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm"/></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Y (m)</label><input type="number" step="0.1" value={point.positionY} onChange={(e) => updateSurveyPoint(point.id, 'positionY', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm"/></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Z (m)</label><input type="number" step="0.1" value={point.positionZ} onChange={(e) => updateSurveyPoint(point.id, 'positionZ', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm"/></div>
                </div>
              </div>
            ))}
          </div>

          {/* X-ray Equipment */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-700">X-ray Equipment</h4>
              <button onClick={addSource} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Add Equipment</button>
            </div>
            {sources.map((source) => (
              <div key={source.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <input type="text" value={source.name} onChange={(e) => updateSource(source.id, 'name', e.target.value)} className="font-medium text-gray-700 p-1 border rounded-md flex-grow mr-2"/>
                  {sources.length > 1 && ( <button onClick={() => removeSource(source.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>)}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                    <select value={source.equipmentType} onChange={(e) => updateSource(source.id, 'equipmentType', e.target.value)} className="w-full p-2 border rounded-md">
                      {XRAY_EQUIPMENT_TYPES.map(eq => (<option key={eq.id} value={eq.id}>{eq.name}</option>))}
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">kVp</label>
                    <input type="number" min="20" max="300" value={source.kVp} onChange={(e) => updateSource(source.id, 'kVp', Number(e.target.value))} className="w-full p-2 border rounded-md"/>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3"> {/* Changed to 1 column on small, 3 on md for mA and Workload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">mA</label>
                    <input type="number" min="1" value={source.mA} onChange={(e) => updateSource(source.id, 'mA', Number(e.target.value))} className="w-full p-2 border rounded-md"/>
                  </div>
                  <div className="md:col-span-2"> {/* Workload takes 2 columns on medium+ screens */}
                    <label className="block text-sm font-medium text-gray-700 mb-1">Workload (mA⋅min/wk)</label>
                    <input type="number" min="1" value={source.workload} onChange={(e) => updateSource(source.id, 'workload', Number(e.target.value))} className="w-full p-2 border rounded-md"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Use Factor (%)</label>
                    <input type="number" min="0" max="100" value={source.useFactorPercent} onChange={(e) => updateSource(source.id, 'useFactorPercent', Number(e.target.value))} className="w-full p-2 border rounded-md"/>
                    <p className="text-xs text-gray-500">Beam towards barrier</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupancy (T)</label>
                    <input type="number" min="0.01" max="1" step="0.01" value={source.occupancyFactor} onChange={(e) => updateSource(source.id, 'occupancyFactor', Number(e.target.value))} className="w-full p-2 border rounded-md"/>
                     <p className="text-xs text-gray-500">Area occupancy</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">X Pos (m)</label><input type="number" step="0.1" value={source.positionX} onChange={(e) => updateSource(source.id, 'positionX', Number(e.target.value))} className="w-full p-2 border rounded-md"/></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Y Pos (m)</label><input type="number" step="0.1" value={source.positionY} onChange={(e) => updateSource(source.id, 'positionY', Number(e.target.value))} className="w-full p-2 border rounded-md"/></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Z Pos (m)</label><input type="number" step="0.1" value={source.positionZ} onChange={(e) => updateSource(source.id, 'positionZ', Number(e.target.value))} className="w-full p-2 border rounded-md"/></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Beam Angle</label><input type="number" min="0" max="360" value={source.beamDirectionAngle} onChange={(e) => updateSource(source.id, 'beamDirectionAngle', Number(e.target.value))} className="w-full p-2 border rounded-md"/></div>
                </div>
              </div>
            ))}
          </div>

          {/* Wall Materials & Shielding */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 text-gray-700">Wall Materials & Shielding</h4>
            {wallMaterials.map((wall) => (
              <div key={wall.id} className="mb-3 bg-white p-3 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{wall.label}</label>
                    <select
                      value={wall.selectedMaterialId}
                      onChange={(e) => updateWallMaterial(wall.id, 'selectedMaterialId', e.target.value)}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      {SHIELDING_MATERIALS.map(material => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thickness (mm)</label>
                    <input type="number" min="0" step="0.1" value={wall.thickness}
                      onChange={(e) => updateWallMaterial(wall.id, 'thickness', Number(e.target.value))}
                      className="w-full p-2 border rounded-md text-sm"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HVL (mm) {wall.customHVL ? "(Custom)" : `(${getHVLForMaterial(wall.selectedMaterialId, 100).toFixed(2)})`}
                    </label>
                    <input type="number" min="0.1" step="0.1" value={wall.hvl}
                      onChange={(e) => updateWallMaterial(wall.id, 'hvl', Number(e.target.value))}
                      className="w-full p-2 border rounded-md text-sm"/>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          <RoomIllustration />
          <div className="mb-6">
            <h4 className="font-medium text-blue-800 mb-2">Overall Assessment</h4>
            <div className={`p-3 rounded-md ${systemCompliant ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
              <p className={`font-bold ${systemCompliant ? 'text-green-700' : 'text-red-700'}`}>
                {systemCompliant ? 'COMPLIANT ✓ All survey points below dose limit' : 'NON-COMPLIANT ✗ One or more survey points exceed dose limit'}
              </p>
              <p className="text-sm mt-1">Maximum dose rate: <strong>{isFinite(maxDoseRate) ? maxDoseRate.toFixed(4) : "Effectively Infinite"} mGy/week</strong></p>
              <p className="text-sm">Dose limit: <strong>{doseLimit.toFixed(3)} mGy/week</strong></p>
            </div>
          </div>
          <div className="mb-6">
            <h4 className="font-medium text-blue-800 mb-2">Survey Point Results</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-100"><th className="px-3 py-2 text-left">Point</th><th className="px-3 py-2 text-center">Position</th><th className="px-3 py-2 text-right">Dose (mGy/wk)</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">Shielding</th></tr>
                </thead>
                <tbody>
                  {surveyPoints.map((point) => {
                    const shielding = getShieldingMaterial(point);
                    const materialInfo = shielding ? SHIELDING_MATERIALS.find(m=>m.id === shielding.selectedMaterialId) : null;
                    return (
                      <tr key={point.id} className="border-t border-gray-200">
                        <td className="px-3 py-2 font-medium">{point.name}</td>
                        <td className="px-3 py-2 text-center">({point.positionX.toFixed(1)}, {point.positionY.toFixed(1)}, {point.positionZ.toFixed(1)})</td>
                        <td className={`px-3 py-2 text-right font-medium ${point.isCompliant ? 'text-green-600' : 'text-red-600'}`}>{isFinite(point.calculatedDose) ? point.calculatedDose.toFixed(4) : "High"}</td>
                        <td className={`px-3 py-2 text-center font-medium ${point.isCompliant ? 'text-green-600' : 'text-red-600'}`}>{point.isCompliant ? 'PASS ✓' : 'FAIL ✗'}</td>
                        <td className="px-3 py-2 text-center text-xs">{shielding && materialInfo ? `${materialInfo.name} (${shielding.thickness}mm)` : 'None (Inside)'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mb-6">
            <h4 className="font-medium text-blue-800 mb-2">X-ray Equipment Summary</h4>
             <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-100"><th className="px-3 py-2 text-left">Equipment</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">kVp</th><th className="px-3 py-2 text-right">Workload</th><th className="px-3 py-2 text-right">Use%</th><th className="px-3 py-2 text-center">Position</th></tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-t border-gray-200">
                      <td className="px-3 py-2 font-medium">{source.name}</td>
                      <td className="px-3 py-2">{XRAY_EQUIPMENT_TYPES.find(e => e.id === source.equipmentType)?.name || source.equipmentType}</td>
                      <td className="px-3 py-2 text-right">{source.kVp}</td>
                      <td className="px-3 py-2 text-right">{source.workload} mA⋅min/wk</td>
                      <td className="px-3 py-2 text-right">{source.useFactorPercent}%</td>
                      <td className="px-3 py-2 text-center">({source.positionX.toFixed(1)}, {source.positionY.toFixed(1)}, {source.positionZ.toFixed(1)})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!systemCompliant && (
            <div className="mt-6 bg-yellow-50 p-3 rounded-md border border-yellow-300">
              <h4 className="font-medium text-yellow-800 mb-2">Recommendations for Non-Compliant Areas</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                <li>Increase shielding thickness or use higher attenuation material (e.g., lead) for relevant barriers.</li>
                <li>Optimize equipment positioning or beam direction to reduce dose to occupied areas.</li>
                <li>Review and potentially reduce workload (mA⋅min/week) or adjust use factors.</li>
                <li>Restrict access or reduce occupancy factor (T) for high-dose areas if feasible.</li>
                <li>Verify HVL data for selected materials and kVp ranges, consult manufacturer specs.</li>
              </ul>
            </div>
          )}
          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Calculation Notes</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Results update automatically on input change.</li>
              <li>Dose Formula: (Output × Workload × Use Factor × Occupancy) / Distance².</li>
              <li>Attenuation: (0.5)^(Thickness / HVL). HVL is specific to material and kVp.</li>
              <li>HVL: Half Value Layer reduces radiation by 50%.</li>
              <li>Points inside room: No wall shielding applied. Points outside: Shielded by the nearest wall.</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </CalculatorWrapper>
  );
};

export default RadiationShieldingCalculator;