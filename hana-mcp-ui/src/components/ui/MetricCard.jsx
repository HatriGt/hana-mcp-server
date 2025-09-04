import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

const MetricCard = ({ 
  title, 
  value,
  className 
}) => {
  return (
    <motion.div
      className={cn(
        'bg-white border border-gray-100 rounded-xl overflow-hidden',
        'hover:border-gray-200 transition-all duration-300',
        className
      )}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="border-b border-gray-50 px-4 py-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-4 py-4">
        <div className="flex items-baseline">
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default MetricCard