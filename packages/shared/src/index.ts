export type BusinessEventType =
  | "sale"
  | "expense"
  | "stock_purchase"
  | "top_up"
  | "withdrawal"
  | "production"
  | "stock_count";

export type SyncState = "pending" | "synced" | "failed";

export interface BusinessEvent {
  id: string;
  businessId: string;
  deviceId: string;
  type: BusinessEventType;
  itemId?: string;
  itemName?: string;
  quantity?: number;
  amount?: number;
  note?: string;
  occurredAt: string;
  /** Authoritative calendar date in the Nairobi business timezone (YYYY-MM-DD). */
  businessDate?: string;
  createdAt: string;
  syncState: SyncState;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: "piece" | "plate" | "cup" | "portion" | "item" | "kg" | "bottle" | "can" | "glass" | "litre" | "ml" | "packet" | "box" | "dozen" | "tray" | "bowl" | "skewer";
  category: string;
  active: boolean;
}

export interface DashboardSummary {
  sales: number;
  expenses: number;
  topUps: number;
  withdrawals: number;
  estimatedProfit: number;
  cash: number;
}

export interface BusinessProfile {
  id: string;
  name: string;
  tagline: string;
}
