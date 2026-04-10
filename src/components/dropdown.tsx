import React from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`relative inline-block text-left ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded-2xl border-none bg-[#111111] px-4 py-3 pr-10 text-sm font-black uppercase tracking-wide text-white appearance-none outline-none"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
};
