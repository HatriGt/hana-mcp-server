import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { XMarkIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { EnvironmentBadge } from './ui'

const EnvironmentSelector = ({
  isOpen,
  onClose,
  serverName,
  environments,
  activeEnvironment,
  onDeploy,
  isLoading
}) => {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <motion.div
      className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-gray-200 overflow-hidden"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <PlusIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add to Claude Config</h2>
                <p className="text-sm text-gray-500 mt-0.5">Select environment for {serverName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-6 text-sm">
            Choose which environment configuration to add to Claude Desktop. Only one environment per database server can be active at a time.
          </p>
          
          <div className="space-y-3">
            {Object.entries(environments).map(([env, config], index) => (
              <motion.button
                key={env}
                onClick={() => onDeploy(env)}
                disabled={isLoading}
                className="w-full p-4 border border-gray-200 rounded-xl text-left transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={!isLoading ? { y: -1 } : {}}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900">{env}</h3>
                    <EnvironmentBadge environment={env} size="sm" />
                  </div>
                  {activeEnvironment === env && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-100 rounded-full">
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 text-xs font-medium">ACTIVE</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Host:</span>
                    <p className="text-gray-700 font-mono text-xs mt-0.5">{config.HANA_HOST}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Schema:</span>
                    <p className="text-gray-700 font-mono text-xs mt-0.5">{config.HANA_SCHEMA}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default EnvironmentSelector