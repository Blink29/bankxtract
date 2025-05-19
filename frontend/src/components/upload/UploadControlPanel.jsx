import { useState } from 'react';
import PropTypes from 'prop-types';
import FileUploader from './FileUploader';

const UploadControlPanel = ({ onProcessFiles, isProcessing }) => {
  const [files, setFiles] = useState([]);
  const [useAI, setUseAI] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'batch'

  const handleFilesSelected = (selectedFiles) => {
    setFiles(selectedFiles);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    
    onProcessFiles(files, useAI, uploadMode);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Upload Bank Statements</h2>
          <div className="flex space-x-1">
            <button
              onClick={() => setUploadMode('single')}
              className={`px-3 py-1 text-sm rounded-l-md ${
                uploadMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setUploadMode('batch')}
              className={`px-3 py-1 text-sm rounded-r-md ${
                uploadMode === 'batch'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Batch
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm mt-1">
          {uploadMode === 'single' 
            ? 'Upload a single PDF to extract transaction data.' 
            : 'Upload multiple PDFs to perform batch analysis and variance detection.'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FileUploader
          onFilesSelected={handleFilesSelected}
          allowMultiple={uploadMode === 'batch'}
          maxFiles={20}
        />

        <div className="flex items-center justify-center mt-6">
          <label className="inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={useAI}
              onChange={() => setUseAI(!useAI)}
              className="sr-only peer" 
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900">Use AI-Enhanced Parsing</span>
          </label>
          <div className="ml-2 group relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 bg-gray-800 text-white text-xs rounded p-2">
              AI-Enhanced Parsing using Google's Gemini API may offer improved accuracy for non-standard PDF formats but requires an API key configuration on the server.
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition duration-300 disabled:opacity-50"
            disabled={files.length === 0 || isProcessing}
          >
            {isProcessing 
              ? (uploadMode === 'batch' ? 'Processing Batch...' : 'Analyzing...') 
              : (uploadMode === 'batch' ? 'Process Batch' : 'Extract Data')}
          </button>
        </div>
      </form>
    </div>
  );
};

UploadControlPanel.propTypes = {
  onProcessFiles: PropTypes.func.isRequired,
  isProcessing: PropTypes.bool.isRequired
};

export default UploadControlPanel;
