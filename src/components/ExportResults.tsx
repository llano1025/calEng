import React, { useState } from 'react';
import { Icons } from './Icons';
import { ResultsExporter, ExportData } from '../utils/exportResults';

interface ExportResultsProps {
  data: ExportData;
  isOpen: boolean;
  onClose: () => void;
}

const ExportResults: React.FC<ExportResultsProps> = ({ data, isOpen, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = async (format: 'pdf' | 'csv' | 'json' | 'text' | 'clipboard') => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      switch (format) {
        case 'pdf':
          ResultsExporter.exportToPDF(data);
          setExportMessage({ type: 'success', message: 'PDF export initiated. Check your browser for the print dialog.' });
          break;
        case 'csv':
          ResultsExporter.exportToCSV(data);
          setExportMessage({ type: 'success', message: 'CSV file downloaded successfully.' });
          break;
        case 'json':
          ResultsExporter.exportToJSON(data);
          setExportMessage({ type: 'success', message: 'JSON file downloaded successfully.' });
          break;
        case 'text':
          ResultsExporter.exportToText(data);
          setExportMessage({ type: 'success', message: 'Text file downloaded successfully.' });
          break;
        case 'clipboard':
          const success = await ResultsExporter.copyToClipboard(data);
          if (success) {
            setExportMessage({ type: 'success', message: 'Results copied to clipboard successfully.' });
          } else {
            setExportMessage({ type: 'error', message: 'Failed to copy to clipboard. Please try another export method.' });
          }
          break;
      }
    } catch (error) {
      setExportMessage({ type: 'error', message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Export Results
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icons.Close />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Export your calculation results in various formats:
                </p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-900">{data.title}</p>
                  <p className="text-xs text-gray-500">{data.calculatorName}</p>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-3">
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <div className="h-5 w-5 text-red-500 mr-3">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">PDF</p>
                      <p className="text-xs text-gray-500">Professional report format</p>
                    </div>
                  </div>
                  <div className="h-4 w-4 text-gray-400">
                    <Icons.ChevronRight />
                  </div>
                </button>

                <button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <div className="h-5 w-5 text-green-500 mr-3">
                      <Icons.Table />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Excel CSV</p>
                      <p className="text-xs text-gray-500">Spreadsheet format</p>
                    </div>
                  </div>
                  <div className="h-4 w-4 text-gray-400">
                    <Icons.ChevronRight />
                  </div>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <div className="h-5 w-5 text-blue-500 mr-3">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">JSON</p>
                      <p className="text-xs text-gray-500">Structured data format</p>
                    </div>
                  </div>
                  <div className="h-4 w-4 text-gray-400">
                    <Icons.ChevronRight />
                  </div>
                </button>

                <button
                  onClick={() => handleExport('text')}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <div className="h-5 w-5 text-gray-500 mr-3">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Plain Text</p>
                      <p className="text-xs text-gray-500">Simple text format</p>
                    </div>
                  </div>
                  <div className="h-4 w-4 text-gray-400">
                    <Icons.ChevronRight />
                  </div>
                </button>

                <button
                  onClick={() => handleExport('clipboard')}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <div className="h-5 w-5 text-purple-500 mr-3">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11.586l-3-3a1 1 0 00-1.414 0L8 11.172V9a1 1 0 10-2 0v4.586l2.293-2.293a1 1 0 011.414 0l3 3A1 1 0 0015 13v-1.414z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Copy to Clipboard</p>
                      <p className="text-xs text-gray-500">Copy as formatted text</p>
                    </div>
                  </div>
                  <div className="h-4 w-4 text-gray-400">
                    <Icons.ChevronRight />
                  </div>
                </button>
              </div>

              {/* Status Messages */}
              {exportMessage && (
                <div className={`mt-4 p-3 rounded-md ${
                  exportMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex">
                    <div className={`flex-shrink-0 h-5 w-5 ${
                      exportMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {exportMessage.type === 'success' ? (
                        <Icons.CheckCircle />
                      ) : (
                        <Icons.Warning />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm ${
                        exportMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {exportMessage.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isExporting && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-600">Exporting...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportResults;