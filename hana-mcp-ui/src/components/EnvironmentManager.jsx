import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientButton } from './ui';
import { cn } from '../utils/cn';

const EnvironmentManager = ({ isOpen, onClose, onSave }) => {
  const [environments, setEnvironments] = useState([
    { id: 'development', name: 'Development', color: 'blue', required: false },
    { id: 'staging', name: 'Staging', color: 'amber', required: false },
    { id: 'production', name: 'Production', color: 'green', required: false }
  ]);
  const [newEnvironmentName, setNewEnvironmentName] = useState('');
  const [selectedColor, setSelectedColor] = useState('purple');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const colorOptions = [
    { id: 'blue', name: 'Blue', class: 'bg-blue-500' },
    { id: 'green', name: 'Green', class: 'bg-green-500' },
    { id: 'amber', name: 'Amber', class: 'bg-amber-500' },
    { id: 'purple', name: 'Purple', class: 'bg-purple-500' },
    { id: 'indigo', name: 'Indigo', class: 'bg-indigo-500' },
    { id: 'red', name: 'Red', class: 'bg-red-500' },
    { id: 'pink', name: 'Pink', class: 'bg-pink-500' },
    { id: 'teal', name: 'Teal', class: 'bg-teal-500' }
  ];

  useEffect(() => {
    // Load existing environments from localStorage or API
    const savedEnvironments = localStorage.getItem('hana-environments');
    if (savedEnvironments) {
      setEnvironments(JSON.parse(savedEnvironments));
    }
  }, []);

  const addEnvironment = () => {
    if (!newEnvironmentName.trim()) return;

    const newEnv = {
      id: newEnvironmentName.toLowerCase().replace(/\s+/g, '-'),
      name: newEnvironmentName,
      color: selectedColor,
      required: false
    };

    const updatedEnvironments = [...environments, newEnv];
    setEnvironments(updatedEnvironments);
    setNewEnvironmentName('');
    setSelectedColor('purple');
  };

  const removeEnvironment = (envId) => {
    setEnvironments(environments.filter(env => env.id !== envId));
  };

  const handleSave = () => {
    // Save to localStorage (in real app, this would be an API call)
    localStorage.setItem('hana-environments', JSON.stringify(environments));
    onSave(environments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Manage Environments</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Environments */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Current Environments</h3>
          <div className="space-y-2">
            {environments.map((env) => (
              <div
                key={env.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn('w-4 h-4 rounded-full', `bg-${env.color}-500`)} />
                  <span className="font-medium text-gray-900">{env.name}</span>
                  <span className="text-sm text-gray-500">({env.id})</span>
                </div>
                <button
                  onClick={() => removeEnvironment(env.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Environment */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Add New Environment</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Environment Name
              </label>
              <input
                type="text"
                value={newEnvironmentName}
                onChange={(e) => setNewEnvironmentName(e.target.value)}
                placeholder="e.g., Pre-Production, QA, Testing"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      color.class,
                      selectedColor === color.id
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300 hover:scale-105'
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <GradientButton
              onClick={addEnvironment}
              disabled={!newEnvironmentName.trim()}
              className="w-full"
            >
              Add Environment
            </GradientButton>
          </div>
        </div>

        {/* Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Environments are optional for databases. You can configure any combination of environments for each database based on your needs.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <GradientButton variant="secondary" onClick={onClose}>
            Cancel
          </GradientButton>
          <GradientButton onClick={handleSave}>
            Save Changes
          </GradientButton>
        </div>
      </motion.div>
    </div>
  );
};

export default EnvironmentManager;
