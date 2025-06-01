import React, { useState } from 'react';
import { Icons } from '../../components/Icons';
import MPECalculator from './MPECalculator';
import NOHDCalculator from './NOHDCalculator';
import LaserClassificationCalculator from './LaserClassificationCalculator';
import ProtectiveEyewearCalculator from './ProtectiveEyewearCalculator';

// Define props type for the component
interface LaserSafetyCalculatorProps {
  onShowTutorial?: () => void;
}

// The main Laser Safety Calculator component that coordinates the sub-calculators
const LaserSafetyCalculator: React.FC<LaserSafetyCalculatorProps> = ({ onShowTutorial }) => {
  // State for the selected calculator type
  const [activeTab, setActiveTab] = useState<'mpe' | 'nohd' | 'classification' | 'eyewear'>('classification');

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Laser Safety Calculations</h2>
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

        {/* Tab Selector */}
        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'mpe'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('mpe')}
          >
            MPE Calculator
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'nohd'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('nohd')}
          >
            NOHD Calculator
          </button>
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'classification'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('classification')}
          >
            Laser Classification
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'eyewear'
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('eyewear')}
          >
            Protective Eyewear
          </button>
        </div>
        
        {/* Content Based on Active Tab */}
        {activeTab === 'mpe' && <MPECalculator onShowTutorial={onShowTutorial} />}
        {activeTab === 'nohd' && <NOHDCalculator onShowTutorial={onShowTutorial} />}
        {activeTab === 'classification' && <LaserClassificationCalculator onShowTutorial={onShowTutorial} />}
        {activeTab === 'eyewear' && <ProtectiveEyewearCalculator onShowTutorial={onShowTutorial} />}
      </div>

      {/* Enhanced Information Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-700">About Enhanced Laser Safety Calculations</h3>
        
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Key Enhancements</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>C5 Correction Factor:</strong> Proper implementation of IEC 60825-1 pulse train correction for multiple pulse exposures within thermal confinement time (Ti).</li>
              <li><strong>Enhanced AEL Tables:</strong> Complete IEC 60825-1:2014 Section 5.1 classification with all measurement conditions and correction factors.</li>
              <li><strong>Time Base Considerations:</strong> Wavelength-dependent thermal confinement times per IEC Table 2 for accurate pulse grouping.</li>
              <li><strong>Pulse Parameter Validation:</strong> Physical consistency checks for pulse width, repetition rate, and duty cycle.</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Calculator Features</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>MPE Calculator:</strong> Maximum Permissible Exposure with enhanced three-rule criteria for pulsed lasers.</li>
              <li><strong>NOHD Calculator:</strong> Nominal Ocular Hazard Distance using accurate MPE calculations and beam propagation.</li>
              <li><strong>Classification:</strong> Complete IEC 60825-1:2014 laser classification with proper Class M evaluation and C5 corrections.</li>
              <li><strong>Protective Eyewear:</strong> Optical density requirements with EN 207 and ANSI Z136 marking guidance.</li>
            </ul>
          </div>
        </div> */}

        <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center">
            <Icons.InfoInline />
            <span className="ml-1">Important Safety Notice</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="mb-2"><strong>Standards Compliance:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Based on IEC 60825-1:2014 international standard</li>
                <li>Enhanced with proper C5 pulse train corrections</li>
                <li>Includes all measurement conditions and aperture requirements</li>
                <li>Wavelength range: 180 nm - 1,000,000 nm</li>
              </ul>
            </div>
            <div>
              <p className="mb-2"><strong>Usage Guidelines:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Always verify calculations with current standard documents</li>
                <li>Consider environmental factors and operational conditions</li>
                <li>Implement engineering and administrative controls first</li>
                <li>Consult qualified laser safety officer for critical applications</li>
              </ul>
            </div>
          </div>
        </div>

        {/* <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">C5 Correction Factor Implementation</h4>
          <p className="text-sm text-yellow-800 mb-2">
            This enhanced implementation properly calculates the C5 correction factor according to IEC 60825-1:2014, 
            accounting for multiple pulse exposure effects within the thermal confinement time (Ti). The algorithm includes:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
            <ul className="list-disc pl-5 space-y-1">
              <li>Wavelength-dependent time base (Ti) determination</li>
              <li>Automatic pulse grouping for exposures spanning longer than Ti</li>
              <li>Proper application of N^(-0.25) formula for thermal accumulation</li>
            </ul>
            <ul className="list-disc pl-5 space-y-1">
              <li>Integration with all AEL calculations</li>
              <li>Detailed step-by-step calculation transparency</li>
              <li>Validation for physical consistency of pulse parameters</li>
            </ul>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default LaserSafetyCalculator;