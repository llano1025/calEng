import React from 'react';
import { Icons } from './Icons';

interface ValidationMessageProps {
  errors?: string[];
  warnings?: string[];
  className?: string;
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({ 
  errors = [], 
  warnings = [], 
  className = '' 
}) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-red-400">
                <Icons.Warning />
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {errors.length === 1 ? 'Input Error' : `${errors.length} Input Errors`}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-yellow-400">
                <Icons.InfoCircle />
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {warnings.length === 1 ? 'Warning' : `${warnings.length} Warnings`}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationMessage;