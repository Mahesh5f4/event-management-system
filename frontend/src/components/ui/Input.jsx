const Input = ({ label, error, icon: Icon, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-400 ml-1">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
            <Icon size={20} />
          </div>
        )}
        <input
          className={`premium-input w-full ${Icon ? 'pl-12' : ''} ${error ? 'border-danger/50 focus:border-danger' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-danger ml-1">{error}</span>}
    </div>
  );
};

export default Input;
