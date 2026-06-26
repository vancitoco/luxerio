export default function QtyStepper({ qty, onDecrement, onIncrement, disabled }) {
  return (
    <div className="flex items-center border border-hairline">
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        aria-label="Decrease quantity"
        className="flex h-8 w-8 items-center justify-center text-secondary transition-colors hover:bg-elevated hover:text-primary disabled:opacity-40"
      >
        <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
          <rect width="10" height="2" />
        </svg>
      </button>
      <span className="w-8 text-center font-display text-xs font-bold tabular-nums text-primary">
        {qty}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex h-8 w-8 items-center justify-center text-secondary transition-colors hover:bg-elevated hover:text-primary disabled:opacity-40"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <rect x="4" width="2" height="10" />
          <rect y="4" width="10" height="2" />
        </svg>
      </button>
    </div>
  );
}
