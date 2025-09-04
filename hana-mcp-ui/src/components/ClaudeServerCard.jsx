import { motion } from 'framer-motion'  
import { EnvironmentBadge } from './ui'

const ClaudeServerCard = ({ 
  server, 
  index, 
  activeEnvironment, 
  onRemove 
}) => {
  return (
    <motion.div
      className="bg-gray-50 border border-gray-100 rounded-lg p-3 hover:bg-gray-100 transition-all duration-200"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      whileHover={{ y: -1 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <h4 className="text-sm font-medium text-gray-900 truncate">{server.name}</h4>
          </div>
          
          {activeEnvironment && (
            <EnvironmentBadge environment={activeEnvironment} active size="xs" />
          )}
        </div>
        
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded hover:bg-white/60"
          title="Remove from Claude"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Connection Info */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Host:</span>
          <span className="font-mono text-gray-700 bg-white/70 px-1.5 py-0.5 rounded text-xs truncate max-w-[100px]" title={server.env.HANA_HOST}>
            {server.env.HANA_HOST}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Schema:</span>
          <span className="font-mono text-gray-700 bg-white/70 px-1.5 py-0.5 rounded text-xs truncate max-w-[100px]" title={server.env.HANA_SCHEMA}>
            {server.env.HANA_SCHEMA}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-700 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Connected
          </span>
          <span className="text-xs text-gray-400">
            Active
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default ClaudeServerCard