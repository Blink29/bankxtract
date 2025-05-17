import React, { useState } from 'react'
import axios from 'axios'

const App = () => {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [useAI, setUseAI] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setFileError('');
      } else {
        setFile(null);
        setFileError('Please upload a PDF file');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setFileError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ai', useAI.toString());

    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:5000/api/extract-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setExtractedData(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      setFileError('Error processing the file. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Bank Statement Analyzer</h1>
        
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input 
                type="file" 
                id="pdf-upload" 
                onChange={handleFileChange}
                className="hidden" 
                accept=".pdf" 
              />
              <label 
                htmlFor="pdf-upload" 
                className="cursor-pointer text-blue-500 hover:text-blue-700"
              >
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-600 text-lg mb-1">Click to upload a PDF file</span>
                  <span className="text-gray-500 text-sm">or drag and drop</span>
                </div>
              </label>
            </div>

            {fileError && <p className="text-red-500 text-sm mt-2">{fileError}</p>}
            
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected file: {file.name}
              </div>
            )}
            
            <div className="flex items-center justify-center mt-4">
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
                disabled={!file || isLoading}
              >
                {isLoading ? 'Analyzing...' : 'Extract Data'}
              </button>
            </div>
          </form>
        </div>

        {isLoading && (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {extractedData && !isLoading && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Extracted Information</h2>
            
            {extractedData.parsing_method && (
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {extractedData.parsing_method === 'traditional' 
                    ? 'Traditional Parsing' 
                    : extractedData.parsing_method === 'ai' 
                      ? 'Gemini AI-Enhanced Parsing' 
                      : 'Traditional Parsing (AI Fallback)'}
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold text-gray-700">Starting Balance:</h3>
                <p className="text-xl">${extractedData.starting_balance?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold text-gray-700">Ending Balance:</h3>
                <p className="text-xl">${extractedData.ending_balance?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Validation:</h3>
              <div className={`p-4 rounded-md ${extractedData.validation.is_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p>{extractedData.validation.message}</p>
                {!extractedData.validation.is_valid && (
                  <div className="mt-2">
                    <p>Expected: ${extractedData.validation.expected_ending_balance?.toFixed(2)}</p>
                    <p>Calculated: ${extractedData.validation.calculated_ending_balance?.toFixed(2)}</p>
                    <p>Difference: ${Math.abs(extractedData.validation.difference?.toFixed(2) || 0)}</p>
                  </div>
                )}
              </div>
            </div>

            <h3 className="font-semibold text-gray-700 mb-2">Transactions:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.transactions.length > 0 ? (
                    extractedData.transactions.map((transaction, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-4 border-b border-gray-200">{transaction.date}</td>
                        <td className="py-2 px-4 border-b border-gray-200">{transaction.description}</td>
                        <td className="py-2 px-4 border-b border-gray-200">${transaction.amount.toFixed(2)}</td>
                        <td className={`py-2 px-4 border-b border-gray-200 ${transaction.direction.toLowerCase() === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.direction}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-4 text-center text-gray-500">No transactions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App