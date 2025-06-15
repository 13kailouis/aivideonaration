
import React from 'react';

interface TextInputAreaProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TextInputArea: React.FC<TextInputAreaProps> = ({ value, onChange, placeholder, disabled }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Enter your narration here..."}
      disabled={disabled}
      rows={8}
      className="w-full p-4 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 placeholder-gray-400 resize-y transition-colors duration-150"
    />
  );
};

export default TextInputArea;
