import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import TVSignalStrengthCalculator from './elv/TVSignalStrengthCalculator';
import OpticalFiberCalculator from './elv/OpticalFiberCalculator';
import ImpedanceMatchingCalculator from './elv/ImpedanceMatchingCalculator';
import RFParameterConverter from './elv/RFParameterConverter';
import MicrostripCalculator from './elv/MicrostripCalculator';
import CCTVSystemCalculator from './elv/CCTVSystemCalculator';
import PublicAddressCalculator from './elv/PublicAddressCalculator';
import AccessControlCalculator from './elv/AccessControlCalculator';
import AudioVisualCalculator from './elv/AudioVisualCalculator';
import RadiationCalculator from './elv/RadiationCalculator';
import IPSubnetCalculator from './elv/IPSubnetCalculator';
import HeatLoadRackCalculator from './elv/HeatLoadRackCalculator';
import WirelessCoverageCalculator from './elv/WirelessCoverageCalculator';
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
      case 'microStrip':
        return <MicrostripCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'cctv':
        return <CCTVSystemCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'pa':
        return <PublicAddressCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'acs':
        return <AccessControlCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'av':
        return <AudioVisualCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'radio':
        return <RadiationCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'ip':
        return <IPSubnetCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'rack':
        return <HeatLoadRackCalculator onShowTutorial={() => setShowTutorial(true)} />;
      case 'wireless':
        return <WirelessCoverageCalculator onShowTutorial={() => setShowTutorial(true)} />;
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
        Extra Low Voltage Installation
      </h1>

      {/* Calculator Type Selection - UPDATED STYLING to match ElectricalCalculator.tsx */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5 text-gray-700 border-b pb-2">Select Calculator Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* TV Signal Strength */}
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

          {/* Optical Fiber Power Budget */}
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

          {/* Impedance Matching */}
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
                <Icons.InfoInline /> Network analysis and matching
              </p>
            </div>
          </button>
          
          {/* RF Parameter Converter */}
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
              <h3 className="font-semibold text-sm sm:text-base">RF Parameter Converter</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'rfPara' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Convert between RF units and parameters
              </p>
            </div>
          </button>

          {/* Microstrip Line */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'microStrip'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('microStrip')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'microStrip' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Microstrip Line</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'microStrip' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate microstrip impedance and dimensions
              </p>
            </div>
          </button>

          {/* CCTV */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'cctv'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('cctv')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'cctv' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">CCTV Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'cctv' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate CCTV storage, bandwidth, coverage and power
              </p>
            </div>
          </button>

          {/* PA */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'pa'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('pa')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'pa' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Public Address Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'pa' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate PA coverage, SPL, power, cable loss, reverbation time
              </p>
            </div>
          </button>

          {/* ACS */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'acs'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('acs')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'acs' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Access Control Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'acs' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate power budget of access control system
              </p>
            </div>
          </button>

          {/* AV */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'av'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('av')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'av' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Audio Visual Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'av' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate projector sizing and throw length
              </p>
            </div>
          </button>
          
          {/* Radioactive */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'radio'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('radio')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'radio' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Radioation Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'radio' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate dosage of radioactive source
              </p>
            </div>
          </button>

          {/* IP subnet */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'ip'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('ip')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'ip' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Network Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'ip' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate variable length subnet masking
              </p>
            </div>
          </button>

          {/* IP subnet */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'rack'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('rack')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'rack' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Rack Load Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'rack' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate the power and cooling load of rack
              </p>
            </div>
          </button>

          {/* Wireless */}
          <button
            className={`p-4 rounded-lg transition-all duration-300 ease-in-out shadow hover:shadow-md border text-left flex items-start space-x-3 ${
              calculatorType === 'wireless'
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
            }`}
            onClick={() => setCalculatorType('wireless')}
          >
            <div className="flex-shrink-0 pt-1">
              <Icons.Calculator className={`${calculatorType === 'wireless' ? 'text-white' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Wireless Coverage Calculator</h3>
              <p className={`text-xs sm:text-sm ${calculatorType === 'wireless' ? 'text-indigo-100' : 'text-gray-600'}`}>
                <Icons.InfoInline /> Calculate wireless coverage
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