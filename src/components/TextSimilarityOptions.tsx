// src/components/TextSimilarityOptions.tsx
import React, { useState, useEffect } from 'react';
import { Alert } from './Alert'; // Assuming Alert component exists based on App.tsx

interface TextSimilarityOptionsProps {
  isEnabled: boolean;
  onEnableChange: (enabled: boolean) => void;
  onConfigChange: (config: TextSimilarityConfig) => void;
  dataSize: number; // Number of unique texts to process
  sourceType: string; // Platform source type
}

export interface TextSimilarityConfig {
  similarityThreshold: number;
  apiKey: string;
  processingMethod: 'openai' | 'browser';
  maxClusterSize: number;
  samplePercentage: number;
  useClusterLabels: boolean;
}

const TextSimilarityOptions: React.FC<TextSimilarityOptionsProps> = ({
  isEnabled,
  onEnableChange,
  onConfigChange,
  dataSize,
  sourceType
}) => {
  // Default configuration
  const [config, setConfig] = useState<TextSimilarityConfig>({
    similarityThreshold: 0.8,
    apiKey: '',
    processingMethod: 'browser',
    maxClusterSize: 50,
    samplePercentage: 100,
    useClusterLabels: true
  });

  // Determine if sampling should be automatically enabled
  const [showSamplingWarning, setShowSamplingWarning] = useState(false);
  const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
  const [estimatedProcessingTime, setEstimatedProcessingTime] = useState('');

  // Update config when settings change
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  // Estimate processing requirements based on data size
  useEffect(() => {
    if (dataSize > 10000) {
      setShowSamplingWarning(true);
      setConfig(prev => ({ ...prev, samplePercentage: Math.min(prev.samplePercentage, 30) }));
    } else if (dataSize > 5000) {
      setShowSamplingWarning(true);
      setConfig(prev => ({ ...prev, samplePercentage: Math.min(prev.samplePercentage, 50) }));
    } else {
      setShowSamplingWarning(false);
    }

    // Rough processing time estimate
    if (dataSize > 0) {
      let timeEstimate = '';
      const pairs = (dataSize * (dataSize - 1)) / 2;
      
      if (config.processingMethod === 'browser') {
        if (pairs > 10000000) {
          timeEstimate = 'several hours';
          setShowPerformanceWarning(true);
        } else if (pairs > 1000000) {
          timeEstimate = '30-60 minutes';
          setShowPerformanceWarning(true);
        } else if (pairs > 100000) {
          timeEstimate = '5-15 minutes';
          setShowPerformanceWarning(true);
        } else if (pairs > 10000) {
          timeEstimate = '1-5 minutes';
          setShowPerformanceWarning(false);
        } else {
          timeEstimate = 'less than a minute';
          setShowPerformanceWarning(false);
        }
      } else {
        // API method is generally faster but rate-limited
        if (dataSize > 5000) {
          timeEstimate = '10-20 minutes (API rate limits)';
          setShowPerformanceWarning(true);
        } else if (dataSize > 1000) {
          timeEstimate = '2-5 minutes';
          setShowPerformanceWarning(false);
        } else {
          timeEstimate = 'less than a minute';
          setShowPerformanceWarning(false);
        }
      }
      
      setEstimatedProcessingTime(timeEstimate);
    }
  }, [dataSize, config.processingMethod, config.samplePercentage]);

  // Handle changes to the configuration
  const handleConfigChange = (key: keyof TextSimilarityConfig, value: any) => {
    setConfig({
      ...config,
      [key]: value
    });
  };

  if (!isEnabled) {
    return (
      <div className="mt-4">
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-[#00926c] cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onEnableChange(e.target.checked)}
            className="h-4 w-4 text-[#00926c] focus:ring-[#00926c] border-gray-300 rounded"
          />
          <span>Enable Text Similarity Clustering for {sourceType} text data</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Automatically group similar messages to identify coordinated content with slight variations
        </p>
      </div>
    );
  }

  // Estimated cost calculation for API method
  const estimateCost = () => {
    if (config.processingMethod !== 'openai' || dataSize === 0) return null;
    
    // Assuming average 100 tokens per text
    const estimatedTokens = dataSize * 100;
    // text-embedding-3-small pricing: $0.02 per 1M tokens
    const estimatedCost = (estimatedTokens / 1000000) * 0.02;
    
    if (estimatedCost < 0.01) return 'less than $0.01';
    return `~$${estimatedCost.toFixed(2)}`;
  };

  return (
    <div className="mt-4 p-4 border border-[#00926c]/20 rounded-lg bg-[#00926c]/5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-[#00926c]">Text Similarity Clustering</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onEnableChange(e.target.checked)}
            className="h-4 w-4 text-[#00926c] focus:ring-[#00926c] border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Enabled</span>
        </label>
      </div>

      {showPerformanceWarning && (
        <Alert type="warning">
          <p>Processing {dataSize} unique texts may be resource-intensive. Consider adjusting settings below to improve performance.</p>
        </Alert>
      )}

      <div className="space-y-4 mt-4">
        {/* Processing method selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Processing Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="browser"
                checked={config.processingMethod === 'browser'}
                onChange={() => handleConfigChange('processingMethod', 'browser')}
                className="h-4 w-4 text-[#00926c] focus:ring-[#00926c] border-gray-300"
              />
              <span className="text-sm">Browser-based (Free, No API)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="openai"
                checked={config.processingMethod === 'openai'}
                onChange={() => handleConfigChange('processingMethod', 'openai')}
                className="h-4 w-4 text-[#00926c] focus:ring-[#00926c] border-gray-300"
              />
              <span className="text-sm">OpenAI API (Higher quality)</span>
            </label>
          </div>
          {config.processingMethod === 'browser' && (
            <p className="mt-1 text-xs text-gray-500">
              Uses TensorFlow.js with MiniLM-L6 model (~30MB download). Processing happens entirely in your browser.
            </p>
          )}
          {config.processingMethod === 'openai' && estimateCost() && (
            <p className="mt-1 text-xs text-gray-500">
              Uses OpenAI's text-embedding-3-small model. Estimated cost: {estimateCost()}.
            </p>
          )}
        </div>

        {/* API Key input */}
        {config.processingMethod === 'openai' && (
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              id="api-key"
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e) => handleConfigChange('apiKey', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#00926c] focus:border-[#00926c] sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your API key is only stored in session and will be cleared when you close this page.
            </p>
          </div>
        )}

        {/* Similarity threshold slider */}
        <div>
          <label htmlFor="similarity-threshold" className="block text-sm font-medium text-gray-700 mb-1">
            Similarity Threshold: {config.similarityThreshold.toFixed(2)}
          </label>
          <input
            type="range"
            id="similarity-threshold"
            min="0.7"
            max="0.9"
            step="0.01"
            value={config.similarityThreshold}
            onChange={(e) => handleConfigChange('similarityThreshold', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>More inclusive</span>
            <span>More restrictive</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Higher values create more clusters with fewer variations. Lower values group more texts together.
          </p>
        </div>

        {/* Max cluster size */}
        <div>
          <label htmlFor="max-cluster-size" className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Cluster Size: {config.maxClusterSize}
          </label>
          <input
            type="range"
            id="max-cluster-size"
            min="10"
            max="100"
            step="5"
            value={config.maxClusterSize}
            onChange={(e) => handleConfigChange('maxClusterSize', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="mt-1 text-xs text-gray-500">
            Limits the maximum number of texts that can be grouped in a single cluster to prevent over-aggregation.
          </p>
        </div>

        {/* Sampling percentage (if needed) */}
        {(showSamplingWarning || dataSize > 1000) && (
          <div>
            <label htmlFor="sample-percentage" className="block text-sm font-medium text-gray-700 mb-1">
              Sampling Percentage: {config.samplePercentage}%
            </label>
            <input
              type="range"
              id="sample-percentage"
              min="10"
              max="100"
              step="5"
              value={config.samplePercentage}
              onChange={(e) => handleConfigChange('samplePercentage', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500">
              Process only a percentage of unique texts to improve performance. Recommended for large datasets.
            </p>
          </div>
        )}

        {/* Cluster labeling option */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.useClusterLabels}
              onChange={(e) => handleConfigChange('useClusterLabels', e.target.checked)}
              className="h-4 w-4 text-[#00926c] focus:ring-[#00926c] border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Generate descriptive labels for clusters</span>
          </label>
          <p className="mt-1 text-xs text-gray-500 ml-6">
            {config.processingMethod === 'openai' 
              ? 'Uses OpenAI to generate descriptive labels for each content cluster.'
              : 'Creates labels from frequently occurring terms in each cluster.'}
          </p>
        </div>

        {/* Processing time estimate */}
        {estimatedProcessingTime && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Estimated processing time:</span> {estimatedProcessingTime}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Processing {dataSize} unique texts ({config.samplePercentage < 100 ? `${Math.round(dataSize * config.samplePercentage / 100)} sampled, ` : ''}
              {((dataSize * (dataSize - 1)) / 2).toLocaleString()} pairwise comparisons)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextSimilarityOptions;
