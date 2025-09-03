import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { XMarkIcon, ServerIcon, PlusIcon, PencilIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const ConfigurationModal = ({
  isOpen,
  onClose,
  server,
  formData,
  activeTab,
  setActiveTab,
  onFormChange,
  onServerInfoChange,
  onSave,
  isLoading
}) => {
  const [availableEnvironments, setAvailableEnvironments] = useState([
    { id: 'development', name: 'Development', color: 'blue' },
    { id: 'staging', name: 'Staging', color: 'amber' },
    { id: 'production', name: 'Production', color: 'green' }
  ])
  const [selectedEnvironments, setSelectedEnvironments] = useState(new Set())
  const [showEnvironmentSelector, setShowEnvironmentSelector] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  useEffect(() => {
    // Load saved environments
    const savedEnvironments = localStorage.getItem('hana-environments')
    if (savedEnvironments) {
      setAvailableEnvironments(JSON.parse(savedEnvironments))
    }
    
    // Set selected environments based on formData.environments
    if (formData && formData.environments) {
      const envKeys = Object.keys(formData.environments)
      setSelectedEnvironments(new Set(envKeys))
    } else {
      // Clear selected environments for new server
      setSelectedEnvironments(new Set())
    }
  }, [formData, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // Validation function for mandatory fields
  const validateEnvironment = (envId, envData) => {
    const errors = {}
    const requiredFields = ['HANA_HOST', 'HANA_USER', 'HANA_PASSWORD', 'HANA_SCHEMA']
    
    requiredFields.forEach(field => {
      if (!envData[field] || envData[field].trim() === '') {
        errors[field] = `${field.replace('HANA_', '')} is required`
      }
    })
    
    return errors
  }

  // Validate all environments
  const validateAllEnvironments = () => {
    const allErrors = {}
    
    if (formData.environments) {
      Object.keys(formData.environments).forEach(envId => {
        const envErrors = validateEnvironment(envId, formData.environments[envId])
        if (Object.keys(envErrors).length > 0) {
          allErrors[envId] = envErrors
        }
      })
    }
    
    setValidationErrors(allErrors)
    return Object.keys(allErrors).length === 0
  }

  // Check if current environment has validation errors
  const getCurrentEnvironmentErrors = () => {
    if (!activeTab || !validationErrors[activeTab]) return {}
    return validationErrors[activeTab]
  }

  // Handle form change with validation
  const handleFormChange = (environment, field, value) => {
    onFormChange(environment, field, value)
    
    // Clear validation error for this field if it exists
    if (validationErrors[environment] && validationErrors[environment][field]) {
      const newErrors = { ...validationErrors }
      delete newErrors[environment][field]
      if (Object.keys(newErrors[environment]).length === 0) {
        delete newErrors[environment]
      }
      setValidationErrors(newErrors)
    }
  }

  const addEnvironment = (envId) => {

    
    const newSelected = new Set(selectedEnvironments)
    newSelected.add(envId)
    setSelectedEnvironments(newSelected)
    
    // Initialize the environment in formData if it doesn't exist
    if (!formData.environments || !formData.environments[envId]) {
      onFormChange(envId, 'ENVIRONMENT', envId.toUpperCase())
    }
    
    // Make the newly added environment active
    setActiveTab(envId)
    setShowEnvironmentSelector(false)
  }

  const removeEnvironment = (envId) => {
    
    const newSelected = new Set(selectedEnvironments)
    newSelected.delete(envId)
    
    // Remove the environment from formData as well
    if (formData.environments && formData.environments[envId]) {
      const newFormData = { ...formData }
      delete newFormData.environments[envId]
      // Update the parent's formData
      onServerInfoChange('environments', newFormData.environments)
    }
    
    // Clear validation errors for this environment
    if (validationErrors[envId]) {
      const newErrors = { ...validationErrors }
      delete newErrors[envId]
      setValidationErrors(newErrors)
    }
    
    // If we removed the active tab, switch to the first available
    if (activeTab === envId) {
      const remaining = Array.from(newSelected)
      setActiveTab(remaining.length > 0 ? remaining[0] : null)
    }
    
    setSelectedEnvironments(newSelected)
    setShowDeleteConfirm(null)
    

  }

  const getAvailableEnvironmentsToAdd = () => {
    const available = availableEnvironments.filter(env => !selectedEnvironments.has(env.id))
    return available
  }

  // Handle save with validation
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Server name is required')
      return
    }

    // Validate all environments
    if (!validateAllEnvironments()) {
      toast.error('Please fill in all required fields for selected environments')
      return
    }

    onSave()
  }

  if (!isOpen) return null

  return (
    <motion.div
      className='fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className='bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col'
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className='sticky top-0 z-10 px-8 py-6 border-b border-gray-100 bg-white rounded-t-2xl'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-gray-100 rounded-xl'>
                {server ? <PencilIcon className='w-5 h-5 text-gray-600' /> : <PlusIcon className='w-5 h-5 text-gray-600' />}
              </div>
              <div>
                <h2 className='text-2xl font-bold text-gray-900 leading-tight'>
                  {server ? 'Edit HANA Server' : 'Add HANA Server'}
                </h2>
                <p className='text-base text-gray-600 mt-2 font-medium'>
                  {server ? 'Update database connection settings' : 'Configure a new database connection'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className='p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors'
            >
              <XMarkIcon className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className='flex-1 overflow-y-auto p-8'>
          {/* Server Info */}
          <div className='mb-8'>
            <h3 className='text-xl font-bold text-gray-900 mb-6 flex items-center gap-3'>
              <ServerIcon className='w-5 h-5 text-gray-600' />
              Server Information
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-base font-semibold text-gray-800 mb-3'>
                  Server Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) => onServerInfoChange('name', e.target.value)}
                  placeholder='e.g. Production HANA'
                  disabled={!!server}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#86a0ff] focus:border-[#86a0ff] transition-colors ${
                    server 
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed' 
                      : 'text-gray-400'
                  }`}
                />
                {server && (
                  <p className='text-sm text-gray-500 mt-2 flex items-center gap-2'>
                    <svg className='w-4 h-4 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                    Server name is used as a unique identifier and cannot be modified after creation. 
                    To change the name, you'll need to create a new server configuration.
                  </p>
                )}
              </div>
              <div>
                <label className='block text-base font-semibold text-gray-800 mb-3'>
                  Description
                </label>
                <input
                  type='text'
                  value={formData.description}
                  onChange={(e) => onServerInfoChange('description', e.target.value)}
                  placeholder='Optional description'
                  className='w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-[#86a0ff] focus:border-[#86a0ff] transition-colors'
                />
              </div>
            </div>
          </div>

          {/* Environment Configuration */}
          <div className='mb-10'>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-xl font-bold text-gray-900'>Environment Configuration</h3>
              <span className='text-sm px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold'>Optional</span>
            </div>
            
            <p className='text-base text-gray-600 mb-6 font-medium'>
              Configure for specific environments:
            </p>
            {/* Configured Environments */}
            {selectedEnvironments.size > 0 && (
              <div className='space-y-3 mb-6'>
                {Array.from(selectedEnvironments).map((envId) => {
                  const env = availableEnvironments.find(e => e.id === envId)
                  const hasErrors = validationErrors[envId] && Object.keys(validationErrors[envId]).length > 0
                  const isDeleteConfirm = showDeleteConfirm === envId
                  
                  return (
                    <div
                      key={envId}
                      className={`flex items-center justify-between p-4 border rounded-xl group transition-all ${
                        hasErrors 
                          ? 'border-red-200 bg-red-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className='flex items-center gap-4'>
                        <div className={`w-4 h-4 rounded-full bg-${env?.color}-500`}></div>
                        <div className='flex items-center gap-3'>
                          <h4 className='text-base font-semibold text-gray-900'>{env?.name}</h4>
                          {hasErrors && (
                            <div className='flex items-center gap-1 text-red-600'>
                              <ExclamationTriangleIcon className='w-4 h-4' />
                              <span className='text-sm font-medium'>
                                {Object.keys(validationErrors[envId]).length} required field(s) missing
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {isDeleteConfirm ? (
                          <>
                            <button
                              type='button'
                              onClick={() => setShowDeleteConfirm(null)}
                              className='px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                            >
                              Cancel
                            </button>
                            <button
                              type='button'
                              onClick={() => removeEnvironment(envId)}
                              className='px-3 py-1 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors'
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type='button'
                            onClick={() => setShowDeleteConfirm(envId)}
                            className='p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100'
                            title='Delete environment configuration'
                          >
                            <TrashIcon className='w-4 h-4' />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add Environment Button */}
            {getAvailableEnvironmentsToAdd().length > 0 && (
              <button
                type='button'
                onClick={() => setShowEnvironmentSelector(true)}
                className='w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#86a0ff] hover:bg-[#86a0ff]/5 transition-colors flex items-center justify-center gap-4 text-gray-600 hover:text-[#86a0ff] group'
              >
                <PlusIcon className='w-5 h-5 group-hover:scale-110 transition-transform' />
                <span className='text-lg font-bold'>Add Environment</span>
              </button>
            )}

            {/* Environment Tabs - Only show if environments are selected */}
            {selectedEnvironments.size > 0 && (
              <>
                <div className='mt-8 mb-6'>
                  <div className='flex border-b border-gray-200 overflow-x-auto'>
                    {Array.from(selectedEnvironments).map((envId) => {
                      const env = availableEnvironments.find(e => e.id === envId)
                      const hasErrors = validationErrors[envId] && Object.keys(validationErrors[envId]).length > 0
                      
                      return (
                        <button
                          key={envId}
                          type='button'
                          onClick={() => setActiveTab(envId)}
                          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                            activeTab === envId
                              ? 'text-blue-600 border-blue-600'
                              : 'text-gray-500 border-transparent hover:text-gray-700'
                          }`}
                        >
                          <div className='flex items-center gap-3'>
                            <div className={`w-3 h-3 rounded-full bg-${env?.color}-500`}></div>
                            {env?.name || envId}
                          </div>
                          {hasErrors && (
                            <div className='w-2 h-2 rounded-full bg-red-500'></div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tab Content - Only show if an environment is selected */}
                {activeTab && selectedEnvironments.has(activeTab) && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EnvironmentForm
                      environment={activeTab}
                      data={formData.environments[activeTab] || {}}
                      onChange={handleFormChange}
                      errors={getCurrentEnvironmentErrors()}
                    />
                  </motion.div>
                )}
              </>
            )}

            {/* No environments selected - encouraging message */}
            {selectedEnvironments.size === 0 && (
              <div className='text-center py-12 bg-gray-50 border border-gray-200 rounded-xl'>
                <div className='w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
                  <svg className='w-6 h-6 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                <p className='text-lg font-bold text-gray-800'>No environments configured</p>
                <p className='text-base text-gray-600 mt-2'>Add environment-specific settings or skip for a basic connection</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className='sticky bottom-0 z-10 px-8 py-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-4'>
          <button
            onClick={onClose}
            disabled={isLoading}
            className='px-8 py-3 text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className='px-10 py-3 text-base font-semibold text-white bg-[#86a0ff] border border-transparent rounded-xl hover:bg-[#7990e6] focus:outline-none focus:ring-2 focus:ring-[#86a0ff] disabled:opacity-50 min-w-[160px] transition-colors shadow-md hover:shadow-lg'
          >
            {isLoading ? 'Saving...' : (server ? 'Update Server' : 'Add Server')}
          </button>
        </div>
      </motion.div>

      {/* Environment Selector Modal */}
      {showEnvironmentSelector && (
        <div 
          className='absolute inset-0 bg-black/20 flex items-center justify-center p-4 z-10'
          onClick={() => setShowEnvironmentSelector(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className='bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='p-6 border-b border-gray-200'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xl font-bold text-gray-900'>Add Environment</h3>
                <button
                  onClick={() => setShowEnvironmentSelector(false)}
                  className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors'
                >
                  <XMarkIcon className='w-5 h-5' />
                </button>
              </div>
              <p className='text-base text-gray-600 mt-2 font-medium'>Select an environment for which you want to configure the connection</p>
            </div>
            
            <div className='p-6 max-h-80 overflow-y-auto'>
              <div className='space-y-3'>
                {getAvailableEnvironmentsToAdd().map((env) => (
                  <button
                    key={env.id}
                    type='button'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      addEnvironment(env.id)
                    }}
                    className='w-full p-5 text-left border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-[#86a0ff] hover:shadow-sm transition-all duration-200 group'
                  >
                    <div className='flex items-center gap-4'>
                      <div className={`w-5 h-5 rounded-full bg-${env.color}-500 shadow-sm`}></div>
                      <div className='flex-1'>
                        <h4 className='text-lg font-bold text-gray-900 group-hover:text-[#86a0ff] transition-colors'>{env.name}</h4>
                      </div>
                      <svg className='w-5 h-5 text-gray-400 group-hover:text-[#86a0ff] transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                      </svg>
                    </div>
                  </button>
                ))}
                
                {getAvailableEnvironmentsToAdd().length === 0 && (
                  <div className='text-center py-8 text-gray-500'>
                    <svg className='w-12 h-12 mx-auto mb-4 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                    <p className='text-lg font-semibold text-gray-600'>All available environments are already configured</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

// Toggle Switch Component
const ToggleSwitch = ({ label, value, onChange, description }) => {
  const isEnabled = value === 'true' || value === true
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className="block text-base font-semibold text-gray-700">{label}</label>
        {description && <p className="text-sm text-gray-500 mt-1 font-medium">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!isEnabled ? 'true' : 'false')}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#86a0ff] focus:ring-offset-2 ${
          isEnabled ? 'bg-[#86a0ff]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// Environment Form Component
const EnvironmentForm = ({ environment, data = {}, onChange, errors = {} }) => {
  // Get environment display name
  const getEnvironmentDisplayName = (envId) => {
    const envMap = {
      'development': 'DEVELOPMENT',
      'staging': 'STAGING', 
      'production': 'PRODUCTION',
      'testing': 'TESTING',
      'qa': 'QA'
    }
    return envMap[envId] || envId.toUpperCase()
  }

  // Ensure ENVIRONMENT parameter is automatically set
  const environmentValue = data.ENVIRONMENT || getEnvironmentDisplayName(environment)
  
  // Auto-set default values when component renders
  useEffect(() => {
    const defaults = {
      ENVIRONMENT: environmentValue,
      HANA_PORT: '443',
      HANA_SSL: 'true',
      HANA_ENCRYPT: 'true',
      HANA_VALIDATE_CERT: 'true',
      LOG_LEVEL: 'info',
      ENABLE_FILE_LOGGING: 'true',
      ENABLE_CONSOLE_LOGGING: 'false'
    }

    // Set any missing default values
    Object.entries(defaults).forEach(([key, defaultValue]) => {
      if (!data[key]) {
        onChange(environment, key, defaultValue)
      }
    })
  }, [environment, data, environmentValue, onChange])

  // Helper function to render input field with error handling
  const renderInputField = (field, label, type = 'text', placeholder = '', required = false) => {
    const hasError = errors[field]
    
    return (
      <div>
        <label className={`block text-base font-semibold mb-3 ${
          hasError ? 'text-red-700' : 'text-gray-800'
        }`}>
          {label} {required && <span className='text-red-500'>*</span>}
        </label>
        <input
          type={type}
          value={data[field] || ''}
          onChange={(e) => onChange(environment, field, e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 transition-colors ${
            hasError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
              : 'border-gray-300 focus:ring-[#86a0ff] focus:border-[#86a0ff]'
          }`}
        />
        {hasError && (
          <p className='text-sm text-red-600 mt-1 font-medium flex items-center gap-1'>
            <ExclamationTriangleIcon className='w-3 h-3' />
            {hasError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {/* Connection Settings */}
      <div>
        <h4 className='text-lg font-bold text-gray-900 mb-6'>Connection Settings</h4>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {renderInputField('HANA_HOST', 'Host', 'text', 'your-hana-host.com', true)}
          {renderInputField('HANA_PORT', 'Port', 'number', '443')}
          {renderInputField('HANA_SCHEMA', 'Schema', 'text', 'your-schema', true)}
        </div>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
          {renderInputField('HANA_USER', 'Username', 'text', 'your-username', true)}
          {renderInputField('HANA_PASSWORD', 'Password', 'password', '••••••••', true)}
        </div>
      </div>

      {/* Security & SSL Configuration */}
      <div>
        <h4 className='text-lg font-bold text-gray-900 mb-6'>Security & SSL</h4>
        <div className='bg-gray-50 rounded-xl p-6 space-y-6'>
          <ToggleSwitch
            label="Enable SSL"
            description="Use SSL/TLS for secure connection"
            value={data.HANA_SSL || 'true'}
            onChange={(value) => onChange(environment, 'HANA_SSL', value)}
          />
          <ToggleSwitch
            label="Encrypt Connection"
            description="Encrypt data transmission"
            value={data.HANA_ENCRYPT || 'true'}
            onChange={(value) => onChange(environment, 'HANA_ENCRYPT', value)}
          />
          <ToggleSwitch
            label="Validate Certificate"
            description="Verify SSL certificate authenticity"
            value={data.HANA_VALIDATE_CERT || 'false'}
            onChange={(value) => onChange(environment, 'HANA_VALIDATE_CERT', value)}
          />
        </div>
      </div>

      {/* Environment & Logging Configuration */}
      <div>
        <h4 className='text-lg font-bold text-gray-900 mb-6'>Environment & Logging Configuration</h4>
        
        {/* Environment Parameter Display */}
        <div className='mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <label className='block text-base font-semibold text-gray-800'>Environment Parameter</label>
              <p className='text-sm text-gray-600 mt-1 font-medium'>Automatically included in configuration</p>
            </div>
            <div className='text-right'>
              <span className='inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#86a0ff]/10 text-[#86a0ff] border border-[#86a0ff]/20'>
                ENVIRONMENT: {environmentValue}
              </span>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div>
            <label className='block text-base font-semibold text-gray-800 mb-3'>Log Level</label>
            <select
              value={data.LOG_LEVEL || 'info'}
              onChange={(e) => onChange(environment, 'LOG_LEVEL', e.target.value)}
              className='w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#86a0ff] focus:border-[#86a0ff] transition-colors'
            >
              <option value='error'>Error</option>
              <option value='warn'>Warning</option>
              <option value='info'>Info</option>
              <option value='debug'>Debug</option>
            </select>
          </div>
          <div className='flex items-end'>
            <div className='w-full'>
              <ToggleSwitch
                label="File Logging"
                description="Save logs to file"
                value={data.ENABLE_FILE_LOGGING || 'true'}
                onChange={(value) => onChange(environment, 'ENABLE_FILE_LOGGING', value)}
              />
            </div>
          </div>
          <div className='flex items-end'>
            <div className='w-full'>
              <ToggleSwitch
                label="Console Logging"
                description="Display logs in console"
                value={data.ENABLE_CONSOLE_LOGGING || 'false'}
                onChange={(value) => onChange(environment, 'ENABLE_CONSOLE_LOGGING', value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfigurationModal