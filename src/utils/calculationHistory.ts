// Calculation History Management

export interface CalculationEntry {
  id: string;
  timestamp: Date;
  discipline: string;
  calculatorType: string;
  calculatorName: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  notes?: string;
  projectName?: string;
  isFavorite?: boolean;
}

export interface CalculationSummary {
  id: string;
  timestamp: Date;
  discipline: string;
  calculatorName: string;
  summary: string;
  isFavorite: boolean;
}

class CalculationHistoryManager {
  private static readonly STORAGE_KEY = 'engineeringCalc_history';
  private static readonly MAX_ENTRIES = 100;

  /**
   * Save a calculation to history
   */
  static saveCalculation(entry: Omit<CalculationEntry, 'id' | 'timestamp'>): string {
    const calculation: CalculationEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry
    };

    const history = this.getHistory();
    history.unshift(calculation);

    // Keep only the most recent entries
    if (history.length > this.MAX_ENTRIES) {
      history.splice(this.MAX_ENTRIES);
    }

    this.saveToStorage(history);
    return calculation.id;
  }

  /**
   * Get all calculation history
   */
  static getHistory(): CalculationEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
    } catch (error) {
      console.error('Error loading calculation history:', error);
      return [];
    }
  }

  /**
   * Get calculation history summary (for display)
   */
  static getHistorySummary(): CalculationSummary[] {
    return this.getHistory().map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      discipline: entry.discipline,
      calculatorName: entry.calculatorName,
      summary: this.generateSummary(entry),
      isFavorite: entry.isFavorite || false
    }));
  }

  /**
   * Get calculations by discipline
   */
  static getByDiscipline(discipline: string): CalculationEntry[] {
    return this.getHistory().filter(entry => entry.discipline === discipline);
  }

  /**
   * Get favorite calculations
   */
  static getFavorites(): CalculationEntry[] {
    return this.getHistory().filter(entry => entry.isFavorite);
  }

  /**
   * Get a specific calculation by ID
   */
  static getById(id: string): CalculationEntry | null {
    return this.getHistory().find(entry => entry.id === id) || null;
  }

  /**
   * Toggle favorite status
   */
  static toggleFavorite(id: string): boolean {
    const history = this.getHistory();
    const entry = history.find(calc => calc.id === id);
    
    if (entry) {
      entry.isFavorite = !entry.isFavorite;
      this.saveToStorage(history);
      return entry.isFavorite;
    }
    
    return false;
  }

  /**
   * Delete a calculation
   */
  static deleteCalculation(id: string): boolean {
    const history = this.getHistory();
    const index = history.findIndex(entry => entry.id === id);
    
    if (index !== -1) {
      history.splice(index, 1);
      this.saveToStorage(history);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all history
   */
  static clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Export history as JSON
   */
  static exportHistory(): string {
    return JSON.stringify(this.getHistory(), null, 2);
  }

  /**
   * Import history from JSON
   */
  static importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data)) {
        const validEntries = data.filter(this.validateEntry);
        this.saveToStorage(validEntries);
        return true;
      }
    } catch (error) {
      console.error('Error importing history:', error);
    }
    return false;
  }

  /**
   * Search calculations
   */
  static search(query: string): CalculationEntry[] {
    const searchTerm = query.toLowerCase();
    return this.getHistory().filter(entry => 
      entry.calculatorName.toLowerCase().includes(searchTerm) ||
      entry.discipline.toLowerCase().includes(searchTerm) ||
      (entry.projectName && entry.projectName.toLowerCase().includes(searchTerm)) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get recent calculations (last 10)
   */
  static getRecent(limit: number = 10): CalculationEntry[] {
    return this.getHistory().slice(0, limit);
  }

  /**
   * Private helper methods
   */
  private static generateId(): string {
    return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static saveToStorage(history: CalculationEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving calculation history:', error);
    }
  }

  private static generateSummary(entry: CalculationEntry): string {
    // Generate a human-readable summary based on the calculation type
    switch (entry.calculatorType) {
      case 'cableSizing':
        return `Cable: ${entry.results?.recommendedCable || 'N/A'}, Load: ${entry.inputs?.load || 'N/A'}A`;
      case 'powerFactor':
        return `PF: ${entry.inputs?.powerFactor || 'N/A'} → ${entry.results?.correctedPowerFactor || 'N/A'}`;
      case 'load':
        return `Total Load: ${entry.results?.totalLoad || 'N/A'} kVA`;
      case 'transformer':
        return `Transformer: ${entry.results?.transformerSize || 'N/A'} kVA`;
      case 'ups':
        return `UPS: ${entry.results?.upsSize || 'N/A'} kVA, Backup: ${entry.results?.backupTime || 'N/A'} min`;
      default:
        return `${entry.calculatorName} calculation`;
    }
  }

  private static validateEntry(entry: any): boolean {
    return (
      entry &&
      typeof entry.id === 'string' &&
      entry.timestamp &&
      typeof entry.discipline === 'string' &&
      typeof entry.calculatorType === 'string' &&
      typeof entry.calculatorName === 'string' &&
      entry.inputs &&
      entry.results
    );
  }
}

export default CalculationHistoryManager;