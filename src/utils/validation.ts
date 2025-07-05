// Validation utility functions for calculator inputs

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  type?: 'number' | 'string' | 'email' | 'positive' | 'integer';
  custom?: (value: any) => string | null;
}

export class InputValidator {
  /**
   * Validate a single input value against rules
   */
  static validateField(
    value: any, 
    fieldName: string, 
    rules: ValidationRule = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if required
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, warnings };
    }

    // Skip other validations if value is empty and not required
    if (!rules.required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors, warnings };
    }

    // Type validation
    switch (rules.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`${fieldName} must be a valid number`);
        }
        break;
      case 'positive':
        if (isNaN(Number(value)) || Number(value) <= 0) {
          errors.push(`${fieldName} must be a positive number`);
        }
        break;
      case 'integer':
        if (isNaN(Number(value)) || !Number.isInteger(Number(value))) {
          errors.push(`${fieldName} must be a whole number`);
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldName} must be text`);
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          errors.push(`${fieldName} must be a valid email address`);
        }
        break;
    }

    // Range validation for numbers
    if ((rules.type === 'number' || rules.type === 'positive') && !isNaN(Number(value))) {
      const numValue = Number(value);
      
      if (rules.min !== undefined && numValue < rules.min) {
        errors.push(`${fieldName} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && numValue > rules.max) {
        errors.push(`${fieldName} must be no more than ${rules.max}`);
      }

      // Add warnings for unusual values
      if (rules.type === 'positive') {
        if (numValue > 10000) {
          warnings.push(`${fieldName} value (${numValue}) seems unusually high`);
        }
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate multiple fields at once
   */
  static validateForm(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
  ): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    Object.entries(rules).forEach(([fieldName, fieldRules]) => {
      const result = this.validateField(data[fieldName], fieldName, fieldRules);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Electrical specific validations
   */
  static validateElectricalInputs = {
    voltage: (value: number): string | null => {
      const commonVoltages = [120, 208, 240, 277, 480, 600, 4160, 13800];
      if (!commonVoltages.some(v => Math.abs(v - value) < v * 0.1)) {
        return `Voltage ${value}V is not a common electrical voltage. Please verify.`;
      }
      return null;
    },

    powerFactor: (value: number): string | null => {
      if (value < 0.5) {
        return 'Power factor below 0.5 is unusually low for most applications';
      }
      if (value > 1.0) {
        return 'Power factor cannot exceed 1.0';
      }
      return null;
    },

    efficiency: (value: number): string | null => {
      if (value < 0.3) {
        return 'Efficiency below 30% is unusually low';
      }
      if (value > 1.0) {
        return 'Efficiency cannot exceed 100%';
      }
      if (value > 0.98) {
        return 'Efficiency above 98% is unusually high. Please verify.';
      }
      return null;
    },

    current: (value: number): string | null => {
      if (value > 5000) {
        return 'Current above 5000A is very high. Please verify the calculation.';
      }
      return null;
    }
  };

  /**
   * HVAC specific validations
   */
  static validateHVACInputs = {
    temperature: (value: number, unit: 'C' | 'F' = 'C'): string | null => {
      const limits = unit === 'C' ? { min: -50, max: 100 } : { min: -58, max: 212 };
      if (value < limits.min || value > limits.max) {
        return `Temperature ${value}°${unit} is outside typical HVAC range (${limits.min}°${unit} to ${limits.max}°${unit})`;
      }
      return null;
    },

    airFlow: (value: number): string | null => {
      if (value > 100000) {
        return 'Air flow rate above 100,000 L/s is very high. Please verify.';
      }
      return null;
    },

    pressure: (value: number): string | null => {
      if (value > 10000) {
        return 'Pressure above 10,000 Pa is very high for typical HVAC applications.';
      }
      return null;
    }
  };
}

/**
 * Common validation rule sets for different input types
 */
export const CommonValidationRules = {
  required: { required: true },
  positiveNumber: { required: true, type: 'positive' as const },
  optionalPositiveNumber: { type: 'positive' as const },
  percentage: { required: true, type: 'number' as const, min: 0, max: 100 },
  powerFactor: { 
    required: true, 
    type: 'number' as const, 
    min: 0, 
    max: 1, 
    custom: InputValidator.validateElectricalInputs.powerFactor 
  },
  efficiency: { 
    required: true, 
    type: 'number' as const, 
    min: 0, 
    max: 1, 
    custom: InputValidator.validateElectricalInputs.efficiency 
  },
  voltage: { 
    required: true, 
    type: 'positive' as const, 
    custom: InputValidator.validateElectricalInputs.voltage 
  },
  current: { 
    required: true, 
    type: 'positive' as const, 
    custom: InputValidator.validateElectricalInputs.current 
  },
  temperature: { required: true, type: 'number' as const, min: -50, max: 100 },
  area: { required: true, type: 'positive' as const, max: 1000000 },
  flowRate: { required: true, type: 'positive' as const, max: 100000 },
  pressure: { 
    required: true, 
    type: 'positive' as const, 
    custom: InputValidator.validateHVACInputs.pressure 
  }
};