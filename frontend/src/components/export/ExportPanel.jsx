import { useState } from 'react';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { generateSummaryReport } from '../../services/api';
import { prepareDataForExport } from '../../utils/dataUtils';

const ExportPanel = ({ statements, batchId }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');

  const handleExport = async () => {
    if (statements.length === 0) return;
    
    setIsExporting(true);
    
    try {
      // Prepare data in a format suitable for export
      const exportData = prepareDataForExport(statements);
      
      if (exportFormat === 'csv') {
        exportToCSV(exportData);
      } else if (exportFormat === 'excel') {
        exportToExcel(exportData);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const exportToCSV = (data) => {
    // Convert data to CSV using PapaParse
    const csv = Papa.unparse(data);
    
    // Create a Blob from the CSV string
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    
    // Save the file
    saveAs(blob, `bank-statements-analysis-${new Date().toISOString().split('T')[0]}.csv`);
  };
    const exportToExcel = (data) => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Create a Blob from the buffer
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save the file
    saveAs(blob, `bank-statements-analysis-${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  
  const handleGenerateReport = async () => {
    if (!batchId || statements.length === 0) return;
    
    setIsGeneratingReport(true);
    setReportData(null);
    
    try {
      // Call the API to generate a summary report
      const report = await generateSummaryReport(batchId);
      setReportData(report);
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Export Data</h2>
      
      <div className="mb-4">
        <p className="text-gray-600 text-sm mb-4">
          Export all transaction data from {statements.length} bank statements for further analysis.
        </p>
        
        <div className="flex items-center mb-4">
          <span className="text-sm font-medium mr-4">Export Format:</span>
          <div className="flex bg-gray-100 rounded-md">
            <button
              onClick={() => setExportFormat('csv')}
              className={`text-sm py-2 px-4 rounded-l-md transition ${
                exportFormat === 'csv' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              CSV
            </button>
            <button
              onClick={() => setExportFormat('excel')}
              className={`text-sm py-2 px-4 rounded-r-md transition ${
                exportFormat === 'excel' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Excel
            </button>
          </div>
        </div>
        
        <button
          onClick={handleExport}
          disabled={statements.length === 0 || isExporting}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition disabled:opacity-50 flex items-center"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export to {exportFormat.toUpperCase()}
            </>
          )}
        </button>
      </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium mb-2">Generate Report</h3>
        <p className="text-gray-600 text-sm mb-4">
          Generate a detailed summary report highlighting all discrepancies and variance analysis.
        </p>
        
        <button
          onClick={handleGenerateReport}
          disabled={statements.length === 0 || isGeneratingReport || !batchId}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition flex items-center disabled:opacity-50"
        >
          {isGeneratingReport ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Generate Report
            </>
          )}
        </button>

        {reportData && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium mb-3">Report Summary</h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Statements:</p>
                <p className="font-medium">{reportData.statistics.total_statements}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Valid Statements:</p>
                <p className="font-medium">{reportData.statistics.valid_statements}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Variance Distribution:</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    No Variance: {reportData.variance_distribution.no_variance}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Low Variance: {reportData.variance_distribution.low_variance}
                  </span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Medium Variance: {reportData.variance_distribution.medium_variance}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                    High Variance: {reportData.variance_distribution.high_variance}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                    Invalid: {reportData.variance_distribution.invalid}
                  </span>
                </div>
              </div>
              
              {reportData.recommendations && reportData.recommendations.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                    {reportData.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {reportData.statistics.highest_variance && (
                <div className="mt-3 bg-orange-50 p-3 rounded border border-orange-200">
                  <p className="text-sm font-medium text-orange-800">Highest Variance Detected:</p>
                  <p className="text-sm mt-1">
                    Statement #{reportData.statistics.highest_variance.index + 1} shows a 
                    variance of {reportData.statistics.highest_variance.variance.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ExportPanel.propTypes = {
  statements: PropTypes.array.isRequired,
  batchId: PropTypes.string
};

export default ExportPanel;
