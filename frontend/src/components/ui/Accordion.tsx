import React from 'react';

export interface AccordionItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export const Accordion: React.FC<AccordionProps> = ({ items, activeId, onChange }) => {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isOpen = item.id === activeId;
        return (
          <div
            key={item.id}
            className={`transition-all duration-300 rounded-xl overflow-hidden ${
              isOpen
                ? 'glass bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(14,165,233,0.1)]'
                : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10'
            }`}
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => onChange(item.id)}
              className="w-full flex items-center justify-between p-5 text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neon-blue-500/50"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                {item.icon && (
                  <span className={`transition-colors duration-300 ${isOpen ? 'text-neon-blue-400' : 'text-gray-400'}`}>
                    {item.icon}
                  </span>
                )}
                <span className={`font-medium text-base transition-colors duration-300 ${isOpen ? 'text-white' : 'text-gray-300'}`}>
                  {item.title}
                </span>
              </div>

              {/* Chevron Icon */}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'transform rotate-180 text-neon-blue-400' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Content Container */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-[800px] opacity-100 border-t border-white/5 p-6 bg-surface-900/40' : 'max-h-0 opacity-0 overflow-hidden'
              }`}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
