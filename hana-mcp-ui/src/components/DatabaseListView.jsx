import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchAndFilter from './SearchAndFilter';
import EnhancedServerCard from './EnhancedServerCard';
import { cn } from '../utils/cn';

const DatabaseListView = ({
  hanaServers,
  claudeServers,
  activeEnvironments,
  onEditServer,
  onAddToClaudeServer,
  onDeleteServer,
  onAddDatabase
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const servers = Object.entries(hanaServers);
    const activeInClaude = Object.keys(activeEnvironments).length;
    return {
      total: servers.length,
      active: servers.filter(([name]) => claudeServers.some(cs => cs.name === name)).length,
      activeInClaude: activeInClaude,
      production: servers.filter(([, server]) => server.environments?.Production).length,
      development: servers.filter(([, server]) => server.environments?.Development).length,
      staging: servers.filter(([, server]) => server.environments?.Staging).length,
      activeFilter: filters.status
    };
  }, [hanaServers, claudeServers, filters.status, activeEnvironments]);

  // Filter and sort servers
  const filteredServers = useMemo(() => {
    let filtered = Object.entries(hanaServers);

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(([name, server]) =>
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter(([name]) =>
            claudeServers.some(cs => cs.name === name)
          );
          break;
        case 'production':
        case 'development':
        case 'staging':
          filtered = filtered.filter(([, server]) =>
            server.environments?.[filters.status.charAt(0).toUpperCase() + filters.status.slice(1)]
          );
          break;
      }
    }

    // Apply sorting
    filtered.sort(([nameA, serverA], [nameB, serverB]) => {
      let valueA, valueB;

      switch (filters.sortBy) {
        case 'name':
          valueA = nameA.toLowerCase();
          valueB = nameB.toLowerCase();
          break;
        case 'created':
          valueA = new Date(serverA.created || 0);
          valueB = new Date(serverB.created || 0);
          break;
        case 'modified':
          valueA = new Date(serverA.modified || 0);
          valueB = new Date(serverB.modified || 0);
          break;
        case 'environments':
          valueA = Object.keys(serverA.environments || {}).length;
          valueB = Object.keys(serverB.environments || {}).length;
          break;
        default:
          valueA = nameA.toLowerCase();
          valueB = nameB.toLowerCase();
      }

      if (filters.sortOrder === 'desc') {
        [valueA, valueB] = [valueB, valueA];
      }

      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    });

    return filtered;
  }, [hanaServers, claudeServers, searchQuery, filters]);



  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSearchQuery('');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-100 rounded-2xl sm:rounded-3xl overflow-y-auto max-h-full database-list-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Local Databases</h1>
          <p className="text-gray-600">
            Manage your HANA database configurations
          </p>
          {filterCounts.activeInClaude > 0 && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">
                  {filterCounts.activeInClaude} database{filterCounts.activeInClaude !== 1 ? 's' : ''} connected to Claude
                </span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onAddDatabase}
          className="flex items-center px-4 py-2 bg-[#86a0ff] text-white text-sm font-medium rounded-lg hover:bg-[#7990e6] transition-colors shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Database
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <SearchAndFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          filterCounts={filterCounts}
        />
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredServers.length} of {Object.keys(hanaServers).length} databases
          </div>
        </div>
      </div>

      {/* Database List */}
      <div className="bg-white rounded-xl border border-gray-150 p-6">
        {filteredServers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No databases found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? `No databases match "${searchQuery}"` : 'Get started by adding your first database'}
            </p>
            <button
              onClick={onAddDatabase}
              className="inline-flex items-center px-6 py-3 bg-[#86a0ff] text-white font-medium rounded-lg hover:bg-[#7990e6] transition-colors shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Database
            </button>
          </div>
        ) : (
          <div className={cn(
            'space-y-4',
            viewMode === 'grid' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          )}>
            <AnimatePresence>
              {filteredServers.map(([name, server]) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <EnhancedServerCard
                    name={name}
                    server={server}
                    isActive={claudeServers.some(cs => cs.name === name)}
                    activeEnvironment={activeEnvironments[name]}
                    onEdit={() => onEditServer(server)}
                    onAddToClaude={() => onAddToClaudeServer(name)}
                    onDelete={() => onDeleteServer(name)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseListView;
