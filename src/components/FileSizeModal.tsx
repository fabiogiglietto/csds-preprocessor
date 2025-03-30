import React, { useState } from 'react';

// This would be a modal that appears when the file exceeds 15MB
const FileSizeModal = ({ 
  isOpen, 
  onClose, 
  onSplit, 
  onTimeSplit, 
  onSample, 
  fileSize,
  rowCount
}) => {
  const [samplePercentage, setSamplePercentage] = useState(50);
  const [timeperiod, setTimeperiod] = useState(30);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-[#00926c] p-4 text-white rounded-t-xl">
          <h2 className="text-xl font-bold">File Size Exceeds Limit</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-5.75a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4z" clipRule="evenodd" />
            </svg>
            <div>
              Your processed file is <span className="font-bold">{fileSize.toFixed(1)}MB</span>, which exceeds the 15MB limit for the CSDS service. Choose a solution below:
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg mb-2">Option 1: Split Into Multiple Files</h3>
              <p className="text-gray-600 mb-3">Automatically divide your {rowCount} rows into multiple files under 15MB each.</p>
              <button 
                onClick={onSplit}
                className="bg-[#00926c] text-white px-4 py-2 rounded hover:bg-[#007d5c] transition-colors w-full"
              >
                Split & Download (Zip)
              </button>
            </div>
            
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg mb-2">Option 2: Split By Time Period</h3>
              <p className="text-gray-600 mb-3">Divide data into separate files by time periods for more focused analysis.</p>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period length (days):
                </label>
                <select 
                  value={timeperiod}
                  onChange={(e) => setTimeperiod(Number(e.target.value))}
                  className="block w-full border-gray-300 rounded-md shadow-sm p-2 border"
                >
                  <option value={7}>Weekly</option>
                  <option value={30}>Monthly</option>
                  <option value={90}>Quarterly</option>
                </select>
              </div>
              <button 
                onClick={() => onTimeSplit(timeperiod)}
                className="bg-[#00926c] text-white px-4 py-2 rounded hover:bg-[#007d5c] transition-colors w-full"
              >
                Split By Time & Download
              </button>
            </div>
            
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg mb-2">Option 3: Sample Data</h3>
              <p className="text-gray-600 mb-3">Create a representative sample while maintaining account distribution.</p>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sample size: {samplePercentage}%
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="90" 
                  value={samplePercentage} 
                  onChange={(e) => setSamplePercentage(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button 
                onClick={() => onSample(samplePercentage)}
                className="bg-[#00926c] text-white px-4 py-2 rounded hover:bg-[#007d5c] transition-colors w-full"
              >
                Create Sample & Download
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-t p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileSizeModal;
