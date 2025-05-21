import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icons } from '../../components/Icons';

// Define props type for the component
interface PublicAddressCalculatorProps {
  onBack?: () => void; // Function to navigate back
  onShowTutorial?: () => void;
}

// The main Public Address Calculator component that coordinates the sub-calculators
const PublicAddressCalculator: React.FC<PublicAddressCalculatorProps> = ({ onBack, onShowTutorial }) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'coverage' | 'spl' | 'amplifier' | 'cable' | 'reverb'>('coverage');
  
  return (
    <div className="animate-fade-in">
      {/* Back Button - MODIFIED: Conditionally render if onBack is provided */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <Icons.ArrowLeft /> Back to Disciplines
        </button>
      )}

      {/* Tab Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Public Address System Sizing</h2>
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
      
        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'coverage'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('coverage')}
          >
            Speaker Coverage
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'spl'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('spl')}
          >
            Sound Pressure Level
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'amplifier'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('amplifier')}
          >
            Amplifier Power
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'cable'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('cable')}
          >
            Cable Loss
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'reverb'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('reverb')}
          >
            Reverberation Time
          </button>
        </div>
        
        {/* Content Based on Active Tab */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {activeTab === 'coverage' && 'Speaker Coverage Calculator'}
              {activeTab === 'spl' && 'Sound Pressure Level Calculator'}
              {activeTab === 'amplifier' && 'Amplifier Power Calculator'}
              {activeTab === 'cable' && 'Cable Loss Calculator'}
              {activeTab === 'reverb' && 'Reverberation Time Calculator'}
            </h2>
          </div>

          {activeTab === 'coverage' && <SpeakerCoverageCalculator onShowTutorial={onShowTutorial} />}
          {activeTab === 'spl' && <SplCalculator onShowTutorial={onShowTutorial} />}
          {activeTab === 'amplifier' && <AmplifierPowerCalculator onShowTutorial={onShowTutorial} />}
          {activeTab === 'cable' && <CableLossCalculator onShowTutorial={onShowTutorial} />}
          {activeTab === 'reverb' && <ReverbTimeCalculator onShowTutorial={onShowTutorial} />}
        </div>
        {/* Tutorial Modal would be rendered here based on showTutorial state, if implemented */}
        </div>
      </div>
  );
};

// ======================== SPEAKER COVERAGE CALCULATOR ========================

interface SpeakerCoverageCalculatorProps {
  onShowTutorial?: () => void;
}

// Speaker types with default dispersion angles
const SPEAKER_TYPES_COVERAGE = [
  { value: 'ceiling', label: 'Ceiling Speaker', defaultDispersion: 90 },
  { value: 'horn', label: 'Horn Speaker', defaultDispersion: 60, isWallMounted: true },
  { value: 'column', label: 'Column Speaker', defaultDispersion: 120 },
  { value: 'pendant', label: 'Pendant Speaker', defaultDispersion: 180 },
  { value: 'wall', label: 'Wall-Mount Speaker', defaultDispersion: 90, isWallMounted: true },
  { value: 'custom', label: 'Custom Speaker', defaultDispersion: 90 }
];

// Mounting environments with coverage factors
const MOUNTING_ENVIRONMENTS = [
  { value: 'standard', label: 'Standard (Indoor)', factor: 1.0 },
  { value: 'highCeiling', label: 'High Ceiling (10m+)', factor: 0.9 },
  { value: 'outdoor', label: 'Outdoor', factor: 0.85 },
  { value: 'highNoise', label: 'High Noise Environment', factor: 0.8 },
  { value: 'reverberant', label: 'Highly Reverberant Space', factor: 0.75 }
];

// Standard ceiling heights with option for custom input
const CEILING_HEIGHTS = [
  { value: 2.4, label: '2.4m (8ft) - Standard Office' },
  { value: 3, label: '3.0m (10ft) - Commercial Space' },
  { value: 3.6, label: '3.6m (12ft) - Large Retail' },
  { value: 4.5, label: '4.5m (15ft) - Small Warehouse' },
  { value: 6, label: '6.0m (20ft) - Industrial/Gym' },
  { value: 9, label: '9.0m (30ft) - Large Warehouse' },
  { value: 12, label: '12.0m (40ft) - Terminal/Hangar' }
];

// Standard speaker layout patterns with descriptions
const LAYOUT_PATTERNS = [
  { 
    value: 'noOverlap',
    label: 'No Overlap (2r)',
    description: 'Spacing = 2r. Coverage areas meet but don\'t overlap. Used for low-cost background music.'
  },
  { 
    value: 'minimumOverlap',
    label: 'Minimum Overlap (r√2/r√3)',
    description: 'Spacing = r√2 (square) or r√3 (hex). Just enough overlap to avoid gaps in coverage.'
  },
  { 
    value: 'edgeToCenter',
    label: 'Edge-to-Center (r)',
    description: 'Spacing = r. Highest density for best performance in poor acoustics or high noise.'
  },
  { 
    value: 'linear', 
    label: 'Linear Pattern', 
    description: 'Speakers arranged in lines along the room'
  },
  { 
    value: 'perimeter', 
    label: 'Perimeter Pattern', 
    description: 'Speakers placed around the edges of the room'
  },
];

// Wall options for wall-mounted speakers
const WALL_POSITIONS = [
  { value: 'north', label: 'North Wall (Top)', description: 'Top wall in the layout' },
  { value: 'east', label: 'East Wall (Right)', description: 'Right wall in the layout' },
  { value: 'south', label: 'South Wall (Bottom)', description: 'Bottom wall in the layout' },
  { value: 'west', label: 'West Wall (Left)', description: 'Left wall in the layout' }
];

// Grid pattern options
const GRID_PATTERNS = [
  { value: 'square', label: 'Square Grid', description: 'Speakers arranged in a square pattern' },
  { value: 'hexagonal', label: 'Hexagonal Grid', description: 'Speakers arranged in a hexagonal pattern' }
];

interface SpeakerPosition {
  x: number;
  y: number;
  z?: number; // For 3D positioning (height)
  tiltAngle?: number; // For wall-mounted speakers
  wallPosition?: string; // For wall-mounted speakers
  
  // New properties for wall-mounted speaker projection
  projectionCenterDist?: number; // Distance from wall to projection center
  projectedRadiusX?: number; // Semi-axis in X direction (horizontal)
  projectedRadiusY?: number; // Semi-axis in Y direction (vertical)
}

interface GridConfig {
  rows: number;
  cols: number;
  spacingX: number;
  spacingY: number;
  pattern: string; // 'square' or 'hexagonal'
}

interface SpeakerLayoutVisualizerProps {
  roomLength: number;
  roomWidth: number;
  roomHeight: number;
  speakerPositions: SpeakerPosition[];
  coverageRadius: number; // actual radius in meters (for ceiling speakers)
  mountingType: string; // 'ceiling' or 'wall'
  canvasWidth?: number;
  canvasHeight?: number;
  gridPattern?: string;
}

// Visualizer component for showing speaker layout
const SpeakerLayoutVisualizer: React.FC<SpeakerLayoutVisualizerProps> = ({
  roomLength,
  roomWidth,
  roomHeight,
  speakerPositions,
  coverageRadius,
  mountingType,
  canvasWidth = 400,
  gridPattern = 'hexagonal',
}) => {
  if (roomLength <= 0 || roomWidth <= 0) {
    return <p className="text-sm text-gray-500">Room dimensions must be positive.</p>;
  }

  // Maintain aspect ratio for the canvas
  const aspectRatio = roomWidth / roomLength;
  const actualCanvasHeight = canvasWidth * aspectRatio;

  // Scale everything to fit the canvas
  const scaleFactor = Math.min(canvasWidth / roomLength, actualCanvasHeight / roomWidth);
  const scaledRadius = coverageRadius * scaleFactor;

  return (
    <div className="bg-gray-200 p-2 rounded flex justify-center items-center" style={{ minHeight: actualCanvasHeight + 20 }}>
      <svg width={canvasWidth} height={actualCanvasHeight} viewBox={`0 0 ${canvasWidth} ${actualCanvasHeight}`} className="border border-gray-400 bg-white">
        {/* Room Outline */}
        <rect x="0" y="0" width={canvasWidth} height={actualCanvasHeight} fill="none" stroke="#A0A0A0" strokeWidth="1" />

        {/* Grid lines for reference (light gray) */}
        {gridPattern === 'square' && Array.from({ length: 10 }).map((_, i) => (
          <React.Fragment key={`grid-${i}`}>
            <line 
              x1={0} 
              y1={i * actualCanvasHeight / 10} 
              x2={canvasWidth} 
              y2={i * actualCanvasHeight / 10} 
              stroke="#e5e5e5" 
              strokeWidth="0.5" 
            />
            <line 
              x1={i * canvasWidth / 10} 
              y1={0} 
              x2={i * canvasWidth / 10} 
              y2={actualCanvasHeight} 
              stroke="#e5e5e5" 
              strokeWidth="0.5" 
            />
          </React.Fragment>
        ))}

        {/* Draw speaker coverage */}
        {speakerPositions.map((pos, index) => {
          // Scale coordinates properly for speaker position
          const sx = pos.x * scaleFactor;
          const sy = pos.y * scaleFactor;
          
          // For wall-mounted speakers, draw differently with oval coverage
          if (mountingType === 'wall' && pos.wallPosition && pos.projectionCenterDist !== undefined) {
            // Calculate center of the ellipse (at the projection center)
            let ellipseCX = sx;
            let ellipseCY = sy;
            
            // Scale the projection parameters
            const scaledProjectionCenterDist = pos.projectionCenterDist * scaleFactor;
            const scaledProjectedRadiusX = (pos.projectedRadiusX || coverageRadius) * scaleFactor;
            const scaledProjectedRadiusY = (pos.projectedRadiusY || coverageRadius) * scaleFactor;
            
            // Calculate the center of the coverage ellipse based on wall position
            switch(pos.wallPosition) {
              case 'north': // Top wall
                ellipseCY = sy + scaledProjectionCenterDist; // Projection extends downward
                break;
              case 'east': // Right wall
                ellipseCX = sx - scaledProjectionCenterDist; // Projection extends leftward
                break;
              case 'south': // Bottom wall
                ellipseCY = sy - scaledProjectionCenterDist; // Projection extends upward
                break;
              case 'west': // Left wall
                ellipseCX = sx + scaledProjectionCenterDist; // Projection extends rightward
                break;
            }
            
            return (
              <g key={index}>
                {/* Oval coverage area */}
                {isFinite(scaledProjectedRadiusX) && scaledProjectedRadiusX > 0 && 
                 isFinite(scaledProjectedRadiusY) && scaledProjectedRadiusY > 0 && (
                  <ellipse
                    cx={ellipseCX}
                    cy={ellipseCY}
                    rx={scaledProjectedRadiusX}
                    ry={scaledProjectedRadiusY}
                    fill="rgba(59, 130, 246, 0.15)" // Lighter blue for wall speaker coverage
                    stroke="rgba(37, 99, 235, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="4,2" // Dashed line to indicate projection
                  />
                )}
                
                {/* Speaker direction line (from speaker location to ellipse center) */}
                <path
                  d={`M ${sx} ${sy} L ${ellipseCX} ${ellipseCY}`}
                  stroke="rgb(37, 99, 235)"
                  strokeWidth="2"
                />
                
                {/* Speaker marker at wall position */}
                <circle
                  cx={sx}
                  cy={sy}
                  r="4" // Wall speaker marker
                  fill="rgb(37, 99, 235)"
                  stroke="#fff"
                  strokeWidth="1"
                />
              </g>
            );
          }
          
          // Default ceiling-mounted speaker with circular coverage
          return (
            <g key={index}>
              {isFinite(scaledRadius) && scaledRadius > 0 && (
                <circle
                  cx={sx}
                  cy={sy}
                  r={scaledRadius}
                  fill="rgba(59, 130, 246, 0.2)" // blue-500 with opacity
                  stroke="rgba(37, 99, 235, 0.4)" // blue-600 with opacity
                  strokeWidth="1"
                />
              )}
              <circle
                cx={sx}
                cy={sy}
                r="3" // Center marker
                fill="rgb(37, 99, 235)" // blue-600
              />
            </g>
          );
        })}
        
        {/* Scale indicator */}
        <g transform={`translate(10, ${actualCanvasHeight - 20})`}>
          <line x1="0" y1="0" x2={scaleFactor * 5} y2="0" stroke="#666" strokeWidth="2" />
          <text x={scaleFactor * 2.5} y="-5" textAnchor="middle" fontSize="10" fill="#666">5m</text>
        </g>
      </svg>
    </div>
  );
};

// Main calculator component
const SpeakerCoverageCalculator: React.FC<SpeakerCoverageCalculatorProps> = ({ onShowTutorial }) => {
  // Room dimensions
  const [roomLength, setRoomLength] = useState<number>(10);
  const [roomWidth, setRoomWidth] = useState<number>(15);
  
  // Ceiling/room height handling
  const [ceilingHeight, setCeilingHeight] = useState<number | string>(2.4);
  const [customCeilingHeightValue, setCustomCeilingHeightValue] = useState<number>(3);
  
  // Speaker configuration
  const [speakerType, setSpeakerType] = useState<string>('ceiling');
  const [dispersionAngle, setDispersionAngle] = useState<number>(90);
  const [mountingHeight, setMountingHeight] = useState<number>(2.4);
  const [listeningHeight, setListeningHeight] = useState<number>(1.2);
  const [mountingEnvironment, setMountingEnvironment] = useState<string>('standard');

  // Wall-mount specific settings
  const [mountingType, setMountingType] = useState<string>('ceiling');
  const [tiltAngle, setTiltAngle] = useState<number>(45);
  const [wallPosition, setWallPosition] = useState<string>('north');
  
  // Grid pattern selection - default to hexagonal
  const [gridPattern, setGridPattern] = useState<string>('hexagonal');

  // Calculation results
  const [coverageRadius, setCoverageRadius] = useState<number>(0);
  const [coverageArea, setCoverageArea] = useState<number>(0);
  const [recommendedSpeakers, setRecommendedSpeakers] = useState<number>(0);
  const [recommendedSpacing, setRecommendedSpacing] = useState<number>(0);
  const [coverageGapWarning, setCoverageGapWarning] = useState<boolean>(false);
  const [overlapWarning, setOverlapWarning] = useState<boolean>(false);
  const [layoutPattern, setLayoutPattern] = useState<string>('noOverlap'); // Default to no overlap

  // Generated speaker layout
  const [speakerPositions, setSpeakerPositions] = useState<SpeakerPosition[]>([]);
  const [gridConfig, setGridConfig] = useState<GridConfig>({ 
    rows: 0, 
    cols: 0, 
    spacingX: 0, 
    spacingY: 0,
    pattern: 'hexagonal'
  });

  // Update speaker type properties and mounting type
  useEffect(() => {
    const selectedSpeaker = SPEAKER_TYPES_COVERAGE.find(s => s.value === speakerType);
    if (selectedSpeaker && !isNaN(selectedSpeaker.defaultDispersion)) {
      setDispersionAngle(selectedSpeaker.defaultDispersion);
    }
    
    // Set mounting type based on speaker type (horn and wall are wall-mounted)
    if (selectedSpeaker?.isWallMounted) {
      setMountingType('wall');
    } else {
      setMountingType('ceiling');
    }
  }, [speakerType]);

  // Calculate effective ceiling height based on selection
  const effectiveCeilingHeight = useMemo(() => {
    return ceilingHeight === 'custom' ? customCeilingHeightValue : Number(ceilingHeight);
  }, [ceilingHeight, customCeilingHeightValue]);

  // Update mounting height when ceiling height changes
  useEffect(() => {
    if (effectiveCeilingHeight < mountingHeight) {
      setMountingHeight(effectiveCeilingHeight);
    }
  }, [effectiveCeilingHeight, mountingHeight]);

  // Main calculation effect
  useEffect(() => {
    // Validate inputs
    if (mountingHeight <= listeningHeight || roomLength <= 0 || roomWidth <= 0 || dispersionAngle <= 0 || !isFinite(dispersionAngle)) {
      setCoverageRadius(0);
      setCoverageArea(0);
      setRecommendedSpeakers(0);
      setRecommendedSpacing(0);
      setSpeakerPositions([]);
      setGridConfig({ rows: 0, cols: 0, spacingX: 0, spacingY: 0, pattern: gridPattern });
      setCoverageGapWarning(roomLength > 0 && roomWidth > 0);
      setOverlapWarning(false);
      return;
    }

    const envFactor = MOUNTING_ENVIRONMENTS.find(env => env.value === mountingEnvironment)?.factor || 1.0;
    const effectiveHeight = mountingHeight - listeningHeight;

    if (effectiveHeight <= 0) {
        setCoverageRadius(0);
        setCoverageArea(0);
        setRecommendedSpeakers(0);
        setRecommendedSpacing(0);
        setSpeakerPositions([]);
        setGridConfig({ rows: 0, cols: 0, spacingX: 0, spacingY: 0, pattern: gridPattern });
        setCoverageGapWarning(true);
        setOverlapWarning(false);
        return;
    }

    // Calculate coverage radius and projection parameters for wall or ceiling speakers
    let calculatedRadius: number;
    let projectionCenterDist: number = 0;
    let projectedRadiusX: number = 0;
    let projectedRadiusY: number = 0;
    
    if (mountingType === 'ceiling' || mountingType === 'pendant') {
      // Regular ceiling speaker calculation
      const angleInRadians = (dispersionAngle / 2) * (Math.PI / 180);
      
      if (angleInRadians <= 0) {
        calculatedRadius = 0;
      } else if (angleInRadians >= Math.PI / 2) {
        calculatedRadius = Infinity;
      } else {
        calculatedRadius = effectiveHeight * Math.tan(angleInRadians);
      }
    } else if (mountingType === 'wall') {
      // Improved wall speaker calculation that accounts for dispersion angle
      const dispersionRadians = (dispersionAngle / 2) * (Math.PI / 180);
      const tiltRadians = (tiltAngle * Math.PI) / 180;
      
      // Ensure tilt is valid and positive
      if (tiltRadians <= 0 || tiltRadians >= Math.PI/2) {
        calculatedRadius = 0;
      } else {
        // STEP 1: Calculate distance to where speaker axis intersects listening plane
        projectionCenterDist = effectiveHeight / Math.tan(tiltRadians);
        
        // STEP 2: Calculate distance along the speaker's tilted axis to the listening plane
        // This is used to find the proper cross-section of the cone
        const distAlongAxis = effectiveHeight / Math.sin(tiltRadians);
        
        // STEP 3: Calculate semi-minor axis (half-width of the coverage area)
        // This uses the standard cone projection geometry
        const semiMinorAxis = distAlongAxis * Math.tan(dispersionRadians);
        
        // STEP 4: Calculate semi-major axis (half-length of the coverage area)
        // For a tilted cone projection, we can use the following approach:
        // Calculate where the top and bottom edges of the cone intersect the listening plane
        
        // Make sure tilt angle is larger than dispersion angle to avoid negative tangent
        // This isn't physically realistic anyway (speaker would be pointing upward)
        if (tiltRadians > dispersionRadians) {
          // Angle from horizontal to top edge of cone (shallower angle)
          const topEdgeAngle = Math.max(0, tiltRadians - dispersionRadians);
          
          // Angle from horizontal to bottom edge of cone (steeper angle)
          const bottomEdgeAngle = Math.min(Math.PI/2, tiltRadians + dispersionRadians);
          
          // Distance from wall to furthest coverage point
          const farDistance = effectiveHeight / Math.tan(topEdgeAngle);
          
          // Distance from wall to nearest coverage point
          const nearDistance = effectiveHeight / Math.tan(bottomEdgeAngle);
          
          // Semi-major axis is half the distance between furthest and nearest points
          const semiMajorAxis = (farDistance - nearDistance) / 2;
          
          // For wallPosition 'north' or 'south', X is parallel to wall and Y is perpendicular
          // For wallPosition 'east' or 'west', Y is parallel to wall and X is perpendicular
          if (wallPosition === 'north' || wallPosition === 'south') {
            projectedRadiusX = semiMinorAxis; // Width (parallel to wall)
            projectedRadiusY = semiMajorAxis; // Depth (perpendicular to wall)
          } else {
            projectedRadiusX = semiMajorAxis; // Depth (perpendicular to wall)
            projectedRadiusY = semiMinorAxis; // Width (parallel to wall)
          }
          
          // Use an average radius for general calculations
          calculatedRadius = (semiMinorAxis + semiMajorAxis) / 2;
        } else {
          // Fallback for invalid angles
          calculatedRadius = effectiveHeight * Math.tan(dispersionRadians);
          projectedRadiusX = calculatedRadius;
          projectedRadiusY = calculatedRadius;
        }
      }
    } else {
      calculatedRadius = effectiveHeight * Math.tan((dispersionAngle / 2) * (Math.PI / 180));
    }

    // Apply environment factor to all radius calculations
    const adjustedRadius = calculatedRadius * envFactor;
    const adjustedProjectionCenterDist = projectionCenterDist * envFactor;
    const adjustedProjectedRadiusX = projectedRadiusX * envFactor;
    const adjustedProjectedRadiusY = projectedRadiusY * envFactor;
    
    // Calculate coverage area based on projection type
    let calculatedArea: number;
    if (mountingType === 'wall') {
      // For wall speakers, use the elliptical area formula: π * a * b
      calculatedArea = Math.PI * adjustedProjectedRadiusX * adjustedProjectedRadiusY;
    } else {
      // For ceiling speakers, use the circular area formula: π * r²
      calculatedArea = Math.PI * Math.pow(adjustedRadius, 2);
    }

    setCoverageRadius(adjustedRadius);
    setCoverageArea(calculatedArea);

    const roomArea = roomLength * roomWidth;
    let currentSpeakers = 0;

    if (calculatedArea === 0 || !isFinite(calculatedArea) || roomArea <= 0) {
      currentSpeakers = (calculatedArea === 0 && roomArea > 0) ? Infinity : 0;
      setRecommendedSpacing(0);
      setCoverageGapWarning(calculatedArea === 0 && roomArea > 0);
      setOverlapWarning(!isFinite(calculatedArea) && calculatedArea !==0);
      setSpeakerPositions([]);
      setGridConfig({ rows: 0, cols: 0, spacingX: 0, spacingY: 0, pattern: gridPattern });
      return;
    }

    // Adjust spacing based on layout pattern
    let spacing: number = 0;
    switch(layoutPattern) {
      case 'noOverlap':
        spacing = 2 * adjustedRadius; // No overlap = 2r
        break;
      case 'minimumOverlap':
        spacing = gridPattern === 'hexagonal' ? 
          adjustedRadius * Math.sqrt(3) : // For hexagonal grid
          adjustedRadius * Math.sqrt(2);  // For square grid
        break;
      case 'edgeToCenter':
        spacing = adjustedRadius; // Edge-to-center = r
        break;
      default:
        spacing = 0; // Will be calculated based on room and speaker count
    }
    
    // Estimate number of speakers based on fixed spacing pattern
    if (spacing > 0) {
      if (gridPattern === 'hexagonal') {
        // Estimate for hexagonal pattern
        const roomLengthUnits = Math.ceil(roomLength / spacing);
        const roomWidthUnits = Math.ceil(roomWidth / (spacing * 0.866)); // 0.866 = sin(60°)
        currentSpeakers = roomLengthUnits * roomWidthUnits;
      } else {
        // Square grid estimation
        const rows = Math.ceil(roomWidth / spacing);
        const cols = Math.ceil(roomLength / spacing);
        currentSpeakers = rows * cols;
      }
    } else {
      // For linear and perimeter layouts, estimate based on coverage area
      currentSpeakers = Math.ceil(roomArea / calculatedArea);
    }
    
    setRecommendedSpeakers(currentSpeakers);

    // Generate speaker layout
    let idealSpacing: number = spacing > 0 ? spacing : 0;
    let tempSpeakerPositions: SpeakerPosition[] = [];
    let tempGridConfig: GridConfig = { 
      rows: 0, 
      cols: 0, 
      spacingX: 0, 
      spacingY: 0,
      pattern: gridPattern
    };

    if (currentSpeakers > 0 && isFinite(currentSpeakers)) {
      // Generate speaker layout based on selected pattern
      if (layoutPattern === 'noOverlap' || 
          layoutPattern === 'minimumOverlap' || 
          layoutPattern === 'edgeToCenter') {
        
        if (gridPattern === 'hexagonal') {
          // Hexagonal grid layout with fixed spacing
          const horizontalSpacing = spacing;
          const verticalSpacing = spacing * 0.866; // sin(60°)
          
          const cols = Math.ceil(roomLength / horizontalSpacing) + 1;
          const rows = Math.ceil(roomWidth / verticalSpacing) + 1;
          
          tempGridConfig = { 
            rows, 
            cols, 
            spacingX: horizontalSpacing, 
            spacingY: verticalSpacing,
            pattern: 'hexagonal'
          };
          
          // Place speakers in hexagonal pattern
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              // Offset every other row
              const xOffset = r % 2 === 1 ? horizontalSpacing / 2 : 0;
              const x = c * horizontalSpacing + xOffset;
              const y = r * verticalSpacing;
              
              // Skip if outside room bounds
              if (x >= 0 && x <= roomLength && y >= 0 && y <= roomWidth) {
                if (mountingType === 'wall') {
                  // Wall-mounted speakers
                  let wallX = x;
                  let wallY = y;
                  
                  // Adjust position based on wall
                  switch(wallPosition) {
                    case 'north': // Top wall
                      wallY = 0;
                      break;
                    case 'east': // Right wall
                      wallX = roomLength;
                      break;
                    case 'south': // Bottom wall
                      wallY = roomWidth;
                      break;
                    case 'west': // Left wall
                      wallX = 0;
                      break;
                  }
                  
                  tempSpeakerPositions.push({
                    x: wallX,
                    y: wallY,
                    tiltAngle,
                    wallPosition,
                    // Add projection parameters
                    projectionCenterDist: adjustedProjectionCenterDist,
                    projectedRadiusX: adjustedProjectedRadiusX,
                    projectedRadiusY: adjustedProjectedRadiusY
                  });
                } else {
                  // Ceiling-mounted speakers
                  tempSpeakerPositions.push({ x, y });
                }
              }
            }
          }
        } else {
          // Square grid layout with fixed spacing
          const cols = Math.ceil(roomLength / spacing) + 1;
          const rows = Math.ceil(roomWidth / spacing) + 1;
          
          tempGridConfig = { 
            rows, 
            cols, 
            spacingX: spacing, 
            spacingY: spacing,
            pattern: 'square'
          };
          
          // Place speakers in grid
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const x = c * spacing;
              const y = r * spacing;
              
              // Skip if outside room bounds
              if (x >= 0 && x <= roomLength && y >= 0 && y <= roomWidth) {
                if (mountingType === 'wall') {
                  // Wall-mounted speakers
                  let wallX = x;
                  let wallY = y;
                  
                  // Adjust position based on wall
                  switch(wallPosition) {
                    case 'north': // Top wall
                      wallY = 0;
                      break;
                    case 'east': // Right wall
                      wallX = roomLength;
                      break;
                    case 'south': // Bottom wall
                      wallY = roomWidth;
                      break;
                    case 'west': // Left wall
                      wallX = 0;
                      break;
                  }
                  
                  tempSpeakerPositions.push({
                    x: wallX,
                    y: wallY,
                    tiltAngle,
                    wallPosition,
                    // Add projection parameters
                    projectionCenterDist: adjustedProjectionCenterDist,
                    projectedRadiusX: adjustedProjectedRadiusX,
                    projectedRadiusY: adjustedProjectedRadiusY
                  });
                } else {
                  // Ceiling-mounted speakers
                  tempSpeakerPositions.push({ x, y });
                }
              }
            }
          }
        }
      } else if (layoutPattern === 'linear') {
        // Linear layout (rows/columns)
        const numLines = currentSpeakers === 1 ? 1 : 2;
        const speakersPerMainLine = Math.ceil(currentSpeakers / numLines);
        const speakersPerSecondLine = currentSpeakers - speakersPerMainLine;

        if (roomLength >= roomWidth) { // Lines along length
            const lineY1 = numLines === 1 ? roomWidth / 2 : roomWidth / 4;
            const lineY2 = roomWidth * 3 / 4;
            const spacingX1 = speakersPerMainLine > 0 ? roomLength / speakersPerMainLine : roomLength;
            idealSpacing = spacingX1;
            for (let i = 0; i < speakersPerMainLine; i++) {
                const x = (i + 0.5) * spacingX1;
                const y = lineY1;
                
                if (mountingType === 'wall') {
                  // For wall-mounted linear layout, place on appropriate wall
                  let wallX = x;
                  let wallY = y;
                  
                  switch(wallPosition) {
                    case 'north': // Top wall
                      wallY = 0;
                      break;
                    case 'east': // Right wall
                      wallX = roomLength;
                      break;
                    case 'south': // Bottom wall
                      wallY = roomWidth;
                      break;
                    case 'west': // Left wall
                      wallX = 0;
                      break;
                  }
                  
                  tempSpeakerPositions.push({
                    x: wallX,
                    y: wallY,
                    tiltAngle,
                    wallPosition,
                    // Add projection parameters
                    projectionCenterDist: adjustedProjectionCenterDist,
                    projectedRadiusX: adjustedProjectedRadiusX,
                    projectedRadiusY: adjustedProjectedRadiusY
                  });
                } else {
                  tempSpeakerPositions.push({ x, y });
                }
            }
            if (numLines === 2 && speakersPerSecondLine > 0) {
                const spacingX2 = speakersPerSecondLine > 0 ? roomLength / speakersPerSecondLine : roomLength;
                for (let i = 0; i < speakersPerSecondLine; i++) {
                    const x = (i + 0.5) * spacingX2;
                    const y = lineY2;
                    
                    if (mountingType === 'wall') {
                      // For wall-mounted linear layout, place on appropriate wall
                      let wallX = x;
                      let wallY = y;
                      
                      switch(wallPosition) {
                        case 'north': // Top wall
                          wallY = 0;
                          break;
                        case 'east': // Right wall
                          wallX = roomLength;
                          break;
                        case 'south': // Bottom wall
                          wallY = roomWidth;
                          break;
                        case 'west': // Left wall
                          wallX = 0;
                          break;
                      }
                      
                      tempSpeakerPositions.push({
                        x: wallX,
                        y: wallY,
                        tiltAngle,
                        wallPosition,
                        // Add projection parameters
                        projectionCenterDist: adjustedProjectionCenterDist,
                        projectedRadiusX: adjustedProjectedRadiusX,
                        projectedRadiusY: adjustedProjectedRadiusY
                      });
                    } else {
                      tempSpeakerPositions.push({ x, y });
                    }
                }
            }
        } else { // Lines along width
            const lineX1 = numLines === 1 ? roomLength / 2 : roomLength / 4;
            const lineX2 = roomLength * 3 / 4;
            const spacingY1 = speakersPerMainLine > 0 ? roomWidth / speakersPerMainLine : roomWidth;
            idealSpacing = spacingY1;
            for (let i = 0; i < speakersPerMainLine; i++) {
                const x = lineX1;
                const y = (i + 0.5) * spacingY1;
                
                if (mountingType === 'wall') {
                  // For wall-mounted linear layout, place on appropriate wall
                  let wallX = x;
                  let wallY = y;
                  
                  switch(wallPosition) {
                    case 'north': // Top wall
                      wallY = 0;
                      break;
                    case 'east': // Right wall
                      wallX = roomLength;
                      break;
                    case 'south': // Bottom wall
                      wallY = roomWidth;
                      break;
                    case 'west': // Left wall
                      wallX = 0;
                      break;
                  }
                  
                  tempSpeakerPositions.push({
                    x: wallX,
                    y: wallY,
                    tiltAngle,
                    wallPosition,
                    // Add projection parameters
                    projectionCenterDist: adjustedProjectionCenterDist,
                    projectedRadiusX: adjustedProjectedRadiusX,
                    projectedRadiusY: adjustedProjectedRadiusY
                  });
                } else {
                  tempSpeakerPositions.push({ x, y });
                }
            }
            if (numLines === 2 && speakersPerSecondLine > 0) {
                const spacingY2 = speakersPerSecondLine > 0 ? roomWidth / speakersPerSecondLine : roomWidth;
                for (let i = 0; i < speakersPerSecondLine; i++) {
                    const x = lineX2;
                    const y = (i + 0.5) * spacingY2;
                    
                    if (mountingType === 'wall') {
                      // For wall-mounted linear layout, place on appropriate wall
                      let wallX = x;
                      let wallY = y;
                      
                      switch(wallPosition) {
                        case 'north': // Top wall
                          wallY = 0;
                          break;
                        case 'east': // Right wall
                          wallX = roomLength;
                          break;
                        case 'south': // Bottom wall
                          wallY = roomWidth;
                          break;
                        case 'west': // Left wall
                          wallX = 0;
                          break;
                      }
                      
                      tempSpeakerPositions.push({
                        x: wallX,
                        y: wallY,
                        tiltAngle,
                        wallPosition,
                        // Add projection parameters
                        projectionCenterDist: adjustedProjectionCenterDist,
                        projectedRadiusX: adjustedProjectedRadiusX,
                        projectedRadiusY: adjustedProjectedRadiusY
                      });
                    } else {
                      tempSpeakerPositions.push({ x, y });
                    }
                }
            }
        }
        if (tempSpeakerPositions.length === 0 && currentSpeakers >= 1) {
          // Add at least one speaker if none were added
          if (mountingType === 'wall') {
            let wallX = 0, wallY = 0;
            
            switch(wallPosition) {
              case 'north': // Top wall
                wallX = roomLength / 2;
                wallY = 0;
                break;
              case 'east': // Right wall
                wallX = roomLength;
                wallY = roomWidth / 2;
                break;
              case 'south': // Bottom wall
                wallX = roomLength / 2;
                wallY = roomWidth;
                break;
              case 'west': // Left wall
                wallX = 0;
                wallY = roomWidth / 2;
                break;
            }
            
            tempSpeakerPositions.push({
              x: wallX,
              y: wallY,
              tiltAngle,
              wallPosition,
              // Add projection parameters
              projectionCenterDist: adjustedProjectionCenterDist,
              projectedRadiusX: adjustedProjectedRadiusX,
              projectedRadiusY: adjustedProjectedRadiusY
            });
          } else {
            tempSpeakerPositions.push({ 
              x: roomLength / 2, 
              y: roomWidth / 2
            });
          }
          idealSpacing = Math.min(roomLength, roomWidth);
        }
      } else if (layoutPattern === 'perimeter') {
        // Perimeter layout (around room edges)
        const perimeter = 2 * (roomLength + roomWidth);
        idealSpacing = currentSpeakers > 0 ? perimeter / currentSpeakers : perimeter;
        let currentPerimeterPos = idealSpacing / 2; // Start half spacing in
        let count = 0;
        const wallOffset = Math.min(roomLength * 0.02, roomWidth * 0.02, 0.1); // Minimal offset

        while (count < currentSpeakers && currentPerimeterPos <= perimeter) {
            let x, y, speakerWallPosition = '';
            
            if (currentPerimeterPos <= roomLength) { // Top edge (north)
                x = currentPerimeterPos; 
                y = wallOffset;
                speakerWallPosition = 'north';
            } else if (currentPerimeterPos <= roomLength + roomWidth) { // Right edge (east)
                x = roomLength - wallOffset; 
                y = currentPerimeterPos - roomLength;
                speakerWallPosition = 'east';
            } else if (currentPerimeterPos <= roomLength * 2 + roomWidth) { // Bottom edge (south)
                x = roomLength - (currentPerimeterPos - (roomLength + roomWidth)); 
                y = roomWidth - wallOffset;
                speakerWallPosition = 'south';
            } else { // Left edge (west)
                x = wallOffset; 
                y = roomWidth - (currentPerimeterPos - (roomLength * 2 + roomWidth));
                speakerWallPosition = 'west';
            }
            
            // Only add wall-mounted speakers on the selected wall if wall mounting is selected
            if (mountingType === 'wall') {
              if (speakerWallPosition === wallPosition) {
                tempSpeakerPositions.push({
                  x: Math.max(wallOffset, Math.min(roomLength - wallOffset, x)),
                  y: Math.max(wallOffset, Math.min(roomWidth - wallOffset, y)),
                  tiltAngle,
                  wallPosition: speakerWallPosition,
                  // Add projection parameters
                  projectionCenterDist: adjustedProjectionCenterDist,
                  projectedRadiusX: adjustedProjectedRadiusX,
                  projectedRadiusY: adjustedProjectedRadiusY
                });
              }
            } else {
              // For ceiling speakers, add all perimeter positions
              tempSpeakerPositions.push({
                x: Math.max(wallOffset, Math.min(roomLength - wallOffset, x)),
                y: Math.max(wallOffset, Math.min(roomWidth - wallOffset, y))
              });
            }
            
            count++;
            currentPerimeterPos += idealSpacing;
            if (count >= currentSpeakers) break; // Safety break
        }
        
        // If wall-mounted and no speakers were added (wrong wall selected), add at least one
        if (mountingType === 'wall' && tempSpeakerPositions.length === 0 && currentSpeakers >= 1) {
          let wallX = 0, wallY = 0;
          
          switch(wallPosition) {
            case 'north': // Top wall
              wallX = roomLength / 2;
              wallY = 0;
              break;
            case 'east': // Right wall
              wallX = roomLength;
              wallY = roomWidth / 2;
              break;
            case 'south': // Bottom wall
              wallX = roomLength / 2;
              wallY = roomWidth;
              break;
            case 'west': // Left wall
              wallX = 0;
              wallY = roomWidth / 2;
              break;
          }
          
          tempSpeakerPositions.push({
            x: wallX,
            y: wallY,
            tiltAngle,
            wallPosition,
            // Add projection parameters
            projectionCenterDist: adjustedProjectionCenterDist,
            projectedRadiusX: adjustedProjectedRadiusX,
            projectedRadiusY: adjustedProjectedRadiusY
          });
        }
        
        // If no speakers at all, add at least one in the center for ceiling mount
        if (tempSpeakerPositions.length === 0 && currentSpeakers >= 1) {
          if (mountingType === 'ceiling') {
            tempSpeakerPositions.push({ 
              x: roomLength / 2, 
              y: roomWidth / 2
            });
          } else {
            // For wall mount, add a speaker in the middle of the selected wall
            let wallX = 0, wallY = 0;
            
            switch(wallPosition) {
              case 'north': // Top wall
                wallX = roomLength / 2;
                wallY = 0;
                break;
              case 'east': // Right wall
                wallX = roomLength;
                wallY = roomWidth / 2;
                break;
              case 'south': // Bottom wall
                wallX = roomLength / 2;
                wallY = roomWidth;
                break;
              case 'west': // Left wall
                wallX = 0;
                wallY = roomWidth / 2;
                break;
            }
            
            tempSpeakerPositions.push({
              x: wallX,
              y: wallY,
              tiltAngle,
              wallPosition,
              // Add projection parameters
              projectionCenterDist: adjustedProjectionCenterDist,
              projectedRadiusX: adjustedProjectedRadiusX,
              projectedRadiusY: adjustedProjectedRadiusY
            });
          }
        }
      }
    }
    
    setRecommendedSpacing(idealSpacing);
    setSpeakerPositions(tempSpeakerPositions);
    setGridConfig(tempGridConfig);

    // Check for coverage issues based on layout pattern
    let hasGaps = false;
    let hasExcessiveOverlap = false;
    
    // Gap check depends on layout pattern
    if (layoutPattern === 'noOverlap') {
      // By definition, no overlap has gaps between speakers
      hasGaps = true;
    } else if (layoutPattern === 'minimumOverlap') {
      // Minimum overlap should have no gaps
      hasGaps = false;
    } else if (layoutPattern === 'edgeToCenter') {
      // Edge-to-center has significant overlap
      hasGaps = false;
      hasExcessiveOverlap = true;
    } else {
      // For custom layouts, check spacing
      hasGaps = idealSpacing > (2 * adjustedRadius) && isFinite(adjustedRadius) && adjustedRadius > 0;
      hasExcessiveOverlap = idealSpacing < (adjustedRadius * 0.7) && isFinite(adjustedRadius) && adjustedRadius > 0;
    }
    
    // Also check for infinite radius causing overlap
    const infiniteRadiusCausesOverlap = !isFinite(adjustedRadius) && currentSpeakers > 1 && roomArea > 0;
    
    setCoverageGapWarning(hasGaps);
    setOverlapWarning(hasExcessiveOverlap || infiniteRadiusCausesOverlap);

  }, [
    roomLength, 
    roomWidth, 
    dispersionAngle, 
    mountingHeight, 
    listeningHeight, 
    mountingEnvironment, 
    layoutPattern, 
    mountingType, 
    tiltAngle, 
    wallPosition,
    gridPattern
  ]);


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Room Specifications</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="roomLength" className="block text-sm font-medium text-gray-700 mb-1">Room Length (m)</label>
            <input id="roomLength" type="number" min="1" value={roomLength}
              onChange={(e) => setRoomLength(Math.max(1, Number(e.target.value)))}
              className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="roomWidth" className="block text-sm font-medium text-gray-700 mb-1">Room Width (m)</label>
            <input id="roomWidth" type="number" min="1" value={roomWidth}
              onChange={(e) => setRoomWidth(Math.max(1, Number(e.target.value)))}
              className="w-full p-2 border rounded-md" />
          </div>
        </div>

        {/* CEILING HEIGHT SELECTION */}
        <div className="mb-4">
          <label htmlFor="ceilingHeight" className="block text-sm font-medium text-gray-700 mb-1">
            {mountingType === 'wall' ? 'Room Height (m)' : 'Ceiling Height (m)'}
          </label>
          <div className="grid grid-cols-1 gap-2">
            <select 
              id="ceilingHeight" 
              value={ceilingHeight} 
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setCeilingHeight('custom');
                } else {
                  setCeilingHeight(Number(val));
                  setCustomCeilingHeightValue(Number(val));
                  // If mounting height > new ceiling height, update it
                  if (mountingHeight > Number(val)) {
                    setMountingHeight(Number(val));
                  }
                }
              }}
              className="w-full p-2 border rounded-md"
            >
              {CEILING_HEIGHTS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
              <option value="custom">Custom Height...</option>
            </select>
            
            {ceilingHeight === 'custom' && (
              <div className="flex items-center">
                <input 
                  type="number" 
                  min="2" 
                  step="0.1" 
                  value={customCeilingHeightValue}
                  onChange={(e) => {
                    const newHeight = Math.max(2, Number(e.target.value));
                    setCustomCeilingHeightValue(newHeight);
                    // If mounting height > new ceiling height, update it
                    if (mountingHeight > newHeight) {
                      setMountingHeight(newHeight);
                    }
                  }}
                  className="flex-grow p-2 border rounded-md" 
                  placeholder="Enter height (meters)"
                />
                <span className="ml-2 text-gray-600">meters</span>
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              {mountingType === 'wall' 
                ? 'The room height affects speaker coverage calculations' 
                : 'The ceiling height affects maximum mounting height'}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-300 my-6"></div>
        
        <h3 className="font-medium text-lg mb-4">Speaker Specifications</h3>

        <div className="mb-4">
          <label htmlFor="speakerType" className="block text-sm font-medium text-gray-700 mb-1">Speaker Type</label>
          <select id="speakerType" value={speakerType} onChange={(e) => setSpeakerType(e.target.value)}
            className="w-full p-2 border rounded-md">
            {SPEAKER_TYPES_COVERAGE.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="dispersionAngle" className="block text-sm font-medium text-gray-700 mb-1">
            {mountingType === 'wall' ? 'Coverage Angle (degrees)' : 'Dispersion Angle (degrees)'}
          </label>
          <input 
            id="dispersionAngle" 
            type="number" 
            min="1" 
            max="359" 
            value={dispersionAngle}
            onChange={(e) => setDispersionAngle(Math.max(1, Math.min(359, Number(e.target.value))))}
            className="w-full p-2 border rounded-md" 
          />
          <p className="text-xs text-gray-500 mt-1">
            Typical: {mountingType === 'wall' ? '90° to 120°' : '60° to 180°'} (check speaker specs)
          </p>
        </div>

        {/* Show tilt angle only for wall-mounted speakers */}
        {mountingType === 'wall' && (
          <div className="mb-4">
            <label htmlFor="tiltAngle" className="block text-sm font-medium text-gray-700 mb-1">
              Downward Tilt (degrees)
            </label>
            <input 
              id="tiltAngle" 
              type="number" 
              min="0" 
              max="90" 
              value={tiltAngle}
              onChange={(e) => setTiltAngle(Math.max(0, Math.min(90, Number(e.target.value))))}
              className="w-full p-2 border rounded-md" 
            />
            <p className="text-xs text-gray-500 mt-1">
              Downward angle the speaker is aimed (0° = horizontal, 90° = straight down)
            </p>
          </div>
        )}

        {/* Show wall position selector for wall-mounted speakers */}
        {mountingType === 'wall' && (
          <div className="mb-4">
            <label htmlFor="wallPosition" className="block text-sm font-medium text-gray-700 mb-1">
              Wall Position
            </label>
            <select 
              id="wallPosition" 
              value={wallPosition} 
              onChange={(e) => setWallPosition(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {WALL_POSITIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Wall where speakers will be mounted
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="mountingHeight" className="block text-sm font-medium text-gray-700 mb-1">
              {mountingType === 'wall' ? 'Speaker Height (m)' : 'Mounting Height (m)'}
            </label>
            <input id="mountingHeight" type="number" min="0.1" step="0.1"
              max={effectiveCeilingHeight}
              value={mountingHeight}
              onChange={(e) => setMountingHeight(Math.min(effectiveCeilingHeight, Math.max(0.1, Number(e.target.value))))}
              className="w-full p-2 border rounded-md" />
            <p className="text-xs text-gray-500 mt-1">
              {mountingType === 'wall' 
                ? `Speaker installation height from floor (max: ${effectiveCeilingHeight}m)` 
                : `Speaker installation height (max: ${effectiveCeilingHeight}m)`}
            </p>
          </div>
          <div>
            <label htmlFor="listeningHeight" className="block text-sm font-medium text-gray-700 mb-1">Listening Height (m)</label>
            <input id="listeningHeight" type="number" min="0" step="0.1"
              max={mountingHeight > 0.1 ? mountingHeight - 0.1 : 0}
              value={listeningHeight}
              onChange={(e) => setListeningHeight(Math.max(0, Math.min(mountingHeight - 0.1, Number(e.target.value))))}
              className="w-full p-2 border rounded-md" />
            <p className="text-xs text-gray-500 mt-1">E.g., 1.2m seated, 1.7m standing</p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="mountingEnv" className="block text-sm font-medium text-gray-700 mb-1">Mounting Environment</label>
          <select id="mountingEnv" value={mountingEnvironment} onChange={(e) => setMountingEnvironment(e.target.value)}
            className="w-full p-2 border rounded-md">
            {MOUNTING_ENVIRONMENTS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-300 my-6"></div>
        
        <h3 className="font-medium text-lg mb-4">Layout Configuration</h3>

        <div className="mb-4">
          <label htmlFor="layoutPattern" className="block text-sm font-medium text-gray-700 mb-1">Layout Pattern</label>
          <select id="layoutPattern" value={layoutPattern} onChange={(e) => setLayoutPattern(e.target.value)}
            className="w-full p-2 border rounded-md">
            {LAYOUT_PATTERNS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* Show description of selected layout pattern */}
          <p className="text-xs text-gray-500 mt-1">
            {LAYOUT_PATTERNS.find(p => p.value === layoutPattern)?.description || ''}
          </p>
        </div>

        {/* Show grid pattern selection for grid-based layouts */}
        {(layoutPattern === 'noOverlap' || 
          layoutPattern === 'minimumOverlap' || 
          layoutPattern === 'edgeToCenter') && (
          <div className="mb-4">
            <label htmlFor="gridPattern" className="block text-sm font-medium text-gray-700 mb-1">Grid Pattern</label>
            <select id="gridPattern" value={gridPattern} onChange={(e) => setGridPattern(e.target.value)}
              className="w-full p-2 border rounded-md">
              {GRID_PATTERNS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {GRID_PATTERNS.find(p => p.value === gridPattern)?.description || ''}
            </p>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>

        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-base text-gray-700">Room Summary</h4>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Room Dimensions:</p>
                <p className="font-semibold text-gray-800">{roomLength}m × {roomWidth}m</p>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Room Area:</p>
                <p className="font-semibold text-gray-800">{(roomLength * roomWidth).toFixed(1)} m²</p>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  {mountingType === 'wall' ? 'Room Height:' : 'Ceiling Height:'}
                </p>
                <p className="font-semibold text-gray-800">{ceilingHeight === 'custom' ? `${customCeilingHeightValue.toFixed(1)} m (Custom)` : `${Number(ceilingHeight).toFixed(1)} m`}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-base text-gray-700">Speaker Coverage</h4>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Coverage Radius (adj.):</p>
                <p className="font-semibold text-gray-800">{isFinite(coverageRadius) ? coverageRadius.toFixed(2) : 'Infinite'} m</p>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Coverage Area / Speaker:</p>
                <p className="font-semibold text-gray-800">{isFinite(coverageArea) ? coverageArea.toFixed(2) : 'Infinite'} m²</p>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Recommended Speakers:</p>
                <p className="font-bold text-blue-600">{isFinite(recommendedSpeakers) ? recommendedSpeakers : (coverageArea === 0 && (roomLength*roomWidth)>0 ? 'Infinite (No coverage)' : 'N/A')}</p>
              </div>
            </div>
          </div>
           <div className="mt-4 bg-gray-50 p-3 rounded-md">
            <h4 className="font-medium text-base text-gray-700 mb-2">Mounting Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {mountingType === 'wall' ? 'Speaker Height:' : 'Mounting Height:'}
                </p>
                <p className="font-semibold text-gray-800">{mountingHeight.toFixed(1)} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Listening Height:</p>
                <p className="font-semibold text-gray-800">{listeningHeight.toFixed(1)} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Effective Height Diff.:</p>
                <p className="font-semibold text-gray-800">{(mountingHeight - listeningHeight > 0 ? mountingHeight - listeningHeight : 0).toFixed(2)} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Environment Factor:</p>
                <p className="font-semibold text-gray-800">
                  {MOUNTING_ENVIRONMENTS.find(env => env.value === mountingEnvironment)?.factor || 1.0}
                </p>
              </div>
              
              {/* Add wall-mount specific details if applicable */}
              {mountingType === 'wall' && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Wall Position:</p>
                    <p className="font-semibold text-gray-800">
                      {WALL_POSITIONS.find(w => w.value === wallPosition)?.label || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Downward Tilt:</p>
                    <p className="font-semibold text-gray-800">{tiltAngle}°</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">Speaker Layout Recommendation</h4>
          <div className="mb-4">
            <SpeakerLayoutVisualizer
              roomLength={roomLength}
              roomWidth={roomWidth}
              roomHeight={effectiveCeilingHeight}
              speakerPositions={speakerPositions}
              coverageRadius={coverageRadius}
              mountingType={mountingType}
              gridPattern={gridPattern}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Layout Pattern:</p>
              <p className="font-semibold text-gray-800">
                {LAYOUT_PATTERNS.find(p => p.value === layoutPattern)?.label || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Recommended Spacing (approx.):</p>
              <p className="font-semibold text-gray-800">{isFinite(recommendedSpacing) && recommendedSpacing > 0 ? recommendedSpacing.toFixed(2) : 'N/A'} m</p>
            </div>
            
            {/* Show grid pattern info if applicable */}
            {(layoutPattern === 'noOverlap' || 
              layoutPattern === 'minimumOverlap' || 
              layoutPattern === 'edgeToCenter') && (
              <div>
                <p className="text-sm text-gray-600">Grid Pattern:</p>
                <p className="font-semibold text-gray-800">
                  {GRID_PATTERNS.find(p => p.value === gridPattern)?.label || 'Unknown'}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-600">Speaker Count:</p>
              <p className="font-semibold text-gray-800">{speakerPositions.length}</p>
            </div>
          </div>

          {/* Coverage details for wall-mounted speakers */}
          {mountingType === 'wall' && speakerPositions.length > 0 && speakerPositions[0].projectionCenterDist && (
            <div className="bg-gray-50 p-3 rounded-md mb-3">
              <h5 className="font-medium text-sm text-gray-700 mb-2">Wall-mounted Coverage Details</h5>
              <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-gray-600">
                <li><strong>Projection Distance:</strong> {speakerPositions[0].projectionCenterDist?.toFixed(2)}m from wall</li>
                {wallPosition === 'north' || wallPosition === 'south' ? (
                  <>
                    <li><strong>Coverage Width:</strong> {(speakerPositions[0].projectedRadiusX || 0) * 2}m (parallel to wall)</li>
                    <li><strong>Coverage Depth:</strong> {(speakerPositions[0].projectedRadiusY || 0) * 2}m (perpendicular to wall)</li>
                  </>
                ) : (
                  <>
                    <li><strong>Coverage Width:</strong> {(speakerPositions[0].projectedRadiusY || 0) * 2}m (parallel to wall)</li>
                    <li><strong>Coverage Depth:</strong> {(speakerPositions[0].projectedRadiusX || 0) * 2}m (perpendicular to wall)</li>
                  </>
                )}
                <li>
                  <strong>Effective Coverage Area:</strong> {isFinite(coverageArea) ? coverageArea.toFixed(2) : 'N/A'} m²
                </li>
              </ul>
            </div>
          )}

          {recommendedSpeakers > 0 && isFinite(recommendedSpeakers) && isFinite(recommendedSpacing) && recommendedSpacing > 0 && (
            <div className="bg-gray-50 p-3 rounded-md mb-3">
              <h5 className="font-medium text-sm text-gray-700 mb-2">Placement Details</h5>
              
              {(layoutPattern === 'noOverlap' || 
                layoutPattern === 'minimumOverlap' || 
                layoutPattern === 'edgeToCenter') && 
                gridConfig.cols > 0 && gridConfig.rows > 0 && (
                <div>
                  <p className="text-sm text-gray-700">Grid configuration:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-gray-600">
                    <li><strong>Rows: </strong>{gridConfig.rows}</li>
                    <li><strong>Columns: </strong>{gridConfig.cols}</li>
                    <li><strong>Row Spacing (center-to-center): </strong>{gridConfig.spacingY.toFixed(2)}m</li>
                    <li><strong>Column Spacing (center-to-center): </strong>{gridConfig.spacingX.toFixed(2)}m</li>
                    <li><i>Total speakers: {speakerPositions.length}</i></li>
                  </ul>
                </div>
              )}
              
              {layoutPattern === 'linear' && (
                 <div>
                  <p className="text-sm text-gray-700">For a linear layout ({speakerPositions.length} speakers):</p>
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-gray-600">
                    <li>Speakers spaced approx. {recommendedSpacing.toFixed(2)}m apart along line(s)</li>
                    <li>Typically 1 or 2 lines along the longest room dimension</li>
                  </ul>
                </div>
              )}
              
              {layoutPattern === 'perimeter' && (
                <div>
                  <p className="text-sm text-gray-700">For a perimeter layout ({speakerPositions.length} speakers):</p>
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-gray-600">
                    <li>Speakers spaced approx. {recommendedSpacing.toFixed(2)}m apart around the room perimeter</li>
                    {mountingType === 'wall' && (
                      <li>Speakers mounted on {WALL_POSITIONS.find(w => w.value === wallPosition)?.label || 'selected wall'} only</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Coverage warnings */}
          {(coverageGapWarning || overlapWarning) && (
            <div className={`rounded-md p-3 ${coverageGapWarning ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border`}>
              <p className={`text-sm font-medium ${coverageGapWarning ? 'text-red-800' : 'text-yellow-800'}`}>
                {coverageGapWarning
                  ? 'Warning: Coverage gaps may exist. Consider more speakers, different layout, or wider dispersion.'
                  : overlapWarning
                    ? 'Note: Significant speaker overlap may occur or coverage is very wide. This can be desired for evenness but may cause interference if excessive. Consider layout or speaker count.'
                    : ''}
              </p>
            </div>
          )}
        </div>

        {/* Recommendations and best practices */}
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Design Recommendations</h4>
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
            {mountingType === 'ceiling' ? (
              <>
                <li>For critical listening, aim for denser layouts (more overlap, e.g., spacing ~1.4 * radius).</li>
                <li>Consider acoustic treatments for highly reverberant spaces.</li>
                <li>Min. speaker density: 1 per ~{isFinite(coverageArea) && coverageArea > 0 ? coverageArea.toFixed(0) : 'N/A'} m² (single speaker theoretical).</li>
                <li>Ideal intra-speaker spacing often between {(coverageRadius * 1.4).toFixed(2)}m (25% overlap) and {(coverageRadius * 1.7).toFixed(2)}m (15% overlap).</li>
                <li>Avoid placing speakers directly above primary listening positions unless intended.</li>
              </>
            ) : (
              <>
                <li>For wall-mounted speakers, coverage angle should be aimed toward the farthest listening area.</li>
                <li>When there is a facing wall up to 30 ft away, speakers should be staggered on opposite walls.</li>
                <li>For larger spaces, consider using ceiling speakers to supplement wall-mounted coverage.</li>
                <li>Tilt angle of {tiltAngle}° provides coverage depth of approximately {speakerPositions[0]?.projectionCenterDist?.toFixed(2) || 0}m from the wall.</li>
                <li>In outdoor areas or large spaces, consider back-to-back mounting for broader coverage.</li>
              </>
            )}
          </ul>
          <p className="text-xs mt-2 text-blue-700">
            Note: These are design guidelines. Validate with acoustic modeling or on-site tests for critical spaces.
          </p>
        </div>
        
        <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Dispersion patterns are complex and vary by frequency. Check manufacturer polar plots.</li>
            <li>Room acoustics (reverberation, absorption, obstructions) greatly impact coverage and intelligibility.</li>
            <li>Consider zoning for different areas or PAVA systems.</li>
            <li>Ambient noise may require higher speaker density or SPL.</li>
            <li>For voice evacuation, comply with local fire safety (e.g., EN54, NFPA72).</li>
            {mountingType === 'ceiling' ? (
              <li>Vertical coverage is key for high mounting or tiered seating.</li>
            ) : (
              <li>Wall-mounted speakers may create uneven coverage with distance - check manufacturer coverage data.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== SPL CALCULATOR ========================

interface SplCalculatorProps {
  onShowTutorial?: () => void;
}

const SPEAKER_SENSITIVITY_PRESETS = [
  { value: 'standard', label: 'Standard PA Speaker (87dB)', sensitivity: 87 },
  { value: 'high', label: 'High Sensitivity (90dB)', sensitivity: 90 },
  { value: 'premium', label: 'Premium Speaker (93dB)', sensitivity: 93 },
  { value: 'horn', label: 'Horn Speaker (105dB)', sensitivity: 105 },
  { value: 'ceiling', label: 'Ceiling Speaker (85dB)', sensitivity: 85 },
  { value: 'custom', label: 'Custom...', sensitivity: 88 }
];

const ROOM_ACOUSTIC_TYPES = [
  { value: 'dead', label: 'Acoustically Treated (Dead)', factor: 0.9 }, // Factor applied to sound power/intensity
  { value: 'standard', label: 'Standard Room', factor: 1.0 },
  { value: 'reflective', label: 'Reflective Surfaces', factor: 1.1 },
  { value: 'highlyReflective', label: 'Highly Reflective', factor: 1.2 }
];

const ROOM_SIZE_TYPES = [
  { value: 'small', label: 'Small (< 50 m²)', nearFieldDistance: 2 },
  { value: 'medium', label: 'Medium (50-200 m²)', nearFieldDistance: 3 },
  { value: 'large', label: 'Large (> 200 m²)', nearFieldDistance: 4 },
  { value: 'openSpace', label: 'Open Space / Outdoors', nearFieldDistance: 1 }
];

const SPL_REQUIREMENTS = [
  { application: 'Background Music', minLevel: 65, maxLevel: 75 },
  { application: 'Paging/Announcements', minLevel: 75, maxLevel: 85 },
  { application: 'Emergency Messaging', minLevel: 75, maxLevel: 90 },
  { application: 'Speech Reinforcement', minLevel: 70, maxLevel: 85 },
  { application: 'Foreground Music', minLevel: 75, maxLevel: 90 },
  { application: 'Retail/Restaurant', minLevel: 70, maxLevel: 80 }
];

const SplCalculator: React.FC<SplCalculatorProps> = ({ onShowTutorial }) => {
  const [speakerSensitivityPreset, setSpeakerSensitivityPreset] = useState<string>('standard');
  const [customSensitivity, setCustomSensitivity] = useState<number>(
    SPEAKER_SENSITIVITY_PRESETS.find(p => p.value === 'custom')?.sensitivity || 88
  );
  const [speakerPower, setSpeakerPower] = useState<number>(10);
  const [speakerCount, setSpeakerCount] = useState<number>(4);
  const [roomAcoustics, setRoomAcoustics] = useState<string>('standard');
  const [roomSize, setRoomSize] = useState<string>('medium');
  
  const [referenceDistance, setReferenceDistance] = useState<number>(1.0);
  const [measurementDistance, setMeasurementDistance] = useState<number>(10);
  const [ambientNoiseLevel, setAmbientNoiseLevel] = useState<number>(45);
  
  const [effectiveSensitivity, setEffectiveSensitivity] = useState<number>(
     SPEAKER_SENSITIVITY_PRESETS.find(p => p.value === 'standard')?.sensitivity || 87
  );
  const [singleSpeakerSpl, setSingleSpeakerSpl] = useState<number>(0);
  const [combinedSpl, setCombinedSpl] = useState<number>(0);
  const [signalToNoiseRatio, setSignalToNoiseRatio] = useState<number>(0);
  const [intelligibilityRating, setIntelligibilityRating] = useState<string>('');
  const [recommendedApplication, setRecommendedApplication] = useState<string[]>([]);
  
  const [distanceTable, setDistanceTable] = useState<{ distance: number; spl: number }[]>([]);
  const [showClippingWarning, setShowClippingWarning] = useState<boolean>(false);
  
  // Ref for export functionality
  const tableRef = useRef<HTMLTableElement>(null);
  
  useEffect(() => {
    let sensitivityValue: number;
    if (speakerSensitivityPreset === 'custom') {
      sensitivityValue = customSensitivity;
    } else {
      const preset = SPEAKER_SENSITIVITY_PRESETS.find(p => p.value === speakerSensitivityPreset);
      sensitivityValue = preset ? preset.sensitivity : 88;
    }
    setEffectiveSensitivity(sensitivityValue);
  }, [speakerSensitivityPreset, customSensitivity]);
  
  useEffect(() => {
    if (!effectiveSensitivity || speakerPower <= 0 || speakerCount <= 0 || referenceDistance <=0 || measurementDistance <=0) {
        setSingleSpeakerSpl(0); setCombinedSpl(0); setSignalToNoiseRatio(0);
        setIntelligibilityRating('N/A'); setRecommendedApplication([]); setDistanceTable([]);
        setShowClippingWarning(false);
        return;
    }
    
    const acousticConfig = ROOM_ACOUSTIC_TYPES.find(type => type.value === roomAcoustics);
    const acousticPowerFactor = acousticConfig ? acousticConfig.factor : 1.0;
    const acousticDbAdjustment = (acousticPowerFactor > 0) ? 10 * Math.log10(acousticPowerFactor) : -Infinity; // -Infinity if factor is 0 or less

    const powerInDb = 10 * Math.log10(speakerPower);
    const splAtReference = effectiveSensitivity + powerInDb;
    
    // Get room size config for near-field calculation
    const roomSizeConfig = ROOM_SIZE_TYPES.find(type => type.value === roomSize);
    const nearFieldDistance = roomSizeConfig ? roomSizeConfig.nearFieldDistance : 2;
    
    // Apply distance attenuation with near-field correction
    let distanceAttenuation: number;
    if (measurementDistance <= nearFieldDistance) {
      // Reduced attenuation in near-field (reduced inverse square law effect in rooms)
      const reducedDistanceRatio = Math.max(1, measurementDistance / referenceDistance);
      distanceAttenuation = 15 * Math.log10(reducedDistanceRatio); // 15 instead of 20 for reduced attenuation
    } else {
      // Normal inverse square law for distances beyond near-field
      const normalDistanceRatio = measurementDistance / referenceDistance;
      distanceAttenuation = nearFieldDistance > referenceDistance 
        ? 15 * Math.log10(nearFieldDistance / referenceDistance) + 20 * Math.log10(measurementDistance / nearFieldDistance)
        : 20 * Math.log10(normalDistanceRatio);
    }
    
    const singleSplAtDistanceFreeField = splAtReference - distanceAttenuation;
    const adjustedSingleSpl = singleSplAtDistanceFreeField + acousticDbAdjustment;
    
    const combinedSplAtDistance = adjustedSingleSpl + (speakerCount > 0 ? 10 * Math.log10(speakerCount) : -Infinity);
    
    const snr = combinedSplAtDistance - ambientNoiseLevel;
    
    setSingleSpeakerSpl(adjustedSingleSpl);
    setCombinedSpl(combinedSplAtDistance);
    setSignalToNoiseRatio(snr);
    
    // Check for clipping/ceiling warnings (SPL > 115dB)
    setShowClippingWarning(combinedSplAtDistance > 115);
    
    let intelligibility: string;
    if (!isFinite(snr)) intelligibility = 'N/A';
    else if (snr >= 25) intelligibility = 'Excellent';
    else if (snr >= 20) intelligibility = 'Very Good';
    else if (snr >= 15) intelligibility = 'Good';
    else if (snr >= 10) intelligibility = 'Fair';
    else if (snr >= 5) intelligibility = 'Poor';
    else intelligibility = 'Unintelligible';
    setIntelligibilityRating(intelligibility);
    
    const recommendedApps = isFinite(combinedSplAtDistance) ? SPL_REQUIREMENTS.filter(
      app => combinedSplAtDistance >= app.minLevel && combinedSplAtDistance <= app.maxLevel
    ).map(app => app.application) : [];
    setRecommendedApplication(recommendedApps);
    
    const distances = [1, 2, 5, 10, 15, 20, 30, 50];
    const newDistanceTable = distances.map(dist => {
      let distAttenTable: number;
      
      // Apply same near-field modeling to table calculations
      if (dist <= nearFieldDistance) {
        const reducedRatio = Math.max(1, dist / referenceDistance);
        distAttenTable = 15 * Math.log10(reducedRatio);
      } else {
        const normalRatio = dist / referenceDistance;
        distAttenTable = nearFieldDistance > referenceDistance 
          ? 15 * Math.log10(nearFieldDistance / referenceDistance) + 20 * Math.log10(dist / nearFieldDistance)
          : 20 * Math.log10(normalRatio);
      }
      
      const singleSplTableFF = splAtReference - distAttenTable;
      const adjustedSingleSplTable = singleSplTableFF + acousticDbAdjustment;
      const combinedSplTable = adjustedSingleSplTable + (speakerCount > 0 ? 10 * Math.log10(speakerCount) : -Infinity);
      return { distance: dist, spl: combinedSplTable };
    });
    setDistanceTable(newDistanceTable);
    
  }, [effectiveSensitivity, speakerPower, speakerCount, referenceDistance, measurementDistance, roomAcoustics, roomSize, ambientNoiseLevel]);
  
  // Function to export table data to CSV
  const exportToCSV = () => {
    if (distanceTable.length === 0) return;
    
    // Create CSV content
    const headers = ['Distance (m)', 'SPL (dB)', 'SNR (dB)', 'Intelligibility'];
    const csvRows = [headers.join(',')];
    
    distanceTable.forEach(entry => {
      const distanceSnr = isFinite(entry.spl) ? entry.spl - ambientNoiseLevel : -Infinity;
      let distanceIntelligibility: string;
      if (!isFinite(entry.spl)) distanceIntelligibility = 'N/A';
      else if (distanceSnr >= 25) distanceIntelligibility = 'Excellent';
      else if (distanceSnr >= 20) distanceIntelligibility = 'Very Good';
      else if (distanceSnr >= 15) distanceIntelligibility = 'Good';
      else if (distanceSnr >= 10) distanceIntelligibility = 'Fair';
      else if (distanceSnr >= 5) distanceIntelligibility = 'Poor';
      else distanceIntelligibility = 'Unintelligible';
      
      const row = [
        entry.distance,
        isFinite(entry.spl) ? entry.spl.toFixed(1) : 'N/A',
        isFinite(distanceSnr) ? distanceSnr.toFixed(1) : 'N/A',
        distanceIntelligibility
      ];
      csvRows.push(row.join(','));
    });
    
    // Create and trigger download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'spl_calculations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Function to print the results
  const printResults = () => {
    window.print();
  };
  
  // Custom SPL Chart Component
  const CustomSplChart = ({ distanceTable, ambientNoiseLevel, measurementDistance }: { 
    distanceTable: { distance: number; spl: number }[]; 
    ambientNoiseLevel: number;
    measurementDistance: number;
  }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    
    useEffect(() => {
      if (!svgRef.current || distanceTable.length === 0) return;
      
      const svg = svgRef.current;
      
      // Clear previous content
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      
      // Set dimensions explicitly to ensure proper sizing
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      
      // Set chart dimensions
      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 280;
      const margin = { top: 20, right: 60, bottom: 40, left: 60 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      
      // Get y-axis min/max values
      const maxSpl = Math.max(...distanceTable.map(d => isFinite(d.spl) ? d.spl : 0));
      const minSpl = Math.min(...distanceTable.map(d => isFinite(d.spl) ? d.spl : 999));
      const yMin = Math.max(20, Math.min(ambientNoiseLevel - 10, minSpl - 10));
      const yMax = Math.min(140, Math.max(ambientNoiseLevel + 10, maxSpl + 10));
      
      // Define logarithmic x-scale
      const logScale = (value: number, minValue: number, maxValue: number, targetMin: number, targetMax: number) => {
        // Convert to log space, perform linear mapping, and then convert back
        const logMin = Math.log(minValue);
        const logMax = Math.log(maxValue);
        const scale = (Math.log(value) - logMin) / (logMax - logMin);
        return targetMin + scale * (targetMax - targetMin);
      };
      
      // Define x-axis ticks
      const xTicks = [1, 2, 5, 10, 20, 50];
      const minDistance = 1;
      const maxDistance = 50;
      
      // Create group for the chart
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
      svg.appendChild(g);
      
      // Add grid lines
      const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      grid.setAttribute('class', 'grid');
      
      // Vertical grid lines (x-axis)
      xTicks.forEach(tick => {
        const x = logScale(tick, minDistance, maxDistance, 0, chartWidth);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x.toString());
        line.setAttribute('y1', '0');
        line.setAttribute('x2', x.toString());
        line.setAttribute('y2', chartHeight.toString());
        line.setAttribute('stroke', '#e5e7eb');
        line.setAttribute('stroke-dasharray', '3,3');
        grid.appendChild(line);
      });
      
      // Horizontal grid lines (y-axis)
      const yStep = Math.ceil((yMax - yMin) / 5);
      for (let i = Math.ceil(yMin / yStep) * yStep; i <= yMax; i += yStep) {
        const y = chartHeight - ((i - yMin) / (yMax - yMin)) * chartHeight;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', y.toString());
        line.setAttribute('x2', chartWidth.toString());
        line.setAttribute('y2', y.toString());
        line.setAttribute('stroke', '#e5e7eb');
        line.setAttribute('stroke-dasharray', '3,3');
        grid.appendChild(line);
      }
      
      g.appendChild(grid);
      
      // Draw x-axis
      const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      xAxis.setAttribute('class', 'x-axis');
      
      // X-axis line
      const xAxisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      xAxisLine.setAttribute('x1', '0');
      xAxisLine.setAttribute('y1', chartHeight.toString());
      xAxisLine.setAttribute('x2', chartWidth.toString());
      xAxisLine.setAttribute('y2', chartHeight.toString());
      xAxisLine.setAttribute('stroke', '#4b5563');
      xAxis.appendChild(xAxisLine);
      
      // X-axis ticks and labels
      xTicks.forEach(tick => {
        const x = logScale(tick, minDistance, maxDistance, 0, chartWidth);
        
        // Tick
        const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tickLine.setAttribute('x1', x.toString());
        tickLine.setAttribute('y1', chartHeight.toString());
        tickLine.setAttribute('x2', x.toString());
        tickLine.setAttribute('y2', (chartHeight + 6).toString());
        tickLine.setAttribute('stroke', '#4b5563');
        xAxis.appendChild(tickLine);
        
        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x.toString());
        text.setAttribute('y', (chartHeight + 20).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', '#4b5563');
        text.textContent = tick.toString();
        xAxis.appendChild(text);
      });
      
      // X-axis label
      const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xLabel.setAttribute('x', (chartWidth / 2).toString());
      xLabel.setAttribute('y', (chartHeight + 35).toString());
      xLabel.setAttribute('text-anchor', 'middle');
      xLabel.setAttribute('font-size', '11');
      xLabel.setAttribute('fill', '#4b5563');
      xLabel.textContent = 'Distance (m)';
      xAxis.appendChild(xLabel);
      
      g.appendChild(xAxis);
      
      // Draw y-axis
      const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      yAxis.setAttribute('class', 'y-axis');
      
      // Y-axis line
      const yAxisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      yAxisLine.setAttribute('x1', '0');
      yAxisLine.setAttribute('y1', '0');
      yAxisLine.setAttribute('x2', '0');
      yAxisLine.setAttribute('y2', chartHeight.toString());
      yAxisLine.setAttribute('stroke', '#4b5563');
      yAxis.appendChild(yAxisLine);
      
      // Y-axis ticks and labels
      for (let i = Math.ceil(yMin / yStep) * yStep; i <= yMax; i += yStep) {
        const y = chartHeight - ((i - yMin) / (yMax - yMin)) * chartHeight;
        
        // Tick
        const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tickLine.setAttribute('x1', '0');
        tickLine.setAttribute('y1', y.toString());
        tickLine.setAttribute('x2', '-6');
        tickLine.setAttribute('y2', y.toString());
        tickLine.setAttribute('stroke', '#4b5563');
        yAxis.appendChild(tickLine);
        
        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '-10');
        text.setAttribute('y', (y + 4).toString());
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', '#4b5563');
        text.textContent = i.toString();
        yAxis.appendChild(text);
      }
      
      // Y-axis label
      const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      yLabel.setAttribute('transform', `translate(-40,${chartHeight / 2}) rotate(-90)`);
      yLabel.setAttribute('text-anchor', 'middle');
      yLabel.setAttribute('font-size', '11');
      yLabel.setAttribute('fill', '#4b5563');
      yLabel.textContent = 'dB';
      yAxis.appendChild(yLabel);
      
      g.appendChild(yAxis);
      
      // Plot ambient noise line
      const ambientLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ambientLine.setAttribute('x1', '0');
      ambientLine.setAttribute('y1', (chartHeight - ((ambientNoiseLevel - yMin) / (yMax - yMin)) * chartHeight).toString());
      ambientLine.setAttribute('x2', chartWidth.toString());
      ambientLine.setAttribute('y2', (chartHeight - ((ambientNoiseLevel - yMin) / (yMax - yMin)) * chartHeight).toString());
      ambientLine.setAttribute('stroke', '#ef4444');
      ambientLine.setAttribute('stroke-width', '1.5');
      ambientLine.setAttribute('stroke-dasharray', '4,4');
      g.appendChild(ambientLine);
      
      // Plot SPL line
      const splLinePoints: [number, number][] = [];
      distanceTable.forEach(point => {
        if (isFinite(point.spl)) {
          const x = logScale(point.distance, minDistance, maxDistance, 0, chartWidth);
          const y = chartHeight - ((point.spl - yMin) / (yMax - yMin)) * chartHeight;
          splLinePoints.push([x, y]);
        }
      });
      
      if (splLinePoints.length > 0) {
        // Draw SPL line
        let pathD = `M ${splLinePoints[0][0]} ${splLinePoints[0][1]}`;
        for (let i = 1; i < splLinePoints.length; i++) {
          pathD += ` L ${splLinePoints[i][0]} ${splLinePoints[i][1]}`;
        }
        
        const splPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        splPath.setAttribute('d', pathD);
        splPath.setAttribute('fill', 'none');
        splPath.setAttribute('stroke', '#3b82f6');
        splPath.setAttribute('stroke-width', '2');
        g.appendChild(splPath);
        
        // Draw SPL dots
        splLinePoints.forEach(([x, y], index) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x.toString());
          circle.setAttribute('cy', y.toString());
          circle.setAttribute('r', distanceTable[index].distance === measurementDistance ? '5' : '3');
          circle.setAttribute('fill', '#3b82f6');
          
          // Highlight selected distance
          if (distanceTable[index].distance === measurementDistance) {
            const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            highlight.setAttribute('cx', x.toString());
            highlight.setAttribute('cy', y.toString());
            highlight.setAttribute('r', '8');
            highlight.setAttribute('fill', 'transparent');
            highlight.setAttribute('stroke', '#3b82f6');
            highlight.setAttribute('stroke-width', '1');
            highlight.setAttribute('opacity', '0.5');
            g.appendChild(highlight);
          }
          
          g.appendChild(circle);
        });
      }
      
      // Plot SNR line
      const snrLinePoints: [number, number][] = [];
      distanceTable.forEach(point => {
        if (isFinite(point.spl)) {
          const snr = point.spl - ambientNoiseLevel;
          const x = logScale(point.distance, minDistance, maxDistance, 0, chartWidth);
          const y = chartHeight - ((snr - yMin) / (yMax - yMin)) * chartHeight;
          
          // Only add if within chart bounds
          if (y >= 0 && y <= chartHeight) {
            snrLinePoints.push([x, y]);
          }
        }
      });
      
      if (snrLinePoints.length > 0) {
        // Draw SNR line
        let pathD = `M ${snrLinePoints[0][0]} ${snrLinePoints[0][1]}`;
        for (let i = 1; i < snrLinePoints.length; i++) {
          pathD += ` L ${snrLinePoints[i][0]} ${snrLinePoints[i][1]}`;
        }
        
        const snrPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        snrPath.setAttribute('d', pathD);
        snrPath.setAttribute('fill', 'none');
        snrPath.setAttribute('stroke', '#10b981');
        snrPath.setAttribute('stroke-width', '2');
        g.appendChild(snrPath);
        
        // Draw SNR dots
        snrLinePoints.forEach(([x, y]) => {
          // Only draw dots if within chart bounds
          if (y >= 0 && y <= chartHeight) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x.toString());
            circle.setAttribute('cy', y.toString());
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', '#10b981');
            g.appendChild(circle);
          }
        });
      }
      
      // Add legend
      const legend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      legend.setAttribute('class', 'legend');
      legend.setAttribute('transform', `translate(${chartWidth - 160}, 10)`);
      
      // SPL legend item
      const splLegend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const splLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      splLine.setAttribute('x1', '0');
      splLine.setAttribute('y1', '6');
      splLine.setAttribute('x2', '20');
      splLine.setAttribute('y2', '6');
      splLine.setAttribute('stroke', '#3b82f6');
      splLine.setAttribute('stroke-width', '2');
      splLegend.appendChild(splLine);
      
      const splDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      splDot.setAttribute('cx', '10');
      splDot.setAttribute('cy', '6');
      splDot.setAttribute('r', '3');
      splDot.setAttribute('fill', '#3b82f6');
      splLegend.appendChild(splDot);
      
      const splText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      splText.setAttribute('x', '25');
      splText.setAttribute('y', '10');
      splText.setAttribute('font-size', '10');
      splText.setAttribute('fill', '#4b5563');
      splText.textContent = 'Combined SPL';
      splLegend.appendChild(splText);
      
      legend.appendChild(splLegend);
      
      // SNR legend item
      const snrLegend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      snrLegend.setAttribute('transform', 'translate(0, 20)');
      
      const snrLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      snrLine.setAttribute('x1', '0');
      snrLine.setAttribute('y1', '6');
      snrLine.setAttribute('x2', '20');
      snrLine.setAttribute('y2', '6');
      snrLine.setAttribute('stroke', '#10b981');
      snrLine.setAttribute('stroke-width', '2');
      snrLegend.appendChild(snrLine);
      
      const snrDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      snrDot.setAttribute('cx', '10');
      snrDot.setAttribute('cy', '6');
      snrDot.setAttribute('r', '3');
      snrDot.setAttribute('fill', '#10b981');
      snrLegend.appendChild(snrDot);
      
      const snrText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      snrText.setAttribute('x', '25');
      snrText.setAttribute('y', '10');
      snrText.setAttribute('font-size', '10');
      snrText.setAttribute('fill', '#4b5563');
      snrText.textContent = 'Signal-to-Noise Ratio';
      snrLegend.appendChild(snrText);
      
      legend.appendChild(snrLegend);
      
      // Ambient noise legend item
      const ambientLegend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ambientLegend.setAttribute('transform', 'translate(0, 40)');
      
      const ambientLegendLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ambientLegendLine.setAttribute('x1', '0');
      ambientLegendLine.setAttribute('y1', '6');
      ambientLegendLine.setAttribute('x2', '20');
      ambientLegendLine.setAttribute('y2', '6');
      ambientLegendLine.setAttribute('stroke', '#ef4444');
      ambientLegendLine.setAttribute('stroke-width', '1.5');
      ambientLegendLine.setAttribute('stroke-dasharray', '4,4');
      ambientLegend.appendChild(ambientLegendLine);
      
      const ambientText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      ambientText.setAttribute('x', '25');
      ambientText.setAttribute('y', '10');
      ambientText.setAttribute('font-size', '10');
      ambientText.setAttribute('fill', '#4b5563');
      ambientText.textContent = 'Ambient Noise';
      ambientLegend.appendChild(ambientText);
      
      legend.appendChild(ambientLegend);
      
      g.appendChild(legend);
      
    }, [distanceTable, ambientNoiseLevel, measurementDistance]);
    
    return (
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ minHeight: "280px" }}
      ></svg>
    );
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg text-gray-800">Speaker Specifications</h3>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Speaker Sensitivity
          </label>
          <select
            value={speakerSensitivityPreset}
            onChange={(e) => setSpeakerSensitivityPreset(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {SPEAKER_SENSITIVITY_PRESETS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {speakerSensitivityPreset === 'custom' && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Sensitivity (dB 1W/1m)
              </label>
              <input
                type="number"
                min="70"
                max="115"
                value={customSensitivity}
                onChange={(e) => setCustomSensitivity(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Sensitivity is measured in dB with 1 Watt at 1 meter (check speaker specifications)
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speaker Power (Watts)
            </label>
            <select
              value={speakerPower}
              onChange={(e) => setSpeakerPower(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              <option value="1">1W (Low Power)</option>
              <option value="3">3W (Standard Tap)</option>
              <option value="5">5W (Medium Power)</option>
              <option value="10">10W (High Power)</option>
              <option value="15">15W (Very High)</option>
              <option value="30">30W (Maximum)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Speakers
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={speakerCount}
              onChange={(e) => setSpeakerCount(Number(e.target.value) > 0 ? Number(e.target.value) : 1)}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Acoustics
            </label>
            <select
              value={roomAcoustics}
              onChange={(e) => setRoomAcoustics(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {ROOM_ACOUSTIC_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Size
            </label>
            <select
              value={roomSize}
              onChange={(e) => setRoomSize(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {ROOM_SIZE_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        <h3 className="font-medium text-lg mb-4">Distance & Environment</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Distance (m)
            </label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={referenceDistance}
              onChange={(e) => setReferenceDistance(Number(e.target.value) > 0 ? Number(e.target.value) : 0.1)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Usually 1m</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Measurement Distance (m)
            </label>
            <input
              type="number"
              min="0.1"
              max="100"
              value={measurementDistance}
              onChange={(e) => setMeasurementDistance(Number(e.target.value) > 0 ? Number(e.target.value) : 0.1)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Distance to listener</p>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ambient Noise Level (dB)
          </label>
          <select
            value={ambientNoiseLevel}
            onChange={(e) => setAmbientNoiseLevel(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          >
            <option value="35">35 dB - Very Quiet Office</option>
            <option value="40">40 dB - Library</option>
            <option value="45">45 dB - Quiet Office</option>
            <option value="50">50 dB - Moderate Office</option>
            <option value="55">55 dB - Conversation</option>
            <option value="60">60 dB - Restaurant</option>
            <option value="65">65 dB - Busy Restaurant</option>
            <option value="70">70 dB - Busy Street</option>
            <option value="75">75 dB - Manufacturing</option>
            <option value="80">80 dB - Factory</option>
          </select>
        </div>
        
        {/* <div className="mt-4 flex space-x-2">
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
            disabled={distanceTable.length === 0}
          >
            <Icons.Table/> Export CSV
          </button>
          <button
            onClick={printResults}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center"
          >
            <Icons.Droplet/> Print Results
          </button>
        </div> */}
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
        
        {/* Clipping Warning */}
        {showClippingWarning && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start">
            <Icons.InfoCircle />
            <div className="ml-2">
              <p className="font-bold">Warning: Excessive SPL</p>
              <p className="text-sm">The calculated SPL exceeds 115 dB, which may be:</p>
              <ul className="list-disc ml-5 text-sm">
                <li>Beyond the performance limits of typical PA speakers</li>
                <li>Potentially harmful to human hearing (especially with sustained exposure)</li>
                <li>Unrealistic in typical applications</li>
              </ul>
              <p className="text-sm mt-1">Consider reducing power, speaker count, or increasing distance.</p>
            </div>
          </div>
        )}
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">Sound Pressure Level (SPL)</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Single Speaker SPL at {measurementDistance}m:</p>
              <p className="font-semibold text-gray-800">{isFinite(singleSpeakerSpl) ? singleSpeakerSpl.toFixed(1) : "N/A"} dB</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Combined SPL at {measurementDistance}m:</p>
              <p className="font-bold text-blue-600 text-lg">{isFinite(combinedSpl) ? combinedSpl.toFixed(1) : "N/A"} dB</p>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-50 p-3 rounded-md">
            <h5 className="font-medium text-sm text-gray-700 mb-2">Calculation Details</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Speaker Sensitivity:</p>
                <p className="font-medium">{effectiveSensitivity} dB (1W/1m)</p>
              </div>
              <div>
                <p className="text-gray-600">Speaker Power Gain:</p>
                <p className="font-medium">{speakerPower > 0 ? (10 * Math.log10(speakerPower)).toFixed(1) : "N/A"} dB (from {speakerPower}W)</p>
              </div>
              <div>
                <p className="text-gray-600">Distance Attenuation:</p>
                <p className="font-medium">{(referenceDistance > 0 && measurementDistance > 0 && measurementDistance/referenceDistance > 0) ? 
                  (() => {
                    const roomSizeConfig = ROOM_SIZE_TYPES.find(type => type.value === roomSize);
                    const nearFieldDistance = roomSizeConfig ? roomSizeConfig.nearFieldDistance : 2;
                    
                    if (measurementDistance <= nearFieldDistance) {
                      const reducedRatio = Math.max(1, measurementDistance / referenceDistance);
                      return (15 * Math.log10(reducedRatio)).toFixed(1) + " dB (near-field)";
                    } else {
                      const normalRatio = measurementDistance / referenceDistance;
                      const atten = nearFieldDistance > referenceDistance 
                        ? 15 * Math.log10(nearFieldDistance / referenceDistance) + 20 * Math.log10(measurementDistance / nearFieldDistance)
                        : 20 * Math.log10(normalRatio);
                      return atten.toFixed(1) + " dB";
                    }
                  })() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Multiple Speaker Gain:</p>
                <p className="font-medium">{speakerCount > 0 ? (10 * Math.log10(speakerCount)).toFixed(1) : "N/A"} dB</p>
              </div>
              <div>
                <p className="text-gray-600">Room Acoustic Adj.:</p>
                <p className="font-medium">
                    { (ROOM_ACOUSTIC_TYPES.find(type => type.value === roomAcoustics)?.factor || 0) > 0 ?
                       (10 * Math.log10(ROOM_ACOUSTIC_TYPES.find(type => type.value === roomAcoustics)?.factor || 1.0)).toFixed(1) : "N/A"
                    } dB
                </p>
              </div>
              <div>
                <p className="text-gray-600">Number of Speakers:</p>
                <p className="font-medium">{speakerCount}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">Intelligibility Assessment</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Ambient Noise Level:</p>
              <p className="font-semibold text-gray-800">{ambientNoiseLevel} dB</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Signal-to-Noise Ratio:</p>
              <p className="font-semibold text-gray-800">{isFinite(signalToNoiseRatio) ? signalToNoiseRatio.toFixed(1) : "N/A"} dB</p>
            </div>
          </div>
          
          <div className="mt-3">
            <p className="text-sm text-gray-600">Speech Intelligibility Rating:</p>
            <p className={`font-bold text-lg ${
              intelligibilityRating === 'Excellent' || intelligibilityRating === 'Very Good' 
                ? 'text-green-600' 
                : intelligibilityRating === 'Good' || intelligibilityRating === 'Fair'
                  ? 'text-yellow-600'
                  : intelligibilityRating === 'N/A' ? 'text-gray-600' : 'text-red-600' 
            }`}>
              {intelligibilityRating}
            </p>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">Recommended Applications:</p>
            {recommendedApplication.length > 0 ? (
              <ul className="list-disc pl-5 mt-1">
                {recommendedApplication.map((app, index) => (
                  <li key={index} className="text-sm font-medium text-blue-600">{app}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-medium text-red-600 mt-1">
                {isFinite(combinedSpl) ? "No suitable applications found for this SPL." : "Cannot determine applications."}
              </p>
            )}
          </div>
        </div>
        
        {/* SPL vs Distance Chart - Custom SVG Implementation */}
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">SPL vs Distance Chart</h4>
          
          <div className="w-full" style={{ height: 320 }}>
            {distanceTable.length > 0 ? (
              <CustomSplChart 
                distanceTable={distanceTable} 
                ambientNoiseLevel={ambientNoiseLevel} 
                measurementDistance={measurementDistance} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for chart
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">SPL at Different Distances</h4>
          
          <div className="overflow-x-auto">
            <table ref={tableRef} className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Distance (m)
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    SPL (dB)
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    SNR (dB)
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Intelligibility
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {distanceTable.map((entry, index) => {
                  const distanceSnr = isFinite(entry.spl) ? entry.spl - ambientNoiseLevel : -Infinity;
                  let distanceIntelligibility: string;
                  if (!isFinite(entry.spl)) distanceIntelligibility = 'N/A';
                  else if (distanceSnr >= 25) distanceIntelligibility = 'Excellent';
                  else if (distanceSnr >= 20) distanceIntelligibility = 'Very Good';
                  else if (distanceSnr >= 15) distanceIntelligibility = 'Good';
                  else if (distanceSnr >= 10) distanceIntelligibility = 'Fair';
                  else if (distanceSnr >= 5) distanceIntelligibility = 'Poor';
                  else distanceIntelligibility = 'Unintelligible';
                  
                  return (
                    <tr key={index} className={entry.distance === measurementDistance ? 'bg-blue-50' : ''}>
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">
                        {entry.distance} {entry.distance === measurementDistance && '(Selected)'}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-900">
                        {isFinite(entry.spl) ? entry.spl.toFixed(1) : "N/A"}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-900">
                        {isFinite(distanceSnr) ? distanceSnr.toFixed(1) : "N/A"}
                      </td>
                      <td className={`py-2 px-3 text-sm font-medium ${
                        distanceIntelligibility === 'Excellent' || distanceIntelligibility === 'Very Good' 
                          ? 'text-green-600' 
                          : distanceIntelligibility === 'Good' || distanceIntelligibility === 'Fair'
                            ? 'text-yellow-600'
                            : distanceIntelligibility === 'N/A' ? 'text-gray-600' : 'text-red-600'
                      }`}>
                        {distanceIntelligibility}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Design Recommendations</h4>
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
            <li>Target at least 15 dB signal-to-noise ratio (SNR) for good speech intelligibility.</li>
            <li>For emergency announcements (PAVA), aim for 15-20 dB SNR, and typically 10-15 dB above average ambient noise, with minimum SPL levels (e.g., 75 dBA at ear).</li>
            <li>Consider a distributed audio system (more, lower-power speakers) for large or complex spaces to maintain consistent SPL and intelligibility.</li>
            <li>In environments with highly variable noise, design for SPL levels well above the peak ambient noise.</li>
            <li>For music reproduction, ensure speakers and amplifiers have sufficient power handling capacity and dynamic range (often 2-3x speech SPL levels).</li>
          </ul>
          <p className="text-xs mt-2 text-blue-700">
            Note: These calculations are theoretical. Actual SPL and intelligibility should be verified with calibrated measurements (e.g., using an SPL meter, RTA, or STI-PA system).
          </p>
        </div>
        
        <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>SPL decreases by approximately 6 dB each time distance from a point source doubles (Inverse Square Law in free field).</li>
            <li>Actual SPL can vary significantly due to room reflections (reverberation), acoustic absorption, obstacles, and speaker directivity (dispersion pattern).</li>
            <li>Combining multiple coherent sound sources (e.g. very close speakers) can result in up to 6dB increase when doubling sources. For typical PA speakers (incoherent, spaced), it's closer to 3dB per doubling.</li>
            <li>Speech intelligibility (e.g., STI, CIS) is a more comprehensive measure than just SNR, especially in reverberant spaces.</li>
            <li>Ensure compliance with local regulations for PAVA systems regarding SPL, SNR, intelligibility, and coverage uniformity (e.g., EN 54-24 for speakers).</li>
            <li>Human perception of loudness is logarithmic (related to dB scale) and frequency-dependent (e.g., A-weighting).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== AMPLIFIER POWER CALCULATOR ========================

interface AmplifierPowerCalculatorProps {
  onShowTutorial?: () => void;
}

const AMP_SPEAKER_TYPES = [
  { value: 'ceiling4', label: '4" Ceiling Speaker', impedance: 8, powerHandling: 10 },
  { value: 'ceiling6', label: '6" Ceiling Speaker', impedance: 8, powerHandling: 15 },
  { value: 'ceiling8', label: '8" Ceiling Speaker', impedance: 8, powerHandling: 25 },
  { value: 'wallMount', label: 'Wall-Mount Speaker', impedance: 8, powerHandling: 30 },
  { value: 'columnSpeaker', label: 'Column Speaker', impedance: 8, powerHandling: 40 },
  { value: 'hornSpeaker', label: 'Horn Speaker', impedance: 16, powerHandling: 30 },
  { value: 'custom', label: 'Custom Speaker', impedance: 8, powerHandling: 20 } 
];

const IMPEDANCE_OPTIONS = [
  { value: 4, label: '4 Ohms' },
  { value: 8, label: '8 Ohms' },
  { value: 16, label: '16 Ohms' }
];

const TRANSFORMER_TAPS = [
  { value: 0.5, label: '0.5W' }, { value: 1, label: '1W' },   { value: 2, label: '2W' },
  { value: 3, label: '3W' },   { value: 5, label: '5W' },   { value: 7.5, label: '7.5W' },
  { value: 10, label: '10W' },  { value: 15, label: '15W' },  { value: 30, label: '30W' }
];

const STANDARD_AMPLIFIER_RATINGS = [60, 120, 240, 360, 500, 750, 1000, 1500, 2000];

const DISTRIBUTION_TYPES = [
  { value: 'lowZ', label: 'Low Impedance Direct (4-16Ω)' },
  { value: '70v', label: '70V Distributed System' },
  { value: '100v', label: '100V Distributed System' }
];

const ZONE_TYPES = [
  { value: 'background', label: 'Background Music', headroom: 1.2 }, // 20% headroom
  { value: 'foreground', label: 'Foreground Music', headroom: 1.5 }, // 50% headroom
  { value: 'paging', label: 'Paging/Announcements', headroom: 1.2 },
  { value: 'emergency', label: 'Emergency System', headroom: 2.0 }  // 100% headroom (double power)
];

interface Zone {
  id: string;
  name: string;
  speakerType: string;
  speakerCount: number;
  impedance: number; 
  powerSetting: number;
  zoneType: string;
  customPowerHandling?: number;
}

const getDefaultImpedanceForType = (typeValue: string) => {
    const speakerData = AMP_SPEAKER_TYPES.find(s => s.value === typeValue);
    return speakerData ? speakerData.impedance : 8;
};
const getDefaultPowerHandlingForType = (typeValue: string) => {
    const speakerData = AMP_SPEAKER_TYPES.find(s => s.value === typeValue);
    return speakerData ? speakerData.powerHandling : 20;
};

const AmplifierPowerCalculator: React.FC<AmplifierPowerCalculatorProps> = ({ onShowTutorial }) => {
  const [distributionSystem, setDistributionSystem] = useState<string>('70v');
  
  const [zones, setZones] = useState<Zone[]>([
    {
      id: '1', name: 'Main Area', speakerType: 'ceiling6', speakerCount: 8,
      impedance: getDefaultImpedanceForType('ceiling6'),
      powerSetting: 5, zoneType: 'background'
    }
  ]);
  
  const [zonePowerResults, setZonePowerResults] = useState<any[]>([]);
  const [totalPower, setTotalPower] = useState<number>(0);
  const [recommendedAmplifierPower, setRecommendedAmplifierPower] = useState<number>(0);
  const [recommendedAmplifierRating, setRecommendedAmplifierRating] = useState<number>(0);
  const [minimumImpedance, setMinimumImpedance] = useState<number>(Infinity);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  
  useEffect(() => {
    const results = zones.map(zone => {
      const speakerDetails = AMP_SPEAKER_TYPES.find(t => t.value === zone.speakerType);
      const maxSpeakerPowerHandling = (zone.speakerType === 'custom' && zone.customPowerHandling !== undefined)
                                    ? zone.customPowerHandling
                                    : (speakerDetails?.powerHandling || getDefaultPowerHandlingForType(zone.speakerType));

      let powerPerSpeaker: number;
      if (distributionSystem === 'lowZ') {
        powerPerSpeaker = Math.min(zone.powerSetting, maxSpeakerPowerHandling); 
      } else { // 70V/100V
        powerPerSpeaker = zone.powerSetting; // This is the tap setting
      }
        
      const rawZonePower = powerPerSpeaker * zone.speakerCount;
      const zoneTypeData = ZONE_TYPES.find(t => t.value === zone.zoneType);
      const headroomFactor = zoneTypeData?.headroom || 1.2;
      const zonePowerWithHeadroom = rawZonePower * headroomFactor;
      
      let effectiveImpedance: number | null = null;
      if (distributionSystem === 'lowZ' && zone.speakerCount > 0 && zone.impedance > 0) {
        effectiveImpedance = zone.impedance / zone.speakerCount;
      }
      
      return {
        zoneId: zone.id, zoneName: zone.name, powerPerSpeaker, rawZonePower,
        headroomFactor, zonePowerWithHeadroom, effectiveImpedance,
        speakerCount: zone.speakerCount, maxSpeakerPowerHandling
      };
    });
    
    setZonePowerResults(results);
    
    const totalRawPowerForAllZones = results.reduce((sum, z) => sum + z.rawZonePower, 0);
    setTotalPower(totalRawPowerForAllZones);
    
    const totalPowerWithHeadroomForAllZones = results.reduce((sum, z) => sum + z.zonePowerWithHeadroom, 0);
    setRecommendedAmplifierPower(totalPowerWithHeadroomForAllZones);
    
    const finalRecRating = STANDARD_AMPLIFIER_RATINGS.find(rating => rating >= totalPowerWithHeadroomForAllZones) || 
      Math.ceil(totalPowerWithHeadroomForAllZones / 100) * 100;
    setRecommendedAmplifierRating(finalRecRating);
    
    const warnings: string[] = [];
    if (distributionSystem === 'lowZ') {
      const minZValue = results
        .filter(z => z.effectiveImpedance !== null && z.effectiveImpedance > 0)
        .reduce((min, z) => Math.min(min, z.effectiveImpedance!), Infinity);
      setMinimumImpedance(minZValue);
      
      if (minZValue < 4 && isFinite(minZValue)) warnings.push(`System impedance (${minZValue.toFixed(1)}Ω) is < 4Ω. Check amplifier compatibility.`);
      if (minZValue < 2 && isFinite(minZValue)) warnings.push(`CRITICAL: Impedance (${minZValue.toFixed(1)}Ω) < 2Ω. High risk of amplifier damage.`);
      
      results.forEach(r => {
          if (r.powerPerSpeaker > r.maxSpeakerPowerHandling) {
              warnings.push(`Zone "${r.zoneName}": Power per speaker (${r.powerPerSpeaker}W) exceeds speaker capacity (${r.maxSpeakerPowerHandling}W).`);
          }
      });
    } else {
      setMinimumImpedance(Infinity);
    }
    setLoadWarnings(warnings);
    
  }, [zones, distributionSystem]);
  
  const addZone = () => {
    const newId = `zone-${Date.now()}`;
    const defaultType = 'ceiling6';
    setZones(prevZones => [
      ...prevZones,
      {
        id: newId, name: `Zone ${prevZones.length + 1}`, speakerType: defaultType, speakerCount: 4,
        impedance: getDefaultImpedanceForType(defaultType),
        powerSetting: 5, zoneType: 'background'
      }
    ]);
  };
  
  const removeZone = (id: string) => {
    if (zones.length > 1) setZones(zones.filter(zone => zone.id !== id));
  };
  
  const updateZone = (id: string, field: keyof Zone, value: any) => {
    setZones(zones.map(zone => {
      if (zone.id === id) {
        const updatedZone = { ...zone };

        if (field === 'speakerType') {
          const newTypeValue = String(value);
          updatedZone.speakerType = newTypeValue;
          const speakerData = AMP_SPEAKER_TYPES.find(s => s.value === newTypeValue);
          if (speakerData) {
            updatedZone.impedance = speakerData.impedance;
            if (newTypeValue === 'custom') {
              if (updatedZone.customPowerHandling === undefined) { 
                updatedZone.customPowerHandling = speakerData.powerHandling;
              }
            } else {
              delete updatedZone.customPowerHandling;
            }
          }
        } else if (field === 'name' || field === 'zoneType') {
           (updatedZone[field] as any) = String(value);
        } else if (['speakerCount', 'impedance', 'powerSetting', 'customPowerHandling'].includes(field)) {
           (updatedZone[field as 'speakerCount' | 'impedance' | 'powerSetting' | 'customPowerHandling'] as any) = Number(value) >=0 ? Number(value) : 0;
        }
        return updatedZone;
      }
      return zone;
    }));
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">System Configuration</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Distribution System Type
          </label>
          <select value={distributionSystem} onChange={(e) => setDistributionSystem(e.target.value)} className="w-full p-2 border rounded-md">
            {DISTRIBUTION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {distributionSystem === 'lowZ' 
              ? 'Low impedance for shorter runs, higher fidelity. Ensure amp matches load impedance.' 
              : `${distributionSystem.toUpperCase()} for long distances, many speakers. Use transformer-tapped speakers.`}
          </p>
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg text-gray-700">Speaker Zones</h3>
          <button onClick={addZone} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Add Zone</button>
        </div>
        
        {zones.map((zone) => {
          const zResult = zonePowerResults.find(r => r.zoneId === zone.id);
          return (
            <div key={zone.id} className="mb-6 bg-white p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-3">
                <input type="text" value={zone.name} onChange={(e) => updateZone(zone.id, 'name', e.target.value)} className="font-medium text-gray-700 p-1 border rounded w-full" />
                {zones.length > 1 && <button onClick={() => removeZone(zone.id)} className="ml-2 text-red-600 hover:text-red-800 text-sm">Remove</button>}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Speaker Type</label>
                  <select value={zone.speakerType} onChange={(e) => updateZone(zone.id, 'speakerType', e.target.value)} className="w-full p-2 border rounded-md">
                    {AMP_SPEAKER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Speakers</label>
                  <input type="number" min="1" value={zone.speakerCount} onChange={(e) => updateZone(zone.id, 'speakerCount', Number(e.target.value))} className="w-full p-2 border rounded-md" />
                </div>
              </div>
              
              {zone.speakerType === 'custom' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Power Handling (W per speaker)</label>
                  <input type="number" min="1" value={zone.customPowerHandling ?? getDefaultPowerHandlingForType('custom')} onChange={(e) => updateZone(zone.id, 'customPowerHandling', Number(e.target.value))} className="w-full p-2 border rounded-md" />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                {distributionSystem !== 'lowZ' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Tap Setting (W)</label>
                    <select value={zone.powerSetting} onChange={(e) => updateZone(zone.id, 'powerSetting', Number(e.target.value))} className="w-full p-2 border rounded-md">
                      {TRANSFORMER_TAPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Speaker Impedance (Ω)</label>
                      <select value={zone.impedance} onChange={(e) => updateZone(zone.id, 'impedance', Number(e.target.value))} className="w-full p-2 border rounded-md" disabled={zone.speakerType !== 'custom'}>
                        {IMPEDANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {zone.speakerType !== 'custom' && <p className="text-xs text-gray-500 mt-1">Set by speaker type.</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Power per Speaker (W)</label>
                      <input type="number" min="1" value={zone.powerSetting} onChange={(e) => updateZone(zone.id, 'powerSetting', Number(e.target.value))} className="w-full p-2 border rounded-md" />
                      {zResult && zResult.maxSpeakerPowerHandling !== null && (
                         <p className={`text-xs mt-1 ${zone.powerSetting > zResult.maxSpeakerPowerHandling ? 'text-red-500' : 'text-gray-500'}`}>
                           Max capacity: {zResult.maxSpeakerPowerHandling}W.
                         </p>
                       )}
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone Type (Usage)</label>
                  <select value={zone.zoneType} onChange={(e) => updateZone(zone.id, 'zoneType', e.target.value)} className="w-full p-2 border rounded-md">
                    {ZONE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              
              {zResult && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                  <p className="font-medium text-gray-700">Zone Calc Preview:</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <span>Power/Speaker: <span className="font-medium">{zResult.powerPerSpeaker}W</span></span>
                    <span>Total Zone Power: <span className="font-medium">{zResult.rawZonePower}W</span></span>
                    {distributionSystem === 'lowZ' && zResult.effectiveImpedance !== null && <span>Zone Load Z: <span className="font-medium">{zResult.effectiveImpedance.toFixed(1)}Ω</span></span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Amplifier Requirements</h3>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border">
          <h4 className="font-medium text-base text-gray-700 mb-3">Power Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-600">Total Speaker Power (Sum of Zones):</p><p className="font-semibold text-gray-800">{totalPower.toFixed(1)} W</p></div>
            <div><p className="text-sm text-gray-600">Total Power with Headroom:</p><p className="font-semibold text-gray-800">{recommendedAmplifierPower.toFixed(1)} W</p></div>
          </div>
          <div className="mt-4 bg-blue-100 p-4 rounded-md">
            <p className="text-sm text-gray-700 font-medium">Recommended Amplifier Rating:</p>
            <p className="font-bold text-blue-700 text-2xl">{recommendedAmplifierRating} W</p>
            <p className="text-xs text-gray-600 mt-1">Select a standard amplifier that meets or exceeds the "Total Power with Headroom".</p>
          </div>
          
          {distributionSystem === 'lowZ' && (
            <div className="mt-4 bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700 font-medium">Minimum System Load Impedance:</p>
              <p className={`font-medium ${minimumImpedance < 4 && isFinite(minimumImpedance) ? 'text-red-600' : 'text-gray-800'}`}>
                {isFinite(minimumImpedance) ? `${minimumImpedance.toFixed(1)} Ω` : 'N/A (No speakers or 0 impedance)'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Amplifier must be stable at this load.
              </p>
              
              {loadWarnings.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  {loadWarnings.map((warning, index) => (
                    <p key={index} className="text-sm text-red-600 font-semibold">{warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border">
          <h4 className="font-medium text-base text-gray-700 mb-3">Zone Power Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Zone</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Speakers</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Power/Spkr</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Raw Pwr (Zone)</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Pwr w/ Headroom</th>
                  {distributionSystem === 'lowZ' && <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Load Z (Zone)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {zonePowerResults.map((result, index) => (
                  <tr key={index}>
                    <td className="py-2 px-3 text-sm font-medium text-gray-900">{result.zoneName}</td>
                    <td className="py-2 px-3 text-sm text-gray-900">{result.speakerCount}</td>
                    <td className="py-2 px-3 text-sm text-gray-900">{result.powerPerSpeaker}W</td>
                    <td className="py-2 px-3 text-sm text-gray-900">{result.rawZonePower.toFixed(1)}W</td>
                    <td className="py-2 px-3 text-sm text-gray-900">{result.zonePowerWithHeadroom.toFixed(1)}W ({result.headroomFactor}x)</td>
                    {distributionSystem === 'lowZ' && (
                      <td className={`py-2 px-3 text-sm ${result.effectiveImpedance !== null && result.effectiveImpedance < 4 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {result.effectiveImpedance !== null ? `${result.effectiveImpedance.toFixed(1)}Ω` : 'N/A'}
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="py-2 px-3 text-sm text-gray-900">TOTALS</td>
                  <td className="py-2 px-3 text-sm text-gray-900">{zonePowerResults.reduce((sum, z) => sum + z.speakerCount, 0)}</td>
                  <td className="py-2 px-3 text-sm text-gray-900">-</td>
                  <td className="py-2 px-3 text-sm text-gray-900">{totalPower.toFixed(1)}W</td>
                  <td className="py-2 px-3 text-sm text-gray-900">{recommendedAmplifierPower.toFixed(1)}W</td>
                  {distributionSystem === 'lowZ' && <td className="py-2 px-3 text-sm text-gray-900">{isFinite(minimumImpedance) ? `${minimumImpedance.toFixed(1)}Ω (System Min)` : 'N/A'}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Design & Wiring Considerations</h4>
          
          <h5 className="text-sm font-medium text-blue-700 mt-3">Amplifier & System Setup</h5>
          <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-blue-800">
            {distributionSystem === 'lowZ' ? (
              <>
                <li>Ensure amplifier is rated for the minimum system load impedance: {isFinite(minimumImpedance) ? `${minimumImpedance.toFixed(1)} Ω` : 'N/A'}.</li>
                <li>For high-fidelity audio, consider an amplifier with power rating ~1.5x to 2x the "Total Speaker Power".</li>
                <li>Multiple smaller amplifiers can offer better zone control and redundancy.</li>
                <li>Keep cable runs short (typically  15-20m) to minimize loss and maintain damping factor.</li>
                <li>Ensure all speakers in a low-Z parallel circuit are of the same impedance.</li>
              </>
            ) : (
              <>
                <li>Ensure amplifier has {distributionSystem === '70v' ? '70V' : '100V'} line output capability.</li>
                <li>The "Total Speaker Power" (sum of tap settings) should not exceed 80-90% of the amplifier's rated power for reliability and to avoid clipping.</li>
                <li>Use speaker wire gauge appropriate for the total load and distance (see Cable Loss calculator).</li>
                <li>Consider using in-line volume controls (attenuators) for individual speaker or small group adjustments, ensuring they match the line voltage and power.</li>
              </>
            )}
          </ul>
          
          <h5 className="text-sm font-medium text-blue-700 mt-3">Wiring Guidelines</h5>
          <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-blue-800">
            {distributionSystem === 'lowZ' ? (
              <>
                <li>For 4Ω system loads, use thick gauge wire (e.g., 12 AWG or larger, especially for runs  5-10m).</li>
                <li>For 8Ω system loads, 16-14 AWG is often suitable for runs up to 15m.</li>
                <li>Maintain correct polarity (+/-) for all speaker connections to avoid phase cancellation.</li>
              </>
            ) : (
              <>
                <li>For 70V/100V lines, typical wire gauges based on run length and total power:
                    <ul>
                        <li>Short runs (50m), low power: 18-16 AWG.</li>
                        <li>Medium runs (50-150m), moderate power: 16-14 AWG.</li>
                        <li>Long runs (150m) or high power: 14-12 AWG or larger.</li>
                    </ul>
                </li>
                <li>Ensure correct polarity on transformer primaries (if applicable) and speaker connections.</li>
                <li>Avoid mixing 70V and 100V components unless explicitly designed for compatibility.</li>
              </>
            )}
          </ul>
        </div>
        
        <div className="mt-8 bg-gray-100 p-4 rounded-lg border">
          <h3 className="font-medium text-lg mb-2 text-gray-700">Important Notes</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>For critical systems (e.g., voice evacuation/PAVA), always adhere to local fire safety and building codes (e.g., EN54, NFPA72).</li>
            <li>Amplifiers generally perform best and last longer when not driven continuously at their maximum rated power. The calculated headroom helps account for this.</li>
            <li>Consider amplifier class (A, AB, D, etc.) for efficiency, heat, and audio quality needs. Class D is common for PA.</li>
            <li>Always verify speaker tap settings and wiring integrity during installation and commissioning.</li>
            <li>Factor in power requirements for any signal processing equipment (mixers, DSPs) in the system design.</li>
            <li>For emergency systems, uninterruptible power supplies (UPS) or backup power solutions are often mandatory.</li>
            <li>It's good practice to allow for 15-25% spare amplifier capacity for future expansion or unforeseen needs.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== CABLE LOSS CALCULATOR ========================

interface CableLossCalculatorProps {
  onShowTutorial?: () => void;
}

const CABLE_LOSS_CABLE_TYPES = [
  { value: '22awg', label: '22 AWG (0.65mm²)', resistance: 0.0521 }, // Ohms per meter per conductor
  { value: '20awg', label: '20 AWG (0.82mm²)', resistance: 0.0328 },
  { value: '18awg', label: '18 AWG (1.0mm²)', resistance: 0.0206 },
  { value: '16awg', label: '16 AWG (1.3mm²)', resistance: 0.0130 },
  { value: '14awg', label: '14 AWG (2.1mm²)', resistance: 0.0082 },
  { value: '12awg', label: '12 AWG (3.3mm²)', resistance: 0.0051 },
  { value: '10awg', label: '10 AWG (5.3mm²)', resistance: 0.0032 },
  { value: 'custom', label: 'Custom Resistance', resistance: 0.01 } // Default for custom
];

const CABLE_LOSS_SPEAKER_IMPEDANCE_OPTIONS = [
  { value: 4, label: '4 Ohms (Low Impedance)' },
  { value: 8, label: '8 Ohms (Standard)' },
  { value: 16, label: '16 Ohms (High Impedance)' },
  { value: '70v_load', label: '70V System Load (Calculated from Power)' }, // Represents the equivalent load impedance derived from power on a 70V line
  { value: '100v_load', label: '100V System Load (Calculated from Power)' }, // Represents the equivalent load impedance derived from power on a 100V line
  { value: 'custom_Z', label: 'Custom Impedance (Low Z)' }
];

const CABLE_LOSS_AMPLIFIER_POWER_OPTIONS = [
  { value: 50, label: '50W' }, { value: 100, label: '100W' }, { value: 250, label: '250W' },
  { value: 500, label: '500W' }, { value: 1000, label: '1000W' },
  { value: 'custom_W', label: 'Custom Power (W)' }
];

const CableLossCalculator: React.FC<CableLossCalculatorProps> = ({ onShowTutorial }) => {
  const [cableType, setCableType] = useState<string>('16awg');
  const [customResistancePerMeter, setCustomResistancePerMeter] = useState<number>(
    CABLE_LOSS_CABLE_TYPES.find(c => c.value === 'custom')?.resistance || 0.01
  );
  const [cableLength, setCableLength] = useState<number>(30);
  
  const [speakerImpedanceType, setSpeakerImpedanceType] = useState<string | number>(8);
  const [customLowImpedance, setCustomLowImpedance] = useState<number>(8);
  
  const [amplifierPowerSetting, setAmplifierPowerSetting] = useState<string | number>(100);
  const [customAmplifierPower, setCustomAmplifierPower] = useState<number>(100);
  
  // Added user-configurable amplifier output impedance
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [amplifierOutputImpedance, setAmplifierOutputImpedance] = useState<number>(0.05);
  
  const [totalCableResistance, setTotalCableResistance] = useState<number>(0);
  const [powerLossWatts, setPowerLossWatts] = useState<number>(0);
  const [powerLossPercent, setPowerLossPercent] = useState<number>(0);
  const [dampingFactorReductionPercent, setDampingFactorReductionPercent] = useState<number>(0);
  const [voltageDropVolts, setVoltageDropVolts] = useState<number>(0);
  const [actualPowerDeliveredWatts, setActualPowerDeliveredWatts] = useState<number>(0);
  const [effectiveLoadImpedanceOhms, setEffectiveLoadImpedanceOhms] = useState<number>(0);
  
  const [isLossAcceptable, setIsLossAcceptable] = useState<boolean>(true);
  const [recommendedCableTypeLabel, setRecommendedCableTypeLabel] = useState<string>('');
  const [maxSafeLengthForCurrentCable, setMaxSafeLengthForCurrentCable] = useState<number>(0);
  
  useEffect(() => {
    let resPerMeter: number;
    if (cableType === 'custom') {
      resPerMeter = customResistancePerMeter > 0 ? customResistancePerMeter : 0.00001; // Prevent division by zero
    } else {
      const selected = CABLE_LOSS_CABLE_TYPES.find(c => c.value === cableType);
      resPerMeter = selected ? selected.resistance : 0.01;
    }

    let actualAmpPower: number;
    if (amplifierPowerSetting === 'custom_W') {
      actualAmpPower = customAmplifierPower > 0 ? customAmplifierPower : 1;
    } else {
      actualAmpPower = Number(amplifierPowerSetting);
    }

    let actualSpeakerLoadImpedance: number;
    let isConstantVoltageSystem = false;
    let nominalLineVoltage = 0;

    if (speakerImpedanceType === '70v_load') {
      isConstantVoltageSystem = true;
      nominalLineVoltage = 70;
      actualSpeakerLoadImpedance = actualAmpPower > 0 ? (70 * 70) / actualAmpPower : Infinity;
    } else if (speakerImpedanceType === '100v_load') {
      isConstantVoltageSystem = true;
      nominalLineVoltage = 100;
      actualSpeakerLoadImpedance = actualAmpPower > 0 ? (100 * 100) / actualAmpPower : Infinity;
    } else if (speakerImpedanceType === 'custom_Z') {
      actualSpeakerLoadImpedance = customLowImpedance > 0 ? customLowImpedance : 0.1;
    } else {
      actualSpeakerLoadImpedance = Number(speakerImpedanceType) > 0 ? Number(speakerImpedanceType) : 0.1;
    }
    
    const R_cable_total = resPerMeter * cableLength * 2; // There and back
    setTotalCableResistance(R_cable_total);
    
    const R_load_effective = actualSpeakerLoadImpedance + R_cable_total;
    setEffectiveLoadImpedanceOhms(R_load_effective);

    let P_loss_watts = 0;
    let P_loss_percent = 0;
    let V_drop_volts = 0;
    let P_delivered_watts = 0;
    let DF_reduction_percent = 0;

    if (R_load_effective > 0 && actualSpeakerLoadImpedance > 0) {
      if (isConstantVoltageSystem) {
        // For 70V/100V, calculate based on current at nominal voltage
        const I_line = actualAmpPower > 0 && nominalLineVoltage > 0 ? actualAmpPower / nominalLineVoltage : 0;
        V_drop_volts = I_line * R_cable_total;
        P_loss_watts = I_line * I_line * R_cable_total; // I^2 * R_cable
        
        if (actualAmpPower > 0) {
            P_loss_percent = (P_loss_watts / actualAmpPower) * 100;
        } else {
            P_loss_percent = 0;
        }
        P_delivered_watts = actualAmpPower - P_loss_watts;
        DF_reduction_percent = 0; // Damping factor less relevant for CV systems
      } else {
        // For Low Impedance systems
        // P_loss = P_amp_total * (R_cable / R_effective_load)
        P_loss_percent = (R_cable_total / R_load_effective) * 100;
        P_loss_watts = actualAmpPower * (P_loss_percent / 100);
        P_delivered_watts = actualAmpPower - P_loss_watts;

        // Voltage drop: V_speaker = sqrt(P_delivered * R_speaker_load)
        // I_speaker = V_speaker / R_speaker_load = sqrt(P_delivered / R_speaker_load)
        // V_drop = I_speaker * R_cable
        const I_circuit = R_load_effective > 0 ? Math.sqrt(actualAmpPower / R_load_effective) : 0; // Current through the whole circuit
        V_drop_volts = I_circuit * R_cable_total;

        // Damping Factor: Using user-configurable amplifier output impedance
        const Z_amp_out = amplifierOutputImpedance > 0 ? amplifierOutputImpedance : 0.001; // Prevent division by zero
        const DF_original = actualSpeakerLoadImpedance / Z_amp_out;
        const DF_new = actualSpeakerLoadImpedance / (Z_amp_out + R_cable_total);
        if (DF_original > 0) {
           DF_reduction_percent = (1 - (DF_new / DF_original)) * 100;
        } else {
           DF_reduction_percent = 100; // or some indicator of error
        }
      }
    }

    setPowerLossWatts(P_loss_watts);
    setPowerLossPercent(P_loss_percent);
    setVoltageDropVolts(V_drop_volts);
    setActualPowerDeliveredWatts(P_delivered_watts);
    setDampingFactorReductionPercent(DF_reduction_percent);

    const acceptable = P_loss_percent < 10; // General rule of thumb: <10% or <0.5dB loss
    setIsLossAcceptable(acceptable);

    // Always calculate the recommended cable type and max safe length
    if (actualSpeakerLoadImpedance > 0 && cableLength > 0) {
      // Target R_cable_total to achieve <10% loss. For low-Z: R_cable / (R_speaker + R_cable) < 0.1 => R_cable < 0.1 * R_speaker / 0.9
      const target_R_cable_total_lowZ = (0.1 * actualSpeakerLoadImpedance) / 0.9;
      // For CV: (I^2 * R_cable) / P_amp < 0.1 => R_cable < 0.1 * P_amp / I^2 = 0.1 * V_nom^2 / P_amp
      const target_R_cable_total_CV = nominalLineVoltage > 0 && actualAmpPower > 0 ? (0.1 * nominalLineVoltage * nominalLineVoltage) / actualAmpPower : Infinity;

      const target_R_cable_total = isConstantVoltageSystem ? target_R_cable_total_CV : target_R_cable_total_lowZ;
      const target_res_per_meter = target_R_cable_total / (cableLength * 2);

      const betterCable = CABLE_LOSS_CABLE_TYPES
        .filter(c => c.value !== 'custom' && c.resistance < resPerMeter && c.resistance <= target_res_per_meter)
        .sort((a,b) => a.resistance - b.resistance)[0]; // Get the one just better or best
      
      if (!acceptable) {
        if (betterCable) {
          setRecommendedCableTypeLabel(betterCable.label);
        } else if (resPerMeter > target_res_per_meter){
           setRecommendedCableTypeLabel('Thicker custom cable needed or reduce length / use CV.');
        }
      } else {
        setRecommendedCableTypeLabel('');
      }

      // Max length for current cable for <10% loss
      // R_cable_total_max = resPerMeter * L_max * 2
      // L_max = R_cable_total_max / (resPerMeter * 2)
      if (resPerMeter > 0) {
        const L_max = target_R_cable_total / (resPerMeter * 2);
        setMaxSafeLengthForCurrentCable(L_max);
      }
    }
    
  }, [cableType, customResistancePerMeter, cableLength, speakerImpedanceType, customLowImpedance, amplifierPowerSetting, customAmplifierPower, amplifierOutputImpedance]);
  
  return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-4 text-gray-700">Cable & System Specifications</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cable Type (Wire Gauge)</label>
            <select 
              value={cableType} 
              onChange={(e) => setCableType(e.target.value)} 
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {CABLE_LOSS_CABLE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {cableType === 'custom' && (
              <div className="mt-2 pl-4 border-l-4 border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Resistance (Ω per meter, per conductor)</label>
                <input 
                  type="number" 
                  min="0.0001" 
                  step="0.0001" 
                  value={customResistancePerMeter} 
                  onChange={(e) => setCustomResistancePerMeter(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cable Length (meters, one-way)</label>
            <input 
              type="number" 
              min="1" 
              value={cableLength} 
              onChange={(e) => setCableLength(Number(e.target.value) > 0 ? Number(e.target.value) : 1)} 
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="border-t border-gray-300 my-6"></div>
          
          <h3 className="font-medium text-lg mb-4 text-gray-700">Load & Amplifier Specifications</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Speaker/System Load Type</label>
            <select
              value={speakerImpedanceType}
              onChange={(e) => setSpeakerImpedanceType(e.target.value === 'custom_Z' || e.target.value.includes('v_load') ? e.target.value : Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {CABLE_LOSS_SPEAKER_IMPEDANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {speakerImpedanceType === 'custom_Z' && (
              <div className="mt-2 pl-4 border-l-4 border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Low Impedance (Ohms)</label>
                <input 
                  type="number" 
                  min="1" 
                  step="0.1" 
                  value={customLowImpedance} 
                  onChange={(e) => setCustomLowImpedance(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            {(speakerImpedanceType === '70v_load' || speakerImpedanceType === '100v_load') && (
              <p className="text-xs text-gray-500 mt-1">For 70V/100V systems, the load impedance is calculated based on the total power drawn by the speakers on the line.</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amplifier Power / Total Speaker Power (Watts)</label>
            <select
              value={amplifierPowerSetting}
              onChange={(e) => setAmplifierPowerSetting(e.target.value === 'custom_W' ? e.target.value : Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {CABLE_LOSS_AMPLIFIER_POWER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {amplifierPowerSetting === 'custom_W' && (
              <div className="mt-2 pl-4 border-l-4 border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Power (Watts)</label>
                <input 
                  type="number" 
                  min="1" 
                  value={customAmplifierPower} 
                  onChange={(e) => setCustomAmplifierPower(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">For 70V/100V, this is the total power of all speaker taps on the line. For Low-Z, it's the amplifier output power for that load.</p>
          </div>
          
          {/* Advanced Settings Toggle */}
          <div className="mb-4">
            <button 
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
            >
              {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
              <svg 
                className={`ml-1 h-4 w-4 transform ${showAdvancedSettings ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAdvancedSettings && (
              <div className="mt-2 pl-4 border-l-4 border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amplifier Output Impedance (Ohms)
                </label>
                <input 
                  type="number" 
                  min="0.001" 
                  step="0.001" 
                  value={amplifierOutputImpedance} 
                  onChange={(e) => setAmplifierOutputImpedance(Number(e.target.value))} 
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Typical values are 0.01-0.1 Ohms. Used for damping factor calculations.</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-100 rounded-md mt-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Cable Gauge Reference (Resistance per meter, per conductor)</h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {CABLE_LOSS_CABLE_TYPES.filter(c => c.value !== 'custom').map(c => (
                <div key={c.value} className="flex justify-between">
                  <span>{c.label}:</span> 
                  <span>{c.resistance.toFixed(4)} Ω/m</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">Cable Loss Calculation Results</h3>
          
          <div className="bg-white p-4 rounded-md shadow-sm mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-gray-700 mb-3">Loss Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Cable Resistance (Round Trip):</p>
                <p className="font-semibold text-gray-800">{totalCableResistance.toFixed(3)} Ω</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Power Loss:</p>
                <p className={`font-semibold ${!isLossAcceptable ? 'text-red-600' : 'text-gray-800'}`}>
                  {powerLossWatts.toFixed(2)} W ({powerLossPercent.toFixed(2)}%)
                </p>
                <p className="text-xs text-gray-500">({(10 * Math.log10(1 - powerLossPercent/100)).toFixed(2)} dB loss)</p>
              </div>
            </div>
            <div className="mt-4 bg-blue-100 p-3 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700">Initial Power:</p>
                  <p className="font-medium">{typeof amplifierPowerSetting === 'string' ? customAmplifierPower : amplifierPowerSetting} W</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700">Power Delivered to Load:</p>
                  <p className="font-bold text-blue-700">{actualPowerDeliveredWatts.toFixed(2)} W</p>
                </div>
              </div>
              <div className={`mt-2 p-2 rounded-md ${isLossAcceptable ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
                <p className={`text-sm font-medium ${isLossAcceptable ? 'text-green-700' : 'text-red-700'}`}>
                  {isLossAcceptable ? 'Power loss is within acceptable range (<10% or <0.5dB).' : 'Power loss exceeds typical acceptable limits.'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-md shadow-sm mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-gray-700 mb-3">Detailed Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Voltage Drop Across Cable:</p>
                <p className="font-semibold text-gray-800">{voltageDropVolts.toFixed(2)} V</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Effective Load (Speaker + Cable):</p>
                <p className="font-semibold text-gray-800">{effectiveLoadImpedanceOhms.toFixed(2)} Ω</p>
              </div>
            </div>
            
            {!(speakerImpedanceType === '70v_load' || speakerImpedanceType === '100v_load') && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Damping Factor Reduction:</p>
                <p className={`font-semibold ${dampingFactorReductionPercent > 50 ? 'text-orange-600' : 'text-gray-800'}`}>
                  {dampingFactorReductionPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Significant reduction can affect bass tightness. Aim for 50% reduction.</p>
              </div>
            )}
            
            <div className="mt-4 bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <h5 className="font-medium text-sm text-yellow-800 mb-1">Cable Length Assessment:</h5>
              {!isLossAcceptable && (
                <>
                  {recommendedCableTypeLabel && <p className="text-sm text-yellow-700">Consider using a thicker cable: <strong>{recommendedCableTypeLabel}</strong></p>}
                  {maxSafeLengthForCurrentCable > 0 && <p className="text-sm text-yellow-700 mt-1">Max length for current cable (for 10% loss): <strong>{maxSafeLengthForCurrentCable.toFixed(1)} m</strong></p>}
                  {!(speakerImpedanceType === '70v_load' || speakerImpedanceType === '100v_load') && cableLength > 20 && <p className="text-sm text-yellow-700 mt-1">For long runs with low impedance, consider switching to a 70V/100V system.</p>}
                  <p className="text-sm text-yellow-700 mt-1">Alternatively, use multiple parallel cable runs (effectively thicker wire) or a higher impedance speaker load if possible.</p>
                </>
              )}
              {isLossAcceptable && (
                <p className="text-sm text-green-700">
                  <strong>Current cable length is within acceptable limits.</strong> Maximum recommended length with this cable is <strong>{maxSafeLengthForCurrentCable.toFixed(1)} m</strong> before losses exceed 10%.
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-md shadow-sm mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-gray-700 mb-3">Estimated Loss vs. Distance (for current cable & load)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase border border-gray-200">Dist (m)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase border border-gray-200">R_cable (Ω)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase border border-gray-200">Loss (%)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase border border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[10, 20, 30, 50, 75, 100, 150, 200].map(dist => {
                    let resPerM: number;
                    if (cableType === 'custom') resPerM = customResistancePerMeter > 0 ? customResistancePerMeter : 0.00001;
                    else resPerM = CABLE_LOSS_CABLE_TYPES.find(c=>c.value===cableType)?.resistance || 0.01;
                    
                    const R_cab = resPerM * dist * 2;
                    let R_load_eff_dist: number;
                    let P_loss_pc_dist = 0;
                    let actualSpkLoadZ: number;

                    if (speakerImpedanceType === '70v_load') actualSpkLoadZ = ( (typeof amplifierPowerSetting === 'string' ? customAmplifierPower : amplifierPowerSetting) > 0 ? (70*70) / (typeof amplifierPowerSetting === 'string' ? customAmplifierPower : amplifierPowerSetting) : Infinity);
                    else if (speakerImpedanceType === '100v_load') actualSpkLoadZ = ( (typeof amplifierPowerSetting === 'string' ? customAmplifierPower : amplifierPowerSetting) > 0 ? (100*100) / (typeof amplifierPowerSetting === 'string' ? customAmplifierPower : amplifierPowerSetting) : Infinity);
                    else if (speakerImpedanceType === 'custom_Z') actualSpkLoadZ = customLowImpedance > 0 ? customLowImpedance : 0.1;
                    else actualSpkLoadZ = Number(speakerImpedanceType) > 0 ? Number(speakerImpedanceType) : 0.1;

                    R_load_eff_dist = actualSpkLoadZ + R_cab;

                    if(R_load_eff_dist > 0) {
                      if (speakerImpedanceType === '70v_load' || speakerImpedanceType === '100v_load') {
                          const nomV = speakerImpedanceType === '70v_load' ? 70:100;
                          const P_amp = typeof amplifierPowerSetting === 'string' ? customAmplifierPower : Number(amplifierPowerSetting);
                          const I_line_dist = P_amp > 0 && nomV > 0 ? P_amp / nomV : 0;
                          const P_loss_W_dist = I_line_dist * I_line_dist * R_cab;
                          if (P_amp > 0) P_loss_pc_dist = (P_loss_W_dist / P_amp) * 100;
                      } else {
                          P_loss_pc_dist = (R_cab / R_load_eff_dist) * 100;
                      }
                    }
                    const isDistOK = P_loss_pc_dist < 10;
                    
                    return (
                      <tr key={dist} className={dist === cableLength ? 'bg-blue-100' : ''}>
                        <td className="py-2 px-3 text-sm font-medium text-gray-900 border border-gray-200">{dist}{dist === cableLength && '*'}</td>
                        <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">{R_cab.toFixed(3)}</td>
                        <td className="py-2 px-3 text-sm text-gray-900 border border-gray-200">{P_loss_pc_dist.toFixed(2)}</td>
                        <td className={`py-2 px-3 text-sm font-medium border border-gray-200 ${isDistOK ? 'text-green-600' : 'text-red-600'}`}>{isDistOK ? 'OK' : 'High'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-1">* Selected length.</p>
            </div>
          </div>
          
          <div className="bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">General Cable Selection Advice</h4>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
              <li>Aim for 10% power loss (approx 0.5dB). For critical listening, aim for 5% (0.25dB).</li>
              <li>Heavier gauge (lower AWG number) means lower resistance and less loss.</li>
              <li>For 70V/100V systems, total power on the line and run length are key. Cable resistance is less critical than with low-Z, but still matters for very long runs or high power.</li>
              <li>For low impedance (4-16Ω) systems, especially with 4Ω loads, cable resistance becomes very significant. Keep runs short or use very thick cables.</li>
              <li>Doubling cable length doubles cable resistance and roughly doubles percentage power loss (for small losses).</li>
              <li>Using two identical cables in parallel effectively halves the resistance (like using a cable 3 AWG steps thicker).</li>
            </ul>
          </div>
          
          <div className="mt-6 bg-gray-100 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-lg mb-2 text-gray-700">Important Notes</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>This calculator focuses on resistive losses (DC resistance). At very high frequencies or with very long cables, skin effect and cable inductance/capacitance can also play a role, but are usually minor for typical audio PA frequencies and lengths.</li>
              <li>Cable quality (copper purity, stranding, insulation) can affect long-term performance and durability, but resistance is the primary factor for loss calculations.</li>
              <li>Ensure good quality connectors and terminations, as poor connections can add significant resistance and be a point of failure.</li>
              <li>Ambient temperature affects copper resistance (increases with higher temp). Calculations assume room temperature (20°C).</li>
              <li>Always comply with local electrical and building codes for cable installation, especially for in-wall, plenum-rated, or fire safety (PAVA) applications.</li>
            </ul>
          </div>
        </div>
      </div>
  );
};

// ======================== REVERB TIME CALCULATOR ========================
interface ReverbTimeCalculatorProps {
  onShowTutorial?: () => void;
}

// Define surface material types with absorption coefficients
// Absorption coefficients are given for different frequency bands (125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz)
const SURFACE_MATERIALS = [
  { 
    value: 'drywall', 
    label: 'Painted Drywall', 
    coefficients: [0.10, 0.08, 0.05, 0.03, 0.03, 0.02] 
  },
  { 
    value: 'concrete', 
    label: 'Concrete (Painted/Sealed)', 
    coefficients: [0.01, 0.01, 0.02, 0.02, 0.02, 0.03] 
  },
  { 
    value: 'brick', 
    label: 'Unglazed Brick', 
    coefficients: [0.03, 0.03, 0.03, 0.04, 0.05, 0.07] 
  },
  { 
    value: 'glass', 
    label: 'Standard Windows', 
    coefficients: [0.35, 0.25, 0.18, 0.12, 0.07, 0.04] 
  },
  { 
    value: 'woodPanel', 
    label: 'Wood Paneling', 
    coefficients: [0.30, 0.25, 0.20, 0.17, 0.15, 0.10] 
  },
  { 
    value: 'carpet', 
    label: 'Medium Pile Carpet', 
    coefficients: [0.05, 0.10, 0.25, 0.30, 0.35, 0.40] 
  },
  { 
    value: 'acousticTile', 
    label: 'Acoustic Ceiling Tile', 
    coefficients: [0.20, 0.35, 0.65, 0.75, 0.70, 0.60] 
  },
  { 
    value: 'acousticPanel', 
    label: 'Acoustic Wall Panels (2")', 
    coefficients: [0.15, 0.30, 0.70, 0.90, 0.85, 0.80] 
  },
  { 
    value: 'vinylTile', 
    label: 'Vinyl Tile / Linoleum', 
    coefficients: [0.02, 0.02, 0.03, 0.03, 0.03, 0.02] 
  },
  { 
    value: 'audience', 
    label: 'Fully Occupied Audience', 
    coefficients: [0.39, 0.57, 0.80, 0.94, 0.92, 0.87] 
  },
  { 
    value: 'custom', 
    label: 'Custom Material', 
    coefficients: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25] 
  }
];

// Define typical room types with recommended reverberation times
const ROOM_TYPES = [
  { value: 'classroom', label: 'Classroom', minRT: 0.4, maxRT: 0.8 },
  { value: 'conferenceRoom', label: 'Conference Room', minRT: 0.5, maxRT: 0.9 },
  { value: 'auditorium', label: 'Auditorium', minRT: 0.7, maxRT: 1.2 },
  { value: 'church', label: 'Church/Place of Worship', minRT: 1.0, maxRT: 2.0 },
  { value: 'lobby', label: 'Hotel Lobby/Reception', minRT: 0.5, maxRT: 1.2 },
  { value: 'office', label: 'Open Office', minRT: 0.6, maxRT: 1.0 },
  { value: 'restaurant', label: 'Restaurant/Café', minRT: 0.6, maxRT: 1.0 },
  { value: 'musicRoom', label: 'Music Practice Room', minRT: 0.8, maxRT: 1.2 },
  { value: 'concertHall', label: 'Concert Hall', minRT: 1.2, maxRT: 2.2 },
  { value: 'studio', label: 'Recording Studio/Control Room', minRT: 0.3, maxRT: 0.5 },
  { value: 'custom', label: 'Custom Requirements', minRT: 0, maxRT: 0 }
];

// Interface for a surface
interface Surface {
  id: string;
  name: string;
  materialType: string;
  area: number;
  customCoefficients?: number[];
}

const ReverbTimeCalculator: React.FC<ReverbTimeCalculatorProps> = ({ onShowTutorial }) => {
  // State for room dimensions
  const [roomLength, setRoomLength] = useState<number>(10);
  const [roomWidth, setRoomWidth] = useState<number>(7);
  const [roomHeight, setRoomHeight] = useState<number>(3);
  const [roomVolume, setRoomVolume] = useState<number>(0);
  const [roomType, setRoomType] = useState<string>('conferenceRoom');
  const [customMinRT, setCustomMinRT] = useState<number>(0.5);
  const [customMaxRT, setCustomMaxRT] = useState<number>(0.9);
  
  // State for room surfaces
  const [surfaces, setSurfaces] = useState<Surface[]>([
    {
      id: '1',
      name: 'Walls',
      materialType: 'drywall',
      area: 0 // Will be calculated
    },
    {
      id: '2',
      name: 'Floor',
      materialType: 'carpet',
      area: 0 // Will be calculated
    },
    {
      id: '3',
      name: 'Ceiling',
      materialType: 'acousticTile',
      area: 0 // Will be calculated
    }
  ]);
  
  // State for editing custom material
  const [editingSurfaceId, setEditingSurfaceId] = useState<string | null>(null);
  const [customFrequencyBand, setCustomFrequencyBand] = useState<string>('mid');
  
  // State for calculation results
  const [reverbTimes, setReverbTimes] = useState<{[key: string]: number}>({
    '125': 0, '250': 0, '500': 0, '1000': 0, '2000': 0, '4000': 0, 'average': 0
  });
  const [isOptimalRT, setIsOptimalRT] = useState<boolean>(false);
  const [totalSurfaceArea, setTotalSurfaceArea] = useState<number>(0);
  const [averageAbsorption, setAverageAbsorption] = useState<number>(0);
  const [optimalTreatmentArea, setOptimalTreatmentArea] = useState<number>(0);
  
  // Calculate room volume and update surface areas when dimensions change
  useEffect(() => {
    const volume = roomLength * roomWidth * roomHeight;
    setRoomVolume(volume);
    
    // Calculate surface areas
    const wallArea = 2 * (roomLength * roomHeight + roomWidth * roomHeight);
    const floorCeilingArea = roomLength * roomWidth;
    
    // Update surface areas
    setSurfaces(prevSurfaces => {
      return prevSurfaces.map(surface => {
        if (surface.name === 'Walls') {
          return { ...surface, area: wallArea };
        } else if (surface.name === 'Floor' || surface.name === 'Ceiling') {
          return { ...surface, area: floorCeilingArea };
        }
        return surface;
      });
    });
    
  }, [roomLength, roomWidth, roomHeight]);
  
  // Calculate total surface area when surfaces change
  useEffect(() => {
    const totalArea = surfaces.reduce((sum, surface) => sum + surface.area, 0);
    setTotalSurfaceArea(totalArea);
  }, [surfaces]);
  
  // Calculate reverberation times when surfaces or volume changes
  useEffect(() => {
    // Skip calculation if volume is zero
    if (roomVolume === 0) return;
    
    // Calculate reverberation time for each frequency band using Sabine formula
    // RT60 = 0.161 * V / A where V is volume and A is total absorption
    
    const frequencyBands = [125, 250, 500, 1000, 2000, 4000];
    const newReverbTimes: {[key: string]: number} = {};
    let totalAbsorption = 0;
    
    // Calculate for each frequency band
    frequencyBands.forEach((freq, index) => {
      // Calculate total absorption for this frequency
      let totalAbsorptionArea = 0;
      
      surfaces.forEach(surface => {
        let absorptionCoefficient: number;
        
        if (surface.materialType === 'custom' && surface.customCoefficients) {
          absorptionCoefficient = surface.customCoefficients[index];
        } else {
          const material = SURFACE_MATERIALS.find(m => m.value === surface.materialType);
          absorptionCoefficient = material ? material.coefficients[index] : 0.1;
        }
        
        // A = S * α where S is surface area and α is absorption coefficient
        totalAbsorptionArea += surface.area * absorptionCoefficient;
      });
      
      // Calculate RT60 using Sabine formula
      const rt60 = 0.161 * roomVolume / totalAbsorptionArea;
      
      // Store the result
      newReverbTimes[freq.toString()] = rt60;
      
      // For mid-frequency average (500Hz and 1000Hz)
      if (freq === 500 || freq === 1000) {
        totalAbsorption += totalAbsorptionArea;
      }
    });
    
    // Calculate the average RT for mid frequencies (500Hz-1000Hz)
    const averageRT = (newReverbTimes['500'] + newReverbTimes['1000']) / 2;
    newReverbTimes['average'] = averageRT;
    
    // Calculate average absorption coefficient
    const midFreqAvgAbsorption = totalAbsorption / (2 * totalSurfaceArea);
    setAverageAbsorption(midFreqAvgAbsorption);
    
    // Check if RT is within optimal range for selected room type
    const selectedRoomType = ROOM_TYPES.find(type => type.value === roomType);
    let minRT: number;
    let maxRT: number;
    
    if (roomType === 'custom') {
      minRT = customMinRT;
      maxRT = customMaxRT;
    } else if (selectedRoomType) {
      minRT = selectedRoomType.minRT;
      maxRT = selectedRoomType.maxRT;
    } else {
      minRT = 0.5;
      maxRT = 1.0;
    }
    
    const isOptimal = averageRT >= minRT && averageRT <= maxRT;
    setIsOptimalRT(isOptimal);
    
    // If RT is too high, calculate required additional absorption area
    if (averageRT > maxRT) {
      // A = 0.161 * V / RT
      const requiredAbsorption = 0.161 * roomVolume / maxRT;
      const currentAbsorption = totalAbsorption / 2; // Mid-frequency average
      const additionalAbsorptionRequired = requiredAbsorption - currentAbsorption;
      
      // Assuming treatment with absorption coefficient of 0.85
      const treatmentArea = additionalAbsorptionRequired / 0.85;
      setOptimalTreatmentArea(treatmentArea);
    } else {
      setOptimalTreatmentArea(0);
    }
    
    // Update state with the calculated values
    setReverbTimes(newReverbTimes);
    
  }, [surfaces, roomVolume, roomType, customMinRT, customMaxRT, totalSurfaceArea]);
  
  // Add a new surface
  const addSurface = () => {
    const newId = (surfaces.length + 1).toString();
    
    setSurfaces([
      ...surfaces,
      {
        id: newId,
        name: 'Additional Surface',
        materialType: 'drywall',
        area: 5 // Default 5m²
      }
    ]);
  };
  
  // Remove a surface
  const removeSurface = (id: string) => {
    // Don't allow removing the main surfaces (walls, floor, ceiling)
    if (['1', '2', '3'].includes(id)) return;
    
    setSurfaces(surfaces.filter(surface => surface.id !== id));
  };
  
  // Update surface properties
  const updateSurface = (id: string, field: keyof Surface, value: any) => {
    setSurfaces(surfaces.map(surface => {
      if (surface.id === id) {
        if (field === 'materialType' && value === 'custom') {
          // If switching to custom material, initialize custom coefficients
          return { 
            ...surface, 
            [field]: value,
            customCoefficients: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25]
          };
        }
        return { ...surface, [field]: value };
      }
      return surface;
    }));
  };
  
  // Update custom material coefficients
  const updateCustomCoefficients = (surfaceId: string, index: number, value: number) => {
    setSurfaces(surfaces.map(surface => {
      if (surface.id === surfaceId && surface.customCoefficients) {
        const newCoefficients = [...surface.customCoefficients];
        newCoefficients[index] = value;
        return { ...surface, customCoefficients: newCoefficients };
      }
      return surface;
    }));
  };
  
  // Start editing custom coefficients
  const startEditingCustom = (id: string) => {
    setEditingSurfaceId(id);
  };
  
  // Stop editing custom coefficients
  const stopEditingCustom = () => {
    setEditingSurfaceId(null);
  };
  
  // Set all custom coefficients to a specific value
  const setAllCustomCoefficients = (surfaceId: string, value: number) => {
    setSurfaces(surfaces.map(surface => {
      if (surface.id === surfaceId && surface.customCoefficients) {
        return { ...surface, customCoefficients: [value, value, value, value, value, value] };
      }
      return surface;
    }));
  };
  
  // Format the RT values for display
  const formatRT = (rt: number): string => {
    if (rt < 0.1) return '<0.1';
    if (rt > 10) return '>10.0';
    return rt.toFixed(2);
  };
  
  // Get appropriate class for RT display
  const getRTClass = (rt: number): string => {
    const selectedRoomType = ROOM_TYPES.find(type => type.value === roomType);
    let minRT: number;
    let maxRT: number;
    
    if (roomType === 'custom') {
      minRT = customMinRT;
      maxRT = customMaxRT;
    } else if (selectedRoomType) {
      minRT = selectedRoomType.minRT;
      maxRT = selectedRoomType.maxRT;
    } else {
      minRT = 0.5;
      maxRT = 1.0;
    }
    
    if (rt < minRT) return 'text-orange-600';
    if (rt > maxRT) return 'text-red-600';
    return 'text-green-600';
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Room Specifications</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length (m)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={roomLength}
              onChange={(e) => setRoomLength(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width (m)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={roomWidth}
              onChange={(e) => setRoomWidth(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height (m)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              step="0.1"
              value={roomHeight}
              onChange={(e) => setRoomHeight(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Type
          </label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {ROOM_TYPES.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {roomType === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum RT (s)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={customMinRT}
                  onChange={(e) => setCustomMinRT(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum RT (s)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={customMaxRT}
                  onChange={(e) => setCustomMaxRT(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-1">
            Room type determines the optimal reverberation time range
          </p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-md mt-2 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-600">Volume:</p>
              <p className="font-medium">{roomVolume.toFixed(1)} m³</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Surface Area:</p>
              <p className="font-medium">{totalSurfaceArea.toFixed(1)} m²</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Optimal RT Range:</p>
              <p className="font-medium">
                {roomType === 'custom' 
                  ? `${customMinRT.toFixed(1)} - ${customMaxRT.toFixed(1)} s`
                  : `${ROOM_TYPES.find(t => t.value === roomType)?.minRT.toFixed(1)} - ${ROOM_TYPES.find(t => t.value === roomType)?.maxRT.toFixed(1)} s`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg text-gray-700">Surface Materials</h3>
          <button
            onClick={addSurface}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
          >
            Add Surface
          </button>
        </div>
        
        {surfaces.map((surface) => (
          <div key={surface.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex-grow">
                <input
                  type="text"
                  value={surface.name}
                  onChange={(e) => updateSurface(surface.id, 'name', e.target.value)}
                  className="font-medium text-gray-700 p-1 border border-gray-300 rounded w-full"
                  disabled={['1', '2', '3'].includes(surface.id)}
                />
              </div>
              {!['1', '2', '3'].includes(surface.id) && (
                <button 
                  onClick={() => removeSurface(surface.id)} 
                  className="ml-2 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                <select
                  value={surface.materialType}
                  onChange={(e) => updateSurface(surface.id, 'materialType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {SURFACE_MATERIALS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
                <input
                  type="number"
                  min="0.1"
                  value={surface.area}
                  onChange={(e) => updateSurface(surface.id, 'area', Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  readOnly={['1', '2', '3'].includes(surface.id)}
                />
              </div>
            </div>
            
            {/* Display custom coefficient editor when selected */}
            {surface.materialType === 'custom' && (
              <div className="mt-2">
                {editingSurfaceId === surface.id ? (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-sm font-medium text-blue-700">Custom Absorption Coefficients</h5>
                      <button 
                        onClick={stopEditingCustom} 
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Done
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-6 gap-2 mb-2 text-xs">
                      <div className="text-center p-1 bg-blue-100 rounded">125 Hz</div>
                      <div className="text-center p-1 bg-blue-100 rounded">250 Hz</div>
                      <div className="text-center p-1 bg-blue-100 rounded">500 Hz</div>
                      <div className="text-center p-1 bg-blue-100 rounded">1 kHz</div>
                      <div className="text-center p-1 bg-blue-100 rounded">2 kHz</div>
                      <div className="text-center p-1 bg-blue-100 rounded">4 kHz</div>
                    </div>
                    
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {surface.customCoefficients?.map((coeff, index) => (
                        <input
                          key={index}
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={coeff}
                          onChange={(e) => updateCustomCoefficients(surface.id, index, Number(e.target.value))}
                          className="w-full p-1 text-sm border border-gray-300 rounded-md"
                        />
                      ))}
                    </div>
                    
                    <div className="flex gap-2 text-xs">
                      <button 
                        onClick={() => setAllCustomCoefficients(surface.id, 0.05)}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        Set Reflective (0.05)
                      </button>
                      <button 
                        onClick={() => setAllCustomCoefficients(surface.id, 0.25)}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        Set Medium (0.25)
                      </button>
                      <button 
                        onClick={() => setAllCustomCoefficients(surface.id, 0.80)}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        Set Absorptive (0.80)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="text-sm">
                      <span className="text-gray-600">Avg. Absorption: </span>
                      <span className="font-medium">
                        {surface.customCoefficients 
                          ? ((surface.customCoefficients[2] + surface.customCoefficients[3]) / 2).toFixed(2)
                          : '0.25'} 
                        (Mid Freq)
                      </span>
                    </div>
                    <button 
                      onClick={() => startEditingCustom(surface.id)} 
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit Coefficients
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Show absorption preview for standard materials */}
            {surface.materialType !== 'custom' && (
              <div className="mt-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    <span>Absorption Preview: </span>
                    <span className="font-medium">
                      {(() => {
                        const material = SURFACE_MATERIALS.find(m => m.value === surface.materialType);
                        if (!material) return '0.00';
                        
                        // Show the mid-frequency average (500Hz-1kHz)
                        return ((material.coefficients[2] + material.coefficients[3]) / 2).toFixed(2);
                      })()}
                      <span className="text-gray-400"> (Mid Freq Avg)</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1 text-xs text-gray-600">Frequency Band:</span>
                    <select
                      value={customFrequencyBand}
                      onChange={(e) => setCustomFrequencyBand(e.target.value)}
                      className="px-1 py-0.5 text-xs border rounded"
                    >
                      <option value="low">Low (125-250Hz)</option>
                      <option value="mid">Mid (500-1kHz)</option>
                      <option value="high">High (2-4kHz)</option>
                    </select>
                  </div>
                </div>
                
                <div className="w-full h-3 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  {(() => {
                    const material = SURFACE_MATERIALS.find(m => m.value === surface.materialType);
                    if (!material) return null;
                    
                    let avgCoeff: number;
                    if (customFrequencyBand === 'low') {
                      avgCoeff = (material.coefficients[0] + material.coefficients[1]) / 2;
                    } else if (customFrequencyBand === 'mid') {
                      avgCoeff = (material.coefficients[2] + material.coefficients[3]) / 2;
                    } else { // high
                      avgCoeff = (material.coefficients[4] + material.coefficients[5]) / 2;
                    }
                    
                    const width = Math.min(100, avgCoeff * 100);
                    
                    return (
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${width}%` }}
                      ></div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Reverberation Time Calculation</h3>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">RT60 by Frequency Band</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    RT60 (seconds)
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 px-3 text-sm text-gray-900">125 Hz</td>
                  <td className="py-2 px-3 text-sm font-medium">{formatRT(reverbTimes['125'])}</td>
                  <td className="py-2 px-3 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
                    <span className="text-xs text-gray-500">Low Freq</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-sm text-gray-900">250 Hz</td>
                  <td className="py-2 px-3 text-sm font-medium">{formatRT(reverbTimes['250'])}</td>
                  <td className="py-2 px-3 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
                    <span className="text-xs text-gray-500">Low Freq</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-sm text-gray-900">500 Hz</td>
                  <td className="py-2 px-3 text-sm font-medium">{formatRT(reverbTimes['500'])}</td>
                  <td className="py-2 px-3 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                    <span className="text-xs text-gray-500">Mid Freq</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-sm text-gray-900">1 kHz</td>
                  <td className="py-2 px-3 text-sm font-medium">{formatRT(reverbTimes['1000'])}</td>
                  <td className="py-2 px-3 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                    <span className="text-xs text-gray-500">Mid Freq</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-sm text-gray-900">2 kHz</td>
                  <td className="py-2 px-3 text-sm font-medium">{formatRT(reverbTimes['2000'])}</td>
                  <td className="py-2 px-3 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-1"></span>
                    <span className="text-xs text-gray-500">High Freq</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-sm text-gray-900">4 kHz</td>
                  <td className="py-2 px-3 text-sm font-medium">{formatRT(reverbTimes['4000'])}</td>
                  <td className="py-2 px-3 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-1"></span>
                    <span className="text-xs text-gray-500">High Freq</span>
                  </td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="py-2 px-3 text-sm font-medium text-gray-900">Mid Freq Average</td>
                  <td className={`py-2 px-3 text-sm font-bold ${getRTClass(reverbTimes['average'])}`}>
                    {formatRT(reverbTimes['average'])}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      isOptimalRT ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isOptimalRT ? 'Optimal' : 'Outside Range'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* FIXED RT60 vs Target Range Visualization */}
          <div className="mt-4 px-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">RT60 vs Target Range</span>
              <span className="text-xs text-gray-500">
                Target: {roomType === 'custom' 
                  ? `${customMinRT.toFixed(1)} - ${customMaxRT.toFixed(1)} s`
                  : `${ROOM_TYPES.find(t => t.value === roomType)?.minRT.toFixed(1)} - ${ROOM_TYPES.find(t => t.value === roomType)?.maxRT.toFixed(1)} s`}
              </span>
            </div>
            
            {/* Container with proper height to accommodate the scale values */}
            <div className="relative h-10 mt-5 mb-6">
              {/* Scale values - positioned properly ABOVE the slider */}
              <div className="absolute w-full flex justify-between text-xs text-gray-500 top-0">
                <span>0s</span>
                <span>1s</span>
                <span>2s</span>
                <span>3s+</span>
              </div>
              
              {/* The actual slider - positioned below the scale values */}
              <div className="absolute top-6 w-full h-5 bg-gray-200 rounded-full">
                {/* Target Range */}
                <div 
                  className="absolute h-full bg-green-200 rounded-full" 
                  style={{ 
                    left: `${Math.min(100, (roomType === 'custom' ? customMinRT : (ROOM_TYPES.find(t => t.value === roomType)?.minRT || 0.5)) * 100 / 3)}%`, 
                    width: `${Math.min(100, ((roomType === 'custom' ? customMaxRT : (ROOM_TYPES.find(t => t.value === roomType)?.maxRT || 1.0)) - (roomType === 'custom' ? customMinRT : (ROOM_TYPES.find(t => t.value === roomType)?.minRT || 0.5))) * 100 / 3)}%` 
                  }}
                ></div>
                
                {/* Current RT60 */}
                <div 
                  className={`absolute w-4 h-5 rounded-full ${isOptimalRT ? 'bg-green-600' : 'bg-red-600'}`}
                  style={{ 
                    left: `${Math.min(100, Math.max(0, (reverbTimes['average'] * 100 / 3) - 1))}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">Surface Absorption Analysis</h4>
          
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Surface
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Area (m²)
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Mid Freq α
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Absorption (m²)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {surfaces.map((surface) => {
                  // Get material absorption coefficient
                  let midFreqAbsorption: number;
                  
                  if (surface.materialType === 'custom' && surface.customCoefficients) {
                    // Average of 500Hz and 1kHz for custom material
                    midFreqAbsorption = (surface.customCoefficients[2] + surface.customCoefficients[3]) / 2;
                  } else {
                    const material = SURFACE_MATERIALS.find(m => m.value === surface.materialType);
                    // Average of 500Hz and 1kHz for standard material
                    midFreqAbsorption = material 
                      ? (material.coefficients[2] + material.coefficients[3]) / 2
                      : 0.1;
                  }
                  
                  // Calculate total absorption for this surface
                  const surfaceAbsorption = surface.area * midFreqAbsorption;
                  
                  return (
                    <tr key={surface.id}>
                      <td className="py-2 px-3">{surface.name}</td>
                      <td className="py-2 px-3">
                        {surface.materialType === 'custom' 
                          ? 'Custom Material' 
                          : SURFACE_MATERIALS.find(m => m.value === surface.materialType)?.label}
                      </td>
                      <td className="py-2 px-3">{surface.area.toFixed(1)}</td>
                      <td className="py-2 px-3">{midFreqAbsorption.toFixed(2)}</td>
                      <td className="py-2 px-3 font-medium">{surfaceAbsorption.toFixed(1)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-medium">
                  <td className="py-2 px-3">Total</td>
                  <td className="py-2 px-3">-</td>
                  <td className="py-2 px-3">{totalSurfaceArea.toFixed(1)}</td>
                  <td className="py-2 px-3">{averageAbsorption.toFixed(2)}</td>
                  <td className="py-2 px-3">{(averageAbsorption * totalSurfaceArea).toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <h5 className="text-sm font-medium mb-1 text-gray-700">Room Parameters</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-gray-600">Volume:</p>
                  <p className="font-medium">{roomVolume.toFixed(1)} m³</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Surface Area:</p>
                  <p className="font-medium">{totalSurfaceArea.toFixed(1)} m²</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Avg. Absorption:</p>
                  <p className="font-medium">{averageAbsorption.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">RT Formula Used:</p>
                  <p className="font-medium">Sabine</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-md">
              <h5 className="text-sm font-medium mb-1 text-blue-700">Speech Intelligibility</h5>
              <p className="text-sm mt-1">
                {(() => {
                  const avgRT = reverbTimes['average'];
                  if (avgRT < 0.5) return 'Excellent - Near 100% intelligibility';
                  if (avgRT < 1.0) return 'Very Good - Suitable for speech';
                  if (avgRT < 1.5) return 'Good - Generally acceptable';
                  if (avgRT < 2.0) return 'Fair - May need sound reinforcement';
                  return 'Poor - Will require sound reinforcement and treatment';
                })()}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                For PA systems, RT60 below 1.5 seconds is generally recommended for speech intelligibility.
              </p>
            </div>
          </div>
        </div>
        
        {/* Recommendations Section */}
        {!isOptimalRT && (
          <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
            <h4 className="font-medium text-base text-gray-700 mb-3">Acoustic Treatment Recommendations</h4>
            
            {reverbTimes['average'] > (roomType === 'custom' ? customMaxRT : (ROOM_TYPES.find(t => t.value === roomType)?.maxRT || 1.0)) && (
              <div className="mb-4">
                <p className="text-sm font-medium text-red-600 mb-2">
                  Room is too reverberant for {roomType === 'custom' ? 'your requirements' : ROOM_TYPES.find(t => t.value === roomType)?.label}
                </p>
                
                <div className="p-3 bg-yellow-50 rounded-md">
                  <p className="text-sm font-medium text-yellow-700 mb-1">Treatment Required:</p>
                  <p className="text-sm">
                    Add approximately <span className="font-bold">{Math.ceil(optimalTreatmentArea)} m²</span> of acoustic treatment with absorption coefficient of 0.85 or higher.
                  </p>
                  
                  <h5 className="text-sm font-medium text-yellow-700 mt-3 mb-1">Recommended Materials:</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>Acoustic wall panels (50-75mm thick)</li>
                    <li>Suspended acoustic ceiling panels</li>
                    <li>Bass traps for corners (for low frequency control)</li>
                    <li>Acoustic curtains on windows</li>
                  </ul>
                  
                  <h5 className="text-sm font-medium text-yellow-700 mt-3 mb-1">Placement Strategy:</h5>
                  <p className="text-sm">
                    Focus treatment on parallel reflective surfaces. Start with first reflection points 
                    and rear wall. For speech intelligibility, prioritize mid-frequency (500Hz-2kHz) absorption.
                  </p>
                </div>
              </div>
            )}
            
            {reverbTimes['average'] < (roomType === 'custom' ? customMinRT : (ROOM_TYPES.find(t => t.value === roomType)?.minRT || 0.5)) && (
              <div>
                <p className="text-sm font-medium text-orange-600 mb-2">
                  Room is too acoustically "dead" for {roomType === 'custom' ? 'your requirements' : ROOM_TYPES.find(t => t.value === roomType)?.label}
                </p>
                
                <div className="p-3 bg-orange-50 rounded-md">
                  <p className="text-sm font-medium text-orange-700 mb-1">Treatment Required:</p>
                  <p className="text-sm">
                    Replace some absorptive surfaces with more reflective materials, or add diffusers 
                    to create a more balanced acoustic environment.
                  </p>
                  
                  <h5 className="text-sm font-medium text-orange-700 mt-3 mb-1">Recommended Changes:</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>Replace acoustic ceiling tiles with more reflective surfaces</li>
                    <li>Add sound diffusers to walls instead of pure absorbers</li>
                    <li>Reduce carpet area and use harder flooring in some areas</li>
                    <li>Use balanced absorbers that target specific frequency ranges</li>
                  </ul>
                  
                  <p className="text-sm mt-3">
                    For this room, aim to raise the mid-frequency reverberation time to at least 
                    {(roomType === 'custom' ? customMinRT : (ROOM_TYPES.find(t => t.value === roomType)?.minRT || 0.5)).toFixed(2)} seconds.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Public Address System Considerations</h4>
          
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
            <li>For speech intelligibility, target RT60 of 0.8-1.2 seconds in most public spaces</li>
            <li>
              {reverbTimes['average'] > 1.5 
                ? 'Current reverberation time requires directional speakers and careful speaker placement'
                : 'Current reverberation time is acceptable for standard PA system design'}
            </li>
            <li>Position speakers to minimize excitation of room modes</li>
            <li>
              {reverbTimes['average'] > 1.5 
                ? 'Consider using distributed speaker system with delayed zones to improve clarity'
                : 'Standard speaker spacing will be effective in this acoustic environment'}
            </li>
            <li>
              {reverbTimes['500'] - reverbTimes['4000'] > 0.5
                ? 'High frequency absorption is significantly greater than mid-range - EQ settings should boost highs'
                : 'Frequency response is relatively balanced - minimal EQ required'}
            </li>
          </ul>
          
          <p className="text-xs mt-3 text-blue-700">
            Note: For critical listening spaces like conference rooms or performance venues, consider professional 
            acoustic measurement and analysis for optimal results.
          </p>
        </div>
        
        <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>The Sabine formula used here is most accurate for "live" rooms with RT &gt; 0.5s</li>
            <li>Room shape and distribution of absorption affects actual reverberation</li>
            <li>Background noise and HVAC systems impact actual speech intelligibility</li>
            <li>Room modes and flutter echoes are not accounted for in RT60 calculations</li>
            <li>For critical spaces, consider STI (Speech Transmission Index) measurements</li>
            <li>Different activities may require different reverberation profiles</li>
            <li>Balance between speech clarity and acoustic liveliness depends on use case</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PublicAddressCalculator;