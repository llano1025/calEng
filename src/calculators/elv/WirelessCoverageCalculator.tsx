import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icons } from '../../components/Icons';

interface WirelessCoverageCalculatorProps {
  onShowTutorial?: () => void;
}

// Define wireless technology specifications
const WIRELESS_TECHNOLOGIES = {
  wifi: {
    name: 'Wi-Fi (802.11)',
    frequencies: [
      { band: '2.4GHz', frequency: 2400, maxRange: 100, txPower: 20 },
      { band: '5GHz', frequency: 5000, maxRange: 50, txPower: 23 },
      { band: '6GHz', frequency: 6000, maxRange: 30, txPower: 24 }
    ],
    minRSSI: -70,
    typicalTxPower: 20
  },
  bluetooth: {
    name: 'Bluetooth',
    frequencies: [
      { band: '2.4GHz', frequency: 2400, maxRange: 10, txPower: 4 }
    ],
    minRSSI: -80,
    typicalTxPower: 4
  },
  lora: {
    name: 'LoRa',
    frequencies: [
      { band: '868MHz', frequency: 868, maxRange: 2000, txPower: 14 },
      { band: '915MHz', frequency: 915, maxRange: 2000, txPower: 14 }
    ],
    minRSSI: -120,
    typicalTxPower: 14
  },
  zigbee: {
    name: 'Zigbee',
    frequencies: [
      { band: '2.4GHz', frequency: 2400, maxRange: 20, txPower: 10 }
    ],
    minRSSI: -85,
    typicalTxPower: 10
  }
};

// Wall material attenuation factors (dB)
const WALL_MATERIALS = [
  { id: 'drywall', name: 'Drywall', attenuation: 3 },
  { id: 'concrete', name: 'Concrete Block', attenuation: 8 },
  { id: 'reinforced_concrete', name: 'Reinforced Concrete', attenuation: 12 },
  { id: 'brick', name: 'Brick Wall', attenuation: 6 },
  { id: 'glass', name: 'Glass Window', attenuation: 2 },
  { id: 'metal', name: 'Metal/Steel', attenuation: 20 },
  { id: 'wood', name: 'Wood Door', attenuation: 4 }
];

// Interface for obstacle definition with 2D positioning
interface Obstacle {
  id: string;
  name: string;
  material: string;
  x: number;         // X position in meters
  y: number;         // Y position in meters  
  width: number;     // Width in meters
  height: number;    // Height in meters
  floorLevel: number; // Which floor (0 = ground floor)
}

// Interface for access point placement
interface AccessPoint {
  id: string;
  x: number;
  y: number;
  z: number;         // Height (floor level * floor height + AP height)
  floorLevel: number; // Which floor this AP is on
  coverageRadius: number;
  technology: string;
  frequency: number;
}

const WirelessCoverageCalculator: React.FC<WirelessCoverageCalculatorProps> = ({ onShowTutorial }) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'wifi' | 'bluetooth' | 'lora' | 'zigbee'>('wifi');
  
  // State for building parameters
  const [buildingLength, setBuildingLength] = useState<number>(50); // meters
  const [buildingWidth, setBuildingWidth] = useState<number>(30); // meters
  const [buildingHeight, setBuildingHeight] = useState<number>(3); // meters
  const [numberOfFloors, setNumberOfFloors] = useState<number>(1);
  
  // State for wireless parameters
  const [selectedFrequency, setSelectedFrequency] = useState<number>(2400);
  const [txPower, setTxPower] = useState<number>(20); // dBm
  const [targetRSSI, setTargetRSSI] = useState<number>(-70); // dBm
  const [userDensity, setUserDensity] = useState<number>(10); // users per 100m²
  const [safetyMargin, setSafetyMargin] = useState<number>(10); // dB
  
  // State for obstacles with 2D positioning
  const [obstacles, setObstacles] = useState<Obstacle[]>([
    { 
      id: '1', 
      name: 'Interior Wall 1', 
      material: 'drywall', 
      x: 15, 
      y: 5, 
      width: 20, 
      height: 0.2, 
      floorLevel: 0 
    }
  ]);
  
  // State for calculation results
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [pathLoss, setPathLoss] = useState<number>(0);
  const [maxCoverageRadius, setMaxCoverageRadius] = useState<number>(0);
  const [recommendedAPs, setRecommendedAPs] = useState<number>(0);
  const [totalCoverageArea, setTotalCoverageArea] = useState<number>(0);
  const [apPlacements, setApPlacements] = useState<AccessPoint[]>([]);
  const [linkBudget, setLinkBudget] = useState<number>(0);
  
  // State for heatmap visualization
  const [heatmapView, setHeatmapView] = useState<'horizontal' | 'vertical'>('horizontal');
  const [verticalSlicePosition, setVerticalSlicePosition] = useState<number>(50); // Percentage across building width
  const [interFloorAttenuation, setInterFloorAttenuation] = useState<number>(15); // dB per floor
  const [apHeight, setApHeight] = useState<number>(2.7); // meters - typical ceiling mount height
  
  // Memoize current technology
  const currentTechnology = useMemo(() => WIRELESS_TECHNOLOGIES[activeTab], [activeTab]);
  
  // Update default values when technology changes
  useEffect(() => {
    const defaultFreq = currentTechnology.frequencies[0];
    
    setSelectedFrequency(defaultFreq.frequency);
    setTxPower(currentTechnology.typicalTxPower);
    setTargetRSSI(currentTechnology.minRSSI);
  }, [currentTechnology]);
  
  // Calculate coverage when parameters change
  useEffect(() => {
    calculateCoverage();
  }, [
    buildingLength, buildingWidth, buildingHeight, numberOfFloors,
    selectedFrequency, txPower, targetRSSI, userDensity, safetyMargin,
    obstacles, activeTab, apHeight, interFloorAttenuation
  ]);
  
  const calculateCoverage = () => {
    // Calculate link budget (simplified since obstacles are now handled per-ray)
    const budget = txPower - targetRSSI - safetyMargin;
    setLinkBudget(budget);
    
    // Free space path loss formula: FSPL = 20*log10(d) + 20*log10(f) + 32.45
    // Solve for distance: d = 10^((FSPL - 20*log10(f) - 32.45) / 20)
    const availablePathLoss = budget; // No global obstacle attenuation in new model
    const frequencyGHz = selectedFrequency / 1000;
    const maxDistance = Math.pow(10, (availablePathLoss - 20 * Math.log10(frequencyGHz) - 32.45) / 20);
    
    setPathLoss(availablePathLoss);
    setMaxCoverageRadius(Math.max(0, maxDistance));
    
    // Calculate building area
    const buildingArea = buildingLength * buildingWidth * numberOfFloors;
    setTotalCoverageArea(buildingArea);
    
    // Calculate coverage area per AP (circular)
    const coverageAreaPerAP = Math.PI * Math.pow(maxDistance, 2);
    
    // Calculate number of APs needed with 20% overlap for reliability
    const effectiveCoveragePerAP = coverageAreaPerAP * 0.8;
    const requiredAPs = Math.ceil(buildingArea / effectiveCoveragePerAP);
    
    setRecommendedAPs(Math.max(1, requiredAPs));
    
    // Generate AP placement suggestions
    generateAPPlacements(requiredAPs, maxDistance);
    
    setCalculationPerformed(true);
  };
  
  const generateAPPlacements = (numAPs: number, radius: number) => {
    const placements: AccessPoint[] = [];
    
    // Calculate APs needed per floor
    const buildingArea = buildingLength * buildingWidth;
    const coverageAreaPerAP = Math.PI * Math.pow(radius, 2) * 0.8; // 20% overlap
    const apsPerFloor = Math.max(1, Math.ceil(buildingArea / coverageAreaPerAP));
    
    // Distribute APs across floors
    for (let floor = 0; floor < numberOfFloors; floor++) {
      const floorAPCount = Math.ceil(numAPs / numberOfFloors);
      
      if (floorAPCount === 1) {
        // Single AP in center of floor
        placements.push({
          id: `${floor + 1}-1`,
          x: buildingLength / 2,
          y: buildingWidth / 2,
          z: floor * buildingHeight + apHeight,
          floorLevel: floor,
          coverageRadius: radius,
          technology: activeTab,
          frequency: selectedFrequency
        });
      } else {
        // Grid-based placement for this floor
        const cols = Math.ceil(Math.sqrt(floorAPCount * buildingLength / buildingWidth));
        const rows = Math.ceil(floorAPCount / cols);
        
        const spacingX = buildingLength / cols;
        const spacingY = buildingWidth / rows;
        
        for (let i = 0; i < floorAPCount && placements.length < numAPs; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          
          placements.push({
            id: `${floor + 1}-${i + 1}`,
            x: spacingX * (col + 0.5),
            y: spacingY * (row + 0.5),
            z: floor * buildingHeight + apHeight,
            floorLevel: floor,
            coverageRadius: radius,
            technology: activeTab,
            frequency: selectedFrequency
          });
        }
      }
    }
    
    setApPlacements(placements.slice(0, numAPs)); // Ensure we don't exceed the calculated number
  };
  
  const addObstacle = () => {
    const newObstacle: Obstacle = {
      id: Date.now().toString(),
      name: `Wall ${obstacles.length + 1}`,
      material: 'drywall',
      x: Math.random() * buildingLength * 0.8 + buildingLength * 0.1, // Random position within building
      y: Math.random() * buildingWidth * 0.8 + buildingWidth * 0.1,
      width: 5, // Default 5m width
      height: 0.2, // Default 20cm thickness
      floorLevel: 0 // Ground floor
    };
    setObstacles([...obstacles, newObstacle]);
  };
  
  const removeObstacle = (id: string) => {
    if (obstacles.length > 1) {
      setObstacles(obstacles.filter(obstacle => obstacle.id !== id));
    }
  };
  
  const updateObstacle = (id: string, field: keyof Obstacle, value: any) => {
    setObstacles(obstacles.map(obstacle => 
      obstacle.id === id ? { ...obstacle, [field]: value } : obstacle
    ));
  };
  
  const resetCalculation = () => {
    setCalculationPerformed(false);
  };
  
  const getCurrentTechnology = () => currentTechnology;

  // Helper function for ray-rectangle intersection
  const rayIntersectsRectangle = (rayStart: {x: number, y: number}, rayEnd: {x: number, y: number}, rect: {minX: number, maxX: number, minY: number, maxY: number}): boolean => {
    // Simplified line-rectangle intersection
    const lineIntersectsLine = (p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}, p4: {x: number, y: number}): boolean => {
      const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
      if (Math.abs(denom) < 1e-10) return false;
      
      const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
      const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;
      
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };
    
    // Check intersection with all four edges of rectangle
    const corners = [
      { x: rect.minX, y: rect.minY }, { x: rect.maxX, y: rect.minY },
      { x: rect.maxX, y: rect.maxY }, { x: rect.minX, y: rect.maxY }
    ];
    
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      if (lineIntersectsLine(rayStart, rayEnd, corners[i], corners[j])) {
        return true;
      }
    }
    
    return false;
  };

  // Calculate signal strength at a specific point (x, y, z) with ray-casting for obstacles
  const calculateSignalStrength = useCallback((x: number, y: number, aps: AccessPoint[], z: number = 0): number => {
    let maxSignalStrength = -150; // Very weak signal as baseline
    
    aps.forEach(ap => {
      // Calculate 3D distance
      const distance3D = Math.sqrt(Math.pow(x - ap.x, 2) + Math.pow(y - ap.y, 2) + Math.pow(z - ap.z, 2));
      
      if (distance3D === 0) {
        maxSignalStrength = Math.max(maxSignalStrength, txPower);
        return;
      }
      
      // Free space path loss calculation using 3D distance
      const frequencyGHz = selectedFrequency / 1000;
      const fspl = 20 * Math.log10(distance3D) + 20 * Math.log10(frequencyGHz) + 32.45;
      
      // Calculate floor penetration loss for vertical propagation
      const currentFloor = Math.floor(z / buildingHeight);
      const apFloor = ap.floorLevel;
      const floorDifference = Math.abs(currentFloor - apFloor);
      const floorPenetrationLoss = floorDifference * interFloorAttenuation;
      
      // Ray-casting for obstacle attenuation
      let obstacleAttenuation = 0;
      
      // Check intersection with obstacles on the same floor
      const relevantObstacles = obstacles.filter(obs => obs.floorLevel === currentFloor || obs.floorLevel === apFloor);
      
      relevantObstacles.forEach(obstacle => {
        // Simple rectangular obstacle intersection check
        const obstacleMinX = obstacle.x;
        const obstacleMaxX = obstacle.x + obstacle.width;
        const obstacleMinY = obstacle.y;
        const obstacleMaxY = obstacle.y + obstacle.height;
        
        // Check if ray intersects with obstacle rectangle
        if (rayIntersectsRectangle(
          { x: ap.x, y: ap.y },
          { x, y },
          { minX: obstacleMinX, maxX: obstacleMaxX, minY: obstacleMinY, maxY: obstacleMaxY }
        )) {
          const material = WALL_MATERIALS.find(m => m.id === obstacle.material);
          if (material) {
            obstacleAttenuation += material.attenuation;
          }
        }
      });
      
      // Signal strength = TX Power - Path Loss - Obstacle Attenuation - Floor Penetration Loss
      const signalStrength = txPower - fspl - obstacleAttenuation - floorPenetrationLoss;
      maxSignalStrength = Math.max(maxSignalStrength, signalStrength);
    });
    
    return maxSignalStrength;
  }, [txPower, selectedFrequency, obstacles, buildingHeight, interFloorAttenuation]);
  
  // Get color based on signal strength - memoized with useCallback
  const getSignalColor = useCallback((strength: number): string => {
    if (strength >= targetRSSI + 10) return '#22c55e'; // Excellent (Green)
    if (strength >= targetRSSI) return '#84cc16'; // Good (Light Green)
    if (strength >= targetRSSI - 10) return '#eab308'; // Fair (Yellow)
    if (strength >= targetRSSI - 20) return '#f97316'; // Poor (Orange)
    return '#ef4444'; // Very Poor (Red)
  }, [targetRSSI]);
  
  // Memoize heatmap data generation
  const heatmapGridData = useMemo(() => {
    if (!calculationPerformed || apPlacements.length === 0) return [];
    
    const gridResolution = 50; // Number of points along each axis
    const stepX = buildingLength / gridResolution;
    const stepY = buildingWidth / gridResolution;
    const heatmapData = [];
    
    for (let i = 0; i <= gridResolution; i++) {
      const row = [];
      for (let j = 0; j <= gridResolution; j++) {
        const x = i * stepX;
        const y = j * stepY;
        const signalStrength = calculateSignalStrength(x, y, apPlacements, 0); // Ground level (z=0)
        row.push({
          x,
          y,
          strength: signalStrength,
          color: getSignalColor(signalStrength)
        });
      }
      heatmapData.push(row);
    }
    
    return heatmapData;
  }, [
    calculationPerformed,
    buildingLength,
    buildingWidth,
    apPlacements,
    calculateSignalStrength,
    getSignalColor
  ]);
  
  // Memoize vertical heatmap data generation
  const verticalHeatmapData = useMemo(() => {
    if (!calculationPerformed || apPlacements.length === 0) return [];
    
    const gridResolution = 50;
    const stepX = buildingLength / gridResolution;
    const totalHeight = buildingHeight * numberOfFloors;
    const stepZ = totalHeight / gridResolution;
    const sliceY = (verticalSlicePosition / 100) * buildingWidth; // Convert percentage to actual Y coordinate
    const verticalData = [];
    
    for (let i = 0; i <= gridResolution; i++) { // X direction
      const row = [];
      for (let k = 0; k <= gridResolution; k++) { // Z direction (height)
        const x = i * stepX;
        const z = k * stepZ;
        const signalStrength = calculateSignalStrength(x, sliceY, apPlacements, z);
        row.push({
          x,
          z,
          strength: signalStrength,
          color: getSignalColor(signalStrength)
        });
      }
      verticalData.push(row);
    }
    
    return verticalData;
  }, [
    calculationPerformed,
    buildingLength,
    buildingWidth,
    buildingHeight,
    numberOfFloors,
    verticalSlicePosition,
    apPlacements,
    calculateSignalStrength,
    getSignalColor
  ]);
  
  // Memoize SVG elements for horizontal heatmap
  const heatmapSvgElements = useMemo(() => {
    if (!calculationPerformed || heatmapGridData.length === 0) return null;

    const elements = [];
    const gridResolution = 50;
    const stepX = buildingLength / gridResolution;
    const stepY = buildingWidth / gridResolution;
    const cellWidthSVG = stepX * 10;
    const cellHeightSVG = stepY * 10;

    // Draw heatmap cells
    heatmapGridData.forEach((row, i) => {
      row.forEach((cell, j) => {
        elements.push(
          <rect
            key={`cell-${i}-${j}`}
            x={cell.x * 10}
            y={cell.y * 10}
            width={cellWidthSVG}
            height={cellHeightSVG}
            fill={cell.color}
            opacity="0.7"
          />
        );
      });
    });

    // Draw AP positions
    apPlacements.forEach((ap) => {
      elements.push(
        <g key={`ap-${ap.id}`}>
          {/* AP coverage circle */}
          <circle
            cx={ap.x * 10}
            cy={ap.y * 10}
            r={ap.coverageRadius * 10}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.5"
          />
          {/* AP marker */}
          <circle
            cx={ap.x * 10}
            cy={ap.y * 10}
            r="8"
            fill="#1d4ed8"
            stroke="white"
            strokeWidth="2"
          />
          {/* AP label */}
          <text
            x={ap.x * 10}
            y={ap.y * 10 + 3}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontWeight="bold"
          >
            {ap.id}
          </text>
        </g>
      );
    });

    // Draw obstacles on the current floor
    obstacles.filter(obs => obs.floorLevel === 0).forEach((obstacle) => {
      elements.push(
        <rect
          key={`obstacle-${obstacle.id}`}
          x={obstacle.x * 10}
          y={obstacle.y * 10}
          width={obstacle.width * 10}
          height={obstacle.height * 10}
          fill="rgba(139, 69, 19, 0.6)" // Brown semi-transparent
          stroke="#8B4513"
          strokeWidth="2"
        />
      );
      
      // Obstacle label
      elements.push(
        <text
          key={`obstacle-label-${obstacle.id}`}
          x={obstacle.x * 10 + (obstacle.width * 10) / 2}
          y={obstacle.y * 10 + (obstacle.height * 10) / 2}
          textAnchor="middle"
          fontSize="8"
          fill="white"
          fontWeight="bold"
        >
          {obstacle.name.substring(0, 8)}
        </text>
      );
    });

    // Draw building outline
    elements.push(
      <rect
        key="building-outline"
        x="0"
        y="0"
        width={buildingLength * 10}
        height={buildingWidth * 10}
        fill="none"
        stroke="#374151"
        strokeWidth="3"
      />
    );

    return elements;
  }, [calculationPerformed, heatmapGridData, apPlacements, buildingLength, buildingWidth, obstacles]);
  
  // Memoize SVG elements for vertical heatmap
  const verticalHeatmapSvgElements = useMemo(() => {
    if (!calculationPerformed || verticalHeatmapData.length === 0) return null;

    const elements = [];
    const gridResolution = 50;
    const stepX = buildingLength / gridResolution;
    const totalHeight = buildingHeight * numberOfFloors;
    const stepZ = totalHeight / gridResolution;
    const cellWidthSVG = stepX * 10;
    const cellHeightSVG = stepZ * 10;

    // Draw vertical heatmap cells
    verticalHeatmapData.forEach((row, i) => {
      row.forEach((cell, k) => {
        elements.push(
          <rect
            key={`vcell-${i}-${k}`}
            x={cell.x * 10}
            y={(totalHeight - cell.z) * 10} // Flip Y axis so ground is at bottom
            width={cellWidthSVG}
            height={cellHeightSVG}
            fill={cell.color}
            opacity="0.7"
          />
        );
      });
    });

    // Draw floor separators
    for (let floor = 1; floor < numberOfFloors; floor++) {
      const floorHeight = floor * buildingHeight;
      elements.push(
        <line
          key={`floor-${floor}`}
          x1="0"
          y1={(totalHeight - floorHeight) * 10}
          x2={buildingLength * 10}
          y2={(totalHeight - floorHeight) * 10}
          stroke="#374151"
          strokeWidth="2"
          strokeDasharray="3,3"
        />
      );
    }

    // Draw AP positions (projected to the slice)
    apPlacements.forEach((ap) => {
      elements.push(
        <g key={`vap-${ap.id}`}>
          {/* AP marker at its height */}
          <circle
            cx={ap.x * 10}
            cy={(totalHeight - ap.z) * 10}
            r="8"
            fill="#1d4ed8"
            stroke="white"
            strokeWidth="2"
          />
          {/* AP label */}
          <text
            x={ap.x * 10}
            y={(totalHeight - ap.z) * 10 + 3}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontWeight="bold"
          >
            {ap.id}
          </text>
        </g>
      );
    });

    // Draw obstacles on the vertical slice (simplified as vertical lines)
    const sliceY = (verticalSlicePosition / 100) * buildingWidth;
    obstacles.forEach((obstacle) => {
      // Check if obstacle intersects with the slice position (within tolerance)
      const tolerance = 1.0; // 1 meter tolerance
      if (obstacle.y <= sliceY + tolerance && (obstacle.y + obstacle.height) >= sliceY - tolerance) {
        // Draw obstacle as a vertical rectangle in the side view
        const obstacleFloorZ = obstacle.floorLevel * buildingHeight;
        elements.push(
          <rect
            key={`vobstacle-${obstacle.id}`}
            x={obstacle.x * 10}
            y={(totalHeight - obstacleFloorZ - buildingHeight) * 10} // Full floor height obstacle
            width={obstacle.width * 10}
            height={buildingHeight * 10}
            fill="rgba(139, 69, 19, 0.4)" // Brown semi-transparent
            stroke="#8B4513"
            strokeWidth="1"
          />
        );
      }
    });

    // Draw building outline (vertical section)
    elements.push(
      <rect
        key="vbuilding-outline"
        x="0"
        y="0"
        width={buildingLength * 10}
        height={totalHeight * 10}
        fill="none"
        stroke="#374151"
        strokeWidth="3"
      />
    );

    return elements;
  }, [calculationPerformed, verticalHeatmapData, apPlacements, buildingLength, buildingHeight, numberOfFloors, apHeight, obstacles, verticalSlicePosition]);
  
  // Generate heatmap data - kept for backward compatibility, now uses memoized version
  const generateHeatmapData = () => {
    return heatmapGridData;
  };
  
  // Get signal quality label
  const getSignalQuality = (strength: number): string => {
    if (strength >= targetRSSI + 10) return 'Excellent';
    if (strength >= targetRSSI) return 'Good';
    if (strength >= targetRSSI - 10) return 'Fair';
    if (strength >= targetRSSI - 20) return 'Poor';
    return 'Very Poor';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Wireless Network Coverage Calculator</h2>
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

      {/* Tab Selector */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button
          className={`py-2 px-4 mr-2 whitespace-nowrap ${
            activeTab === 'wifi'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('wifi')}
        >
          Wi-Fi (802.11)
        </button>
        <button
          className={`py-2 px-4 mr-2 whitespace-nowrap ${
            activeTab === 'bluetooth'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('bluetooth')}
        >
          Bluetooth
        </button>
        <button
          className={`py-2 px-4 mr-2 whitespace-nowrap ${
            activeTab === 'lora'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('lora')}
        >
          LoRa
        </button>
        <button
          className={`py-2 px-4 whitespace-nowrap ${
            activeTab === 'zigbee'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('zigbee')}
        >
          Zigbee
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Building Parameters</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building Length (m)
              </label>
              <input
                type="number"
                min="1"
                value={buildingLength}
                onChange={(e) => setBuildingLength(Math.max(1, Number(e.target.value) || 1))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building Width (m)
              </label>
              <input
                type="number"
                min="1"
                value={buildingWidth}
                onChange={(e) => setBuildingWidth(Math.max(1, Number(e.target.value) || 1))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor Height (m)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={buildingHeight}
                onChange={(e) => setBuildingHeight(Math.max(1, Number(e.target.value) || 3))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Floors
              </label>
              <input
                type="number"
                min="1"
                value={numberOfFloors}
                onChange={(e) => setNumberOfFloors(Math.max(1, Number(e.target.value) || 1))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-4"></div>
          
          <h3 className="font-medium text-lg mb-4">Coverage Analysis Settings</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AP Height (m)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.1"
                value={apHeight}
                onChange={(e) => setApHeight(Math.max(0.5, Number(e.target.value) || 2.7))}
                className="w-full p-2 border rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Typical ceiling mount: 2.7m</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inter-Floor Attenuation (dB)
              </label>
              <input
                type="number"
                min="0"
                value={interFloorAttenuation}
                onChange={(e) => setInterFloorAttenuation(Math.max(0, Number(e.target.value) || 15))}
                className="w-full p-2 border rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Signal loss between floors</p>
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-4"></div>
          
          <h3 className="font-medium text-lg mb-4">{getCurrentTechnology().name} Parameters</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operating Frequency
            </label>
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(Number(e.target.value) || currentTechnology.frequencies[0].frequency)}
              className="w-full p-2 border rounded-md"
            >
              {currentTechnology.frequencies.map(freq => (
                <option key={freq.frequency} value={freq.frequency}>
                  {freq.band} ({freq.frequency} MHz, Max Range: {freq.maxRange}m)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Max Range shows theoretical free-space maximum for this technology/band
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TX Power (dBm)
              </label>
              <input
                type="number"
                value={txPower}
                onChange={(e) => setTxPower(Number(e.target.value) || currentTechnology.typicalTxPower)}
                className="w-full p-2 border rounded-md"
                min="-10"
                max="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target RSSI (dBm)
              </label>
              <input
                type="number"
                max="0"
                value={targetRSSI}
                onChange={(e) => setTargetRSSI(Number(e.target.value) || currentTechnology.minRSSI)}
                className="w-full p-2 border rounded-md"
                min="-150"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Density (per 100m²)
              </label>
              <input
                type="number"
                min="1"
                value={userDensity}
                onChange={(e) => setUserDensity(Math.max(1, Number(e.target.value) || 10))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Safety Margin (dB)
              </label>
              <input
                type="number"
                min="0"
                value={safetyMargin}
                onChange={(e) => setSafetyMargin(Math.max(0, Number(e.target.value) || 10))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          
          <div className="border-t border-gray-300 my-4"></div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">Obstacles & 2D Positioning</h3>
              <button
                onClick={addObstacle}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Obstacle
              </button>
            </div>
            
            {obstacles.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-white rounded-lg border border-gray-200">
                <p className="mb-2">No obstacles added.</p>
                <p className="text-sm">Click 'Add Obstacle' to define walls, doors, and other signal barriers with precise positioning.</p>
              </div>
            ) : (
              obstacles.map((obstacle) => (
                <div key={obstacle.id} className="mb-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{obstacle.name}</h4>
                    {obstacles.length > 1 && (
                      <button 
                        onClick={() => removeObstacle(obstacle.id)} 
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={obstacle.name}
                        onChange={(e) => updateObstacle(obstacle.id, 'name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                      <select
                        value={obstacle.material}
                        onChange={(e) => updateObstacle(obstacle.id, 'material', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {WALL_MATERIALS.map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.attenuation} dB)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
                      <select
                        value={obstacle.floorLevel}
                        onChange={(e) => updateObstacle(obstacle.id, 'floorLevel', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Array.from({ length: numberOfFloors }, (_, i) => (
                          <option key={i} value={i}>Floor {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">X Position (m)</label>
                      <input
                        type="number"
                        min="0"
                        max={buildingLength}
                        step="0.1"
                        value={obstacle.x}
                        onChange={(e) => updateObstacle(obstacle.id, 'x', Math.max(0, Math.min(buildingLength, Number(e.target.value) || 0)))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Y Position (m)</label>
                      <input
                        type="number"
                        min="0"
                        max={buildingWidth}
                        step="0.1"
                        value={obstacle.y}
                        onChange={(e) => updateObstacle(obstacle.id, 'y', Math.max(0, Math.min(buildingWidth, Number(e.target.value) || 0)))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Width (m)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={obstacle.width}
                        onChange={(e) => updateObstacle(obstacle.id, 'width', Math.max(0.1, Number(e.target.value) || 0.1))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Height (m)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={obstacle.height}
                        onChange={(e) => updateObstacle(obstacle.id, 'height', Math.max(0.1, Number(e.target.value) || 0.1))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    <p><strong>Position:</strong> ({obstacle.x.toFixed(1)}, {obstacle.y.toFixed(1)}) | 
                    <strong> Size:</strong> {obstacle.width.toFixed(1)}m × {obstacle.height.toFixed(1)}m | 
                    <strong> Attenuation:</strong> {WALL_MATERIALS.find(m => m.id === obstacle.material)?.attenuation || 0} dB</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4">
            <button
              onClick={calculateCoverage}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={!buildingLength || !buildingWidth || buildingLength <= 0 || buildingWidth <= 0}
            >
              Calculate Coverage
            </button>
            {calculationPerformed && (
              <button
                onClick={resetCalculation}
                className="ml-2 bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            )}
            {(!buildingLength || !buildingWidth || buildingLength <= 0 || buildingWidth <= 0) && (
              <p className="text-sm text-red-600 mt-2">
                Please enter valid building dimensions to perform calculations.
              </p>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Coverage Analysis Results</h3>
          
          {!calculationPerformed ? (
            <div className="text-center py-8 text-gray-500">
              <p>Configure building parameters and wireless settings, then click Calculate Coverage</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Coverage Summary</h4>
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Recommended Access Points</p>
                      <p className="font-bold text-2xl text-blue-600">{recommendedAPs}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Max Coverage Radius</p>
                      <p className="font-bold text-xl text-gray-800">{maxCoverageRadius.toFixed(1)} m</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Coverage Area</p>
                      <p className="font-semibold text-gray-800">{totalCoverageArea.toFixed(0)} m²</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User Density</p>
                      <p className="font-semibold text-gray-800">{Math.ceil(totalCoverageArea * userDensity / 100)} users</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Coverage Heatmap</h4>
                <div className="bg-white p-4 rounded-md shadow mb-4 border border-gray-200">
                  {/* Heatmap View Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-700">View:</span>
                      <button
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          heatmapView === 'horizontal'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => setHeatmapView('horizontal')}
                      >
                        Horizontal (Floor Plan)
                      </button>
                      <button
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          heatmapView === 'vertical'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => setHeatmapView('vertical')}
                      >
                        Vertical (Side View)
                      </button>
                    </div>
                  </div>

                    {/* Vertical Slice Control */}
                    {heatmapView === 'vertical' && (
                        <div className="flex items-center space-x-3 bg-blue-50 px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">Slice Position:</span>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-blue-600">Front</span>
                            <div className="relative">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={verticalSlicePosition}
                                onChange={(e) => setVerticalSlicePosition(Number(e.target.value))}
                                className="w-32 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer 
                                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                                            [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                                            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-600 
                                            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                            />
                            </div>
                            <span className="text-xs text-blue-600">Back</span>
                        </div>
                        <span className="text-sm font-medium text-blue-700 min-w-[3rem]">{verticalSlicePosition}%</span>
                        <span className="text-xs text-gray-500">({((verticalSlicePosition / 100) * buildingWidth).toFixed(1)}m)</span>
                        </div>
                    )}
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Signal Strength Legend</span>
                      <span className="text-xs text-gray-500">
                        {heatmapView === 'horizontal' 
                          ? `Building: ${buildingLength}m × ${buildingWidth}m`
                          : `Building: ${buildingLength}m × ${(buildingHeight * numberOfFloors).toFixed(1)}m (${numberOfFloors} floors)`
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-500 rounded mr-1"></div>
                        <span>Excellent (&gt;{targetRSSI + 10} dBm)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-lime-500 rounded mr-1"></div>
                        <span>Good ({targetRSSI} to {targetRSSI + 10} dBm)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-500 rounded mr-1"></div>
                        <span>Fair ({targetRSSI - 10} to {targetRSSI} dBm)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-orange-500 rounded mr-1"></div>
                        <span>Poor ({targetRSSI - 20} to {targetRSSI - 10} dBm)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded mr-1"></div>
                        <span>Very Poor (&lt;{targetRSSI - 20} dBm)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <svg 
                      width="100%" 
                      height="400" 
                      viewBox={heatmapView === 'horizontal' 
                        ? `0 0 ${buildingLength * 10} ${buildingWidth * 10}`
                        : `0 0 ${buildingLength * 10} ${(buildingHeight * numberOfFloors) * 10}`
                      }
                      className="bg-gray-50"
                    >
                      {/* Render appropriate heatmap based on view */}
                      {heatmapView === 'horizontal' ? heatmapSvgElements : verticalHeatmapSvgElements}
                      
                      {/* Grid lines for reference */}
                      {heatmapView === 'horizontal' ? (
                        <>
                          {Array.from({ length: Math.floor(buildingLength / 5) + 1 }, (_, i) => (
                            <line
                              key={`vline-${i}`}
                              x1={i * 50}
                              y1="0"
                              x2={i * 50}
                              y2={buildingWidth * 10}
                              stroke="#d1d5db"
                              strokeWidth="1"
                              opacity="0.3"
                            />
                          ))}
                          {Array.from({ length: Math.floor(buildingWidth / 5) + 1 }, (_, i) => (
                            <line
                              key={`hline-${i}`}
                              x1="0"
                              y1={i * 50}
                              x2={buildingLength * 10}
                              y2={i * 50}
                              stroke="#d1d5db"
                              strokeWidth="1"
                              opacity="0.3"
                            />
                          ))}
                        </>
                      ) : (
                        <>
                          {Array.from({ length: Math.floor(buildingLength / 5) + 1 }, (_, i) => (
                            <line
                              key={`vvline-${i}`}
                              x1={i * 50}
                              y1="0"
                              x2={i * 50}
                              y2={(buildingHeight * numberOfFloors) * 10}
                              stroke="#d1d5db"
                              strokeWidth="1"
                              opacity="0.3"
                            />
                          ))}
                          {Array.from({ length: Math.floor((buildingHeight * numberOfFloors) / 3) + 1 }, (_, i) => (
                            <line
                              key={`vhline-${i}`}
                              x1="0"
                              y1={i * 30}
                              x2={buildingLength * 10}
                              y2={i * 30}
                              stroke="#d1d5db"
                              strokeWidth="1"
                              opacity="0.3"
                            />
                          ))}
                        </>
                      )}
                      
                      {/* Scale indicators */}
                      {heatmapView === 'horizontal' ? (
                        <>
                          <text x="5" y={buildingWidth * 10 - 5} fontSize="12" fill="#6b7280">0m</text>
                          <text x={buildingLength * 10 - 25} y={buildingWidth * 10 - 5} fontSize="12" fill="#6b7280">{buildingLength}m</text>
                          <text x="5" y="15" fontSize="12" fill="#6b7280">{buildingWidth}m</text>
                        </>
                      ) : (
                        <>
                          <text x="5" y={(buildingHeight * numberOfFloors) * 10 - 5} fontSize="12" fill="#6b7280">0m</text>
                          <text x={buildingLength * 10 - 25} y={(buildingHeight * numberOfFloors) * 10 - 5} fontSize="12" fill="#6b7280">{buildingLength}m</text>
                          <text x="5" y="15" fontSize="12" fill="#6b7280">{(buildingHeight * numberOfFloors).toFixed(1)}m</text>
                        </>
                      )}
                    </svg>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
                    {heatmapView === 'horizontal' ? (
                      <>
                        <p><strong>Blue circles:</strong> Access Points | <strong>Brown rectangles:</strong> Obstacles | <strong>Grid lines:</strong> 5m intervals</p>
                        <p>Horizontal heatmap shows signal strength distribution across floor plan at ground level with ray-casting obstacle effects.</p>
                      </>
                    ) : (
                      <>
                        <p><strong>Blue circles:</strong> Access Points at {apHeight}m height | <strong>Brown rectangles:</strong> Obstacles | <strong>Dashed lines:</strong> Floor separations</p>
                        <p>Vertical heatmap shows signal strength at slice position {verticalSlicePosition}% across building width ({((verticalSlicePosition / 100) * buildingWidth).toFixed(1)}m from front).</p>
                        <p><strong>Inter-floor attenuation:</strong> {interFloorAttenuation} dB per floor | <strong>AP Height:</strong> {apHeight}m</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Link Budget Analysis</h4>
                <div className="bg-white p-3 rounded-md mb-4">
                  <table className="min-w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1 pr-4 text-gray-600">TX Power</td>
                        <td className="py-1 text-right font-medium">+{txPower} dBm</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-gray-600">Target RSSI</td>
                        <td className="py-1 text-right font-medium">{targetRSSI} dBm</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-gray-600">Safety Margin</td>
                        <td className="py-1 text-right font-medium">-{safetyMargin} dB</td>
                      </tr>
                      <tr className="border-t">
                        <td className="py-1 pr-4 text-gray-600">Available Link Budget</td>
                        <td className="py-1 text-right font-bold text-blue-600">{linkBudget} dB</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-gray-600">Obstacle Attenuation</td>
                        <td className="py-1 text-right font-medium text-orange-600">Per-ray calculation</td>
                      </tr>
                      <tr className="border-t">
                        <td className="py-1 pr-4 text-gray-600">Available Path Loss (max)</td>
                        <td className="py-1 text-right font-bold text-green-600">{pathLoss.toFixed(1)} dB</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-2 text-xs text-blue-600">
                    <p><strong>Note:</strong> Obstacle attenuation is now calculated per signal path using ray-casting, providing more accurate coverage predictions than global attenuation models.</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Access Point Placement</h4>
                <div className="bg-white p-3 rounded-md mb-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left font-semibold text-gray-600 border">AP ID</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Floor</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">X Position (m)</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Y Position (m)</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Height (m)</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Coverage Radius (m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apPlacements.map((ap) => (
                          <tr key={ap.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 text-gray-700 border">AP-{ap.id}</td>
                            <td className="p-2 text-center text-gray-700 border">{ap.floorLevel + 1}</td>
                            <td className="p-2 text-center text-gray-700 border">{ap.x.toFixed(1)}</td>
                            <td className="p-2 text-center text-gray-700 border">{ap.y.toFixed(1)}</td>
                            <td className="p-2 text-center text-gray-700 border">{ap.z.toFixed(1)}</td>
                            <td className="p-2 text-center text-gray-700 border">{ap.coverageRadius.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Obstacle Configuration Analysis</h4>
                <div className="bg-white p-3 rounded-md mb-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left font-semibold text-gray-600 border">Obstacle</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Position (X,Y)</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Size (W×H)</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Floor</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Material</th>
                          <th className="p-2 text-center font-semibold text-gray-600 border">Attenuation (dB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obstacles.map((obstacle) => {
                          const material = WALL_MATERIALS.find(m => m.id === obstacle.material);
                          return (
                            <tr key={obstacle.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2 text-gray-700 border">{obstacle.name}</td>
                              <td className="p-2 text-center text-gray-700 border">({obstacle.x.toFixed(1)}, {obstacle.y.toFixed(1)})</td>
                              <td className="p-2 text-center text-gray-700 border">{obstacle.width.toFixed(1)}×{obstacle.height.toFixed(1)}m</td>
                              <td className="p-2 text-center text-gray-700 border">Floor {obstacle.floorLevel + 1}</td>
                              <td className="p-2 text-center text-gray-700 border">{material?.name || 'Unknown'}</td>
                              <td className="p-2 text-center font-medium text-red-600 border">{material?.attenuation || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-xs text-blue-600">
                    <p><strong>Ray-casting Implementation:</strong> Signal attenuation is calculated per ray path from each AP to measurement points, accounting for specific obstacle intersections.</p>
                    <p><strong>Positioning:</strong> Obstacles are positioned with precise 2D coordinates and affect signal propagation based on line-of-sight geometry.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-3 rounded-md border border-green-300">
                <h4 className="font-medium text-green-800 mb-2">Installation Recommendations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-green-800">
                  <li>Install {recommendedAPs} access point{recommendedAPs > 1 ? 's' : ''} distributed across {numberOfFloors} floor{numberOfFloors > 1 ? 's' : ''}</li>
                  <li>Mount APs at {apHeight}m height for optimal RF propagation</li>
                  <li>Ensure 20% coverage overlap between adjacent APs for seamless roaming</li>
                  <li>Consider obstacle placement effects shown in heatmap when finalizing AP positions</li>
                  {maxCoverageRadius < 10 && (
                    <li className="text-orange-700">Warning: Limited coverage radius due to high attenuation - consider optimizing obstacle placement or increasing TX power</li>
                  )}
                  {recommendedAPs > 15 && (
                    <li className="text-orange-700">High number of APs required - consider using higher-power equipment or optimizing building layout</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li><strong>Performance:</strong> Dual heatmaps use 50×50 grid resolution with ray-casting for precise obstacle interaction modeling</li>
          <li><strong>RF Calculations:</strong> Uses 3D Free Space Path Loss (FSPL) model with per-ray obstacle intersection calculations</li>
          <li><strong>Advanced Obstacle Model:</strong> Obstacles are positioned with precise 2D coordinates (X,Y) and dimensions. Ray-casting determines line-of-sight between APs and measurement points for accurate attenuation calculation.</li>
          <li><strong>Multi-Floor AP Distribution:</strong> Access points are automatically distributed across all floors with optimal per-floor coverage patterns</li>
          <li><strong>Vertical Coverage:</strong> Vertical heatmap shows signal propagation across floors with configurable inter-floor attenuation. Adjust slice position to analyze different cross-sections.</li>
          <li><strong>Floor Penetration:</strong> Inter-floor attenuation accounts for concrete floors, HVAC systems, and structural elements. Typical values: 10-20 dB per floor.</li>
          <li><strong>Ray-casting Precision:</strong> Each heatmap point calculation considers specific obstacle intersections along the signal path, providing realistic coverage predictions</li>
          <li>Real-world performance may vary due to multipath propagation, interference, and environmental factors not modeled</li>
          <li>Consider conducting site surveys for critical installations, especially in complex multi-floor environments</li>
          <li>AP placement distribution accounts for building geometry and ensures coverage redundancy across floors</li>
          <li>Higher frequencies (5GHz, 6GHz) provide more bandwidth but have reduced range and penetration</li>
          <li>Metal structures, elevators, and large equipment can cause significant signal degradation beyond modeled obstacles</li>
          <li>For LoRa applications, consider outdoor gateways for better coverage of indoor sensors</li>
          <li>Bluetooth and Zigbee are designed for short-range applications - multiple coordinators may be needed per floor</li>
          <li><strong>User Density:</strong> High user density may require additional APs for capacity, not just coverage</li>
          <li><strong>3D Propagation:</strong> Vertical heatmap helps identify coverage gaps between floors and optimal AP mounting heights</li>
        </ul>
      </div>
    </div>
  );
};

export default WirelessCoverageCalculator;