import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import CableSizingCalculator from './electrical/CableSizingCalculator';
import PowerFactorCalculator from './electrical/PowerFactorCalculator';
import CircuitProtectionCalculator from './electrical/CircuitProtectionCalculator';
import LightingControlCalculator from './electrical/LightingControlCalculator';
import LightingPowerDensityCalculator from './electrical/LightingPowerDensityCalculator';
import LoadBalancingCalculator from './electrical/LoadBalancingCalculator';
import CopperLossCalculator from './electrical/CopperLossCalculator';
import MaxCopperResistanceCalculator from './electrical/MaxCopperResistanceCalculator';
import ProtectionCoordinationCalculator from './electrical/ProtectionCoordinationCalculator';
import FuseOperationTimeCalculator from './electrical/FuseOperationTimeCalculator';
import TutorialContent from './electrical/TutorialContent';

// Define props type for the component
interface ElectricalCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main Electrical Installation Calculator component that coordinates the sub-calculators
const ElectricalCalculator: React.FC<ElectricalCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type and display mode
  const [calculatorType, setCalculatorType] = useState<string>(''); // 'cableSizing', 'powerFactor', 'circuitProtection', 'lightingControl', 'lpd', 'loadBalancing', 'copperLoss', 'maxResistance', or 'protectionCoordination'
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Render the selected calculator
  const renderCalculator = () => {
    // Show tutorial if enabled
    if (showTutorial && calculatorType) {
      return <TutorialContent calculatorType={calculatorType} onClose={() => setShowTutorial(false)} />;
    }

    // Otherwise show the selected calculator
    switch (calculatorType) {
      case 'cableSizing':
        return <CableSizingCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'powerFactor':
        return <PowerFactorCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'circuitProtection':
        return <CircuitProtectionCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'lightingControl':
        return <LightingControlCalculator />;
      case 'lpd':
        return <LightingPowerDensityCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'loadBalancing':
        return <LoadBalancingCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'copperLoss':
        return <CopperLossCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'maxResistance':
        return <MaxCopperResistanceCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'protectionCoordination':
        return <ProtectionCoordinationCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'fuseOperationTime':
        return <FuseOperationTimeCalculator onShowTutorial={() => setShowTutorial(true)} />;
      default:
        return null;
    }
  };

  // Main return for ElectricalCalculator
  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        <Icons.ArrowLeft /> Back to Disciplines
      </button>

      {/* Title specific to this discipline */}
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">
        Electrical Installation
      </h1>

      {/* Calculator Type Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'cableSizing'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('cableSizing')}
          >
            <h3 className="font-medium text-lg">Cable Sizing</h3>
            <p className="text-sm mt-1 text-gray-600">Calculate cable size</p>
          </button>

          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'copperLoss'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('copperLoss')}
          >
            <h3 className="font-medium text-lg">Copper Loss</h3>
            <p className="text-sm mt-1 text-gray-600">Circuit copper loss calculation</p>
          </button>

          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'maxResistance'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('maxResistance')}
          >
            <h3 className="font-medium text-lg">Max Copper Resistance</h3>
            <p className="text-sm mt-1 text-gray-600">Calculate maximum allowable resistance</p>
          </button>

          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'loadBalancing'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('loadBalancing')}
          >
            <h3 className="font-medium text-lg">Load Balancing</h3>
            <p className="text-sm mt-1 text-gray-600">Phase unbalance checker</p>
          </button>

          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'lightingControl'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('lightingControl')}
          >
            <h3 className="font-medium text-lg">Lighting Control</h3>
            <p className="text-sm mt-1 text-gray-600">Control points calculator</p>
          </button>

          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'lpd'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('lpd')}
          >
            <h3 className="font-medium text-lg">Lighting Power Density</h3>
            <p className="text-sm mt-1 text-gray-600">LPD calculation & compliance</p>
          </button>

          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'protectionCoordination'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('protectionCoordination')}
          >
            <h3 className="font-medium text-lg">Circuit Protection</h3>
            <p className="text-sm mt-1 text-gray-600">Main Incoming Circuit</p>
          </button>
          
          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'circuitProtection'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('circuitProtection')}
          >
            <h3 className="font-medium text-lg">Circuit Protection</h3>
            <p className="text-sm mt-1 text-gray-600">Cable thermal check</p>
          </button>

          <button
            className={`p-4 rounded-lg text-center transition-colors border ${
              calculatorType === 'powerFactor'
                ? 'bg-blue-100 border-blue-600 ring-2 ring-blue-300'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => setCalculatorType('powerFactor')}
          >
            <h3 className="font-medium text-lg">Power Factor</h3>
            <p className="text-sm mt-1 text-gray-600">Capacitor sizing</p>
          </button>

        </div>
      </div>

      {/* Render the selected calculator */}
      {calculatorType && renderCalculator()}
    </div>
  );
};

export default ElectricalCalculator;