import React from 'react';
import katex from 'katex';

interface LatexRendererProps {
  text: string;
  className?: string;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split text by $$...$$ and $...$ delimiters, capturing the delimiters in the output
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/s);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
            return (
              <span 
                key={idx} 
                className="block my-4 overflow-x-auto max-w-full text-center scrollbar-none" 
                dangerouslySetInnerHTML={{ __html: html }} 
              />
            );
          } catch (e) {
            return <code key={idx} className="block my-2 p-2 rounded bg-red-500/10 text-red-400 text-xs font-mono">{part}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
            return (
              <span 
                key={idx} 
                className="inline-block align-middle py-0.5 mx-0.5" 
                dangerouslySetInnerHTML={{ __html: html }} 
              />
            );
          } catch (e) {
            return <code key={idx} className="px-1 py-0.5 rounded bg-red-500/10 text-red-400 text-xs font-mono">{part}</code>;
          }
        }
        
        return (
          <span key={idx} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </span>
  );
};

export default LatexRenderer;
