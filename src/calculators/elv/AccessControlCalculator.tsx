import React, { useState, useEffect, useCallback } from 'react'; // Ensure useEffect is imported
import { Icons } from '../../components/Icons';


// Define props type for the component
interface AccessControlCalculatorProps {
   onBack?: () => void; // Function to navigate back
   onShowTutorial?: () => void; // Optional callback/flag to enable or handle tutorial display
}

// Define device categories based on the new calculation model
type DeviceCategory = 'equipment' | 'failSafeActuator' | 'failSecureActuator';

// Updated DEVICE_TYPES to include category and relevant current parameters
interface DeviceTypeInfo {
  value: string;
  label: string;
  category: DeviceCategory;
  baseCurrent: number; // For 'equipment': continuous current. For 'actuators': quiescent current.
  activatedCurrent: number; // For 'actuators': current when active. For 'equipment': can be 0 or peak (not used in new I_avg for equipment).
  // For 'failSecureActuator' category
  actuationsPerHour?: number;
  actuationDurationSecs?: number;
  quantity: number; // Default quantity when adding
}

const DEVICE_TYPES: DeviceTypeInfo[] = [
  { value: 'cardReader', label: 'Card Reader', category: 'equipment', baseCurrent: 0.15, activatedCurrent: 0.15, quantity: 1 },
  { value: 'electMagLockFS', label: 'Electromagnetic Lock (Fail-Safe)', category: 'failSafeActuator', baseCurrent: 0, activatedCurrent: 0.5, quantity: 1 },
  { value: 'electMagLockFSC', label: 'Electromagnetic Lock (Fail-Secure)', category: 'failSecureActuator', baseCurrent: 0.02, activatedCurrent: 0.5, actuationsPerHour: 10, actuationDurationSecs: 3, quantity: 1 },
  { value: 'electricStrikeFS', label: 'Electric Strike (Fail-Safe)', category: 'failSafeActuator', baseCurrent: 0, activatedCurrent: 0.25, quantity: 1 },
  { value: 'electricStrikeFSC', label: 'Electric Strike (Fail-Secure)', category: 'failSecureActuator', baseCurrent: 0.01, activatedCurrent: 0.25, actuationsPerHour: 30, actuationDurationSecs: 2, quantity: 1 },
  { value: 'exitButton', label: 'Exit Button / REX', category: 'equipment', baseCurrent: 0.03, activatedCurrent: 0.03, quantity: 1 },
  { value: 'doorContact', label: 'Door Contact / Sensor', category: 'equipment', baseCurrent: 0.01, activatedCurrent: 0.01, quantity: 1 },
  { value: 'controller', label: 'Access Controller (2-door)', category: 'equipment', baseCurrent: 0.25, activatedCurrent: 0.3, quantity: 1 },
  { value: 'alarmSiren', label: 'Alarm Siren (when active)', category: 'failSecureActuator', baseCurrent: 0.02, activatedCurrent: 0.35, actuationsPerHour: 1, actuationDurationSecs: 900, quantity: 1 }, // Example: siren active for 15min if alarm condition lasts
  { value: 'pir', label: 'PIR Motion Sensor', category: 'equipment', baseCurrent: 0.02, activatedCurrent: 0.03, quantity: 1 },
  { value: 'keypad', label: 'Keypad', category: 'equipment', baseCurrent: 0.1, activatedCurrent: 0.1, quantity: 1 },
  { value: 'mainPanel', label: 'Main Control Panel', category: 'equipment', baseCurrent: 0.2, activatedCurrent: 0.3, quantity: 1 },
  { value: 'custom', label: 'Custom Device', category: 'equipment', baseCurrent: 0, activatedCurrent: 0, quantity: 1 }
];

// Updated SECURITY_GRADES standby times based on IEC 60839-11-2 Table 2 (from image) for Grades 3 & 4
// AlarmTime is kept for now but not used in the C = t * I_avg formula from the image.
const SECURITY_GRADES = [
  { 
    value: 'grade1', 
    label: 'Grade 1 (Low Risk)', 
    standbyTime: 4, // hours, kept from original as Table 2 says "OP"
    alarmTime: 0.25, // hours (15 minutes)
    description: 'Basic systems. Standby power optional per IEC 60839-11-2 Table 2.'
  },
  { 
    value: 'grade2', 
    label: 'Grade 2 (Low to Medium Risk)', 
    standbyTime: 8, // hours, kept from original as Table 2 says "OP"
    alarmTime: 0.5, // hours (30 minutes)
    description: 'Standard systems. Standby power optional per IEC 60839-11-2 Table 2.'
  },
  { 
    value: 'grade3', 
    label: 'Grade 3 (Medium to High Risk)', 
    standbyTime: 2, // hours, UPDATED from image (Table 2)
    alarmTime: 0.5, // hours (30 minutes)
    description: 'Enhanced systems. Min 2h standby per IEC 60839-11-2 Table 2.'
  },
  { 
    value: 'grade4', 
    label: 'Grade 4 (High Risk)', 
    standbyTime: 4, // hours, UPDATED from image (Table 2)
    alarmTime: 1, // hours (60 minutes)
    description: 'High security systems. Min 4h standby per IEC 60839-11-2 Table 2.'
  }
];

// Define interface for device item
interface DeviceItem {
  id: string;
  name: string;
  deviceType: string; // value from DEVICE_TYPES
  quantity: number;

  // Electrical characteristics - these are populated from DEVICE_TYPES on type change,
  // and can then be directly edited by the user for any device type.
  category: DeviceCategory;    // Inherent category from deviceType, not directly editable by user (except via customCategory for 'custom' type)
  baseCurrent: number;         // For 'equipment': continuous current. For 'actuators': quiescent current.
  activatedCurrent: number;    // For 'actuators': current when active.
  actuationsPerHour: number;   // For 'failSecureActuator' category.
  actuationDurationSecs: number; // For 'failSecureActuator' category.

  // For 'custom' deviceType, these allow user to define category and override above current values.
  customCategory?: DeviceCategory;
  customBaseCurrent?: number;
  customActivatedCurrent?: number;
  customActuationsPerHour?: number;
  customActuationDurationSecs?: number;

  // Calculated average current contribution of this device (item * quantity * duty_cycle_if_fail_secure)
  averageLoadContribution: number;
}

// Define interface for calculation settings
interface CalculationSettings {
  securityGrade: string;
  customStandbyTime?: number;
  // customAlarmTime is no longer used in the primary calculation C = t * I_avg
  useCustomTimes: boolean;
  batteryAgingFactor: number; // This is the "de-rating factor" from the image
  temperatureFactor: number; // Additional de-rating factor
  systemVoltage: number;
  includePowerSupplyEfficiency: boolean;
  powerSupplyEfficiency: number;
}

// The main Access Control Calculator component
const AccessControlCalculator: React.FC<AccessControlCalculatorProps> = ({ onBack, onShowTutorial }) => {
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showStandard, setShowStandard] = useState<boolean>(false);
  
  const initialDevice1Type = DEVICE_TYPES.find(t => t.value === 'mainPanel') || DEVICE_TYPES[0];
  const initialDevice2Type = DEVICE_TYPES.find(t => t.value === 'cardReader') || DEVICE_TYPES[1];

  const [devices, setDevices] = useState<DeviceItem[]>([
    {
      id: '1',
      name: 'Main Controller',
      deviceType: initialDevice1Type.value,
      quantity: 1,
      category: initialDevice1Type.category,
      baseCurrent: initialDevice1Type.baseCurrent,
      activatedCurrent: initialDevice1Type.activatedCurrent,
      actuationsPerHour: initialDevice1Type.actuationsPerHour || 0,
      actuationDurationSecs: initialDevice1Type.actuationDurationSecs || 0,
      averageLoadContribution: initialDevice1Type.baseCurrent * 1, // Initial calculation for equipment
    },
    {
      id: '2',
      name: 'Card Reader 1',
      deviceType: initialDevice2Type.value,
      quantity: 1,
      category: initialDevice2Type.category,
      baseCurrent: initialDevice2Type.baseCurrent,
      activatedCurrent: initialDevice2Type.activatedCurrent,
      actuationsPerHour: initialDevice2Type.actuationsPerHour || 0,
      actuationDurationSecs: initialDevice2Type.actuationDurationSecs || 0,
      averageLoadContribution: initialDevice2Type.baseCurrent * 1, // Initial calculation for equipment
    }
  ]);
  
  const [settings, setSettings] = useState<CalculationSettings>({
    securityGrade: 'grade3',
    useCustomTimes: false,
    batteryAgingFactor: 1.25, // Corresponds to 20-25% de-rating
    temperatureFactor: 1.1, 
    systemVoltage: 12,
    includePowerSupplyEfficiency: true,
    powerSupplyEfficiency: 0.85
  });
  
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  
  // Results state
  const [batteryCapacity, setBatteryCapacity] = useState<number>(0); // Raw capacity C
  const [adjustedCapacity, setAdjustedCapacity] = useState<number>(0); // Capacity after de-rating/efficiency
  const [recommendedBatteries, setRecommendedBatteries] = useState<string[]>([]);
  
  // Intermediate calculation values for display
  const [totalIAvg, setTotalIAvg] = useState<number>(0);
  const [totalIEquip, setTotalIEquip] = useState<number>(0);
  const [totalIFailSafe, setTotalIFailSafe] = useState<number>(0);
  const [totalIFailSecureAvg, setTotalIFailSecureAvg] = useState<number>(0);
  
  const initialGradeInfo = SECURITY_GRADES.find(g => g.value === settings.securityGrade);
  const [effectiveStandbyTime, setEffectiveStandbyTime] = useState<number>(initialGradeInfo?.standbyTime || 2);
  // effectiveAlarmTime is no longer used in the primary calculation with C = t * I_avg

  const calculateDeviceAverageLoad = useCallback((
    deviceParams: Pick<DeviceItem, 
      'quantity' | 'category' | 'baseCurrent' | 'activatedCurrent' | 
      'actuationsPerHour' | 'actuationDurationSecs' | 
      'customCategory' | 'customBaseCurrent' | 'customActivatedCurrent' | 
      'customActuationsPerHour' | 'customActuationDurationSecs'
    > & { deviceType: string } // Add deviceType to determine if it's 'custom'
  ): number => {
    let load = 0;
    const q = deviceParams.quantity || 1;

    let effCategory = deviceParams.category;
    let effBaseCurrent = deviceParams.baseCurrent;
    let effActivatedCurrent = deviceParams.activatedCurrent;
    let effActuationsPerHour = deviceParams.actuationsPerHour;
    let effActuationDurationSecs = deviceParams.actuationDurationSecs;

    // If it's a 'custom' device type AND customCategory is set, custom parameters take precedence
    if (deviceParams.deviceType === 'custom' && deviceParams.customCategory) {
        effCategory = deviceParams.customCategory;
        effBaseCurrent = deviceParams.customBaseCurrent ?? effBaseCurrent;
        effActivatedCurrent = deviceParams.customActivatedCurrent ?? effActivatedCurrent;
        effActuationsPerHour = deviceParams.customActuationsPerHour ?? effActuationsPerHour;
        effActuationDurationSecs = deviceParams.customActuationDurationSecs ?? effActuationDurationSecs;
    }
    
    switch (effCategory) {
      case 'equipment':
        load = effBaseCurrent * q;
        break;
      case 'failSafeActuator': 
        load = effActivatedCurrent * q;
        break;
      case 'failSecureActuator':
        const dutyCycle = (effActuationsPerHour * effActuationDurationSecs) / 3600;
        const cappedDutyCycle = Math.min(dutyCycle, 1); 
        load = (effBaseCurrent * q) + (effActivatedCurrent * cappedDutyCycle * q);
        break;
      default:
        load = 0;
    }
    return load;
  }, []);

  const addDevice = () => {
    const newId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const selectedDeviceType = DEVICE_TYPES[0]; 
    
    const newDevicePartial = {
        deviceType: selectedDeviceType.value, // ensure deviceType is part of the partial for calc
        quantity: 1,
        category: selectedDeviceType.category,
        baseCurrent: selectedDeviceType.baseCurrent,
        activatedCurrent: selectedDeviceType.activatedCurrent,
        actuationsPerHour: selectedDeviceType.actuationsPerHour || 0,
        actuationDurationSecs: selectedDeviceType.actuationDurationSecs || 0,
        customCategory: undefined, // ensure custom fields are initialized
        customBaseCurrent: undefined,
        customActivatedCurrent: undefined,
        customActuationsPerHour: undefined,
        customActuationDurationSecs: undefined,
    };

    setDevices([
      ...devices,
      {
        id: newId,
        name: `Device ${devices.length + 1}`,
        deviceType: selectedDeviceType.value,
        quantity: 1,
        category: selectedDeviceType.category,
        baseCurrent: selectedDeviceType.baseCurrent,
        activatedCurrent: selectedDeviceType.activatedCurrent,
        actuationsPerHour: selectedDeviceType.actuationsPerHour || 0,
        actuationDurationSecs: selectedDeviceType.actuationDurationSecs || 0,
        averageLoadContribution: calculateDeviceAverageLoad(newDevicePartial),
      }
    ]);
  };

  const removeDevice = (id: string) => {
    if (devices.length > 1) {
      setDevices(devices.filter(device => device.id !== id));
    }
  };

  const updateDevice = (id: string, field: keyof DeviceItem | `custom${string}`, value: any) => {
    setDevices(prevDevices => prevDevices.map(device => {
      if (device.id === id) {
        let updatedDevice = { ...device, [field]: value };

        if (field === 'deviceType') {
          const typeInfo = DEVICE_TYPES.find(t => t.value === value);
          if (typeInfo) {
            updatedDevice.category = typeInfo.category;
            updatedDevice.baseCurrent = typeInfo.baseCurrent;
            updatedDevice.activatedCurrent = typeInfo.activatedCurrent;
            updatedDevice.actuationsPerHour = typeInfo.actuationsPerHour || 0;
            updatedDevice.actuationDurationSecs = typeInfo.actuationDurationSecs || 0;
            
            if (value !== 'custom') { // Switched to a non-custom type
                updatedDevice.customCategory = undefined;
                updatedDevice.customBaseCurrent = undefined;
                updatedDevice.customActivatedCurrent = undefined;
                updatedDevice.customActuationsPerHour = undefined;
                updatedDevice.customActuationDurationSecs = undefined;
            } else { // Switched to 'custom' or re-selected 'custom'
                if (!updatedDevice.customCategory) { // Initialize customCategory if it's not already set
                    updatedDevice.customCategory = typeInfo.category; // Default category for 'custom' type
                }
                // For 'custom' type, customXXXCurrent fields take precedence if set.
                // The main baseCurrent etc. are already set from typeInfo (e.g. 0A for custom).
                // User can edit these main fields OR the customXXX fields.
            }
          }
        }
        // No automatic sync from baseCurrent to customBaseCurrent or vice-versa here.
        // Let calculation functions handle precedence.
        
        const { 
            deviceType, quantity, category, baseCurrent, activatedCurrent, 
            actuationsPerHour, actuationDurationSecs,
            customCategory, customBaseCurrent, customActivatedCurrent, 
            customActuationsPerHour, customActuationDurationSecs
        } = updatedDevice;
        
        updatedDevice.averageLoadContribution = calculateDeviceAverageLoad({
            deviceType, quantity, category, baseCurrent, activatedCurrent, 
            actuationsPerHour, actuationDurationSecs,
            customCategory, customBaseCurrent, customActivatedCurrent, 
            customActuationsPerHour, customActuationDurationSecs
        });
        
        return updatedDevice;
      }
      return device;
    }));
  };
  
  const updateSetting = (field: keyof CalculationSettings, value: any) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [field]: value
    }));
  };
  
  const calculateBatteryCapacity = useCallback(() => {
    let currentIEquip = 0;
    let currentIFailSafe = 0;
    let currentIFailSecureAvg = 0;

    devices.forEach(device => {
      let effCategory = device.category;
      let effBaseCurrent = device.baseCurrent;
      let effActivatedCurrent = device.activatedCurrent;
      let effActuationsPerHour = device.actuationsPerHour;
      let effActuationDurationSecs = device.actuationDurationSecs;

      if (device.deviceType === 'custom' && device.customCategory) {
        effCategory = device.customCategory;
        effBaseCurrent = device.customBaseCurrent ?? effBaseCurrent;
        effActivatedCurrent = device.customActivatedCurrent ?? effActivatedCurrent;
        effActuationsPerHour = device.customActuationsPerHour ?? effActuationsPerHour;
        effActuationDurationSecs = device.customActuationDurationSecs ?? effActuationDurationSecs;
      }

      const q = device.quantity;

      switch (effCategory) {
        case 'equipment':
          currentIEquip += effBaseCurrent * q;
          break;
        case 'failSafeActuator':
          currentIFailSafe += effActivatedCurrent * q; 
          break;
        case 'failSecureActuator':
          currentIEquip += effBaseCurrent * q; 
          
          const dutyCycle = (effActuationsPerHour * effActuationDurationSecs) / 3600;
          const cappedDutyCycle = Math.min(dutyCycle, 1);
          currentIFailSecureAvg += effActivatedCurrent * cappedDutyCycle * q;
          break;
      }
    });
    
    setTotalIEquip(currentIEquip);
    setTotalIFailSafe(currentIFailSafe);
    setTotalIFailSecureAvg(currentIFailSecureAvg);

    const I_avg = currentIEquip + currentIFailSafe + currentIFailSecureAvg;
    setTotalIAvg(I_avg);
        
    let STime: number; 
    const currentGradeInfo = SECURITY_GRADES.find(g => g.value === settings.securityGrade);

    if (settings.useCustomTimes) {
      STime = settings.customStandbyTime ?? currentGradeInfo?.standbyTime ?? 2; 
    } else {
      STime = currentGradeInfo?.standbyTime ?? 2; 
    }
    setEffectiveStandbyTime(STime);

    const rawCapacity = I_avg * STime; 
    setBatteryCapacity(rawCapacity);
    
    let adjustedValue = rawCapacity * settings.batteryAgingFactor * settings.temperatureFactor;
    
    if (settings.includePowerSupplyEfficiency && settings.powerSupplyEfficiency > 0 && adjustedValue > 0) {
      adjustedValue = adjustedValue / settings.powerSupplyEfficiency;
    }
    setAdjustedCapacity(adjustedValue);
    
    const recommendedAh = Math.ceil(adjustedValue);
    let recommendations: string[] = [];
    
    if (recommendedAh <= 0) {
        recommendations.push(`No battery capacity required or calculation error.`);
    } else if (recommendedAh <= 7) {
      recommendations.push(`${recommendedAh}Ah or 7Ah ${settings.systemVoltage}V sealed lead-acid battery`);
    } else if (recommendedAh <= 12) {
      recommendations.push(`12Ah ${settings.systemVoltage}V sealed lead-acid battery`);
    } else if (recommendedAh <= 18) {
      recommendations.push(`18Ah ${settings.systemVoltage}V sealed lead-acid battery`);
    } else if (recommendedAh <= 24) {
      recommendations.push(`24Ah ${settings.systemVoltage}V sealed lead-acid battery`);
    } else if (recommendedAh <= 38) {
      recommendations.push(`Two 18Ah 12V batteries in parallel (36Ah total) or equivalent ${settings.systemVoltage}V setup`);
    } else if (recommendedAh <= 48) {
      recommendations.push(`Two 24Ah 12V batteries in parallel (48Ah total) or equivalent ${settings.systemVoltage}V setup`);
    } else if (recommendedAh <= 72) {
      recommendations.push(`Three 24Ah 12V batteries in parallel (72Ah total) or equivalent ${settings.systemVoltage}V setup`);
    } else {
      recommendations.push(`Multiple high-capacity batteries in parallel/series configuration (e.g., ${recommendedAh}Ah total at ${settings.systemVoltage}V)`);
      recommendations.push(`Consider distributed power architecture`);
    }
    
    if (settings.systemVoltage === 24 && recommendedAh > 0) {
      recommendations = recommendations.map(rec => 
        rec.replace(/(\d+Ah) 12V/g, '$1 (single 24V or two 12V in series)')
           .replace(/batteries in parallel/g, 'sets of series-connected batteries in parallel (for 12V batteries to make 24V sets)')
      );
    }
    setRecommendedBatteries(recommendations);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, settings]);

  useEffect(() => {
    calculateBatteryCapacity();
  }, [calculateBatteryCapacity]);

  const handleNumericInput = (value: string, precision?: number, min?: number, max?: number): number | undefined => {
    const num = precision === 0 ? parseInt(value, 10) : parseFloat(value);
    if (value === '' || isNaN(num)) return undefined; // Return undefined for empty or invalid string to allow clearing fields
    let result = num;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    if (precision !== undefined && precision > 0 && !isNaN(result)) {
        return parseFloat(result.toFixed(precision));
    }
    return result;
  };


  return (
    <div className="animate-fade-in">
      {/* Main Calculator */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8 font-sans">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Battery Capacity Calculation</h2>
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowStandard(!showStandard)} 
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <span className="mr-1">{showStandard ? 'Hide Standard Info' : 'Show Standard Info'}</span>
              <Icons.InfoInline />
            </button>
            {onShowTutorial && (
              <button 
                onClick={() => setShowTutorial(true)} 
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <span className="mr-1">Tutorial</span>
                <Icons.InfoInline />
              </button>
            )}
          </div>
        </div>
        
        {showStandard && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">IEC 60839-11-1 Annex B & IEC 60839-11-2 Considerations</h3>
            <p className="text-sm mb-2">
              This calculator is adapted from the methodology similar to that in IEC 60839-11-1 Annex B, focusing on calculating an average load (`I_avg`) which is then used to determine battery capacity (`C = t × I_avg`).
              IEC 60839-11-2 specifies power supply requirements, including standby times based on security grades.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-700 mb-1">Key Parameters (from image-based model)</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>`I_equip`: Current for general EACS equipment (including quiescent of fail-secure).</li>
                    <li>`I_fail-safe`: Current for fail-safe actuators (continuously active).</li>
                    <li>`I_fail-secure_active_avg`: Average current of fail-secure actuators during active pulses.</li>
                    <li>`D_i`: Duty cycle for fail-secure actuators (`t_acti * n_i / 3600`).</li>
                    <li>`t`: Required standby time in hours.</li>
                </ul>
                <h4 className="font-medium text-blue-700 mt-2 mb-1">Security Grade Standby Times (per IEC 60839-11-2 Table 2)</h4>
                 <ul className="list-disc pl-5 space-y-1">
                  {SECURITY_GRADES.map(grade => (
                    <li key={grade.value}>
                      <span className="font-medium">{grade.label}:</span> {grade.description.includes("optional") ? grade.standbyTime + "h (if standby provided)" : grade.standbyTime + "h minimum standby"}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-1">Formula Used</h4>
                <div className="p-2 bg-white rounded mt-1">
                  <p className="font-medium">I<sub>avg</sub> = I<sub>equip_total</sub> + I<sub>fail-safe_total</sub> + I<sub>fail-secure_active_avg_total</sub></p>
                  <p className="font-medium mt-1">C = t × I<sub>avg</sub></p>
                  <p>Where:</p>
                  <ul className="pl-5 list-disc">
                    <li>C = Battery capacity in Ampere-hours (Ah)</li>
                    <li>t = Required standby time (h)</li>
                    <li>I<sub>avg</sub> = Total average load current (A)</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Note: De-rating factors for battery aging, temperature, and power supply efficiency should be applied to the calculated capacity C.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-lg mb-4 text-gray-700">System Parameters</h3>
            
            {/* Security Grade and System Voltage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Grade</label>
                <select 
                  value={settings.securityGrade}
                  onChange={(e) => updateSetting('securityGrade', e.target.value)}
                  disabled={settings.useCustomTimes}
                  className={`w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${settings.useCustomTimes ? 'bg-gray-100' : ''}`}
                >
                  {SECURITY_GRADES.map(grade => (
                    <option key={grade.value} value={grade.value}>{grade.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {SECURITY_GRADES.find(g => g.value === settings.securityGrade)?.description}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Voltage</label>
                <select 
                  value={settings.systemVoltage}
                  onChange={(e) => updateSetting('systemVoltage', Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={12}>12 VDC</option>
                  <option value={24}>24 VDC</option>
                </select>
              </div>
            </div>
            
            {/* Custom Times */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="useCustomTimes"
                  checked={settings.useCustomTimes}
                  onChange={(e) => updateSetting('useCustomTimes', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="useCustomTimes" className="ml-2 text-sm text-gray-700">
                  Use custom standby time
                </label>
              </div>
              
              {settings.useCustomTimes && (
                <div className="grid grid-cols-1 gap-3 pl-3 border-l-4 border-blue-400 py-2">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Custom Standby Time (hours)
                    </label>
                    <input
                      type="number"
                      min="0.1" 
                      step="0.1"
                      value={settings.customStandbyTime ?? ''}
                      placeholder={(SECURITY_GRADES.find(g => g.value === settings.securityGrade)?.standbyTime || 2).toString()}
                      onChange={(e) => updateSetting('customStandbyTime', handleNumericInput(e.target.value, 2, 0.1))}
                      className="w-full p-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Correction Factors */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">De-rating Factors</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Battery Aging Factor
                  </label>
                  <select
                    value={settings.batteryAgingFactor}
                    onChange={(e) => updateSetting('batteryAgingFactor', parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1.0}>None (1.0)</option>
                    <option value={1.1}>10% (1.1)</option>
                    <option value={1.20}>20% (1.20) - Common</option>
                    <option value={1.25}>25% (1.25) - Recommended</option>
                    <option value={1.5}>50% (1.5)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature Factor
                  </label>
                  <select
                    value={settings.temperatureFactor}
                    onChange={(e) => updateSetting('temperatureFactor', parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1.0}>None (1.0)</option>
                    <option value={1.1}>10% (1.1) - Normal</option>
                    <option value={1.2}>20% (1.2) - Cold Environment</option>
                    <option value={1.3}>30% (1.3) - Very Cold</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Power Supply Efficiency */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="includePowerSupplyEfficiency"
                  checked={settings.includePowerSupplyEfficiency}
                  onChange={(e) => updateSetting('includePowerSupplyEfficiency', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="includePowerSupplyEfficiency" className="ml-2 text-sm text-gray-700">
                  Include power supply efficiency
                </label>
              </div>
              
              {settings.includePowerSupplyEfficiency && (
                <div className="pl-3 border-l-4 border-blue-400 py-2">
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Power Supply Efficiency
                  </label>
                  <select
                    value={settings.powerSupplyEfficiency}
                    onChange={(e) => updateSetting('powerSupplyEfficiency', parseFloat(e.target.value))}
                    className="w-full p-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0.95}>95% (High Efficiency)</option>
                    <option value={0.85}>85% (Standard)</option>
                    <option value={0.75}>75% (Basic)</option>
                    <option value={0.65}>65% (Low Efficiency)</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-300 my-6"></div>
            
            {/* Device List Section */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg text-gray-700">Device List</h3>
              <button 
                onClick={addDevice} 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                Add Device
              </button>
            </div>
            
            {devices.map((device) => {
              const deviceTypeInfo = DEVICE_TYPES.find(dt => dt.value === device.deviceType);
              let effectiveCategory = device.category;
              if (device.deviceType === 'custom' && device.customCategory) {
                  effectiveCategory = device.customCategory;
              }

              return (
              <div key={device.id} className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">{device.name || "Unnamed Device"}</h4>
                  {devices.length > 1 && (
                    <button 
                      onClick={() => removeDevice(device.id)} 
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    > Remove </button>
                  )}
                </div>
                
                {editingDeviceId === device.id ? (
                  // Editing View
                  <div className="pl-3 border-l-4 border-blue-400">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                      <input type="text" value={device.name} onChange={(e) => updateDevice(device.id, 'name', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Device name" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                        <select value={device.deviceType} onChange={(e) => updateDevice(device.id, 'deviceType', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" >
                          {DEVICE_TYPES.map(type => ( <option key={type.value} value={type.value}> {type.label} </option> ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input type="number" min="1" value={device.quantity} onChange={(e) => updateDevice(device.id, 'quantity', handleNumericInput(e.target.value, 0, 1) ?? 1 )} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>

                    {/* General Current Inputs - Always editable */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 mb-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {effectiveCategory === 'failSecureActuator' ? 'Quiescent Current (A)' : 'Base Current (A)'}
                            </label>
                            <input 
                                type="number" min="0" step="0.001" 
                                value={device.baseCurrent} 
                                placeholder={deviceTypeInfo?.baseCurrent.toString() || '0'}
                                onChange={(e) => updateDevice(device.id, 'baseCurrent', handleNumericInput(e.target.value, 3, 0) ?? 0)} 
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Activated Current (A)</label>
                            <input 
                                type="number" min="0" step="0.001" 
                                value={device.activatedCurrent} 
                                placeholder={deviceTypeInfo?.activatedCurrent.toString() || '0'}
                                onChange={(e) => updateDevice(device.id, 'activatedCurrent', handleNumericInput(e.target.value, 3, 0) ?? 0)} 
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                    </div>

                    {/* Conditional Inputs for Fail-Secure Actuators - Always editable if applicable */}
                    {effectiveCategory === 'failSecureActuator' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 mb-3">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Actuations/Hour</label>
                              <input 
                                  type="number" min="0" step="1" 
                                  value={device.actuationsPerHour} 
                                  placeholder={(deviceTypeInfo?.actuationsPerHour || 0).toString()} 
                                  onChange={(e) => updateDevice(device.id, 'actuationsPerHour', handleNumericInput(e.target.value, 0, 0) ?? 0)} 
                                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Actuation Duration (sec)</label>
                              <input 
                                  type="number" min="0" step="0.1" 
                                  value={device.actuationDurationSecs} 
                                  placeholder={(deviceTypeInfo?.actuationDurationSecs || 0).toString()} 
                                  onChange={(e) => updateDevice(device.id, 'actuationDurationSecs', handleNumericInput(e.target.value, 1, 0) ?? 0)} 
                                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                          </div>
                      </div>
                    )}

                    {/* Custom Device Specific Configuration Block */}
                    {device.deviceType === 'custom' && (
                      <div className="bg-blue-50 p-3 rounded mt-2 mb-3 border border-blue-200">
                        <h5 className="text-sm font-medium text-blue-700 mb-2">Custom Device Type Configuration</h5>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Device Category</label>
                            <select 
                                value={device.customCategory || device.category} // Fallback if customCategory not set
                                onChange={(e) => updateDevice(device.id, 'customCategory', e.target.value as DeviceCategory)} 
                                className="w-full p-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                            >
                                <option value="equipment">Equipment (Continuous Load)</option>
                                <option value="failSafeActuator">Fail-Safe Actuator (Continuous Active Load)</option>
                                <option value="failSecureActuator">Fail-Secure Actuator (Intermittent Active Load)</option>
                            </select>
                        </div>
                         <p className="text-xs text-blue-600 mt-2 mb-2">
                            The current values above are editable. Use the fields below to set specific overrides if the main 'Custom Device' template defaults (e.g., 0A) are not desired. Overrides take precedence.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            <div>
                                <label className="block text-sm font-medium text-blue-700 mb-1">
                                    Custom {device.customCategory === 'failSecureActuator' ? 'Quiescent' : 'Base'} Current (A) (override)
                                </label>
                                <input type="number" min="0" step="0.001" 
                                       value={device.customBaseCurrent ?? ''} 
                                       placeholder={`Default: ${(DEVICE_TYPES.find(dt => dt.value === 'custom')?.baseCurrent || 0).toString()}`}
                                       onChange={(e) => updateDevice(device.id, 'customBaseCurrent', handleNumericInput(e.target.value, 3, 0))} 
                                       className="w-full p-2 border border-blue-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-700 mb-1">Custom Activated Current (A) (override)</label>
                                <input type="number" min="0" step="0.001" 
                                       value={device.customActivatedCurrent ?? ''} 
                                       placeholder={`Default: ${(DEVICE_TYPES.find(dt => dt.value === 'custom')?.activatedCurrent || 0).toString()}`}
                                       onChange={(e) => updateDevice(device.id, 'customActivatedCurrent', handleNumericInput(e.target.value, 3, 0))} 
                                       className="w-full p-2 border border-blue-300 rounded-md shadow-sm" />
                            </div>
                        </div>
                        {(device.customCategory === 'failSecureActuator') && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                <div>
                                    <label className="block text-sm font-medium text-blue-700 mb-1">Custom Actuations/Hour (override)</label>
                                    <input type="number" min="0" step="1" 
                                           value={device.customActuationsPerHour ?? ''} 
                                           placeholder={`Default: ${(DEVICE_TYPES.find(dt => dt.value === 'custom')?.actuationsPerHour || 0).toString()}`}
                                           onChange={(e) => updateDevice(device.id, 'customActuationsPerHour', handleNumericInput(e.target.value, 0, 0))} 
                                           className="w-full p-2 border border-blue-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-700 mb-1">Custom Actuation Duration (sec) (override)</label>
                                    <input type="number" min="0" step="0.1" 
                                           value={device.customActuationDurationSecs ?? ''} 
                                           placeholder={`Default: ${(DEVICE_TYPES.find(dt => dt.value === 'custom')?.actuationDurationSecs || 0).toString()}`}
                                           onChange={(e) => updateDevice(device.id, 'customActuationDurationSecs', handleNumericInput(e.target.value, 1, 0))} 
                                           className="w-full p-2 border border-blue-300 rounded-md shadow-sm" />
                                </div>
                            </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-3">
                      <button onClick={() => setEditingDeviceId(null)} className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700" > Done </button>
                    </div>
                  </div>
                ) : (
                  // Read-only View
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3 text-sm">
                        <div><p className="text-gray-600">Type:</p><p className="font-semibold text-gray-800">{deviceTypeInfo?.label || device.deviceType}</p></div>
                        <div><p className="text-gray-600">Category:</p><p className="font-semibold text-gray-800">{effectiveCategory}</p></div>
                        <div><p className="text-gray-600">Quantity:</p><p className="font-semibold text-gray-800">{device.quantity}</p></div>
                        <div>
                            <p className="text-gray-600">{effectiveCategory === 'failSecureActuator' ? 'Quiescent (ea):' : 'Base Current (ea):'}</p>
                            <p className="font-semibold text-gray-800">
                                {(device.deviceType === 'custom' && device.customCategory && device.customBaseCurrent !== undefined 
                                    ? device.customBaseCurrent 
                                    : device.baseCurrent).toFixed(3)} A
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">Active Current (ea):</p>
                            <p className="font-semibold text-gray-800">
                                {(device.deviceType === 'custom' && device.customCategory && device.customActivatedCurrent !== undefined 
                                    ? device.customActivatedCurrent 
                                    : device.activatedCurrent).toFixed(3)} A
                            </p>
                        </div>
                        {effectiveCategory === 'failSecureActuator' && (
                            <>
                                <div>
                                    <p className="text-gray-600">Acts/hr:</p>
                                    <p className="font-semibold text-gray-800">
                                        {(device.deviceType === 'custom' && device.customCategory && device.customActuationsPerHour !== undefined 
                                            ? device.customActuationsPerHour 
                                            : device.actuationsPerHour)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Act.Dur (s):</p>
                                    <p className="font-semibold text-gray-800">
                                        {(device.deviceType === 'custom' && device.customCategory && device.customActuationDurationSecs !== undefined 
                                            ? device.customActuationDurationSecs 
                                            : device.actuationDurationSecs)}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <div><p className="text-sm"><span className="text-gray-600">Avg. Load Contrib:</span><span className="ml-2 font-semibold text-gray-800">{device.averageLoadContribution.toFixed(3)} A</span></p></div>
                        <button onClick={() => setEditingDeviceId(device.id)} className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-50 flex items-center" > <Icons.Edit /><span className="ml-1">Edit</span></button>
                    </div>
                  </>
                )}
              </div>
              );
            })}
          </div>

          {/* Results Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
              <h4 className="font-medium text-gray-700 mb-3">Required Battery Capacity</h4>
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-grow">
                  <p className="text-sm text-gray-600">Raw Battery Capacity (C)</p>
                  <p className="font-semibold text-lg text-gray-800">{batteryCapacity.toFixed(2)} Ah</p>
                </div>
                <div className="h-16 border-l border-gray-300"></div>
                <div className="text-center flex-grow">
                  <p className="text-sm text-gray-600">Adjusted (De-rated) Capacity</p>
                  <p className="font-bold text-2xl text-blue-600">{adjustedCapacity.toFixed(2)} Ah</p>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Calculation Breakdown (C = t × I<sub>avg</sub>)</h5>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between"><span>Total Equipment & Quiescent Current (I<sub>equip</sub>):</span><span className="font-medium">{totalIEquip.toFixed(3)} A</span></div>
                  <div className="flex justify-between"><span>Total Fail-Safe Actuator Current (I<sub>fail-safe</sub>):</span><span className="font-medium">{totalIFailSafe.toFixed(3)} A</span></div>
                  <div className="flex justify-between"><span>Total Avg. Fail-Secure Active Current (I<sub>fail-secure_active_avg</sub>):</span><span className="font-medium">{totalIFailSecureAvg.toFixed(3)} A</span></div>
                  <div className="border-t border-gray-300 my-1"></div>
                  <div className="flex justify-between font-semibold"><span>Total Average Load (I<sub>avg</sub>):</span><span className="font-medium">{totalIAvg.toFixed(3)} A</span></div>
                  <div className="flex justify-between"><span>Required Standby Time (t):</span><span className="font-medium">{effectiveStandbyTime.toFixed(2)} hours</span></div>
                  <div className="border-t border-gray-300 my-1"></div>
                  <div className="flex justify-between"><span>Raw Capacity (C = t × I<sub>avg</sub>):</span><span className="font-medium">{batteryCapacity.toFixed(3)} Ah</span></div>
                  <div className="border-t border-gray-300 my-1"></div>
                  <div className="flex justify-between"><span>Battery Aging Factor:</span><span className="font-medium">× {settings.batteryAgingFactor.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Temperature Factor:</span><span className="font-medium">× {settings.temperatureFactor.toFixed(2)}</span></div>
                  {settings.includePowerSupplyEfficiency && (<div className="flex justify-between"><span>Power Supply Efficiency:</span><span className="font-medium">÷ {settings.powerSupplyEfficiency.toFixed(2)}</span></div>)}
                  <div className="border-t border-gray-300 my-1"></div>
                  <div className="flex justify-between font-medium"><span>Adjusted Battery Capacity:</span><span className="text-blue-700">{adjustedCapacity.toFixed(3)} Ah</span></div>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-md border border-green-200">
                <h5 className="font-medium text-green-800 mb-2">Recommended Battery Selection:</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm text-green-800">
                  {recommendedBatteries.map((battery, index) => ( <li key={index}>{battery}</li> ))}
                </ul>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
              <h4 className="font-medium text-gray-700 mb-3">System Requirements</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600 mb-1">Security Grade:</p>
                        <p className="font-medium">{settings.useCustomTimes ? 'Custom Requirements' : (SECURITY_GRADES.find(g => g.value === settings.securityGrade)?.label || 'N/A')}</p>
                        <p className="text-xs text-gray-500 mt-1">{settings.useCustomTimes ? 'Using custom timing requirements' : (SECURITY_GRADES.find(g => g.value === settings.securityGrade)?.description || '')}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 mb-1">Required Standby Time:</p>
                        <p className="font-medium">{effectiveStandbyTime.toFixed(2)} hours</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Power Supply Specifications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600 mb-1">Min. PSU Current (excl. battery charging):</p>
                        <p className="font-medium">{totalIAvg.toFixed(2)} A (average load) at {settings.systemVoltage}V</p>
                        <p className="text-xs text-gray-500 mt-1">PSU should also handle peak loads, which may exceed average load.</p>
                    </div>
                    <div>
                        <p className="text-gray-600 mb-1">Power Supply Features:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Battery charging circuit (temp. compensated recommended)</li>
                            <li>Deep discharge protection</li>
                            <li>Mains failure monitoring & indication</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Design Notes</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Ensure batteries are maintained fully charged. Replace every 3-5 years or as per manufacturer.</li>
                    <li>For 24V systems, use 24V batteries or two 12V batteries in series.</li>
                    <li>Low temperatures reduce battery performance; consider temperature factor.</li>
                    <li>Ensure adequate ventilation for battery enclosures.</li>
                    <li>PSU charger must recharge batteries to 80% within 24 hours (or as per standard).</li>
                </ul>
            </div>
          </div>
        </div>
      </div>
      
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Standby Battery Calculation Tutorial (IEC 60839-11-1 Annex B style)</h3>
              <button onClick={() => setShowTutorial(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-lg">Understanding Battery Capacity Calculation</h4>
                <p className="mt-1">This calculator helps determine standby battery capacity for access control systems, using a methodology similar to IEC 60839-11-1 Annex B. It calculates an average system current (I<sub>avg</sub>) and multiplies it by the required standby time (t) to find the raw capacity (C = t × I<sub>avg</sub>). De-rating factors are then applied.</p>
              </div>
              <div>
                <h4 className="font-medium">Step 1: System Parameters</h4>
                <ul className="list-disc pl-5 mt-1">
                  <li><strong>Security Grade:</strong> Select based on risk. This sets a default standby time (e.g., Grade 3: 2h, Grade 4: 4h, per IEC 60839-11-2 Table 2).</li>
                  <li><strong>System Voltage:</strong> Choose 12VDC or 24VDC.</li>
                  <li><strong>Custom Standby Time:</strong> Optionally override the grade-defined standby time.</li>
                  <li><strong>De-rating Factors:</strong>
                    <ul>
                      <li><em>Battery Aging:</em> Compensates for capacity loss over time (e.g., 1.25 for 25% extra).</li>
                      <li><em>Temperature:</em> Accounts for reduced performance in cold (e.g., 1.1 for 10% extra).</li>
                    </ul>
                  </li>
                  <li><strong>Power Supply Efficiency:</strong> If included, increases required battery capacity to account for PSU losses (e.g., 0.85 for 85% efficient PSU).</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Step 2: Add Devices</h4>
                <p className="mt-1">List all devices powered by the battery. For each device:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li><strong>Name & Quantity:</strong> For identification and count.</li>
                  <li><strong>Device Type:</strong> Choose a preset or 'Custom Device'. This determines its category and default electrical properties.</li>
                  <li><strong>Currents & Actuation Data:</strong> These values (Base Current, Activated Current, etc.) are pre-filled based on the Device Type but can be directly edited.</li>
                  <li>For 'Custom Device' type:
                    <ul>
                      <li><em>Device Category:</em> Select the behavior (Equipment, Fail-Safe, Fail-Secure).</li>
                      <li><em>Custom Current/Actuation Overrides:</em> Optionally provide specific values that take precedence over the (editable) base values for the 'Custom Device'.</li>
                    </ul>
                  </li>
                   <li>Device Categories for calculation:
                        <ul className="list-circle pl-4">
                            <li><strong>Equipment:</strong> Constant load (e.g., controllers, sensors). Uses 'Base Current'.</li>
                            <li><strong>Fail-Safe Actuator:</strong> Continuously powered when active (e.g., maglock powered to lock). Uses 'Activated Current'.</li>
                            <li><strong>Fail-Secure Actuator:</strong> Intermittently powered (e.g., electric strike pulsed to open). Uses 'Base/Quiescent Current', 'Activated Current' (during pulse), 'Actuations/Hour', and 'Actuation Duration (sec)'.</li>
                        </ul>
                      </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Step 3: Understanding Results</h4>
                <ul className="list-disc pl-5 mt-1">
                  <li><strong>I<sub>avg</sub> Breakdown:</strong> Shows total currents for Equipment & Quiescent (I<sub>equip</sub>), Fail-Safe Actuators (I<sub>fail-safe</sub>), and average for Fail-Secure Actuators' active part (I<sub>fail-secure_active_avg</sub>). These sum to I<sub>avg</sub>.</li>
                  <li><strong>Raw Capacity (C):</strong> Calculated as I<sub>avg</sub> × Standby Time (t).</li>
                  <li><strong>Adjusted Capacity:</strong> Raw capacity increased by de-rating factors and PSU efficiency. This is the target Ah for battery selection.</li>
                  <li><strong>Recommendations:</strong> Suggested battery sizes.</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-3 rounded-md">
                <h4 className="font-medium text-blue-800">Formula Summary</h4>
                <p className="text-xs mt-1 font-mono">
                  D<sub>i</sub> (Duty Cycle for one fail-secure device type) = (Actuations/Hour × Actuation Duration sec) / 3600
                </p>
                <p className="text-xs mt-1 font-mono">
                  I<sub>equip_total</sub> = Σ (Base Current<sub>equip/quiescent</sub> × Quantity)
                </p>
                <p className="text-xs mt-1 font-mono">
                  I<sub>fail-safe_total</sub> = Σ (Activated Current<sub>fs</sub> × Quantity)
                </p>
                <p className="text-xs mt-1 font-mono">
                  I<sub>fail-secure_active_avg_total</sub> = Σ (Activated Current<sub>fsc_pulse</sub> × D<sub>i</sub> × Quantity)
                </p>
                 <p className="text-xs mt-1 font-mono">
                  I<sub>avg</sub> = I<sub>equip_total</sub> + I<sub>fail-safe_total</sub> + I<sub>fail-secure_active_avg_total</sub>
                </p>
                <p className="text-xs mt-1 font-mono">
                  C<sub>raw</sub> = Standby Time (t) × I<sub>avg</sub>
                </p>
                <p className="text-xs mt-1 font-mono">
                  C<sub>adj</sub> = C<sub>raw</sub> × AgingFactor × TempFactor / (PSUEfficiency if included)
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowTutorial(false)} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Close Tutorial</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControlCalculator;
