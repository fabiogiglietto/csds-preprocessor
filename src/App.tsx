import { useState } from 'react';
import Papa from 'papaparse';
import { MetaContentLibraryRow, CSDSRow, TransformOptions } from './types';

function App() {
  const [objectIdSource, setObjectIdSource] = useState<'text' | 'link'>('text');
  const [transformedData, setTransformedData] = useState<CSDSRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<MetaContentLibraryRow>(file, {
      header: true,
      complete: (results) => {
        try {
          const transformed = results.data.map(row => ({
            account_id: row.surface.id,
            content_id: row.id,
            object_id: objectIdSource === 'text' ? row.text : row.link_attachment.link,
            timestamp_share: Math.floor(new Date(row.creation_time).getTime() / 1000)
          }));

          setTransformedData(transformed);
          setError(null);
        } catch (err) {
          setError(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
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
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">MCL to CSDS Transformer</h1>
        
        <div className="space-y-6">
          {/* Object ID Source Selection */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Choose object_id source:</h2>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="text"
                  checked={objectIdSource === 'text'}
                  onChange={(e) => setObjectIdSource(e.target.value as 'text' | 'link')}
                  className="mr-2"
                />
                Text content
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="link"
                  checked={objectIdSource === 'link'}
                  onChange={(e) => setObjectIdSource(e.target.value as 'text' | 'link')}
                  className="mr-2"
                />
                Link attachment
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Upload CSV file:</h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded">
              {error}
            </div>
          )}

          {/* Results */}
          {transformedData && (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded">
                Successfully processed {transformedData.length} rows
              </div>
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
