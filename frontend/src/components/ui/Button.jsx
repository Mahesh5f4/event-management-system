import { motion } from 'framer-motion';

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
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20',
    secondary: 'bg-secondary text-white hover:bg-secondary-hover shadow-lg shadow-secondary/20',
    outline: 'border border-white/10 text-white hover:bg-white/5',
    ghost: 'text-slate-400 hover:text-white hover:bg-white/5',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10',
    danger: 'bg-danger text-white hover:bg-danger-hover shadow-lg shadow-danger/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-2xl',
    icon: 'p-2.5 rounded-xl',
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={`premium-button flex items-center justify-center gap-2 font-semibold ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </motion.button>
  );
};

export default Button;
