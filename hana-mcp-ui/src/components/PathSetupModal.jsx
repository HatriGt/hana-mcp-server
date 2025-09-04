import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { XMarkIcon, Cog6ToothIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

const PathSetupModal = ({
  isOpen,
  onClose,
  pathInput,
  setPathInput,
  onSave,
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

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  Setup Claude Desktop Configuration
                </h2>
                <p className="text-base text-gray-600 mt-2 font-medium">
                  First-time setup: Configure Claude Desktop config file path
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Info Alert */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Configuration Required</h3>
                <p className="text-orange-800 text-sm leading-relaxed">
                  To add servers to Claude Desktop, we need to know where your Claude configuration file is located. 
                  This is typically in your user directory.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Claude Desktop Config Path
            </label>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="Enter path to claude_desktop_config.json"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-[#86a0ff] focus:border-[#86a0ff] transition-colors font-mono"
            />
            
            {/* Common Paths */}
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-medium text-gray-700">Common Paths:</h4>
              </div>
              <div className="space-y-2 text-sm text-gray-600 font-mono">
                <div>
                  <span className="text-gray-500">macOS:</span> 
                  <span className="ml-2">~/Library/Application Support/Claude/claude_desktop_config.json</span>
                </div>
                <div>
                  <span className="text-gray-500">Windows:</span> 
                  <span className="ml-2">%APPDATA%/Claude/claude_desktop_config.json</span>
                </div>
                <div>
                  <span className="text-gray-500">Linux:</span> 
                  <span className="ml-2">~/.config/claude/claude_desktop_config.json</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
          <button
            onClick={onSave}
            disabled={isLoading || !pathInput.trim()}
            className="px-8 py-3 text-base font-semibold text-white bg-[#86a0ff] border border-transparent rounded-xl hover:bg-[#7990e6] focus:outline-none focus:ring-2 focus:ring-[#86a0ff] disabled:opacity-50 min-w-[150px] transition-colors shadow-md hover:shadow-lg"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default PathSetupModal