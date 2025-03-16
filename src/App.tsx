import { useState } from 'react';
import Papa from 'papaparse';
import { CSDSRow } from './types';

type SourceType = 'facebook' | 'instagram' | 'tiktok' | null;
type AccountSource = 'post_owner' | 'surface' | 'author' | null;
type ObjectIdSource = 'text' | 'link' | 'video_description' | 'voice_to_text' | 'video_url' | 'effect_ids' | 'music_id' | 'hashtag_names' | null;

function App() {
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [accountSource, setAccountSource] = useState<AccountSource>(null);
  const [objectIdSource, setObjectIdSource] = useState<ObjectIdSource>(null);
  const [transformedData, setTransformedData] = useState<CSDSRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [skippedRows, setSkippedRows] = useState<number>(0);
  const [fileName, setFileName] = useState<string>('No file chosen');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleSourceTypeChange = (value: SourceType) => {
    setSourceType(value);
    setAccountSource(null);
    setObjectIdSource(null);
    setTransformedData(null);
    setError(null);
    setFileName('No file chosen');
  };

  const handleAccountSourceChange = (value: AccountSource) => {
    setAccountSource(value);
    setObjectIdSource(null);
    setTransformedData(null);
    setError(null);
    setFileName('No file chosen');
  };

  const handleObjectIdSourceChange = (value: ObjectIdSource) => {
    setObjectIdSource(value);
    setTransformedData(null);
    setError(null);
    setFileName('No file chosen');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !objectIdSource || !sourceType || !accountSource) return;
    
    setFileName(file.name);
    setIsProcessing(true);
    setError(null);
    
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let skipped = 0;
          const transformed = results.data
            .filter((row: any) => {
              let hasRequiredFields = false;
              
              if (sourceType === 'tiktok') {
                // TikTok API specific field validation
                const hasRequiredBaseFields = Boolean(
                  row &&
                  row.video_id &&
                  row.author_name &&
                  row.create_time
                );
                
                // Check for the specific objectIdSource field
                let hasObjectIdField = false;
                switch(objectIdSource) {
                  case 'video_description':
                    hasObjectIdField = Boolean(row.video_description);
                    break;
                  case 'voice_to_text':
                    hasObjectIdField = Boolean(row.voice_to_text);
                    break;
                  case 'video_url':
                    hasObjectIdField = Boolean(row.video_url);
                    break;
                  case 'effect_ids':
                    hasObjectIdField = row.effect_ids !== null && row.effect_ids !== undefined;
                    break;
                  case 'music_id':
                    hasObjectIdField = row.music_id !== null && row.music_id !== undefined;
                    break;
                  case 'hashtag_names':
                    hasObjectIdField = Boolean(row.hashtag_names);
                    break;
                  default:
                    hasObjectIdField = false;
                }
                
                hasRequiredFields = hasRequiredBaseFields && hasObjectIdField;
              } else {
                // Facebook/Instagram field validation (existing logic)
                const idField = accountSource === 'post_owner' ? 'post_owner.id' : 'surface.id';
                const nameField = accountSource === 'post_owner' ? 'post_owner.name' : 'surface.name';
                
                hasRequiredFields = Boolean(
                  row &&
                  row[idField] && 
                  row[nameField] &&
                  row.id &&
                  row.creation_time &&
                  (objectIdSource === 'text' 
                    ? row.text 
                    : sourceType === 'facebook' ? row['link_attachment.link'] : false)
                );
              }

              if (!hasRequiredFields) {
                skipped++;
                return false;
              }
              return true;
            })
            .map((row: any) => {
              if (sourceType === 'tiktok') {
                // TikTok transformation
                let objectId = '';
                
                switch(objectIdSource) {
                  case 'video_description':
                    objectId = row.video_description || '';
                    break;
                  case 'voice_to_text':
                    objectId = row.voice_to_text || '';
                    break;
                  case 'video_url':
                    objectId = row.video_url || '';
                    break;
                  case 'effect_ids':
                    objectId = row.effect_ids ? row.effect_ids.toString() : '';
                    break;
                  case 'music_id':
                    objectId = row.music_id ? row.music_id.toString() : '';
                    break;
                  case 'hashtag_names':
                    objectId = row.hashtag_names || '';
                    break;
                }
                
                // Parse timestamp from create_time
                const timestamp = new Date(row.create_time).getTime() / 1000;
                
                return {
                  account_id: `${row.author_name} (${row.region_code || 'unknown'})`,
                  content_id: row.video_id,
                  object_id: objectId,
                  timestamp_share: Math.floor(timestamp)
                };
              } else {
                // Facebook/Instagram transformation (existing logic)
                const idField = accountSource === 'post_owner' ? 'post_owner.id' : 'surface.id';
                const nameField = accountSource === 'post_owner' ? 'post_owner.name' : 'surface.name';
                
                return {
                  account_id: `${row[nameField]} (${row[idField]})`,
                  content_id: row.id,
                  object_id: objectIdSource === 'text' 
                    ? row.text 
                    : row['link_attachment.link'] || '',
                  timestamp_share: Math.floor(new Date(row.creation_time).getTime() / 1000)
                };
              }
            });

          const csvContent = Papa.unparse(transformed);
          const estimatedSize = new Blob([csvContent]).size / (1024 * 1024);

          setSkippedRows(skipped);
          setProcessedRows(transformed.length);
          setIsProcessing(false);

          if (transformed.length === 0) {
            setError('No valid data found in CSV');
            return;
          }

          if (estimatedSize > 15) {
            setError(`Warning: The transformed file size (${estimatedSize.toFixed(1)}MB) exceeds the 15MB limit of the Coordinated Sharing Detection Service. Please reduce the number of rows.`);
            return;
          }

          setTransformedData(transformed);
        } catch (err) {
          console.error('Processing error:', err);
          setError(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setIsProcessing(false);
        }
      },
      error: (error: Error) => {
        console.error('Parse error:', error);
        setError(`Error parsing CSV: ${error.message}`);
        setIsProcessing(false);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-6 font-['Comfortaa']">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-8 border-b border-gray-100">
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">
            CSDS Pre-processor
          </h1>
          <div className="text-center px-4 text-gray-600 max-w-2xl mx-auto mb-4">
            <p className="mb-2">Transform data from Meta Content Library and TikTok Research API into the format required by the Coordinated Sharing Detection Service powered by <a href="https://github.com/nicolarighetti/CooRTweet" target="_blank" rel="noopener noreferrer" className="text-[#00926c] font-medium hover:underline">CooRTweet</a>.</p>
          </div>
          
          {/* Privacy Notice */}
          <div className="flex items-center bg-blue-50 text-blue-700 p-3 rounded-md max-w-2xl mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Your data is processed entirely in your browser — no CSV content is sent to any server or third party.</span>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-8">
          <div className="space-y-8">
            {/* Step 1: Source Platform */}
            <div className="step-container">
              <h2 className="font-semibold flex items-center mb-4">
                <div className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-9 h-9 mr-3 shadow-sm">
                  <span>1</span>
                </div>
                Choose source platform:
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${sourceType === 'facebook' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                  onClick={() => handleSourceTypeChange('facebook')}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${sourceType === 'facebook' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                      {sourceType === 'facebook' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span className="font-medium">Facebook</span>
                    </div>
                  </div>
                  {sourceType === 'facebook' && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                  )}
                </div>
                
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${sourceType === 'instagram' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                  onClick={() => handleSourceTypeChange('instagram')}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${sourceType === 'instagram' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                      {sourceType === 'instagram' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <span className="font-medium">Instagram</span>
                    </div>
                  </div>
                  {sourceType === 'instagram' && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                  )}
                </div>
                
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${sourceType === 'tiktok' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                  onClick={() => handleSourceTypeChange('tiktok')}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${sourceType === 'tiktok' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                      {sourceType === 'tiktok' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.243V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" fill="#000000"/>
                      </svg>
                      <span className="font-medium">TikTok</span>
                    </div>
                  </div>
                  {sourceType === 'tiktok' && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Step 2: Account Source */}
            <div className={`step-container ${!sourceType ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="font-semibold flex items-center mb-4">
                <div className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-9 h-9 mr-3 shadow-sm">
                  <span>2</span>
                </div>
                Choose account source:
              </h2>
              
              {sourceType === 'facebook' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${accountSource === 'post_owner' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleAccountSourceChange('post_owner')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${accountSource === 'post_owner' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {accountSource === 'post_owner' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Post Owner</span>
                    </div>
                    {accountSource === 'post_owner' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${accountSource === 'surface' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleAccountSourceChange('surface')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${accountSource === 'surface' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {accountSource === 'surface' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Surface</span>
                    </div>
                    {accountSource === 'surface' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                </div>
              )}
              
              {sourceType === 'instagram' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${accountSource === 'post_owner' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleAccountSourceChange('post_owner')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${accountSource === 'post_owner' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {accountSource === 'post_owner' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Post Owner</span>
                    </div>
                    {accountSource === 'post_owner' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                </div>
              )}
              
              {sourceType === 'tiktok' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${accountSource === 'author' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleAccountSourceChange('author')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${accountSource === 'author' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {accountSource === 'author' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Author</span>
                    </div>
                    {accountSource === 'author' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                </div>
              )}
              
              {!sourceType && <p className="text-sm text-gray-500 mt-2">Please select a source platform first.</p>}
            </div>
            
            {/* Step 3: Object ID Source */}
            <div className={`step-container ${!accountSource ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="font-semibold flex items-center mb-4">
                <div className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-9 h-9 mr-3 shadow-sm">
                  <span>3</span>
                </div>
                Choose object_id source:
              </h2>
              
              {!accountSource && <p className="text-sm text-gray-500 mt-2">Please select an account source first.</p>}
              
              {/* Facebook Object ID Sources */}
              {sourceType === 'facebook' && accountSource && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'text' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('text')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'text' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'text' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Text content</span>
                    </div>
                    {objectIdSource === 'text' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'link' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('link')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'link' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'link' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Link attachment</span>
                    </div>
                    {objectIdSource === 'link' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Instagram Object ID Sources */}
              {sourceType === 'instagram' && accountSource && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'text' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('text')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'text' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'text' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Text content</span>
                    </div>
                    {/* Instagram Object ID Sources - continued */}
                    {objectIdSource === 'text' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                </div>
              )}
              
              {/* TikTok Object ID Sources */}
              {sourceType === 'tiktok' && accountSource && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'video_description' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('video_description')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'video_description' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'video_description' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Video Description</span>
                    </div>
                    {objectIdSource === 'video_description' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'voice_to_text' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('voice_to_text')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'voice_to_text' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'voice_to_text' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Voice to Text</span>
                    </div>
                    {objectIdSource === 'voice_to_text' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'video_url' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('video_url')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'video_url' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'video_url' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Video URL</span>
                    </div>
                    {objectIdSource === 'video_url' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'effect_ids' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('effect_ids')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'effect_ids' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'effect_ids' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Effect IDs</span>
                    </div>
                    {objectIdSource === 'effect_ids' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'music_id' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('music_id')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'music_id' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'music_id' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Music ID</span>
                    </div>
                    {objectIdSource === 'music_id' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${objectIdSource === 'hashtag_names' ? 'border-[#00926c] bg-[#00926c]/5 relative' : 'border-gray-200'}`}
                    onClick={() => handleObjectIdSourceChange('hashtag_names')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 border-2 rounded-full mr-3 flex items-center justify-center ${objectIdSource === 'hashtag_names' ? 'border-[#00926c]' : 'border-gray-300'}`}>
                        {objectIdSource === 'hashtag_names' && <div className="w-3 h-3 rounded-full bg-[#00926c]"></div>}
                      </div>
                      <span className="font-medium">Hashtag Names</span>
                    </div>
                    {objectIdSource === 'hashtag_names' && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-[#00926c]"></div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Step 4: File Upload */}
            <div className={`step-container ${!objectIdSource ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="font-semibold flex items-center mb-4">
                <div className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-9 h-9 mr-3 shadow-sm">
                  <span>4</span>
                </div>
                Upload CSV file:
              </h2>
              
              <div className="mt-2">
                <label className="block">
                  <div className={`inline-flex items-center px-6 py-3 bg-[#00926c] text-white rounded-lg font-semibold cursor-pointer shadow-sm hover:bg-[#007d5c] transition-colors ${!objectIdSource ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    Choose CSV File
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={!objectIdSource}
                    />
                  </div>
                </label>
                <p className="mt-2 text-sm text-gray-500">{fileName}</p>
              </div>
              
              {!objectIdSource && <p className="text-sm text-gray-500 mt-2">Please complete the previous steps first.</p>}
            </div>
            
            {/* Processing and Results */}
            {isProcessing && (
              <div className="mt-8 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-[#00926c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3 text-[#00926c] font-medium">Processing your file...</span>
              </div>
            )}
            
            {error && (
              <div className="mt-8 bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex">
                  <svg className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            {transformedData && (
              <div className="space-y-4 mt-8 pt-8 border-t border-gray-100">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <div>
                      <p className="font-semibold text-green-800">Processing complete!</p>
                      <p className="text-sm text-green-700">
                        Successfully processed {processedRows.toLocaleString()} rows
                        {skippedRows > 0 && ` (${skippedRows.toLocaleString()} skipped due to missing data)`}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center bg-[#00926c] text-white px-6 py-3 rounded-lg font-semibold shadow-sm hover:bg-[#007d5c] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00926c] focus:ring-offset-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Transformed CSV
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 text-center text-gray-500 text-xs">
          <p>CSDS Pre-processor v1.0.0 • <a href="https://github.com/fabiogiglietto/mcl-csds-preprocessor" target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub</a></p>
        </div>
      </div>
    </div>
  );
}

export default App;
