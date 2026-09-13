import { useEffect, useState } from 'react';

type CodeLine = {
  content: string;
  className: string;
};

type CodeWindowProps = {
  title: string;
  codeLines: CodeLine[];
};

export default function CodeWindow({ title, codeLines }: CodeWindowProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="code-window overflow-hidden max-w-full">
      <div className="code-window-header">
        <div className="window-button red-button"></div>
        <div className="window-button yellow-button"></div>
        <div className="window-button green-button"></div>
        <span className="ml-2 text-sm text-muted">{title}</span>
      </div>
      <div className="p-4 font-code text-sm whitespace-pre-wrap max-w-full overflow-hidden sm:p-5 lg:p-6 lg:text-base">
        {codeLines.map((line, index) => (
          <div 
            key={index} 
            className={`code-line ${line.className}`} 
            style={{ 
              animationDelay: `${index * 0.2}s`,
              visibility: isVisible ? 'visible' : 'hidden'
            }}
            dangerouslySetInnerHTML={{ __html: line.content }}
          />
        ))}
      </div>
    </div>
  );
}
