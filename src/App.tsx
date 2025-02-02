import { useState } from 'react';
import Papa from 'papaparse';
import { MetaContentLibraryRow, CSDSRow } from './types';

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
      transformHeader: (header: string) => {
        // Remove quotes and whitespace, and handle nested properties
        return header.trim().replace(/^["']|["']$/g, '');
      },
      complete: (results) => {
        try {
          console.log('Headers:', results.meta.fields);
          console.log('First row sample:', results.data[0]);
          
          let skipped = 0;
          const transformed = results.data
            .filter((row: any, index: number) => {
              // Detailed logging for debugging
              if (index === 0) {
                console.log('Surface property:', row.surface);
                console.log('ID property:', row.id);
                console.log('Creation time:', row.creation_time);
                console.log('Text:', row.text);
                console.log('Link attachment:', row.link_attachment);
              }

              // Check if surface exists and has an id
              if (!row || !row.surface || typeof row.surface.id === 'undefined') {
                console.log('Invalid row structure at index', index, row);
                skipped++;
                return false;
              }

              // Check other required fields
              const hasRequiredFields = Boolean(
                row.id &&
                row.creation_time &&
                (objectIdSource === 'text' 
                  ? typeof row.text !== 'undefined' 
                  : row.link_attachment && typeof row.link_attachment.link !== 'undefined')
              );

              if (!hasRequiredFields) {
                console.log('Missing required fields at index', index, row);
                skipped++;
                return false;
              }

              return true;
            })
            .map((row: any) => ({
              account_id: row.surface.id,
              content_id: row.id,
              object_id: objectIdSource === 'text' 
                ? row.text 
                : row.link_attachment.link || '',
              timestamp_share: Math.floor(new Date(row.creation_time).getTime() / 1000)
            }));

          setSkippedRows(skipped);
          setProcessedRows(transformed.length);

          if (transformed.length === 0) {
            console.log('No rows passed validation');
            setError('No valid data found in CSV. Please check the console for details.');
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

  // ... rest of the component remains the same ...
}

export default App;
