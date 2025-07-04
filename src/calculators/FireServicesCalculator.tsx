import React, { useState } from 'react';
import { Icons } from '../components/Icons';

// Define props type for the component
interface FireServicesCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main Fire Services Calculator component
const FireServicesCalculator: React.FC<FireServicesCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type
  const [calculatorType, setCalculatorType] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Placeholder for future sub-calculators
  const renderCalculator = () => {
    switch (calculatorType) {
      case 'sprinkler_system':
        return <div className="p-6 text-center text-gray-500">Sprinkler System Calculator - Coming Soon</div>;
      case 'fire_pump':
        return <div className="p-6 text-center text-gray-500">Fire Pump Calculator - Coming Soon</div>;
      case 'smoke_extraction':
        return <div className="p-6 text-center text-gray-500">Smoke Extraction Calculator - Coming Soon</div>;
      case 'fire_alarm':
        return <div className="p-6 text-center text-gray-500">Fire Alarm Calculator - Coming Soon</div>;
      default:
        return null;
    }
  };

  // Main return for FireServicesCalculator
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
        Fire Services
      </h1>

      {/* Calculator Type Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Sprinkler System Design */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'sprinkler_system'
                ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-1'
                : 'bg-red-50 hover:bg-red-100 border-red-100'
            }`}
            onClick={() => setCalculatorType('sprinkler_system')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'sprinkler_system' ? 'text-white' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Sprinkler System</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'sprinkler_system' ? 'text-red-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Design sprinkler systems and calculate flow rates
              </p>
            </div>
          </button>

          {/* Fire Pump Sizing */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'fire_pump'
                ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-1'
                : 'bg-red-50 hover:bg-red-100 border-red-100'
            }`}
            onClick={() => setCalculatorType('fire_pump')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'fire_pump' ? 'text-white' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Fire Pump Sizing</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'fire_pump' ? 'text-red-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate fire pump requirements and pressure
              </p>
            </div>
          </button>

          {/* Smoke Extraction */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'smoke_extraction'
                ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-1'
                : 'bg-red-50 hover:bg-red-100 border-red-100'
            }`}
            onClick={() => setCalculatorType('smoke_extraction')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'smoke_extraction' ? 'text-white' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Smoke Extraction</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'smoke_extraction' ? 'text-red-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Design smoke extraction and ventilation systems
              </p>
            </div>
          </button>

          {/* Fire Alarm System */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'fire_alarm'
                ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-1'
                : 'bg-red-50 hover:bg-red-100 border-red-100'
            }`}
            onClick={() => setCalculatorType('fire_alarm')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'fire_alarm' ? 'text-white' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Fire Alarm System</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'fire_alarm' ? 'text-red-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Design fire detection and alarm systems
              </p>
            </div>
          </button>

        </div>
      </div>

      {/* Render Selected Calculator */}
      {calculatorType && (
        <div className="bg-white rounded-lg shadow-lg">
          {renderCalculator()}
        </div>
      )}
    </div>
  );
};

export default FireServicesCalculator;