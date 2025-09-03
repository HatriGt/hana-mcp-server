import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

const StatusBadge = ({ 
  status, 
  count, 
  showPulse = true, 
  size = 'md',
  children,
  className 
}) => {
  const statusConfig = {
    online: {
      color: 'bg-gray-700',
      glow: 'shadow-gray-200/50',
      text: 'Online',
      className: 'status-online'
    },
    offline: {
      color: 'bg-gray-400',
      glow: 'shadow-gray-200/50',
      text: 'Offline',
      className: 'status-offline'
    },
    warning: {
      color: 'bg-gray-600',
      glow: 'shadow-gray-200/50',
      text: 'Warning',
      className: 'status-warning'
    },
    error: {
      color: 'bg-gray-800', 
      glow: 'shadow-gray-200/50',
      text: 'Error',
      className: 'status-error'
    }
  }
  
  const sizes = {
    xs: { dot: 'w-1.5 h-1.5', text: 'text-xs', padding: 'px-1.5 py-0.5' },
    sm: { dot: 'w-2 h-2', text: 'text-xs', padding: 'px-2 py-1' },
    md: { dot: 'w-3 h-3', text: 'text-sm', padding: 'px-3 py-1' },
    lg: { dot: 'w-4 h-4', text: 'text-base', padding: 'px-4 py-2' }
  }
  
  const config = statusConfig[status] || statusConfig.offline
  const sizeConfig = sizes[size]
  
  return (
    <motion.div 
      className={cn(
        'inline-flex items-center gap-2 rounded-full',
        sizeConfig.padding,
        className
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn('relative flex items-center justify-center rounded-full', sizeConfig.dot)}>
        <div className={cn('w-full h-full rounded-full shadow-lg', config.color, config.glow)} />
        {showPulse && status === 'online' && (
          <div className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            config.color
          )} />
        )}
      </div>
      
      <span className={cn('font-medium', sizeConfig.text)}>
        {children || config.text}
        {count !== undefined && (
          <span className="ml-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
            {count}
          </span>
        )}
      </span>
    </motion.div>
  )
}

// Environment Badge Component
export const EnvironmentBadge = ({ environment, active = false, size = 'sm', className }) => {
  const envClasses = {
    Production: 'bg-green-50 border-green-200 text-green-800',
    Development: 'bg-[#86a0ff] border-[#86a0ff] text-white',
    Staging: 'bg-amber-50 border-amber-200 text-amber-800',
    STAGING: 'bg-amber-50 border-amber-200 text-amber-800',
    Testing: 'bg-purple-50 border-purple-200 text-purple-800',
    QA: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  }
  
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  
  const activeRingClasses = {
    Production: 'ring-2 ring-green-300 shadow-sm',
    Development: 'ring-2 ring-[#86a0ff]/30 shadow-sm',
    Staging: 'ring-2 ring-amber-300 shadow-sm',
    STAGING: 'ring-2 ring-amber-300 shadow-sm',
    Testing: 'ring-2 ring-purple-300 shadow-sm',
    QA: 'ring-2 ring-indigo-300 shadow-sm'
  }
  
  const dotClasses = {
    Production: 'bg-green-600',
    Development: 'bg-[#86a0ff]',
    Staging: 'bg-amber-600',
    STAGING: 'bg-amber-600',
    Testing: 'bg-purple-600',
    QA: 'bg-indigo-600'
  }

  // Enhanced active state styling
  const activeStateClasses = active ? {
    Production: 'bg-green-100 border-green-300 text-green-900 shadow-md',
    Development: 'bg-[#86a0ff]/90 border-[#86a0ff] text-white shadow-md',
    Staging: 'bg-amber-100 border-amber-300 text-amber-900 shadow-md',
    STAGING: 'bg-amber-100 border-amber-300 text-amber-900 shadow-md',
    Testing: 'bg-purple-100 border-purple-300 text-purple-900 shadow-md',
    QA: 'bg-indigo-100 border-indigo-300 text-indigo-900 shadow-md'
  } : {}
  
  return (
    <motion.span 
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'border transition-all duration-200',
        sizeClasses[size],
        active ? (activeStateClasses[environment] || 'bg-green-100 border-green-300 text-green-900 shadow-md') : 
                (envClasses[environment] || 'bg-gray-50 border-gray-200 text-gray-700'),
        active && (activeRingClasses[environment] || 'ring-2 ring-green-300 shadow-sm'),
        className
      )}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.1 }}
      title={`${environment} environment${active ? ' (active)' : ''}`}
    >
      {environment}
      {active && (
        <motion.div 
          className="ml-1.5 flex items-center space-x-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div 
            className={cn("w-2 h-2 rounded-full", dotClasses[environment] || 'bg-green-600')}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>
      )}
    </motion.span>
  )
}

export default StatusBadge