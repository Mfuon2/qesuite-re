import { useState } from "react";
import type { Product } from "@qesuite/shared";
import { SetupForm } from "./ActionSheet";
import { Icon } from "./Icon";
import { formatMoney } from "../lib/metrics";

export function MenuSettings({ products, hasBusiness, onSetup, onSeed }: {
  products: Product[];
  hasBusiness: boolean;
  onSetup: (path: "/api/business" | "/api/products", data: unknown) => Promise<void>;
  onSeed: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const filtered = products.filter((product) => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const grouped = filtered.reduce<Array<{ category: string; products: Product[] }>>((groups, product) => {
    const category = product.category || "Menu";
    const group = groups.find((item) => item.category === category);
    if (group) group.products.push(product);
    else groups.push({ category, products: [product] });
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

  return <>
    <div className="page-title"><div><div className="eyebrow">Settings</div><h2>Menu Items</h2></div>{hasBusiness && !adding && <div className="menu-actions"><button className="menu-seed-button" onClick={() => void addRestaurantMenu()} disabled={seeding}>{seeding ? "Adding menu…" : "Add restaurant menu"}</button><button className="menu-add-button" onClick={() => { setAdding(true); setSaved(false); }}><Icon name="plus" /> Add item</button></div>}</div>
    <p className="setup-message">Manage the items, prices, and units used in sales, food preparation, and stock counts.</p>
    {!hasBusiness ? <SetupForm kind="business" onSave={onSetup} /> : adding ? <section className="simple-card menu-editor"><h3>Add menu item</h3><SetupForm kind="product" onSave={onSetup} onDone={() => { setAdding(false); setSaved(true); }} onCancel={() => setAdding(false)} /></section> : <>
      {saved && <p className="menu-saved" role="status">Menu item saved. It is now available in your quick actions.</p>}
      {seedMessage && <p className="menu-saved" role="status">{seedMessage}</p>}
      <label className="field-label" htmlFor="menu-search">Find a menu item</label>
      <input id="menu-search" className="text-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name…" />
      <div className="menu-items">{grouped.map((group) => <section className="menu-category" key={group.category}><h3>{group.category}</h3>{group.products.map((product) => <div className="menu-item" key={product.id}><div><strong>{product.name}</strong><small>Sold by {product.unit === "kg" ? "kg" : product.unit}</small></div><strong>{formatMoney(product.price)}</strong></div>)}</section>)}</div>
      {filtered.length === 0 && <p className="empty-state">{products.length ? "No matching menu items." : "No menu items yet. Add your first item above."}</p>}
    </>}
  </>;
}
