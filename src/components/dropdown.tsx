import React from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'dark' | 'light';
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onChange,
  className = '',
  variant = 'dark',
}) => {
  const isLight = variant === 'light';

  return (
    <div className={`relative inline-block text-left flex-shrink-0 ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full cursor-pointer rounded-xl px-3 py-2.5 md:py-2 pr-8 text-sm md:text-xs font-black uppercase tracking-wide appearance-none outline-none transition-all ${
          isLight 
            ? 'bg-white border border-gray-200 text-gray-700 hover:border-green-500 shadow-sm' 
            : 'bg-[#111111] border-none text-white'
        }`}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 ${isLight ? 'text-gray-400' : 'text-white'}`}>
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
};
