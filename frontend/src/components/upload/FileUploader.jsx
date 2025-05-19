import { useState } from 'react';
import PropTypes from 'prop-types';

const FileUploader = ({ onFilesSelected, maxFiles = 20, allowMultiple = true }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFiles = (files) => {
    if (files.length > maxFiles) {
      setFileError(`You can only upload up to ${maxFiles} files at once.`);
      return false;
    }

    const invalidFiles = Array.from(files).filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      setFileError('Only PDF files are allowed.');
      return false;
    }

    setFileError('');
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    
    if (validateFiles(files)) {
      const newSelectedFiles = allowMultiple 
        ? [...selectedFiles, ...Array.from(files)]
        : [files[0]];
        
      setSelectedFiles(newSelectedFiles);
      onFilesSelected(newSelectedFiles);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    
    if (validateFiles(files)) {
      const newSelectedFiles = allowMultiple 
        ? [...selectedFiles, ...Array.from(files)]
        : [files[0]];
        
      setSelectedFiles(newSelectedFiles);
      onFilesSelected(newSelectedFiles);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const removeAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
  };

  return (
    <div className="w-full">
      <div 
        onDragEnter={handleDrag}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
        `}
      >
        <input 
          type="file" 
          id="pdf-upload" 
          onChange={handleFileChange}
          className="hidden" 
          accept=".pdf"
          multiple={allowMultiple}
        />
        <label 
          htmlFor="pdf-upload" 
          className="cursor-pointer text-blue-500 hover:text-blue-700"
        >
          <div className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-gray-600 text-lg mb-1">
              Click to upload {allowMultiple ? 'files' : 'a file'}
            </span>
            <span className="text-gray-500 text-sm">or drag and drop</span>
            {allowMultiple && (
              <span className="text-gray-400 text-xs mt-2">
                You can upload up to {maxFiles} PDF files at once
              </span>
            )}
          </div>
        </label>
      </div>

      {fileError && (
        <p className="text-red-500 text-sm mt-2">{fileError}</p>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
            </h3>
            <button
              onClick={removeAllFiles}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Remove all
            </button>
          </div>
          
          <ul className="max-h-60 overflow-y-auto border rounded-md divide-y">
            {selectedFiles.map((file, index) => (
              <li key={index} className="flex justify-between items-center px-3 py-2 text-sm">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate max-w-xs">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500 ml-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dragActive && (
        <div 
          className="absolute inset-0 w-full h-full opacity-0"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        ></div>
      )}
    </div>
  );
};

FileUploader.propTypes = {
  onFilesSelected: PropTypes.func.isRequired,
  maxFiles: PropTypes.number,
  allowMultiple: PropTypes.bool
};

export default FileUploader;
