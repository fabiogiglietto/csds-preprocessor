import { useState } from 'react';
import Papa from 'papaparse';
import { CSDSRow } from './types';

// Updated type definitions to include YouTube
type SourceType = 'facebook' | 'instagram' | 'tiktok' | 'bluesky' | 'youtube' | null;
type AccountSource = 'post_owner' | 'surface' | 'author' | 'username' | 'channel' | null;
type ObjectIdSource = 'text' | 'link' | 'video_description' | 'voice_to_text' | 
                      'video_url' | 'effect_ids' | 'music_id' | 'hashtag_names' | 
                      'videoTitle' | 'videoDescription' | 'tags' | null;

function App() {
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [accountSource, setAccountSource] = useState<AccountSource>(null);
  const [objectIdSource, setObjectIdSource] = useState<ObjectIdSource>(null);
  const [transformedData, setTransformedData] = useState<CSDSRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [skippedRows, setSkippedRows] = useState<number>(0);

  const handleSourceTypeChange = (value: SourceType) => {
    setSourceType(value);
    
    // Auto-select account source for certain platforms
    if (value === 'bluesky') {
      setAccountSource('username');
      setObjectIdSource('text');
    } else if (value === 'youtube') {
      setAccountSource('channel');
      setObjectIdSource(null);
    } else if (value === 'tiktok') {
      setAccountSource('author');
      setObjectIdSource(null);
    } else {
      setAccountSource(null);
      setObjectIdSource(null);
    }
    
    setTransformedData(null);
    setError(null);
  };

  const handleAccountSourceChange = (value: AccountSource) => {
    setAccountSource(value);
    setObjectIdSource(null);
    setTransformedData(null);
    setError(null);
  };

  const handleObjectIdSourceChange = (value: ObjectIdSource) => {
    setObjectIdSource(value);
    setTransformedData(null);
    setError(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if required selections are made based on source type
    if (sourceType === 'bluesky') {
      // BlueSky requirements are auto-selected
      if (!sourceType || !accountSource || !objectIdSource) return;
    } else {
      // For other platforms, ensure all selections are made
      if (!sourceType || !accountSource || !objectIdSource) return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let skipped = 0;
          const transformed = results.data
            .filter((row: any) => {
              let hasRequiredFields = false;
              
              if (sourceType === 'youtube') {
                // YouTube API specific field validation
                const hasRequiredBaseFields = Boolean(
                  row &&
                  row.videoId &&
                  row.channelTitle &&
                  row.channelId &&
                  row.publishedAt
                );
                
                // Check for the specific objectIdSource field
                let hasObjectIdField = false;
                switch(objectIdSource) {
                  case 'videoTitle':
                    hasObjectIdField = Boolean(row.videoTitle);
                    break;
                  case 'videoDescription':
                    hasObjectIdField = Boolean(row.videoDescription);
                    break;
                  case 'tags':
                    hasObjectIdField = Boolean(row.tags);
                    break;
                  default:
                    hasObjectIdField = false;
                }
                
                hasRequiredFields = hasRequiredBaseFields && hasObjectIdField;
              } else if (sourceType === 'bluesky') {
                // BlueSky data validation
                hasRequiredFields = Boolean(
                  row &&
                  row.id &&
                  row.username &&
                  row.date &&
                  row.text
                );
              } else if (sourceType === 'tiktok') {
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
                // Facebook/Instagram field validation
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
              if (sourceType === 'youtube') {
                // YouTube transformation
                let objectId = '';
                
                switch(objectIdSource) {
                  case 'videoTitle':
                    objectId = row.videoTitle || '';
                    break;
                  case 'videoDescription':
                    objectId = row.videoDescription || '';
                    break;
                  case 'tags':
                    objectId = row.tags || '';
                    break;
                }
                
                // Parse timestamp from publishedAt
                const timestamp = new Date(row.publishedAt).getTime() / 1000;
                
                return {
                  account_id: `${row.channelTitle} (${row.channelId})`,
                  content_id: row.videoId,
                  object_id: objectId,
                  timestamp_share: Math.floor(timestamp)
                };
              } else if (sourceType === 'bluesky') {
                // BlueSky transformation
                // Convert date to timestamp (seconds since epoch)
                const timestamp = new Date(row.date).getTime() / 1000;
                
                return {
                  account_id: row.username,
                  content_id: row.id,
                  object_id: row.text || '',
                  timestamp_share: Math.floor(timestamp)
                };
              } else if (sourceType === 'tiktok') {
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
                // Facebook/Instagram transformation
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
        <h1 className="text-3xl font-bold text-[#3d3d3c] text-center mb-4">
          CSDS Pre-processor
        </h1>
        <div className="mb-8 text-center px-4 text-[#3d3d3c]/80 max-w-2xl mx-auto">
          <p className="mb-2">Transform data from Meta Content Library, TikTok Research API, BlueSky (via Communalytic), and YouTube Data Tools into the format required by the Coordinated Sharing Detection Service powered by <a href="https://github.com/nicolarighetti/CooRTweet" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">CooRTweet</a>.</p>
          <p className="mt-3 text-sm bg-blue-50 text-blue-700 p-2 rounded-md inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 mb-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Your data is processed entirely in your browser — no CSV content is sent to any server or third party.
          </p>
        </div>
        
        <div className="space-y-8">
          {/* Step 1: Source Selection */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-2 text-[#3d3d3c] flex items-center">
              <span className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-6 h-6 text-sm mr-2">1</span>
              Choose source platform:
            </h2>
            <div className="flex flex-wrap gap-6 mt-4">
              <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                <input
                  type="radio"
                  value="facebook"
                  checked={sourceType === 'facebook'}
                  onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                  className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                />
                Facebook
              </label>
              <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                <input
                  type="radio"
                  value="instagram"
                  checked={sourceType === 'instagram'}
                  onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                  className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                />
                Instagram
              </label>
              <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                <input
                  type="radio"
                  value="tiktok"
                  checked={sourceType === 'tiktok'}
                  onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                  className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                />
                TikTok
              </label>
              <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                <input
                  type="radio"
                  value="youtube"
                  checked={sourceType === 'youtube'}
                  onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                  className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                />
                YouTube
              </label>
              <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                <input
                  type="radio"
                  value="bluesky"
                  checked={sourceType === 'bluesky'}
                  onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                  className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                />
                BlueSky (Communalytic)
              </label>
            </div>
          </div>

          {/* Step 2: Account Source Selection */}
          <div className={`bg-gray-50 rounded-lg p-6 ${!sourceType ? 'opacity-50' : (sourceType === 'bluesky' || sourceType === 'youtube') ? 'bg-gray-50/80' : ''}`}>
            <h2 className="text-lg font-bold mb-2 text-[#3d3d3c] flex items-center">
              <span className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-6 h-6 text-sm mr-2">2</span>
              Choose account source:
            </h2>
            {sourceType === 'bluesky' ? (
              <div className="mt-4 p-2 bg-blue-50 text-blue-700 rounded-md">
                <p className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  For BlueSky, username will be used as the account source
                </p>
              </div>
            ) : sourceType === 'youtube' ? (
              <div className="mt-4 p-2 bg-blue-50 text-blue-700 rounded-md">
                <p className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  For YouTube, channel will be used as the account source
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 mt-4">
                {sourceType === 'tiktok' ? (
                  <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                    <input
                      type="radio"
                      value="author"
                      checked={accountSource === 'author'}
                      onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)}
                      disabled={!sourceType}
                      className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                    />
                    Author
                  </label>
                ) : (
                  <>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="post_owner"
                        checked={accountSource === 'post_owner'}
                        onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)}
                        disabled={!sourceType}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Post Owner
                    </label>
                    {sourceType === 'facebook' && (
                      <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                        <input
                          type="radio"
                          value="surface"
                          checked={accountSource === 'surface'}
                          onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)}
                          disabled={!sourceType}
                          className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                        />
                        Surface
                      </label>
                    )}
                  </>
                )}
              </div>
            )}
            {!sourceType && (
              <p className="text-sm text-[#3d3d3c]/70 mt-2">Please select a source platform first</p>
            )}
          </div>

          {/* Step 3: Object ID Selection */}
          <div className={`bg-gray-50 rounded-lg p-6 ${!accountSource ? 'opacity-50' : (sourceType === 'bluesky') ? 'bg-gray-50/80' : ''}`}>
            <h2 className="text-lg font-bold mb-2 text-[#3d3d3c] flex items-center">
              <span className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-6 h-6 text-sm mr-2">3</span>
              Choose object_id source:
            </h2>
            {sourceType === 'bluesky' ? (
              <div className="mt-4 p-2 bg-blue-50 text-blue-700 rounded-md">
                <p className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  For BlueSky, post text will be used as the object_id
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 mt-4">
                {sourceType === 'youtube' ? (
                  // YouTube specific object_id sources
                  <>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="videoTitle"
                        checked={objectIdSource === 'videoTitle'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Video Title
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="videoDescription"
                        checked={objectIdSource === 'videoDescription'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Video Description
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="tags"
                        checked={objectIdSource === 'tags'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Tags
                    </label>
                  </>
                ) : sourceType === 'tiktok' ? (
                  // TikTok specific object_id sources
                  <>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="video_description"
                        checked={objectIdSource === 'video_description'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Video Description
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="voice_to_text"
                        checked={objectIdSource === 'voice_to_text'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Voice to Text
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="video_url"
                        checked={objectIdSource === 'video_url'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Video URL
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="effect_ids"
                        checked={objectIdSource === 'effect_ids'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Effect IDs
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="music_id"
                        checked={objectIdSource === 'music_id'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Music ID
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="hashtag_names"
                        checked={objectIdSource === 'hashtag_names'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Hashtag Names
                    </label>
                  </>
                ) : (
                  // Facebook/Instagram object_id sources
                  <>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input
                        type="radio"
                        value="text"
                        checked={objectIdSource === 'text'}
                        onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                        disabled={!accountSource}
                        className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                      />
                      Text content
                    </label>
                    {sourceType === 'facebook' && (
                      <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                        <input
                          type="radio"
                          value="link"
                          checked={objectIdSource === 'link'}
                          onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)}
                          disabled={!accountSource}
                          className="mr-2 text-[#00926c] focus:ring-[#00926c]"
                        />
                        Link attachment
                      </label>
                    )}
                  </>
                )}
              </div>
            )}
            {!accountSource && sourceType !== 'bluesky' && (
              <p className="text-sm text-[#3d3d3c]/70 mt-2">Please select an account source first</p>
            )}
          </div>

          {/* Step 4: File Upload */}
          <div className={`bg-gray-50 rounded-lg p-6 ${(!objectIdSource && sourceType !== 'bluesky') ? 'opacity-50' : ''}`}>
            <h2 className="text-lg font-bold mb-2 text-[#3d3d3c] flex items-center">
              <span className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-6 h-6 text-sm mr-2">4</span>
              Upload CSV file:
            </h2>
            <div className="mt-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={!objectIdSource && sourceType !== 'bluesky'}
                className="block w-full text-sm text-[#3d3d3c]
                  file:mr-4 file:py-3 file:px-6
                  file:rounded-lg file:border-0
                  file:text-sm file:font-bold
                  file:bg-[#00926c] file:text-white
                  hover:file:bg-[#007d5c] 
                  cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {!objectIdSource && sourceType !== 'bluesky' && (
                <p className="text-sm text-[#3d3d3c]/70 mt-2">Please complete the previous steps first</p>
              )}
              
              {sourceType === 'bluesky' && (
                <p className="mt-3 text-sm bg-blue-50 text-blue-700 p-2 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 mb-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  For BlueSky: Upload a CSV file exported from Communalytic with columns 'id', 'date', 'username', and 'text'
                </p>
              )}
              
              {sourceType === 'youtube' && (
                <p className="mt-3 text-sm bg-blue-50 text-blue-700 p-2 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 mb-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  For YouTube: Upload a CSV file from YouTube Data Tools with columns 'videoId', 'channelTitle', 'channelId', 'publishedAt', and your selected object_id source
                </p>
              )}
            </div>
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
        
        {/* Footer with version info */}
        <div className="mt-10 text-center text-xs text-gray-500">
          <p>CSDS Pre-processor v1.1.0 - Now with YouTube support</p>
          <p className="mt-1">
            <a 
              href="https://github.com/fabiogiglietto/csds-preprocessor" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#00926c] hover:underline"
            >
              Source code available on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
