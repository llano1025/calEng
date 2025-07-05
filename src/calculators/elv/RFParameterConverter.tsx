import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/Icons';
import CalculatorWrapper from '../../components/CalculatorWrapper';
import { useCalculatorActions } from '../../hooks/useCalculatorActions';

interface RFParameterConverterProps {
  onShowTutorial?: () => void;
}

// Define parameter types
type ParameterType = 'S' | 'ABCD' | 'Y' | 'Z';

// Define complex number type
interface ComplexNumber {
  real: number;
  imag: number;
}

// Define input parameters structure
interface ParameterInputs {
  p11: ComplexNumber;
  p12: ComplexNumber;
  p21: ComplexNumber;
  p22: ComplexNumber;
  frequency: number;
  z0: number; // Reference impedance, default 50 ohms
}

// Default complex number
const defaultComplex: ComplexNumber = { real: 0, imag: 0 };

// Create a Complex number helper class
class Complex {
  static add(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    return {
      real: a.real + b.real,
      imag: a.imag + b.imag
    };
  }

  static subtract(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    return {
      real: a.real - b.real,
      imag: a.imag - b.imag
    };
  }

  static multiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    return {
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real
    };
  }

  static divide(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const denominator = b.real * b.real + b.imag * b.imag;
    if (denominator === 0) {
      return { real: NaN, imag: NaN };
    }
    return {
      real: (a.real * b.real + a.imag * b.imag) / denominator,
      imag: (a.imag * b.real - a.real * b.imag) / denominator
    };
  }

  static inverse(a: ComplexNumber): ComplexNumber {
    const denominator = a.real * a.real + a.imag * a.imag;
    if (denominator === 0) {
      return { real: NaN, imag: NaN };
    }
    return {
      real: a.real / denominator,
      imag: -a.imag / denominator
    };
  }

  static magnitude(a: ComplexNumber): number {
    return Math.sqrt(a.real * a.real + a.imag * a.imag);
  }

  static phase(a: ComplexNumber): number {
    return Math.atan2(a.imag, a.real) * 180 / Math.PI;
  }

  static toString(a: ComplexNumber, precision: number = 4): string {
    const realPart = a.real.toFixed(precision);
    const imagPart = Math.abs(a.imag).toFixed(precision);
    
    if (a.imag === 0) {
      return realPart;
    } else if (a.real === 0) {
      return a.imag > 0 ? `j${imagPart}` : `-j${imagPart}`;
    } else {
      return a.imag > 0 ? `${realPart} + j${imagPart}` : `${realPart} - j${imagPart}`;
    }
  }

  static fromPolar(magnitude: number, phaseInDegrees: number): ComplexNumber {
    const phaseInRadians = phaseInDegrees * Math.PI / 180;
    return {
      real: magnitude * Math.cos(phaseInRadians),
      imag: magnitude * Math.sin(phaseInRadians)
    };
  }
}

// Define the 2x2 matrix type for network parameters
interface Matrix2x2 {
  m11: ComplexNumber;
  m12: ComplexNumber;
  m21: ComplexNumber;
  m22: ComplexNumber;
}

// Matrix operations
class Matrix {
  static determinant(m: Matrix2x2): ComplexNumber {
    return Complex.subtract(
      Complex.multiply(m.m11, m.m22),
      Complex.multiply(m.m12, m.m21)
    );
  }

  static inverse(m: Matrix2x2): Matrix2x2 {
    const det = Matrix.determinant(m);
    return {
      m11: Complex.divide(m.m22, det),
      m12: Complex.divide({ real: -m.m12.real, imag: -m.m12.imag }, det),
      m21: Complex.divide({ real: -m.m21.real, imag: -m.m21.imag }, det),
      m22: Complex.divide(m.m11, det)
    };
  }
}

const RFParameterConverter: React.FC<RFParameterConverterProps> = ({ onShowTutorial }) => {
  // Calculator actions hook
  const { exportData, saveCalculation, prepareExportData } = useCalculatorActions({
    title: 'RF Parameter Converter',
    discipline: 'elv',
    calculatorType: 'rf-parameter-converter'
  });

  // State for selected parameter type
  const [parameterType, setParameterType] = useState<ParameterType>('S');
  
  // State for input format (rectangular or polar)
  const [inputFormat, setInputFormat] = useState<'rectangular' | 'polar'>('rectangular');
  
  // State for input parameters
  const [inputs, setInputs] = useState<ParameterInputs>({
    p11: { ...defaultComplex },
    p12: { ...defaultComplex },
    p21: { ...defaultComplex },
    p22: { ...defaultComplex },
    frequency: 1000, // MHz
    z0: 50 // Ohms
  });

  // State for polar input values (magnitude and phase)
  const [polarInputs, setPolarInputs] = useState({
    p11: { magnitude: 0, phase: 0 },
    p12: { magnitude: 0, phase: 0 },
    p21: { magnitude: 0, phase: 0 },
    p22: { magnitude: 0, phase: 0 }
  });

  // State for calculation results
  const [results, setResults] = useState<{
    S: Matrix2x2;
    ABCD: Matrix2x2;
    Y: Matrix2x2;
    Z: Matrix2x2;
  } | null>(null);

  // State for calculation errors
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Update polarInputs when inputs change (for rectangular to polar conversion)
  useEffect(() => {
    if (inputFormat === 'rectangular') {
      setPolarInputs({
        p11: { 
          magnitude: Complex.magnitude(inputs.p11), 
          phase: Complex.phase(inputs.p11) 
        },
        p12: { 
          magnitude: Complex.magnitude(inputs.p12), 
          phase: Complex.phase(inputs.p12) 
        },
        p21: { 
          magnitude: Complex.magnitude(inputs.p21), 
          phase: Complex.phase(inputs.p21) 
        },
        p22: { 
          magnitude: Complex.magnitude(inputs.p22), 
          phase: Complex.phase(inputs.p22) 
        }
      });
    }
  }, [inputs, inputFormat]);

  // Update inputs when polarInputs change (for polar to rectangular conversion)
  useEffect(() => {
    if (inputFormat === 'polar') {
      setInputs(prev => ({
        ...prev,
        p11: Complex.fromPolar(polarInputs.p11.magnitude, polarInputs.p11.phase),
        p12: Complex.fromPolar(polarInputs.p12.magnitude, polarInputs.p12.phase),
        p21: Complex.fromPolar(polarInputs.p21.magnitude, polarInputs.p21.phase),
        p22: Complex.fromPolar(polarInputs.p22.magnitude, polarInputs.p22.phase)
      }));
    }
  }, [polarInputs, inputFormat]);

  // Handle input changes for rectangular format
  const handleInputChange = (parameter: keyof ParameterInputs, value: number | ComplexNumber) => {
    setInputs(prev => ({
      ...prev,
      [parameter]: value
    }));
  };

  // Handle complex input changes
  const handleComplexInputChange = (
    parameter: 'p11' | 'p12' | 'p21' | 'p22', 
    part: 'real' | 'imag', 
    value: number
  ) => {
    setInputs(prev => ({
      ...prev,
      [parameter]: {
        ...prev[parameter],
        [part]: value
      }
    }));
  };

  // Handle polar input changes
  const handlePolarInputChange = (
    parameter: 'p11' | 'p12' | 'p21' | 'p22',
    part: 'magnitude' | 'phase',
    value: number
  ) => {
    setPolarInputs(prev => ({
      ...prev,
      [parameter]: {
        ...prev[parameter],
        [part]: value
      }
    }));
  };

  // Convert from S parameters to Z parameters
  const StoZ = (s: Matrix2x2, z0: number): Matrix2x2 => {
    const z0Complex: ComplexNumber = { real: z0, imag: 0 };
    const one: ComplexNumber = { real: 1, imag: 0 };
    
    // Calculate denominator: (1-S11)*(1-S22) - S12*S21
    const term1 = Complex.multiply(
      Complex.subtract(one, s.m11),
      Complex.subtract(one, s.m22)
    );
    const term2 = Complex.multiply(s.m12, s.m21);
    const denominator = Complex.subtract(term1, term2);
    
    // Calculate Z11 = Z0 * ((1+S11)*(1-S22) + S12*S21) / denominator
    const z11Numerator = Complex.add(
      Complex.multiply(
        Complex.add(one, s.m11),
        Complex.subtract(one, s.m22)
      ),
      Complex.multiply(s.m12, s.m21)
    );
    const z11 = Complex.multiply(
      z0Complex,
      Complex.divide(z11Numerator, denominator)
    );
    
    // Calculate Z12 = Z0 * 2*S12 / denominator
    const z12Numerator = Complex.multiply({ real: 2, imag: 0 }, s.m12);
    const z12 = Complex.multiply(
      z0Complex,
      Complex.divide(z12Numerator, denominator)
    );
    
    // Calculate Z21 = Z0 * 2*S21 / denominator
    const z21Numerator = Complex.multiply({ real: 2, imag: 0 }, s.m21);
    const z21 = Complex.multiply(
      z0Complex,
      Complex.divide(z21Numerator, denominator)
    );
    
    // Calculate Z22 = Z0 * ((1-S11)*(1+S22) + S12*S21) / denominator
    const z22Numerator = Complex.add(
      Complex.multiply(
        Complex.subtract(one, s.m11),
        Complex.add(one, s.m22)
      ),
      Complex.multiply(s.m12, s.m21)
    );
    const z22 = Complex.multiply(
      z0Complex,
      Complex.divide(z22Numerator, denominator)
    );
    
    return { m11: z11, m12: z12, m21: z21, m22: z22 };
  };
  
  // Convert from Z parameters to S parameters
  const ZtoS = (z: Matrix2x2, z0: number): Matrix2x2 => {
    const z0Complex: ComplexNumber = { real: z0, imag: 0 };
    
    // Calculate denominator: (Z11+Z0)*(Z22+Z0) - Z12*Z21
    const term1 = Complex.multiply(
      Complex.add(z.m11, z0Complex),
      Complex.add(z.m22, z0Complex)
    );
    const term2 = Complex.multiply(z.m12, z.m21);
    const denominator = Complex.subtract(term1, term2);
    
    // Calculate S11 = ((Z11-Z0)*(Z22+Z0) - Z12*Z21) / denominator
    const s11Numerator = Complex.subtract(
      Complex.multiply(
        Complex.subtract(z.m11, z0Complex),
        Complex.add(z.m22, z0Complex)
      ),
      Complex.multiply(z.m12, z.m21)
    );
    const s11 = Complex.divide(s11Numerator, denominator);
    
    // Calculate S12 = 2*Z0*Z12 / denominator
    const s12Numerator = Complex.multiply(
      Complex.multiply({ real: 2, imag: 0 }, z0Complex),
      z.m12
    );
    const s12 = Complex.divide(s12Numerator, denominator);
    
    // Calculate S21 = 2*Z0*Z21 / denominator
    const s21Numerator = Complex.multiply(
      Complex.multiply({ real: 2, imag: 0 }, z0Complex),
      z.m21
    );
    const s21 = Complex.divide(s21Numerator, denominator);
    
    // Calculate S22 = ((Z22-Z0)*(Z11+Z0) - Z12*Z21) / denominator
    const s22Numerator = Complex.subtract(
      Complex.multiply(
        Complex.subtract(z.m22, z0Complex),
        Complex.add(z.m11, z0Complex)
      ),
      Complex.multiply(z.m12, z.m21)
    );
    const s22 = Complex.divide(s22Numerator, denominator);
    
    return { m11: s11, m12: s12, m21: s21, m22: s22 };
  };
  
  // Convert from Z parameters to Y parameters
  const ZtoY = (z: Matrix2x2): Matrix2x2 => {
    // Y = Z^-1
    return Matrix.inverse(z);
  };
  
  // Convert from Y parameters to Z parameters
  const YtoZ = (y: Matrix2x2): Matrix2x2 => {
    // Z = Y^-1
    return Matrix.inverse(y);
  };
  
  // Convert from Z parameters to ABCD parameters
  const ZtoABCD = (z: Matrix2x2): Matrix2x2 => {
    // A = Z11/Z21
    const a = Complex.divide(z.m11, z.m21);
    
    // B = (Z11*Z22 - Z12*Z21)/Z21 = det(Z)/Z21
    const b = Complex.divide(Matrix.determinant(z), z.m21);
    
    // C = 1/Z21
    const c = Complex.inverse(z.m21);
    
    // D = Z22/Z21
    const d = Complex.divide(z.m22, z.m21);
    
    return { m11: a, m12: b, m21: c, m22: d };
  };
  
  // Convert from ABCD parameters to Z parameters
  const ABCDtoZ = (abcd: Matrix2x2): Matrix2x2 => {
    // Z11 = A/C
    const z11 = Complex.divide(abcd.m11, abcd.m21);
    
    // Z12 = (A*D - B*C)/C = det(ABCD)/C
    const z12 = Complex.divide(Matrix.determinant(abcd), abcd.m21);
    
    // Z21 = 1/C
    const z21 = Complex.inverse(abcd.m21);
    
    // Z22 = D/C
    const z22 = Complex.divide(abcd.m22, abcd.m21);
    
    return { m11: z11, m12: z12, m21: z21, m22: z22 };
  };

  // Function to convert all parameters
  const convertParameters = () => {
    try {
      setCalculationError(null);
      
      let zParams: Matrix2x2;
      let sParams: Matrix2x2;
      let yParams: Matrix2x2;
      let abcdParams: Matrix2x2;
      
      // Start by creating the matrix based on the selected parameter type
      const inputMatrix: Matrix2x2 = {
        m11: inputs.p11,
        m12: inputs.p12,
        m21: inputs.p21,
        m22: inputs.p22
      };
      
      // Convert to Z parameters first as a common intermediate
      switch (parameterType) {
        case 'S':
          zParams = StoZ(inputMatrix, inputs.z0);
          sParams = inputMatrix;
          break;
          
        case 'Z':
          zParams = inputMatrix;
          sParams = ZtoS(zParams, inputs.z0);
          break;
          
        case 'Y':
          zParams = YtoZ(inputMatrix);
          sParams = ZtoS(zParams, inputs.z0);
          break;
          
        case 'ABCD':
          zParams = ABCDtoZ(inputMatrix);
          sParams = ZtoS(zParams, inputs.z0);
          break;
          
        default:
          throw new Error("Invalid parameter type");
      }
      
      // Calculate the remaining parameter types
      yParams = ZtoY(zParams);
      abcdParams = ZtoABCD(zParams);
      
      // Set the results
      const calculatedResults = {
        S: sParams,
        Z: zParams,
        Y: yParams,
        ABCD: abcdParams
      };
      
      setResults(calculatedResults);
      
      // Save calculation and prepare export data
      const calculationInputs = {
        parameterType,
        inputFormat,
        inputs,
        polarInputs
      };
      
      saveCalculation(calculationInputs, calculatedResults);
      prepareExportData(calculationInputs, calculatedResults);
    } catch (error) {
      console.error("Calculation error:", error);
      setCalculationError("Error in parameter conversion. Check your input values and try again.");
    }
  };

  // Format the matrix display for results
  const formatMatrix = (matrix: Matrix2x2 | undefined, label: string) => {
    if (!matrix) return null;
    
    return (
      <div className="bg-white p-3 rounded-md mb-3 shadow-sm border border-gray-200">
        <h4 className="font-medium text-gray-700">{label} Parameters</h4>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m11)}</td>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m12)}</td>
              </tr>
              <tr>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m21)}</td>
                <td className="p-2 text-center font-medium border border-gray-300">{Complex.toString(matrix.m22)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm text-gray-600">{label}₁₁ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m11).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₁₁ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m11).toFixed(2)}°</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₁₂ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m12).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₁₂ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m12).toFixed(2)}°</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₁ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m21).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₁ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m21).toFixed(2)}°</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₂ Magnitude:</p>
            <p className="font-semibold text-gray-800">{Complex.magnitude(matrix.m22).toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}₂₂ Phase:</p>
            <p className="font-semibold text-gray-800">{Complex.phase(matrix.m22).toFixed(2)}°</p>
          </div>
        </div>
      </div>
    );
  };

  // Format a 2x2 parameter matrix for display
  const parameterDisplayNames: Record<ParameterType, string> = {
    'S': 'Scattering (S)',
    'Z': 'Impedance (Z)',
    'Y': 'Admittance (Y)',
    'ABCD': 'Transmission (ABCD)'
  };

  // Unit labels for each parameter type
  const parameterUnits: Record<ParameterType, string> = {
    'S': 'dimensionless',
    'Z': 'Ω (ohms)',
    'Y': 'S (siemens)',
    'ABCD': 'mixed'
  };

  // Parameter descriptions
  const parameterDescriptions: Record<ParameterType, string> = {
    'S': 'Scattering parameters represent reflection and transmission coefficients',
    'Z': 'Impedance parameters relate voltages to currents',
    'Y': 'Admittance parameters relate currents to voltages',
    'ABCD': 'Transmission parameters relate input voltage/current to output voltage/current'
  };

  return (
    <CalculatorWrapper
      title="RF Parameter Converter Calculator"
      discipline="elv"
      calculatorType="rf-parameter-converter"
      onShowTutorial={onShowTutorial}
      exportData={exportData}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-lg mb-4 text-gray-700">Parameter Input</h3>
          
          {/* Parameter Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Parameter Type</label>
            <select
              value={parameterType}
              onChange={(e) => setParameterType(e.target.value as ParameterType)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="S">Scattering (S) Parameters</option>
              <option value="Z">Impedance (Z) Parameters</option>
              <option value="Y">Admittance (Y) Parameters</option>
              <option value="ABCD">Transmission (ABCD) Parameters</option>
            </select>
            <p className="text-xs mt-1 text-gray-500">{parameterDescriptions[parameterType]}</p>
          </div>
          
          {/* Input Format Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Input Format</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input type="radio" name="inputFormat" checked={inputFormat === 'rectangular'} onChange={() => setInputFormat('rectangular')} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                <span className="text-sm text-gray-700">Rectangular (Real + Imaginary)</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="inputFormat" checked={inputFormat === 'polar'} onChange={() => setInputFormat('polar')} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                <span className="text-sm text-gray-700">Polar (Magnitude & Phase)</span>
              </label>
            </div>
          </div>
          
          {/* Global settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (MHz)</label>
              <input
                type="number"
                value={inputs.frequency}
                onChange={(e) => handleInputChange('frequency', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                step="any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Impedance (Z₀, Ω)</label>
              <input
                type="number"
                value={inputs.z0}
                onChange={(e) => handleInputChange('z0', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                step="any"
              />
            </div>
          </div>
          
          {/* Parameter Matrix Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {parameterDisplayNames[parameterType]} Matrix Input ({parameterUnits[parameterType]})
            </label>
            
            <div className="bg-white p-3 rounded-md border border-gray-200 mb-4">
              {inputFormat === 'rectangular' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* P11 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₁</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Real</label>
                        <input
                          type="number"
                          value={inputs.p11.real}
                          onChange={(e) => handleComplexInputChange('p11', 'real', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Imag</label>
                        <input
                          type="number"
                          value={inputs.p11.imag}
                          onChange={(e) => handleComplexInputChange('p11', 'imag', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* P12 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₂</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Real</label>
                        <input
                          type="number"
                          value={inputs.p12.real}
                          onChange={(e) => handleComplexInputChange('p12', 'real', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Imag</label>
                        <input
                          type="number"
                          value={inputs.p12.imag}
                          onChange={(e) => handleComplexInputChange('p12', 'imag', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* P21 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₁</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Real</label>
                        <input
                          type="number"
                          value={inputs.p21.real}
                          onChange={(e) => handleComplexInputChange('p21', 'real', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Imag</label>
                        <input
                          type="number"
                          value={inputs.p21.imag}
                          onChange={(e) => handleComplexInputChange('p21', 'imag', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* P22 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₂</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Real</label>
                        <input
                          type="number"
                          value={inputs.p22.real}
                          onChange={(e) => handleComplexInputChange('p22', 'real', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Imag</label>
                        <input
                          type="number"
                          value={inputs.p22.imag}
                          onChange={(e) => handleComplexInputChange('p22', 'imag', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* P11 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₁</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                        <input
                          type="number"
                          value={polarInputs.p11.magnitude}
                          onChange={(e) => handlePolarInputChange('p11', 'magnitude', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                        <input
                          type="number"
                          value={polarInputs.p11.phase}
                          onChange={(e) => handlePolarInputChange('p11', 'phase', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* P12 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₁₂</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                        <input
                          type="number"
                          value={polarInputs.p12.magnitude}
                          onChange={(e) => handlePolarInputChange('p12', 'magnitude', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                        <input
                          type="number"
                          value={polarInputs.p12.phase}
                          onChange={(e) => handlePolarInputChange('p12', 'phase', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* P21 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₁</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                        <input
                          type="number"
                          value={polarInputs.p21.magnitude}
                          onChange={(e) => handlePolarInputChange('p21', 'magnitude', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                        <input
                          type="number"
                          value={polarInputs.p21.phase}
                          onChange={(e) => handlePolarInputChange('p21', 'phase', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* P22 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{parameterType}₂₂</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Magnitude</label>
                        <input
                          type="number"
                          value={polarInputs.p22.magnitude}
                          onChange={(e) => handlePolarInputChange('p22', 'magnitude', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Phase (°)</label>
                        <input
                          type="number"
                          value={polarInputs.p22.phase}
                          onChange={(e) => handlePolarInputChange('p22', 'phase', Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          step="any"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Convert Button */}
          <div className="flex justify-center">
            <button
              onClick={convertParameters}
              className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              Convert Parameters
            </button>
          </div>

          {/* Error Display */}
          {calculationError && (
            <div className="mt-4 bg-red-100 p-3 rounded-md border border-red-300">
              <p className="text-sm text-red-700">{calculationError}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-lg mb-4 text-blue-700">Calculation Results</h3>
          
          {!results ? (
            <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200 text-center">
              <p className="text-gray-500">Enter values and click "Convert Parameters" to see results</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-md shadow mb-6 border border-gray-200">
                <h4 className="font-medium text-base text-gray-700">Conversion Summary</h4>
                <p className="text-sm text-gray-600 mt-2">
                  Converted from {parameterDisplayNames[parameterType]} at {inputs.frequency} MHz with Z₀ = {inputs.z0} Ω
                </p>
                
                {/* Parameter Determinants - useful to verify valid network */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Z Matrix Determinant:</p>
                    <p className="font-semibold text-gray-800">
                      {Complex.toString(Matrix.determinant(results.Z))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reciprocal Network:</p>
                    <p className="font-semibold text-gray-800">
                      {Complex.magnitude(Complex.subtract(results.Z.m12, results.Z.m21)) < 0.0001 ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Display different parameter matrices */}
              {formatMatrix(results.S, 'S')}
              {formatMatrix(results.Z, 'Z')}
              {formatMatrix(results.Y, 'Y')}
              {formatMatrix(results.ABCD, 'ABCD')}
            </>
          )}
          
          <div className="mt-6 bg-blue-100 p-4 rounded-md border border-blue-300">
            <h4 className="font-medium mb-2 text-blue-700">Network Properties</h4>
            {results ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {/* Show network properties based on S-parameters */}
                <div>
                  <p className="text-blue-800">Input Return Loss:</p>
                  <p className="font-semibold text-blue-900">
                    {(-20 * Math.log10(Complex.magnitude(results.S.m11))).toFixed(2)} dB
                  </p>
                </div>
                <div>
                  <p className="text-blue-800">Output Return Loss:</p>
                  <p className="font-semibold text-blue-900">
                    {(-20 * Math.log10(Complex.magnitude(results.S.m22))).toFixed(2)} dB
                  </p>
                </div>
                <div>
                  <p className="text-blue-800">Forward Insertion Loss:</p>
                  <p className="font-semibold text-blue-900">
                    {(-20 * Math.log10(Complex.magnitude(results.S.m21))).toFixed(2)} dB
                  </p>
                </div>
                <div>
                  <p className="text-blue-800">Reverse Insertion Loss:</p>
                  <p className="font-semibold text-blue-900">
                    {(-20 * Math.log10(Complex.magnitude(results.S.m12))).toFixed(2)} dB
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-800">Convert parameters to see network properties</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg mb-2 text-gray-700">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>This calculator handles complex values for all 2-port network parameters. Enter values in rectangular (real + imaginary) or polar (magnitude, phase) format.</li>
          <li>S-parameters are dimensionless ratios of incident and reflected waves. Z parameters have units of ohms, Y parameters have units of siemens, and ABCD parameters have mixed units.</li>
          <li>Reference impedance Z₀ (typically 50Ω) is only used for conversions involving S-parameters.</li>
          <li>For passive networks, the real part of Z₁₁ and Z₂₂ should be positive.</li>
          <li>For reciprocal networks, Z₁₂ should equal Z₂₁, and the same symmetry applies to other parameter types.</li>
          <li>Phase values are displayed in degrees. Use negative numbers for negative phase angles.</li>
          <li>For lossless networks, S-parameter magnitudes for reflections (S₁₁, S₂₂) plus transmissions (S₁₂, S₂₁) should sum to 1.</li>
        </ul>
      </div>
      </div>
    </CalculatorWrapper>
  );
};

export default RFParameterConverter;