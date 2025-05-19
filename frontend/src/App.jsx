import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Service imports
import { uploadSinglePDF, uploadMultiplePDFs } from './services/api';

// Component imports
import UploadControlPanel from './components/upload/UploadControlPanel';
import AppLayout from './components/layout/AppLayout';
import BatchSummary from './components/analysis/BatchSummary';
import TransactionTable from './components/analysis/TransactionTable';
import VarianceChart from './components/visualization/VarianceChart';
import ExportPanel from './components/export/ExportPanel';

const App = () => {
  const [statements, setStatements] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleProcessFiles = async (files, useAI, mode) => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      if (mode === 'single') {
        // Process single file
        const result = await uploadSinglePDF(files[0], useAI);
        setStatements([result]);
      } else if (mode === 'batch') {
        // Generate a unique batch ID
        const newBatchId = uuidv4();
        setBatchId(newBatchId);
        
        // Process files in batches
        // For now, we'll process them sequentially
        const results = [];
        
        for (const file of files) {
          const result = await uploadSinglePDF(file, useAI);
          results.push(result);
        }
        
        setStatements(results);
        
        // In the future, we can implement a batch endpoint:
        // const results = await uploadMultiplePDFs(files, useAI);
        // setStatements(results.statements);
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setError(error.message || 'Error processing files');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout
      uploadComponent={
        <div>
          <UploadControlPanel
            onProcessFiles={handleProcessFiles}
            isProcessing={isProcessing}
          />
          
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <p>{error}</p>
            </div>
          )}
          
          {isProcessing && (
            <div className="flex justify-center my-8">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Processing PDF data...</p>
              </div>
            </div>
          )}
        </div>
      }
      
      summaryComponent={
        statements.length > 0 ? (
          <BatchSummary statements={statements} />
        ) : (
          <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg text-gray-500">
            <p>Upload bank statements to view summary</p>
          </div>
        )
      }
      
      visualizationComponent={
        statements.length > 0 ? (
          <div className="space-y-6">
            <VarianceChart statements={statements} />
            
            {statements.length > 0 && statements[0].parsing_method && (
              <div className="mt-4 bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-2">Parsing Method</h3>
                <div className="flex flex-wrap gap-2">
                  {statements.map((statement, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      Statement #{index + 1}:&nbsp;
                      {statement.parsing_method === 'traditional' 
                        ? 'Traditional Parsing' 
                        : statement.parsing_method === 'ai' 
                          ? 'Gemini AI-Enhanced Parsing' 
                          : 'Traditional Parsing (AI Fallback)'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg text-gray-500">
            <p>Upload bank statements to view visualizations</p>
          </div>
        )
      }
      
      transactionsComponent={
        statements.length > 0 ? (
          <TransactionTable statements={statements} showStatementId={statements.length > 1} />
        ) : (
          <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg text-gray-500">
            <p>Upload bank statements to view transactions</p>
          </div>
        )
      }
      
      exportComponent={
        statements.length > 0 ? (
          <ExportPanel statements={statements} batchId={batchId} />
        ) : (
          <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg text-gray-500">
            <p>Upload bank statements to export data</p>
          </div>
        )
      }
    />
  )
}

export default App;