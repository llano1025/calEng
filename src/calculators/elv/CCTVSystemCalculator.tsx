import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

type CCTVTab = 'storage' | 'bandwidth' | 'coverage' | 'power';
type ResultsHandler = (inputs: Record<string, any>, results: Record<string, any>) => void;

interface CameraGroupSummary {
  id: string;
  name: string;
  quantity: number;
  bitrate: number; // Mbps per camera (stream bitrate)
}

const TAB_NAMES: Record<CCTVTab, string> = {
  storage: 'Storage Calculator',
  bandwidth: 'Bandwidth Calculator',
  coverage: 'Camera Coverage',
  power: 'Power Consumption'
};

interface CCTVSystemCalculatorProps {
  onBack?: () => void; // MODIFIED: Made onBack optional
  onShowTutorial?: () => void;
}

// Main CCTV System Calculator component that coordinates the sub-calculators
const CCTVSystemCalculator: React.FC<CCTVSystemCalculatorProps> = ({ onBack, onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'CCTV System Calculator',
    discipline: 'elv',
    calculatorType: 'cctv-system'
  });
  
  // State for the active tab
  const [activeTab, setActiveTab] = useState<CCTVTab>('storage');
  const activeTabRef = useRef<CCTVTab>('storage');
  activeTabRef.current = activeTab;

  // Camera groups defined in the Storage tab, offered to the Bandwidth tab
  const [cameraGroups, setCameraGroups] = useState<CameraGroupSummary[]>([]);

  // Latest results of each tab; the active tab feeds the export / history actions
  const resultsRef = useRef<Partial<Record<CCTVTab, { inputs: Record<string, any>; results: Record<string, any> }>>>({});
  const saveTimer = useRef<number | undefined>(undefined);

  const handleResults = useCallback((tab: CCTVTab, inputs: Record<string, any>, results: Record<string, any>) => {
    resultsRef.current[tab] = { inputs, results };
    if (tab !== activeTabRef.current) return;
    const taggedInputs = { calculator: TAB_NAMES[tab], ...inputs };
    const taggedResults = { calculator: TAB_NAMES[tab], ...results };
    prepareExportData(taggedInputs, taggedResults);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveCalculation(taggedInputs, taggedResults), 1000);
  }, [prepareExportData, saveCalculation]);

  const onStorageResults = useCallback<ResultsHandler>((i, r) => handleResults('storage', i, r), [handleResults]);
  const onBandwidthResults = useCallback<ResultsHandler>((i, r) => handleResults('bandwidth', i, r), [handleResults]);
  const onCoverageResults = useCallback<ResultsHandler>((i, r) => handleResults('coverage', i, r), [handleResults]);
  const onPowerResults = useCallback<ResultsHandler>((i, r) => handleResults('power', i, r), [handleResults]);

  // When the user switches tab, export the results of that tab
  useEffect(() => {
    const entry = resultsRef.current[activeTab];
    if (entry) {
      prepareExportData({ calculator: TAB_NAMES[activeTab], ...entry.inputs }, { calculator: TAB_NAMES[activeTab], ...entry.results });
    }
  }, [activeTab, prepareExportData]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  return (
    <CalculatorWrapper
      title="CCTV System Calculator"
      discipline="elv"
      calculatorType="cctv-system"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="animate-fade-in">

      {/* Tab Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex border-b mb-6 overflow-x-auto">
          <button
            className={`py-2 px-4 mr-2 whitespace-nowrap ${
              activeTab === 'storage'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('storage')}
          >
            Storage Calculator
          </button>
          <button
            className={`py-2 px-4 mr-2 whitespace-nowrap ${
              activeTab === 'bandwidth'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('bandwidth')}
          >
            Bandwidth Calculator
          </button>
          <button
            className={`py-2 px-4 mr-2 whitespace-nowrap ${
              activeTab === 'coverage'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('coverage')}
          >
            Camera Coverage
          </button>
          <button
            className={`py-2 px-4 whitespace-nowrap ${
              activeTab === 'power'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('power')}
          >
            Power Consumption
          </button>
        </div>
        
        {/* Content: all tabs stay mounted so that their inputs are kept when switching tabs */}
        <div className={activeTab === 'storage' ? '' : 'hidden'}>
          <StorageCalculator onShowTutorial={onShowTutorial} onResults={onStorageResults} onCameraGroupsChange={setCameraGroups} />
        </div>
        <div className={activeTab === 'bandwidth' ? '' : 'hidden'}>
          <BandwidthCalculator onShowTutorial={onShowTutorial} onResults={onBandwidthResults} cameraGroups={cameraGroups} />
        </div>
        <div className={activeTab === 'coverage' ? '' : 'hidden'}>
          <CoverageCalculator onShowTutorial={onShowTutorial} onResults={onCoverageResults} />
        </div>
        <div className={activeTab === 'power' ? '' : 'hidden'}>
          <PowerConsumptionCalculator onShowTutorial={onShowTutorial} onResults={onPowerResults} />
        </div>
      </div>
    </div>
    </CalculatorWrapper>
  );
};

// ======================== STORAGE CALCULATOR ========================

interface StorageCalculatorProps {
  onShowTutorial?: () => void;
  onResults?: ResultsHandler;
  onCameraGroupsChange?: (groups: CameraGroupSummary[]) => void;
}

// Define interface for camera configurations
interface CameraConfig {
  id: string;
  name: string;
  resolution: string;
  frameRate: number;
  compressionType: string;
  sceneComplexity: string;
  recordingHours: number;
  motionDetection: boolean;
  motionPercentage: number;
  quantity: number;
  bitrate: number; // Calculated
  storageMB: number; // Calculated (MB per day per camera)
}

// Frame rate (fps) at which the base bitrates below are specified
const REFERENCE_FRAME_RATE = 30;

// Resolution options with respective bitrates (Mbps per camera at REFERENCE_FRAME_RATE)
const RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p (1280×720)', baseBitrate: 2.0 },
  { value: '1080p', label: '1080p (1920×1080)', baseBitrate: 4.0 },
  { value: '4mp', label: '4MP (2560×1440)', baseBitrate: 6.0 },
  { value: '5mp', label: '5MP (2560×1920)', baseBitrate: 9.0 },
  { value: '8mp', label: '8MP/4K (3840×2160)', baseBitrate: 10.0 },
  { value: '12mp', label: '12MP (4000×3000)', baseBitrate: 20.0 }
];

// Compression options with bitrate multipliers
const COMPRESSION_OPTIONS = [
  { value: 'h264', label: 'H.264', multiplier: 1.0 },
  { value: 'h265', label: 'H.265/HEVC', multiplier: 0.5 },
  { value: 'mjpeg', label: 'MJPEG', multiplier: 5.0 },
  { value: 'mpeg4', label: 'MPEG-4', multiplier: 1.2 }
];

// Scene complexity factors (engineering allowance on the typical bitrate)
const SCENE_COMPLEXITY_OPTIONS = [
  { value: 'low', label: 'Low (indoor, static scene)', multiplier: 0.7 },
  { value: 'medium', label: 'Medium (typical)', multiplier: 1.0 },
  { value: 'high', label: 'High (busy, outdoor, low light, foliage)', multiplier: 1.5 }
];

// Bitrate and storage of one camera, step by step
const computeCamera = (camera: Pick<CameraConfig, 'resolution' | 'compressionType' | 'frameRate' | 'sceneComplexity' | 'motionDetection' | 'motionPercentage' | 'recordingHours'>) => {
  const resolution = RESOLUTION_OPTIONS.find(r => r.value === camera.resolution);
  const baseBitrate = resolution ? resolution.baseBitrate : 4.0; // default to 1080p
  const compression = COMPRESSION_OPTIONS.find(c => c.value === camera.compressionType);
  const compressionMultiplier = compression ? compression.multiplier : 1.0;
  const complexity = SCENE_COMPLEXITY_OPTIONS.find(c => c.value === camera.sceneComplexity);
  const complexityMultiplier = complexity ? complexity.multiplier : 1.0;
  const frameRateFactor = (camera.frameRate > 0 ? camera.frameRate : REFERENCE_FRAME_RATE) / REFERENCE_FRAME_RATE;
  // Stream bitrate: what the camera sends over the network while streaming.
  // Motion-triggered recording reduces the recorded time, not the stream bitrate.
  const streamBitrate = baseBitrate * compressionMultiplier * frameRateFactor * complexityMultiplier;
  const recordingDuty = camera.motionDetection ? camera.motionPercentage / 100 : 1;
  // Storage in MB (10^6 bytes) per day: Mbps × 3600 s/h × hours × duty ÷ 8 bits/byte
  const storageMBPerDay = (streamBitrate * 3600 * camera.recordingHours * recordingDuty) / 8;
  return { baseBitrate, compressionMultiplier, frameRateFactor, complexityMultiplier, streamBitrate, recordingDuty, storageMBPerDay };
};

// Hard drive size options
const DRIVE_SIZE_OPTIONS = [
  { value: 18, label: '18TB' },
  { value: 16, label: '16TB' },
  { value: 14, label: '14TB' },
  { value: 12, label: '12TB' },
  { value: 10, label: '10TB' },
  { value: 8, label: '8TB' },
  { value: 6, label: '6TB' },
  { value: 4, label: '4TB' },
  { value: 2, label: '2TB' },
  { value: 1, label: '1TB' }
];

// RAID types
const RAID_TYPES = [
  { value: 'none', label: 'No Redundancy', description: 'No data protection' },
  { value: 'raid1', label: 'RAID 1 (Mirror)', description: 'Full mirroring for maximum reliability' },
  { value: 'raid5', label: 'RAID 5 (N+1)', description: 'Distributed parity, requires one extra drive' },
  { value: 'raid6', label: 'RAID 6 (N+2)', description: 'Dual parity, requires two extra drives' }
];

const StorageCalculator: React.FC<StorageCalculatorProps> = ({ onShowTutorial, onResults, onCameraGroupsChange }) => {
  // State for storage parameters
  const [retentionDays, setRetentionDays] = useState<number>(31);
  const [raidType, setRaidType] = useState<string>('none');
  const [spareFactor, setSpareFactor] = useState<number>(30); // New: spare factor
  const [selectedDriveSize, setSelectedDriveSize] = useState<number>(8); // New: user-selected drive size
  
  // State for camera list
  const [cameras, setCameras] = useState<CameraConfig[]>([
    {
      id: '1',
      name: 'Entrance Camera',
      resolution: '1080p',
      frameRate: 25,
      compressionType: 'h264',
      sceneComplexity: 'medium',
      recordingHours: 24,
      motionDetection: false,
      motionPercentage: 30,
      quantity: 1,
      bitrate: 0, // Will be calculated
      storageMB: 0 // Will be calculated
    }
  ]);
  
  // State for editing camera
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  
  // State for calculation results
  const [totalRawStorage, setTotalRawStorage] = useState<number>(0); // Raw storage in TB
  const [totalEffectiveStorage, setTotalEffectiveStorage] = useState<number>(0); // Effective storage in TB
  const [totalBandwidth, setTotalBandwidth] = useState<number>(0); // in Mbps
  const [storageBreakdown, setStorageBreakdown] = useState<any[]>([]);
  const [requiredDrives, setRequiredDrives] = useState<{ 
    count: number;
    raidDrives: number;
    spareDrives: number;
    totalCapacity: number;
    usableCapacity: number;
  }>({
    count: 0,
    raidDrives: 0,
    spareDrives: 0,
    totalCapacity: 0,
    usableCapacity: 0
  });
  
  // Calculate bitrates and storage requirements whenever camera configurations change
  useEffect(() => {
    const updatedCameras = cameras.map(camera => {
      const calc = computeCamera(camera);
      return {
        ...camera,
        bitrate: calc.streamBitrate,
        storageMB: calc.storageMBPerDay // MB per day per camera
      };
    });
    
    if (JSON.stringify(cameras) !== JSON.stringify(updatedCameras)) { 
        setCameras(updatedCameras);
    }
    
    // Calculate total storage required
    // totalMBPerDay sums the (storageMB_per_camera * quantity) for all camera groups
    const totalMBPerDayForAllCameras = updatedCameras.reduce((sum, camera) => sum + (camera.storageMB * camera.quantity), 0);
    // Convert total MB for the entire retention period to TB.
    // Drive capacities are quoted in decimal TB (10^12 bytes), so use decimal units: 1 TB = 1,000,000 MB.
    const rawStorageTB = (totalMBPerDayForAllCameras * retentionDays) / 1_000_000;
    setTotalRawStorage(rawStorageTB);
    
    // Calculate effective storage needed based on RAID type
    let effectiveStorageTB = rawStorageTB;
    setTotalEffectiveStorage(effectiveStorageTB);
    
    // Calculate required drives based on RAID type and selected drive size
    const drives = calculateRequiredDrives(rawStorageTB, raidType, selectedDriveSize, spareFactor);
    
    // Calculate total bandwidth
    const totalMbps = updatedCameras.reduce((sum, camera) => sum + (camera.bitrate * camera.quantity), 0);
    setTotalBandwidth(totalMbps);
    
    // Create storage breakdown by camera group
    const breakdown = updatedCameras.map(camera => {
      const dailyStorageForGroupMB = camera.storageMB * camera.quantity; // MB per day for this group
      const totalStorageForGroupTB = (dailyStorageForGroupMB * retentionDays) / 1_000_000; // TB for this group
      return {
        id: camera.id,
        name: camera.name,
        quantity: camera.quantity,
        bitrate: camera.bitrate, // Mbps per camera in this group
        dailyStorage: dailyStorageForGroupMB, // Total MB per day for this group
        totalStorage: totalStorageForGroupTB // Total TB for this group for the retention period
      };
    });
    setStorageBreakdown(breakdown);
    
    // Share the camera groups with the Bandwidth tab and report results for export / history
    onCameraGroupsChange?.(updatedCameras.map(c => ({ id: c.id, name: c.name, quantity: c.quantity, bitrate: c.bitrate })));
    onResults?.(
      { retentionDays, raidType, capacityHeadroomPercent: spareFactor, driveSizeTB: selectedDriveSize, cameraGroups: updatedCameras.map(c => ({ name: c.name, resolution: c.resolution, frameRate: c.frameRate, compression: c.compressionType, sceneComplexity: c.sceneComplexity, recordingHours: c.recordingHours, motionDetection: c.motionDetection, motionPercentage: c.motionPercentage, quantity: c.quantity })) },
      {
        totalRawStorageTB: rawStorageTB.toFixed(2),
        storageWithHeadroomTB: (rawStorageTB * (1 + spareFactor / 100)).toFixed(2),
        totalStreamBandwidthMbps: totalMbps.toFixed(2),
        totalDrives: drives.count,
        totalCapacityTB: drives.totalCapacity.toFixed(2),
        usableCapacityTB: drives.usableCapacity.toFixed(2),
        breakdown: breakdown.map(b => ({ group: b.name, quantity: b.quantity, bitrateMbps: b.bitrate.toFixed(2), dailyGB: (b.dailyStorage / 1000).toFixed(2), totalTB: b.totalStorage.toFixed(2) }))
      }
    );
    
  }, [cameras, retentionDays, raidType, selectedDriveSize, spareFactor]);

  // Calculate required drives based on RAID type and selected drive size
  const calculateRequiredDrives = (rawStorageTB: number, raidType: string, driveSize: number, spareFactor: number) => {
    // Calculate additional storage for spare capacity based on percentage of raw storage
    const spareStorageTB = (rawStorageTB * spareFactor) / 100;
    // Total storage needed including spare capacity
    const totalStorageNeeded = rawStorageTB + spareStorageTB;
    
    // Calculate data disks needed for the total storage
    let dataDisks = Math.ceil(totalStorageNeeded / driveSize);
    let raidDisks = 0;
    let usableCapacity = 0;
    
    // Calculate RAID overhead
    switch(raidType) {
      case 'raid1':
        // RAID 1: Mirror, so double the disks
        raidDisks = dataDisks * 2; // Double the disks for mirroring
        usableCapacity = dataDisks * driveSize; // Usable capacity is equal to data disks
        break;
      case 'raid5':
        // RAID 5: Need 1 extra drive for parity
        // RAID 5 needs at least 3 drives
        raidDisks = dataDisks > 0 ? Math.max(dataDisks + 1, 3) : 0;
        usableCapacity = raidDisks > 0 ? (raidDisks - 1) * driveSize : 0;
        break;
      case 'raid6':
        // RAID 6: Need 2 extra drives for dual parity
        // RAID 6 needs at least 4 drives
        raidDisks = dataDisks > 0 ? Math.max(dataDisks + 2, 4) : 0;
        usableCapacity = raidDisks > 0 ? (raidDisks - 2) * driveSize : 0;
        break;
      default: // 'none' or any other value
        raidDisks = dataDisks;
        usableCapacity = dataDisks * driveSize;
    }
    
    // Total drive count (no additional spare drives, since spare is included in the storage calculation)
    const totalDrives = raidDisks;
    const totalCapacity = totalDrives * driveSize;
    
    const drives = {
      count: totalDrives,
      raidDrives: raidDisks,
      spareDrives: 0, // No separate spare drives, as spare is included in the storage capacity
      totalCapacity: totalCapacity,
      usableCapacity: usableCapacity
    };
    setRequiredDrives(drives);
    return drives;
  };

  // Function to add a new camera
  const addCamera = () => {
    const newId = (cameras.length > 0 ? Math.max(...cameras.map(c => parseInt(c.id))) + 1 : 1).toString();
    
    setCameras(prevCameras => [ 
      ...prevCameras,
      {
        id: newId,
        name: `Camera ${newId}`,
        resolution: '1080p',
        frameRate: 15,
        compressionType: 'h264',
        sceneComplexity: 'medium',
        recordingHours: 24,
        motionDetection: false,
        motionPercentage: 30,
        quantity: 1,
        bitrate: 0,
        storageMB: 0
      }
    ]);
  };

  // Function to remove a camera
  const removeCamera = (id: string) => {
    if (cameras.length > 1) {
      setCameras(prevCameras => prevCameras.filter(camera => camera.id !== id)); 
    }
  };

  // Function to update a camera property
  const updateCamera = (id: string, field: keyof CameraConfig, value: any) => {
    setCameras(prevCameras => prevCameras.map(camera => { 
      if (camera.id === id) {
        // Ensure numeric fields are numbers
        if (field === 'frameRate' || field === 'recordingHours' || field === 'motionPercentage' || field === 'quantity') {
            const numValue = Number(value);
            // Add some basic validation for min/max if necessary here or rely on input attributes
            return { ...camera, [field]: numValue < 0 ? 0 : numValue };
        }
        return { ...camera, [field]: value };
      }
      return camera;
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Storage Parameters</h3>
        
        <div className="mb-4">
          <label htmlFor="retentionDays" className="block text-sm font-medium text-gray-700 mb-1">
            Retention Period (Days)
          </label>
          <div className="flex items-center">
            <input
              id="retentionDays"
              type="number"
              min="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value)))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="ml-2 text-sm text-gray-500">days</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">How long to keep video footage.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="raidType" className="block text-sm font-medium text-gray-700 mb-1">
              RAID Configuration
            </label>
            <select
              id="raidType"
              value={raidType}
              onChange={(e) => setRaidType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {RAID_TYPES.map(raid => (
                <option key={raid.value} value={raid.value}>{raid.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {RAID_TYPES.find(r => r.value === raidType)?.description || 'Select redundancy type'}
            </p>
          </div>
          
          <div>
            <label htmlFor="spareFactor" className="block text-sm font-medium text-gray-700 mb-1">
              Capacity Headroom (%)
            </label>
            <input
              id="spareFactor"
              type="number"
              min="0"
              max="100"
              value={spareFactor}
              onChange={(e) => setSpareFactor(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Extra capacity above the calculated storage (growth, pre/post-event buffer, file-system overhead).</p>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="driveSize" className="block text-sm font-medium text-gray-700 mb-1">
            Hard Drive Size
          </label>
          <select
            id="driveSize"
            value={selectedDriveSize}
            onChange={(e) => setSelectedDriveSize(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {DRIVE_SIZE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Select the capacity of individual hard drives.</p>
        </div>
        
        <div className="border-t border-gray-300 my-6"></div>
        
        {/* CAMERA CONFIGURATION SECTION */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Camera Configuration</h3>
            <button
              onClick={addCamera}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Camera Group
            </button>
          </div>
          
          {cameras.map((camera) => (
            <div key={camera.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">{camera.name || `Camera Group ${camera.id}`}</h4>
                {cameras.length > 1 && (
                  <button 
                    onClick={() => removeCamera(camera.id)} 
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    aria-label={`Remove ${camera.name || `Camera Group ${camera.id}`}`}
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {editingCameraId === camera.id ? (
                <div className="pl-3 border-l-4 border-blue-400 space-y-3">
                  <div>
                    <label htmlFor={`cameraName-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">Camera Group Name</label>
                    <input
                      id={`cameraName-${camera.id}`}
                      type="text"
                      value={camera.name}
                      onChange={(e) => updateCamera(camera.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="E.g., Outdoor Cameras"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`resolution-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                      <select
                        id={`resolution-${camera.id}`}
                        value={camera.resolution}
                        onChange={(e) => updateCamera(camera.id, 'resolution', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {RESOLUTION_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`frameRate-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">Frame Rate (fps)</label>
                      <input
                        id={`frameRate-${camera.id}`}
                        type="number"
                        min="1"
                        max="120" // Increased max for some high-speed cameras
                        value={camera.frameRate}
                        onChange={(e) => updateCamera(camera.id, 'frameRate', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`compression-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">Compression</label>
                      <select
                        id={`compression-${camera.id}`}
                        value={camera.compressionType}
                        onChange={(e) => updateCamera(camera.id, 'compressionType', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {COMPRESSION_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`complexity-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">Scene Complexity</label>
                      <select
                        id={`complexity-${camera.id}`}
                        value={camera.sceneComplexity}
                        onChange={(e) => updateCamera(camera.id, 'sceneComplexity', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {SCENE_COMPLEXITY_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label} (×{option.multiplier})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`recordingHours-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">Recording Hours/Day</label>
                      <input
                        id={`recordingHours-${camera.id}`}
                        type="number"
                        min="1"
                        max="24"
                        value={camera.recordingHours}
                        onChange={(e) => updateCamera(camera.id, 'recordingHours', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`motion-detection-${camera.id}`} 
                        checked={camera.motionDetection}
                        onChange={(e) => updateCamera(camera.id, 'motionDetection', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`motion-detection-${camera.id}`} className="ml-2 block text-sm text-gray-700"> 
                        Use Motion Detection Recording
                      </label>
                    </div>
                    
                    {camera.motionDetection && (
                      <div className="mt-2 pl-6">
                        <label htmlFor={`motionPercentage-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Motion Percentage (% time with motion)
                        </label>
                        <input
                          id={`motionPercentage-${camera.id}`}
                          type="number"
                          min="1"
                          max="100"
                          value={camera.motionPercentage}
                          onChange={(e) => updateCamera(camera.id, 'motionPercentage', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Estimate what percentage of time motion occurs.</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor={`quantity-${camera.id}`} className="block text-sm font-medium text-gray-700 mb-1">Quantity (Cameras in this group)</label>
                    <input
                      id={`quantity-${camera.id}`}
                      type="number"
                      min="1"
                      value={camera.quantity}
                      onChange={(e) => updateCamera(camera.id, 'quantity', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={() => setEditingCameraId(null)} 
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Resolution:</p>
                      <p className="font-semibold text-gray-800">
                        {RESOLUTION_OPTIONS.find(o => o.value === camera.resolution)?.label.split(' ')[0] || camera.resolution}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Frame Rate:</p>
                      <p className="font-semibold text-gray-800">{camera.frameRate} fps</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Compression:</p>
                      <p className="font-semibold text-gray-800">
                        {COMPRESSION_OPTIONS.find(o => o.value === camera.compressionType)?.label || camera.compressionType}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Recording:</p>
                      <p className="font-semibold text-gray-800">{camera.recordingHours} hours/day</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Motion Detection:</p>
                      <p className="font-semibold text-gray-800">
                        {camera.motionDetection ? `Yes (${camera.motionPercentage}%)` : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Quantity:</p>
                      <p className="font-semibold text-gray-800">{camera.quantity} camera{camera.quantity !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Est. Bitrate/Camera:</p>
                      <p className="font-semibold text-gray-800">{camera.bitrate.toFixed(2)} Mbps</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Daily Storage/Camera:</p>
                      <p className="font-semibold text-gray-800">{camera.storageMB.toFixed(2)} MB</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setEditingCameraId(camera.id)} 
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                      aria-label={`Edit ${camera.name || `Camera Group ${camera.id}`}`}
                    >
                      <Icons.Edit />
                      <span className="ml-1">Edit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
           {cameras.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No camera groups added. Click "Add Camera Group" to start.
            </p>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-base text-gray-700">Total Raw Storage</h4>
              <div className="mt-2">
                <p className="font-bold text-3xl text-blue-600">{totalRawStorage.toFixed(2)} TB</p>
                <p className="text-sm text-gray-600">For {retentionDays} days of footage</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-base text-gray-700">Total Bandwidth Required</h4>
              <div className="mt-2">
                <p className="font-bold text-3xl text-green-600">{totalBandwidth.toFixed(2)} Mbps</p>
                <p className="text-sm text-gray-600">Network bandwidth for all cameras</p>
              </div>
            </div>
          </div>
        </div>
        
        <h4 className="font-medium mb-3 text-blue-700">Step-by-Step Calculation</h4>
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2 pr-3">Camera group</th>
                  <th className="py-2 pr-3 text-right">Base (Mbps)</th>
                  <th className="py-2 pr-3 text-right">Codec ×</th>
                  <th className="py-2 pr-3 text-right">fps ×</th>
                  <th className="py-2 pr-3 text-right">Scene ×</th>
                  <th className="py-2 pr-3 text-right">Stream (Mbps)</th>
                  <th className="py-2 pr-3 text-right">Rec. duty</th>
                  <th className="py-2 text-right">MB/day/cam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cameras.map((camera) => {
                  const calc = computeCamera(camera);
                  return (
                    <tr key={camera.id}>
                      <td className="py-2 pr-3 font-medium text-gray-800">{camera.name}</td>
                      <td className="py-2 pr-3 text-right text-gray-700">{calc.baseBitrate.toFixed(1)}</td>
                      <td className="py-2 pr-3 text-right text-gray-700">{calc.compressionMultiplier.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right text-gray-700">{calc.frameRateFactor.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right text-gray-700">{calc.complexityMultiplier.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-gray-800">{calc.streamBitrate.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right text-gray-700">{(calc.recordingDuty * 100).toFixed(0)}%</td>
                      <td className="py-2 text-right font-semibold text-gray-800">{calc.storageMBPerDay.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ol className="list-decimal pl-5 mt-3 space-y-1 text-sm text-gray-700">
            <li>Stream bitrate = base bitrate (at {REFERENCE_FRAME_RATE} fps) × codec × (fps ÷ {REFERENCE_FRAME_RATE}) × scene complexity.</li>
            <li>Storage per camera per day = stream bitrate × 3600 s/h × recording hours × recording duty ÷ 8 bits/byte.</li>
            <li>Raw storage = Σ (storage per camera × quantity) × {retentionDays} days ÷ 1,000,000 = <span className="font-semibold">{totalRawStorage.toFixed(2)} TB</span>.</li>
            <li>With {spareFactor}% capacity headroom: {totalRawStorage.toFixed(2)} × {(1 + spareFactor / 100).toFixed(2)} = <span className="font-semibold">{(totalRawStorage * (1 + spareFactor / 100)).toFixed(2)} TB</span>.</li>
            <li>Data drives = ⌈{(totalRawStorage * (1 + spareFactor / 100)).toFixed(2)} ÷ {selectedDriveSize} TB⌉ = {Math.ceil((totalRawStorage * (1 + spareFactor / 100)) / selectedDriveSize)}; with {RAID_TYPES.find(r => r.value === raidType)?.label || 'no redundancy'} the array needs <span className="font-semibold">{requiredDrives.count} drives</span> ({requiredDrives.usableCapacity.toFixed(1)} TB usable).</li>
          </ol>
        </div>

        <h4 className="font-medium mb-3 text-blue-700">Storage Breakdown by Camera Group</h4>
        <div className="overflow-x-auto bg-white rounded-md shadow mb-6">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Camera Group</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bitrate/Cam</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Daily (GB)</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (TB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {storageBreakdown.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.bitrate.toFixed(2)} Mbps</td>
                  {/* item.dailyStorage is total MB/day for the group. Divide by 1000 for (decimal) GB. */}
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{(item.dailyStorage / 1000).toFixed(2)} GB</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.totalStorage.toFixed(2)} TB</td>
                </tr>
              ))}
              {storageBreakdown.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-sm text-gray-500">No camera data to display.</td>
                </tr>
              )}
              {storageBreakdown.length > 0 && (
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{cameras.reduce((sum, camera) => sum + camera.quantity, 0)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{totalBandwidth.toFixed(2)} Mbps</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{(storageBreakdown.reduce((sum, item) => sum + item.dailyStorage, 0) / 1000).toFixed(2)} GB</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{totalRawStorage.toFixed(2)} TB</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h4 className="font-medium mb-3 text-blue-700">Hard Drive Configuration</h4>
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
            <div>
              <h5 className="font-medium text-gray-800">Required Configuration</h5>
              <p className="text-sm text-gray-600">Using {selectedDriveSize}TB drives with {RAID_TYPES.find(r => r.value === raidType)?.label || 'No Redundancy'}</p>
            </div>
            <div className="mt-2 sm:mt-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {spareFactor > 0 ? `${spareFactor}% capacity headroom` : 'No capacity headroom'}
              </span>
            </div>
          </div>
          
          <div className="p-3 rounded-md bg-blue-50 border border-blue-300">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Drives:</p>
                <p className="font-medium text-xl text-blue-700">{requiredDrives.count}</p>
                <p className="text-xs text-gray-500">
                  {requiredDrives.raidDrives} drives in the array (hot spares not included)
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Capacity:</p>
                <p className="font-medium text-xl">{requiredDrives.totalCapacity.toFixed(2)} TB</p>
                <p className="text-xs text-gray-500">Raw capacity</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Usable Capacity:</p>
                <p className="font-medium text-xl">{requiredDrives.usableCapacity.toFixed(2)} TB</p>
                <p className="text-xs text-gray-500">After RAID overhead</p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm font-medium text-blue-800">Storage Summary</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Required Storage:</span>
                  <span className="text-sm font-medium">{totalRawStorage.toFixed(2)} TB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Excess Capacity:</span>
                  <span className="text-sm font-medium">{(requiredDrives.usableCapacity - totalRawStorage).toFixed(2)} TB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-gray-700">Storage Calculation Notes</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Daily storage per camera (MB/day) = Bitrate (Mbps) × 3600 (seconds/hour) × Recording Hours (hours/day) / 8 (bits/Byte).</li>
            <li>Total storage is calculated based on this daily figure, retention period, and camera quantity.</li>
            <li>Motion detection reduces storage (recorded time) but not the network bandwidth, because the camera still streams continuously. Add pre/post-event buffer time to the motion percentage.</li>
            <li>Bitrate = base bitrate (at 30 fps) × codec multiplier × (frame rate ÷ 30) × scene complexity. Base bitrates are typical engineering values, not standard values; use the camera datasheet bitrate when available.</li>
            <li>H.265/HEVC compression can reduce storage requirements by about 50% compared to H.264.</li>
            <li>RAID 5 requires N+1 drives (minimum 3), RAID 6 requires N+2 drives (minimum 4). Storage uses decimal units (1 TB = 10¹² bytes) to match drive capacities.</li>
            <li>Capacity headroom adds extra capacity as a percentage of the calculated storage. Hot-spare drives are not included; add them separately.</li>
            <li>Actual storage requirements may vary based on scene complexity, lighting conditions, and specific camera implementations.</li>
          </ul>
        </div>

        {onShowTutorial && (
          <div className="mt-6 text-center">
            <button 
              onClick={onShowTutorial} 
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Show Tutorial
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ======================== BANDWIDTH CALCULATOR ========================

interface BandwidthCalculatorProps {
  onShowTutorial?: () => void;
  onResults?: ResultsHandler;
  cameraGroups?: CameraGroupSummary[];
}

interface NetworkSection {
  id: string;
  name: string;
  cameras: number;
  avgBitrate: number; // Mbps per camera
  peakUsage: number; // percentage of cameras active at peak time
  viewingStations: number;
  viewingBitrate: number; // Mbps per viewing station
  totalBandwidth: number; // Calculated
}

const BandwidthCalculator: React.FC<BandwidthCalculatorProps> = ({ onShowTutorial, onResults, cameraGroups = [] }) => {
  // State for network sections
  const [networkSections, setNetworkSections] = useState<NetworkSection[]>([
    {
      id: '1',
      name: 'Main Building',
      cameras: 10,
      avgBitrate: 3,
      peakUsage: 100,
      viewingStations: 2,
      viewingBitrate: 6,
      totalBandwidth: 0 // Will be calculated
    }
  ]);
  
  // State for network parameters
  const [networkUtilization, setNetworkUtilization] = useState<number>(70); // percentage
  const [networkBufferFactor, setNetworkBufferFactor] = useState<number>(1.2);
  const [protocolOverhead, setProtocolOverhead] = useState<number>(8); // Ethernet/IP/UDP/RTP header overhead (%)
  
  // State for editing section
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  
  // State for calculation results
  const [totalRawBandwidth, setTotalRawBandwidth] = useState<number>(0);
  const [totalRequiredBandwidth, setTotalRequiredBandwidth] = useState<number>(0);
  const [bandwidthWithOverhead, setBandwidthWithOverhead] = useState<number>(0);
  const [recommendedNetwork, setRecommendedNetwork] = useState<string>('');
  
  // Calculate bandwidth requirements whenever inputs change
  useEffect(() => {
    const updatedSections = networkSections.map(section => {
      const cameraBandwidth = section.cameras * section.avgBitrate * (section.peakUsage / 100);
      const viewingBandwidth = section.viewingStations * section.viewingBitrate;
      const totalBandwidth = cameraBandwidth + viewingBandwidth;
      return { ...section, totalBandwidth };
    });

    if (JSON.stringify(networkSections) !== JSON.stringify(updatedSections)) {
        setNetworkSections(updatedSections);
    }
    
    const rawBandwidth = updatedSections.reduce((sum, section) => sum + section.totalBandwidth, 0);
    setTotalRawBandwidth(rawBandwidth);
    
    // Stream payload + protocol overhead, derated to the utilization target, plus the expansion buffer
    const withOverhead = rawBandwidth * (1 + protocolOverhead / 100);
    setBandwidthWithOverhead(withOverhead);
    const required = (withOverhead / (networkUtilization / 100)) * networkBufferFactor;
    setTotalRequiredBandwidth(required);
    
    // 'required' already includes the utilization target and buffer factor,
    // so it is compared with the nominal link rates (not derated again).
    if (required <= 10) {
        setRecommendedNetwork('10/100 Mbps Ethernet (Consider Gigabit for future)');
    } else if (required <= 100) {
        setRecommendedNetwork('100 Mbps Fast Ethernet (Consider Gigabit)');
    } else if (required <= 1000) {
        setRecommendedNetwork('1 Gbps Gigabit Ethernet');
    } else if (required <= 10000) {
        setRecommendedNetwork('10 Gbps Ethernet');
    } else {
        setRecommendedNetwork('Multiple 10 Gbps links or higher capacity backbone');
    }
    
    onResults?.(
      { networkUtilizationPercent: networkUtilization, bufferFactor: networkBufferFactor, protocolOverheadPercent: protocolOverhead, sections: updatedSections.map(sec => ({ name: sec.name, cameras: sec.cameras, avgBitrateMbps: sec.avgBitrate, peakUsagePercent: sec.peakUsage, viewingStations: sec.viewingStations, viewingBitrateMbps: sec.viewingBitrate })) },
      {
        rawBandwidthMbps: rawBandwidth.toFixed(2),
        withProtocolOverheadMbps: withOverhead.toFixed(2),
        requiredCapacityMbps: required.toFixed(2),
        recommendedNetwork: required <= 10 ? '10/100 Mbps Ethernet' : required <= 100 ? '100 Mbps Fast Ethernet' : required <= 1000 ? '1 Gbps Ethernet' : required <= 10000 ? '10 Gbps Ethernet' : 'Multiple 10 Gbps links',
        sections: updatedSections.map(sec => ({ section: sec.name, totalMbps: sec.totalBandwidth.toFixed(2) }))
      }
    );
  }, [networkSections, networkUtilization, networkBufferFactor, protocolOverhead]);

  const addNetworkSection = () => {
    const newId = `${Date.now()}`;
    setNetworkSections(prev => [
      ...prev,
      {
        id: newId,
        name: `Section ${networkSections.length + 1}`,
        cameras: 5,
        avgBitrate: 3,
        peakUsage: 100,
        viewingStations: 1,
        viewingBitrate: 6,
        totalBandwidth: 0
      }
    ]);
  };

  // Replace the sections by one section per camera group of the Storage tab
  const importFromStorage = () => {
    if (cameraGroups.length === 0) return;
    const viewing = networkSections[0];
    setNetworkSections(cameraGroups.map((group, index) => ({
      id: `${Date.now()}-${index}`,
      name: group.name,
      cameras: group.quantity,
      avgBitrate: Number(group.bitrate.toFixed(2)),
      peakUsage: 100,
      viewingStations: index === 0 && viewing ? viewing.viewingStations : 0,
      viewingBitrate: viewing ? viewing.viewingBitrate : 6,
      totalBandwidth: 0
    })));
  };

  const removeNetworkSection = (id: string) => {
    if (networkSections.length > 1) {
      setNetworkSections(prev => prev.filter(section => section.id !== id));
    }
  };

  const updateNetworkSection = (id: string, field: keyof NetworkSection, value: any) => {
    setNetworkSections(prev => prev.map(section => 
      section.id === id ? { ...section, [field]: value } : section
    ));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Network Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Network Utilization Target (%)
          </label>
          <div className="flex items-center">
            <input
              type="number"
              min="10"
              max="90"
              value={networkUtilization}
              onChange={(e) => setNetworkUtilization(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="ml-2 text-sm text-gray-500">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Maximum recommended network utilization (typically 70-80%)</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Network Buffer Factor
          </label>
          <input
            type="number"
            min="1"
            max="2"
            step="0.1"
            value={networkBufferFactor}
            onChange={(e) => setNetworkBufferFactor(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Additional capacity for future expansion (e.g., 1.2 = 20% extra)</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Protocol Overhead (%)
          </label>
          <input
            type="number"
            min="0"
            max="30"
            value={protocolOverhead}
            onChange={(e) => setProtocolOverhead(Math.max(0, Number(e.target.value)))}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Ethernet / IP / UDP / RTP header overhead added to the video payload (5–10% typical).</p>
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        {/* NETWORK SECTIONS CONFIGURATION */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Network Sections</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={importFromStorage}
                disabled={cameraGroups.length === 0}
                title="Create one section per camera group defined in the Storage Calculator tab"
                className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm disabled:opacity-50"
              >
                Import from Storage
              </button>
              <button
                onClick={addNetworkSection}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Section
              </button>
            </div>
          </div>
          
          {networkSections.map((section) => (
            <div key={section.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">{section.name}</h4>
                {networkSections.length > 1 && (
                  <button 
                    onClick={() => removeNetworkSection(section.id)} 
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {editingSectionId === section.id ? (
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => updateNetworkSection(section.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Network section name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Cameras</label>
                      <input
                        type="number"
                        min="0" // Allow 0 cameras in a section
                        value={section.cameras}
                        onChange={(e) => updateNetworkSection(section.id, 'cameras', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Bitrate (Mbps)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={section.avgBitrate}
                        onChange={(e) => updateNetworkSection(section.id, 'avgBitrate', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Peak Usage (%)</label>
                      <input
                        type="number"
                        min="0" // Allow 0% if no cameras active
                        max="100"
                        value={section.peakUsage}
                        onChange={(e) => updateNetworkSection(section.id, 'peakUsage', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentage of cameras active at peak</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Viewing Stations</label>
                      <input
                        type="number"
                        min="0"
                        value={section.viewingStations}
                        onChange={(e) => updateNetworkSection(section.id, 'viewingStations', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Viewing Bitrate (Mbps)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={section.viewingBitrate}
                      onChange={(e) => updateNetworkSection(section.id, 'viewingBitrate', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Bandwidth per monitor/viewing station</p>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={() => setEditingSectionId(null)} 
                      className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Cameras:</p>
                      <p className="font-semibold text-gray-800">{section.cameras}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avg. Bitrate:</p>
                      <p className="font-semibold text-gray-800">{section.avgBitrate.toFixed(1)} Mbps</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Peak Usage:</p>
                      <p className="font-semibold text-gray-800">{section.peakUsage}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Viewing Stations:</p>
                      <p className="font-semibold text-gray-800">{section.viewingStations}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Viewing Bitrate:</p>
                      <p className="font-semibold text-gray-800">{section.viewingBitrate.toFixed(1)} Mbps</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Bandwidth:</p>
                      <p className="font-semibold text-gray-800">{section.totalBandwidth.toFixed(2)} Mbps</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setEditingSectionId(section.id)} 
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"
                    >
                      <Icons.Edit />
                      <span className="ml-1">Edit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-base text-gray-700">Raw Bandwidth Total</h4>
              <div className="mt-2">
                <p className="font-bold text-2xl text-blue-600">{totalRawBandwidth.toFixed(2)} Mbps</p>
                <p className="text-sm text-gray-600">Combined bandwidth of all cameras and viewing stations</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-base text-gray-700">Required Network Capacity</h4>
              <div className="mt-2">
                <p className="font-bold text-2xl text-green-600">{totalRequiredBandwidth.toFixed(2)} Mbps</p>
                <p className="text-sm text-gray-600">With {protocolOverhead}% overhead, {networkUtilization}% utilization and {((networkBufferFactor - 1) * 100).toFixed(0)}% buffer</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-md border border-green-200 shadow mb-6">
          <h4 className="font-medium text-base text-green-800 mb-2">Recommended Network</h4>
          <p className="font-bold text-xl text-green-700">{recommendedNetwork}</p>
          <p className="text-sm text-green-600 mt-1">Based on calculated bandwidth requirements</p>
        </div>
        
        <h4 className="font-medium mb-3 text-blue-700">Step-by-Step Calculation</h4>
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            {networkSections.map((section) => (
              <li key={section.id}>
                {section.name}: cameras {section.cameras} × {section.avgBitrate} Mbps × {section.peakUsage}% = {(section.cameras * section.avgBitrate * section.peakUsage / 100).toFixed(2)} Mbps; viewing {section.viewingStations} × {section.viewingBitrate} Mbps = {(section.viewingStations * section.viewingBitrate).toFixed(2)} Mbps; section total <span className="font-semibold">{section.totalBandwidth.toFixed(2)} Mbps</span>.
              </li>
            ))}
            <li>Raw bandwidth = Σ sections = <span className="font-semibold">{totalRawBandwidth.toFixed(2)} Mbps</span>.</li>
            <li>With {protocolOverhead}% protocol overhead: {totalRawBandwidth.toFixed(2)} × {(1 + protocolOverhead / 100).toFixed(2)} = <span className="font-semibold">{bandwidthWithOverhead.toFixed(2)} Mbps</span>.</li>
            <li>Derated to {networkUtilization}% utilization: {bandwidthWithOverhead.toFixed(2)} ÷ {(networkUtilization / 100).toFixed(2)} = {(bandwidthWithOverhead / (networkUtilization / 100)).toFixed(2)} Mbps.</li>
            <li>With the buffer factor {networkBufferFactor}: required capacity = <span className="font-semibold">{totalRequiredBandwidth.toFixed(2)} Mbps</span>, compared with the nominal link rate (100 / 1000 / 10000 Mbps).</li>
          </ol>
        </div>

        <h4 className="font-medium mb-3 text-blue-700">Bandwidth Breakdown by Section</h4>
        <div className="overflow-x-auto bg-white rounded-md shadow mb-6">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cameras</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Camera BW</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Viewing BW</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {networkSections.map((section) => (
                <tr key={section.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{section.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{section.cameras}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    {(section.cameras * section.avgBitrate * (section.peakUsage / 100)).toFixed(2)} Mbps
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    {(section.viewingStations * section.viewingBitrate).toFixed(2)} Mbps
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{section.totalBandwidth.toFixed(2)} Mbps</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                  {networkSections.reduce((sum, section) => sum + section.cameras, 0)}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                  {networkSections.reduce((sum, section) => sum + (section.cameras * section.avgBitrate * (section.peakUsage / 100)), 0).toFixed(2)} Mbps
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                  {networkSections.reduce((sum, section) => sum + (section.viewingStations * section.viewingBitrate), 0).toFixed(2)} Mbps
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">{totalRawBandwidth.toFixed(2)} Mbps</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="font-medium mb-3 text-blue-700">Network Design Considerations</h4>
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="mb-4">
            <h5 className="font-medium text-base mb-2">Recommended Topology</h5>
            {totalRequiredBandwidth > 500 ? ( // Using totalRequiredBandwidth for topology suggestion
              <div>
                <p className="text-sm mb-2">For high bandwidth requirements ({totalRequiredBandwidth.toFixed(0)} Mbps), consider a hierarchical network:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Core Layer: {recommendedNetwork.includes("10 Gbps") ? "10 Gigabit" : "Gigabit"} backbone</li>
                  <li>Distribution Layer: Dedicated switches for each building/section</li>
                  <li>Access Layer: PoE switches for camera connections ({recommendedNetwork.startsWith("1 G") ? "Gigabit preferred" : "Fast Ethernet minimum"})</li>
                  <li>Dedicated VLAN for CCTV traffic is highly recommended.</li>
                </ul>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-2">For moderate bandwidth requirements ({totalRequiredBandwidth.toFixed(0)} Mbps), consider:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Flat network with {recommendedNetwork.startsWith("1 G") ? "Gigabit" : "Fast Ethernet"} PoE switches</li>
                  <li>Dedicated VLAN for CCTV traffic is highly recommended.</li>
                  <li>Direct connection to NVR/recording server</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Bandwidth Calculation Notes</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Required capacity = raw bandwidth × (1 + protocol overhead) ÷ utilization target × buffer factor, compared with the nominal link rate.</li><li>Network utilization target ensures network isn't saturated during peak times</li>
            <li>Buffer factor provides headroom for future expansion</li>
            <li>Peak usage accounts for percentage of cameras that will stream simultaneously</li>
            <li>Viewing stations typically require higher bandwidth than cameras (for multiple views)</li>
            <li>Network infrastructure should be scaled based on the maximum potential bandwidth</li>
            <li>Consider using Quality of Service (QoS) to prioritize critical CCTV traffic</li>
            <li>For larger systems, consider using multicast to reduce bandwidth consumption if supported and applicable.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== CAMERA COVERAGE CALCULATOR ========================

interface CoverageCalculatorProps {
  onShowTutorial?: () => void;
  onResults?: ResultsHandler;
}

interface Area {
  id: string;
  name: string;
  length: number;
  width: number;
  coverageType: 'general' | 'detailed' | 'recognition' | 'identification';
  obstaclePercentage: number;
  mountHeight: number;
  cameraViewingAngle: number;
  designDistance: number; // distance from camera to target (m)
  requiredCameras: number; // Calculated
}

// Nominal sensor widths (mm) of the standard optical formats, used for the lens focal length
const SENSOR_FORMATS = [
  { value: '1/3', label: '1/3" (4.8 mm wide)', width: 4.8 },
  { value: '1/2.7', label: '1/2.7" (5.3 mm wide)', width: 5.33 },
  { value: '1/2.5', label: '1/2.5" (5.8 mm wide)', width: 5.76 },
  { value: '1/2', label: '1/2" (6.4 mm wide)', width: 6.4 },
  { value: '1/1.8', label: '1/1.8" (7.2 mm wide)', width: 7.18 },
  { value: '2/3', label: '2/3" (8.8 mm wide)', width: 8.8 },
  { value: '1', label: '1" (12.8 mm wide)', width: 12.8 }
];

// DORI pixel-density requirements (pixels per metre on the target) from IEC 62676-4
const COVERAGE_TYPES = [
  { value: 'general', label: 'Detection (presence of a person)', pixelDensity: 25 }, // px/m
  { value: 'detailed', label: 'Observation (characteristic details)', pixelDensity: 62 },
  { value: 'recognition', label: 'Recognition (known person)', pixelDensity: 125 },
  { value: 'identification', label: 'Identification (unknown person)', pixelDensity: 250 }
];

const CoverageCalculator: React.FC<CoverageCalculatorProps> = ({ onShowTutorial, onResults }) => {
  const [areas, setAreas] = useState<Area[]>([
    {
      id: '1',
      name: 'Main Entrance',
      length: 10,
      width: 5,
      coverageType: 'identification',
      obstaclePercentage: 10,
      mountHeight: 3,
      cameraViewingAngle: 90,
      designDistance: 5,
      requiredCameras: 0 
    }
  ]);
  
  const [selectedResolution, setSelectedResolution] = useState<string>('1080p');
  const [overlapPercentage, setOverlapPercentage] = useState<number>(15); // overlap between adjacent camera views
  const [sensorFormat, setSensorFormat] = useState<string>('1/2.7');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [totalCameras, setTotalCameras] = useState<number>(0);
  const [cameraDetails, setCameraDetails] = useState<any[]>([]);
  
  const resolutionOptions = [
    { value: '720p', label: '720p (1280×720)', width: 1280, height: 720 },
    { value: '1080p', label: '1080p (1920×1080)', width: 1920, height: 1080 },
    { value: '4mp', label: '4MP (2560×1440)', width: 2560, height: 1440 },
    { value: '5mp', label: '5MP (2560×1920)', width: 2560, height: 1920 }, // Often 2592x1944 or similar
    { value: '8mp', label: '8MP/4K (3840×2160)', width: 3840, height: 2160 },
    { value: '12mp', label: '12MP (4000×3000)', width: 4000, height: 3000 } // Or 4096x3072 etc.
  ];
  
  const RESOLUTION_PIXELS = (value: string) => resolutionOptions.find(r => r.value === value) ?? resolutionOptions[1];
  
  useEffect(() => {
    const resolution = resolutionOptions.find(r => r.value === selectedResolution);
    if (!resolution) return;
    
    const cameraWidthPixels = resolution.width;
    const cameraHeightPixels = resolution.height;
    
    const updatedAreas = areas.map(area => {
      const coverageTypeInfo = COVERAGE_TYPES.find(c => c.value === area.coverageType);
      const pixelDensity = coverageTypeInfo ? coverageTypeInfo.pixelDensity : 62;
      
      // Scene width and height (m) one camera can cover while still delivering the required pixels per metre
      const sceneWidthPerCamera = cameraWidthPixels / pixelDensity;
      const sceneHeightPerCamera = cameraHeightPixels / pixelDensity;
      
      // Area covered by one camera at the required pixel density (rectangular field of view)
      const idealAreaPerCamera = sceneWidthPerCamera * sceneHeightPerCamera;
      
      // Obstructions (blind spots) and the overlap needed between adjacent views both reduce
      // the useful area each camera contributes, so more cameras are required.
      const usableFraction = Math.max(0.05, (1 - area.obstaclePercentage / 100) * (1 - overlapPercentage / 100));
      const effectiveAreaPerCamera = idealAreaPerCamera * usableFraction;

      const areaToBeMonitored = area.length * area.width;
      
      const camerasNeeded = (effectiveAreaPerCamera > 0 && areaToBeMonitored > 0) 
                            ? Math.ceil(areaToBeMonitored / effectiveAreaPerCamera) 
                            : 0;
      
      return { ...area, requiredCameras: camerasNeeded };
    });

    if (JSON.stringify(areas) !== JSON.stringify(updatedAreas)) {
        setAreas(updatedAreas);
    }
    
    setTotalCameras(updatedAreas.reduce((sum, area) => sum + area.requiredCameras, 0));
    
    const details = updatedAreas.map(area => {
      const coverageTypeInfo = COVERAGE_TYPES.find(c => c.value === area.coverageType);
      const pixelDensity = coverageTypeInfo ? coverageTypeInfo.pixelDensity : 62;
      
      const viewingAngleRad = (area.cameraViewingAngle * Math.PI) / 180;
      // Width of the field of view at a distance equal to the mount height
      const groundFoVWidth = 2 * area.mountHeight * Math.tan(viewingAngleRad / 2);
      
      // Scene width that still meets the pixel density, and the distance at which the lens (horizontal FoV)
      // produces exactly that scene width: D = (H_pixels / ppm) / (2 * tan(HFoV / 2))
      const sceneWidthForDetail = cameraWidthPixels / pixelDensity;
      const maxDistanceForDetail = viewingAngleRad > 0 && viewingAngleRad < Math.PI
        ? sceneWidthForDetail / (2 * Math.tan(viewingAngleRad / 2))
        : 0;
      
      // Lens check at the design distance (pinhole model)
      const sensorWidth = (SENSOR_FORMATS.find(f => f.value === sensorFormat) ?? SENSOR_FORMATS[1]).width;
      const sceneWidthAtDistance = viewingAngleRad > 0 && viewingAngleRad < Math.PI ? 2 * area.designDistance * Math.tan(viewingAngleRad / 2) : 0;
      const achievedPixelDensity = sceneWidthAtDistance > 0 ? cameraWidthPixels / sceneWidthAtDistance : 0;
      const requiredHFoVDeg = area.designDistance > 0 ? (2 * Math.atan(sceneWidthForDetail / (2 * area.designDistance)) * 180) / Math.PI : 0;
      const requiredFocalLength = sceneWidthForDetail > 0 ? (sensorWidth * area.designDistance) / sceneWidthForDetail : 0;
      const currentFocalLength = viewingAngleRad > 0 && viewingAngleRad < Math.PI ? sensorWidth / (2 * Math.tan(viewingAngleRad / 2)) : 0;
      
      return {
        areaId: area.id,
        areaName: area.name,
        requiredCameras: area.requiredCameras,
        coverageType: coverageTypeInfo?.label || 'Detailed Observation',
        pixelDensity: pixelDensity,
        viewDiameter: groundFoVWidth.toFixed(2), // Width of FoV at mount height distance
        maxDistance: maxDistanceForDetail.toFixed(2), // Max distance for target pixel density
        viewingAngle: area.cameraViewingAngle,
        mountHeight: area.mountHeight,
        designDistance: area.designDistance,
        sceneWidthAtDistance,
        achievedPixelDensity,
        meetsDensity: achievedPixelDensity >= pixelDensity,
        requiredHFoVDeg,
        requiredFocalLength,
        currentFocalLength,
        sceneWidthForDetail,
        sceneHeightForDetail: cameraHeightPixels / pixelDensity,
        idealArea: (cameraWidthPixels / pixelDensity) * (cameraHeightPixels / pixelDensity),
        usableFraction: Math.max(0.05, (1 - area.obstaclePercentage / 100) * (1 - overlapPercentage / 100)),
        areaToMonitor: area.length * area.width
      };
    });
    setCameraDetails(details);
    
    onResults?.(
      { resolution: selectedResolution, sensorFormat, overlapPercent: overlapPercentage, areas: updatedAreas.map(a => ({ name: a.name, lengthM: a.length, widthM: a.width, detailLevel: a.coverageType, obstructionPercent: a.obstaclePercentage, mountHeightM: a.mountHeight, horizontalFoVDeg: a.cameraViewingAngle, designDistanceM: a.designDistance })) },
      {
        totalCameras: updatedAreas.reduce((sum, a) => sum + a.requiredCameras, 0),
        areas: details.map(d => ({ area: d.areaName, level: d.coverageType, requiredPxPerM: d.pixelDensity, cameras: d.requiredCameras, maxDistanceM: d.maxDistance, achievedPxPerMAtDesignDistance: d.achievedPixelDensity.toFixed(0), meetsRequirement: d.meetsDensity ? 'Yes' : 'No', requiredHFoVDeg: d.requiredHFoVDeg.toFixed(1), requiredFocalLengthMm: d.requiredFocalLength.toFixed(1) }))
      }
    );
    
  }, [areas, selectedResolution, overlapPercentage, sensorFormat]);

  const addArea = () => {
    const newId = `${Date.now()}`;
    setAreas(prev => [
      ...prev,
      {
        id: newId,
        name: `Area ${areas.length + 1}`,
        length: 10,
        width: 5,
        coverageType: 'general',
        obstaclePercentage: 10,
        mountHeight: 3,
        cameraViewingAngle: 90,
        designDistance: 10,
        requiredCameras: 0
      }
    ]);
  };

  const removeArea = (id: string) => {
    if (areas.length > 1) {
      setAreas(prev => prev.filter(area => area.id !== id));
    }
  };

  const updateArea = (id: string, field: keyof Area, value: any) => {
    setAreas(prev => prev.map(area => 
      area.id === id ? { ...area, [field]: value } : area
    ));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Camera Specifications</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Camera Resolution
          </label>
          <select
            value={selectedResolution}
            onChange={(e) => setSelectedResolution(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {resolutionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Higher resolution provides better detail at distance</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sensor Format
          </label>
          <select
            value={sensorFormat}
            onChange={(e) => setSensorFormat(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {SENSOR_FORMATS.map(format => (
              <option key={format.value} value={format.value}>{format.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Used to convert the field of view to a lens focal length (check the camera datasheet).</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            View Overlap Between Cameras (%)
          </label>
          <input
            type="number"
            min="0"
            max="50"
            value={overlapPercentage}
            onChange={(e) => setOverlapPercentage(Math.min(50, Math.max(0, Number(e.target.value))))}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Overlap avoids blind spots between adjacent fields of view (10–20% typical).</p>
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        {/* AREA CONFIGURATION SECTION */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Areas to Monitor</h3>
            <button
              onClick={addArea}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Area
            </button>
          </div>
          
          {areas.map((area) => (
            <div key={area.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">{area.name}</h4>
                {areas.length > 1 && (
                  <button 
                    onClick={() => removeArea(area.id)} 
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {editingAreaId === area.id ? (
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
                    <input
                      type="text"
                      value={area.name}
                      onChange={(e) => updateArea(area.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Area name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                      <input
                        type="number"
                        min="0.1" step="0.1"
                        value={area.length}
                        onChange={(e) => updateArea(area.id, 'length', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Width (m)</label>
                      <input
                        type="number"
                        min="0.1" step="0.1"
                        value={area.width}
                        onChange={(e) => updateArea(area.id, 'width', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Required Detail Level</label>
                    <select
                      value={area.coverageType}
                      onChange={(e) => updateArea(area.id, 'coverageType', e.target.value as Area['coverageType'])}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {COVERAGE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label} ({type.pixelDensity} px/m)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">View Obstruction (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="90" // Obstacles shouldn't be 100%
                        value={area.obstaclePercentage}
                        onChange={(e) => updateArea(area.id, 'obstaclePercentage', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Area obstructed by furniture, walls, etc.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mount Height (m)</label>
                      <input
                        type="number"
                        min="0.5"
                        max="20" // Increased max mount height
                        step="0.1"
                        value={area.mountHeight}
                        onChange={(e) => updateArea(area.id, 'mountHeight', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Camera Horiz. Viewing Angle (°)</label>
                    <input
                      type="number"
                      min="10" // Min angle practical limit
                      max="180" // Max for fisheye, typical up to 120
                      value={area.cameraViewingAngle}
                      onChange={(e) => updateArea(area.id, 'cameraViewingAngle', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Horizontal field of view of the camera lens</p>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Design Distance to Target (m)</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={area.designDistance}
                      onChange={(e) => updateArea(area.id, 'designDistance', Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Distance from the camera to the target (use the slant distance for elevated cameras). Used for the lens check.</p>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={() => setEditingAreaId(null)} 
                      className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Dimensions:</p>
                      <p className="font-semibold text-gray-800">{area.length}m × {area.width}m</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Detail Level:</p>
                      <p className="font-semibold text-gray-800">
                        {COVERAGE_TYPES.find(c => c.value === area.coverageType)?.label.split(' (')[0] || 'General'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Obstacles:</p>
                      <p className="font-semibold text-gray-800">{area.obstaclePercentage}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Mount Height:</p>
                      <p className="font-semibold text-gray-800">{area.mountHeight.toFixed(1)}m</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Viewing Angle:</p>
                      <p className="font-semibold text-gray-800">{area.cameraViewingAngle}°</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Cameras Est.:</p>
                      <p className="font-bold text-blue-700">{area.requiredCameras}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setEditingAreaId(area.id)} 
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"
                    >
                      <Icons.Edit />
                      <span className="ml-1">Edit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-base text-gray-700">Total Cameras Required (Est.)</h4>
              <div className="mt-2">
                <p className="font-bold text-2xl text-blue-600">{totalCameras}</p>
                <p className="text-sm text-gray-600">Across {areas.length} area{areas.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-base text-gray-700">Selected Camera Resolution</h4>
              <div className="mt-2">
                <p className="font-bold text-2xl text-green-600">
                  {resolutionOptions.find(r => r.value === selectedResolution)?.label.split(' (')[0] || selectedResolution}
                </p>
                <p className="text-sm text-gray-600">
                  {resolutionOptions.find(r => r.value === selectedResolution)?.width || ''}×
                  {resolutionOptions.find(r => r.value === selectedResolution)?.height || ''} pixels
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <h4 className="font-medium mb-3 text-blue-700">Step-by-Step Calculation</h4>
        <div className="bg-white p-4 rounded-md shadow mb-6">
          {cameraDetails.map((d) => (
            <div key={d.areaId} className="mb-4 pb-3 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
              <p className="font-medium text-gray-800 mb-1">{d.areaName}</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
                <li>Required pixel density ({d.coverageType.split(' (')[0]}, IEC 62676-4): <span className="font-semibold">{d.pixelDensity} px/m</span>.</li>
                <li>Scene covered by one camera = {RESOLUTION_PIXELS(selectedResolution).width} ÷ {d.pixelDensity} × {RESOLUTION_PIXELS(selectedResolution).height} ÷ {d.pixelDensity} = {d.sceneWidthForDetail.toFixed(2)} m × {d.sceneHeightForDetail.toFixed(2)} m = {d.idealArea.toFixed(1)} m².</li>
                <li>Usable fraction = (1 − obstruction) × (1 − overlap) = {d.usableFraction.toFixed(3)}; effective area per camera = {(d.idealArea * d.usableFraction).toFixed(1)} m².</li>
                <li>Cameras = ⌈{d.areaToMonitor.toFixed(1)} m² ÷ {(d.idealArea * d.usableFraction).toFixed(1)} m²⌉ = <span className="font-semibold">{d.requiredCameras}</span>.</li>
                <li>
                  Lens check at {d.designDistance} m: scene width = 2 × {d.designDistance} × tan({d.viewingAngle}° ÷ 2) = {d.sceneWidthAtDistance.toFixed(2)} m, so the density is {RESOLUTION_PIXELS(selectedResolution).width} ÷ {d.sceneWidthAtDistance.toFixed(2)} = <span className={`font-semibold ${d.meetsDensity ? 'text-green-600' : 'text-red-600'}`}>{d.achievedPixelDensity.toFixed(0)} px/m ({d.meetsDensity ? 'meets' : 'does not meet'} {d.pixelDensity} px/m)</span>.
                </li>
                <li>Required horizontal FoV = 2 × atan({d.sceneWidthForDetail.toFixed(2)} ÷ (2 × {d.designDistance})) = {d.requiredHFoVDeg.toFixed(1)}°; focal length = sensor width × distance ÷ scene width = <span className="font-semibold">{d.requiredFocalLength.toFixed(1)} mm</span> (current lens ≈ {d.currentFocalLength.toFixed(1)} mm).</li>
              </ol>
            </div>
          ))}
        </div>

        <h4 className="font-medium mb-3 text-blue-700">Detailed Camera Requirements (Estimates)</h4>
        <div className="overflow-x-auto bg-white rounded-md shadow mb-6">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage Level</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cameras</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max Dist. (Detail)</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">px/m at Design Dist.</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Req. FoV / Focal Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cameraDetails.map((detail) => (
                <tr key={detail.areaId}>
                  <td className="px-4 py-2 text-sm text-gray-900">{detail.areaName}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center">{detail.coverageType.split(' (')[0]}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center font-medium">{detail.requiredCameras}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{detail.maxDistance}m</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{detail.achievedPixelDensity.toFixed(0)} / {detail.pixelDensity}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detail.meetsDensity ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {detail.meetsDensity ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{detail.requiredHFoVDeg.toFixed(0)}° / {detail.requiredFocalLength.toFixed(1)} mm</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-center">-</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-center">{totalCameras}</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">-</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">-</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-center">-</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">-</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <h4 className="font-medium mb-3 text-blue-700">Coverage Guidelines</h4>
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage Level</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pixel Density</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {COVERAGE_TYPES.map((type) => (
                  <tr key={type.value}>
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{type.label}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-center">{type.pixelDensity} px/m</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {type.value === 'general' && 'Monitor presence, basic movement detection'}
                      {type.value === 'detailed' && 'Detect if person is present, object classification'}
                      {type.value === 'recognition' && 'Recognize known individuals, license plate reading (LPR requires higher px/m typically)'}
                      {type.value === 'identification' && 'Identify unknown individuals, facial details'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Camera Coverage Notes</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Pixel densities are the DORI values of IEC 62676-4: Detection 25, Observation 62, Recognition 125 and Identification 250 pixels per metre on the target.</li>
            <li>Max Distance (Detail) = (horizontal pixels ÷ required px/m) ÷ (2 · tan(horizontal FoV ÷ 2)): the furthest distance at which the lens and sensor still deliver the required pixel density.</li>
            <li>Lens check: scene width at the design distance = 2 · D · tan(HFoV ÷ 2); achieved density = horizontal pixels ÷ scene width; focal length = sensor width · D ÷ required scene width (pinhole model, nominal sensor widths).</li>
            <li>Cameras Estimated is a rough guide; actual count depends on precise placement, lens focal length, scene complexity, and desired overlap.</li>
            <li>Cameras per area = area ÷ [ (H pixels ÷ ppm) × (V pixels ÷ ppm) × (1 − obstruction) × (1 − overlap) ]. Obstructions and overlap reduce the useful area per camera, so they increase the number of cameras.</li>
            <li>Higher camera mounting provides wider overview but can reduce detail if lens is fixed; consider varifocal or PTZ for flexibility.</li>
            <li>Pixel density is measured on a target facing the camera; at steep or oblique angles it falls, so check the far edge of each view and keep the vertical angle within the lens specification.</li>
            <li>This calculator provides a guideline; actual camera placement should be validated with site assessments, specific lens calculators, and potentially simulation software.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ======================== POWER CONSUMPTION CALCULATOR ========================

interface PowerConsumptionCalculatorProps {
  onShowTutorial?: () => void;
  onResults?: ResultsHandler;
}

interface DeviceConfig {
  id: string;
  name: string;
  deviceType: string;
  powerConsumption: number; // Watts
  customPowerConsumption: boolean;
  quantity: number;
  poePowered: boolean;
  poeStandard: string;
  totalWatts: number; // Calculated
}

const DEVICE_TYPES = [
  { value: 'fixedCamera', label: 'Fixed IP Camera', watts: 5 },
  { value: 'ptzCamera', label: 'PTZ IP Camera', watts: 20 }, // Increased typical for PTZ
  { value: 'domeCamera', label: 'Dome IP Camera', watts: 7 },
  { value: 'bulletCamera', label: 'Bullet IP Camera', watts: 12 }, // Added Bullet
  { value: 'fisheyeCamera', label: 'Fisheye IP Camera', watts: 12 }, // Added Fisheye
  { value: 'thermalCamera', label: 'Thermal Camera', watts: 12 },
  { value: 'encoder', label: 'Video Encoder (1-4ch)', watts: 10 }, // Added Encoder
  { value: 'decoder', label: 'Video Decoder (1-4ch)', watts: 15 }, // Added Decoder
  { value: 'nvr', label: 'NVR (4-16 channel)', watts: 25 }, // Adjusted NVR power (without HDD)
  { value: 'nvr_hdd', label: 'NVR HDD (per drive)', watts: 8 }, // Added HDD power
  { value: 'server_recorder', label: 'Recording Server (High Perf)', watts: 250 }, // Added Server
  { value: 'workstation', label: 'Monitoring Workstation', watts: 120 }, // Adjusted Workstation
  { value: 'lcd_small', label: 'LCD Monitor (19-24")', watts: 25 }, // Adjusted Monitor
  { value: 'lcd_large', label: 'LCD Monitor (27-32")', watts: 40 }, // Added Large Monitor
  { value: 'video_wall_ctrl', label: 'Video Wall Controller', watts: 300 }, // Added Video Wall Ctrl
  { value: 'poeSwitch_self', label: 'PoE Switch (Self-Consumption)', watts: 20}, // Clarified PoE switch self-consumption
  { value: 'ir_illuminator', label: 'IR Illuminator (External)', watts: 15 }, // Added IR
  { value: 'network_switch_nonpoe', label: 'Network Switch (Non-PoE)', watts: 10 }, // Added Non-PoE Switch
  { value: 'router_firewall', label: 'Router/Firewall', watts: 20 }, // Added Router
  { value: 'other', label: 'Other Device', watts: 20 }
];

const POE_STANDARDS = [
  { value: 'poe', label: 'PoE (802.3af Type 1)', watts: 15.4, delivered: 12.95 }, // Max power at PSE, delivered at PD
  { value: 'poePlus', label: 'PoE+ (802.3at Type 2)', watts: 30, delivered: 25.5 },
  { value: 'poeType3', label: 'PoE++ (802.3bt Type 3)', watts: 60, delivered: 51 },
  { value: 'poeType4', label: 'PoE++ (802.3bt Type 4)', watts: 90, delivered: 71.3 } // IEEE 802.3bt: 90 W at the PSE, 71.3 W at the PD
];


// Ratio of power drawn at the PSE (switch) to power delivered at the PD (device), including cable loss.
// IEEE 802.3 specifies the PSE and PD power at the maximum 100 m of cable; shorter cables lose proportionally less.
const poeCableLossFactor = (standardValue: string, lengthM: number): number => {
  const std = POE_STANDARDS.find(x => x.value === standardValue);
  if (!std) return 1;
  const ratioAt100m = std.watts / std.delivered;
  return 1 + (ratioAt100m - 1) * (Math.min(Math.max(lengthM, 0), 100) / 100);
};

// Standard UPS apparent-power ratings (VA)
const UPS_STANDARD_VA = [500, 750, 1000, 1500, 2000, 3000, 5000, 6000, 8000, 10000, 15000, 20000, 30000, 40000, 60000, 80000, 100000];
const UPS_BATTERY_DOD = 0.8; // usable depth of discharge
const UPS_BATTERY_AGEING = 1.25; // end-of-life ageing factor (IEEE 485, VRLA batteries)

const PowerConsumptionCalculator: React.FC<PowerConsumptionCalculatorProps> = ({ onShowTutorial, onResults }) => {
  const [devices, setDevices] = useState<DeviceConfig[]>([
    {
      id: '1',
      name: 'Fixed Cameras',
      deviceType: 'fixedCamera',
      powerConsumption: DEVICE_TYPES.find(d=>d.value === 'fixedCamera')?.watts || 5,
      customPowerConsumption: false,
      quantity: 10,
      poePowered: true,
      poeStandard: 'poe',
      totalWatts: (DEVICE_TYPES.find(d=>d.value === 'fixedCamera')?.watts || 5) * 10
    },
    {
      id: '2',
      name: 'NVR System (16ch)',
      deviceType: 'nvr',
      powerConsumption: DEVICE_TYPES.find(d=>d.value === 'nvr')?.watts || 25,
      customPowerConsumption: false,
      quantity: 1,
      poePowered: false,
      poeStandard: 'poe', 
      totalWatts: DEVICE_TYPES.find(d=>d.value === 'nvr')?.watts || 25
    },
    {
      id: '3',
      name: 'NVR HDDs (4x)',
      deviceType: 'nvr_hdd',
      powerConsumption: DEVICE_TYPES.find(d=>d.value === 'nvr_hdd')?.watts || 8,
      customPowerConsumption: false,
      quantity: 4,
      poePowered: false,
      poeStandard: 'poe',
      totalWatts: (DEVICE_TYPES.find(d=>d.value === 'nvr_hdd')?.watts || 8) * 4
    }
  ]);
  
  const [backupTime, setBackupTime] = useState<number>(30); 
  const [loadPowerFactor, setLoadPowerFactor] = useState<number>(0.9); // power factor of the connected load
  const [inverterEfficiency, setInverterEfficiency] = useState<number>(90); // UPS efficiency on battery (%)
  const [designMargin, setDesignMargin] = useState<number>(20); // growth / design margin on the load (%)
  const [poeCableLength, setPoeCableLength] = useState<number>(50); // average PoE cable run (m)
  const [poeSwitchBudget, setPoeSwitchBudget] = useState<number>(370); // total PoE power budget of the switch(es) (W)
  const [totalPsePower, setTotalPsePower] = useState<number>(0); // PoE power drawn at the switch incl. cable loss (W)
  
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  
  const [totalPower, setTotalPower] = useState<number>(0); 
  const [totalPoePower, setTotalPoePower] = useState<number>(0); 
  const [totalNonPoePower, setTotalNonPoePower] = useState<number>(0); 
  const [upsRequirements, setUpsRequirements] = useState<{capacity: number, recommendation: string, loadWatts: number, designWatts: number, requiredVA: number, batteryWh: number}>({ capacity: 0, recommendation: '', loadWatts: 0, designWatts: 0, requiredVA: 0, batteryWh: 0 });
  
  useEffect(() => {
    const updatedDevices = devices.map(device => ({
      ...device,
      totalWatts: device.powerConsumption * device.quantity
    }));

    // Avoid state update if objects are structurally identical, to prevent infinite loops with 'devices' in dependency array.
    // This check is shallow; deep comparison might be needed if nested objects change without identity change.
    // For this structure, it should be okay as long as setDevices always creates new array/object identities.
    if (JSON.stringify(devices) !== JSON.stringify(updatedDevices)) {
       // setDevices(updatedDevices); // This line will cause an infinite loop because devices is in the dependency array.
                                     // The calculation should be done based on the current 'devices' state directly or 
                                     // the state update for 'devices' should be done outside this useEffect (e.g. in updateDevice).
                                     // For now, we will calculate based on `updatedDevices` which reflects the current `devices` state with recalculations.
    }

    const currentTotalPower = updatedDevices.reduce((sum, device) => sum + device.totalWatts, 0);
    setTotalPower(currentTotalPower);
    
    const currentPoePower = updatedDevices.reduce((sum, device) => 
      sum + (device.poePowered ? device.totalWatts : 0), 0);
    setTotalPoePower(currentPoePower);
    
    const currentNonPoePower = updatedDevices.reduce((sum, device) => 
      sum + (!device.poePowered ? device.totalWatts : 0), 0);
    setTotalNonPoePower(currentNonPoePower);
    
    // PoE power drawn at the switch (PSE) = device power plus cable loss
    const currentPsePower = updatedDevices.reduce((sum, device) =>
      sum + (device.poePowered ? device.totalWatts * poeCableLossFactor(device.poeStandard, poeCableLength) : 0), 0);
    setTotalPsePower(currentPsePower);
    
    // UPS sizing (IEC 62040-3 ratings, IEEE 485 battery sizing practice)
    // PoE cameras are fed from the PoE switch, which is itself on the UPS, so the UPS carries the
    // non-PoE devices plus the PoE power drawn at the switch (device power + cable loss).
    const loadForUpsInWatts = currentNonPoePower + currentPsePower;
    const designWatts = loadForUpsInWatts * (1 + designMargin / 100);
    // Apparent power the UPS must deliver: VA = W / PF
    const requiredVA = loadPowerFactor > 0 ? designWatts / loadPowerFactor : 0;
    // Select the next standard UPS rating
    const standardRating = UPS_STANDARD_VA.find(rating => rating >= requiredVA);
    const upsCapacityRounded = requiredVA <= 0 ? 0 : (standardRating ?? Math.ceil(requiredVA / 1000) * 1000);
    
    // Battery energy for the required autonomy:
    // E = P * t / (inverter efficiency * depth of discharge) * ageing factor
    const batteryWh = inverterEfficiency > 0
      ? (designWatts * (backupTime / 60)) / ((inverterEfficiency / 100) * UPS_BATTERY_DOD) * UPS_BATTERY_AGEING
      : 0;
    
    let upsRecommendation = '';
    if (loadForUpsInWatts <= 0) {
        upsRecommendation = 'No load for UPS.';
    } else if (upsCapacityRounded <= 750) {
      upsRecommendation = 'Small line-interactive UPS (tower / rack, up to 750VA)';
    } else if (upsCapacityRounded <= 1500) {
      upsRecommendation = 'Medium line-interactive UPS (1000-1500VA)';
    } else if (upsCapacityRounded <= 3000) {
      upsRecommendation = 'Large online double-conversion UPS (2000-3000VA)';
    } else {
      upsRecommendation = 'High-capacity online UPS (>3000VA), consider N+1 modules';
    }
    
    setUpsRequirements({
      capacity: upsCapacityRounded,
      recommendation: upsRecommendation,
      loadWatts: loadForUpsInWatts,
      designWatts,
      requiredVA,
      batteryWh
    });
    
    onResults?.(
      {
        backupTimeMin: backupTime, loadPowerFactor, upsEfficiencyPercent: inverterEfficiency, designMarginPercent: designMargin,
        poeCableLengthM: poeCableLength, poeSwitchBudgetW: poeSwitchBudget,
        devices: updatedDevices.map(d => ({ name: d.name, type: d.deviceType, powerW: d.powerConsumption, quantity: d.quantity, poe: d.poePowered, poeStandard: d.poePowered ? d.poeStandard : '' }))
      },
      {
        totalDevicePowerW: currentTotalPower.toFixed(1),
        poePowerAtDevicesW: currentPoePower.toFixed(1),
        poePowerAtSwitchW: currentPsePower.toFixed(1),
        nonPoePowerW: currentNonPoePower.toFixed(1),
        poeBudgetCheck: poeSwitchBudget > 0 ? (currentPsePower <= poeSwitchBudget ? 'Pass' : 'Fail') : 'Not set',
        upsLoadW: loadForUpsInWatts.toFixed(1),
        upsDesignLoadW: designWatts.toFixed(1),
        upsRequiredVA: requiredVA.toFixed(0),
        upsStandardRatingVA: upsCapacityRounded,
        batteryEnergyWh: batteryWh.toFixed(0)
      }
    );
    
  }, [devices, loadPowerFactor, inverterEfficiency, designMargin, backupTime, poeCableLength, poeSwitchBudget]);

  const addDevice = () => {
    const newId = (devices.length + Date.now()).toString(); // More unique ID
    const defaultDeviceType = DEVICE_TYPES[0]; 
    
    setDevices(prevDevices => [
      ...prevDevices,
      {
        id: newId,
        name: `New Device ${prevDevices.length + 1}`,
        deviceType: defaultDeviceType.value,
        powerConsumption: defaultDeviceType.watts,
        customPowerConsumption: false,
        quantity: 1,
        poePowered: defaultDeviceType.value.toLowerCase().includes('camera'), 
        poeStandard: 'poe',
        totalWatts: defaultDeviceType.watts 
      }
    ]);
  };

  const removeDevice = (id: string) => {
    setDevices(prevDevices => prevDevices.filter(device => device.id !== id));
  };

  const updateDevice = (id: string, field: keyof DeviceConfig, value: any) => {
    setDevices(prevDevices => prevDevices.map(device => {
      if (device.id === id) {
        let updatedDevice = { ...device, [field]: value };
        
        if (field === 'deviceType' && !updatedDevice.customPowerConsumption) {
          const selectedType = DEVICE_TYPES.find(t => t.value === value);
          updatedDevice.powerConsumption = selectedType ? selectedType.watts : 0;
        }
        
        if (field === 'customPowerConsumption' && value === false) {
          const selectedType = DEVICE_TYPES.find(t => t.value === updatedDevice.deviceType);
          updatedDevice.powerConsumption = selectedType ? selectedType.watts : 0;
        }
        
        updatedDevice.totalWatts = updatedDevice.powerConsumption * updatedDevice.quantity;
        return updatedDevice;
      }
      return device;
    }));
  };

  const checkPoeCapacityIssues = () => {
    return devices.filter(device => {
      if (!device.poePowered) return false;
      const standard = POE_STANDARDS.find(std => std.value === device.poeStandard);
      // Check against delivered power if available, otherwise standard PSE power
      const maxPowerPerPort = standard ? (standard.delivered || standard.watts) : 0;
      return standard && device.powerConsumption > maxPowerPerPort;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Power Configuration</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="backupTime" className="block text-sm font-medium text-gray-700 mb-1">
              Desired Backup Time (minutes)
            </label>
            <input
              id="backupTime"
              type="number"
              min="5"
              max="480" 
              value={backupTime}
              onChange={(e) => setBackupTime(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Autonomy of the UPS at the design load. Sets the battery energy.</p>
          </div>
          <div>
            <label htmlFor="loadPowerFactor" className="block text-sm font-medium text-gray-700 mb-1">
              Load Power Factor
            </label>
            <input
              id="loadPowerFactor"
              type="number"
              min="0.5"
              max="1"
              step="0.05"
              value={loadPowerFactor}
              onChange={(e) => setLoadPowerFactor(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Typically 0.9 for IT loads with power-factor correction. Used for VA = W / PF.</p>
          </div>
          <div>
            <label htmlFor="inverterEfficiency" className="block text-sm font-medium text-gray-700 mb-1">
              UPS Efficiency on Battery (%)
            </label>
            <input
              id="inverterEfficiency"
              type="number"
              min="50"
              max="100"
              value={inverterEfficiency}
              onChange={(e) => setInverterEfficiency(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used for the battery energy only (not for the VA rating).</p>
          </div>
          <div>
            <label htmlFor="designMargin" className="block text-sm font-medium text-gray-700 mb-1">
              Design Margin (%)
            </label>
            <input
              id="designMargin"
              type="number"
              min="0"
              max="100"
              value={designMargin}
              onChange={(e) => setDesignMargin(Math.max(0, Number(e.target.value)))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Growth and loading margin on the connected load (a UPS is normally loaded to ≤ 80%).</p>
          </div>
          <div>
            <label htmlFor="poeCableLength" className="block text-sm font-medium text-gray-700 mb-1">
              Average PoE Cable Length (m)
            </label>
            <input
              id="poeCableLength"
              type="number"
              min="1"
              max="100"
              value={poeCableLength}
              onChange={(e) => setPoeCableLength(Math.max(0, Number(e.target.value)))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Channel limit is 100 m (ISO/IEC 11801, TIA-568). Longer runs lose more power in the cable.</p>
          </div>
          <div>
            <label htmlFor="poeSwitchBudget" className="block text-sm font-medium text-gray-700 mb-1">
              PoE Switch Power Budget (W)
            </label>
            <input
              id="poeSwitchBudget"
              type="number"
              min="0"
              value={poeSwitchBudget}
              onChange={(e) => setPoeSwitchBudget(Math.max(0, Number(e.target.value)))}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Total PoE budget of the switch(es) from the datasheet. Enter 0 to skip the check.</p>
          </div>
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Device Configuration</h3>
            <button
              onClick={addDevice}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Device
            </button>
          </div>
          
          {devices.map((device) => (
            <div key={device.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">{device.name}</h4>
                  <button 
                    onClick={() => removeDevice(device.id)} 
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
              </div>
              
              {editingDeviceId === device.id ? (
                <div className="pl-3 border-l-4 border-blue-400">
                  <div className="mb-3">
                    <label htmlFor={`device-name-${device.id}`} className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                    <input
                      id={`device-name-${device.id}`}
                      type="text"
                      value={device.name}
                      onChange={(e) => updateDevice(device.id, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Device name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor={`device-type-${device.id}`} className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                      <select
                        id={`device-type-${device.id}`}
                        value={device.deviceType}
                        onChange={(e) => updateDevice(device.id, 'deviceType', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {DEVICE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label} ({type.watts}W)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`device-quantity-${device.id}`} className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        id={`device-quantity-${device.id}`}
                        type="number"
                        min="1"
                        value={device.quantity}
                        onChange={(e) => updateDevice(device.id, 'quantity', Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`custom-power-${device.id}`}
                        checked={device.customPowerConsumption}
                        onChange={(e) => updateDevice(device.id, 'customPowerConsumption', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`custom-power-${device.id}`} className="ml-2 block text-sm text-gray-700">
                        Specify Custom Power Consumption
                      </label>
                    </div>
                    
                    {device.customPowerConsumption && (
                      <div className="pl-6">
                        <label htmlFor={`power-consumption-${device.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Power Consumption (Watts per unit)
                        </label>
                        <input
                          id={`power-consumption-${device.id}`}
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={device.powerConsumption}
                          onChange={(e) => updateDevice(device.id, 'powerConsumption', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`poe-powered-${device.id}`}
                        checked={device.poePowered}
                        onChange={(e) => updateDevice(device.id, 'poePowered', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`poe-powered-${device.id}`} className="ml-2 block text-sm text-gray-700">
                        PoE Powered Device
                      </label>
                    </div>
                    
                    {device.poePowered && (
                      <div className="pl-6">
                        <label htmlFor={`poe-standard-${device.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          PoE Standard
                        </label>
                        <select
                          id={`poe-standard-${device.id}`}
                          value={device.poeStandard}
                          onChange={(e) => updateDevice(device.id, 'poeStandard', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          {POE_STANDARDS.map(std => (
                            <option key={std.value} value={std.value}>
                              {std.label} (max {std.delivered || std.watts}W at PD)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={() => setEditingDeviceId(null)} 
                      className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600">Device Type:</p>
                      <p className="font-semibold text-gray-800">
                        {DEVICE_TYPES.find(t => t.value === device.deviceType)?.label || device.deviceType}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Power/Unit:</p>
                      <p className="font-semibold text-gray-800">{device.powerConsumption.toFixed(1)}W</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Quantity:</p>
                      <p className="font-semibold text-gray-800">{device.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">PoE Powered:</p>
                      <p className="font-semibold text-gray-800">{device.poePowered ? 'Yes' : 'No'}</p>
                    </div>
                    {device.poePowered && (
                      <div>
                        <p className="text-gray-600">PoE Standard:</p>
                        <p className="font-semibold text-gray-800">
                          {POE_STANDARDS.find(s => s.value === device.poeStandard)?.label.split(' (')[0] || device.poeStandard}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600">Total Power:</p>
                      <p className="font-bold text-blue-700">{device.totalWatts.toFixed(1)}W</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setEditingDeviceId(device.id)} 
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center"
                    >
                      <Icons.Edit />
                      <span className="ml-1">Edit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
        
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-base text-gray-700">Total Power Consumption</h4>
              <div className="mt-2">
                <p className="font-bold text-2xl text-blue-600">{totalPower.toFixed(1)} Watts</p>
                <p className="text-sm text-gray-600">{(totalPower / 1000).toFixed(2)} kW</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-base text-gray-700">Power Distribution</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <p className="text-sm text-gray-600">PoE Devices:</p>
                  <p className="font-semibold text-gray-800">{totalPoePower.toFixed(1)} Watts</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Non-PoE Devices:</p>
                  <p className="font-semibold text-gray-800">{totalNonPoePower.toFixed(1)} Watts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-md border shadow mb-6 ${poeSwitchBudget <= 0 ? 'bg-white border-gray-200' : totalPsePower <= poeSwitchBudget ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-300'}`}>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-base text-gray-800">PoE Switch Budget</h4>
            {poeSwitchBudget > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalPsePower <= poeSwitchBudget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {totalPsePower <= poeSwitchBudget ? 'PASS' : 'FAIL'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-700">
            <div>At devices: <span className="font-semibold">{totalPoePower.toFixed(1)} W</span></div>
            <div>At switch (incl. {poeCableLength} m cable loss): <span className="font-semibold">{totalPsePower.toFixed(1)} W</span></div>
            <div>Switch budget: <span className="font-semibold">{poeSwitchBudget > 0 ? `${poeSwitchBudget} W` : 'not set'}</span></div>
          </div>
          {poeCableLength > 100 && (
            <p className="text-xs text-red-600 mt-2">The PoE cable length exceeds the 100 m channel limit.</p>
          )}
        </div>

        <div className="bg-green-50 p-4 rounded-md border border-green-200 shadow mb-6">
          <h4 className="font-medium text-base text-green-800 mb-2">UPS Requirements (for {upsRequirements.loadWatts.toFixed(0)}W total load, including PoE devices)</h4>
          <p className="font-bold text-xl text-green-700">{upsRequirements.capacity > 0 ? `${upsRequirements.capacity} VA` : "N/A"} (Standard rating)</p>
          <p className="text-sm text-green-600 mt-1">Recommended UPS Category: {upsRequirements.recommendation}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-sm text-green-700">
            <div>Design load: <span className="font-semibold">{upsRequirements.designWatts.toFixed(0)} W</span></div>
            <div>Required apparent power: <span className="font-semibold">{upsRequirements.requiredVA.toFixed(0)} VA</span></div>
            <div>Battery energy for {backupTime} min: <span className="font-semibold">{upsRequirements.batteryWh.toFixed(0)} Wh</span></div>
          </div>
          <p className="text-xs text-green-600 mt-2">Battery energy = design load × time ÷ (efficiency × {UPS_BATTERY_DOD * 100}% depth of discharge) × {UPS_BATTERY_AGEING} ageing factor. Verify the runtime with the UPS manufacturer.</p>
        </div>
        
        <h4 className="font-medium mb-3 text-blue-700">Step-by-Step Calculation</h4>
        <div className="bg-white p-4 rounded-md shadow mb-6">
          <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
            <li>Total device power = Σ (power × quantity) = <span className="font-semibold">{totalPower.toFixed(1)} W</span> ({totalPoePower.toFixed(1)} W PoE + {totalNonPoePower.toFixed(1)} W non-PoE).</li>
            <li>PoE power at the switch = PoE device power × cable-loss factor ({totalPoePower > 0 ? (totalPsePower / totalPoePower).toFixed(3) : '1.000'} for {poeCableLength} m) = <span className="font-semibold">{totalPsePower.toFixed(1)} W</span>.</li>
            <li>UPS load = non-PoE {totalNonPoePower.toFixed(1)} W + PoE at switch {totalPsePower.toFixed(1)} W = <span className="font-semibold">{upsRequirements.loadWatts.toFixed(1)} W</span>.</li>
            <li>Design load = {upsRequirements.loadWatts.toFixed(1)} × (1 + {designMargin}%) = <span className="font-semibold">{upsRequirements.designWatts.toFixed(1)} W</span>.</li>
            <li>Apparent power = {upsRequirements.designWatts.toFixed(1)} W ÷ {loadPowerFactor} = {upsRequirements.requiredVA.toFixed(0)} VA, rounded up to the standard rating <span className="font-semibold">{upsRequirements.capacity} VA</span>.</li>
            <li>Battery energy = {upsRequirements.designWatts.toFixed(1)} W × {(backupTime / 60).toFixed(2)} h ÷ ({(inverterEfficiency / 100).toFixed(2)} × {UPS_BATTERY_DOD}) × {UPS_BATTERY_AGEING} = <span className="font-semibold">{upsRequirements.batteryWh.toFixed(0)} Wh</span>.</li>
          </ol>
        </div>

        <h4 className="font-medium mb-3 text-blue-700">Power Distribution Breakdown</h4>
        <div className="overflow-x-auto bg-white rounded-md shadow mb-6">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit (W)</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (W)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 truncate" title={device.name}>{device.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center">{device.quantity}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{device.powerConsumption.toFixed(1)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{device.totalWatts.toFixed(1)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center">
                    {device.poePowered ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {POE_STANDARDS.find(s => s.value === device.poeStandard)?.label.split(' ')[0] || ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        AC
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {devices.length > 0 && (
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center">
                    {devices.reduce((sum, device) => sum + device.quantity, 0)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">-</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{totalPower.toFixed(1)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {checkPoeCapacityIssues().length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-300 shadow mb-6">
            <h4 className="font-medium text-base text-yellow-800 mb-2">PoE Power Considerations</h4>
            <p className="text-sm text-yellow-700 mb-2">The following devices' power needs are close to or exceed their selected PoE standard's delivered power per port:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700">
              {checkPoeCapacityIssues().map((device) => {
                const standard = POE_STANDARDS.find(std => std.value === device.poeStandard);
                return (
                  <li key={device.id}>
                    {device.name} (draws {device.powerConsumption.toFixed(1)}W) on {standard?.label.split(' (')[0]} (delivers ~{standard?.delivered || standard?.watts || 0}W).
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-yellow-700 mt-2">Recommendation: Ensure PoE switch port can supply required power. Consider cable length, quality, and temperature. If device power exceeds port capacity, use a higher PoE standard, a PoE injector, or local power supply.</p>
          </div>
        )}
        
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Power Calculation Notes</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>UPS rating: VA = (total load W × (1 + design margin)) ÷ power factor, rounded up to the next standard rating (IEC 62040-3). The battery energy uses the autonomy time, efficiency, depth of discharge and an ageing factor (IEEE 485).</li>
            <li>PoE devices are powered by PoE switches, which are fed from the UPS, so PoE load is included in the UPS load. Add PoE switch self-consumption as a device. Power at the PSE is higher than at the device because of cable loss (IEEE 802.3at/bt: 15.4 / 30 / 60 / 90 W at the PSE for 12.95 / 25.5 / 51 / 71.3 W at the PD).</li>
            <li>Device power consumptions are typical; use custom values or datasheets for accuracy. IR LEDs, PTZ motors, heaters can significantly increase camera power draw.</li>
            <li>For mission-critical systems, consider N+1 redundancy for power supplies and UPS.</li>
            <li>The PoE budget check compares the PoE power at the switch (device power plus cable loss, scaled linearly from the 100 m values of IEEE 802.3) with the switch's total budget. Each device is also checked against the power per port of its PoE standard.</li>
            <li>Cable runs (length, quality) affect PoE power delivery. Adhere to TIA/IEEE standards.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CCTVSystemCalculator;