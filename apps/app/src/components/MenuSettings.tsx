import { useState } from "react";
import type { Product } from "@qesuite/shared";
import { SetupForm } from "./ActionSheet";
import { Icon } from "./Icon";
import { formatMoney } from "../lib/metrics";
import { CategoryAccordion } from "./CategoryAccordion";

export function MenuSettings({ products, hasBusiness, onSetup, onSeed, onUpdatePrice }: {
  products: Product[];
  hasBusiness: boolean;
  onSetup: (path: "/api/business" | "/api/products", data: unknown) => Promise<void>;
  onSeed: () => Promise<void>;
  onUpdatePrice: (productId: string, priceMinor: number) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceMessage, setPriceMessage] = useState("");
  const filtered = products.filter((product) => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const grouped = filtered.reduce<Array<{ category: string; items: Product[] }>>((groups, product) => {
    const category = product.category || "Menu";
    const group = groups.find((item) => item.category === category);
    if (group) group.items.push(product);
    else groups.push({ category, items: [product] });
    return groups;
  }, []);

  async function addRestaurantMenu() {
    setSeeding(true);
    setSeedMessage("");
    try {
      await onSeed();
      setSeedMessage("Restaurant menu added. Existing items were kept without duplicates.");
    } catch (error) {
      setSeedMessage(error instanceof Error ? error.message : "Unable to add the restaurant menu.");
    } finally {
      setSeeding(false);
    }
  }

  function editPrice(product: Product) {
    setEditingProductId(product.id);
    setPriceInput(String(product.price));
    setPriceMessage("");
  }

  async function savePrice(productId: string) {
    const amount = Number(priceInput);
    const priceMinor = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(priceMinor)) {
      setPriceMessage("Enter a valid non-negative price.");
      return;
    }
    setPriceSaving(true);
    setPriceMessage("");
    try {
      await onUpdatePrice(productId, priceMinor);
      setEditingProductId(null);
      setSaved(true);
    } catch (error) {
      setPriceMessage(error instanceof Error ? error.message : "Unable to update the price.");
    } finally {
      setPriceSaving(false);
    }
  }

  return <>
    <div className="page-title"><div><div className="eyebrow">Settings</div><h2>Menu Items</h2></div>{hasBusiness && !adding && <div className="menu-actions"><button className="menu-seed-button" onClick={() => void addRestaurantMenu()} disabled={seeding}>{seeding ? "Adding menu…" : "Add restaurant menu"}</button><button className="menu-add-button" onClick={() => { setAdding(true); setSaved(false); }}><Icon name="plus" /> Add item</button></div>}</div>
    <p className="setup-message">Manage the items, prices, and units used in sales, food preparation, and stock counts.</p>
    {!hasBusiness ? <SetupForm kind="business" onSave={onSetup} /> : adding ? <section className="simple-card menu-editor"><h3>Add menu item</h3><SetupForm kind="product" onSave={onSetup} onDone={() => { setAdding(false); setSaved(true); }} onCancel={() => setAdding(false)} /></section> : <>
      {saved && <p className="menu-saved" role="status">Menu item saved. It is now available in your quick actions.</p>}
      {seedMessage && <p className="menu-saved" role="status">{seedMessage}</p>}
      <label className="field-label" htmlFor="menu-search">Find a menu item</label>
      <input id="menu-search" className="text-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name…" />
      <CategoryAccordion className="menu-items" groups={grouped} itemKey={(product) => product.id} renderItem={(product) => <div className="menu-item-wrap"><div className="menu-item"><div className="menu-item-main"><strong>{product.name}</strong><small>Sold by {product.unit === "kg" ? "kg" : product.unit}</small></div><div className="menu-item-price"><strong>{formatMoney(product.price)}</strong><button type="button" className="menu-edit-button" onClick={() => editPrice(product)}>{editingProductId === product.id ? "Editing" : "Edit price"}</button></div></div>{editingProductId === product.id && <form className="menu-price-editor" onSubmit={(event) => { event.preventDefault(); void savePrice(product.id); }}><label className="field-label" htmlFor={`menu-price-${product.id}`}>Price (KSh)</label><input id={`menu-price-${product.id}`} className="text-input" type="number" min="0" step="0.01" inputMode="decimal" value={priceInput} onChange={(event) => setPriceInput(event.target.value)} autoFocus /><div className="menu-price-actions"><button type="button" className="secondary-button" onClick={() => { setEditingProductId(null); setPriceMessage(""); }}>Cancel</button><button type="submit" className="primary-button" disabled={priceSaving}>{priceSaving ? "Saving…" : "Save price"}</button></div>{priceMessage && <p className="menu-price-error" role="alert">{priceMessage}</p>}</form>}</div>} />
      {filtered.length === 0 && <p className="empty-state">{products.length ? "No matching menu items." : "No menu items yet. Add your first item above."}</p>}
    </>}
  </>;
}
