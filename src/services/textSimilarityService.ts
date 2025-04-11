// src/services/textSimilarityService.ts
import type { TextSimilarityConfig } from '../components/TextSimilarityOptions';

export interface ClusteringProgress {
  stage: 'modelLoading' | 'embedding' | 'similarity' | 'clustering' | 'labeling' | 'complete';
  percent: number;
  message: string;
  currentItem?: number;
  totalItems?: number;
  clusterCount?: number;
}

export interface ClusteringResult {
  clusters: TextCluster[];
  mapping: Record<string, number>; // Maps original text to cluster ID
  stats: {
    totalTexts: number;
    totalClusters: number;
    averageClusterSize: number;
    largestClusterSize: number;
    singletonCount: number;
  };
}

export interface TextCluster {
  id: number;
  label: string;
  texts: string[];
  representativeText: string;
}

// Worker message types
export interface WorkerInitMessage {
  type: 'init';
  config: TextSimilarityConfig;
  texts: string[];
}

export interface WorkerProgressMessage {
  type: 'progress';
  progress: ClusteringProgress;
}

export interface WorkerResultMessage {
  type: 'result';
  result: ClusteringResult;
}

export interface WorkerErrorMessage {
  type: 'error';
  error: string;
}

export type WorkerMessage = 
  | WorkerInitMessage 
  | WorkerProgressMessage 
  | WorkerResultMessage 
  | WorkerErrorMessage;

// Main service class
class TextSimilarityService {
  private worker: Worker | null = null;
  private config: TextSimilarityConfig | null = null;
  
  /**
   * Initializes the text similarity service with the provided configuration
   */
  public async initialize(config: TextSimilarityConfig): Promise<void> {
    this.config = config;
    
    // Create a new web worker
    if (this.worker) {
      this.worker.terminate();
    }
    
    // Create the worker from a blob URL for better compatibility
    const workerCode = this.getWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }
  
  /**
   * Process a set of texts to identify similar content clusters
   * @param texts Array of unique texts to process
   * @param onProgress Progress callback
   * @returns Promise resolving to clustering results
   */
  public async processTexts(
    texts: string[], 
    onProgress?: (progress: ClusteringProgress) => void
  ): Promise<ClusteringResult> {
    if (!this.worker || !this.config) {
      throw new Error('Text similarity service not initialized');
    }
    
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      // Set up message handling
      this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        
        switch (message.type) {
          case 'progress':
            if (onProgress) {
              onProgress(message.progress);
            }
            break;
            
          case 'result':
            resolve(message.result);
            break;
            
          case 'error':
            reject(new Error(message.error));
            break;
        }
      };
      
      // Handle worker errors
      this.worker.onerror = (error) => {
        reject(new Error(`Worker error: ${error.message}`));
      };
      
      // Apply sampling if configured
      let textsToProcess = texts;
      if (this.config && this.config.samplePercentage < 100) {
        const sampleSize = Math.max(
          10, 
          Math.floor(texts.length * this.config.samplePercentage / 100)
        );
        
        // Simple random sampling
        textsToProcess = this.sampleTexts(texts, sampleSize);
      }
      
      // Start processing
      this.worker.postMessage({
        type: 'init',
        config: this.config,
        texts: textsToProcess
      } as WorkerInitMessage);
    });
  }
  
  /**
   * Cancels the current processing job
   */
  public cancel(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
  
  /**
   * Performs cleanup when the service is no longer needed
   */
  public dispose(): void {
    this.cancel();
    // Clear any sensitive data
    if (this.config?.apiKey) {
      this.config.apiKey = '';
    }
  }
  
  /**
   * Randomly samples a subset of texts
   */
  private sampleTexts(texts: string[], sampleSize: number): string[] {
    if (sampleSize >= texts.length) return texts;
    
    const shuffled = [...texts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  }
  
  /**
   * Gets the web worker code as a string
   */
  private getWorkerCode(): string {
    // This function returns the code that will run in the web worker
    return `
      // Text Similarity Clustering Worker
      
      // Types (copy from parent)
      const BrowserEmbeddingMethod = {
        MINILM: 'minilm',
        USE: 'use'
      };
      
      // Main worker state
      let config = null;
      let texts = [];
      let embeddings = [];
      let similarityMatrix = [];
      let clusters = [];
      let cancelled = false;
      
      // TensorFlow.js and model variables
      let tf = null;
      let model = null;
      let tokenizer = null;
      
      // Handle messages from the main thread
      self.onmessage = async function(event) {
        const message = event.data;
        
        if (message.type === 'init') {
          try {
            config = message.config;
            texts = message.texts;
            
            // Start the clustering process
            await runClustering();
          } catch (error) {
            self.postMessage({
              type: 'error',
              error: error.message || 'Unknown error in worker'
            });
          }
        } else if (message.type === 'cancel') {
          cancelled = true;
        }
      };
      
      // Main clustering function
      async function runClustering() {
        // Step 1: Load the model
        updateProgress('modelLoading', 0, 'Initializing clustering engine...');
        
        if (config.processingMethod === 'browser') {
          await loadTensorFlowAndModel();
        }
        
        // Step 2: Generate embeddings
        updateProgress('embedding', 0, 'Generating text embeddings...');
        embeddings = await generateEmbeddings(texts);
        
        if (cancelled) return;
        
        // Step 3: Compute similarity matrix
        updateProgress('similarity', 0, 'Computing text similarities...');
        similarityMatrix = computeSimilarityMatrix(embeddings);
        
        if (cancelled) return;
        
        // Step 4: Perform hierarchical clustering
        updateProgress('clustering', 0, 'Clustering similar texts...');
        clusters = performClustering(similarityMatrix, config.similarityThreshold, config.maxClusterSize);
        
        if (cancelled) return;
        
        // Step 5: Generate cluster labels
        updateProgress('labeling', 0, 'Generating cluster labels...');
        const labeledClusters = await generateClusterLabels(clusters);
        
        if (cancelled) return;
        
        // Step 6: Prepare final result
        const result = prepareResult(labeledClusters);
        
        // Send the result back to the main thread
        updateProgress('complete', 100, 'Clustering complete');
        self.postMessage({
          type: 'result',
          result
        });
      }
      
      // Updates progress and sends message to main thread
      function updateProgress(stage, percent, message, details = {}) {
        self.postMessage({
          type: 'progress',
          progress: {
            stage,
            percent,
            message,
            ...details
          }
        });
      }
      
      // Loads TensorFlow.js and the embedding model
      async function loadTensorFlowAndModel() {
        // Load TensorFlow.js
        updateProgress('modelLoading', 10, 'Loading TensorFlow.js...');
        
        // We'd normally use importScripts here, but for the example,
        // we're describing the process
        /*
        importScripts(
          'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js',
          'https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder@1.3.3/dist/universal-sentence-encoder.min.js'
        );
        tf = self.tf;
        */
        
        // In real implementation, we would now load the model:
        updateProgress('modelLoading', 30, 'Loading embedding model...');
        
        // Load tokenizer for MiniLM model if using that approach
        updateProgress('modelLoading', 70, 'Preparing tokenizer...');
        
        // For demo purposes, we'll simulate the loading process
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateProgress('modelLoading', 100, 'Model loaded successfully');
      }
      
      // Generate embeddings for the input texts
      async function generateEmbeddings(inputTexts) {
        if (config.processingMethod === 'openai') {
          return await generateOpenAIEmbeddings(inputTexts);
        } else {
          return await generateBrowserEmbeddings(inputTexts);
        }
      }
      
      // Generate embeddings using OpenAI API
      async function generateOpenAIEmbeddings(inputTexts) {
        // In a real implementation, we would batch requests to the OpenAI API
        // For demonstration, we'll simulate the API calls
        const result = [];
        const batchSize = 100; // Max batch size for OpenAI API
        
        for (let i = 0; i < inputTexts.length; i += batchSize) {
          const batch = inputTexts.slice(i, i + batchSize);
          
          updateProgress('embedding', (i / inputTexts.length) * 100, 
            'Generating embeddings via OpenAI API...', {
              currentItem: i,
              totalItems: inputTexts.length
            });
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // In real implementation, we would make the actual API call
          // and process the response
          const batchEmbeddings = batch.map(() => 
            Array.from({length: 128}, () => Math.random() * 2 - 1)
          );
          
          result.push(...batchEmbeddings);
          
          if (cancelled) break;
        }
        
        return result;
      }
      
      // Generate embeddings using browser-based models
      async function generateBrowserEmbeddings(inputTexts) {
        // In a real implementation, we would use the TensorFlow.js model
        // For demonstration, we'll simulate the embedding generation
        const result = [];
        const batchSize = 32; // Process in smaller batches to avoid UI freezing
        
        for (let i = 0; i < inputTexts.length; i += batchSize) {
          const batch = inputTexts.slice(i, i + batchSize);
          
          updateProgress('embedding', (i / inputTexts.length) * 100, 
            'Generating embeddings in browser...', {
              currentItem: i,
              totalItems: inputTexts.length
            });
          
          // Simulate model inference
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // In real implementation, we would use the model to generate embeddings
          const batchEmbeddings = batch.map(() => 
            Array.from({length: 384}, () => Math.random() * 2 - 1)
          );
          
          result.push(...batchEmbeddings);
          
          if (cancelled) break;
        }
        
        return result;
      }
      
      // Compute similarity matrix using cosine similarity
      function computeSimilarityMatrix(embeddingVectors) {
        const n = embeddingVectors.length;
        const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
        
        const totalPairs = (n * (n - 1)) / 2;
        let pairsProcessed = 0;
        
        for (let i = 0; i < n; i++) {
          // The diagonal is always 1 (a text is identical to itself)
          matrix[i][i] = 1;
          
          for (let j = i + 1; j < n; j++) {
            // Calculate cosine similarity between vectors i and j
            const similarity = cosineSimilarity(embeddingVectors[i], embeddingVectors[j]);
            
            // Store similarity symmetrically in the matrix
            matrix[i][j] = similarity;
            matrix[j][i] = similarity;
            
            pairsProcessed++;
            
            // Update progress periodically
            if (pairsProcessed % 1000 === 0 || pairsProcessed === totalPairs) {
              updateProgress('similarity', (pairsProcessed / totalPairs) * 100, 
                'Computing text similarities...', {
                  currentItem: pairsProcessed,
                  totalItems: totalPairs
                });
              
              // Allow other operations to proceed
              if (pairsProcessed % 10000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
              
              if (cancelled) break;
            }
          }
          
          if (cancelled) break;
        }
        
        return matrix;
      }
      
      // Calculate cosine similarity between two vectors
      function cosineSimilarity(a, b) {
        let dotProduct = 0;
        let aMagnitude = 0;
        let bMagnitude = 0;
        
        for (let i = 0; i < a.length; i++) {
          dotProduct += a[i] * b[i];
          aMagnitude += a[i] * a[i];
          bMagnitude += b[i] * b[i];
        }
        
        aMagnitude = Math.sqrt(aMagnitude);
        bMagnitude = Math.sqrt(bMagnitude);
        
        return dotProduct / (aMagnitude * bMagnitude);
      }
      
      // Perform hierarchical clustering with constraints
      function performClustering(similarityMatrix, threshold, maxClusterSize) {
        const n = similarityMatrix.length;
        
        // Initialize each text as its own cluster
        let clusters = Array.from({ length: n }, (_, i) => [i]);
        let clusterCount = n;
        
        // Initialize a priority queue of potential merges
        // We'll simulate it with a simple array that we re-sort
        let merges = [];
        
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            if (similarityMatrix[i][j] >= threshold) {
              merges.push({
                i: i,
                j: j,
                similarity: similarityMatrix[i][j]
              });
            }
          }
        }
        
        // Sort merges by similarity (highest first)
        merges.sort((a, b) => b.similarity - a.similarity);
        
        // Track which original indices are in which cluster
        const clusterMap = new Map();
        for (let i = 0; i < n; i++) {
          clusterMap.set(i, i);
        }
        
        // Iteratively merge clusters
        let mergesDone = 0;
        const totalPossibleMerges = merges.length;
        
        while (merges.length > 0) {
          // Get the highest similarity pair
          const { i, j } = merges.shift();
          
          // Find current cluster indices for i and j
          const clusterI = clusterMap.get(i);
          const clusterJ = clusterMap.get(j);
          
          // Skip if they're already in the same cluster
          if (clusterI === clusterJ) continue;
          
          // Check if the merge would exceed the maximum cluster size
          if (clusters[clusterI].length + clusters[clusterJ].length > maxClusterSize) {
            continue;
          }
          
          // Merge the smaller cluster into the larger one
          const mergeInto = clusters[clusterI].length >= clusters[clusterJ].length ? clusterI : clusterJ;
          const mergeFrom = mergeInto === clusterI ? clusterJ : clusterI;
          
          // Update cluster assignments
          for (const idx of clusters[mergeFrom]) {
            clusterMap.set(idx, mergeInto);
          }
          
          // Merge clusters
          clusters[mergeInto] = clusters[mergeInto].concat(clusters[mergeFrom]);
          clusters[mergeFrom] = [];
          clusterCount--;
          
          // Update progress periodically
          mergesDone++;
          if (mergesDone % 100 === 0 || merges.length === 0) {
            updateProgress('clustering', mergesDone / totalPossibleMerges * 100,
              'Clustering similar texts...', {
                clusterCount: clusters.filter(c => c.length > 0).length
              });
            
            // Allow other operations to proceed
            if (mergesDone % 1000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            if (cancelled) break;
          }
        }
        
        // Filter out empty clusters and convert to final format
        const finalClusters = clusters
          .filter(cluster => cluster.length > 0)
          .map((cluster, index) => {
            return {
              id: index,
              texts: cluster.map(idx => texts[idx]),
              representativeText: texts[cluster[0]] // For now, just use the first text
            };
          });
        
        return finalClusters;
      }
      
      // Generate descriptive labels for each cluster
      async function generateClusterLabels(clusters) {
        // Make a copy of the clusters to modify
        const labeledClusters = [...clusters];
        
        // Update progress
        updateProgress('labeling', 0, 'Generating cluster labels...');
        
        // For very small clusters, use the representative text
        // For larger clusters, extract key terms or use OpenAI API
        
        for (let i = 0; i < labeledClusters.length; i++) {
          const cluster = labeledClusters[i];
          
          if (cluster.texts.length === 1) {
            // For singletons, use a truncated version of the text
            cluster.label = truncateText(cluster.texts[0], 50);
          } else if (config.processingMethod === 'openai' && config.useClusterLabels && config.apiKey) {
            // Use OpenAI for labeling (simulated here)
            cluster.label = await generateOpenAILabel(cluster);
          } else {
            // Use frequency-based labeling
            cluster.label = generateFrequencyBasedLabel(cluster);
          }
          
          // Update progress
          updateProgress('labeling', (i / labeledClusters.length) * 100,
            'Generating cluster labels...', {
              currentItem: i + 1,
              totalItems: labeledClusters.length
            });
          
          if (cancelled) break;
        }
        
        return labeledClusters;
      }
      
      // Generate a cluster label using OpenAI
      async function generateOpenAILabel(cluster) {
        // In a real implementation, we would call the OpenAI API
        // For demonstration, we'll simulate the API call
        
        // Select a sample of texts from the cluster
        const sampleSize = Math.min(5, cluster.texts.length);
        const sample = cluster.texts.slice(0, sampleSize);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For simulation, generate a label based on the first text
        const firstText = cluster.texts[0];
        const words = firstText.split(/\\s+/).filter(w => w.length > 3);
        const label = words.slice(0, 3).join(' ');
        
        return "[Cluster " + cluster.id + ": " + label + "...]";
      }
      
      // Generate a cluster label based on term frequency
      function generateFrequencyBasedLabel(cluster) {
        // Extract words from all texts in the cluster
        const allWords = cluster.texts.flatMap(text => 
          text.toLowerCase().split(/\\s+/)
            .filter(w => w.length > 3)
            .filter(w => !['that', 'this', 'with', 'from', 'have', 'what'].includes(w))
        );
        
        // Count frequency of each word
        const wordCounts = new Map();
        allWords.forEach(word => {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        });
        
        // Sort by frequency
        const sortedWords = Array.from(wordCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([word]) => word);
        
        if (sortedWords.length === 0) {
          return "Cluster " + cluster.id;
        }
        
        return "[" + sortedWords.join(', ') + "...]";
      }
      
      // Truncate text to a maximum length with ellipsis
      function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
      }
      
      // Prepare the final result object
      function prepareResult(labeledClusters) {
        // Create mapping from original text to cluster ID
        const mapping = {};
        
        labeledClusters.forEach(cluster => {
          cluster.texts.forEach(text => {
            mapping[text] = cluster.id;
          });
        });
        
        // Calculate statistics
        const totalTexts = labeledClusters.reduce((sum, c) => sum + c.texts.length, 0);
        const singletonCount = labeledClusters.filter(c => c.texts.length === 1).length;
        const averageSize = totalTexts / labeledClusters.length;
        const largestSize = Math.max(...labeledClusters.map(c => c.texts.length));
        
        return {
          clusters: labeledClusters,
          mapping,
          stats: {
            totalTexts,
            totalClusters: labeledClusters.length,
            averageClusterSize: averageSize,
            largestClusterSize: largestSize,
            singletonCount
          }
        };
      }
    `;
  }
}

export default new TextSimilarityService();
