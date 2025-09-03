import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'white',
  className 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }
  
  const colors = {
    white: 'border-gray-200 border-t-blue-600',
    primary: 'border-blue-200 border-t-blue-600',
    success: 'border-emerald-200 border-t-emerald-600',
    warning: 'border-amber-200 border-t-amber-600',
    danger: 'border-red-200 border-t-red-600'
  }
  
  return (
    <motion.div
      className={cn(
        'inline-block rounded-full border-2',
        sizes[size],
        colors[color] || colors.white,
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  )
}

// Full page loading overlay
export const LoadingOverlay = ({ message = "Loading..." }) => (
  <motion.div 
    className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div 
      className="glass-card p-8 text-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <LoadingSpinner size="xl" color="primary" className="mx-auto mb-4" />
      <p className="text-gray-700">{message}</p>
    </motion.div>
  </motion.div>
)

export default LoadingSpinner