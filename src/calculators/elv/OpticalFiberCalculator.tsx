import React, { useState } from 'react';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface OpticalFiberCalculatorProps {
  onShowTutorial?: () => void;
}

const OpticalFiberCalculator: React.FC<OpticalFiberCalculatorProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'Optical Fiber Power Budget Calculator',
    discipline: 'elv',
    calculatorType: 'opticalFiber'
  });
  // Define fiber types and their attenuation rates
  const fiberTypes = [
    // Multi-mode fibers
    { value: 'multimode850', label: 'OM1 (62.5μm) @ 850nm', attenuation: 3.5 },
    { value: 'multimode1300', label: 'OM1 (62.5μm) @ 1300nm', attenuation: 1.0 },
    { value: 'om2_850', label: 'OM2 (50μm) @ 850nm', attenuation: 3.5 },
    { value: 'om2_1300', label: 'OM2 (50μm) @ 1300nm', attenuation: 1.0 },
    { value: 'om3_850', label: 'OM3 (50μm) @ 850nm', attenuation: 3.0 },
    { value: 'om3_1300', label: 'OM3 (50μm) @ 1300nm', attenuation: 1.0 },
    { value: 'om4_850', label: 'OM4 (50μm) @ 850nm', attenuation: 2.5 },
    { value: 'om4_1300', label: 'OM4 (50μm) @ 1300nm', attenuation: 0.8 },
    { value: 'om5_850', label: 'OM5 (50μm) @ 850nm', attenuation: 2.3 },
    { value: 'om5_1300', label: 'OM5 (50μm) @ 1300nm', attenuation: 0.8 },
    // Single-mode fibers
    { value: 'singlemode1310', label: 'G.652 SMF @ 1310nm', attenuation: 0.35 },
    { value: 'singlemode1550', label: 'G.652 SMF @ 1550nm', attenuation: 0.20 },
    { value: 'g655_1550', label: 'G.655 NZDSF @ 1550nm', attenuation: 0.22 },
    { value: 'g655_1625', label: 'G.655 NZDSF @ 1625nm', attenuation: 0.25 },
    { value: 'g657_1310', label: 'G.657 Bend-insensitive @ 1310nm', attenuation: 0.35 },
    { value: 'g657_1550', label: 'G.657 Bend-insensitive @ 1550nm', attenuation: 0.20 }
  ];

  // Define common transceiver types for SFP+
  const transceiverTypes = [
    { value: 'custom', label: 'Custom (Enter manually)', tx: null, rx: null },
    { value: 'sx', label: 'SFP+ SX (850nm, MM, 300m)', tx: '-1', rx: '-17' },
    { value: 'lr', label: 'SFP+ LR (1310nm, SM, 10km)', tx: '-3', rx: '-20' },
    { value: 'er', label: 'SFP+ ER (1550nm, SM, 40km)', tx: '2', rx: '-24' },
    { value: 'zx', label: 'SFP+ ZX (1550nm, SM, 80km)', tx: '0', rx: '-24' },
    { value: 'dwdm', label: 'DWDM SFP+ (1550nm, SM, 80km)', tx: '0', rx: '-24' },
    { value: 'bidi', label: 'BiDi SFP+ (1310/1490nm, SM, 10km)', tx: '-3', rx: '-20' }
  ];

  // State for optical fiber calculator inputs
  const [opticalFiberInputs, setOpticalFiberInputs] = useState({
    transceiverType: 'custom', // New field for transceiver type selection
    transmitterPower: '0',     // New field for transmitter power (dBm)
    receiverSensitivity: '-20', // New field for receiver sensitivity (dBm)
    fiberLength: '300',        // Length in meters
    fiberType: 'singlemode1310', // Changed default to single-mode
    connectorCount: '2',       // Connectors (e.g., LC, SC)
    splices: '0',              // New field for fusion splices
    mechanicalJoints: '0',     // Mechanical splices
    patchPanels: '0',          // Patch panels
    bends: '0',                // New field for significant bends
    splitters: '0',            // New field for optical splitters
    safetyMargin: '3'          // Safety/design margin
  });

  // State for calculation results
  const [opticalLossResults, setOpticalLossResults] = useState<any>(null);

  // Handler for input changes
  const handleOpticalFiberInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setOpticalFiberInputs({ ...opticalFiberInputs, [e.target.name]: e.target.value });
  };

  // Calculate optical fiber power budget
  const calculateOpticalFiberLoss = () => {
    const fiberLength = parseFloat(opticalFiberInputs.fiberLength) / 1000; // Convert to km
    const fiberType = opticalFiberInputs.fiberType;
    const connectorCount = parseInt(opticalFiberInputs.connectorCount);
    const splices = parseInt(opticalFiberInputs.splices);
    const mechanicalJoints = parseInt(opticalFiberInputs.mechanicalJoints);
    const patchPanels = parseInt(opticalFiberInputs.patchPanels);
    const bends = parseInt(opticalFiberInputs.bends);
    const splitters = parseInt(opticalFiberInputs.splitters);
    const transmitterPower = parseFloat(opticalFiberInputs.transmitterPower);
    const receiverSensitivity = parseFloat(opticalFiberInputs.receiverSensitivity);
    const safetyMargin = parseFloat(opticalFiberInputs.safetyMargin);
    
    // Find the selected fiber type and get its attenuation
    const selectedFiber = fiberTypes.find(ft => ft.value === fiberType);
    const fiberAttenuationRate = selectedFiber ? selectedFiber.attenuation : 0.4; // Default if not found
    
    // Validate inputs
    if (isNaN(fiberLength) || isNaN(connectorCount) || isNaN(splices) || 
        isNaN(mechanicalJoints) || isNaN(patchPanels) || isNaN(bends) ||
        isNaN(splitters) || isNaN(transmitterPower) || 
        isNaN(receiverSensitivity) || isNaN(safetyMargin)) {
      alert("Please enter valid numeric inputs for all fields.");
      return;
    }
    
    // Calculate individual losses
    const connectorLoss = connectorCount * 0.5; // 0.5 dB per connector
    const fiberLoss = fiberLength * fiberAttenuationRate;
    const spliceLoss = splices * 0.1; // 0.1 dB per fusion splice
    const mechanicalJointLoss = mechanicalJoints * 0.5; // 0.5 dB per mechanical joint
    const patchPanelLoss = patchPanels * 0.5; // 0.5 dB per patch panel
    const bendLoss = bends * 0.5; // 0.5 dB per significant bend
    const splitterLoss = splitters > 0 ? (3.5 * Math.log2(splitters * 2)) : 0; // Loss for optical splitters
    
    // Calculate total link loss
    const subtotalLoss = connectorLoss + fiberLoss + spliceLoss + 
                         mechanicalJointLoss + patchPanelLoss + 
                         bendLoss + splitterLoss;
    const totalLoss = subtotalLoss + safetyMargin;
    
    // Calculate power budget and margin
    const powerBudget = transmitterPower - receiverSensitivity;
    const powerMargin = powerBudget - totalLoss;
    
    // Determine if the link is viable
    const isLinkViable = powerMargin >= 0;
    let linkStatus = isLinkViable 
      ? 'Viable Link - Sufficient Power Budget' 
      : 'Link Failure - Insufficient Power Budget';
      
    // Add warning for very high margin (potential receiver saturation)
    if (powerMargin > 10) {
      linkStatus = 'Viable Link - Warning: High Power Margin (consider attenuation)';
    }
    
    // Set the calculation results
    const results = {
      connectorLoss: connectorLoss.toFixed(2),
      fiberLoss: fiberLoss.toFixed(2),
      spliceLoss: spliceLoss.toFixed(2),
      mechanicalJointLoss: mechanicalJointLoss.toFixed(2),
      patchPanelLoss: patchPanelLoss.toFixed(2),
      bendLoss: bendLoss.toFixed(2),
      splitterLoss: splitterLoss.toFixed(2),
      subtotalLoss: subtotalLoss.toFixed(2),
      safetyMargin: safetyMargin.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      powerBudget: powerBudget.toFixed(2),
      powerMargin: powerMargin.toFixed(2),
      linkStatus
    };
    
    setOpticalLossResults(results);
    
    // Save calculation and prepare export data
    saveCalculation(opticalFiberInputs, results);
    prepareExportData(opticalFiberInputs, results);
  };

  return (
    <CalculatorWrapper
      title="Optical Fiber Power Budget Calculator"
      discipline="elv"
      calculatorType="opticalFiber"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">
      <p className="mb-4 text-gray-600">
        Calculate power budget and signal loss in fiber optic transmission systems based on components and their attenuation.
      </p>
      
      {/* Transceiver Properties */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Transceiver Properties</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1 text-sm">Transceiver Type</label>
            <select 
              name="transceiverType" 
              value={opticalFiberInputs.transceiverType} 
              onChange={(e) => {
                const selectedType = e.target.value;
                const transceiver = transceiverTypes.find(t => t.value === selectedType);
                if (transceiver && transceiver.tx !== null && transceiver.rx !== null) {
                  setOpticalFiberInputs({
                    ...opticalFiberInputs,
                    transceiverType: selectedType,
                    transmitterPower: transceiver.tx,
                    receiverSensitivity: transceiver.rx
                  });
                } else {
                  setOpticalFiberInputs({
                    ...opticalFiberInputs,
                    transceiverType: selectedType
                  });
                }
              }}
              className="w-full p-2 border rounded-md text-sm"
            >
              {transceiverTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Transmitter Output Power (dBm)</label>
            <input 
              type="number" 
              name="transmitterPower" 
              value={opticalFiberInputs.transmitterPower} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Receiver Sensitivity (dBm)</label>
            <input 
              type="number" 
              name="receiverSensitivity" 
              value={opticalFiberInputs.receiverSensitivity} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
              step="0.1"
            />
          </div>
        </div>
      </div>
      
      {/* Fiber Properties */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Fiber Properties</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1 text-sm">Fiber Length (meters)</label>
            <input 
              type="number" 
              name="fiberLength" 
              value={opticalFiberInputs.fiberLength} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Fiber Type</label>
            <select 
              name="fiberType" 
              value={opticalFiberInputs.fiberType} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            >
              <optgroup label="Multi-mode Fiber">
                {fiberTypes.filter(t => t.value.includes('multimode') || t.value.includes('om')).map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} ({type.attenuation} dB/km)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Single-mode Fiber">
                {fiberTypes.filter(t => t.value.includes('singlemode') || t.value.includes('g65')).map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} ({type.attenuation} dB/km)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>
      
      {/* Components and Attenuation */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Component Attenuation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1 text-sm">Connectors</label>
            <input 
              type="number" 
              name="connectorCount" 
              value={opticalFiberInputs.connectorCount} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">0.3-0.5 dB per connection</p>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Fusion Splices</label>
            <input 
              type="number" 
              name="splices" 
              value={opticalFiberInputs.splices} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">0.1-0.2 dB per splice</p>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Mechanical Joints</label>
            <input 
              type="number" 
              name="mechanicalJoints" 
              value={opticalFiberInputs.mechanicalJoints} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">0.5-1.0 dB per joint</p>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Patch Panels</label>
            <input 
              type="number" 
              name="patchPanels" 
              value={opticalFiberInputs.patchPanels} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">0.5-1.0 dB per panel</p>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Splitters (1:N)</label>
            <input 
              type="number" 
              name="splitters" 
              value={opticalFiberInputs.splitters} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">~3.5 dB for 1:2, ~7 dB for 1:4</p>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Bends</label>
            <input 
              type="number" 
              name="bends" 
              value={opticalFiberInputs.bends} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">0.5-1.0 dB per bend</p>
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm">Safety Margin (dB)</label>
            <input 
              type="number" 
              name="safetyMargin" 
              value={opticalFiberInputs.safetyMargin} 
              onChange={handleOpticalFiberInputChange} 
              className="w-full p-2 border rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Recommended: 3-5 dB</p>
          </div>
        </div>
      </div>
      
      {/* Calculate Button */}
      <button 
        onClick={calculateOpticalFiberLoss} 
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
      >
        Calculate Power Budget
      </button>
      
      {/* Results */}
      {opticalLossResults && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <h3 className="text-lg font-semibold mb-2">Power Budget Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
            <div className="col-span-2 bg-blue-100 p-2 rounded mb-2">
              <span className="font-medium">Total Power Budget:</span> {opticalLossResults.powerBudget} dB
              <p className="text-xs text-gray-600 mt-1">Transmitter Power - Receiver Sensitivity</p>
            </div>
            
            <div className="col-span-2 mt-2">
              <h4 className="font-medium">Link Loss Components:</h4>
            </div>
            
            <div><span className="font-medium">Fiber Cable Loss:</span> {opticalLossResults.fiberLoss} dB</div>
            <div><span className="font-medium">Connector Loss:</span> {opticalLossResults.connectorLoss} dB</div>
            <div><span className="font-medium">Splice Loss:</span> {opticalLossResults.spliceLoss} dB</div>
            <div><span className="font-medium">Mechanical Joint Loss:</span> {opticalLossResults.mechanicalJointLoss} dB</div>
            <div><span className="font-medium">Patch Panel Loss:</span> {opticalLossResults.patchPanelLoss} dB</div>
            <div><span className="font-medium">Bend Loss:</span> {opticalLossResults.bendLoss} dB</div>
            <div><span className="font-medium">Splitter Loss:</span> {opticalLossResults.splitterLoss} dB</div>
            <div><span className="font-medium">Safety Margin:</span> {opticalLossResults.safetyMargin} dB</div>
            
            <div className="col-span-2 bg-blue-100 p-2 rounded mt-2">
              <span className="font-medium">Total Link Loss:</span> {opticalLossResults.totalLoss} dB
            </div>
            
            <div className="col-span-2 mt-4">
              <span className="font-medium">Power Margin:</span>{' '}
              <span className={`font-bold ${parseFloat(opticalLossResults.powerMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {opticalLossResults.powerMargin} dB
              </span>
              <p className="text-xs text-gray-600 mt-1">Power Budget - Total Loss (should be &gt; 0)</p>
            </div>
            
            <div className="col-span-2 mt-2">
              <span className="font-medium">Link Status:</span>{' '}
              <span className={`font-bold ${opticalLossResults.linkStatus.includes('Viable') ? 'text-green-600' : 'text-red-600'}`}>
                {opticalLossResults.linkStatus}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* SFP+ Transceiver Reference Table */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">SFP+ Transceiver Reference</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3 text-left border">Type</th>
                <th className="py-2 px-3 text-left border">Wavelength</th>
                <th className="py-2 px-3 text-left border">Distance</th>
                <th className="py-2 px-3 text-left border">Tx Power (dBm)</th>
                <th className="py-2 px-3 text-left border">Rx Sensitivity (dBm)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3 border">SX</td>
                <td className="py-2 px-3 border">850nm</td>
                <td className="py-2 px-3 border">Up to 300m</td>
                <td className="py-2 px-3 border">-1 to -7.3</td>
                <td className="py-2 px-3 border">-17</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">LX/LR</td>
                <td className="py-2 px-3 border">1310nm</td>
                <td className="py-2 px-3 border">Up to 10km</td>
                <td className="py-2 px-3 border">-3 to -9.5</td>
                <td className="py-2 px-3 border">-20</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">EX</td>
                <td className="py-2 px-3 border">1310nm</td>
                <td className="py-2 px-3 border">Up to 40km</td>
                <td className="py-2 px-3 border">0 to -3</td>
                <td className="py-2 px-3 border">-23</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">ZX</td>
                <td className="py-2 px-3 border">1550nm</td>
                <td className="py-2 px-3 border">Up to 80km</td>
                <td className="py-2 px-3 border">0 to 4</td>
                <td className="py-2 px-3 border">-24</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">ER</td>
                <td className="py-2 px-3 border">1550nm</td>
                <td className="py-2 px-3 border">Up to 40km</td>
                <td className="py-2 px-3 border">2 to 5</td>
                <td className="py-2 px-3 border">-24</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Values may vary by manufacturer. Always check specific transceiver specifications.
        </p>
      </div>
      
      {/* Fiber Types Reference Table */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Fiber Types and Attenuation</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3 text-left border">Type</th>
                <th className="py-2 px-3 text-left border">Diameter (Core/Cladding)</th>
                <th className="py-2 px-3 text-left border">Wavelength</th>
                <th className="py-2 px-3 text-left border">Attenuation (dB/km)</th>
                <th className="py-2 px-3 text-left border">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {/* Multi-mode Fiber Types */}
              <tr>
                <td className="py-2 px-3 border">OM1</td>
                <td className="py-2 px-3 border">62.5/125 μm</td>
                <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                <td className="py-2 px-3 border">3.0-3.5<br />1.0-1.5</td>
                <td className="py-2 px-3 border">Legacy networks, short distances</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">OM2</td>
                <td className="py-2 px-3 border">50/125 μm</td>
                <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                <td className="py-2 px-3 border">3.0-3.5<br />1.0-1.5</td>
                <td className="py-2 px-3 border">Up to 1Gb/s networks, medium distances</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">OM3</td>
                <td className="py-2 px-3 border">50/125 μm</td>
                <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                <td className="py-2 px-3 border">2.5-3.0<br />0.8-1.5</td>
                <td className="py-2 px-3 border">10Gb/s networks, up to 300m</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">OM4</td>
                <td className="py-2 px-3 border">50/125 μm</td>
                <td className="py-2 px-3 border">850 nm<br />1300 nm</td>
                <td className="py-2 px-3 border">2.5-3.0<br />0.8-1.5</td>
                <td className="py-2 px-3 border">10-40Gb/s networks, up to 550m</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">OM5</td>
                <td className="py-2 px-3 border">50/125 μm</td>
                <td className="py-2 px-3 border">850-953 nm<br />1300 nm</td>
                <td className="py-2 px-3 border">2.3-2.8<br />0.8-1.5</td>
                <td className="py-2 px-3 border">WDM applications, 100Gb/s</td>
              </tr>
              
              {/* Single-mode Fiber Types */}
              <tr>
                <td className="py-2 px-3 border">G.652 (Standard SMF)</td>
                <td className="py-2 px-3 border">9/125 μm</td>
                <td className="py-2 px-3 border">1310 nm<br />1550 nm</td>
                <td className="py-2 px-3 border">0.30-0.40<br />0.16-0.25</td>
                <td className="py-2 px-3 border">General purpose, long-distance</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">G.653 (DSF)</td>
                <td className="py-2 px-3 border">9/125 μm</td>
                <td className="py-2 px-3 border">1550 nm</td>
                <td className="py-2 px-3 border">0.20-0.25</td>
                <td className="py-2 px-3 border">Long-haul applications</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">G.655 (NZDSF)</td>
                <td className="py-2 px-3 border">9/125 μm</td>
                <td className="py-2 px-3 border">1550 nm<br />1625 nm</td>
                <td className="py-2 px-3 border">0.20-0.25<br />0.23-0.30</td>
                <td className="py-2 px-3 border">DWDM systems, optimized for 1550nm</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border">G.657 (Bend-insensitive)</td>
                <td className="py-2 px-3 border">9/125 μm</td>
                <td className="py-2 px-3 border">1310 nm<br />1550 nm</td>
                <td className="py-2 px-3 border">0.30-0.40<br />0.18-0.25</td>
                <td className="py-2 px-3 border">FTTH, indoor wiring, tight bends</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          SMF = Single-mode Fiber, DSF = Dispersion Shifted Fiber, NZDSF = Non-Zero Dispersion Shifted Fiber
        </p>
      </div>
      </div>
    </CalculatorWrapper>
  );
};

export default OpticalFiberCalculator;