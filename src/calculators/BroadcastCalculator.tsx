import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import TVSignalStrengthCalculator from './broadcast/TVSignalStrengthCalculator';
import OpticalFiberCalculator from './broadcast/OpticalFiberCalculator';
import ImpedanceMatchingCalculator from './broadcast/ImpedanceMatchingCalculator';
import RFParameterConverter from './broadcast/RFParameterConverter';
// Import additional calculators as they are developed

// Define props type for the component
interface BroadcastCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main Broadcast Reception Calculator component that coordinates the sub-calculators
const BroadcastCalculator: React.FC<BroadcastCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type and display mode
  const [calculatorType, setCalculatorType] = useState<string>(''); // 'signalStrength' or 'opticalFiber'
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Render the selected calculator
  const renderCalculator = () => {
    // Show tutorial if enabled
    // if (showTutorial && calculatorType) {
    //   return <TutorialContent calculatorType={calculatorType} onClose={() => setShowTutorial(false)} />;
    // }

    // Otherwise show the selected calculator
    switch (calculatorType) {
      case 'signalStrength':
        return <TVSignalStrengthCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'opticalFiber':
        return <OpticalFiberCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'impedance':
        return <ImpedanceMatchingCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'rfPara':
        return <RFParameterConverter onShowTutorial={() => setShowTutorial(true)} />;
      default:
        return null;
    }
  };

  // Main return for BroadcastCalculator
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
        Broadcast Reception Installation
      </h1>

      {/* Calculator Type Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'signalStrength'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('signalStrength')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'signalStrength' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">TV Signal Strength</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'signalStrength' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate signal based on components
              </p>
            </div>
          </button>

          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'opticalFiber'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('opticalFiber')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'opticalFiber' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Optical Fiber Power Budget</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'opticalFiber' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate power budget for fiber systems
              </p>
            </div>
          </button>

          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'impedance'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('impedance')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'impedance' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Impedance Matching</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'impedance' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Impedance Matching
              </p>
            </div>
          </button>
          
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'rfPara'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('rfPara')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'rfPara' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Parameter Converter</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'rfPara' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> RF parameter
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

export default BroadcastCalculator;