// Export calculation results to various formats

export interface ExportData {
  title: string;
  calculatorName: string;
  discipline: string;
  timestamp: Date;
  projectName?: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  notes?: string;
}

export class ResultsExporter {
  /**
   * Export to PDF (using browser print)
   */
  static exportToPDF(data: ExportData): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    const html = this.generatePrintHTML(data);
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  /**
   * Export to Excel CSV format
   */
  static exportToCSV(data: ExportData): void {
    const csvContent = this.generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.sanitizeFilename(data.title)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Export to JSON format
   */
  static exportToJSON(data: ExportData): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.sanitizeFilename(data.title)}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Export to plain text format
   */
  static exportToText(data: ExportData): void {
    const textContent = this.generateTextFormat(data);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.sanitizeFilename(data.title)}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Copy results to clipboard
   */
  static async copyToClipboard(data: ExportData): Promise<boolean> {
    try {
      const textContent = this.generateTextFormat(data);
      await navigator.clipboard.writeText(textContent);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate HTML for printing/PDF
   */
  private static generatePrintHTML(data: ExportData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${data.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #007acc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            color: #007acc;
            margin-bottom: 10px;
        }
        .meta {
            color: #666;
            font-size: 14px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h3 {
            color: #007acc;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .data-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .data-item {
            padding: 10px;
            background: #f8f9fa;
            border-left: 4px solid #007acc;
        }
        .data-item strong {
            display: block;
            color: #333;
            margin-bottom: 5px;
        }
        .results {
            background: #e8f5e8;
            border-left-color: #28a745;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${data.title}</h1>
        <div class="meta">
            <p><strong>Calculator:</strong> ${data.calculatorName}</p>
            <p><strong>Discipline:</strong> ${data.discipline}</p>
            <p><strong>Date:</strong> ${data.timestamp.toLocaleString()}</p>
            ${data.projectName ? `<p><strong>Project:</strong> ${data.projectName}</p>` : ''}
        </div>
    </div>

    <div class="section">
        <h3>Input Parameters</h3>
        <div class="data-grid">
            ${Object.entries(data.inputs).map(([key, value]) => `
                <div class="data-item">
                    <strong>${this.formatKey(key)}</strong>
                    ${this.formatValue(value)}
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h3>Calculation Results</h3>
        <div class="data-grid">
            ${Object.entries(data.results).map(([key, value]) => `
                <div class="data-item results">
                    <strong>${this.formatKey(key)}</strong>
                    ${this.formatValue(value)}
                </div>
            `).join('')}
        </div>
    </div>

    ${data.notes ? `
    <div class="section">
        <h3>Notes</h3>
        <p>${data.notes}</p>
    </div>
    ` : ''}

    <div class="section" style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
        Generated by Engineering Calculator - ${new Date().toLocaleString()}
    </div>
</body>
</html>`;
  }

  /**
   * Generate CSV format
   */
  private static generateCSV(data: ExportData): string {
    const rows = [
      ['Engineering Calculator Export'],
      [''],
      ['Calculator', data.calculatorName],
      ['Discipline', data.discipline],
      ['Date', data.timestamp.toISOString()],
      ...(data.projectName ? [['Project', data.projectName]] : []),
      [''],
      ['INPUT PARAMETERS'],
      ['Parameter', 'Value'],
      ...Object.entries(data.inputs).map(([key, value]) => [
        this.formatKey(key),
        this.formatValue(value)
      ]),
      [''],
      ['CALCULATION RESULTS'],
      ['Result', 'Value'],
      ...Object.entries(data.results).map(([key, value]) => [
        this.formatKey(key),
        this.formatValue(value)
      ]),
      ...(data.notes ? [[''], ['NOTES'], [data.notes]] : [])
    ];

    return rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Generate plain text format
   */
  private static generateTextFormat(data: ExportData): string {
    let text = `ENGINEERING CALCULATOR RESULTS\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    text += `Calculator: ${data.calculatorName}\n`;
    text += `Discipline: ${data.discipline}\n`;
    text += `Date: ${data.timestamp.toLocaleString()}\n`;
    if (data.projectName) {
      text += `Project: ${data.projectName}\n`;
    }
    text += `\n`;

    text += `INPUT PARAMETERS\n`;
    text += `${'-'.repeat(20)}\n`;
    Object.entries(data.inputs).forEach(([key, value]) => {
      text += `${this.formatKey(key)}: ${this.formatValue(value)}\n`;
    });
    text += `\n`;

    text += `CALCULATION RESULTS\n`;
    text += `${'-'.repeat(20)}\n`;
    Object.entries(data.results).forEach(([key, value]) => {
      text += `${this.formatKey(key)}: ${this.formatValue(value)}\n`;
    });

    if (data.notes) {
      text += `\nNOTES\n`;
      text += `${'-'.repeat(10)}\n`;
      text += `${data.notes}\n`;
    }

    text += `\n${'-'.repeat(50)}\n`;
    text += `Generated by Engineering Calculator - ${new Date().toLocaleString()}`;

    return text;
  }

  /**
   * Format a key for display
   */
  private static formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * Format a value for display
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toString();
      } else {
        return value.toFixed(3);
      }
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  /**
   * Sanitize filename for download
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);
  }
}