// src/components/ClusteringResults.tsx
import React, { useState } from 'react';
import type { ClusteringResult, TextCluster } from '../services/textSimilarityService';

interface ClusteringResultsProps {
  results: ClusteringResult;
  onClose: () => void;
  onUseResults: () => void;
}

const ClusteringResults: React.FC<ClusteringResultsProps> = ({ 
  results, 
  onClose,
  onUseResults 
}) => {
  const [expandedClusterId, setExpandedClusterId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'id'>('size');
  
  const { clusters, stats } = results;
  
  // Sort and filter clusters
  const filteredClusters = clusters
    .filter(cluster => 
      searchTerm === '' || 
      cluster.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cluster.texts.some(text => text.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'size') {
        return b.texts.length - a.texts.length;
      }
      return a.id - b.id;
    });
  
  // Toggle expanded state for a cluster
  const toggleCluster = (id: number) => {
    setExpandedClusterId(expandedClusterId === id ? null : id);
  };
  
  // Calculate sizes for clustering distribution visualization
  const calculateSizeDistribution = () => {
    const sizeGroups = [
      { label: '1', count: 0 },
      { label: '2-5', count: 0 },
      { label: '6-10', count: 0 },
      { label: '11-20', count: 0 },
      { label: '21-50', count: 0 },
      { label: '50+', count: 0 },
    ];
    
    clusters.forEach(cluster => {
      const size = cluster.texts.length;
      
      if (size === 1) sizeGroups[0].count++;
      else if (size <= 5) sizeGroups[1].count++;
      else if (size <= 10) sizeGroups[2].count++;
      else if (size <= 20) sizeGroups[3].count++;
      else if (size <= 50) sizeGroups[4].count++;
      else sizeGroups[5].count++;
    });
    
    return sizeGroups;
  };
  
  const sizeDistribution = calculateSizeDistribution();
  const maxCount = Math.max(...sizeDistribution.map(g => g.count));
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-[#00926c] p-4 text-white">
        <h2 className="text-xl font-bold">Text Similarity Clustering Results</h2>
        <p className="text-sm opacity-90">
          {stats.totalTexts} texts grouped into {stats.totalClusters} clusters
        </p>
      </div>
      
      <div className="p-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="text-sm text-gray-500">Total Clusters</div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalClusters}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="text-sm text-gray-500">Avg. Cluster Size</div>
            <div className="text-2xl font-bold text-gray-800">{stats.averageClusterSize.toFixed(1)}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="text-sm text-gray-500">Largest Cluster</div>
            <div className="text-2xl font-bold text-gray-800">{stats.largestClusterSize}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="text-sm text-gray-500">Unique Messages</div>
            <div className="text-2xl font-bold text-gray-800">{stats.singletonCount}</div>
          </div>
        </div>
        
        {/* Size distribution */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Cluster Size Distribution</h3>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-end h-32 space-x-2">
              {sizeDistribution.map((group, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="text-xs text-gray-500 mb-1">{group.count}</div>
                  <div
                    className="bg-[#00926c] w-full rounded-t"
                    style={{ 
                      height: group.count ? `${(group.count / maxCount) * 100}%` : '2px',
                      opacity: 0.6 + (index * 0.05) 
                    }}
                  ></div>
                  <div className="text-xs mt-1">{group.label}</div>
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">Cluster Size</div>
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              type="text"
              id="search"
              placeholder="Search clusters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#00926c] focus:border-[#00926c]"
            />
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'size' | 'id')}
              className="border-gray-300 rounded-md shadow-sm focus:ring-[#00926c] focus:border-[#00926c]"
            >
              <option value="size">Size (largest first)</option>
              <option value="id">Cluster ID</option>
            </select>
          </div>
        </div>
        
        {/* Cluster list */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 border-b flex items-center font-medium text-gray-700">
            <div className="w-16 text-center">#</div>
            <div className="flex-1">Cluster</div>
            <div className="w-20 text-center">Size</div>
            <div className="w-10"></div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredClusters.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No clusters match your search criteria
              </div>
            ) : (
              filteredClusters.map((cluster) => (
                <div key={cluster.id} className="border-b last:border-b-0">
                  <div 
                    className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleCluster(cluster.id)}
                  >
                    <div className="w-16 text-center text-gray-500">#{cluster.id}</div>
                    <div className="flex-1 font-medium">{cluster.label}</div>
                    <div className="w-20 text-center">
                      <span className="bg-[#00926c]/20 text-[#00926c] rounded-full px-2 py-1 text-xs font-medium">
                        {cluster.texts.length}
                      </span>
                    </div>
                    <div className="w-10 text-right">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 text-gray-400 transition-transform ${expandedClusterId === cluster.id ? 'rotate-180' : ''}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Expanded view */}
                  {expandedClusterId === cluster.id && (
                    <div className="p-4 bg-gray-50 border-t">
                      <div className="text-sm font-medium mb-2">Sample texts in this cluster:</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {cluster.texts.slice(0, 5).map((text, i) => (
                          <div key={i} className="text-sm p-2 bg-white border rounded">
                            {text.length > 200 ? `${text.substring(0, 200)}...` : text}
                          </div>
                        ))}
                        {cluster.texts.length > 5 && (
                          <div className="text-xs text-gray-500 italic">
                            ...and {cluster.texts.length - 5} more texts
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00926c]"
          >
            Cancel
          </button>
          <button
            onClick={onUseResults}
            className="px-4 py-2 bg-[#00926c] border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-[#007d5c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00926c]"
          >
            Use Cluster Labels as Object IDs
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClusteringResults;
