// src/components/ClusteringProgress.tsx
import React from 'react';
import type { ClusteringProgress as ProgressType } from '../services/textSimilarityService';

interface ClusteringProgressProps {
  progress: ProgressType;
  onCancel: () => void;
}

const ClusteringProgress: React.FC<ClusteringProgressProps> = ({ progress, onCancel }) => {
  const { stage, percent, message, currentItem, totalItems, clusterCount } = progress;
  
  // Determine overall progress considering all stages
  const calculateOverallProgress = () => {
    const stageWeights = {
      modelLoading: 0.05,
      embedding: 0.4,
      similarity: 0.3,
      clustering: 0.15,
      labeling: 0.1,
      complete: 1.0
    };
    
    const stageOrder = ['modelLoading', 'embedding', 'similarity', 'clustering', 'labeling', 'complete'];
    const currentStageIndex = stageOrder.indexOf(stage);
    
    let overallProgress = 0;
    
    // Add completed stages
    for (let i = 0; i < currentStageIndex; i++) {
      overallProgress += stageWeights[stageOrder[i] as keyof typeof stageWeights] * 100;
    }
    
    // Add current stage
    overallProgress += stageWeights[stage] * percent;
    
    return Math.min(100, Math.round(overallProgress));
  };
  
  const overallPercent = calculateOverallProgress();
  
  return (
    <div className="p-4 border rounded-lg bg-white shadow-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-900">Processing Similarity Clusters</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label="Cancel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-[#00926c] h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${overallPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Overall: {overallPercent}%</span>
          <span>{message}</span>
        </div>
      </div>
      
      {/* Stage-specific progress */}
      <div className="space-y-4">
        {/* Model Loading */}
        <div className={`opacity-${stage === 'modelLoading' ? '100' : stage === 'complete' ? '100' : '50'}`}>
          <div className="flex justify-between text-sm mb-1">
            <span>Loading Models</span>
            <span>{stage === 'modelLoading' ? `${Math.round(percent)}%` : 
                  stage === 'complete' || 
                  stage === 'embedding' || 
                  stage === 'similarity' || 
                  stage === 'clustering' || 
                  stage === 'labeling' ? '100%' : '0%'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: stage === 'modelLoading' ? `${percent}%` : 
                       stage === 'complete' || 
                       stage === 'embedding' || 
                       stage === 'similarity' || 
                       stage === 'clustering' || 
                       stage === 'labeling' ? '100%' : '0%' 
              }}
            ></div>
          </div>
        </div>
        
        {/* Embedding */}
        <div className={`opacity-${stage === 'embedding' ? '100' : stage === 'complete' || stage === 'similarity' || stage === 'clustering' || stage === 'labeling' ? '100' : '50'}`}>
          <div className="flex justify-between text-sm mb-1">
            <span>Generating Embeddings</span>
            <span>
              {stage === 'embedding' && currentItem && totalItems ? 
                `${currentItem} / ${totalItems}` : 
                stage === 'complete' || stage === 'similarity' || stage === 'clustering' || stage === 'labeling' ? 
                '100%' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: stage === 'embedding' ? `${percent}%` : 
                       stage === 'complete' || stage === 'similarity' || stage === 'clustering' || stage === 'labeling' ? 
                       '100%' : '0%' 
              }}
            ></div>
          </div>
        </div>
        
        {/* Similarity Computation */}
        <div className={`opacity-${stage === 'similarity' ? '100' : stage === 'complete' || stage === 'clustering' || stage === 'labeling' ? '100' : '50'}`}>
          <div className="flex justify-between text-sm mb-1">
            <span>Computing Similarities</span>
            <span>
              {stage === 'similarity' && currentItem && totalItems ? 
                `${currentItem.toLocaleString()} / ${totalItems.toLocaleString()}` : 
                stage === 'complete' || stage === 'clustering' || stage === 'labeling' ? 
                '100%' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: stage === 'similarity' ? `${percent}%` : 
                       stage === 'complete' || stage === 'clustering' || stage === 'labeling' ? 
                       '100%' : '0%' 
              }}
            ></div>
          </div>
        </div>
        
        {/* Clustering */}
        <div className={`opacity-${stage === 'clustering' ? '100' : stage === 'complete' || stage === 'labeling' ? '100' : '50'}`}>
          <div className="flex justify-between text-sm mb-1">
            <span>Clustering Texts</span>
            <span>
              {stage === 'clustering' && clusterCount ? 
                `${clusterCount} clusters` : 
                stage === 'complete' || stage === 'labeling' ? 
                '100%' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: stage === 'clustering' ? `${percent}%` : 
                       stage === 'complete' || stage === 'labeling' ? 
                       '100%' : '0%' 
              }}
            ></div>
          </div>
        </div>
        
        {/* Labeling */}
        <div className={`opacity-${stage === 'labeling' ? '100' : stage === 'complete' ? '100' : '50'}`}>
          <div className="flex justify-between text-sm mb-1">
            <span>Generating Labels</span>
            <span>
              {stage === 'labeling' && currentItem && totalItems ? 
                `${currentItem} / ${totalItems}` : 
                stage === 'complete' ? 
                '100%' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: stage === 'labeling' ? `${percent}%` : 
                       stage === 'complete' ? 
                       '100%' : '0%' 
              }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Cancel button */}
      <div className="mt-4 text-center">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00926c]"
        >
          Cancel Processing
        </button>
      </div>
    </div>
  );
};

export default ClusteringProgress;
