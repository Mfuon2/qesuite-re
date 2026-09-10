import { useEffect, useMemo, useState } from "react";
import type { BusinessEventType, Product } from "@qesuite/shared";
import { Icon } from "./Icon";
import { SearchableSelect } from "./SearchableSelect";
import { formatMoney } from "../lib/metrics";
import type { FoodSnapshot } from "../lib/metrics";

type DraftEvent = {
  type: BusinessEventType;
  itemId?: string;
  itemName?: string;
  quantity?: number;
  amount?: number;
  note?: string;
};

type Action = "sale" | "stock_purchase" | "expense" | "top_up" | "withdrawal" | "production" | "stock_count";

type Props = {
  action: Action | null;
  products: Product[];
  food: FoodSnapshot[];
  hasBusiness: boolean;
  onSetup: (path: "/api/business" | "/api/products", data: unknown) => Promise<void>;
  onClose: () => void;
  onManageMenu: () => void;
  onSave: (event: DraftEvent) => Promise<void>;
  initialProductId?: string;
  continueSaleAfterSave?: boolean;
  onPrepareForSale: (productId: string) => void;
  onContinueToSale: (productId: string) => void;
};

const titleMap: Record<Action, string> = {
  sale: "Record sale",
  stock_purchase: "Buy stock",
  expense: "Add expense",
  top_up: "Top up",
  withdrawal: "Withdraw",
  production: "Make food",
  stock_count: "Count food left"
};

export function ActionSheet({ action, products, food, hasBusiness, onSetup, onClose, onManageMenu, onSave, initialProductId, continueSaleAfterSave = false, onPrepareForSale, onContinueToSale }: Props) {
  const [selectedId, setSelectedId] = useState(initialProductId ?? "");
  const [quantity, setQuantity] = useState(action === "stock_count" ? 0 : 1);
  const [amount, setAmount] = useState("");
  const [itemName, setItemName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedId && !products.some((product) => product.id === selectedId)) setSelectedId("");
  }, [products, selectedId]);

  useEffect(() => {
    if (!action) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [action, onClose, saving]);

  const selectedProduct = useMemo(() => products.find((item) => item.id === selectedId), [products, selectedId]);
  const selectedStock = useMemo(() => food.find((row) => row.product.id === selectedId), [food, selectedId]);
  const saleTotal = (selectedProduct?.price ?? 0) * quantity;
  const saleBlockedReason = action === "sale" ? selectedStock?.saleBlockedReason : undefined;
  const saleWarning = action === "sale" && selectedProduct && !selectedStock?.hasProduction ? preparationWarning(selectedProduct.category) : saleBlockedReason;

  if (!action) return null;

  const actionTitle = action === "production" && selectedProduct ? prepareActionLabel(selectedProduct.category) : titleMap[action];

  const isProductAction = action === "sale" || action === "production" || action === "stock_count";
  const isMoneyOnly = action === "expense" || action === "top_up" || action === "withdrawal";

  async function submit() {
    if (saving || disabled || !hasBusiness) return;
    setSaving(true);
    try {
      if (action === "sale" && selectedProduct) {
        await onSave({ type: "sale", itemId: selectedProduct.id, itemName: selectedProduct.name, quantity, amount: saleTotal });
      } else if (action === "production" && selectedProduct) {
        await onSave({ type: "production", itemId: selectedProduct.id, itemName: selectedProduct.name, quantity });
      } else if (action === "stock_count" && selectedProduct) {
        await onSave({ type: "stock_count", itemId: selectedProduct.id, itemName: selectedProduct.name, quantity });
      } else if (action === "stock_purchase") {
        await onSave({ type: "stock_purchase", itemName: itemName.trim() || "Stock", quantity: quantity || undefined, amount: Number(amount) || 0, note: note.trim() || undefined });
      } else if (isMoneyOnly) {
        await onSave({ type: action, amount: Number(amount) || 0, note: note.trim() || undefined });
      }
      if (action === "production" && continueSaleAfterSave && selectedProduct) onContinueToSale(selectedProduct.id);
      else onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  const disabled =
    (isProductAction && !selectedProduct) ||
    (action === "sale" && (!selectedStock || Boolean(saleBlockedReason) || quantity > selectedStock.saleAvailable)) ||
    ((action === "stock_purchase" || isMoneyOnly) && (!Number.isFinite(Number(amount)) || Number(amount) <= 0));

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={actionTitle}>
        <div className="sheet-handle" />
        <header className="sheet-header">
          <div>
            <div className="eyebrow">Quick entry</div>
            <h2>{actionTitle}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>

        {!hasBusiness ? <SetupForm kind="business" onSave={onSetup} /> : <>
        {isProductAction && products.length === 0 ? <div><p className="setup-message">Create your menu items and prices in Settings, then select them here.</p><button className="primary-button" onClick={onManageMenu}>Go to Menu Items</button></div> : <>
        {isProductAction && (
          <>
            <SearchableSelect label={action === "sale" ? "What did you sell?" : action === "production" ? "What did you make?" : "What are you counting?"} placeholder="Search menu items…" value={selectedId} onChange={setSelectedId} options={products.map((product) => ({ value: product.id, label: product.name, detail: `${formatMoney(product.price)} / ${product.unit}`, category: product.category || "Menu" }))} />
            {selectedProduct && <div className="selected-product-info"><span>Unit: <strong>{selectedProduct.unit}</strong></span>{action === "sale" && <><span>Price: <strong>{formatMoney(selectedProduct.price)}</strong></span><span>Available: <strong>{selectedStock?.saleAvailable ?? 0}</strong></span></>}</div>}
            {saleWarning && <div className="stock-warning-action" role="alert"><p className="stock-warning">{saleWarning}</p>{action === "sale" && selectedProduct && !selectedStock?.hasProduction && <button className="prepare-sale-button" onClick={() => onPrepareForSale(selectedProduct.id)}>{prepareActionLabel(selectedProduct.category)}</button>}</div>}
            {!selectedProduct && <button className="text-button add-menu-button" onClick={onManageMenu}>Add item to menu</button>}
            <label className="field-label">{action === "stock_count" ? "How many are left?" : "Quantity"}</label>
            <div className="stepper">
              <button onClick={() => setQuantity((value) => Math.max(action === "stock_count" ? 0 : 1, value - 1))} aria-label="Decrease"><Icon name="minus" /></button>
              <strong>{quantity}</strong>
              <button onClick={() => setQuantity((value) => value + 1)} aria-label="Increase" disabled={action === "sale" && selectedStock !== undefined && quantity >= selectedStock.saleAvailable}><Icon name="plus" /></button>
            </div>
            {action === "sale" && <div className="total-row"><span>Total</span><strong>{formatMoney(saleTotal)}</strong></div>}
          </>
        )}

        {action === "stock_purchase" && (
          <>
            <label className="field-label" htmlFor="item-name">What did you buy?</label>
            <input id="item-name" className="text-input" value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="e.g. Flour" autoFocus />
            <label className="field-label" htmlFor="stock-amount">How much did you spend?</label>
            <div className="money-input"><span>KSh</span><input id="stock-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" /></div>
            <label className="field-label">Quantity <span className="optional">optional</span></label>
            <div className="stepper compact">
              <button onClick={() => setQuantity((value) => Math.max(0, value - 1))}><Icon name="minus" /></button>
              <strong>{quantity}</strong>
              <button onClick={() => setQuantity((value) => value + 1)}><Icon name="plus" /></button>
            </div>
          </>
        )}

        {isMoneyOnly && (
          <>
            <label className="field-label" htmlFor="money-amount">
              {action === "top_up" ? "How much are you adding?" : action === "withdrawal" ? "How much are you taking?" : "How much did you spend?"}
            </label>
            <div className="money-input large"><span>KSh</span><input id="money-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" autoFocus /></div>
            {action === "top_up" && <div className="info-line">From <strong>My own money</strong></div>}
            <label className="field-label" htmlFor="money-note">Note <span className="optional">optional</span></label>
            <input id="money-note" className="text-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder={action === "expense" ? "e.g. Gas refill" : "Add a short note"} />
          </>
        )}

        {error && <p role="alert" className="negative">{error}</p>}
        <button className="primary-button" onClick={submit} disabled={disabled || saving}>{saving ? "Saving…" : "Save"}</button>
        </>}
        </>}
      </section>
    </div>
  );
}

function prepareActionLabel(category: string): string {
  switch (category) {
    case "Breakfast": return "Prepare breakfast";
    case "Tea": return "Make tea";
    case "Lunch": return "Prepare lunch";
    case "Chicken": return "Prepare chicken";
    case "Drinks": return "Make ready for sale";
    case "Snacks / Extras": return "Prepare snack";
    case "Pre-Order Menu": return "Prepare order";
    default: return "Make food";
  }
}

function preparationWarning(category: string): string {
  switch (category) {
    case "Breakfast": return "Prepare this breakfast item before recording a sale.";
    case "Tea": return "Make this tea before recording a sale.";
    case "Lunch": return "Prepare this lunch before recording a sale.";
    case "Chicken": return "Prepare this chicken meal before recording a sale.";
    case "Drinks": return "Make this drink ready before recording a sale.";
    case "Snacks / Extras": return "Prepare this snack before recording a sale.";
    case "Pre-Order Menu": return "Prepare this order before recording a sale.";
    default: return "Make this food first before recording a sale.";
  }
}

export function SetupForm({ kind, onSave, onDone, onCancel }: {
  kind: "business" | "product";
  onSave: Props["onSetup"];
  onDone?: (id: string) => void;
  onCancel?: () => void;
}) {
  const [id] = useState(() => crypto.randomUUID());
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<Product["unit"]>("item");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const validPrice = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(price) && Number.isSafeInteger(Math.round(Number(price) * 100));
  const valid = Boolean(name.trim()) && (kind === "business" || validPrice);

  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true); setError("");
    try {
      await onSave(kind === "business" ? "/api/business" : "/api/products", { id, name: name.trim(), priceMinor: Math.round(Number(price) * 100), unit });
      onDone?.(id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save. Please retry.");
    } finally { setSaving(false); }
  }}>
    <p className="setup-message">{kind === "business" ? "First, enter your business name. You only need to do this once, then you can continue with this entry." : "Add a menu item to record its sales, food made, and stock."}</p>
    <label className="field-label" htmlFor="setup-name">{kind === "business" ? "Business name" : "Menu item name"}</label>
    <input id="setup-name" className="text-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus />
    {kind === "product" && <>
      <label className="field-label" htmlFor="setup-price">Selling price (KSh)</label>
      <input id="setup-price" className="text-input" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} required />
      <SearchableSelect label="Sold by" value={unit} onChange={(value) => setUnit(value as Product["unit"])} options={[
        { value: "item", label: "Item", category: "Everyday" }, { value: "piece", label: "Piece", category: "Everyday" }, { value: "portion", label: "Portion", category: "Everyday" }, { value: "plate", label: "Plate", category: "Everyday" }, { value: "cup", label: "Cup", category: "Everyday" }, { value: "bowl", label: "Bowl", category: "Everyday" }, { value: "skewer", label: "Skewer", category: "Everyday" },
        { value: "kg", label: "Per kg", category: "Weight" },
        { value: "bottle", label: "Bottle", category: "Drinks" }, { value: "can", label: "Can", category: "Drinks" }, { value: "glass", label: "Glass", category: "Drinks" }, { value: "litre", label: "Litre", category: "Drinks" }, { value: "ml", label: "Millilitre", category: "Drinks" },
        { value: "packet", label: "Packet", category: "Packaged" }, { value: "box", label: "Box", category: "Packaged" }, { value: "dozen", label: "Dozen", category: "Bulk" }, { value: "tray", label: "Tray", category: "Bulk" }
      ]} />
    </>}
    {error && <p role="alert" className="negative">{error}</p>}
    <button type="submit" className="primary-button" disabled={!valid || saving}>{saving ? "Saving…" : kind === "business" ? "Save business and continue" : "Save menu item"}</button>
    {onCancel && <button type="button" className="secondary-button setup-cancel" onClick={onCancel}>Cancel</button>}
  </form>;
}
