import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const SearchAndFilter = ({ 
  searchQuery, 
  onSearchChange, 
  filters, 
  onFilterChange,
  onClearFilters,
  placeholder = "Search databases..."
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const filterOptions = [
    { id: 'all', label: 'All Databases', count: filters.total || 0 },
    { id: 'active', label: 'Active in Claude', count: filters.activeInClaude || 0, highlight: true },
    { id: 'production', label: 'Production', count: filters.production || 0 },
    { id: 'development', label: 'Development', count: filters.development || 0 },
    { id: 'staging', label: 'Staging', count: filters.staging || 0 }
  ];

  const sortOptions = [
    { id: 'name', label: 'Name' },
    { id: 'created', label: 'Date Created' },
    { id: 'modified', label: 'Last Modified' },
    { id: 'environments', label: 'Environment Count' }
  ];

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    // Call parent callback if provided
    if (onFilterChange) {
      onFilterChange({ sortBy: newSortBy, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="block w-full pl-10 pr-3 py-2 border border-gray-100 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center group"
            >
              <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
        {/* Claude Integration Status */}
        {filters.activeInClaude > 0 && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-700">
              {filters.activeInClaude} Claude
            </span>
          </div>
        )}

        {/* Filter Toggle */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={cn(
            'flex items-center px-4 py-2 border rounded-lg transition-colors',
            isFilterOpen
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-100 bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
          Filters
          <svg className={cn("w-4 h-4 ml-2 transition-transform duration-200", isFilterOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
              if (onFilterChange) {
                onFilterChange({ sortBy: newSortBy, sortOrder: newSortOrder });
              }
            }}
            className="appearance-none bg-white border border-gray-100 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {sortOptions.map(option => (
              <option key={`${option.id}-asc`} value={`${option.id}-asc`}>{option.label} (A-Z)</option>
            ))}
            {sortOptions.map(option => (
              <option key={`${option.id}-desc`} value={`${option.id}-desc`}>{option.label} (Z-A)</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Filter by Status</h3>
                <button
                  onClick={onClearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {filterOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => onFilterChange && onFilterChange({ status: option.id })}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
                      filters.activeFilter === option.id
                        ? option.highlight 
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-blue-300 bg-blue-50 text-blue-700'
                        : option.highlight
                          ? 'border-green-200 bg-white text-green-700 hover:bg-green-50'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span className="text-sm font-medium flex items-center space-x-1">
                      {option.highlight && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span>{option.label}</span>
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      option.highlight 
                        ? filters.activeFilter === option.id
                          ? 'bg-green-200 text-green-700'
                          : 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchAndFilter;
