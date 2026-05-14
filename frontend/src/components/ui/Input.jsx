import { memo } from 'react';

const Input = ({ label, error, icon: Icon, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 transform-gpu ${className}`}>
      {label && <label className="text-xs font-medium text-white/50 ml-1 uppercase tracking-wider">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          className={`liquid-glass w-full bg-white/5 text-white px-5 py-3 rounded-xl outline-none focus:bg-white/10 transition-all duration-300 placeholder:text-white/20 text-sm transform-gpu ${Icon ? 'pl-12' : ''} ${error ? 'border-red-500/50' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500/80 ml-1">{error}</span>}
    </div>
  );
};

export default memo(Input);
