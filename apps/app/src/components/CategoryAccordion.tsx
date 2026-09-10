import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type CategoryGroup<T> = { category: string; items: T[] };

export function CategoryAccordion<T>({ groups, itemKey, renderItem, className = "" }: {
  groups: CategoryGroup<T>[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const firstCategory = groups[0]?.category ?? null;
  const [expandedCategory, setExpandedCategory] = useState<string | null>(firstCategory);

  useEffect(() => {
    setExpandedCategory((current) => current && groups.some((group) => group.category === current) ? current : firstCategory);
  }, [firstCategory, groups]);

  return <div className={`category-accordion ${className}`.trim()}>
    {groups.map((group) => {
      const expanded = expandedCategory === group.category;
      const id = `category-${group.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      return <section className={`category-panel${expanded ? " is-expanded" : ""}`} key={group.category}>
        <button type="button" className="category-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpandedCategory(expanded ? null : group.category)}>
          <span><span className="category-dot" aria-hidden="true" />{group.category}</span>
          <Icon name="chevron" />
        </button>
        {expanded && <div id={id} className="category-items">{group.items.map((item) => <div key={itemKey(item)}>{renderItem(item)}</div>)}</div>}
      </section>;
    })}
  </div>;
}
