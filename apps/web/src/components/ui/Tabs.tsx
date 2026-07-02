type Tab<T extends string> = { value: T; label: string };

type TabsProps<T extends string> = {
  ariaLabel: string;
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (value: T) => void;
};

export const Tabs = <T extends string>({ ariaLabel, tabs, value, onChange }: TabsProps<T>) => (
  <div className="tabs" role="tablist" aria-label={ariaLabel}>
    {tabs.map((tab) => (
      <button
        aria-selected={value === tab.value}
        className="tab"
        key={tab.value}
        role="tab"
        type="button"
        onClick={() => onChange(tab.value)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
