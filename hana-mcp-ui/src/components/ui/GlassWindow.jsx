import React from 'react';
import { motion } from 'framer-motion';

const GlassWindow = ({ children, className = '', maxWidth = '7xl', maxHeight = '6xl' }) => {
  // Convert maxWidth to actual Tailwind class
  const getMaxWidthClass = (width) => {
    const widthMap = {
      'sm': 'max-w-sm',
      'md': 'max-w-md', 
      'lg': 'max-w-lg',
      'xl': 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
      'full': 'max-w-full'
    };
    return widthMap[width] || 'max-w-7xl';
  };

  const getMaxHeightClass = (height) => {
    const heightMap = {
      'sm': 'max-h-sm',
      'md': 'max-h-md',
      'lg': 'max-h-lg', 
      'xl': 'max-h-xl',
      '2xl': 'max-h-2xl',
      '3xl': 'max-h-3xl',
      '4xl': 'max-h-4xl',
      '5xl': 'max-h-5xl',
      '6xl': 'max-h-6xl',
      'full': 'max-h-full'
    };
    return heightMap[height] || 'max-h-6xl';
  };

  return (
    <div className="glass-window-container bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-dots opacity-20 sm:opacity-30 pointer-events-none" />
      
      {/* Glass Window Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`
          glass-window-content
          relative bg-white/80 backdrop-blur-xl
          border border-white/20
          rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-gray-900/10
          overflow-hidden
          ${className}
        `}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          minHeight: '600px'
        }}
      >
        {/* Glass Window Header */}
        <div className="absolute top-0 left-0 right-0 h-12 sm:h-14 bg-gradient-to-r from-white/40 to-white/20 border-b border-white/20 backdrop-blur-sm">
          {/* Window Controls */}
          <div className="flex items-center h-full px-4 sm:px-6 gap-2 sm:gap-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-400/80 shadow-sm hover:bg-red-500/90 transition-colors" />
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-400/80 shadow-sm hover:bg-yellow-500/90 transition-colors" />
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-400/80 shadow-sm hover:bg-green-500/90 transition-colors" />
          </div>
        </div>

        {/* Content Area */}
        <div className="pt-12 sm:pt-14 h-full p-3 pb-4">
          {children}
        </div>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-blue-100/20 pointer-events-none" />
      </motion.div>
    </div>
  );
};

export default GlassWindow;
