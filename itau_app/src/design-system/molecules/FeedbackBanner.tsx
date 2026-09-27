import React, { useState } from 'react';
import { X, MessageSquareHeart, Check } from 'lucide-react';

export interface FeedbackBannerProps {
  question?: string;
  onDismiss?: () => void;
  className?: string;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  question = 'O que achou dessa versão do espaço do seu cartão?',
  onDismiss,
  className = '',
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  const handleRate = (value: number) => {
    setRating(value);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-medium animate-fadeIn ${className}`}>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Obrigado pelo seu feedback! Isso nos ajuda a melhorar.</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-emerald-700 hover:text-emerald-900 p-1"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-between p-3.5 bg-[#F4F6F8] border border-slate-200/80 rounded-2xl text-slate-700 text-xs shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2.5 flex-1 pr-2">
        <div className="w-6 h-6 rounded-full bg-[#EC7000]/10 flex items-center justify-center shrink-0 text-[#EC7000]">
          <MessageSquareHeart className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-medium text-slate-800 line-clamp-1">{question}</span>
          <div className="flex items-center gap-1.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRate(star)}
                className="w-5 h-5 rounded-md hover:bg-slate-200/80 text-[11px] font-bold text-slate-600 hover:text-[#EC7000] transition-colors flex items-center justify-center"
                title={`${star} estrelas`}
              >
                {star}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onDismiss}
        type="button"
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
        aria-label="Fechar banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
