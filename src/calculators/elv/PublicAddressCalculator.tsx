import React, { useState, useEffect } from 'react';
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

const SPEAKER_TYPES_COVERAGE = [
  { value: 'ceiling', label: 'Ceiling Speaker', defaultDispersion: 90 },
  { value: 'horn', label: 'Horn Speaker', defaultDispersion: 60 },
  { value: 'column', label: 'Column Speaker', defaultDispersion: 120 },
  { value: 'pendant', label: 'Pendant Speaker', defaultDispersion: 180 },
  { value: 'custom', label: 'Custom Speaker', defaultDispersion: 90 }
];

const MOUNTING_ENVIRONMENTS = [
  { value: 'standard', label: 'Standard (Indoor)', factor: 1.0 },
  { value: 'highCeiling', label: 'High Ceiling (10m+)', factor: 0.9 },
  { value: 'outdoor', label: 'Outdoor', factor: 0.85 },
  { value: 'highNoise', label: 'High Noise Environment', factor: 0.8 },
  { value: 'reverberant', label: 'Highly Reverberant Space', factor: 0.75 }
];

const CEILING_HEIGHTS = [
  { value: 2.4, label: '2.4m (8ft) - Standard Office' },
  { value: 3, label: '3.0m (10ft) - Commercial Space' },
  { value: 3.6, label: '3.6m (12ft) - Large Retail' },
  { value: 4.5, label: '4.5m (15ft) - Small Warehouse' },
  { value: 6, label: '6.0m (20ft) - Industrial/Gym' },
  { value: 9, label: '9.0m (30ft) - Large Warehouse' },
  { value: 12, label: '12.0m (40ft) - Terminal/Hangar' }
];

const SpeakerCoverageCalculator: React.FC<SpeakerCoverageCalculatorProps> = ({ onShowTutorial }) => {
  const [roomLength, setRoomLength] = useState<number>(20);
  const [roomWidth, setRoomWidth] = useState<number>(15);
  const [ceilingHeight, setCeilingHeight] = useState<string | number>(3);
  
  const [speakerType, setSpeakerType] = useState<string>('ceiling');
  const [dispersionAngle, setDispersionAngle] = useState<number>(90);
  const [mountingHeight, setMountingHeight] = useState<number>(2.4);
  const [listeningHeight, setListeningHeight] = useState<number>(1.2);
  const [mountingEnvironment, setMountingEnvironment] = useState<string>('standard');
  
  const [coverageRadius, setCoverageRadius] = useState<number>(0);
  const [coverageArea, setCoverageArea] = useState<number>(0);
  const [recommendedSpeakers, setRecommendedSpeakers] = useState<number>(0);
  const [recommendedSpacing, setRecommendedSpacing] = useState<number>(0);
  const [coverageGapWarning, setCoverageGapWarning] = useState<boolean>(false);
  const [overlapWarning, setOverlapWarning] = useState<boolean>(false);
  const [layoutPattern, setLayoutPattern] = useState<string>('grid');
  
  useEffect(() => {
    const selectedSpeaker = SPEAKER_TYPES_COVERAGE.find(s => s.value === speakerType);
    if (selectedSpeaker) {
      setDispersionAngle(selectedSpeaker.defaultDispersion);
    }
  }, [speakerType]);
  
  useEffect(() => {
    if (mountingHeight <= listeningHeight || roomLength <=0 || roomWidth <=0 || dispersionAngle <=0) {
      setCoverageRadius(0);
      setCoverageArea(0);
      setRecommendedSpeakers(0);
      setRecommendedSpacing(0);
      setCoverageGapWarning(false);
      setOverlapWarning(true); 
      return;
    }
    
    const envFactor = MOUNTING_ENVIRONMENTS.find(env => env.value === mountingEnvironment)?.factor || 1.0;
    const effectiveHeight = mountingHeight - listeningHeight;
    
    const angleInRadians = (dispersionAngle / 2) * (Math.PI / 180);
    let calculatedRadius: number;

    if (angleInRadians <= 0) {
        calculatedRadius = 0;
    } else if (angleInRadians >= Math.PI / 2) { // tan(PI/2) is Infinity
        calculatedRadius = Infinity;
    } else {
        calculatedRadius = effectiveHeight * Math.tan(angleInRadians);
    }
    
    const adjustedRadius = calculatedRadius * envFactor;
    const calculatedArea = Math.PI * Math.pow(adjustedRadius, 2);
    
    setCoverageRadius(adjustedRadius);
    setCoverageArea(calculatedArea);
    
    const roomArea = roomLength * roomWidth;

    if (calculatedArea === 0 || !isFinite(calculatedArea) || roomArea <= 0) {
        setRecommendedSpeakers(calculatedArea === 0 && roomArea > 0 ? Infinity : 0);
        setRecommendedSpacing(0);
        setCoverageGapWarning(calculatedArea === 0 && roomArea > 0); 
        setOverlapWarning(!isFinite(calculatedArea)); 
        return;
    }
    
    const speakers = Math.ceil(roomArea / calculatedArea);
    setRecommendedSpeakers(speakers);
    
    let idealSpacing: number;
    
    if (speakers === 0 || !isFinite(speakers)) { 
        idealSpacing = 0;
    } else if (layoutPattern === 'grid') {
      const colsForSpacing = Math.ceil(Math.sqrt(speakers * roomLength / roomWidth));
      const rowsForSpacing = Math.ceil(Math.sqrt(speakers * roomWidth / roomLength));
      
      const gridSpacingX = colsForSpacing > 0 ? roomLength / colsForSpacing : roomLength;
      const gridSpacingY = rowsForSpacing > 0 ? roomWidth / rowsForSpacing : roomWidth;
      idealSpacing = Math.min(gridSpacingX, gridSpacingY);
    } else if (layoutPattern === 'perimeter') {
      const perimeter = 2 * (roomLength + roomWidth);
      idealSpacing = speakers > 0 ? perimeter / speakers : perimeter;
    } else { // linear
      const divisor = speakers > 1 ? (speakers / 2) : 1; // Assume at least one "row" or line of speakers
      idealSpacing = Math.max(roomLength, roomWidth) / divisor;
    }
    
    setRecommendedSpacing(idealSpacing);
    
    const hasGaps = idealSpacing > (2 * adjustedRadius);
    setCoverageGapWarning(hasGaps && isFinite(adjustedRadius) && adjustedRadius > 0);
    
    const hasExcessiveOverlap = idealSpacing < (adjustedRadius * 0.7);
    setOverlapWarning(hasExcessiveOverlap && isFinite(adjustedRadius) && adjustedRadius > 0);
    
  }, [roomLength, roomWidth, dispersionAngle, mountingHeight, listeningHeight, mountingEnvironment, layoutPattern]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Room Specifications</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Length (m)
            </label>
            <input
              type="number"
              min="1"
              value={roomLength}
              onChange={(e) => setRoomLength(Number(e.target.value) > 0 ? Number(e.target.value) : 1)}
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
              value={roomWidth}
              onChange={(e) => setRoomWidth(Number(e.target.value) > 0 ? Number(e.target.value) : 1)}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ceiling Height (m)
          </label>
          <select
            value={ceilingHeight} // This can be 'custom' or a number
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                setCeilingHeight('custom');
              } else {
                setCeilingHeight(Number(val));
              }
            }}
            className="w-full p-2 border rounded-md"
          >
            {CEILING_HEIGHTS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom Height...</option>
          </select>
          {ceilingHeight === 'custom' && (
            <input
              type="number"
              min="2" 
              step="0.1"
              placeholder="Enter ceiling height (m)"
              onChange={(e) => setCeilingHeight(Number(e.target.value) >=2 ? Number(e.target.value) : 2)}
              className="w-full mt-2 p-2 border rounded-md"
            />
          )}
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        <h3 className="font-medium text-lg mb-4">Speaker Specifications</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Speaker Type
          </label>
          <select
            value={speakerType}
            onChange={(e) => setSpeakerType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {SPEAKER_TYPES_COVERAGE.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dispersion Angle (degrees)
          </label>
          <input
            type="number"
            min="1" // tan(0) is 0, so min 1
            max="359" // Avoid exactly 180 or 360 for simplicity if tan not handled perfectly, though it is now.
            value={dispersionAngle}
            onChange={(e) => setDispersionAngle(Number(e.target.value) > 0 ? Number(e.target.value) : 1)}
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">
            Typical values: 60° to 180° (check speaker specifications)
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mounting Height (m)
            </label>
            <input
              type="number"
              min="0.1" // Must be > listening height
              max={typeof ceilingHeight === 'number' ? ceilingHeight : undefined}
              step="0.1"
              value={mountingHeight}
              onChange={(e) => setMountingHeight(Number(e.target.value) > 0 ? Number(e.target.value) : 0.1)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Height of speaker installation</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Listening Height (m)
            </label>
            <input
              type="number"
              min="0"
              max={mountingHeight > 0.1 ? mountingHeight - 0.1 : 0}
              step="0.1"
              value={listeningHeight}
              onChange={(e) => setListeningHeight(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Typically 1.2m for seated, 1.7m for standing</p>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mounting Environment
          </label>
          <select
            value={mountingEnvironment}
            onChange={(e) => setMountingEnvironment(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {MOUNTING_ENVIRONMENTS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Layout Pattern
          </label>
          <select
            value={layoutPattern}
            onChange={(e) => setLayoutPattern(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="grid">Grid Pattern (Even Distribution)</option>
            <option value="linear">Linear Pattern (Rows/Columns)</option>
            <option value="perimeter">Perimeter Pattern (Around Edges)</option>
          </select>
        </div>
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
                <p className="text-sm text-gray-600">Ceiling Height:</p>
                <p className="font-semibold text-gray-800">{typeof ceilingHeight === 'number' ? `${ceilingHeight} m` : (ceilingHeight === 'custom' ? 'Custom (input below)' : 'N/A')}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-base text-gray-700">Speaker Coverage</h4>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Coverage Radius:</p>
                <p className="font-semibold text-gray-800">{isFinite(coverageRadius) ? coverageRadius.toFixed(2) : 'Infinite'} m</p>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Coverage Area per Speaker:</p>
                <p className="font-semibold text-gray-800">{isFinite(coverageArea) ? coverageArea.toFixed(2) : 'Infinite'} m²</p>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600">Recommended Speakers:</p>
                <p className="font-bold text-blue-600">{isFinite(recommendedSpeakers) ? recommendedSpeakers : 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-50 p-3 rounded-md">
            <h4 className="font-medium text-base text-gray-700 mb-2">Mounting Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Mounting Height:</p>
                <p className="font-semibold text-gray-800">{mountingHeight} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Listening Height:</p>
                <p className="font-semibold text-gray-800">{listeningHeight} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Effective Height Difference:</p>
                <p className="font-semibold text-gray-800">{(mountingHeight - listeningHeight).toFixed(2)} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Environment Factor:</p>
                <p className="font-semibold text-gray-800">
                  {MOUNTING_ENVIRONMENTS.find(env => env.value === mountingEnvironment)?.factor || 1.0}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">Speaker Layout Recommendation</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Layout Pattern:</p>
              <p className="font-semibold text-gray-800">
                {layoutPattern === 'grid' && 'Grid Pattern (Even Distribution)'}
                {layoutPattern === 'linear' && 'Linear Pattern (Rows/Columns)'}
                {layoutPattern === 'perimeter' && 'Perimeter Pattern (Around Edges)'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Recommended Spacing:</p>
              <p className="font-semibold text-gray-800">{isFinite(recommendedSpacing) && recommendedSpacing > 0 ? recommendedSpacing.toFixed(2) : 'N/A'} m</p>
            </div>
          </div>
          
          {recommendedSpeakers > 0 && isFinite(recommendedSpeakers) && isFinite(recommendedSpacing) && recommendedSpacing > 0 && (
            <div className="bg-gray-50 p-3 rounded-md mb-3">
              <h5 className="font-medium text-sm text-gray-700 mb-2">Placement Details</h5>
              {layoutPattern === 'grid' && (
                <div>
                  <p className="text-sm text-gray-700">For a grid layout:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-gray-600">
                    <li><strong>Rows: </strong>{Math.max(1, Math.ceil(Math.sqrt(recommendedSpeakers * roomWidth / roomLength)))}</li>
                    <li><strong>Columns: </strong>{Math.max(1, Math.ceil(Math.sqrt(recommendedSpeakers * roomLength / roomWidth)))}</li>
                    <li><strong>Row Spacing: </strong>{(roomWidth / Math.max(1, Math.ceil(Math.sqrt(recommendedSpeakers * roomWidth / roomLength)))).toFixed(2)}m</li>
                    <li><strong>Column Spacing: </strong>{(roomLength / Math.max(1, Math.ceil(Math.sqrt(recommendedSpeakers * roomLength / roomWidth)))).toFixed(2)}m</li>
                  </ul>
                </div>
              )}
              {layoutPattern === 'linear' && (
                <div>
                  <p className="text-sm text-gray-700">For a linear layout:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-gray-600">
                    <li>Place {Math.ceil(recommendedSpeakers / (recommendedSpeakers > 1 ? 2:1) )} speakers along each of {(recommendedSpeakers > 1 ? 2:1)} lines (approx)</li>
                    <li>Space speakers approximately {recommendedSpacing.toFixed(2)}m apart</li>
                    <li>Maintain at least {(isFinite(coverageRadius) && coverageRadius > 0 ? coverageRadius * 0.7 : 0).toFixed(2)}m from walls</li>
                  </ul>
                </div>
              )}
              {layoutPattern === 'perimeter' && (
                <div>
                  <p className="text-sm text-gray-700">For a perimeter layout:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm space-y-1 text-gray-600">
                    <li>Place speakers around the room's perimeter, approximately {recommendedSpacing.toFixed(2)}m apart</li>
                     {/* These are illustrative counts, actual placement would depend on even distribution */}
                    <li>Approx. {Math.max(1, Math.ceil(roomLength / recommendedSpacing))} speakers along each length if spacing allows.</li>
                    <li>Approx. {Math.max(1, Math.ceil(roomWidth / recommendedSpacing))} speakers along each width if spacing allows.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {(coverageGapWarning || overlapWarning) && (
            <div className={`rounded-md p-3 ${coverageGapWarning ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border`}>
              <p className={`text-sm font-medium ${coverageGapWarning ? 'text-red-800' : 'text-yellow-800'}`}>
                {coverageGapWarning 
                  ? 'Warning: Coverage gaps may exist. Consider more speakers, different layout, or wider dispersion.'
                  : overlapWarning 
                    ? 'Note: Significant speaker overlap may occur. This can be desired for evenness but may cause interference if excessive. Consider layout or speaker count.'
                    : ''}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
          <h4 className="font-medium mb-2 text-blue-700">Design Recommendations</h4>
          <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-blue-800">
            <li>For critical listening areas like conference rooms, aim for a denser speaker layout (more overlap).</li>
            <li>Consider acoustic treatments if the space is highly reverberant, as this calculator assumes basic environmental factors.</li>
            <li>Minimum speaker density should be 1 speaker per {isFinite(coverageArea) && coverageArea > 0 ? coverageArea.toFixed(0) : 'N/A'} m² (based on single speaker coverage).</li>
            <li>Intra-speaker distance (spacing) should ideally be between {isFinite(coverageRadius) && coverageRadius > 0 ? (coverageRadius * 1.4).toFixed(2) : 'N/A'}m (for ~25% overlap) to {isFinite(coverageRadius) && coverageRadius > 0 ? (coverageRadius * 1.7).toFixed(2) : 'N/A'}m (for ~15% overlap).</li>
            <li>Avoid placing speakers directly above primary listening positions if possible, to prevent hotspots unless intended.</li>
          </ul>
          <p className="text-xs mt-2 text-blue-700">
            Note: These calculations provide design guidance. Validate with acoustic modeling software or on-site testing for critical spaces.
          </p>
        </div>
        
        <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-2 text-gray-700">Important Considerations</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Speaker dispersion patterns are often not perfectly conical and can vary by frequency. Check manufacturer specifications (polar plots).</li>
            <li>Room acoustics (reverberation, absorption, obstructions) significantly impact effective coverage and intelligibility.</li>
            <li>Consider zoning requirements for different areas or for emergency evacuation systems (PAVA).</li>
            <li>Ambient noise levels may require higher speaker density or SPL capability in noisy environments.</li>
            <li>For voice evacuation systems, ensure compliance with local fire safety regulations (e.g., EN54, NFPA72).</li>
            <li>Vertical coverage patterns are especially important for speakers mounted at significant heights or in venues with tiered seating.</li>
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
        return;
    }
    
    const acousticConfig = ROOM_ACOUSTIC_TYPES.find(type => type.value === roomAcoustics);
    const acousticPowerFactor = acousticConfig ? acousticConfig.factor : 1.0;
    const acousticDbAdjustment = (acousticPowerFactor > 0) ? 10 * Math.log10(acousticPowerFactor) : -Infinity; // -Infinity if factor is 0 or less

    const powerInDb = 10 * Math.log10(speakerPower);
    const splAtReference = effectiveSensitivity + powerInDb;
    
    const distanceRatio = measurementDistance / referenceDistance;
    const distanceAttenuation = distanceRatio > 0 ? 20 * Math.log10(distanceRatio) : Infinity;
    
    const singleSplAtDistanceFreeField = splAtReference - distanceAttenuation;
    const adjustedSingleSpl = singleSplAtDistanceFreeField + acousticDbAdjustment;
    
    const combinedSplAtDistance = adjustedSingleSpl + (speakerCount > 0 ? 10 * Math.log10(speakerCount) : -Infinity) ;
    
    const snr = combinedSplAtDistance - ambientNoiseLevel;
    
    setSingleSpeakerSpl(adjustedSingleSpl);
    setCombinedSpl(combinedSplAtDistance);
    setSignalToNoiseRatio(snr);
    
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
      const distRatioTable = dist / referenceDistance;
      const distAttenTable = distRatioTable > 0 ? 20 * Math.log10(distRatioTable) : Infinity;
      const singleSplTableFF = splAtReference - distAttenTable;
      const adjustedSingleSplTable = singleSplTableFF + acousticDbAdjustment;
      const combinedSplTable = adjustedSingleSplTable + (speakerCount > 0 ? 10 * Math.log10(speakerCount) : -Infinity);
      return { distance: dist, spl: combinedSplTable };
    });
    setDistanceTable(newDistanceTable);
    
  }, [effectiveSensitivity, speakerPower, speakerCount, referenceDistance, measurementDistance, roomAcoustics, ambientNoiseLevel]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Speaker Specifications</h3>
        
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
        
        <div className="mb-4">
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
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
        
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
                <p className="font-medium">{(referenceDistance > 0 && measurementDistance > 0 && measurementDistance/referenceDistance > 0) ? (20 * Math.log10(measurementDistance / referenceDistance)).toFixed(1) : "N/A"} dB</p>
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
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
          <h4 className="font-medium text-base text-gray-700 mb-3">SPL at Different Distances</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
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


        // Damping Factor: Assume amp output Z_amp_out = 0.05 Ohms (typical)
        const Z_amp_out = 0.05;
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

    setRecommendedCableTypeLabel('');
    setMaxSafeLengthForCurrentCable(0);

    if (!acceptable && actualSpeakerLoadImpedance > 0 && cableLength > 0) {
      // Suggest better cable
      // Target R_cable_total to achieve <10% loss. For low-Z: R_cable / (R_speaker + R_cable) < 0.1 => R_cable < 0.1 * R_speaker / 0.9
      const target_R_cable_total_lowZ = (0.1 * actualSpeakerLoadImpedance) / 0.9;
      // For CV: (I^2 * R_cable) / P_amp < 0.1 => R_cable < 0.1 * P_amp / I^2 = 0.1 * V_nom^2 / P_amp
      const target_R_cable_total_CV = nominalLineVoltage > 0 && actualAmpPower > 0 ? (0.1 * nominalLineVoltage * nominalLineVoltage) / actualAmpPower : Infinity;

      const target_R_cable_total = isConstantVoltageSystem ? target_R_cable_total_CV : target_R_cable_total_lowZ;
      const target_res_per_meter = target_R_cable_total / (cableLength * 2);

      const betterCable = CABLE_LOSS_CABLE_TYPES
        .filter(c => c.value !== 'custom' && c.resistance < resPerMeter && c.resistance <= target_res_per_meter)
        .sort((a,b) => a.resistance - b.resistance)[0]; // Get the one just better or best
      
      if (betterCable) {
        setRecommendedCableTypeLabel(betterCable.label);
      } else if (resPerMeter > target_res_per_meter){
         setRecommendedCableTypeLabel('Thicker custom cable needed or reduce length / use CV.');
      }

      // Max length for current cable for <10% loss
      // R_cable_total_max = resPerMeter * L_max * 2
      // L_max = R_cable_total_max / (resPerMeter * 2)
      if (resPerMeter > 0) {
        const L_max = target_R_cable_total / (resPerMeter * 2);
        setMaxSafeLengthForCurrentCable(L_max);
      }
    }
    
  }, [cableType, customResistancePerMeter, cableLength, speakerImpedanceType, customLowImpedance, amplifierPowerSetting, customAmplifierPower]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Cable & System Specifications</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cable Type (Wire Gauge)</label>
          <select value={cableType} onChange={(e) => setCableType(e.target.value)} className="w-full p-2 border rounded-md">
            {CABLE_LOSS_CABLE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {cableType === 'custom' && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Resistance (Ω per meter, per conductor)</label>
              <input type="number" min="0.0001" step="0.0001" value={customResistancePerMeter} onChange={(e) => setCustomResistancePerMeter(Number(e.target.value))} className="w-full p-2 border rounded-md"/>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cable Length (meters, one-way)</label>
          <input type="number" min="1" value={cableLength} onChange={(e) => setCableLength(Number(e.target.value) > 0 ? Number(e.target.value) : 1)} className="w-full p-2 border rounded-md"/>
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        <h3 className="font-medium text-lg mb-4">Load & Amplifier Specifications</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Speaker/System Load Type</label>
          <select
            value={speakerImpedanceType}
            onChange={(e) => setSpeakerImpedanceType(e.target.value === 'custom_Z' || e.target.value.includes('v_load') ? e.target.value : Number(e.target.value))}
            className="w-full p-2 border rounded-md"
          >
            {CABLE_LOSS_SPEAKER_IMPEDANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {speakerImpedanceType === 'custom_Z' && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Low Impedance (Ohms)</label>
              <input type="number" min="1" step="0.1" value={customLowImpedance} onChange={(e) => setCustomLowImpedance(Number(e.target.value))} className="w-full p-2 border rounded-md"/>
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
            className="w-full p-2 border rounded-md"
          >
            {CABLE_LOSS_AMPLIFIER_POWER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {amplifierPowerSetting === 'custom_W' && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Power (Watts)</label>
              <input type="number" min="1" value={customAmplifierPower} onChange={(e) => setCustomAmplifierPower(Number(e.target.value))} className="w-full p-2 border rounded-md"/>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">For 70V/100V, this is the total power of all speaker taps on the line. For Low-Z, it's the amplifier output power for that load.</p>
        </div>
        
        <div className="p-3 bg-gray-100 rounded-md mt-4">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Cable Gauge Reference (Resistance per meter, per conductor)</h4>
          <div className="overflow-x-auto text-xs">
            {CABLE_LOSS_CABLE_TYPES.filter(c => c.value !== 'custom').map(c => (
                <div key={c.value} className="grid grid-cols-2 gap-1"><span>{c.label}:</span> <span>{c.resistance.toFixed(4)} Ω/m</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4 text-blue-700">Cable Loss Calculation Results</h3>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border">
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
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border">
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
              <p className={`font-semibold ${dampingFactorReductionPercent > 50 ? 'text-red-600' : 'text-gray-800'}`}>
                {dampingFactorReductionPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Significant reduction can affect bass tightness. Aim for 50%.</p>
            </div>
          )}
          
          {!isLossAcceptable && (
            <div className="mt-4 bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <h5 className="font-medium text-sm text-yellow-800 mb-1">Recommendations to Reduce Loss:</h5>
              {recommendedCableTypeLabel && <p className="text-sm text-yellow-700">Consider using a thicker cable: <strong>{recommendedCableTypeLabel}</strong></p>}
              {maxSafeLengthForCurrentCable > 0 && <p className="text-sm text-yellow-700 mt-1">Max length for current cable (for 10% loss): <strong>{maxSafeLengthForCurrentCable.toFixed(1)} m</strong></p>}
              {!(speakerImpedanceType === '70v_load' || speakerImpedanceType === '100v_load') && cableLength > 20 && <p className="text-sm text-yellow-700 mt-1">For long runs with low impedance, consider switching to a 70V/100V system.</p>}
               <p className="text-sm text-yellow-700 mt-1">Alternatively, use multiple parallel cable runs (effectively thicker wire) or a higher impedance speaker load if possible.</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-md shadow mb-6 border">
          <h4 className="font-medium text-base text-gray-700 mb-3">Estimated Loss vs. Distance (for current cable & load)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Dist (m)</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">R_cable (Ω)</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Loss (%)</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
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
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{dist}{dist === cableLength && '*'}</td>
                      <td className="py-2 px-3 text-sm text-gray-900">{R_cab.toFixed(3)}</td>
                      <td className="py-2 px-3 text-sm text-gray-900">{P_loss_pc_dist.toFixed(2)}</td>
                      <td className={`py-2 px-3 text-sm font-medium ${isDistOK ? 'text-green-600' : 'text-red-600'}`}>{isDistOK ? 'OK' : 'High'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-1">* Selected length.</p>
          </div>
        </div>
        
        <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
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
        
        <div className="mt-8 bg-gray-100 p-4 rounded-lg border">
          <h3 className="font-medium text-lg mb-2 text-gray-700">Important Notes</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>This calculator focuses on resistive losses (DC resistance). At very high frequencies or with very long cables, skin effect and cable inductance/capacitance can also play a role, but are usually minor for typical audio PA frequencies and lengths.</li>
            <li>Cable quality (copper purity, stranding, insulation) can affect long-term performance and durability, but resistance is the primary factor for loss calculations.</li>
            <li>Ensure good quality connectors and terminations, as poor connections can add significant resistance and be a point of failure.</li>
            <li>Ambient temperature affects copper resistance (increases with higher temp). Calculations usually assume room temperature (20°C).</li>
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
    label: 'Brick (Unglazed)', 
    coefficients: [0.03, 0.03, 0.03, 0.04, 0.05, 0.07] 
  },
  { 
    value: 'glass', 
    label: 'Glass (Standard Windows)', 
    coefficients: [0.35, 0.25, 0.18, 0.12, 0.07, 0.04] 
  },
  { 
    value: 'woodPanel', 
    label: 'Wood Paneling', 
    coefficients: [0.30, 0.25, 0.20, 0.17, 0.15, 0.10] 
  },
  { 
    value: 'carpet', 
    label: 'Carpet (Medium Pile)', 
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
    label: 'Audience (Fully Occupied)', 
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
          
          <div className="mt-4 px-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">RT60 vs Target Range</span>
              <span className="text-xs text-gray-500">
                Target: {roomType === 'custom' 
                  ? `${customMinRT.toFixed(1)} - ${customMaxRT.toFixed(1)} s`
                  : `${ROOM_TYPES.find(t => t.value === roomType)?.minRT.toFixed(1)} - ${ROOM_TYPES.find(t => t.value === roomType)?.maxRT.toFixed(1)} s`}
              </span>
            </div>
            <div className="relative w-full h-5 bg-gray-200 rounded-full">
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
              
              {/* Scale Values */}
              <div className="absolute w-full flex justify-between text-xs text-gray-500 bottom-6">
                <span>0s</span>
                <span>1s</span>
                <span>2s</span>
                <span>3s+</span>
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