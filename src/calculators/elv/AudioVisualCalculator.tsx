import React, { useState, useEffect } from 'react';

// Projector lens types with throw ratios
import { Icons } from '../../components/Icons';

// Graphical Preview Components
interface ProjectorVisualizationProps {
  throwDistance: number;
  screenWidth: number;
  screenHeight: number;
  ceilingHeight: number;
  projectorOffset: number;
  screenCenterHeight: number;
  keystoneAngle: number;
  roomLength: number;
  roomWidth: number;
}

interface AudioVisualizationProps {
  roomLength: number;
  roomWidth: number;
  numberOfSpeakers: number;
  speakerPattern: string;
  maxSPL: number;
  coverageArea: number;
}

interface AudioVisualCalculatorProps {
  onShowTutorial?: () => void;
}

interface ProjectorCalculatorProps {
  onShowTutorial?: () => void;
}

interface AudioCalculatorProps {
  onShowTutorial?: () => void;
}

// Projector Side View Visualization
const ProjectorSideView: React.FC<ProjectorVisualizationProps> = ({
  throwDistance,
  screenWidth,
  screenHeight,
  ceilingHeight,
  projectorOffset,
  screenCenterHeight,
  keystoneAngle,
  roomLength
}) => {
  const svgWidth = 400;
  const svgHeight = 200;
  const scale = Math.min(svgWidth / (roomLength * 1.2), svgHeight / (ceilingHeight * 1.5));
  
  // Calculate positions
  const projectorHeight = ceilingHeight - projectorOffset;
  const projectorX = svgWidth - throwDistance * scale - 50;
  const projectorY = svgHeight - projectorHeight * scale - 20;
  const screenX = svgWidth - 50;
  const screenY = svgHeight - screenCenterHeight * scale - 20;
  const screenBottom = screenY + (screenHeight * scale) / 2;
  const screenTop = screenY - (screenHeight * scale) / 2;
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h5 className="font-medium mb-2 text-gray-700">Side View - Projection Geometry</h5>
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        {/* Room outline */}
        <rect x="20" y={svgHeight - ceilingHeight * scale - 20} 
              width={roomLength * scale} height={ceilingHeight * scale} 
              fill="none" stroke="#e5e7eb" strokeWidth="2" />
        
        {/* Floor line */}
        <line x1="20" y1={svgHeight - 20} 
              x2={20 + roomLength * scale} y2={svgHeight - 20} 
              stroke="#374151" strokeWidth="2" />
        
        {/* Ceiling line */}
        <line x1="20" y1={svgHeight - ceilingHeight * scale - 20} 
              x2={20 + roomLength * scale} y2={svgHeight - ceilingHeight * scale - 20} 
              stroke="#374151" strokeWidth="2" />
        
        {/* Screen */}
        <line x1={screenX} y1={screenTop} 
              x2={screenX} y2={screenBottom} 
              stroke="#3b82f6" strokeWidth="4" />
        
        {/* Screen label */}
        <text x={screenX + 5} y={screenY} fontSize="10" fill="#3b82f6">Screen</text>
        
        {/* Projector */}
        <rect x={projectorX - 5} y={projectorY - 3} 
              width="10" height="6" 
              fill="#ef4444" stroke="#dc2626" />
        
        {/* Projector label */}
        <text x={projectorX - 20} y={projectorY - 5} fontSize="10" fill="#ef4444">Projector</text>
        
        {/* Projection beam lines */}
        <line x1={projectorX + 5} y1={projectorY} 
              x2={screenX} y2={screenTop} 
              stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={projectorX + 5} y1={projectorY} 
              x2={screenX} y2={screenBottom} 
              stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,3" />
        
        {/* Throw distance line */}
        <line x1={projectorX} y1={projectorY + 15} 
              x2={screenX} y2={projectorY + 15} 
              stroke="#6b7280" strokeWidth="1" />
        <text x={(projectorX + screenX) / 2 - 20} y={projectorY + 25} 
              fontSize="10" fill="#6b7280">{throwDistance.toFixed(1)}m</text>
        
        {/* Keystone angle indicator */}
        {keystoneAngle > 5 && (
          <g>
            <path d={`M ${projectorX + 5} ${projectorY} L ${projectorX + 20} ${projectorY} A 15 15 0 0 ${projectorY > screenY ? 1 : 0} ${projectorX + 20} ${projectorY + (projectorY > screenY ? 15 : -15)}`}
                  fill="none" stroke="#f59e0b" strokeWidth="1" />
            <text x={projectorX + 25} y={projectorY + 5} fontSize="9" fill="#f59e0b">
              {keystoneAngle.toFixed(1)}°
            </text>
          </g>
        )}
        
        {/* Dimensions */}
        <text x="25" y={svgHeight - 10} fontSize="10" fill="#6b7280">
          Room: {roomLength.toFixed(1)}m × {ceilingHeight.toFixed(1)}m
        </text>
      </svg>
    </div>
  );
};

// Projector Top View Visualization
const ProjectorTopView: React.FC<ProjectorVisualizationProps> = ({
  throwDistance,
  screenWidth,
  roomLength,
  roomWidth
}) => {
  const svgWidth = 400;
  const svgHeight = 300;
  const scale = Math.min(svgWidth / (roomLength * 1.2), svgHeight / (roomWidth * 1.2));
  
  const projectorX = svgWidth - throwDistance * scale - 50;
  const projectorY = svgHeight / 2;
  const screenX = svgWidth - 50;
  const screenY1 = svgHeight / 2 - (screenWidth * scale) / 2;
  const screenY2 = svgHeight / 2 + (screenWidth * scale) / 2;
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h5 className="font-medium mb-2 text-gray-700">Top View - Room Layout</h5>
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        {/* Room outline */}
        <rect x="20" y={(svgHeight - roomWidth * scale) / 2} 
              width={roomLength * scale} height={roomWidth * scale} 
              fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2" />
        
        {/* Screen */}
        <line x1={screenX} y1={screenY1} 
              x2={screenX} y2={screenY2} 
              stroke="#3b82f6" strokeWidth="6" />
        
        {/* Projector */}
        <circle cx={projectorX} cy={projectorY} r="4" 
                fill="#ef4444" stroke="#dc2626" strokeWidth="2" />
        
        {/* Projection coverage area */}
        <polygon points={`${projectorX},${projectorY} ${screenX},${screenY1} ${screenX},${screenY2}`}
                 fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="1" />
        
        {/* Labels */}
        <text x={screenX + 10} y={projectorY} fontSize="10" fill="#3b82f6">Screen</text>
        <text x={projectorX - 25} y={projectorY - 10} fontSize="10" fill="#ef4444">Projector</text>
        
        {/* Dimensions */}
        <text x="25" y="20" fontSize="10" fill="#6b7280">
          Room: {roomLength.toFixed(1)}m × {roomWidth.toFixed(1)}m
        </text>
        <text x="25" y="35" fontSize="10" fill="#6b7280">
          Screen: {screenWidth.toFixed(1)}m wide
        </text>
      </svg>
    </div>
  );
};

// Audio Coverage Visualization
const AudioCoverageVisualization: React.FC<AudioVisualizationProps> = ({
  roomLength,
  roomWidth,
  numberOfSpeakers,
  speakerPattern,
  maxSPL,
  coverageArea
}) => {
  const svgWidth = 400;
  const svgHeight = 300;
  const scale = Math.min(svgWidth / (roomLength * 1.2), svgHeight / (roomWidth * 1.2));
  
  // Calculate speaker positions (simplified arrangement)
  const speakerPositions = [];
  const roomCenterX = roomLength / 2;
  const roomCenterY = roomWidth / 2;
  
  if (numberOfSpeakers === 1) {
    speakerPositions.push({ x: roomCenterX, y: roomCenterY });
  } else if (numberOfSpeakers === 2) {
    speakerPositions.push(
      { x: roomLength * 0.25, y: roomCenterY },
      { x: roomLength * 0.75, y: roomCenterY }
    );
  } else if (numberOfSpeakers === 4) {
    speakerPositions.push(
      { x: roomLength * 0.25, y: roomWidth * 0.25 },
      { x: roomLength * 0.75, y: roomWidth * 0.25 },
      { x: roomLength * 0.25, y: roomWidth * 0.75 },
      { x: roomLength * 0.75, y: roomWidth * 0.75 }
    );
  } else {
    // Arrange in a line for other configurations
    for (let i = 0; i < numberOfSpeakers; i++) {
      speakerPositions.push({
        x: roomLength * 0.2 + (roomLength * 0.6 * i) / (numberOfSpeakers - 1),
        y: roomCenterY
      });
    }
  }
  
  // Get coverage radius based on pattern
  const patternData = SPEAKER_PATTERNS.find(p => p.value === speakerPattern);
  const maxCoverageRadius = Math.sqrt(coverageArea / numberOfSpeakers / Math.PI);
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h5 className="font-medium mb-2 text-gray-700">Audio Coverage Pattern</h5>
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        {/* Room outline */}
        <rect x="20" y={(svgHeight - roomWidth * scale) / 2} 
              width={roomLength * scale} height={roomWidth * scale} 
              fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2" />
        
        {/* Coverage circles for each speaker */}
        {speakerPositions.map((pos, index) => {
          const svgX = 20 + pos.x * scale;
          const svgY = (svgHeight - roomWidth * scale) / 2 + pos.y * scale;
          const coverageRadius = maxCoverageRadius * scale;
          
          return (
            <g key={index}>
              {/* Coverage area */}
              <circle cx={svgX} cy={svgY} r={coverageRadius}
                      fill="#10b981" fillOpacity="0.15" 
                      stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
              
              {/* Speaker */}
              <circle cx={svgX} cy={svgY} r="6" 
                      fill="#374151" stroke="#1f2937" strokeWidth="2" />
              
              {/* Speaker label */}
              <text x={svgX + 10} y={svgY - 10} fontSize="9" fill="#374151">
                SP{index + 1}
              </text>
            </g>
          );
        })}
        
        {/* SPL Legend */}
        <g>
          <rect x="25" y="25" width="15" height="15" fill="#10b981" fillOpacity="0.15" stroke="#10b981" />
          <text x="45" y="35" fontSize="10" fill="#374151">Coverage Area</text>
          
          <circle cx="32" cy="50" r="4" fill="#374151" stroke="#1f2937" strokeWidth="2" />
          <text x="45" y="54" fontSize="10" fill="#374151">Speaker Position</text>
        </g>
        
        {/* Room info */}
        <text x="25" y={svgHeight - 30} fontSize="10" fill="#6b7280">
          Room: {roomLength.toFixed(1)}m × {roomWidth.toFixed(1)}m
        </text>
        <text x="25" y={svgHeight - 15} fontSize="10" fill="#6b7280">
          Max SPL: {maxSPL.toFixed(1)}dB @ 1m
        </text>
      </svg>
    </div>
  );
};

// SPL Heat Map Visualization
const SPLHeatMap: React.FC<AudioVisualizationProps> = ({
  roomLength,
  roomWidth,
  numberOfSpeakers,
  maxSPL
}) => {
  const svgWidth = 400;
  const svgHeight = 300;
  const scale = Math.min(svgWidth / (roomLength * 1.2), svgHeight / (roomWidth * 1.2));
  
  // Create a simple grid for heat map
  const gridSize = 10;
  const cells = [];
  
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const cellX = 20 + (x * roomLength * scale) / gridSize;
      const cellY = (svgHeight - roomWidth * scale) / 2 + (y * roomWidth * scale) / gridSize;
      const cellWidth = (roomLength * scale) / gridSize;
      const cellHeight = (roomWidth * scale) / gridSize;
      
      // Simplified SPL calculation based on distance from center
      const centerX = roomLength / 2;
      const centerY = roomWidth / 2;
      const realX = (x * roomLength) / gridSize;
      const realY = (y * roomWidth) / gridSize;
      const distance = Math.sqrt(Math.pow(realX - centerX, 2) + Math.pow(realY - centerY, 2));
      const spl = Math.max(maxSPL - 20 * Math.log10(Math.max(distance, 0.5)), 40);
      
      // Color based on SPL level
      let color = '#ef4444'; // Red (low SPL)
      if (spl > 80) color = '#10b981'; // Green (good SPL)
      else if (spl > 70) color = '#f59e0b'; // Yellow (medium SPL)
      
      const opacity = Math.min((spl - 40) / 40, 0.8);
      
      cells.push(
        <rect key={`${x}-${y}`} x={cellX} y={cellY} 
              width={cellWidth} height={cellHeight}
              fill={color} fillOpacity={opacity} stroke="none" />
      );
    }
  }
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h5 className="font-medium mb-2 text-gray-700">SPL Distribution Heat Map</h5>
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        {/* Room outline */}
        <rect x="20" y={(svgHeight - roomWidth * scale) / 2} 
              width={roomLength * scale} height={roomWidth * scale} 
              fill="white" stroke="#e5e7eb" strokeWidth="2" />
        
        {/* Heat map cells */}
        {cells}
        
        {/* SPL Legend */}
        <g>
          <text x="25" y="20" fontSize="12" fill="#374151" fontWeight="bold">SPL (dB)</text>
          
          <rect x="25" y="25" width="20" height="10" fill="#10b981" fillOpacity="0.8" />
          <text x="50" y="33" fontSize="10" fill="#374151">&gt;80dB (Good)</text>
          
          <rect x="25" y="40" width="20" height="10" fill="#f59e0b" fillOpacity="0.8" />
          <text x="50" y="48" fontSize="10" fill="#374151">70-80dB (Medium)</text>
          
          <rect x="25" y="55" width="20" height="10" fill="#ef4444" fillOpacity="0.8" />
          <text x="50" y="63" fontSize="10" fill="#374151">&lt;70dB (Low)</text>
        </g>
      </svg>
    </div>
  );
};
const PROJECTOR_LENS_TYPES = [
  { value: 'ultrashort', label: 'Ultra Short Throw', minRatio: 0.2, maxRatio: 0.4 },
  { value: 'short', label: 'Short Throw', minRatio: 0.4, maxRatio: 1.0 },
  { value: 'standard', label: 'Standard Throw', minRatio: 1.0, maxRatio: 2.0 },
  { value: 'long', label: 'Long Throw', minRatio: 2.0, maxRatio: 4.0 },
  { value: 'custom', label: 'Custom Throw Ratio', minRatio: 0.1, maxRatio: 10.0 }
];

// Room lighting conditions
const LIGHTING_CONDITIONS = [
  { value: 'dark', label: 'Dark Room (Cinema)', multiplier: 1.0, description: 'Controlled lighting, blackout curtains' },
  { value: 'dim', label: 'Dim Room (Conference)', multiplier: 1.5, description: 'Some ambient light, dimmed lights' },
  { value: 'bright', label: 'Bright Room (Classroom)', multiplier: 2.5, description: 'Normal room lighting' },
  { value: 'daylight', label: 'Daylight (Auditorium)', multiplier: 4.0, description: 'Natural daylight present' }
];

// Screen gain factors
const SCREEN_GAINS = [
  { value: 1.0, label: 'Matte White (1.0)' },
  { value: 1.3, label: 'Grey Screen (1.3)' },
  { value: 2.4, label: 'High Gain (2.4)' },
  { value: 10.0, label: 'Retro Reflective (10.0)' }
];

// Speaker coverage patterns
const SPEAKER_PATTERNS = [
  { value: 'point', label: 'Point Source', coverage: 90, description: 'Single driver, 90° coverage' },
  { value: 'line', label: 'Line Array', coverage: 120, description: 'Multiple drivers, 120° coverage' },
  { value: 'horn', label: 'Horn Loaded', coverage: 60, description: 'Directional horn, 60° coverage' },
  { value: 'ceiling', label: 'Ceiling Speaker', coverage: 180, description: 'Ceiling mount, 180° coverage' }
];

// Main combined component
const AudioVisualCalculator: React.FC<AudioVisualCalculatorProps> = ({ onShowTutorial }) => {
  const [activeTab, setActiveTab] = useState<'projector' | 'audio'>('projector');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Audio Visual System Calculator</h2>
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
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${
            activeTab === 'projector'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('projector')}
        >
          Projector Calculations
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'audio'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('audio')}
        >
          Audio Calculations
        </button>
      </div>
      
      {/* Content Based on Active Tab */}
      {activeTab === 'projector' ? (
        <ProjectorCalculator onShowTutorial={onShowTutorial} />
      ) : (
        <AudioCalculator onShowTutorial={onShowTutorial} />
      )}
    </div>
  );
};

// ======================== PROJECTOR CALCULATOR ========================

const ProjectorCalculator: React.FC<ProjectorCalculatorProps> = ({ onShowTutorial }) => {
  // State for projector specifications
  const [projectorLumens, setProjectorLumens] = useState<number>(3000);
  const [lensType, setLensType] = useState<string>('standard');
  const [customThrowRatio, setCustomThrowRatio] = useState<number>(1.5);
  
  // State for screen and room parameters
  const [screenWidth, setScreenWidth] = useState<number>(3.0); // meters
  const [screenHeight, setScreenHeight] = useState<number>(1.69); // meters (16:9 aspect)
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [lightingCondition, setLightingCondition] = useState<string>('dim');
  const [screenGain, setScreenGain] = useState<number>(1.0);
  const [viewingDistance, setViewingDistance] = useState<number>(6.0); // meters
  
  // State for installation parameters
  const [ceilingHeight, setCeilingHeight] = useState<number>(3.0); // meters
  const [projectorOffset, setProjectorOffset] = useState<number>(0.5); // meters from ceiling
  const [screenCenterHeight, setScreenCenterHeight] = useState<number>(1.5); // meters from floor
  
  // State for calculated results
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [throwDistance, setThrowDistance] = useState<number>(0);
  const [minThrowDistance, setMinThrowDistance] = useState<number>(0);
  const [maxThrowDistance, setMaxThrowDistance] = useState<number>(0);
  const [requiredLumens, setRequiredLumens] = useState<number>(0);
  const [actualBrightness, setActualBrightness] = useState<number>(0);
  const [isLumensAdequate, setIsLumensAdequate] = useState<boolean>(false);
  const [keystoneAngle, setKeystoneAngle] = useState<number>(0);
  const [recommendedViewingDistance, setRecommendedViewingDistance] = useState<{min: number, max: number}>({min: 0, max: 0});
  const [isViewingDistanceOptimal, setIsViewingDistanceOptimal] = useState<boolean>(false);

  // Update screen dimensions when aspect ratio changes
  useEffect(() => {
    if (aspectRatio === '16:9') {
      setScreenHeight(screenWidth * 9 / 16);
    } else if (aspectRatio === '4:3') {
      setScreenHeight(screenWidth * 3 / 4);
    } else if (aspectRatio === '16:10') {
      setScreenHeight(screenWidth * 10 / 16);
    }
  }, [screenWidth, aspectRatio]);

  // Perform calculations when inputs change
  useEffect(() => {
    const selectedLens = PROJECTOR_LENS_TYPES.find(lens => lens.value === lensType);
    const lighting = LIGHTING_CONDITIONS.find(light => light.value === lightingCondition);
    
    if (!selectedLens || !lighting) return;

    // Calculate throw distances
    const throwRatio = lensType === 'custom' ? customThrowRatio : (selectedLens.minRatio + selectedLens.maxRatio) / 2;
    const minThrow = selectedLens.minRatio * screenWidth;
    const maxThrow = selectedLens.maxRatio * screenWidth;
    const actualThrow = throwRatio * screenWidth;

    setThrowDistance(actualThrow);
    setMinThrowDistance(minThrow);
    setMaxThrowDistance(maxThrow);

    // Calculate screen area and required lumens
    const screenArea = screenWidth * screenHeight; // m²
    const screenAreaFt2 = screenArea * 10.764; // Convert to ft²
    
    // Base lumen requirement: 16 lumens per ft² for 16 foot-lamberts
    const baseLumensPerFt2 = 16;
    const requiredLumensCalculated = baseLumensPerFt2 * screenAreaFt2 * lighting.multiplier / screenGain;
    
    setRequiredLumens(requiredLumensCalculated);

    // Calculate actual brightness on screen
    const actualBrightnessCalculated = (projectorLumens * screenGain) / screenAreaFt2;
    setActualBrightness(actualBrightnessCalculated);
    setIsLumensAdequate(projectorLumens >= requiredLumensCalculated);

    // Calculate keystone angle
    const projectorHeight = ceilingHeight - projectorOffset;
    const heightDifference = projectorHeight - screenCenterHeight;
    const angle = Math.atan(heightDifference / actualThrow) * (180 / Math.PI);
    setKeystoneAngle(Math.abs(angle));

    // Calculate recommended viewing distances (SMPTE standards)
    const minViewingDist = screenHeight * 3; // 3H minimum
    const maxViewingDist = screenHeight * 6; // 6H maximum
    setRecommendedViewingDistance({min: minViewingDist, max: maxViewingDist});
    setIsViewingDistanceOptimal(viewingDistance >= minViewingDist && viewingDistance <= maxViewingDist);

    setCalculationPerformed(true);
  }, [projectorLumens, lensType, customThrowRatio, screenWidth, screenHeight, lightingCondition, screenGain, 
      viewingDistance, ceilingHeight, projectorOffset, screenCenterHeight]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Projector Specifications</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Projector Brightness (ANSI Lumens)
          </label>
          <input
            type="number"
            min="100"
            value={projectorLumens}
            onChange={(e) => setProjectorLumens(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lens Type
          </label>
          <select
            value={lensType}
            onChange={(e) => setLensType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {PROJECTOR_LENS_TYPES.map(lens => (
              <option key={lens.value} value={lens.value}>
                {lens.label} ({lens.minRatio} - {lens.maxRatio}:1)
              </option>
            ))}
          </select>
        </div>

        {lensType === 'custom' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Throw Ratio (Distance:Width)
            </label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={customThrowRatio}
              onChange={(e) => setCustomThrowRatio(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        )}

        <div className="border-t border-gray-300 my-4"></div>
        
        <h3 className="font-medium text-lg mb-4">Screen Parameters</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screen Width (m)
            </label>
            <input
              type="number"
              min="0.5"
              step="0.1"
              value={screenWidth}
              onChange={(e) => setScreenWidth(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="16:10">16:10 (WUXGA)</option>
              <option value="4:3">4:3 (Traditional)</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Screen Height (m) - Auto calculated
          </label>
          <input
            type="number"
            value={screenHeight.toFixed(2)}
            disabled
            className="w-full p-2 border rounded-md bg-gray-100"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Screen Gain
          </label>
          <select
            value={screenGain}
            onChange={(e) => setScreenGain(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          >
            {SCREEN_GAINS.map(gain => (
              <option key={gain.value} value={gain.value}>
                {gain.label}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h3 className="font-medium text-lg mb-4">Environment Parameters</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Lighting Condition
          </label>
          <select
            value={lightingCondition}
            onChange={(e) => setLightingCondition(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {LIGHTING_CONDITIONS.map(light => (
              <option key={light.value} value={light.value}>
                {light.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {LIGHTING_CONDITIONS.find(l => l.value === lightingCondition)?.description}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Viewing Distance (m)
          </label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={viewingDistance}
            onChange={(e) => setViewingDistance(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h3 className="font-medium text-lg mb-4">Installation Parameters</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ceiling Height (m)
            </label>
            <input
              type="number"
              min="2"
              step="0.1"
              value={ceilingHeight}
              onChange={(e) => setCeilingHeight(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projector Drop (m)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={projectorOffset}
              onChange={(e) => setProjectorOffset(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Screen Center Height (m)
          </label>
          <input
            type="number"
            min="0.5"
            step="0.1"
            value={screenCenterHeight}
            onChange={(e) => setScreenCenterHeight(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!calculationPerformed ? (
          <div className="text-center py-8 text-gray-500">
            <p>Results will appear automatically as you adjust the parameters</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Throw Distance Analysis</h4>
              <div className="bg-white p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calculated Throw Distance</p>
                    <p className="text-lg font-bold text-blue-600">{throwDistance.toFixed(2)} m</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Throw Range</p>
                    <p className="font-medium">{minThrowDistance.toFixed(2)} - {maxThrowDistance.toFixed(2)} m</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Keystone Angle</p>
                    <p className={`font-medium ${keystoneAngle > 30 ? 'text-red-600' : keystoneAngle > 15 ? 'text-orange-600' : 'text-green-600'}`}>
                      {keystoneAngle.toFixed(1)}° {keystoneAngle > 30 ? '(Excessive)' : keystoneAngle > 15 ? '(High)' : '(Good)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Projector Height</p>
                    <p className="font-medium">{(ceilingHeight - projectorOffset).toFixed(2)} m</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Brightness Analysis</h4>
              <div className="bg-white p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Required Lumens</p>
                    <p className="text-lg font-bold text-gray-800">{Math.round(requiredLumens)} ANSI</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available Lumens</p>
                    <p className={`text-lg font-bold ${isLumensAdequate ? 'text-green-600' : 'text-red-600'}`}>
                      {projectorLumens} ANSI {isLumensAdequate ? '✓' : '✗'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Screen Brightness</p>
                    <p className="font-medium">{actualBrightness.toFixed(1)} ft-L</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Screen Area</p>
                    <p className="font-medium">{(screenWidth * screenHeight).toFixed(1)} m²</p>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-md ${isLumensAdequate ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                <p className={`font-medium ${isLumensAdequate ? 'text-green-700' : 'text-red-700'}`}>
                  {isLumensAdequate 
                    ? 'ADEQUATE ✓ Projector brightness is sufficient'
                    : 'INSUFFICIENT ✗ Projector brightness is inadequate'}
                </p>
                <p className="text-sm mt-1">
                  {isLumensAdequate 
                    ? `Excess capacity: ${Math.round(projectorLumens - requiredLumens)} lumens`
                    : `Shortfall: ${Math.round(requiredLumens - projectorLumens)} lumens needed`}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Viewing Distance Analysis</h4>
              <div className="bg-white p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Distance</p>
                    <p className={`text-lg font-bold ${isViewingDistanceOptimal ? 'text-green-600' : 'text-orange-600'}`}>
                      {viewingDistance.toFixed(1)} m {isViewingDistanceOptimal ? '✓' : '⚠'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recommended Range</p>
                    <p className="font-medium">
                      {recommendedViewingDistance.min.toFixed(1)} - {recommendedViewingDistance.max.toFixed(1)} m
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-md ${isViewingDistanceOptimal ? 'bg-green-100 border-green-300' : 'bg-orange-100 border-orange-300'} border`}>
                <p className={`font-medium ${isViewingDistanceOptimal ? 'text-green-700' : 'text-orange-700'}`}>
                  {isViewingDistanceOptimal 
                    ? 'OPTIMAL ✓ Viewing distance follows SMPTE standards'
                    : 'SUBOPTIMAL ⚠ Viewing distance outside recommended range'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Installation Summary</h4>
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Screen Size</td>
                    <td className="px-3 py-2">{screenWidth.toFixed(1)}m × {screenHeight.toFixed(1)}m ({aspectRatio})</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Throw Distance</td>
                    <td className="px-3 py-2">{throwDistance.toFixed(2)}m (Range: {minThrowDistance.toFixed(1)}-{maxThrowDistance.toFixed(1)}m)</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Projector Position</td>
                    <td className="px-3 py-2">{(ceilingHeight - projectorOffset).toFixed(1)}m height, {keystoneAngle.toFixed(1)}° keystone</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Brightness</td>
                    <td className="px-3 py-2">{actualBrightness.toFixed(1)} ft-L on screen</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Viewing</td>
                    <td className="px-3 py-2">{viewingDistance.toFixed(1)}m distance (Rec: {recommendedViewingDistance.min.toFixed(1)}-{recommendedViewingDistance.max.toFixed(1)}m)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Graphical Previews */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-4">Installation Visualization</h4>
              
              <div className="grid grid-cols-1 gap-4 mb-4">
                <ProjectorSideView
                  throwDistance={throwDistance}
                  screenWidth={screenWidth}
                  screenHeight={screenHeight}
                  ceilingHeight={ceilingHeight}
                  projectorOffset={projectorOffset}
                  screenCenterHeight={screenCenterHeight}
                  keystoneAngle={keystoneAngle}
                  roomLength={throwDistance + 2} // Estimated room length
                  roomWidth={screenWidth + 2} // Not used in side view
                />
                
                <ProjectorTopView
                  throwDistance={throwDistance}
                  screenWidth={screenWidth}
                  screenHeight={screenHeight}
                  ceilingHeight={ceilingHeight}
                  projectorOffset={projectorOffset}
                  screenCenterHeight={screenCenterHeight}
                  keystoneAngle={keystoneAngle}
                  roomLength={throwDistance + 2}
                  roomWidth={screenWidth + 2}
                />
              </div>
            </div>

            <div className="mt-6 bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Installation Guidelines</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Keystone correction should be minimized (&lt;15°) for best image quality</li>
                <li>SMPTE recommends viewing distance between 3H and 6H (H = screen height)</li>
                <li>Screen brightness should be 12-16 foot-lamberts for optimal viewing</li>
                <li>Consider ambient light control for better contrast ratios</li>
                <li>Allow adequate ventilation clearance around projector</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ======================== AUDIO CALCULATOR ========================

const AudioCalculator: React.FC<AudioCalculatorProps> = ({ onShowTutorial }) => {
  // State for room parameters
  const [roomLength, setRoomLength] = useState<number>(12); // meters
  const [roomWidth, setRoomWidth] = useState<number>(8); // meters
  const [roomHeight, setRoomHeight] = useState<number>(3); // meters
  const [audienceCapacity, setAudienceCapacity] = useState<number>(100);
  
  // State for speaker specifications
  const [speakerPower, setSpeakerPower] = useState<number>(500); // Watts RMS
  const [speakerSensitivity, setSpeakerSensitivity] = useState<number>(98); // dB/W/m
  const [speakerPattern, setSpeakerPattern] = useState<string>('point');
  const [numberOfSpeakers, setNumberOfSpeakers] = useState<number>(2);
  
  // State for audio requirements
  const [targetSPL, setTargetSPL] = useState<number>(85); // dB
  const [headroom, setHeadroom] = useState<number>(20); // dB
  const [backgroundNoise, setBackgroundNoise] = useState<number>(40); // dB
  
  // State for cable calculations
  const [cableLength, setCableLength] = useState<number>(50); // meters
  const [cableType, setCableType] = useState<string>('xlr_balanced');
  const [signalLevel, setSignalLevel] = useState<string>('line');
  
  // State for calculated results
  const [calculationPerformed, setCalculationPerformed] = useState<boolean>(false);
  const [maxSPL, setMaxSPL] = useState<number>(0);
  const [coverageArea, setCoverageArea] = useState<number>(0);
  const [powerRequirement, setPowerRequirement] = useState<number>(0);
  const [signalToNoise, setSignalToNoise] = useState<number>(0);
  const [isCoverageAdequate, setIsCoverageAdequate] = useState<boolean>(false);
  const [isPowerAdequate, setIsPowerAdequate] = useState<boolean>(false);
  const [maxCableLength, setMaxCableLength] = useState<number>(0);
  const [isCableLengthOK, setIsCableLengthOK] = useState<boolean>(false);

  // Cable specifications
  const cableSpecs = {
    'xlr_balanced': { maxLength: 100, description: 'XLR Balanced Audio' },
    'xlr_unbalanced': { maxLength: 30, description: 'XLR Unbalanced Audio' },
    'speaker_cable': { maxLength: 50, description: 'Speaker Cable (Low Impedance)' },
    'cat6_audio': { maxLength: 100, description: 'CAT6 Audio over IP' },
    'fiber_audio': { maxLength: 2000, description: 'Fiber Optic Audio' }
  };

  // Signal level specifications
  const signalLevels = {
    'mic': { level: -40, description: 'Microphone Level' },
    'line': { level: 0, description: 'Line Level' },
    'speaker': { level: 20, description: 'Speaker Level' }
  };

  // Perform calculations when inputs change
  useEffect(() => {
    const roomArea = roomLength * roomWidth;
    const selectedPattern = SPEAKER_PATTERNS.find(p => p.value === speakerPattern);
    const selectedCable = cableSpecs[cableType as keyof typeof cableSpecs];
    const selectedSignal = signalLevels[signalLevel as keyof typeof signalLevels];
    
    if (!selectedPattern || !selectedCable || !selectedSignal) return;

    // Calculate maximum SPL at 1 meter
    // SPL = Sensitivity + 10*log10(Power)
    const maxSPLAt1m = speakerSensitivity + 10 * Math.log10(speakerPower);
    setMaxSPL(maxSPLAt1m);

    // Calculate coverage area per speaker (rough estimation)
    const coverageAngle = selectedPattern.coverage;
    const maxDistance = Math.sqrt(roomArea / numberOfSpeakers);
    const coverageAreaPerSpeaker = Math.PI * Math.pow(maxDistance, 2) * (coverageAngle / 360);
    const totalCoverageArea = coverageAreaPerSpeaker * numberOfSpeakers;
    setCoverageArea(totalCoverageArea);
    setIsCoverageAdequate(totalCoverageArea >= roomArea);

    // Calculate required power for target SPL
    // Assuming average listening distance
    const avgListeningDistance = Math.sqrt(roomArea) / 2;
    const distanceLoss = 20 * Math.log10(avgListeningDistance); // 6dB per doubling of distance
    const requiredSPLAt1m = targetSPL + headroom + distanceLoss;
    const requiredPowerPerSpeaker = Math.pow(10, (requiredSPLAt1m - speakerSensitivity) / 10);
    const totalRequiredPower = requiredPowerPerSpeaker * numberOfSpeakers;
    setPowerRequirement(totalRequiredPower);
    setIsPowerAdequate(speakerPower * numberOfSpeakers >= totalRequiredPower);

    // Calculate signal-to-noise ratio
    const snr = targetSPL - backgroundNoise;
    setSignalToNoise(snr);

    // Calculate cable length limits
    const maxCableLengthValue = selectedCable.maxLength;
    setMaxCableLength(maxCableLengthValue);
    setIsCableLengthOK(cableLength <= maxCableLengthValue);

    setCalculationPerformed(true);
  }, [roomLength, roomWidth, roomHeight, audienceCapacity, speakerPower, speakerSensitivity, 
      speakerPattern, numberOfSpeakers, targetSPL, headroom, backgroundNoise, 
      cableLength, cableType, signalLevel]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Room Parameters</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Length (m)
            </label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={roomLength}
              onChange={(e) => setRoomLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Width (m)
            </label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={roomWidth}
              onChange={(e) => setRoomWidth(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Height (m)
            </label>
            <input
              type="number"
              min="2"
              step="0.1"
              value={roomHeight}
              onChange={(e) => setRoomHeight(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience Capacity
            </label>
            <input
              type="number"
              min="1"
              value={audienceCapacity}
              onChange={(e) => setAudienceCapacity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h3 className="font-medium text-lg mb-4">Speaker Specifications</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speaker Power (W RMS)
            </label>
            <input
              type="number"
              min="10"
              value={speakerPower}
              onChange={(e) => setSpeakerPower(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sensitivity (dB/W/m)
            </label>
            <input
              type="number"
              min="80"
              max="120"
              value={speakerSensitivity}
              onChange={(e) => setSpeakerSensitivity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speaker Pattern
            </label>
            <select
              value={speakerPattern}
              onChange={(e) => setSpeakerPattern(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {SPEAKER_PATTERNS.map(pattern => (
                <option key={pattern.value} value={pattern.value}>
                  {pattern.label} ({pattern.coverage}°)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Speakers
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numberOfSpeakers}
              onChange={(e) => setNumberOfSpeakers(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h3 className="font-medium text-lg mb-4">Audio Requirements</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target SPL (dB)
            </label>
            <input
              type="number"
              min="60"
              max="120"
              value={targetSPL}
              onChange={(e) => setTargetSPL(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Headroom (dB)
            </label>
            <input
              type="number"
              min="6"
              max="30"
              value={headroom}
              onChange={(e) => setHeadroom(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Background Noise (dB)
          </label>
          <input
            type="number"
            min="20"
            max="80"
            value={backgroundNoise}
            onChange={(e) => setBackgroundNoise(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="border-t border-gray-300 my-4"></div>
        
        <h3 className="font-medium text-lg mb-4">Cable Analysis</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cable Length (m)
          </label>
          <input
            type="number"
            min="1"
            value={cableLength}
            onChange={(e) => setCableLength(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cable Type
            </label>
            <select
              value={cableType}
              onChange={(e) => setCableType(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {Object.entries(cableSpecs).map(([key, spec]) => (
                <option key={key} value={key}>
                  {spec.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signal Level
            </label>
            <select
              value={signalLevel}
              onChange={(e) => setSignalLevel(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {Object.entries(signalLevels).map(([key, spec]) => (
                <option key={key} value={key}>
                  {spec.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        {!calculationPerformed ? (
          <div className="text-center py-8 text-gray-500">
            <p>Results will appear automatically as you adjust the parameters</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Room Analysis</h4>
              <div className="bg-white p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Room Volume</p>
                    <p className="text-lg font-bold text-blue-600">{(roomLength * roomWidth * roomHeight).toFixed(1)} m³</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Floor Area</p>
                    <p className="font-medium">{(roomLength * roomWidth).toFixed(1)} m²</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Person Density</p>
                    <p className="font-medium">{(audienceCapacity / (roomLength * roomWidth)).toFixed(1)} /m²</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">RT60 Estimate</p>
                    <p className="font-medium">{(0.16 * (roomLength * roomWidth * roomHeight) / (roomLength * roomWidth * 0.3)).toFixed(1)} sec</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Speaker Performance</h4>
              <div className="bg-white p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Max SPL (per speaker)</p>
                    <p className="text-lg font-bold text-gray-800">{maxSPL.toFixed(1)} dB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Coverage Area</p>
                    <p className={`font-medium ${isCoverageAdequate ? 'text-green-600' : 'text-red-600'}`}>
                      {coverageArea.toFixed(1)} m² {isCoverageAdequate ? '✓' : '✗'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Required Power</p>
                    <p className="font-medium">{powerRequirement.toFixed(0)} W total</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available Power</p>
                    <p className={`font-medium ${isPowerAdequate ? 'text-green-600' : 'text-red-600'}`}>
                      {speakerPower * numberOfSpeakers} W {isPowerAdequate ? '✓' : '✗'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-md ${isPowerAdequate && isCoverageAdequate ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                <p className={`font-medium ${isPowerAdequate && isCoverageAdequate ? 'text-green-700' : 'text-red-700'}`}>
                  {isPowerAdequate && isCoverageAdequate
                    ? 'ADEQUATE ✓ Speaker system meets requirements'
                    : 'INADEQUATE ✗ Speaker system needs adjustment'}
                </p>
                <p className="text-sm mt-1">
                  {!isPowerAdequate && `Power shortfall: ${Math.round(powerRequirement - (speakerPower * numberOfSpeakers))} W`}
                  {!isCoverageAdequate && `Coverage shortfall: ${Math.round((roomLength * roomWidth) - coverageArea)} m²`}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Audio Quality Analysis</h4>
              <div className="bg-white p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Target SPL</p>
                    <p className="text-lg font-bold text-blue-600">{targetSPL} dB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">With Headroom</p>
                    <p className="font-medium">{targetSPL + headroom} dB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Background Noise</p>
                    <p className="font-medium">{backgroundNoise} dB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Signal-to-Noise</p>
                    <p className={`font-medium ${signalToNoise >= 15 ? 'text-green-600' : signalToNoise >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                      {signalToNoise.toFixed(1)} dB {signalToNoise >= 15 ? '(Excellent)' : signalToNoise >= 10 ? '(Good)' : '(Poor)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">Cable Analysis</h4>
              <div className="bg-white p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Cable Length</p>
                    <p className={`text-lg font-bold ${isCableLengthOK ? 'text-green-600' : 'text-red-600'}`}>
                      {cableLength} m {isCableLengthOK ? '✓' : '✗'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Maximum Length</p>
                    <p className="font-medium">{maxCableLength} m</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cable Type</p>
                    <p className="font-medium">{cableSpecs[cableType as keyof typeof cableSpecs]?.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Signal Level</p>
                    <p className="font-medium">{signalLevels[signalLevel as keyof typeof signalLevels]?.description}</p>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-md ${isCableLengthOK ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                <p className={`font-medium ${isCableLengthOK ? 'text-green-700' : 'text-red-700'}`}>
                  {isCableLengthOK
                    ? 'ACCEPTABLE ✓ Cable length is within specifications'
                    : 'EXCESSIVE ✗ Cable length exceeds recommendations'}
                </p>
                <p className="text-sm mt-1">
                  {!isCableLengthOK && `Exceeds maximum by: ${cableLength - maxCableLength} m`}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-2">System Summary</h4>
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Room</td>
                    <td className="px-3 py-2">{roomLength}×{roomWidth}×{roomHeight}m ({audienceCapacity} capacity)</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Speakers</td>
                    <td className="px-3 py-2">{numberOfSpeakers}× {speakerPower}W, {maxSPL.toFixed(1)}dB max</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Coverage</td>
                    <td className="px-3 py-2">{coverageArea.toFixed(1)}m² of {(roomLength * roomWidth).toFixed(1)}m² required</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Audio Quality</td>
                    <td className="px-3 py-2">{targetSPL}dB target, {signalToNoise.toFixed(1)}dB S/N ratio</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium">Cables</td>
                    <td className="px-3 py-2">{cableLength}m {cableSpecs[cableType as keyof typeof cableSpecs]?.description}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Audio Visualization */}
            <div className="mb-6">
              <h4 className="font-medium text-blue-800 mb-4">Audio Coverage Visualization</h4>
              
              <div className="grid grid-cols-1 gap-4 mb-4">
                <AudioCoverageVisualization
                  roomLength={roomLength}
                  roomWidth={roomWidth}
                  numberOfSpeakers={numberOfSpeakers}
                  speakerPattern={speakerPattern}
                  maxSPL={maxSPL}
                  coverageArea={coverageArea}
                />
                
                <SPLHeatMap
                  roomLength={roomLength}
                  roomWidth={roomWidth}
                  numberOfSpeakers={numberOfSpeakers}
                  speakerPattern={speakerPattern}
                  maxSPL={maxSPL}
                  coverageArea={coverageArea}
                />
              </div>
            </div>

            <div className="mt-6 bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Audio Design Guidelines</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Target SPL: Speech 75-85dB, Music 95-105dB, Cinema 85dB average</li>
                <li>Maintain 15dB minimum signal-to-noise ratio for speech intelligibility</li>
                <li>Use 20dB headroom for dynamic range and safety margins</li>
                <li>Speaker spacing should provide 6dB overlap at crossover points</li>
                <li>Consider acoustic treatment for RT60 control (0.6-1.2s for speech)</li>
                <li>Balanced XLR cables preferred for runs over 15 meters</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AudioVisualCalculator;