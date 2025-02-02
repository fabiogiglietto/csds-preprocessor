import { useState } from 'react';
import Papa from 'papaparse';
import { CSDSRow } from './types';

function App() {
  const [objectIdSource, setObjectIdSource] = useState<'text' | 'link'>('text');
  const [transformedData, setTransformedData] = useState<CSDSRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [skippedRows, setSkippedRows] = useState<number>(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let skipped = 0;
          const transformed = results.data
            .filter((row: any) => {
              const hasRequiredFields = Boolean(
                row &&
                row['surface.id'] && 
                row.id &&
                row.creation_time &&
                (objectIdSource === 'text' 
                  ? row.text 
                  : row['link_attachment.link'])
              );

              if (!hasRequiredFields) {
                skipped++;
                return false;
              }
              return true;
            })
            .map((row: any) => ({
              account_id: row['surface.id'],
              content_id: row.id,
              object_id: objectIdSource === 'text' 
                ? row.text 
                : row['link_attachment.link'] || '',
              timestamp_share: Math.floor(new Date(row.creation_time).getTime() / 1000)
            }));

          // Calculate estimated file size
          const csvContent = Papa.unparse(transformed);
          const estimatedSize = new Blob([csvContent]).size / (1024 * 1024); // Size in MB

          setSkippedRows(skipped);
          setProcessedRows(transformed.length);

          if (transformed.length === 0) {
            setError('No valid data found in CSV');
            return;
          }

          if (estimatedSize > 15) {
            setError(`Warning: The transformed file size (${estimatedSize.toFixed(1)}MB) exceeds the 15MB limit of the Coordinated Sharing Detection Service. Please reduce the number of rows.`);
            return;
          }

          setTransformedData(transformed);
          setError(null);
        } catch (err) {
          console.error('Processing error:', err);
          setError(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      },
      error: (error: Error) => {
        console.error('Parse error:', error);
        setError(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const handleDownload = () => {
    if (!transformedData) return;

    const csv = Papa.unparse(transformedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'transformed_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 font-['Comfortaa']">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        {/* Title Section */}
        <h1 className="text-3xl font-bold text-[#3d3d3c] text-center mb-8">
          MCL to CSDS Pre-processor
        </h1>
        
        <div className="space-y-8">
          {/* Object ID Selection */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 text-[#3d3d3c]">
              Choose object_id source:
            </h2>
            <div className="flex space-x-6">
              <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                <input
                  type="radio"
                  value="text"
                  checked={objectIdSource === 'text'}
                  onChange={(e) => setObjectIdSource(e.target.value as 'text' | 'link')}
                  className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                />
                Text content
              </label>
              <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                <input
                  type="radio"
                  value="link"
                  checked={objectIdSource === 'link'}
                  onChange={(e) => setObjectIdSource(e.target.value as 'text' | 'link')}
                  className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                />
                Link attachment
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 text-[#3d3d3c]">
              Upload CSV file:
            </h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-[#3d3d3c]
                file:mr-4 file:py-3 file:px-6
                file:rounded-lg file:border-0
                file:text-sm file:font-bold
                file:bg-[#00926c] file:text-white
                hover:file:bg-[#007d5c] 
                cursor-pointer"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-700 p-6 rounded-lg border border-red-200">
              <div className="flex items-center font-light">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Success Display */}
          {transformedData && (
            <div className="space-y-4">
              <div className="bg-[#00926c]/10 p-6 rounded-lg border border-[#00926c]/20">
                <div className="flex items-center text-[#00926c] mb-2">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="font-bold">Successfully processed {processedRows} rows</p>
                </div>
                {skippedRows > 0 && (
                  <p className="ml-7 text-[#3d3d3c] font-light">
                    Skipped {skippedRows} rows due to missing or invalid data
                  </p>
                )}
              </div>
              <button
                onClick={handleDownload}
                className="w-full bg-[#00926c] text-white px-6 py-3 rounded-lg font-bold
                  hover:bg-[#007d5c] transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-[#00926c] focus:ring-offset-2"
              >
                Download Transformed CSV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
