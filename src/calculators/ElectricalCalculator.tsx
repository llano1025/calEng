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
import CableContainmentCalculator from './electrical/CableContainmentCalculator';
import UPSCalculator from './electrical/UPSCalculator';
import GensetLouverSizingCalculator from './electrical/GensetLouverSizingCalculator';
import CombinedGeneratorCalculator from './electrical/GeneratorSizingCalculator';
import TutorialContent from './electrical/TutorialContent';

// Define props type for the component
interface ElectricalCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main Electrical Installation Calculator component that coordinates the sub-calculators
const ElectricalCalculator: React.FC<ElectricalCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type and display mode
  const [calculatorType, setCalculatorType] = useState<string>(''); // 'cableSizing', 'powerFactor', etc.
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
      case 'cableContainment':
        return <CableContainmentCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'ups':
        return <UPSCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'gensetLouver':
        return <GensetLouverSizingCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'genset':
        return <CombinedGeneratorCalculator onShowTutorial={() => setShowTutorial(true)} />;
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

      {/* Calculator Type Selection - UPDATED STYLING */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Cable Sizing */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'cableSizing'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('cableSizing')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'cableSizing' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Cable Sizing</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'cableSizing' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate cable size
              </p>
            </div>
          </button>

          {/* Copper Loss */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'copperLoss'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('copperLoss')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'copperLoss' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Copper Loss</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'copperLoss' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Circuit copper loss calculation
              </p>
            </div>
          </button>

          {/* Max Copper Resistance */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'maxResistance'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('maxResistance')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'maxResistance' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Max Copper Resistance</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'maxResistance' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Maximum allowable resistance
              </p>
            </div>
          </button>

          {/* Load Balancing */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'loadBalancing'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('loadBalancing')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'loadBalancing' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Load Balancing</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'loadBalancing' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Phase unbalance checker
              </p>
            </div>
          </button>

          {/* Lighting Control */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'lightingControl'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('lightingControl')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'lightingControl' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Lighting Control</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'lightingControl' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Control points calculator
              </p>
            </div>
          </button>

          {/* Lighting Power Density */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'lpd'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('lpd')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'lpd' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Lighting Power Density</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'lpd' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> LPD calculation & compliance
              </p>
            </div>
          </button>

          {/* Power Factor */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'powerFactor'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('powerFactor')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'powerFactor' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Power Factor</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'powerFactor' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Capacitor sizing
              </p>
            </div>
          </button>

          {/* Circuit Protection */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'circuitProtection'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('circuitProtection')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'circuitProtection' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Circuit Protection</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'circuitProtection' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Circuit Protection check
              </p>
            </div>
          </button>

          {/* Cable Containment */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'cableContainment'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('cableContainment')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'cableContainment' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Cable Containment</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'cableContainment' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Conduit & trunking capacity
              </p>
            </div>
          </button>

          {/* UPS Calculator - New addition */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'ups'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('ups')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'ups' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Uninterruptible Power Supply</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'ups' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> UPS & battery calculations
              </p>
            </div>
          </button>
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3  ${
              calculatorType === 'genset'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('genset')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'genset' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Generator Set</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'genset' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Generator sizing
              </p>
            </div>
          </button>

        </div>
      </div>

      {/* Render the selected calculator */}
      {calculatorType && renderCalculator()}
    </div>
  );
};

export default ElectricalCalculator;