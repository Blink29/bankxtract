import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const uploadSinglePDF = async (file, useAI = false) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('use_ai', useAI.toString());

  try {
    const response = await axios.post(`${API_URL}/extract-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Error processing the file');
  }
};

export const uploadMultiplePDFs = async (files, useAI = false) => {
  const formData = new FormData();
  
  files.forEach((file, index) => {
    formData.append('files', file);
  });
  
  formData.append('use_ai', useAI.toString());

  try {
    const response = await axios.post(`${API_URL}/batch-extract-pdfs`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Error processing files');
  }
};

export const generateSummaryReport = async (batch_id) => {
  try {
    const response = await axios.get(`${API_URL}/generate-summary/${batch_id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Error generating summary report');
  }
};

export const downloadCSV = async (batch_id) => {
  try {
    const response = await axios.get(`${API_URL}/export/csv/${batch_id}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    throw new Error('Error downloading CSV');
  }
};

export const downloadExcel = async (batch_id) => {
  try {
    const response = await axios.get(`${API_URL}/export/excel/${batch_id}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    throw new Error('Error downloading Excel file');
  }
};
