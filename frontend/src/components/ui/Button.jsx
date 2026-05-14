import { memo } from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  loading = false, 
  disabled = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-white text-black hover:bg-white/90',
    secondary: 'liquid-glass text-white hover:bg-white/5',
    outline: 'border border-white/10 text-white hover:bg-white/5',
    ghost: 'text-white/70 hover:text-white',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-full',
    md: 'px-6 py-3 text-base rounded-full',
    lg: 'px-8 py-4 text-lg rounded-full',
    icon: 'p-2.5 rounded-full',
  };

  return (
    <button
      className={`flex items-center justify-center gap-2 font-medium transition-all duration-300 transform-gpu ${variants[variant]} ${sizes[size]} ${className} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

export default memo(Button);
