import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

// Reusable styling constants (following the same pattern as BackupHistoryModal)
const BUTTON_STYLES = {
  primary: "inline-flex items-center gap-2 px-4 py-2 bg-[#86a0ff] text-white rounded-lg text-sm font-medium hover:bg-[#7990e6] transition-colors",
  secondary: "px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
};

const MODAL_ANIMATIONS = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  modal: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 }
  }
};

// Default configuration paths for different operating systems
const DEFAULT_PATHS = {
  windows: [
    '%APPDATA%\\Claude\\claude_desktop_config.json',
    '%APPDATA%\\Claude\\desktop\\claude_desktop_config.json',
    '%LOCALAPPDATA%\\Claude\\claude_desktop_config.json',
    'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Claude\\claude_desktop_config.json',
    'C:\\Users\\%USERNAME%\\AppData\\Local\\Claude\\claude_desktop_config.json'
  ],
  mac: [
    '~/Library/Application Support/Claude/claude_desktop_config.json',
    '~/Library/Application Support/Claude/desktop/claude_desktop_config.json',
    '/Users/$USER/Library/Application Support/Claude/claude_desktop_config.json',
    '/Users/$USER/Library/Application Support/Claude/desktop/claude_desktop_config.json',
    '/Users/$USER/.config/claude/claude_desktop_config.json'
  ],
  linux: [
    '~/.config/claude/claude_desktop_config.json',
    '/home/$USER/.config/claude/claude_desktop_config.json',
    '/home/$USER/.local/share/claude/claude_desktop_config.json'
  ]
};

const PathConfigModal = ({ 
  isOpen, 
  onClose, 
  onConfigPathChange, 
  currentPath = '' 
}) => {
  const [pathInput, setPathInput] = useState(currentPath);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedOS, setDetectedOS] = useState('mac');

  // Detect OS
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let os = 'mac';
    if (userAgent.includes('Windows')) os = 'windows';
    else if (userAgent.includes('Linux')) os = 'linux';
    
    setDetectedOS(os);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPathInput(currentPath);
      setIsSubmitting(false);
    }
  }, [isOpen, currentPath]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const selectPath = (path) => {
    // Replace environment variables with actual values for better user experience
    let resolvedPath = path;
    
    if (detectedOS === 'mac' || detectedOS === 'linux') {
      // For Mac/Linux, replace $USER with actual username if we can detect it
      // Try to get username from common sources
      let username = 'YourUsername';
      
      // Try to get username from localStorage if previously set
      const savedUsername = localStorage.getItem('claude_username');
      if (savedUsername) {
        username = savedUsername;
      } else {
        // Try to extract username from common patterns
        if (detectedOS === 'mac') {
          // For Mac, try to get username from common locations
          username = 'YourUsername';
        } else if (detectedOS === 'linux') {
          username = 'YourUsername';
        }
      }
      
      resolvedPath = path.replace(/\$USER/g, username);
    }
    
    setPathInput(resolvedPath);
  };

  const handleSubmit = async () => {
    if (!pathInput.trim()) {
      alert('Please select or enter a configuration path');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onConfigPathChange) {
        await onConfigPathChange(pathInput.trim());
      }
      onClose();
    } catch (error) {
      console.error('Error updating config path:', error);
      alert('Failed to update configuration path. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        {...MODAL_ANIMATIONS.backdrop}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          {...MODAL_ANIMATIONS.modal}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Configure Claude Desktop Path</h2>
                <p className="text-sm text-gray-600">Select or enter the path to your Claude Desktop configuration file</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {/* Path Input */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="pathInput" className="text-sm font-medium text-gray-700">
                  Configuration Path
                </label>
                <input
                  type="text"
                  id="pathInput"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  placeholder="Select a path below or enter custom path"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  The selected path will be used to locate your Claude Desktop configuration
                </p>
              </div>

              {/* Selectable Path Locations */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  📁 Common Claude Desktop Config Locations for {detectedOS === 'windows' ? 'Windows' : detectedOS === 'mac' ? 'macOS' : 'Linux'}:
                </h4>
                <div className="grid gap-2">
                  {DEFAULT_PATHS[detectedOS].map((path, index) => (
                    <div
                      key={index}
                      className={cn(
                        "border rounded-lg p-3 transition-all duration-200",
                        pathInput === path
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <code className="text-sm font-mono text-gray-700 break-all">
                            {path}
                          </code>
                        </div>
                        <button
                          onClick={() => selectPath(path)}
                          className={cn(
                            "ml-3 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            pathInput === path
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                          )}
                        >
                          {pathInput === path ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  💡 Click "Select" next to any path above to choose it, then click "Update Path" below to save
                </p>
              </div>
            </div>

            {/* Help Section */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="text-sm font-medium text-blue-900 mb-1.5">💡 How to find your config file:</h4>
              <div className="text-sm text-blue-700 space-y-0.5">
                {detectedOS === 'windows' ? (
                  <>
                    <p>• <strong>Windows:</strong> Check these locations:</p>
                    <ul className="ml-4 space-y-0.5">
                      <li>• <code className="bg-blue-100 px-1 rounded">%APPDATA%\\Claude\\</code> (usually C:\Users\YourUsername\AppData\Roaming\Claude\)</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">%LOCALAPPDATA%\\Claude\\</code> (usually C:\Users\YourUsername\AppData\Local\Claude\)</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">C:\\Users\\YourUsername\\AppData\\Roaming\\Claude\\</code></li>
                    </ul>
                  </>
                ) : detectedOS === 'mac' ? (
                  <>
                    <p>• <strong>macOS:</strong> Check these locations:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• <code className="bg-blue-100 px-1 rounded">~/Library/Application Support/Claude/</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">/Users/YourUsername/Library/Application Support/Claude/</code></li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>• <strong>Linux:</strong> Check these locations:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• <code className="bg-blue-100 px-1 rounded">~/.config/claude/</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">/home/YourUsername/.config/claude/</code></li>
                    </ul>
                  </>
                )}
                <p className="mt-2">• Look for a file named <code className="bg-blue-100 px-1 rounded">claude_desktop_config.json</code></p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className={BUTTON_STYLES.secondary}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !pathInput.trim()}
              className={cn(
                BUTTON_STYLES.primary,
                isSubmitting || !pathInput.trim()
                  ? "opacity-50 cursor-not-allowed" 
                  : ""
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Path'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PathConfigModal;
