import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';

interface GensetLouverSizingCalculatorProps {
  onShowTutorial?: () => void;
}

const GensetLouverSizingCalculator: React.FC<GensetLouverSizingCalculatorProps> = ({ onShowTutorial }) => {
  // State for input values
  const [gensetCapacity, setGensetCapacity] = useState<number>(2000); // Default 2000 kVA
  const [radiatorAirFlow, setRadiatorAirFlow] = useState<number>(1584); // Default 1584 m³/min
  const [combustionRate, setCombustionRate] = useState<number>(135.8); // Default 135.8 m³/min
  
  // Split intake and exhaust louver areas
  const [intakeLouverArea, setIntakeLouverArea] = useState<number>(17); // Default 17 m²
  const [exhaustLouverArea, setExhaustLouverArea] = useState<number>(17); // Default 17 m²
  const [louverEfficiency, setLouverEfficiency] = useState<number>(50); // Default 50%
  
  // Split silencer K-factors
  const [intakeSilencerKFactor, setIntakeSilencerKFactor] = useState<number>(5.1); // Default 5.1
  const [exhaustSilencerKFactor, setExhaustSilencerKFactor] = useState<number>(5.1); // Default 5.1
  
  // User input pressure drops
  const [intakeLouverPressureDrop, setIntakeLouverPressureDrop] = useState<number>(0.055); // Default 0.055 inch w.g.
  const [exhaustLouverPressureDrop, setExhaustLouverPressureDrop] = useState<number>(0.05); // Default 0.05 inch w.g.

  // State for calculated values
  const [intakeEffectiveArea, setIntakeEffectiveArea] = useState<number>(0);
  const [exhaustEffectiveArea, setExhaustEffectiveArea] = useState<number>(0);
  const [intakeVelocity, setIntakeVelocity] = useState<number>(0);
  const [exhaustVelocity, setExhaustVelocity] = useState<number>(0);
  const [intakeSilencerVelocity, setIntakeSilencerVelocity] = useState<number>(0);
  const [exhaustSilencerVelocity, setExhaustSilencerVelocity] = useState<number>(0);
  const [intakeSilencerPressureDrop, setIntakeSilencerPressureDrop] = useState<number>(0);
  const [exhaustSilencerPressureDrop, setExhaustSilencerPressureDrop] = useState<number>(0);
  const [totalSystemPressureDrop, setTotalSystemPressureDrop] = useState<number>(0);
  const [isPressureDropAcceptable, setIsPressureDropAcceptable] = useState<boolean>(true);

  // Calculate all values whenever inputs change
  useEffect(() => {
    // Calculate effective areas
    const intakeEffectiveAreaValue = intakeLouverArea * (louverEfficiency / 100);
    const exhaustEffectiveAreaValue = exhaustLouverArea * (louverEfficiency / 100);
    
    setIntakeEffectiveArea(intakeEffectiveAreaValue);
    setExhaustEffectiveArea(exhaustEffectiveAreaValue);

    // Calculate velocities
    const intakeVelocityValue = (radiatorAirFlow + combustionRate) / intakeEffectiveAreaValue;
    const exhaustVelocityValue = radiatorAirFlow / exhaustEffectiveAreaValue;
    
    setIntakeVelocity(intakeVelocityValue);
    setExhaustVelocity(exhaustVelocityValue);

    // Calculate silencer velocities and pressure drops
    const intakeSilencerVelocityValue = (radiatorAirFlow + combustionRate) / intakeLouverArea;
    const exhaustSilencerVelocityValue = radiatorAirFlow / exhaustLouverArea;
    
    setIntakeSilencerVelocity(intakeSilencerVelocityValue);
    setExhaustSilencerVelocity(exhaustSilencerVelocityValue);

    // Convert to m/s for pressure drop calculation
    const intakeSilencerVelocityMS = intakeSilencerVelocityValue / 60;
    const exhaustSilencerVelocityMS = exhaustSilencerVelocityValue / 60;

    // Calculate silencer pressure drops using K x V² formula
    const intakeSilencerPressureDropPa = intakeSilencerKFactor * intakeSilencerVelocityMS * intakeSilencerVelocityMS;
    const exhaustSilencerPressureDropPa = exhaustSilencerKFactor * exhaustSilencerVelocityMS * exhaustSilencerVelocityMS;
    
    // Convert Pa to inch w.g. (1 Pa = 0.004 inch w.g. approx)
    const intakeSilencerPressureDropInch = intakeSilencerPressureDropPa / 249.08;
    const exhaustSilencerPressureDropInch = exhaustSilencerPressureDropPa / 249.08;
    
    setIntakeSilencerPressureDrop(intakeSilencerPressureDropInch);
    setExhaustSilencerPressureDrop(exhaustSilencerPressureDropInch);

    // Calculate total system pressure drop
    const totalPressureDrop = 
      Number(intakeLouverPressureDrop) + 
      Number(exhaustLouverPressureDrop) + 
      intakeSilencerPressureDropInch + 
      exhaustSilencerPressureDropInch;
    
    setTotalSystemPressureDrop(totalPressureDrop);
    
    // Check if pressure drop is acceptable (less than 0.5 inch w.g.)
    setIsPressureDropAcceptable(totalPressureDrop <= 0.5);
  }, [
    gensetCapacity, 
    radiatorAirFlow, 
    combustionRate, 
    intakeLouverArea, 
    exhaustLouverArea, 
    louverEfficiency, 
    intakeSilencerKFactor, 
    exhaustSilencerKFactor,
    intakeLouverPressureDrop,
    exhaustLouverPressureDrop
  ]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Genset Louver Sizing Calculator</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Input Parameters</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genset Capacity (kVA)
            </label>
            <input
              type="number"
              value={gensetCapacity}
              onChange={(e) => setGensetCapacity(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radiator Air Flow Rate (m³/min)
            </label>
            <input
              type="number"
              value={radiatorAirFlow}
              onChange={(e) => setRadiatorAirFlow(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Combustion Rate (m³/min)
            </label>
            <input
              type="number"
              value={combustionRate}
              onChange={(e) => setCombustionRate(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="border-t border-gray-300 my-4"></div>
          
          <h4 className="font-medium mb-3">Louver Parameters</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intake Louver Area (m²)
            </label>
            <input
              type="number"
              value={intakeLouverArea}
              onChange={(e) => setIntakeLouverArea(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exhaust Louver Area (m²)
            </label>
            <input
              type="number"
              value={exhaustLouverArea}
              onChange={(e) => setExhaustLouverArea(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Louver Efficiency (%)
            </label>
            <input
              type="number"
              value={louverEfficiency}
              onChange={(e) => setLouverEfficiency(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="border-t border-gray-300 my-4"></div>
          
          <h4 className="font-medium mb-3">Pressure Drop Values</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intake Louver Pressure Drop (inch w.g.)
            </label>
            <input
              type="number"
              value={intakeLouverPressureDrop}
              onChange={(e) => setIntakeLouverPressureDrop(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
              step="0.001"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exhaust Louver Pressure Drop (inch w.g.)
            </label>
            <input
              type="number"
              value={exhaustLouverPressureDrop}
              onChange={(e) => setExhaustLouverPressureDrop(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
              step="0.001"
            />
          </div>

          <div className="border-t border-gray-300 my-4"></div>
          
          <h4 className="font-medium mb-3">Silencer Parameters</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intake Silencer K-Factor
            </label>
            <input
              type="number"
              value={intakeSilencerKFactor}
              onChange={(e) => setIntakeSilencerKFactor(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
              step="0.1"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exhaust Silencer K-Factor
            </label>
            <input
              type="number"
              value={exhaustSilencerKFactor}
              onChange={(e) => setExhaustSilencerKFactor(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
              step="0.1"
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4">Calculation Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Total System Pressure Drop</p>
              <p className={`text-lg ${isPressureDropAcceptable ? 'text-green-600' : 'text-red-600'}`}>
                {totalSystemPressureDrop.toFixed(3)} inch w.g.
                {isPressureDropAcceptable ? ' ✓' : ' ✗'}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium mb-2">Intake Louver Details</h4>
            
            <div className="bg-white p-3 rounded-md mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-600">Effective Area</p>
                  <p>{intakeEffectiveArea.toFixed(2)} m²</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pressure Drop</p>
                  <p>{Number(intakeLouverPressureDrop).toFixed(3)} inch w.g.</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Velocity (m/min)</p>
                  <p>{intakeVelocity.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Velocity (m/s)</p>
                  <p>{(intakeVelocity / 60).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Velocity (fpm)</p>
                  <p>{(intakeVelocity * 3.28084).toFixed(1)}</p>
                </div>
              </div>
            </div>
            
            <h4 className="font-medium mb-2">Exhaust Louver Details</h4>
            
            <div className="bg-white p-3 rounded-md mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-600">Effective Area</p>
                  <p>{exhaustEffectiveArea.toFixed(2)} m²</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pressure Drop</p>
                  <p>{Number(exhaustLouverPressureDrop).toFixed(3)} inch w.g.</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Velocity (m/min)</p>
                  <p>{exhaustVelocity.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Velocity (m/s)</p>
                  <p>{(exhaustVelocity / 60).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Velocity (fpm)</p>
                  <p>{(exhaustVelocity * 3.28084).toFixed(1)}</p>
                </div>
              </div>
            </div>
            
            <h4 className="font-medium mb-2">Silencer Details</h4>
            
            <div className="bg-white p-3 rounded-md mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-600">Intake Silencer</p>
                  <p>K-Factor: {intakeSilencerKFactor.toFixed(1)}</p>
                  <p>Velocity: {(intakeSilencerVelocity / 60).toFixed(2)} m/s</p>
                  <p>Pressure Drop: {intakeSilencerPressureDrop.toFixed(3)} inch w.g.</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Exhaust Silencer</p>
                  <p>K-Factor: {exhaustSilencerKFactor.toFixed(1)}</p>
                  <p>Velocity: {(exhaustSilencerVelocity / 60).toFixed(2)} m/s</p>
                  <p>Pressure Drop: {exhaustSilencerPressureDrop.toFixed(3)} inch w.g.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-md mb-4">
              <h5 className="font-medium mb-2">Pressure Drop Summary</h5>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Component</th>
                    <th className="p-2 text-right">Pressure Drop (inch w.g.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-t">Intake Louver</td>
                    <td className="p-2 border-t text-right">{Number(intakeLouverPressureDrop).toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-t">Intake Silencer</td>
                    <td className="p-2 border-t text-right">{intakeSilencerPressureDrop.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-t">Exhaust Louver</td>
                    <td className="p-2 border-t text-right">{Number(exhaustLouverPressureDrop).toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-t">Exhaust Silencer</td>
                    <td className="p-2 border-t text-right">{exhaustSilencerPressureDrop.toFixed(3)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="p-2 border-t">Total System</td>
                    <td className={`p-2 border-t text-right ${isPressureDropAcceptable ? 'text-green-600' : 'text-red-600'}`}>
                      {totalSystemPressureDrop.toFixed(3)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Info section */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>According to Building Department regulations, Intake Louvers must be at least 5m away from any exhaust source (genset exhaust, flues, car park exhaust, etc.).</li>
          <li>The system pressure drop should not exceed 0.5 inch w.g. for most applications.</li>
          <li>Pressure drop values should be verified against manufacturer's specifications for the selected louver model.</li>
          <li>K-factors for silencers can typically be obtained from suppliers. The default value of 5.1 is an estimate.</li>
        </ul>
      </div>
    </div>
  );
};

export default GensetLouverSizingCalculator;