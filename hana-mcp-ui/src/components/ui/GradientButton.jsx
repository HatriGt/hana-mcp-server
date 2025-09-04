import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { colors, transitions } from '../../utils/theme'
import { IconComponent } from './index'

/**
 * Button - A versatile button component with multiple variants and styles
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Visual variant (primary, secondary, success, warning, danger)
 * @param {string} props.style - Button style (solid, outline, ghost, link)
 * @param {string} props.size - Button size (xs, sm, md, lg, xl)
 * @param {boolean} props.loading - Whether the button is in loading state
 * @param {React.ElementType} props.icon - Icon component to render
 * @param {string} props.iconPosition - Position of the icon (left, right)
 * @param {boolean} props.fullWidth - Whether the button should take full width
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Rendered button component
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  style = 'solid',
  size = 'md', 
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  ...props 
}) => {
  // Style variants (solid, outline, ghost, link) - blue theme to match design
  const styleVariants = {
    solid: {
      primary: 'bg-[#86a0ff] text-white hover:bg-[#7990e6] focus:ring-[#86a0ff]',
      secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-blue-500',
      success: 'bg-[#86a0ff] text-white hover:bg-[#7990e6] focus:ring-[#86a0ff]',
      warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus:ring-red-500 border border-red-200',
    },
    outline: {
              primary: 'bg-transparent border border-[#86a0ff] text-[#86a0ff] hover:bg-[#86a0ff]/10 focus:ring-[#86a0ff]',
      secondary: 'bg-transparent border border-gray-600 text-gray-600 hover:bg-gray-50 focus:ring-blue-500',
              success: 'bg-transparent border border-[#86a0ff] text-[#86a0ff] hover:bg-[#86a0ff]/10 focus:ring-[#86a0ff]',
      warning: 'bg-transparent border border-yellow-500 text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500',
      danger: 'bg-transparent border border-red-300 text-red-600 hover:bg-red-50 focus:ring-red-500',
    },
    ghost: {
              primary: 'bg-transparent text-[#86a0ff] hover:bg-[#86a0ff]/10 focus:ring-[#86a0ff]',
      secondary: 'bg-transparent text-gray-600 hover:bg-gray-50 focus:ring-blue-500',
              success: 'bg-transparent text-[#86a0ff] hover:bg-[#86a0ff]/10 focus:ring-[#86a0ff]',
      warning: 'bg-transparent text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500',
      danger: 'bg-transparent text-red-600 hover:bg-red-50 focus:ring-red-500',
    },
    link: {
              primary: 'bg-transparent text-[#86a0ff] hover:underline focus:ring-[#86a0ff] p-0 shadow-none',
      secondary: 'bg-transparent text-gray-600 hover:underline focus:ring-blue-500 p-0 shadow-none',
              success: 'bg-transparent text-[#86a0ff] hover:underline focus:ring-[#86a0ff] p-0 shadow-none',
      warning: 'bg-transparent text-yellow-600 hover:underline focus:ring-yellow-500 p-0 shadow-none',
      danger: 'bg-transparent text-red-600 hover:underline focus:ring-red-500 p-0 shadow-none',
    }
  };
  
  // Size variants
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base', 
    lg: 'px-5 py-2.5 text-lg',
    xl: 'px-6 py-3 text-xl'
  };
  
  // Icon sizes based on button size
  const iconSizes = {
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'lg'
  };
  
  // Get the appropriate variant classes
  const variantClasses = styleVariants[style][variant];
  
  // Animation settings
  const animations = {
    solid: {
      hover: { scale: 1.02, y: -1 },
      tap: { scale: 0.98 }
    },
    outline: {
      hover: { scale: 1.02 },
      tap: { scale: 0.98 }
    },
    ghost: {
      hover: { scale: 1.02 },
      tap: { scale: 0.98 }
    },
    link: {
      hover: {},
      tap: { scale: 0.98 }
    }
  };
  
  return (
    <motion.button
      className={cn(
        // Base styles
        'rounded-lg font-medium inline-flex items-center justify-center gap-2 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        // Style and size variants
        variantClasses,
        sizes[size],
        // Full width option
        fullWidth && 'w-full',
        // Disabled state
        (loading || props.disabled) && 'opacity-60 cursor-not-allowed',
        // Custom classes
        className
      )}
      whileHover={!loading && !props.disabled ? animations[style].hover : {}}
      whileTap={!loading && !props.disabled ? animations[style].tap : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      disabled={loading || props.disabled}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {/* Left icon */}
      {icon && iconPosition === 'left' && !loading && (
        <IconComponent 
          icon={icon} 
          size={iconSizes[size]} 
          variant={style === 'solid' ? 'white' : variant}
        />
      )}
      
      {/* Button text */}
      {children && <span>{children}</span>}
      
      {/* Right icon */}
      {icon && iconPosition === 'right' && !loading && (
        <IconComponent 
          icon={icon} 
          size={iconSizes[size]} 
          variant={style === 'solid' ? 'white' : variant}
        />
      )}
    </motion.button>
  );
};

// For backward compatibility, export as GradientButton
const GradientButton = Button;

export default GradientButton;