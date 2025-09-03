import React from 'react';
import { cn } from '../../utils/cn';

/**
 * IconComponent - A standardized wrapper for icons
 * 
 * @param {Object} props - Component props
 * @param {React.ElementType} props.icon - The icon component to render
 * @param {string} props.size - Size of the icon (sm, md, lg)
 * @param {string} props.variant - Visual variant (default, primary, secondary, etc.)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Accessibility label (for icon-only buttons)
 * @returns {JSX.Element} - Rendered icon component
 */
const IconComponent = ({ 
  icon: Icon,
  size = 'md',
  variant = 'default',
  className,
  label,
  ...props 
}) => {
  // Size mappings
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };
  
  // Variant mappings
  const variants = {
    default: 'text-gray-600',
    primary: 'text-[#86a0ff]',
    secondary: 'text-gray-500',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-500',
    white: 'text-white'
  };
  
  // If no Icon is provided, return null
  if (!Icon) return null;
  
  return (
    <Icon 
      className={cn(
        sizes[size],
        variants[variant],
        className
      )}
      aria-label={label}
      aria-hidden={!label}
      role={label ? 'img' : undefined}
      {...props}
    />
  );
};

export default IconComponent;
