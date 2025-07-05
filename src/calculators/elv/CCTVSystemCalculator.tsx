import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

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
  const [activeTab, setActiveTab] = useState<'storage' | 'bandwidth' | 'coverage' | 'power'>('storage');

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
        
        {/* Content Based on Active Tab */}
        {activeTab === 'storage' ? (
          <StorageCalculator onShowTutorial={onShowTutorial} />
        ) : activeTab === 'bandwidth' ? (
          <BandwidthCalculator onShowTutorial={onShowTutorial} />
        ) : activeTab === 'coverage' ? (
          <CoverageCalculator onShowTutorial={onShowTutorial} />
        ) : (
          <PowerConsumptionCalculator onShowTutorial={onShowTutorial} />
        )}
      </div>
    </div>
    </CalculatorWrapper>
  );
};

// ======================== STORAGE CALCULATOR ========================

interface StorageCalculatorProps {
  onShowTutorial?: () => void;
}

// Define interface for camera configurations
interface CameraConfig {
  id: string;
  name: string;
  resolution: string;
  frameRate: number;
  compressionType: string;
  recordingHours: number;
  motionDetection: boolean;
  motionPercentage: number;
  quantity: number;
  bitrate: number; // Calculated
  storageMB: number; // Calculated (MB per day per camera)
}

// Resolution options with respective bitrates (Mbps per camera)
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

const StorageCalculator: React.FC<StorageCalculatorProps> = ({ onShowTutorial }) => {
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
      // Get base bitrate from resolution
      const resolution = RESOLUTION_OPTIONS.find(r => r.value === camera.resolution);
      const baseBitrate = resolution ? resolution.baseBitrate : 3.0; // Default to 1080p if not found
      
      // Get compression multiplier
      const compression = COMPRESSION_OPTIONS.find(c => c.value === camera.compressionType);
      const compressionMultiplier = compression ? compression.multiplier : 1.0; // Default to H.264 if not found
      
      // Calculate adjusted bitrate based on frame rate (assume 30fps as reference)
      let adjustedBitrate = baseBitrate * compressionMultiplier;
      
      // Apply motion detection reduction if enabled
      if (camera.motionDetection) {
        // Reduce bitrate based on motion percentage (assuming percentage is how much time motion is detected)
        adjustedBitrate = adjustedBitrate * (camera.motionPercentage / 100);
      }
      
      // Calculate storage in MB per day for this camera
      // Formula: (bitrate_in_Mbps * 3600_seconds_per_hour * recording_hours_per_day) / 8_bits_per_byte = MegaBytes_per_day
      const storageMBPerDay = (adjustedBitrate * 3600 * camera.recordingHours) / 8;
      
      return {
        ...camera,
        bitrate: adjustedBitrate,
        storageMB: storageMBPerDay // This is now correctly MB per day per camera
      };
    });
    
    if (JSON.stringify(cameras) !== JSON.stringify(updatedCameras)) { 
        setCameras(updatedCameras);
    }
    
    // Calculate total storage required
    // totalMBPerDay sums the (storageMB_per_camera * quantity) for all camera groups
    const totalMBPerDayForAllCameras = updatedCameras.reduce((sum, camera) => sum + (camera.storageMB * camera.quantity), 0);
    // Convert total MB for the entire retention period to TB
    // (Total_MB_per_day * days) / (MB_per_GB * GB_per_TB) = TB
    // (Total_MB_per_day * days) / (1024 * 1024) = TB
    const rawStorageTB = (totalMBPerDayForAllCameras * retentionDays) / (1024 * 1024);
    setTotalRawStorage(rawStorageTB);
    
    // Calculate effective storage needed based on RAID type
    let effectiveStorageTB = rawStorageTB;
    setTotalEffectiveStorage(effectiveStorageTB);
    
    // Calculate required drives based on RAID type and selected drive size
    calculateRequiredDrives(rawStorageTB, raidType, selectedDriveSize, spareFactor);
    
    // Calculate total bandwidth
    const totalMbps = updatedCameras.reduce((sum, camera) => sum + (camera.bitrate * camera.quantity), 0);
    setTotalBandwidth(totalMbps);
    
    // Create storage breakdown by camera group
    const breakdown = updatedCameras.map(camera => {
      const dailyStorageForGroupMB = camera.storageMB * camera.quantity; // MB per day for this group
      const totalStorageForGroupTB = (dailyStorageForGroupMB * retentionDays) / (1024 * 1024); // TB for this group
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
    
    // Note: saveCalculation and prepareExportData handled by CalculatorWrapper
    
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
        raidDisks = dataDisks > 0 ? dataDisks + 1 : 0;
        usableCapacity = raidDisks > 0 ? (raidDisks - 1) * driveSize : 0;
        break;
      case 'raid6':
        // RAID 6: Need 2 extra drives for dual parity
        raidDisks = dataDisks > 0 ? dataDisks + 2 : 0;
        usableCapacity = raidDisks > 0 ? (raidDisks - 2) * driveSize : 0;
        break;
      default: // 'none' or any other value
        raidDisks = dataDisks;
        usableCapacity = dataDisks * driveSize;
    }
    
    // Total drive count (no additional spare drives, since spare is included in the storage calculation)
    const totalDrives = raidDisks;
    const totalCapacity = totalDrives * driveSize;
    
    setRequiredDrives({
      count: totalDrives,
      raidDrives: raidDisks,
      spareDrives: 0, // No separate spare drives, as spare is included in the storage capacity
      totalCapacity: totalCapacity,
      usableCapacity: usableCapacity
    });
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {/* Input Section */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-md">
        <h3 className="font-medium text-xl mb-4 text-gray-800">Storage Parameters</h3>
        
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
              Spare Drive Factor (%)
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
            <p className="text-xs text-gray-500 mt-1">Percentage of additional spare drives.</p>
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
            <h3 className="font-medium text-xl text-gray-800">Camera Configuration</h3>
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
      <div className="bg-blue-50 p-4 rounded-lg shadow-md">
        <h3 className="font-medium text-xl mb-4 text-gray-800">Storage Requirements</h3>
        
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
                  {/* item.dailyStorage is total MB/day for the group. Divide by 1024 for GB. */}
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{(item.dailyStorage / 1024).toFixed(2)} GB</td>
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
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{(storageBreakdown.reduce((sum, item) => sum + item.dailyStorage, 0) / 1024).toFixed(2)} GB</td>
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
                {spareFactor > 0 ? `Including ${spareFactor}% spare drives` : 'No spare drives'}
              </span>
            </div>
          </div>
          
          <div className="p-3 rounded-md bg-blue-50 border border-blue-300">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Drives:</p>
                <p className="font-medium text-xl text-blue-700">{requiredDrives.count}</p>
                <p className="text-xs text-gray-500">
                  {requiredDrives.raidDrives} RAID + {requiredDrives.spareDrives} spare
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
            <li>Motion detection reduces storage by recording only when motion is detected, estimated by the motion percentage.</li>
            <li>Higher resolutions and frame rates increase storage requirements but provide better image quality.</li>
            <li>H.265/HEVC compression can reduce storage requirements by about 50% compared to H.264.</li>
            <li>RAID 5 requires N+1 drives (1 drive for parity), RAID 6 requires N+2 drives (2 drives for parity).</li>
            <li>The spare factor adds extra drives as a percentage of the RAID configuration for hot spares.</li>
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

const BandwidthCalculator: React.FC<BandwidthCalculatorProps> = ({ onShowTutorial }) => {
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
  
  // State for editing section
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  
  // State for calculation results
  const [totalRawBandwidth, setTotalRawBandwidth] = useState<number>(0);
  const [totalRequiredBandwidth, setTotalRequiredBandwidth] = useState<number>(0);
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
    
    const required = (rawBandwidth / (networkUtilization / 100)) * networkBufferFactor;
    setTotalRequiredBandwidth(required);
    
    if (required <= 10) {
        setRecommendedNetwork('10/100 Mbps Ethernet (Consider Gigabit for future)');
    } else if (required <= 80) { // Typical max for 100Mbps before issues
        setRecommendedNetwork('100 Mbps Fast Ethernet (Consider Gigabit)');
    } else if (required <= 800) { // Typical max for 1Gbps
        setRecommendedNetwork('1 Gbps Gigabit Ethernet');
    } else if (required <= 8000) { // Typical max for 10Gbps
        setRecommendedNetwork('10 Gbps Ethernet');
    } else {
        setRecommendedNetwork('Multiple 10 Gbps links or higher capacity backbone');
    }
    
  }, [networkSections, networkUtilization, networkBufferFactor]);

  const addNetworkSection = () => {
    const newId = (networkSections.length + 1).toString();
    setNetworkSections(prev => [
      ...prev,
      {
        id: newId,
        name: `Section ${newId}`,
        cameras: 5,
        avgBitrate: 3,
        peakUsage: 100,
        viewingStations: 1,
        viewingBitrate: 6,
        totalBandwidth: 0
      }
    ]);
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
              className="w-full p-2 border rounded-md"
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
            className="w-full p-2 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Additional capacity for future expansion (e.g., 1.2 = 20% extra)</p>
        </div>
        
        <div className="border-t border-gray-300 my-4"></div>
        
        {/* NETWORK SECTIONS CONFIGURATION */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg text-gray-700">Network Sections</h3>
            <button
              onClick={addNetworkSection}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Add Section
            </button>
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
        <h3 className="font-medium text-lg mb-4">Bandwidth Requirements</h3>
        
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
                <p className="text-sm text-gray-600">With {networkUtilization}% utilization and {((networkBufferFactor - 1) * 100).toFixed(0)}% buffer</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-md border border-green-200 shadow mb-6">
          <h4 className="font-medium text-base text-green-800 mb-2">Recommended Network</h4>
          <p className="font-bold text-xl text-green-700">{recommendedNetwork}</p>
          <p className="text-sm text-green-600 mt-1">Based on calculated bandwidth requirements</p>
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
            <li>Network utilization target ensures network isn't saturated during peak times</li>
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
  requiredCameras: number; // Calculated
}

const COVERAGE_TYPES = [
  { value: 'general', label: 'General Surveillance (Overview)', pixelDensity: 20 }, // px/m
  { value: 'detailed', label: 'Detailed Observation (Detect Person)', pixelDensity: 60 },
  { value: 'recognition', label: 'Recognition (Known Person)', pixelDensity: 120 },
  { value: 'identification', label: 'Identification (Unknown Person)', pixelDensity: 250 }
];

const CoverageCalculator: React.FC<CoverageCalculatorProps> = ({ onShowTutorial }) => {
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
      requiredCameras: 0 
    }
  ]);
  
  const [selectedResolution, setSelectedResolution] = useState<string>('1080p');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9'); // Informational for now
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
  
  useEffect(() => {
    const resolution = resolutionOptions.find(r => r.value === selectedResolution);
    if (!resolution) return;
    
    const cameraWidthPixels = resolution.width;
    
    const updatedAreas = areas.map(area => {
      const coverageTypeInfo = COVERAGE_TYPES.find(c => c.value === area.coverageType);
      const pixelDensity = coverageTypeInfo ? coverageTypeInfo.pixelDensity : 60;
      
      // Max width (in meters) a single camera can cover at the required detail horizontally
      const effectiveCoverageWidthPerCamera = cameraWidthPixels / pixelDensity;
      
      // Approximate area covered by one camera maintaining this detail level.
      // This is a simplification; actual coverage depends on lens, aspect ratio, and how coverage is defined (e.g. circular, rectangular projection).
      // Using a square area for simplicity, based on the limiting dimension (width for horizontal pixel density)
      const effectiveAreaPerCamera = Math.pow(effectiveCoverageWidthPerCamera, 2); 
                                       // A more nuanced calculation might use effectiveCoverageWidth * (effectiveCoverageWidth * (resolution.height/resolution.width)) if using aspect ratio.
                                       // Or for circular approximation using radius = effectiveCoverageWidth/2: PI * (effectiveCoverageWidth/2)^2

      const areaToBeMonitored = area.length * area.width;
      const effectiveAreaToMonitor = areaToBeMonitored * (1 - area.obstaclePercentage / 100);
      
      const camerasNeeded = (effectiveAreaPerCamera > 0 && effectiveAreaToMonitor > 0) 
                            ? Math.ceil(effectiveAreaToMonitor / effectiveAreaPerCamera) 
                            : 0;
      
      return { ...area, requiredCameras: camerasNeeded };
    });

    if (JSON.stringify(areas) !== JSON.stringify(updatedAreas)) {
        setAreas(updatedAreas);
    }
    
    setTotalCameras(updatedAreas.reduce((sum, area) => sum + area.requiredCameras, 0));
    
    const details = updatedAreas.map(area => {
      const coverageTypeInfo = COVERAGE_TYPES.find(c => c.value === area.coverageType);
      const pixelDensity = coverageTypeInfo ? coverageTypeInfo.pixelDensity : 60;
      
      const viewingAngleRad = (area.cameraViewingAngle * Math.PI) / 180;
      // Ground coverage width (diameter of FoV circle on ground if camera points straight down, or base of FoV triangle)
      const groundFoVWidth = 2 * area.mountHeight * Math.tan(viewingAngleRad / 2);
      
      const maxDistanceForDetail = cameraWidthPixels / pixelDensity;
      
      return {
        areaId: area.id,
        areaName: area.name,
        requiredCameras: area.requiredCameras,
        coverageType: coverageTypeInfo?.label || 'Detailed Observation',
        pixelDensity: pixelDensity,
        viewDiameter: groundFoVWidth.toFixed(2), // Width of FoV at mount height distance
        maxDistance: maxDistanceForDetail.toFixed(2), // Max distance for target pixel density
        viewingAngle: area.cameraViewingAngle,
        mountHeight: area.mountHeight
      };
    });
    setCameraDetails(details);
    
  }, [areas, selectedResolution, aspectRatio]); // aspectRatio is in deps but not directly used in calculation logic shown

  const addArea = () => {
    const newId = (areas.length + 1).toString();
    setAreas(prev => [
      ...prev,
      {
        id: newId,
        name: `Area ${newId}`,
        length: 10,
        width: 5,
        coverageType: 'general',
        obstaclePercentage: 10,
        mountHeight: 3,
        cameraViewingAngle: 90,
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
            className="w-full p-2 border rounded-md"
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
            Aspect Ratio (Informational)
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="16:9">16:9 (Widescreen)</option>
            <option value="4:3">4:3 (Standard)</option>
            <option value="3:2">3:2 (Classic)</option>
          </select>
           <p className="text-xs text-gray-500 mt-1">Currently not directly used in area calculation logic.</p>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Obstacle Percentage (%)</label>
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
        <h3 className="font-medium text-lg mb-4">Camera Coverage Results</h3>
        
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
        
        <h4 className="font-medium mb-3 text-blue-700">Detailed Camera Requirements (Estimates)</h4>
        <div className="overflow-x-auto bg-white rounded-md shadow mb-6">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage Level</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cameras</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max Dist. (Detail)</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ground FoV Width</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cameraDetails.map((detail) => (
                <tr key={detail.areaId}>
                  <td className="px-4 py-2 text-sm text-gray-900">{detail.areaName}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center">{detail.coverageType.split(' (')[0]}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-center font-medium">{detail.requiredCameras}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{detail.maxDistance}m</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{detail.viewDiameter}m</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-center">-</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-center">{totalCameras}</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">-</td>
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
            <li>Pixel density requirements are based on industry standards (e.g., EN 62676-4).</li>
            <li>Max Distance (Detail) is the max distance from the camera at which the target pixel density can be achieved horizontally.</li>
            <li>Ground FoV Width is the width of the camera's field of view on the ground, assuming the camera is pointed perpendicular to the ground plane at that distance (simplification).</li>
            <li>Cameras Estimated is a rough guide; actual count depends on precise placement, lens focal length, scene complexity, and desired overlap.</li>
            <li>Obstacles reduce effective coverage area.</li>
            <li>Higher camera mounting provides wider overview but can reduce detail if lens is fixed; consider varifocal or PTZ for flexibility.</li>
            <li>For critical areas, ensure camera overlap to eliminate blind spots. This calculator does not account for overlap.</li>
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
  { value: 'poeType4', label: 'PoE++ (802.3bt Type 4)', watts: 100, delivered: 71 } // Or 90W depending on spec version
];


const PowerConsumptionCalculator: React.FC<PowerConsumptionCalculatorProps> = ({ onShowTutorial }) => {
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
  const [upsSizingFactor, setUpsSizingFactor] = useState<number>(70); // Combined Power Factor & Efficiency for VA calc
  
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  
  const [totalPower, setTotalPower] = useState<number>(0); 
  const [totalPoePower, setTotalPoePower] = useState<number>(0); 
  const [totalNonPoePower, setTotalNonPoePower] = useState<number>(0); 
  const [upsRequirements, setUpsRequirements] = useState<{capacity: number, recommendation: string, loadWatts: number}>({ capacity: 0, recommendation: '', loadWatts: 0 });
  
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
    
    // UPS Sizing: VA = Watts / (Power Factor * Efficiency)
    // upsSizingFactor is used as a combined (PF * Efficiency), e.g. 0.7 for 70%
    const loadForUpsInWatts = currentNonPoePower;
    const estimatedVA = loadForUpsInWatts > 0 && upsSizingFactor > 0 
                        ? loadForUpsInWatts / (upsSizingFactor / 100)
                        : 0;

    const upsCapacityRounded = Math.ceil(estimatedVA / 100) * 100; 
    
    let upsRecommendation = '';
    if (loadForUpsInWatts <= 0) {
        upsRecommendation = 'No non-PoE load for UPS.';
    } else if (upsCapacityRounded <= 500) {
      upsRecommendation = 'Small UPS (e.g., 500-750VA)';
    } else if (upsCapacityRounded <= 1000) {
      upsRecommendation = 'Medium UPS (e.g., 1000-1500VA)';
    } else if (upsCapacityRounded <= 2000) {
      upsRecommendation = 'Large UPS (e.g., 1500-2200VA)';
    } else if (upsCapacityRounded <= 3000) {
      upsRecommendation = 'X-Large UPS (e.g., 2200-3000VA)';
    } else {
      upsRecommendation = `High Capacity UPS (>3000VA) or multiple units`;
    }
    
    setUpsRequirements({
      capacity: upsCapacityRounded,
      recommendation: upsRecommendation,
      loadWatts: loadForUpsInWatts
    });
    
  }, [devices, upsSizingFactor]); // Removed backupTime from deps as it's for runtime, not VA capacity typically.
                                // If backupTime influences VA choice (e.g. larger VA for longer runtime at same load due to battery config), it could be added.
                                // For this calculator, backupTime is informational for the user when selecting the VA-rated UPS.

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
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">For non-PoE devices on UPS. Runtime affects UPS model choice.</p>
          </div>
          <div>
            <label htmlFor="upsSizingFactor" className="block text-sm font-medium text-gray-700 mb-1">
              UPS Sizing Factor (%)
            </label>
            <input
              id="upsSizingFactor"
              type="number"
              min="50" 
              max="95" // Max practical PF*Efficiency
              value={upsSizingFactor}
              onChange={(e) => setUpsSizingFactor(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Combined Power Factor & Efficiency (e.g., 70 for 0.7 PF & 100% Eff, or 0.8 PF * 0.85 Eff = 68). Affects VA calculation.</p>
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
        <h3 className="font-medium text-lg mb-4">Power Requirements</h3>
        
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
        
        <div className="bg-green-50 p-4 rounded-md border border-green-200 shadow mb-6">
          <h4 className="font-medium text-base text-green-800 mb-2">UPS Requirements (for {upsRequirements.loadWatts.toFixed(0)}W Non-PoE Load)</h4>
          <p className="font-bold text-xl text-green-700">{upsRequirements.capacity > 0 ? `${upsRequirements.capacity} VA` : "N/A"} (Estimated)</p>
          <p className="text-sm text-green-600 mt-1">Recommended UPS Category: {upsRequirements.recommendation}</p>
          <p className="text-sm text-green-600 mt-1">Provides approx. {backupTime} minutes backup. Sizing factor: {upsSizingFactor}%. Verify with UPS mfg. for exact runtime.</p>
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
            <li>UPS capacity (VA) is an estimation: `Watts / (SizingFactor/100)`. SizingFactor combines typical Power Factor (PF) and UPS efficiency. Consult UPS manufacturer tools for precise runtime and model selection.</li>
            <li>PoE devices are powered by PoE switches. The switch itself requires AC power and should be on UPS if PoE devices need backup. This calculator sums PoE device power for switch budget consideration.</li>
            <li>Device power consumptions are typical; use custom values or datasheets for accuracy. IR LEDs, PTZ motors, heaters can significantly increase camera power draw.</li>
            <li>For mission-critical systems, consider N+1 redundancy for power supplies and UPS.</li>
            <li>Total PoE budget of a switch must exceed the sum of power for all connected PoE devices. This calculator only checks individual device draw vs. PoE standard per port.</li>
            <li>Cable runs (length, quality) affect PoE power delivery. Adhere to TIA/IEEE standards.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CCTVSystemCalculator;