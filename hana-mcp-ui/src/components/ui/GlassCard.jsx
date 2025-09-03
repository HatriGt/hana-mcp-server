import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { colors, shadows, borderRadius } from '../../utils/theme'

/**
 * GlassCard - A versatile card component with multiple variants
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.variant - Visual variant (default, primary, success, warning, danger)
 * @param {boolean} props.hover - Whether to apply hover effects
 * @param {boolean} props.glow - Whether to apply glow effect on hover
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.headerProps - Props for the card header
 * @param {React.ReactNode} props.header - Card header content
 * @returns {JSX.Element} - Rendered card component
 */
const GlassCard = ({ 
  children, 
  variant = 'default', 
  hover = true, 
  glow = false,
  className,
  header,
  headerProps = {},
  ...props 
}) => {
  // Card variants - enhanced with better shadows and borders
  const variants = {
    default: 'bg-white border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden',
    primary: 'bg-white border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden',
    success: 'bg-white border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden', 
    warning: 'bg-white border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden',
    danger: 'bg-white border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden'
  }
  
  // Header variants - with improved styling
  const headerVariants = {
    default: 'border-b border-gray-200 bg-white p-6',
    primary: 'border-b border-gray-200 bg-white p-6',
    success: 'border-b border-gray-200 bg-white p-6',
    warning: 'border-b border-gray-200 bg-white p-6',
    danger: 'border-b border-gray-200 bg-white p-6'
  }
  
  return (
    <motion.div
      className={cn(
        variants[variant],
        hover && 'hover:shadow-md hover:-translate-y-0.5',
        glow && 'hover:shadow-gray-200',
        className
      )}
      whileHover={hover ? { y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...props}
    >
      {header && (
        <div className={cn(headerVariants[variant], headerProps.className)} {...headerProps}>
          {header}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

export default GlassCard