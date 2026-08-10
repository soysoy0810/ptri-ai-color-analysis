import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface NavButtonsProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  hideNext?: boolean;
  backLabel?: string;
  nextIcon?: 'chevron' | 'check' | 'none';
}

export function NavButtons({
  onBack,
  onNext,
  nextLabel = 'NEXT',
  nextDisabled = false,
  hideBack = false,
  hideNext = false,
  backLabel = 'BACK',
  nextIcon = 'chevron',
}: NavButtonsProps) {
  return (
    <div className="flex w-full items-center gap-3">
      {!hideBack ? (
        <button type="button" className="btn btn-secondary min-w-[110px]" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
          {backLabel}
        </button>
      ) : null}
      {!hideNext ? (
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={onNext}
          disabled={nextDisabled}
        >
          {nextLabel}
          {nextIcon === 'chevron' ? <ChevronRight className="h-5 w-5" /> : null}
          {nextIcon === 'check' ? <Check className="h-5 w-5" /> : null}
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
