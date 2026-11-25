interface PanelLoadingSkeletonProps {
  testId: string;
  statusText: string;
  blocks: readonly string[];
}

export function PanelLoadingSkeleton({
  testId,
  statusText,
  blocks,
}: PanelLoadingSkeletonProps) {
  return (
    <div
      data-testid={testId}
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      <p
        role="status"
        className="m-0 text-[13px] font-medium text-[var(--color-text-secondary)]"
      >
        {statusText}
      </p>
      {blocks.map((blockClass, index) => (
        <div key={`${index}-${blockClass}`} className={`${blockClass} bg-[#EEF1E8]`} />
      ))}
    </div>
  );
}

interface PanelErrorCardProps {
  testId: string;
  heading: string;
  message: string;
  onRetry: () => void;
}

export function PanelErrorCard({
  testId,
  heading,
  message,
  onRetry,
}: PanelErrorCardProps) {
  return (
    <div data-testid={testId} className="flex flex-col gap-4">
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-status-error-text)] bg-[var(--color-status-error-bg)] p-4"
      >
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[15px] font-medium text-[var(--color-status-error-text)]">
            {heading}
          </h3>
          <p className="m-0 text-[13px] text-[var(--color-status-error-text)]">
            {message}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary w-fit"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

interface PanelEmptyCardProps {
  testId: string;
  heading: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PanelEmptyCard({
  testId,
  heading,
  message,
  actionLabel,
  onAction,
}: PanelEmptyCardProps) {
  return (
    <div data-testid={testId} className="flex flex-col gap-4">
      <div className="surface-card flex flex-col gap-3 bg-[var(--color-surface-secondary)] p-4">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[15px] font-medium text-[var(--color-text-charcoal)]">
            {heading}
          </h3>
          <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
            {message}
          </p>
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            className="btn-secondary w-fit"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterTabOption<K extends string> {
  key: K;
  label: string;
}

interface FilterTabBarProps<K extends string> {
  ariaLabel: string;
  tabs: ReadonlyArray<FilterTabOption<K>>;
  activeKey: K;
  counts: Record<K, number>;
  testIdPrefix: string;
  onSelect: (key: K) => void;
}

export function FilterTabBar<K extends string>({
  ariaLabel,
  tabs,
  activeKey,
  counts,
  testIdPrefix,
  onSelect,
}: FilterTabBarProps<K>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isSelected = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`${testIdPrefix}-${tab.key}`}
            onClick={() => onSelect(tab.key)}
            className={
              isSelected
                ? 'inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] border border-[var(--color-accent-sage-strong)] bg-[var(--color-accent-sage-strong)] px-3 py-2 text-[13px] font-medium text-[var(--color-text-inverse)]'
                : 'inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] border border-[var(--color-border-control)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)]'
            }
          >
            <span>{tab.label}</span>
            <span
              className={
                isSelected
                  ? 'rounded-full bg-[#3B5638] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-inverse)]'
                  : 'rounded-full bg-[var(--color-surface-primary)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]'
              }
            >
              {counts[tab.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
