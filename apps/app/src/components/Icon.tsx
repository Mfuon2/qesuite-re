import type { ReactNode, SVGProps } from "react";

type IconName =
  | "cutlery" | "register" | "pot" | "cart" | "chart" | "coins" | "user"
  | "plus"
  | "receipt"
  | "basket"
  | "wallet"
  | "chef"
  | "arrow-up"
  | "home"
  | "history"
  | "more"
  | "chevron"
  | "close"
  | "minus"
  | "wifi"
  | "settings";

const paths: Record<IconName, ReactNode> = {
  cutlery: <><path d="M3 2v6a3 3 0 0 0 6 0V2M6 2v20M18 2c-4 3-5 8-3 11h3V2Zm0 11v9" strokeWidth="2.8" /></>,
  register: <><path d="M4 11h16l2 10H2l2-10Z" fill="currentColor" stroke="none" /><path d="M7 11V7h10v4M10 3h5" strokeWidth="2.5" /><path d="M6 17h2m3 0h2m3 0h2M6 14h.1m5 0h.1m5 0h.1" stroke="var(--tile-color, #52a64e)" /></>,
  pot: <><path d="M3 11h18M5 13h14v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6ZM4 8a8 6 0 0 1 16 0H4Z" fill="currentColor" /><path d="M12 2v2m6-1 2-2" strokeWidth="2.5" /></>,
  cart: <><path d="M2 3h3l3 13h11l3-10H6" fill="currentColor" /><circle cx="9" cy="21" r="2" fill="currentColor" stroke="none" /><circle cx="18" cy="21" r="2" fill="currentColor" stroke="none" /></>,
  chart: <><rect x="3" y="13" width="4" height="9" rx="1.5" fill="currentColor" stroke="none" /><rect x="10" y="8" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" /><rect x="17" y="2" width="4" height="20" rx="1.5" fill="currentColor" stroke="none" /></>,
  coins: <><ellipse cx="11" cy="5" rx="8" ry="3" fill="currentColor" /><path d="M3 9c0 4 16 4 16 0M3 14c0 4 16 4 16 0M3 19c0 4 16 4 16 0M3 5v14M19 5v14" strokeWidth="2.5" /></>,
  user: <><circle cx="12" cy="6" r="4" fill="currentColor" stroke="none" /><path d="M3 22v-3a9 7 0 0 1 18 0v3Z" fill="currentColor" stroke="none" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  receipt: <><path d="M5 2h10l5 5v15l-3-2-3 2-3-2-3 2-3-2V2Z" fill="currentColor" stroke="none" /><path d="M9 8h4M9 12h7M9 16h5" stroke="white" strokeWidth="1.7" /></>,
  basket: <path d="m5 10 2 9h10l2-9M8 10l4-6 4 6M4 10h16" />,
  wallet: <><path d="m4 5 13-3v4M4 6h15v15H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="currentColor" /><path d="M7 6h10" stroke="white" /><circle cx="17" cy="14" r="1.2" fill="white" stroke="none" /></>,
  chef: <path d="M8 14h8v6H8v-6Zm0 0a4 4 0 0 1-1-7.87A5 5 0 0 1 16.9 7 3.5 3.5 0 0 1 16 14" />,
  "arrow-up": <><path d="M4 12h5v4a3 3 0 0 0 6 0v-4h5v9H4Z" fill="currentColor" stroke="none" /><path d="M12 15V2m-5 5 5-5 5 5" strokeWidth="2.5" /></>,
  home: <path d="m2 11 10-9 10 9h-3v11h-5v-7h-4v7H5V11Z" fill="currentColor" stroke="none" />,
  history: <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68V4m8 4v5l3 2" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  minus: <path d="M5 12h14" />,
  wifi: <path d="M5 9a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 15a2 2 0 0 1 2 0M12 19h.01" />,
  settings: <path fill="currentColor" stroke="none" fillRule="evenodd" d="m10 1-1 3-2 1-3-1-2 3 2 2v3l-2 2 2 4 3-1 2 1 1 3h4l1-3 2-1 3 1 2-4-2-2V9l2-2-2-3-3 1-2-1-1-3h-4Zm2 6a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
