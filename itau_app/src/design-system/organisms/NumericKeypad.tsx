import React from 'react';
import { Delete, ArrowRight } from 'lucide-react';

export interface NumericKeypadProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onSubmit?: () => void;
  showSubmitKey?: boolean;
  className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onKeyPress,
  onBackspace,
  onSubmit,
  showSubmitKey = true,
  className = '',
}) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [',', '0', 'delete'],
  ];

  const handleKeyClick = (key: string) => {
    // Subtle audio haptic vibration if available in browser
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    if (key === 'delete') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <div className={`w-full max-w-[340px] mx-auto select-none ${className}`}>
      <div className="grid grid-cols-3 gap-2 p-2">
        {keys.map((row, rowIndex) =>
          row.map((key, colIndex) => {
            const isDelete = key === 'delete';
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                onClick={() => handleKeyClick(key)}
                className={`
                  h-14 rounded-2xl flex items-center justify-center font-bold text-xl tabular-nums
                  transition-all duration-100 active:scale-90 active:bg-slate-200 cursor-pointer
                  ${
                    isDelete
                      ? 'text-slate-600 hover:bg-slate-100 bg-slate-50/80 text-base'
                      : 'text-slate-900 bg-white hover:bg-slate-50 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
                  }
                `}
                aria-label={isDelete ? 'Apagar dígito' : `Número ${key}`}
              >
                {isDelete ? (
                  <Delete className="w-5 h-5 text-slate-500" />
                ) : (
                  key
                )}
              </button>
            );
          })
        )}
      </div>

      {showSubmitKey && onSubmit && (
        <div className="px-2 pt-1">
          <button
            type="button"
            onClick={onSubmit}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Confirmar valor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
