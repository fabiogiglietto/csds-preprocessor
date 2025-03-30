import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { CSDSRow } from './types';

// Constants
const CSDS_SIZE_LIMIT_MB = 15;
const TARGET_CHUNK_SIZE_MB = 14.5; // Target slightly lower for safety
const BYTES_PER_MB = 1024 * 1024;
const TARGET_CHUNK_SIZE_BYTES = TARGET_CHUNK_SIZE_MB * BYTES_PER_MB;

// Platform and Source Types (assuming types.ts defines CSDSRow)
type SourceType = 'facebook' | 'instagram' | 'tiktok' | 'bluesky' | 'youtube' | 'telegram' | null;
type AccountSource = 'post_owner' | 'surface' | 'author' | 'username' | 'channel' | 'telegram_channel' | 'telegram_author' | null;
type ObjectIdSource = 'text' | 'link' | 'video_description' | 'voice_to_text' |
                      'video_url' | 'effect_ids' | 'music_id' | 'hashtag_names' |
                      'videoTitle' | 'videoDescription' | 'tags' | 'message_text' | null;


// --- Helper Component for Alerts ---
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ type, children }) => {
  const baseClasses = "p-4 rounded-lg border mt-2 text-sm"; // Added text-sm
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
    case 'warning':
      specificClasses = "bg-yellow-50 border-yellow-300 text-yellow-800"; // Adjusted border color
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
  // Core state
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [accountSource, setAccountSource] = useState<AccountSource>(null);
  const [objectIdSource, setObjectIdSource] = useState<ObjectIdSource>(null);
  const [transformedData, setTransformedData] = useState<CSDSRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Feedback state
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [skippedRows, setSkippedRows] = useState<number>(0);
  const [estimatedSizeMB, setEstimatedSizeMB] = useState<number>(0);

  // Large file strategy state
  const [largeFileStrategy, setLargeFileStrategy] = useState<'sample' | 'split' | 'proceed' | null>(null);
  const [sampleType, setSampleType] = useState<'random' | 'chrono' | 'even' | null>(null);
  const [sampleSize, setSampleSize] = useState<number>(0);
  const [splitParts, setSplitParts] = useState<number>(2);
  const [suggestedSampleSize, setSuggestedSampleSize] = useState<number>(0);
  const [minSplitParts, setMinSplitParts] = useState<number>(2);
  const [numChunks, setNumChunks] = useState<number>(0); // Keep for reference/display if needed

  // --- Utility Functions ---

  const resetState = (keepSelections = false) => {
    setTransformedData(null);
    setFeedbackMessage(null);
    setProcessedRows(0);
    setSkippedRows(0);
    setIsLoading(false);
    setFileName('');
    setEstimatedSizeMB(0);
    setNumChunks(0);
    setLargeFileStrategy(null);
    setSampleType(null);
    setSampleSize(0);
    setSplitParts(2);
    setSuggestedSampleSize(0);
    setMinSplitParts(2);
    if (!keepSelections) {
      setSourceType(null);
      setAccountSource(null);
      setObjectIdSource(null);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Event Handlers ---

  const handleSourceTypeChange = (value: SourceType) => {
    setSourceType(value);
    resetState(); // Reset everything

    // Auto-select logic
    if (value === 'bluesky') {
        setAccountSource('username');
        setObjectIdSource('text');
    } else if (value === 'youtube') {
        setAccountSource('channel');
        setObjectIdSource(null);
    } else if (value === 'tiktok') {
        setAccountSource('author');
        setObjectIdSource(null);
    } else if (value === 'telegram') {
        setAccountSource(null);
        setObjectIdSource('message_text'); // Default, can be overridden if more options added later
    } else { // FB, Instagram
        setAccountSource(null);
        setObjectIdSource(null);
    }
  };

  const handleAccountSourceChange = (value: AccountSource) => {
    setAccountSource(value);
    // Reset objectIdSource unless auto-selected
    if (sourceType !== 'bluesky' && sourceType !== 'telegram') {
        setObjectIdSource(null);
    }
    // Auto-select for Telegram if not already set (it should be by handleSourceTypeChange, but good failsafe)
    if (sourceType === 'telegram' && !objectIdSource) {
        setObjectIdSource('message_text');
    }
    resetState(true); // Reset results but keep selections
  };

  const handleObjectIdSourceChange = (value: ObjectIdSource) => {
    setObjectIdSource(value);
    resetState(true); // Reset results but keep selections
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    resetState(true); // Reset previous results, keep selections
    setIsLoading(true);

    if (!sourceType || !accountSource || !objectIdSource) {
      setFeedbackMessage({ type: 'error', text: 'Please ensure all selections (Platform, Account Source, Object ID Source) are made before uploading.' });
      setIsLoading(false);
      setFileName('');
      if (event.target) event.target.value = '';
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: false, // Treat all as strings initially
      skipEmptyLines: true,
      complete: (results) => {
        setIsLoading(true); // Ensure loading stays true during processing
        try {
          let skipped = 0;
          const headers = results.meta?.fields;

          if (!headers || results.data.length === 0) {
            setFeedbackMessage({ type: 'error', text: 'The CSV file appears to be empty or does not contain header rows.' });
            setIsLoading(false);
            return;
          }

          // --- Header Validation ---
          const getRequiredHeaders = () => {
              if (!sourceType || !accountSource || !objectIdSource) return []; // Should not happen due to earlier check
              if (sourceType === 'youtube') return ['videoId', 'channelTitle', 'channelId', 'publishedAt', objectIdSource];
              if (sourceType === 'bluesky') return ['id', 'date', 'username', 'text'];
              if (sourceType === 'tiktok') return ['video_id', 'author_name', 'create_time', objectIdSource];
              if (sourceType === 'telegram') {
                  const accountFields = accountSource === 'telegram_channel' ? ['channel_name', 'channel_id'] : ['post_author', 'sender_id'];
                  return ['message_id', 'date', 'message_text', ...accountFields];
              }
              // FB/Insta
              const accountIdField = accountSource === 'post_owner' ? 'post_owner.id' : 'surface.id';
              const accountNameField = accountSource === 'post_owner' ? 'post_owner.name' : 'surface.name';
              const objectField = objectIdSource === 'text' ? 'text' : (sourceType === 'facebook' ? 'link_attachment.link' : '');
              return ['id', 'creation_time', accountIdField, accountNameField, objectField].filter(Boolean);
          };

          const requiredHeaders = getRequiredHeaders();
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

          if (missingHeaders.length > 0) {
              setFeedbackMessage({ type: 'error', text: `Missing required columns in CSV: ${missingHeaders.join(', ')}. Please check the file and your selections.` });
              setIsLoading(false);
              return;
          }

          // --- Row Transformation & Validation ---
          const transformed: CSDSRow[] = results.data
            .map((row: any, index: number): CSDSRow | null => {
                let isValid = false;
                let accountIdVal: string | number | undefined;
                let contentIdVal: string | number | undefined;
                let timestampVal: string | number | undefined;
                let objectIdSourceVal: any;
                let accountName: string | undefined; // For display name construction

                try {
                    // Extract platform-specific raw values
                    if (sourceType === 'telegram') {
                        contentIdVal = row.message_id;
                        timestampVal = row.date;
                        objectIdSourceVal = row.message_text;
                        if (accountSource === 'telegram_channel') {
                            accountIdVal = row.channel_id;
                            accountName = row.channel_name;
                        } else { // telegram_author
                            accountIdVal = row.sender_id;
                            accountName = row.post_author;
                        }
                        isValid = Boolean(accountIdVal && accountName && contentIdVal && timestampVal && (objectIdSourceVal !== undefined && objectIdSourceVal !== null));
                    } else if (sourceType === 'youtube') {
                        accountIdVal = row.channelId;
                        accountName = row.channelTitle;
                        contentIdVal = row.videoId;
                        timestampVal = row.publishedAt;
                        objectIdSourceVal = row[objectIdSource!];
                        isValid = Boolean(accountIdVal && accountName && contentIdVal && timestampVal && objectIdSourceVal !== undefined && objectIdSourceVal !== null && String(objectIdSourceVal).trim() !== '');
                    } else if (sourceType === 'bluesky') {
                        accountIdVal = row.username; // Username is the ID here
                        accountName = row.username;
                        contentIdVal = row.id;
                        timestampVal = row.date;
                        objectIdSourceVal = row.text;
                        isValid = Boolean(accountIdVal && contentIdVal && timestampVal && objectIdSourceVal !== undefined && objectIdSourceVal !== null && String(objectIdSourceVal).trim() !== '');
                    } else if (sourceType === 'tiktok') {
                        accountIdVal = row.author_name; // Use author_name as part of ID, no separate ID typically
                        accountName = row.author_name;
                        contentIdVal = row.video_id;
                        timestampVal = row.create_time;
                        objectIdSourceVal = row[objectIdSource!];
                        const isPotentiallyEmptyField = ['effect_ids', 'music_id'].includes(objectIdSource!);
                        const checkObjectId = isPotentiallyEmptyField
                            ? (objectIdSourceVal !== undefined && objectIdSourceVal !== null)
                            : (objectIdSourceVal !== undefined && objectIdSourceVal !== null && String(objectIdSourceVal).trim() !== '');
                        isValid = Boolean(accountName && contentIdVal && timestampVal && checkObjectId);
                    } else { // Facebook / Instagram
                        const idField = accountSource === 'post_owner' ? 'post_owner.id' : 'surface.id';
                        const nameField = accountSource === 'post_owner' ? 'post_owner.name' : 'surface.name';
                        accountIdVal = row[idField];
                        accountName = row[nameField];
                        contentIdVal = row.id;
                        timestampVal = row.creation_time;
                        objectIdSourceVal = (objectIdSource === 'text') ? row.text : row['link_attachment.link'];
                        isValid = Boolean(accountIdVal && accountName && contentIdVal && timestampVal && objectIdSourceVal !== undefined && objectIdSourceVal !== null && String(objectIdSourceVal).trim() !== '');
                    }

                    if (!isValid) { throw new Error("Missing required fields in row data."); }

                    // --- Perform Transformation ---
                    let finalAccountId = '';
                    let finalContentId = String(contentIdVal);
                    let finalObjectId = '';
                    let finalTimestamp = 0;

                    // Process Timestamp
                     try {
                         if (typeof timestampVal === 'number' && timestampVal > 10000000000) { // Likely ms timestamp
                            finalTimestamp = Math.floor(timestampVal / 1000);
                         } else if (typeof timestampVal === 'number') { // Assume UNIX seconds
                             finalTimestamp = timestampVal;
                         } else if (typeof timestampVal === 'string') {
                            const date = new Date(timestampVal);
                            if (!isNaN(date.getTime())) {
                                finalTimestamp = Math.floor(date.getTime() / 1000);
                            } else { throw new Error('Invalid date format string'); }
                         } else { throw new Error('Missing or invalid timestamp type'); }
                         if (finalTimestamp <= 0) { throw new Error('Timestamp resulted in zero or negative'); }
                    } catch (timeError) {
                        throw new Error(`Timestamp error: ${timeError instanceof Error ? timeError.message : timeError}`);
                    }

                    // Construct Final Account ID (Name + ID format)
                    if (sourceType === 'telegram') {
                        finalAccountId = `${accountName} (${accountIdVal})`;
                    } else if (sourceType === 'youtube') {
                        finalAccountId = `${accountName} (${accountIdVal})`;
                    } else if (sourceType === 'bluesky') {
                        finalAccountId = String(accountIdVal); // Just username for bluesky
                    } else if (sourceType === 'tiktok') {
                        finalAccountId = `${accountName} (${row.region_code || 'unknown'})`; // No stable ID, use name+region
                    } else { // FB/Insta
                        finalAccountId = `${accountName} (${accountIdVal})`;
                    }

                    // Construct Final Object ID
                    if (objectIdSourceVal !== undefined && objectIdSourceVal !== null) {
                        finalObjectId = typeof objectIdSourceVal === 'string' ? objectIdSourceVal : String(objectIdSourceVal);
                    }

                    // Final Validation of generated fields
                    if (!finalAccountId.trim() || !finalContentId.trim()) {
                        throw new Error('Empty account or content ID generated');
                    }

                    return {
                        account_id: finalAccountId,
                        content_id: finalContentId,
                        object_id: finalObjectId,
                        timestamp_share: finalTimestamp
                    };

                } catch (error) {
                     console.warn(`Skipping row ${index + 1}:`, error instanceof Error ? error.message : error, { rawRow: row });
                     skipped++;
                     return null;
                }
            })
            .filter((row): row is CSDSRow => row !== null);


          setSkippedRows(skipped);
          setProcessedRows(transformed.length);

          if (transformed.length === 0) {
            setFeedbackMessage({ type: 'error', text: `No valid data rows could be processed from ${fileName}. Check column names, content requirements, and selections. ${skipped > 0 ? `(${skipped} rows skipped)` : ''}` });
            setIsLoading(false);
            return;
          }

          // Calculate size and determine strategy options
          const csvContent = Papa.unparse(transformed);
          const totalSize = new Blob([csvContent]).size;
          const totalSizeMB = totalSize / BYTES_PER_MB;

          setTransformedData(transformed); // Store full data
          setEstimatedSizeMB(totalSizeMB); // Store size

          if (totalSizeMB > CSDS_SIZE_LIMIT_MB) {
            const calculatedMinChunks = Math.max(2, Math.ceil(totalSize / TARGET_CHUNK_SIZE_BYTES)); // Ensure at least 2 chunks
            const targetRowSizeBytes = totalSize / transformed.length;
            const calculatedSampleSize = Math.max(1, Math.floor(TARGET_CHUNK_SIZE_BYTES / targetRowSizeBytes));

            setMinSplitParts(calculatedMinChunks);
            setSuggestedSampleSize(calculatedSampleSize);
            setSplitParts(calculatedMinChunks); // Default to minimum required
            setSampleSize(calculatedSampleSize); // Default to suggested size
            setLargeFileStrategy(null); // Force user choice
            setSampleType(null);
            setNumChunks(calculatedMinChunks);

            setFeedbackMessage({
                type: 'warning',
                text: `Processed ${transformed.length} rows (${skipped} skipped). The output file is ${totalSizeMB.toFixed(1)}MB, exceeding the CSDS ${CSDS_SIZE_LIMIT_MB}MB limit. Please choose a strategy below.`
            });
          } else {
            setNumChunks(1);
            setLargeFileStrategy(null); // Not needed
            setFeedbackMessage({
                type: 'success',
                text: `Successfully processed ${transformed.length} rows from ${fileName} (${skipped} skipped). File size is ${totalSizeMB.toFixed(1)}MB. Ready for download.`
            });
          }

        } catch (err) {
          console.error('Overall processing error:', err);
          setFeedbackMessage({ type: 'error', text: `Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}` });
        } finally {
          setIsLoading(false); // Ensure loading is turned off
        }
      },
      error: (error: Papa.ParseError) => {
        console.error('PapaParse error:', error);
        setFeedbackMessage({ type: 'error', text: `Error parsing CSV: ${error.message}` });
        setIsLoading(false);
        setFileName('');
      }
    });
  };

  const handleLargeFileStrategyChange = (strategy: 'sample' | 'split' | 'proceed') => {
    setLargeFileStrategy(strategy);
    if (strategy !== 'sample') setSampleType(null);
    // Reset inputs to suggestions/defaults when strategy changes for predictability
    setSampleSize(suggestedSampleSize);
    setSplitParts(minSplitParts);
  };

  const handleSampleTypeChange = (type: 'random' | 'chrono' | 'even') => {
    setSampleType(type);
  };

  const handleSampleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    const maxRows = transformedData?.length || suggestedSampleSize; // Use actual rows if available
    setSampleSize(isNaN(value) || value < 1 ? 1 : Math.min(value, maxRows)); // Clamp between 1 and total rows
  };

  const handleSplitPartsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setSplitParts(isNaN(value) || value < minSplitParts ? minSplitParts : value);
  };

  // --- Download Logic Functions ---

  const getSampledData = (): CSDSRow[] | null => {
    if (!transformedData || !sampleType || sampleSize <= 0) return null;
    const dataToSample = [...transformedData];
    const finalSampleSize = Math.min(sampleSize, dataToSample.length);

    switch (sampleType) {
      case 'random':
        for (let i = dataToSample.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [dataToSample[i], dataToSample[j]] = [dataToSample[j], dataToSample[i]];
        }
        return dataToSample.slice(0, finalSampleSize);
      case 'chrono':
        dataToSample.sort((a, b) => (b.timestamp_share || 0) - (a.timestamp_share || 0));
        return dataToSample.slice(0, finalSampleSize);
      case 'even':
        const step = Math.max(1, dataToSample.length / finalSampleSize); // Use float step for better distribution potential
        const sampled: CSDSRow[] = [];
        for (let i = 0; sampled.length < finalSampleSize; i++) {
            const index = Math.floor(i * step);
            if (index >= dataToSample.length) break; // Avoid going out of bounds
            sampled.push(dataToSample[index]);
        }
        return sampled; // Might get slightly more/less than exact sampleSize due to flooring, that's ok.
      default: return null;
    }
  };

  const downloadData = (data: CSDSRow[], baseFilename: string, suffix: string) => {
    if (!data || data.length === 0) {
        throw new Error("No data provided for download.");
    }
    setIsLoading(true);
    setFeedbackMessage({ type: 'info', text: `Generating CSV for ${suffix}...` });

    setTimeout(() => { // Allow UI update
      try {
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const downloadFilename = `${baseFilename}_${suffix}.csv`;
        triggerDownload(blob, downloadFilename);
        setFeedbackMessage({ type: 'success', text: `Download initiated for ${suffix}.` });
      } catch (error) {
        console.error(`Error during ${suffix} download:`, error);
        setFeedbackMessage({ type: 'error', text: `Failed to generate CSV for ${suffix}: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        setIsLoading(false);
      }
    }, 50);
  };

  const handleDownloadSample = () => {
    const sampledData = getSampledData();
    if (sampledData) {
        const base = `${sourceType || 'data'}_csds_${sampleType}_sample_${sampledData.length}rows_${new Date().toISOString().slice(0, 10)}`;
        downloadData(sampledData, base, 'sample');
    } else {
        setFeedbackMessage({ type: 'error', text: 'Could not generate sample. Please check selections.' });
    }
  };

  const handleDownloadSplitUser = () => {
    if (!transformedData || splitParts < minSplitParts) {
        setFeedbackMessage({ type: 'error', text: `Invalid number of parts. Minimum is ${minSplitParts}.` });
        return;
    }

    setIsLoading(true);
    setFeedbackMessage({ type: 'info', text: `Preparing ${splitParts} files...` });

    setTimeout(() => {
      try {
        const headerString = Papa.unparse([transformedData[0]], { header: true }).split('\r\n')[0];
        const baseFilename = `${sourceType || 'data'}_csds_ready_${new Date().toISOString().slice(0, 10)}`;
        const totalRows = transformedData.length;
        const rowsPerChunk = Math.ceil(totalRows / splitParts);

        let downloadsInitiated = 0;
        for (let i = 0; i < splitParts; i++) {
            const startIndex = i * rowsPerChunk;
            const endIndex = startIndex + rowsPerChunk;
            const chunkData = transformedData.slice(startIndex, endIndex);

            if (chunkData.length > 0) {
                const chunkCsvString = Papa.unparse(chunkData, { header: false });
                const fullChunkContent = headerString + '\r\n' + chunkCsvString;
                const chunkBlob = new Blob([fullChunkContent], { type: 'text/csv;charset=utf-8;' });
                const chunkFilename = `${baseFilename}_part_${i + 1}_of_${splitParts}.csv`;
                triggerDownload(chunkBlob, chunkFilename);
                downloadsInitiated++;
                 // Optional small delay between downloads if browser blocks rapid ones
                 // await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        setFeedbackMessage({ type: 'success', text: `Initiated download for ${downloadsInitiated} split files.` });
      } catch (error) {
        console.error("Error during split download:", error);
        setFeedbackMessage({ type: 'error', text: `Failed to prepare split files: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        setIsLoading(false);
      }
    }, 50);
  };

  const handleDownloadProceedAnyway = () => {
    if (transformedData) {
        const base = `${sourceType || 'data'}_csds_ready_FULL_${new Date().toISOString().slice(0, 10)}`;
        downloadData(transformedData, base, `full_${estimatedSizeMB.toFixed(1)}MB`);
    }
  };

  const handleFinalDownload = () => {
    if (estimatedSizeMB <= CSDS_SIZE_LIMIT_MB && transformedData) {
        handleDownloadSingle(); // Use the specific single handler
        return;
    }
    // Handle large file strategies
    switch (largeFileStrategy) {
      case 'sample': handleDownloadSample(); break;
      case 'split': handleDownloadSplitUser(); break;
      case 'proceed': handleDownloadProceedAnyway(); break;
      default:
        setFeedbackMessage({ type: 'error', text: 'Please select a strategy for the large file.' });
        break;
    }
  };

  const isDownloadStrategyReady = (): boolean => {
    if (isLoading) return false;
    if (estimatedSizeMB <= CSDS_SIZE_LIMIT_MB && transformedData) return true;
    if (!largeFileStrategy) return false;

    switch (largeFileStrategy) {
      case 'sample': return !!sampleType && sampleSize > 0 && sampleSize <= (transformedData?.length || 0);
      case 'split': return splitParts >= minSplitParts;
      case 'proceed': return true;
      default: return false;
    }
  };

  // --- Step Enablement ---
  const step2Enabled = !!sourceType;
  const step3Enabled = step2Enabled && !!accountSource;
  const step4Enabled = step3Enabled && !!objectIdSource;

  const getStepClasses = (enabled: boolean) => {
    return `bg-gray-50 rounded-lg p-4 sm:p-6 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`; // Added pointer-events-none
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-6 sm:py-8 px-2 sm:px-4 font-['Comfortaa'] text-[#3d3d3c]">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#00926c] p-5 sm:p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold text-center">
            CSDS Pre-processor
            </h1>
            <p className="mt-2 text-center text-xs sm:text-sm opacity-90 max-w-3xl mx-auto">
                 Transform CSV data from Meta, TikTok, BlueSky, YouTube, and Telegram into the standard CSDS format. Handles large files (>{CSDS_SIZE_LIMIT_MB}MB) via Sampling or Splitting.
            </p>
        </div>

        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          <Alert type="info">
              Your data is processed entirely in your browser — no CSV content is sent anywhere. View the <a href="https://github.com/fabiogiglietto/csds-preprocessor" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">source code</a>.
          </Alert>

          {/* --- Step 1: Source Selection --- */}
           <div className={getStepClasses(true)}> {/* Always enabled but inputs disabled if loading */}
             <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
               <span className="flex items-center justify-center bg-[#00926c] text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 text-sm sm:text-base mr-2 sm:mr-3">1</span>
               Choose Source Platform
             </h2>
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-4">
               {(['facebook', 'instagram', 'tiktok', 'youtube', 'bluesky', 'telegram'] as const).map(platform => (
                 <label key={platform} className={`flex items-center p-2 sm:p-3 border rounded-lg transition-colors duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${sourceType === platform ? 'border-[#00926c] bg-[#00926c]/10 ring-2 ring-[#00926c]' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-100'}`}>
                   <input
                     type="radio"
                     value={platform}
                     checked={sourceType === platform}
                     onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                     className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c] border-gray-300"
                     disabled={isLoading}
                   />
                   <span className="text-sm sm:text-base">
                       {platform === 'bluesky' ? 'BlueSky' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                       {platform === 'bluesky' && <span className="text-xs ml-1 opacity-70">(via Communalytic)</span>}
                   </span>
                 </label>
               ))}
             </div>
             {/* Links */}
              <div className="mt-4 text-xs text-gray-500 space-x-1 flex flex-wrap gap-x-2 gap-y-1">
                   <span>Sources:</span>
                   <a href="https://developers.facebook.com/docs/content-library-and-api/content-library" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">Meta</a>,
                   <a href="https://developers.tiktok.com/products/research-api/" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">TikTok</a>,
                   <a href="https://communalytic.org/" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">BlueSky</a>,
                   <a href="https://ytdt.digitalmethods.net/mod_videos_list.php" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">YouTube</a>,
                   <a href="https://core.telegram.org/#telegram-api" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">Telegram</a>
                   <span className="font-bold">→</span>
                   <a href="https://coortweet.lab.atc.gr/" target="_blank" rel="noopener noreferrer" className="text-[#00926c] underline hover:text-[#007d5c]">CSDS (CooRTweet)</a>
              </div>
           </div>

          {/* --- Step 2: Account Source --- */}
          <div className={getStepClasses(step2Enabled)}>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
              <span className={`flex items-center justify-center rounded-full w-6 h-6 sm:w-7 sm:h-7 text-sm sm:text-base mr-2 sm:mr-3 ${step2Enabled ? 'bg-[#00926c] text-white' : 'bg-gray-300 text-gray-600'}`}>2</span>
              Choose Account Source
            </h2>
            {!step2Enabled && <p className="text-sm text-gray-500 italic">Select a platform first.</p>}
            {step2Enabled && (
              <div className="space-y-3">
                {sourceType === 'bluesky' && <Alert type="info">Using 'username' as account source.</Alert>}
                {sourceType === 'youtube' && <Alert type="info">Using 'channelTitle (channelId)' as account source.</Alert>}
                {sourceType === 'tiktok' && <Alert type="info">Using 'author_name (region_code)' as account source.</Alert>}

                {sourceType === 'telegram' && (
                  <div className="flex flex-col sm:flex-row gap-x-6 gap-y-3 mt-2">
                     <label className={`flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-[#00926c]'}`}>
                       <input type="radio" value="telegram_channel" checked={accountSource === 'telegram_channel'} onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                       Channel <code className="ml-1 text-xs">(channel_name, channel_id)</code>
                     </label>
                     <label className={`flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-[#00926c]'}`}>
                       <input type="radio" value="telegram_author" checked={accountSource === 'telegram_author'} onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                       Author <code className="ml-1 text-xs">(post_author, sender_id)</code>
                     </label>
                  </div>
                )}

                {(sourceType === 'facebook' || sourceType === 'instagram') && (
                  <div className="flex flex-col sm:flex-row gap-x-6 gap-y-3 mt-2">
                     <label className={`flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-[#00926c]'}`}>
                       <input type="radio" value="post_owner" checked={accountSource === 'post_owner'} onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                       Post Owner <code className="ml-1 text-xs">(post_owner.id/name)</code>
                     </label>
                     {sourceType === 'facebook' && (
                       <label className={`flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-[#00926c]'}`}>
                         <input type="radio" value="surface" checked={accountSource === 'surface'} onChange={(e) => handleAccountSourceChange(e.target.value as AccountSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                         Surface <code className="ml-1 text-xs">(surface.id/name)</code>
                       </label>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- Step 3: Object ID Source --- */}
          <div className={getStepClasses(step3Enabled)}>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
              <span className={`flex items-center justify-center rounded-full w-6 h-6 sm:w-7 sm:h-7 text-sm sm:text-base mr-2 sm:mr-3 ${step3Enabled ? 'bg-[#00926c] text-white' : 'bg-gray-300 text-gray-600'}`}>3</span>
              Choose Object ID Source
            </h2>
            {!step3Enabled && <p className="text-sm text-gray-500 italic">Complete previous steps.</p>}
            {step3Enabled && (
              <div className="space-y-3">
                {sourceType === 'bluesky' && <Alert type="info">Using 'text' (post content) as Object ID.</Alert>}
                {sourceType === 'telegram' && <Alert type="info">Using 'message_text' as Object ID.</Alert>}

                {sourceType === 'youtube' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
                     {(['videoTitle', 'videoDescription', 'tags'] as const).map(opt => (
                        <label key={opt} className={`flex items-center p-2 sm:p-3 border rounded-lg transition-colors duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${objectIdSource === opt ? 'border-[#00926c] bg-[#00926c]/10 ring-2 ring-[#00926c]' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-100'}`}>
                          <input type="radio" value={opt} checked={objectIdSource === opt} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                          <span className="text-sm sm:text-base">{opt.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        </label>
                     ))}
                  </div>
                )}
                {sourceType === 'tiktok' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
                       {(['video_description', 'voice_to_text', 'video_url', 'effect_ids', 'music_id', 'hashtag_names'] as const).map(opt => (
                           <label key={opt} className={`flex items-center p-2 sm:p-3 border rounded-lg transition-colors duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${objectIdSource === opt ? 'border-[#00926c] bg-[#00926c]/10 ring-2 ring-[#00926c]' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-100'}`}>
                               <input type="radio" value={opt} checked={objectIdSource === opt} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                               <span className="text-sm sm:text-base">{opt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                           </label>
                       ))}
                   </div>
                )}
                {(sourceType === 'facebook' || sourceType === 'instagram') && (
                  <div className="flex flex-col sm:flex-row gap-x-6 gap-y-3 mt-2">
                     <label className={`flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-[#00926c]'}`}>
                       <input type="radio" value="text" checked={objectIdSource === 'text'} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                       Text content <code className="ml-1 text-xs">(text)</code>
                     </label>
                     {sourceType === 'facebook' && (
                       <label className={`flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-[#00926c]'}`}>
                         <input type="radio" value="link" checked={objectIdSource === 'link'} onChange={(e) => handleObjectIdSourceChange(e.target.value as ObjectIdSource)} disabled={isLoading} className="mr-2 h-4 w-4 text-[#00926c] focus:ring-[#00926c]" />
                         Link attachment <code className="ml-1 text-xs">(link_attachment.link)</code>
                       </label>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- Step 4: File Upload --- */}
           <div className={getStepClasses(step4Enabled)}>
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
               <span className={`flex items-center justify-center rounded-full w-6 h-6 sm:w-7 sm:h-7 text-sm sm:text-base mr-2 sm:mr-3 ${step4Enabled ? 'bg-[#00926c] text-white' : 'bg-gray-300 text-gray-600'}`}>4</span>
               Upload CSV File
             </h2>
              {!step4Enabled && <p className="text-sm text-gray-500 italic">Complete previous steps.</p>}
              {step4Enabled && (
                  <div className="space-y-3">
                     <div className="mt-2">
                          <label htmlFor="file-upload" className={`relative rounded-md font-medium text-[#00926c] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#00926c] ${!step4Enabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-[#007d5c]'}`}>
                            <div className={`flex items-center justify-center px-4 py-3 sm:px-6 sm:py-4 border-2 border-dashed rounded-md ${!step4Enabled || isLoading ? 'border-gray-300 bg-gray-100' : 'border-[#00926c] hover:border-[#007d5c]'}`}>
                                <div className="space-y-1 text-center">
                                    <svg className={`mx-auto h-10 w-10 sm:h-12 sm:w-12 ${!step4Enabled || isLoading ? 'text-gray-300' : 'text-gray-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-xs sm:text-sm text-gray-600 justify-center">
                                        <span className="px-1 truncate max-w-[250px] sm:max-w-[400px] md:max-w-[500px]">{fileName || 'Click to upload a CSV file'}</span>
                                         <input
                                             id="file-upload"
                                             name="file-upload"
                                             type="file"
                                             accept=".csv"
                                             onChange={handleFileUpload}
                                             disabled={!step4Enabled || isLoading}
                                             className="sr-only"
                                         />
                                    </div>
                                     <p className="text-xs text-gray-500">Max CSDS file size: {CSDS_SIZE_LIMIT_MB}MB per file</p>
                                </div>
                            </div>
                         </label>
                     </div>
                     {/* Loading Indicator */}
                     {isLoading && (
                         <div className="flex items-center justify-center text-gray-600 pt-2">
                             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#00926c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             {largeFileStrategy === 'split' ? 'Preparing split files...' : largeFileStrategy === 'sample' ? 'Generating sample...' : 'Processing file...'} please wait.
                         </div>
                     )}
                     {/* Required Columns Info */}
                     {step4Enabled && !isLoading && ( // Only show if ready to upload and not loading
                        <Alert type="info">
                            <span className="font-medium">Required Columns:</span> Ensure your CSV has the columns corresponding to your selections above. For example, for {sourceType} using '{accountSource}' account source and '{objectIdSource}' object ID source, the necessary columns are: {getRequiredHeaders().map(h => <code key={h} className="text-xs bg-blue-100 p-0.5 rounded mx-0.5">{h}</code>)}
                        </Alert>
                     )}
                  </div>
              )}
           </div>

          {/* --- Feedback Area (Displays processing results/errors) --- */}
          {feedbackMessage && !isLoading && ( // Show feedback when not loading
              <Alert type={feedbackMessage.type}>
                  {feedbackMessage.text}
              </Alert>
          )}

          {/* --- Download / Strategy Area --- */}
          {transformedData && !isLoading && (
            <div className="mt-4 sm:mt-6 space-y-5 sm:space-y-6">

              {/* --- Strategy Selection UI (Only if file is too large) --- */}
              {estimatedSizeMB > CSDS_SIZE_LIMIT_MB && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 sm:p-6 space-y-4">
                  <h3 className="text-md sm:text-lg font-bold text-yellow-900">File Size Exceeds Limit ({estimatedSizeMB.toFixed(1)}MB / {CSDS_SIZE_LIMIT_MB}MB)</h3>
                  <p className="text-sm text-yellow-800">Choose how to proceed:</p>

                  {/* Strategy Radio Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {(['sample', 'split', 'proceed'] as const).map(strategy => (
                      <label key={strategy} className={`flex items-center p-3 border rounded-lg transition-colors duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${largeFileStrategy === strategy ? 'border-yellow-600 bg-yellow-100 ring-2 ring-yellow-500' : 'border-yellow-300 hover:border-yellow-500 hover:bg-yellow-100'}`}>
                        <input
                          type="radio"
                          name="largeFileStrategy"
                          value={strategy}
                          checked={largeFileStrategy === strategy}
                          onChange={() => handleLargeFileStrategyChange(strategy)}
                          className="mr-3 h-4 w-4 text-yellow-700 focus:ring-yellow-600 border-yellow-400"
                          disabled={isLoading}
                        />
                        <span className="font-medium text-yellow-900 text-sm sm:text-base">
                            {strategy === 'sample' ? 'Create Sample' : strategy === 'split' ? 'Split File' : 'Download Full File'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* --- Sampling Options --- */}
                  {largeFileStrategy === 'sample' && (
                    <div className="pl-4 sm:pl-8 border-l-4 border-yellow-300 ml-1 sm:ml-2 py-3 space-y-3">
                      <p className="text-xs sm:text-sm text-yellow-800">Reduce the dataset to a manageable size.</p>
                      {/* Sample Type Radios */}
                      <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2">
                         {(['random', 'chrono', 'even'] as const).map(type => (
                             <label key={type} className={`flex items-center text-sm ${isLoading || !largeFileStrategy ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                 <input
                                     type="radio"
                                     name="sampleType"
                                     value={type}
                                     checked={sampleType === type}
                                     onChange={() => handleSampleTypeChange(type)}
                                     className="mr-2 h-4 w-4 text-yellow-700 focus:ring-yellow-600 border-yellow-400"
                                     disabled={isLoading || !largeFileStrategy}
                                 />
                                 {type === 'random' ? 'Random' : type === 'chrono' ? 'Most Recent' : 'Even Distribution'}
                             </label>
                         ))}
                      </div>
                       {/* Sample Size Input */}
                       <div className="flex flex-wrap items-center gap-2">
                           <label htmlFor="sample-size" className="text-sm font-medium text-yellow-900 whitespace-nowrap">Number of rows:</label>
                           <input
                               type="number"
                               id="sample-size"
                               value={sampleSize}
                               onChange={handleSampleSizeChange}
                               min="1"
                               max={transformedData.length}
                               className={`block w-full max-w-[120px] sm:max-w-[150px] rounded-md border-yellow-400 shadow-sm focus:border-yellow-600 focus:ring-yellow-600 sm:text-sm p-1.5 sm:p-2 ${isLoading || !sampleType ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                               disabled={isLoading || !sampleType}
                               aria-describedby="sample-size-hint"
                           />
                           <span id="sample-size-hint" className="text-xs text-yellow-700">(Max: {transformedData.length}, Suggested: ~{suggestedSampleSize})</span>
                       </div>
                    </div>
                  )}

                  {/* --- Splitting Options --- */}
                  {largeFileStrategy === 'split' && (
                     <div className="pl-4 sm:pl-8 border-l-4 border-yellow-300 ml-1 sm:ml-2 py-3 space-y-3">
                       <p className="text-xs sm:text-sm text-yellow-800">Divide into smaller files (each under ~{TARGET_CHUNK_SIZE_MB}MB).</p>
                       <div className="flex flex-wrap items-center gap-2">
                           <label htmlFor="split-parts" className="text-sm font-medium text-yellow-900 whitespace-nowrap">Number of parts:</label>
                           <input
                               type="number"
                               id="split-parts"
                               value={splitParts}
                               onChange={handleSplitPartsChange}
                               min={minSplitParts}
                               className={`block w-full max-w-[80px] sm:max-w-[100px] rounded-md border-yellow-400 shadow-sm focus:border-yellow-600 focus:ring-yellow-600 sm:text-sm p-1.5 sm:p-2 ${isLoading || !largeFileStrategy ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                               disabled={isLoading || !largeFileStrategy}
                               aria-describedby="split-parts-hint"
                           />
                           <span id="split-parts-hint" className="text-xs text-yellow-700">(Minimum required: {minSplitParts})</span>
                       </div>
                    </div>
                  )}

                   {/* --- Proceed Anyway Info --- */}
                   {largeFileStrategy === 'proceed' && (
                       <div className="pl-4 sm:pl-8 border-l-4 border-yellow-300 ml-1 sm:ml-2 py-3">
                           <p className="text-xs sm:text-sm text-yellow-800">Download the full {estimatedSizeMB.toFixed(1)}MB file. CSDS may reject files over {CSDS_SIZE_LIMIT_MB}MB.</p>
                       </div>
                   )}
                </div>
              )}

              {/* --- Final Download Button --- */}
              {/* Renders if file is small OR if a large file strategy is chosen */}
              {(estimatedSizeMB <= CSDS_SIZE_LIMIT_MB || largeFileStrategy) && (
                <button
                  onClick={handleFinalDownload}
                  className={`w-full flex justify-center items-center px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg font-bold text-base sm:text-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${largeFileStrategy === 'proceed' ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' :
                      largeFileStrategy === 'split' ? 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500' :
                      'bg-[#00926c] hover:bg-[#007d5c] text-white focus:ring-[#00926c]'}
                    ${!isDownloadStrategyReady() ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={!isDownloadStrategyReady()}
                >
                  {/* Icon and Text logic */}
                  {isLoading ? (
                       <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                  ) : largeFileStrategy === 'sample' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" /></svg>
                  ) : largeFileStrategy === 'split' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846.813a4.5 4.5 0 0 1 3.09 3.09L25.75 18l-.813 2.846a4.5 4.5 0 0 1-3.09 3.09L18.25 24l-2.846-.813a4.5 4.5 0 0 1-3.09-3.09L11.5 18l.813-2.846a4.5 4.5 0 0 1 3.09-3.09L18.25 12Z M18.25 12l2.846.813a4.5 4.5 0 0 1 3.09 3.09L25.75 18l-.813 2.846a4.5 4.5 0 0 1-3.09 3.09L18.25 24l-2.846-.813a4.5 4.5 0 0 1-3.09-3.09L11.5 18l.813-2.846a4.5 4.5 0 0 1 3.09-3.09L18.25 12Z" /></svg>
                  ) : largeFileStrategy === 'proceed' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  ) : ( // Default case: file size OK
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  )}

                  {/* Button Text logic */}
                  {isLoading ? 'Processing...' :
                   largeFileStrategy === 'sample' ? `Download Sample (${sampleSize} rows)` :
                   largeFileStrategy === 'split' ? `Download Split Files (${splitParts} parts)` :
                   largeFileStrategy === 'proceed' ? `Download Full File (${estimatedSizeMB.toFixed(1)}MB)` :
                   `Download Transformed CSV (${estimatedSizeMB.toFixed(1)}MB)`}
                </button>
              )}
            </div>
          )}

          {/* Footer */}
           <div className="bg-gray-50 p-3 sm:p-4 text-center text-xs text-gray-500 border-t border-gray-200 mt-4 sm:mt-6">
             <p>CSDS Pre-processor v1.4.0 - Large File Strategies</p>
             <p className="mt-1">
               <a href="https://github.com/fabiogiglietto/csds-preprocessor" target="_blank" rel="noopener noreferrer" className="text-[#00926c] hover:underline">Source code & Issues</a>
                <span className="mx-1">|</span>
                By <a href="https://github.com/fabiogiglietto" target="_blank" rel="noopener noreferrer" className="text-[#00926c] hover:underline">Fabio Giglietto</a>
             </p>
           </div>
         </div>
       </div>
     );
}

export default App;
