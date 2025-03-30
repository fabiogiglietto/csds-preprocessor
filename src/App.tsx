import { useState } from 'react';
import Papa from 'papaparse';
import { CSDSRow } from './types';

// Updated type definitions to include Telegram
type SourceType = 'facebook' | 'instagram' | 'tiktok' | 'bluesky' | 'youtube' | 'telegram' | null;
type AccountSource = 'post_owner' | 'surface' | 'author' | 'username' | 'channel' | 'telegram_channel' | 'telegram_author' | null;
type ObjectIdSource = 'text' | 'link' | 'video_description' | 'voice_to_text' |
                      'video_url' | 'effect_ids' | 'music_id' | 'hashtag_names' |
                      'videoTitle' | 'videoDescription' | 'tags' | 'message_text' | null;

// --- Helper Components for Messages/Alerts ---

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ type, children }) => {
  const baseClasses = "p-4 rounded-lg border mt-2";
  let specificClasses = "";
  let IconComponent: React.ElementType | null = null;

  switch (type) {
    case 'info':
      specificClasses = "bg-blue-50 border-blue-200 text-blue-800";
      IconComponent = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'success':
      specificClasses = "bg-green-50 border-green-200 text-green-800";
       IconComponent = () => (
         <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
         </svg>
       );
      break;
    case 'warning': // Used for file size > 15MB
      specificClasses = "bg-yellow-50 border-yellow-200 text-yellow-800";
      IconComponent = () => (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-5.75a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4z" clipRule="evenodd" />
          </svg>
      );
      break;
    case 'error':
      specificClasses = "bg-red-50 border-red-200 text-red-800";
       IconComponent = () => (
         <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
         </svg>
       );
      break;
  }

  return (
    <div className={`${baseClasses} ${specificClasses} flex items-start`}>
      {IconComponent && <IconComponent />}
      <div className="flex-grow">{children}</div>
    </div>
  );
};


// --- Main App Component ---

function App() {
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [accountSource, setAccountSource] = useState<AccountSource>(null);
  const [objectIdSource, setObjectIdSource] = useState<ObjectIdSource>(null);
  const [transformedData, setTransformedData] = useState<CSDSRow[] | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [skippedRows, setSkippedRows] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');

  const resetState = () => {
    setTransformedData(null);
    setFeedbackMessage(null);
    setProcessedRows(0);
    setSkippedRows(0);
    setIsLoading(false);
    setFileName('');
    // Keep source type, account source, object ID source if user might re-upload
  };

  const handleSourceTypeChange = (value: SourceType) => {
    setSourceType(value);
    resetState(); // Reset everything else when source changes

    // Auto-select account source for certain platforms
    if (value === 'bluesky') {
      setAccountSource('username');
      setObjectIdSource('text');
    } else if (value === 'youtube') {
      setAccountSource('channel');
      setObjectIdSource(null); // Require user to select object ID
    } else if (value === 'tiktok') {
      setAccountSource('author');
      setObjectIdSource(null); // Require user to select object ID
    } else if (value === 'telegram') {
      setAccountSource(null); // Let user choose either channel or author
      setObjectIdSource('message_text'); // Default to message_text for Telegram
    } else {
      setAccountSource(null); // Require user to select account source
      setObjectIdSource(null); // Require user to select object ID
    }
  };

  const handleAccountSourceChange = (value: AccountSource) => {
    setAccountSource(value);
    // Don't reset objectIdSource if it was auto-selected (like for BlueSky)
    if (sourceType !== 'bluesky') {
        setObjectIdSource(null);
    }
    
    // For Telegram, auto-select message_text as the object ID source
    if (sourceType === 'telegram') {
        setObjectIdSource('message_text');
    }
    
    setTransformedData(null); // Reset results if account source changes
    setFeedbackMessage(null);
    setProcessedRows(0);
    setSkippedRows(0);
    setFileName('');
  };

  const handleObjectIdSourceChange = (value: ObjectIdSource) => {
    setObjectIdSource(value);
    setTransformedData(null); // Reset results if object ID changes
    setFeedbackMessage(null);
    setProcessedRows(0);
    setSkippedRows(0);
    setFileName('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    resetState(); // Reset previous results and messages
    setIsLoading(true); // Start loading indicator

    // Basic check before parsing
    if (!sourceType || !accountSource || !objectIdSource) {
        setFeedbackMessage({ type: 'error', text: 'Please ensure all selections (Platform, Account Source, Object ID Source) are made before uploading.' });
        setIsLoading(false);
        setFileName('');
        // Clear the file input value
        if (event.target) {
            event.target.value = '';
        }
        return;
    }


    Papa.parse(file, {
      header: true,
      dynamicTyping: true, // Be careful with this, might infer wrong types
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let skipped = 0;
          const requiredFieldsPresent = results.meta?.fields; // Check if headers exist

          if (!requiredFieldsPresent || results.data.length === 0) {
            setFeedbackMessage({ type: 'error', text: 'The CSV file appears to be empty or does not contain header rows.' });
            setIsLoading(false);
            return;
          }

          // Row validation and transformation logic (keep as is, but ensure robustness)
          const transformed = results.data
            .map((row: any, index: number) => { // Add index for potential logging
                // Check for required fields based on source type and selections
                let isValid = false;
                let accountIdVal: string | number | undefined;
                let contentIdVal: string | number | undefined;
                let timestampVal: string | number | undefined;
                let objectIdSourceVal: any; // Can be string, number, boolean

                try {
                    if (sourceType === 'telegram') {
                        // For Telegram data
                        if (accountSource === 'telegram_channel') {
                            accountIdVal = `${row.channel_name} ${row.channel_id}`;
                        } else if (accountSource === 'telegram_author') {
                            accountIdVal = `${row.post_author} ${row.sender_id}`;
                        }
                        
                        contentIdVal = row.message_id;
                        timestampVal = row.date;
                        objectIdSourceVal = row.message_text;
                        
                        isValid = Boolean(accountIdVal && contentIdVal && timestampVal && objectIdSourceVal !== undefined && objectIdSourceVal !== null);
                    }
                    else if (sourceType === 'youtube') {
                        accountIdVal = row.channelId;
                        contentIdVal = row.videoId;
                        timestampVal = row.publishedAt;
                        switch (objectIdSource) {
                            case 'videoTitle': objectIdSourceVal = row.videoTitle; break;
                            case 'videoDescription': objectIdSourceVal = row.videoDescription; break;
                            case 'tags': objectIdSourceVal = row.tags; break;
                        }
                        isValid = Boolean(accountIdVal && contentIdVal && timestampVal && objectIdSourceVal !== undefined && objectIdSourceVal !== null && objectIdSourceVal !== '');
                    } else if (sourceType === 'bluesky') {
                        accountIdVal = row.username;
                        contentIdVal = row.id;
                        timestampVal = row.date;
                        objectIdSourceVal = row.text; // Always text for BlueSky
                        isValid = Boolean(accountIdVal && contentIdVal && timestampVal && objectIdSourceVal !== undefined && objectIdSourceVal !== null && objectIdSourceVal !== '');
                    } else if (sourceType === 'tiktok') {
                        accountIdVal = row.author_name; // Use author_name as ID base
                        contentIdVal = row.video_id;
                        timestampVal = row.create_time;
                        switch (objectIdSource) {
                            case 'video_description': objectIdSourceVal = row.video_description; break;
                            case 'voice_to_text': objectIdSourceVal = row.voice_to_text; break;
                            case 'video_url': objectIdSourceVal = row.video_url; break;
                            case 'effect_ids': objectIdSourceVal = row.effect_ids; break; // Allow 0 or empty array
                            case 'music_id': objectIdSourceVal = row.music_id; break; // Allow 0 or empty string
                            case 'hashtag_names': objectIdSourceVal = row.hashtag_names; break;
                        }
                        // Check for presence and non-empty string for text-based fields, allow falsy for others if selected
                        const objectIdRequired = ['video_description', 'voice_to_text', 'video_url', 'hashtag_names'].includes(objectIdSource || '');
                        const objectIdCheckPassed = objectIdRequired ? Boolean(objectIdSourceVal) : (objectIdSourceVal !== undefined && objectIdSourceVal !== null);

                        isValid = Boolean(accountIdVal && contentIdVal && timestampVal && objectIdCheckPassed);
                    } else { // Facebook / Instagram
                        const idField = accountSource === 'post_owner' ? 'post_owner.id' : 'surface.id';
                        const nameField = accountSource === 'post_owner' ? 'post_owner.name' : 'surface.name';
                        accountIdVal = row[idField];
                        contentIdVal = row.id;
                        timestampVal = row.creation_time;
                        objectIdSourceVal = (objectIdSource === 'text') ? row.text : row['link_attachment.link'];
                        isValid = Boolean(accountIdVal && row[nameField] && contentIdVal && timestampVal && objectIdSourceVal !== undefined && objectIdSourceVal !== null && objectIdSourceVal !== '');
                    }
                } catch (parseRowError) {
                    console.warn(`Skipping row ${index + 1} due to parsing issue:`, parseRowError);
                    isValid = false;
                }


                if (!isValid) {
                    skipped++;
                    return null; // Skip invalid rows
                }

                // Transform valid rows
                try {
                    if (sourceType === 'telegram') {
                        return {
                            account_id: String(accountIdVal),
                            content_id: String(contentIdVal),
                            object_id: String(objectIdSourceVal || ''),
                            timestamp_share: typeof timestampVal === 'string' ? 
                                Math.floor(new Date(timestampVal).getTime() / 1000) : 
                                typeof timestampVal === 'number' ? 
                                    timestampVal : 
                                    Math.floor(Date.now() / 1000)
                        };
                    }
                    else if (sourceType === 'youtube') {
                        return {
                            account_id: `${row.channelTitle} (${row.channelId})`,
                            content_id: String(row.videoId),
                            object_id: String(objectIdSourceVal),
                            timestamp_share: Math.floor(new Date(timestampVal as string).getTime() / 1000)
                        };
                    } else if (sourceType === 'bluesky') {
                        return {
                            account_id: String(row.username),
                            content_id: String(row.id),
                            object_id: String(objectIdSourceVal),
                            timestamp_share: Math.floor(new Date(timestampVal as string).getTime() / 1000)
                        };
                    } else if (sourceType === 'tiktok') {
                        // Handle potential non-string values for object_id
                        let finalObjectId = '';
                        if (objectIdSourceVal !== undefined && objectIdSourceVal !== null) {
                            finalObjectId = typeof objectIdSourceVal === 'string' ? objectIdSourceVal : String(objectIdSourceVal);
                        }

                         return {
                             account_id: `${row.author_name} (${row.region_code || 'unknown'})`,
                             content_id: String(row.video_id),
                             object_id: finalObjectId,
                             timestamp_share: Math.floor(new Date(timestampVal as string).getTime() / 1000)
                         };
                    } else { // Facebook / Instagram
                        const idField = accountSource === 'post_owner' ? 'post_owner.id' : 'surface.id';
                        const nameField = accountSource === 'post_owner' ? 'post_owner.name' : 'surface.name';
                        return {
                            account_id: `${row[nameField]} (${row[idField]})`,
                            content_id: String(row.id),
                            object_id: String(objectIdSourceVal),
                            timestamp_share: Math.floor(new Date(timestampVal as string).getTime() / 1000)
                        };
                    }
                } catch (transformError) {
                     console.warn(`Skipping row ${index + 1} due to transformation issue:`, transformError);
                     skipped++;
                     return null;
                }
            })
            .filter((row): row is CSDSRow => row !== null); // Filter out nulls (skipped rows)


          setSkippedRows(skipped);
          setProcessedRows(transformed.length);

          if (transformed.length === 0) {
            setFeedbackMessage({ type: 'error', text: `No valid data rows could be processed from ${fileName}. Check column names and content requirements. ${skipped > 0 ? `(${skipped} rows skipped)` : ''}`});
            setIsLoading(false);
            return;
          }

          const csvContent = Papa.unparse(transformed);
          const estimatedSizeMB = new Blob([csvContent]).size / (1024 * 1024);

          setTransformedData(transformed);
          setIsLoading(false);

          // Set success/warning message AFTER setting data
           if (estimatedSizeMB > 15) {
               setFeedbackMessage({ type: 'warning', text: `Processed ${transformed.length} rows successfully. ${skipped > 0 ? `(${skipped} rows skipped).` : ''} Warning: The transformed file size (${estimatedSizeMB.toFixed(1)}MB) exceeds the 15MB limit of the Coordinated Sharing Detection Service. Consider reducing the input file size.` });
           } else {
               setFeedbackMessage({ type: 'success', text: `Successfully processed ${transformed.length} rows from ${fileName}. ${skipped > 0 ? `(${skipped} rows skipped).` : ''} Ready for download.` });
           }

        } catch (err) {
          console.error('Processing error:', err);
          setFeedbackMessage({ type: 'error', text: `Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}` });
          setIsLoading(false);
        }
      },
      error: (error: Papa.ParseError) => {
        console.error('Parse error:', error);
        setFeedbackMessage({ type: 'error', text: `Error parsing CSV: ${error.message}` });
        setIsLoading(false);
        setFileName('');
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
    // Generate a more descriptive filename
    const outputFilename = `${sourceType}_csds_ready_${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute('download', outputFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Determine if the next step should be enabled
  const step2Enabled = !!sourceType;
  const step3Enabled = step2Enabled && !!accountSource;
  const step4Enabled = step3Enabled && !!objectIdSource;

  const getStepClasses = (enabled: boolean) => {
      return `bg-gray-50 rounded-lg p-6 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-50'}`;
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-8 px-4 font-['Comfortaa'] text-[#3d3d3c]">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#00926c] p-6 text-white">
            <h1 className="text-3xl font-bold text-center">
            CSDS Pre-processor
            </h1>
            <p className="mt-2 text-center text-sm opacity-90 max-w-2xl mx-auto">
                Transform CSV data from Meta Content Library, TikTok Research API, BlueSky (via Communalytic), YouTube Data Tools, and Telegram into the standard CSDS format.
            </p>
        </div>

        <div className="p-8 space-y-6">
          <Alert type="info">
              Your data is processed entirely in your browser — no CSV content is sent to any server or third party. See the <a href="https://github.com/fabiogiglietto/csds-preprocessor" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">source code</a> for details.
          </Alert>

          {/* Step 1: Source Selection */}
          <div className={getStepClasses(true)}> {/* Step 1 is always enabled */}
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-7 h-7 text-base mr-3">1</span>
              Choose Source Platform
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-4">
              {/* Radio buttons using labels for better click area */}
              {(['facebook', 'instagram', 'tiktok', 'youtube', 'bluesky', 'telegram'] as const).map(platform => (
                <label key={platform} className={`flex items-center p-3 border rounded-lg transition-colors duration-200 cursor-pointer ${sourceType === platform ? 'border-[#00926c] bg-[#00926c]/10 ring-2 ring-[#00926c]' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-100'}`}>
                  <input
                    type="radio"
                    value={platform}
                    checked={sourceType === platform}
                    onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                    className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c] border-gray-300"
                  />
                   {platform === 'bluesky' ? 'BlueSky' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                   {platform === 'bluesky' && <span className="text-xs ml-1 opacity-70">(Communalytic)</span>}
                </label>
              ))}
            </div>
             {/* Links moved below platform selection */}
             <div className="mt-4 text-xs text-gray-500 space-x-2">
                  <span>Input sources:</span>
                  <a href="https://developers.facebook.com/docs/content-library-and-api/content-library" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">Meta</a>,
                  <a href="https://developers.tiktok.com/products/research-api/" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">TikTok</a>,
                  <a href="https://communalytic.org/" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">BlueSky (via Communalytic)</a>,
                  <a href="https://ytdt.digitalmethods.net/mod_videos_list.php" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">YouTube</a>,
                  <a href="https://telegram.org/" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">Telegram</a>
                  <span>→</span>
                  <a href="https://coortweet.lab.atc.gr/" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">CSDS (CooRTweet)</a>
             </div>
          </div>

          {/* Step 2: Account Source Selection */}
          <div className={getStepClasses(step2Enabled)}>
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className={`flex items-center justify-center rounded-full w-7 h-7 text-base mr-3 ${step2Enabled ? 'bg-[#00926c] text-white' : 'bg-gray-300 text-gray-600'}`}>2</span>
              Choose Account Source
            </h2>
            {!step2Enabled && <p className="text-sm text-gray-500 italic">Select a platform in Step 1.</p>}
            {step2Enabled && (
              <>
                {sourceType === 'bluesky' && <Alert type="info">For BlueSky, 'username' is automatically selected as the account source.</Alert>}
                {sourceType === 'youtube' && <Alert type="info">For YouTube, 'channel' (Title + ID) is automatically selected as the account source.</Alert>}
                {sourceType === 'tiktok' && <Alert type="info">For TikTok, 'author' (Name + Region) is automatically selected as the account source.</Alert>}
                
                {sourceType === 'telegram' && (
                  <div className="flex flex-wrap gap-6 mt-4">
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input 
                        type="radio" 
                        value="telegram_channel" 
                        checked={accountSource === 'telegram_channel'} 
                        onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} 
                        className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" 
                      />
                      Channel (<code>channel_name</code>, <code>channel_id</code>)
                    </label>
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input 
                        type="radio" 
                        value="telegram_author" 
                        checked={accountSource === 'telegram_author'} 
                        onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} 
                        className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" 
                      />
                      Author (<code>post_author</code>, <code>sender_id</code>)
                    </label>
                  </div>
                )}

                {(sourceType === 'facebook' || sourceType === 'instagram') && (
                  <div className="flex flex-wrap gap-6 mt-4">
                    <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                      <input type="radio" value="post_owner" checked={accountSource === 'post_owner'} onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                      Post Owner (<code>post_owner.id</code>, <code>post_owner.name</code>)
                    </label>
                    {sourceType === 'facebook' && (
                      <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                        <input type="radio" value="surface" checked={accountSource === 'surface'} onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                        Surface (<code>surface.id</code>, <code>surface.name</code>)
                      </label>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 3: Object ID Selection */}
          <div className={getStepClasses(step3Enabled)}>
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className={`flex items-center justify-center rounded-full w-7 h-7 text-base mr-3 ${step3Enabled ? 'bg-[#00926c] text-white' : 'bg-gray-300 text-gray-600'}`}>3</span>
              Choose Object ID Source
            </h2>
             {!step3Enabled && <p className="text-sm text-gray-500 italic">Complete Step 2 first.</p>}
            {step3Enabled && (
              <>
                {sourceType === 'bluesky' && <Alert type="info">For BlueSky, 'text' (post content) is automatically selected as the Object ID.</Alert>}
                {sourceType === 'telegram' && <Alert type="info">For Telegram, 'message_text' is automatically selected as the Object ID source.</Alert>}

                {sourceType === 'youtube' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {(['videoTitle', 'videoDescription', 'tags'] as const).map(opt => (
                       <label key={opt} className={`flex items-center p-3 border rounded-lg transition-colors duration-200 cursor-pointer ${objectIdSource === opt ? 'border-[#00926c] bg-[#00926c]/10 ring-2 ring-[#00926c]' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-100'}`}>
                         <input type="radio" value={opt} checked={objectIdSource === opt} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                         {opt.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                       </label>
                    ))}
                  </div>
                )}
                {sourceType === 'tiktok' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                       {(['video_description', 'voice_to_text', 'video_url', 'effect_ids', 'music_id', 'hashtag_names'] as const).map(opt => (
                           <label key={opt} className={`flex items-center p-3 border rounded-lg transition-colors duration-200 cursor-pointer ${objectIdSource === opt ? 'border-[#00926c] bg-[#00926c]/10 ring-2 ring-[#00926c]' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-100'}`}>
                               <input type="radio" value={opt} checked={objectIdSource === opt} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                               {opt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                           </label>
                       ))}
                   </div>
                )}
                {(sourceType === 'facebook' || sourceType === 'instagram') && (
                  <div className="flex flex-wrap gap-6 mt-4">
                     <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                       <input type="radio" value="text" checked={objectIdSource === 'text'} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                       Text content (<code>text</code>)
                     </label>
                     {sourceType === 'facebook' && (
                       <label className="flex items-center hover:text-[#00926c] cursor-pointer">
                         <input type="radio" value="link" checked={objectIdSource === 'link'} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                         Link attachment (<code>link_attachment.link</code>)
                       </label>
                     )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 4: File Upload */}
          <div className={getStepClasses(step4Enabled)}>
             <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className={`flex items-center justify-center rounded-full w-7 h-7 text-base mr-3 ${step4Enabled ? 'bg-[#00926c] text-white' : 'bg-gray-300 text-gray-600'}`}>4</span>
              Upload CSV File
            </h2>
             {!step4Enabled && <p className="text-sm text-gray-500 italic">Complete Step 3 first.</p>}
             {step4Enabled && (
                 <>
                    <div className="mt-4">
                         <label htmlFor="file-upload" className={`relative cursor-pointer rounded-md font-medium text-[#00926c] hover:text-[#007d5c] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#00926c] ${!step4Enabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                           <div className="flex items-center justify-center px-6 py-4 border-2 border-[#00926c] border-dashed rounded-md">
                               <div className="space-y-1 text-center">
                                   <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                       <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                   </svg>
                                   <div className="flex text-sm text-gray-600">
                                       <span className="px-1">{fileName || 'Click to upload a CSV file'}</span>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            disabled={!step4Enabled || isLoading}
                                            className="sr-only" // Hide default input, style the label
                                        />
                                   </div>
                                    <p className="text-xs text-gray-500">Max CSDS file size: 15MB</p>
                               </div>
                           </div>
                        </label>
                    </div>
                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="mt-4 flex items-center justify-center text-gray-600">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#00926c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing your file... please wait.
                        </div>
                    )}
                     {/* Specific instructions based on platform */}
                     {sourceType === 'bluesky' && <Alert type="info">Required BlueSky (Communalytic) columns: 'id', 'date', 'username', 'text'</Alert>}
                     {sourceType === 'youtube' && <Alert type="info">Required YouTube Data Tools columns: 'videoId', 'channelTitle', 'channelId', 'publishedAt', and your selected Object ID source ('videoTitle', 'videoDescription', or 'tags')</Alert>}
                     {sourceType === 'tiktok' && <Alert type="info">Required TikTok columns: 'video_id', 'author_name', 'create_time', and your selected Object ID source</Alert>}
                     {sourceType === 'telegram' && <Alert type="info">Required Telegram columns: 'channel_name', 'channel_id', 'message_id', 'date', 'sender_id', 'post_author', 'message_text'</Alert>}
                     {(sourceType === 'facebook' || sourceType === 'instagram') && <Alert type="info">Required Meta columns: 'id', 'creation_time', 'text' (if chosen), 'link_attachment.link' (if chosen, Facebook only), and the ID/Name fields corresponding to your Account Source choice (<code>post_owner.*</code> or <code>surface.*</code>)</Alert>}
                 </>
             )}
          </div>

          {/* Feedback Area */}
          {feedbackMessage && (
              <Alert type={feedbackMessage.type}>
                  {feedbackMessage.text}
              </Alert>
          )}

          {/* Download Button */}
          {transformedData && !isLoading && (
            <div className="mt-6">
              <button
                onClick={handleDownload}
                className="w-full flex justify-center items-center bg-[#00926c] text-white px-8 py-3 rounded-lg font-bold text-lg
                  hover:bg-[#007d5c] transition-colors duration-200 shadow-md hover:shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-[#00926c] focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                 </svg>
                Download Transformed CSV
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 border-t border-gray-200">
          <p>CSDS Pre-processor v1.2.0 - Added Telegram Support</p>
          <p className="mt-1">
            <a
              href="https://github.com/fabiogiglietto/csds-preprocessor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00926c] hover:underline"
            >
              Source code & Issues on GitHub
            </a>
             <span className="mx-1">|</span>
             Developed by <a href="https://github.com/fabiogiglietto" target="_blank" rel="noopener noreferrer" className="text-[#00926c] hover:underline">Fabio Giglietto</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
