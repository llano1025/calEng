import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import LiftTrafficCalculator from './lift/LiftTrafficCalculator';
import EscalatorCalculator from './lift/EscalatorCalculator';
import LiftRopeCalculator from './lift/LiftRopeCalculator';
import TutorialContent from './electrical/TutorialContent';

// Define props type for the component
interface VerticalTransportationCalculatorProps {
  onBack: () => void; // Function to navigate back
}

// The main Vertical Transportation Calculator component
const VerticalTransportationCalculator: React.FC<VerticalTransportationCalculatorProps> = ({ onBack }) => {
  // State for the selected calculator type
  const [calculatorType, setCalculatorType] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Show tutorial if enabled
  if (showTutorial && calculatorType) {
    return <TutorialContent calculatorType={calculatorType} onClose={() => setShowTutorial(false)} />;
  }

  // Render the selected calculator
  const renderCalculator = () => {
    switch (calculatorType) {
      case 'elevator_traffic':
        return <LiftTrafficCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'escalator_capacity':
        return <EscalatorCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'lift_rope':
        return <LiftRopeCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'lift_power':
        return <div className="p-6 text-center text-gray-500">Lift Power Calculation - Coming Soon</div>;
      case 'shaft_sizing':
        return <div className="p-6 text-center text-gray-500">Shaft Sizing Calculator - Coming Soon</div>;
      default:
        return null;
    }
  };

  // Main return for VerticalTransportationCalculator
  return (
    <div className="animate-fade-in">

      {/* Title specific to this discipline */}
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">
        Vertical Transportation
      </h1>

      {/* Calculator Type Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Elevator Traffic Analysis */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'elevator_traffic'
                ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-1'
                : 'bg-purple-50 hover:bg-purple-100 border-purple-100'
            }`}
            onClick={() => setCalculatorType('elevator_traffic')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'elevator_traffic' ? 'text-white' : 'text-purple-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Elevator Traffic Analysis</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'elevator_traffic' ? 'text-purple-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Lift traffic analysis including RTT calculations and performance metrics
              </p>
            </div>
          </button>

          {/* Escalator Capacity */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'escalator_capacity'
                ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-1'
                : 'bg-purple-50 hover:bg-purple-100 border-purple-100'
            }`}
            onClick={() => setCalculatorType('escalator_capacity')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'escalator_capacity' ? 'text-white' : 'text-purple-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Escalator Capacity</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'escalator_capacity' ? 'text-purple-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Escalator capacity calculations with K-factors analysis
              </p>
            </div>
          </button>

          {/* Lift Power Calculation */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'lift_rope'
                ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-1'
                : 'bg-purple-50 hover:bg-purple-100 border-purple-100'
            }`}
            onClick={() => setCalculatorType('lift_rope')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'lift_rope' ? 'text-white' : 'text-purple-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Lift Rope Calculation</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'lift_rope' ? 'text-purple-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculator for minimium number of lift ropes
              </p>
            </div>
          </button>

          {/* Lift Power Calculation */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'lift_power'
                ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-1'
                : 'bg-purple-50 hover:bg-purple-100 border-purple-100'
            }`}
            onClick={() => setCalculatorType('lift_power')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'lift_power' ? 'text-white' : 'text-purple-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Lift Power Calculation</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'lift_power' ? 'text-purple-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Comprehensive electrical power calculations for lift motors, drives, and auxiliary systems per IEC standards
              </p>
            </div>
          </button>

          {/* Shaft Sizing */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'shaft_sizing'
                ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-1'
                : 'bg-purple-50 hover:bg-purple-100 border-purple-100'
            }`}
            onClick={() => setCalculatorType('shaft_sizing')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'shaft_sizing' ? 'text-white' : 'text-purple-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Shaft Sizing</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'shaft_sizing' ? 'text-purple-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Precise elevator shaft sizing calculations including clearances, machine room requirements, and safety considerations
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

export default VerticalTransportationCalculator;