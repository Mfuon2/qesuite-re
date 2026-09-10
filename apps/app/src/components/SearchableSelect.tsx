import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";

export type SelectOption = { value: string; label: string; detail?: string; category?: string };

export function SearchableSelect({ label, value, options, onChange, placeholder = "Search or select…", disabled = false }: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => `${option.label} ${option.detail || ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const activeIndex = Math.min(active, filtered.length - 1);
  const grouped = filtered.reduce<Array<{ category: string; options: Array<{ option: SelectOption; index: number }> }>>((groups, option, index) => {
    const category = option.category || "Options";
    const group = groups.find((item) => item.category === category);
    if (group) group.options.push({ option, index });
    else groups.push({ category, options: [{ option, index }] });
    return groups;
  }, []);
  const firstCategory = grouped[0]?.category ?? null;

  function openSelect(nextQuery = "") {
    const normalized = nextQuery.trim().toLocaleLowerCase();
    const firstMatch = options.find((option) => `${option.label} ${option.detail || ""}`.toLocaleLowerCase().includes(normalized));
    setExpandedCategory(firstMatch?.category || (firstMatch ? "Options" : null));
    setOpen(true);
  }

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, id]);

  function choose(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    input.current?.focus();
  }

  return <div className="search-select" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(""); }
  }}>
    <label className="field-label" htmlFor={id}>{label}</label>
    <div className={`search-select-control ${open ? "is-open" : ""}`}>
      <input ref={input} id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off" disabled={disabled} placeholder={placeholder} value={open ? query : selected?.label || ""}
        onFocus={() => { setQuery(""); setActive(0); openSelect(); }}
        onClick={() => openSelect(query)}
        onChange={(event) => { setQuery(event.target.value); setActive(0); openSelect(event.target.value); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const nextIndex = open ? Math.max(0, Math.min(filtered.length - 1, activeIndex + (event.key === "ArrowDown" ? 1 : -1))) : 0;
            openSelect(query);
            setActive(nextIndex);
            setExpandedCategory(filtered[nextIndex]?.category || (filtered[nextIndex] ? "Options" : firstCategory));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            if (filtered[activeIndex]) choose(filtered[activeIndex]);
          } else if (event.key === "Escape" && open) {
            event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery("");
          } else if (event.key === "Tab") { setOpen(false); setQuery(""); }
        }} />
      <button type="button" tabIndex={-1} disabled={disabled} aria-label={`Toggle ${label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (open) { setOpen(false); setQuery(""); } else { input.current?.focus(); openSelect(); } }}><Icon name="chevron" /></button>
    </div>
    {open && <div className="search-select-panel">
      <div className="search-select-caption">{filtered.length} {filtered.length === 1 ? "option" : "options"}</div>
      <ul id={`${id}-list`} role="listbox" aria-label={label}>
        {grouped.map((group) => {
          const expanded = expandedCategory === group.category;
          return <li className={`search-select-group${expanded ? " expanded" : ""}`} role="presentation" key={group.category}><button type="button" className="search-select-group-toggle" aria-expanded={expanded} aria-controls={`${id}-group-${group.category.replace(/[^a-z0-9]+/gi, "-")}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { setExpandedCategory(expanded ? null : group.category); if (!expanded) setActive(group.options[0]?.index ?? 0); }}><span>{group.category}</span><Icon name="chevron" /></button>{expanded && <ul id={`${id}-group-${group.category.replace(/[^a-z0-9]+/gi, "-")}`} role="group" aria-label={group.category}>{group.options.map(({ option, index }) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === value} className={index === activeIndex ? "highlighted" : ""}
          onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
          <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span><span className="select-check" aria-hidden="true">{option.value === value ? "✓" : ""}</span>
        </li>)}</ul>}</li>;
        })}
      </ul>
      {filtered.length === 0 && <p className="search-select-empty" role="status">No matches. Try another search.</p>}
    </div>}
  </div>;
}
