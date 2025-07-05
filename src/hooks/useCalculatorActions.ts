import { useState, useCallback } from 'react';
import { ExportData } from '../utils/exportResults';
import CalculationHistoryManager from '../utils/calculationHistory';

interface UseCalculatorActionsProps {
  title: string;
  discipline: string;
  calculatorType: string;
}

interface UseCalculatorActionsReturn {
  exportData: ExportData | null;
  saveCalculation: (inputs: Record<string, any>, results: Record<string, any>, notes?: string) => void;
  prepareExportData: (inputs: Record<string, any>, results: Record<string, any>, projectName?: string) => void;
  clearExportData: () => void;
}

/**
 * Custom hook for managing calculator actions (export, history saving)
 */
export const useCalculatorActions = ({
  title,
  discipline,
  calculatorType
}: UseCalculatorActionsProps): UseCalculatorActionsReturn => {
  const [exportData, setExportData] = useState<ExportData | null>(null);

  const saveCalculation = useCallback((
    inputs: Record<string, any>,
    results: Record<string, any>,
    notes?: string
  ) => {
    const calculationId = CalculationHistoryManager.saveCalculation({
      discipline,
      calculatorType,
      calculatorName: title,
      inputs,
      results,
      notes: notes || `Calculation performed using ${title}`
    });
    
    console.log(`Calculation saved to history with ID: ${calculationId}`);
  }, [title, discipline, calculatorType]);

  const prepareExportData = useCallback((
    inputs: Record<string, any>,
    results: Record<string, any>,
    projectName?: string
  ) => {
    const data: ExportData = {
      title: `${title} - Calculation Results`,
      calculatorName: title,
      discipline,
      timestamp: new Date(),
      projectName,
      inputs,
      results
    };
    
    setExportData(data);
  }, [title, discipline]);

  const clearExportData = useCallback(() => {
    setExportData(null);
  }, []);

  return {
    exportData,
    saveCalculation,
    prepareExportData,
    clearExportData
  };
};