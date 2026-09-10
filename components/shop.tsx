"use client";

import { useEffect, useState } from "react";
import {
  ArenaBackdrop,
  CoinIcon,
  readStoredNumber,
  readOwned,
  readEquipped,
  COIN_STORAGE_KEY,
  OWNED_KEY,
  EQUIPPED_KEY,
  type Equipped,
} from "@/components/draft-shared";
import { incrementStat } from "@/lib/stats";

type ShopItem = { id: string; kind: "theme" | "title" | "coin-skin"; name: string; blurb: string; price: number; preview: string };

export const SHOP_ITEMS: ShopItem[] = [
  { id: "theme-default", kind: "theme", name: "Vitality Violet", blurb: "The default arena glow.", price: 0, preview: "linear-gradient(135deg,#8557ff,#302075)" },
  { id: "theme-inferno", kind: "theme", name: "Inferno Orange", blurb: "Boost-flame arena lighting.", price: 40, preview: "linear-gradient(135deg,#ff7a3d,#7a1f0f)" },
  { id: "theme-aurora", kind: "theme", name: "Aurora Green", blurb: "Cool mint stadium lights.", price: 40, preview: "linear-gradient(135deg,#3dffb0,#0f3d2a)" },
  { id: "theme-blueprint", kind: "theme", name: "Blueprint Cyan", blurb: "Cold Octane blue arena.", price: 60, preview: "linear-gradient(135deg,#3dd8ff,#0f2a3d)" },
  { id: "theme-goldrush", kind: "theme", name: "Gold Rush", blurb: "All-gold champion lighting.", price: 90, preview: "linear-gradient(135deg,#ffd166,#5c3f00)" },
  { id: "theme-heatwave", kind: "theme", name: "Heatwave Pink", blurb: "Hot pink Dropshot-court glow.", price: 70, preview: "linear-gradient(135deg,#ff3fa4,#5c0f38)" },
  { id: "theme-hoops", kind: "theme", name: "Hoops Orange", blurb: "Basketball-court arena tint.", price: 55, preview: "linear-gradient(135deg,#ff9a3d,#5c2f0f)" },
  { id: "theme-neutron", kind: "theme", name: "Neutron Star", blurb: "Deep-space white-blue glow.", price: 100, preview: "linear-gradient(135deg,#dfefff,#1a2a4a)" },
  { id: "title-rookie", kind: "title", name: "\"Rookie\"", blurb: "A humble starting flair.", price: 0, preview: "Rookie" },
  { id: "title-clutch", kind: "title", name: "\"Clutch\"", blurb: "For the last-second saviours.", price: 25, preview: "Clutch" },
  { id: "title-demolisher", kind: "title", name: "\"Demolisher\"", blurb: "Boost first, ask questions later.", price: 35, preview: "Demolisher" },
  { id: "title-flip-reset-god", kind: "title", name: "\"Flip Reset God\"", blurb: "Aerial mechanics not included.", price: 60, preview: "Flip Reset God" },
  { id: "title-worlds-caller", kind: "title", name: "\"Worlds Caller\"", blurb: "Certified armchair analyst.", price: 80, preview: "Worlds Caller" },
  { id: "title-aerial-ace", kind: "title", name: "\"Aerial Ace\"", blurb: "Lives above the crossbar.", price: 45, preview: "Aerial Ace" },
  { id: "title-ceiling-shot-enjoyer", kind: "title", name: "\"Ceiling Shot Enjoyer\"", blurb: "Questionable decision-making, undeniable style.", price: 50, preview: "Ceiling Shot Enjoyer" },
  { id: "title-backboard-read", kind: "title", name: "\"Backboard Read\"", blurb: "Saw it coming from a mile away.", price: 55, preview: "Backboard Read" },
  { id: "title-mvp-contender", kind: "title", name: "\"MVP Contender\"", blurb: "Definitely, probably, maybe the best.", price: 90, preview: "MVP Contender" },
  { id: "title-zero-to-hundred", kind: "title", name: "\"0-100 Real Quick\"", blurb: "Supersonic in three seconds flat.", price: 65, preview: "0-100 Real Quick" },
  { id: "coin-classic", kind: "coin-skin", name: "Classic Gold", blurb: "The default hex coin.", price: 0, preview: "#ffcf49" },
  { id: "coin-frost", kind: "coin-skin", name: "Frost Coin", blurb: "Ice-cold currency.", price: 30, preview: "#8fe3ff" },
  { id: "coin-toxic", kind: "coin-skin", name: "Toxic Coin", blurb: "Radioactive boost pad energy.", price: 30, preview: "#b6ff4d" },
  { id: "coin-magma", kind: "coin-skin", name: "Magma Coin", blurb: "Straight from the boost furnace.", price: 45, preview: "#ff5a3d" },
  { id: "coin-royal", kind: "coin-skin", name: "Royal Coin", blurb: "For certified ladder royalty.", price: 75, preview: "#c79bff" },
];

export function Shop() {
  const [coins, setCoins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [owned, setOwned] = useState<Set<string>>(() => readOwned());
  const [equipped, setEquipped] = useState<Equipped>(() => readEquipped());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { try { window.localStorage.setItem(COIN_STORAGE_KEY, String(coins)); } catch { /* ignore */ } }, [coins]);
  useEffect(() => { try { window.localStorage.setItem(OWNED_KEY, JSON.stringify([...owned])); } catch { /* ignore */ } }, [owned]);
  useEffect(() => { try { window.localStorage.setItem(EQUIPPED_KEY, JSON.stringify(equipped)); } catch { /* ignore */ } }, [equipped]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2200); return () => window.clearTimeout(t); }, [toast]);

  function slotFor(kind: ShopItem["kind"]): keyof Equipped {
    return kind === "theme" ? "theme" : kind === "title" ? "title" : "coinSkin";
  }

  function buy(item: ShopItem) {
    if (owned.has(item.id) || coins < item.price) return;
    setCoins((c) => c - item.price);
    setOwned((prev) => new Set(prev).add(item.id));
    setEquipped((prev) => ({ ...prev, [slotFor(item.kind)]: item.id }));
    incrementStat("coinsSpent", item.price);
    setToast(`Unlocked "${item.name}"`);
  }

  function equip(item: ShopItem) {
    if (!owned.has(item.id)) return;
    setEquipped((prev) => ({ ...prev, [slotFor(item.kind)]: item.id }));
    setToast(`Equipped "${item.name}"`);
  }

  const groups: { kind: ShopItem["kind"]; label: string }[] = [
    { kind: "theme", label: "ARENA THEMES" },
    { kind: "title", label: "PROFILE TITLES" },
    { kind: "coin-skin", label: "COIN SKINS" },
  ];

  return <main className="arena">
    <ArenaBackdrop />
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>SHOP</b></span></div>
      <div className="top-actions"><div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div></div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">COSMETIC ONLY • NO GAMEPLAY EFFECT</p><h1>SPEND YOUR<br /><span>COINS.</span></h1><p className="intro">Everything here is pure flex — arena looks, profile titles, coin skins. Ratings and simulations never change.</p></div>
      {toast && <p className="shop-toast">{toast}</p>}
      {groups.map((group) => <section className="shop-group" key={group.kind}>
        <div className="panel-title"><span>SHOP</span><b>{group.label}</b></div>
        <div className="shop-grid">
          {SHOP_ITEMS.filter((i) => i.kind === group.kind).map((item) => {
            const isOwned = owned.has(item.id);
            const isEquipped = equipped[slotFor(item.kind)] === item.id;
            return <div key={item.id} className={`shop-item ${isEquipped ? "equipped" : ""}`}>
              {item.kind === "coin-skin" ? <span className="shop-preview-coin" style={{ background: item.preview }} /> : item.kind === "theme" ? <span className="shop-preview-theme" style={{ background: item.preview }} /> : <span className="shop-preview-title">{item.preview}</span>}
              <b>{item.name}</b>
              <p>{item.blurb}</p>
              {isEquipped ? <span className="shop-equipped-tag">EQUIPPED</span> : isOwned ? <button className="shop-buy-button" onClick={() => equip(item)}>EQUIP</button> : <button className="shop-buy-button" disabled={coins < item.price} onClick={() => buy(item)}><CoinIcon className="shop-coin-icon" />{item.price}</button>}
            </div>;
          })}
        </div>
      </section>)}
    </section>
  </main>;
}
