import React, { useState, useEffect } from 'react';
import { InputValidator, ValidationRule, ValidationResult } from '../utils/validation';

interface ValidatedInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  onValidation?: (result: ValidationResult) => void;
  rules?: ValidationRule;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
  unit?: string;
  className?: string;
  disabled?: boolean;
  helpText?: string;
}

const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  value,
  onChange,
  onValidation,
  rules = {},
  type = 'text',
  placeholder,
  unit,
  className = '',
  disabled = false,
  helpText
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [touched, setTouched] = useState(false);

  // Validate whenever value changes
  useEffect(() => {
    if (touched || value !== '') {
      const result = InputValidator.validateField(value, label, rules);
      setValidationResult(result);
      if (onValidation) {
        onValidation(result);
      }
    }
  }, [value, label, rules, touched, onValidation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const getInputClassName = () => {
    let baseClass = `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${className}`;
    
    if (disabled) {
      baseClass += ' bg-gray-100 cursor-not-allowed';
    } else if (!validationResult.isValid && touched) {
      baseClass += ' border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';
    } else if (validationResult.warnings.length > 0 && touched) {
      baseClass += ' border-yellow-300 text-yellow-900 placeholder-yellow-300 focus:ring-yellow-500 focus:border-yellow-500';
    } else {
      baseClass += ' border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500';
    }
    
    return baseClass;
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {rules.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClassName()}
        />
        {unit && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">{unit}</span>
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}

      {/* Validation Messages */}
      {touched && validationResult.errors.length > 0 && (
        <div className="text-sm text-red-600">
          {validationResult.errors.map((error, index) => (
            <div key={index} className="flex items-center mt-1">
              <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Warning Messages */}
      {touched && validationResult.warnings.length > 0 && validationResult.errors.length === 0 && (
        <div className="text-sm text-yellow-600">
          {validationResult.warnings.map((warning, index) => (
            <div key={index} className="flex items-center mt-1">
              <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValidatedInput;