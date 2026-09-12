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
  writeStoredValue,
  type Equipped,
} from "@/components/draft-shared";
import { incrementStat } from "@/lib/stats";
import { useTranslation } from "@/components/i18n-provider";

type ShopKind = "theme" | "title" | "coin-skin" | "frame" | "banner" | "fx" | "profile-banner" | "badge-shape";
type ShopItem = { id: string; kind: ShopKind; name: string; blurb: string; price: number; preview: string };

export const SHOP_ITEMS: ShopItem[] = [
  // Arena themes
  { id: "theme-default", kind: "theme", name: "Vitality Violet", blurb: "The default arena glow.", price: 0, preview: "linear-gradient(135deg,#8557ff,#302075)" },
  { id: "theme-inferno", kind: "theme", name: "Inferno Orange", blurb: "Boost-flame arena lighting.", price: 120, preview: "linear-gradient(135deg,#ff7a3d,#7a1f0f)" },
  { id: "theme-aurora", kind: "theme", name: "Aurora Green", blurb: "Cool mint stadium lights.", price: 120, preview: "linear-gradient(135deg,#3dffb0,#0f3d2a)" },
  { id: "theme-blueprint", kind: "theme", name: "Blueprint Cyan", blurb: "Cold Octane blue arena.", price: 180, preview: "linear-gradient(135deg,#3dd8ff,#0f2a3d)" },
  { id: "theme-goldrush", kind: "theme", name: "Gold Rush", blurb: "All-gold champion lighting.", price: 260, preview: "linear-gradient(135deg,#ffd166,#5c3f00)" },
  { id: "theme-heatwave", kind: "theme", name: "Heatwave Pink", blurb: "Hot pink Dropshot-court glow.", price: 200, preview: "linear-gradient(135deg,#ff3fa4,#5c0f38)" },
  { id: "theme-hoops", kind: "theme", name: "Hoops Orange", blurb: "Basketball-court arena tint.", price: 160, preview: "linear-gradient(135deg,#ff9a3d,#5c2f0f)" },
  { id: "theme-neutron", kind: "theme", name: "Neutron Star", blurb: "Deep-space white-blue glow.", price: 300, preview: "linear-gradient(135deg,#dfefff,#1a2a4a)" },
  // Profile titles
  { id: "title-rookie", kind: "title", name: "\"Rookie\"", blurb: "A humble starting flair.", price: 0, preview: "Rookie" },
  { id: "title-clutch", kind: "title", name: "\"Clutch\"", blurb: "For the last-second saviours.", price: 75, preview: "Clutch" },
  { id: "title-demolisher", kind: "title", name: "\"Demolisher\"", blurb: "Boost first, ask questions later.", price: 100, preview: "Demolisher" },
  { id: "title-flip-reset-god", kind: "title", name: "\"Flip Reset God\"", blurb: "Aerial mechanics not included.", price: 180, preview: "Flip Reset God" },
  { id: "title-worlds-caller", kind: "title", name: "\"Worlds Caller\"", blurb: "Certified armchair analyst.", price: 240, preview: "Worlds Caller" },
  { id: "title-aerial-ace", kind: "title", name: "\"Aerial Ace\"", blurb: "Lives above the crossbar.", price: 130, preview: "Aerial Ace" },
  { id: "title-ceiling-shot-enjoyer", kind: "title", name: "\"Ceiling Shot Enjoyer\"", blurb: "Questionable decision-making, undeniable style.", price: 150, preview: "Ceiling Shot Enjoyer" },
  { id: "title-backboard-read", kind: "title", name: "\"Backboard Read\"", blurb: "Saw it coming from a mile away.", price: 160, preview: "Backboard Read" },
  { id: "title-mvp-contender", kind: "title", name: "\"MVP Contender\"", blurb: "Definitely, probably, maybe the best.", price: 260, preview: "MVP Contender" },
  { id: "title-zero-to-hundred", kind: "title", name: "\"0-100 Real Quick\"", blurb: "Supersonic in three seconds flat.", price: 190, preview: "0-100 Real Quick" },
  // Coin skins
  { id: "coin-classic", kind: "coin-skin", name: "Classic Gold", blurb: "The default hex coin.", price: 0, preview: "#ffcf49" },
  { id: "coin-frost", kind: "coin-skin", name: "Frost Coin", blurb: "Ice-cold currency.", price: 90, preview: "#8fe3ff" },
  { id: "coin-toxic", kind: "coin-skin", name: "Toxic Coin", blurb: "Radioactive boost pad energy.", price: 90, preview: "#b6ff4d" },
  { id: "coin-magma", kind: "coin-skin", name: "Magma Coin", blurb: "Straight from the boost furnace.", price: 130, preview: "#ff5a3d" },
  { id: "coin-royal", kind: "coin-skin", name: "Royal Coin", blurb: "For certified ladder royalty.", price: 220, preview: "#c79bff" },
  // Card frames
  { id: "frame-default", kind: "frame", name: "Standard Frame", blurb: "The default card border.", price: 0, preview: "#ffffff20" },
  { id: "frame-neon", kind: "frame", name: "Neon Frame", blurb: "Glowing cyan card border.", price: 150, preview: "#4dfaff" },
  { id: "frame-carbon", kind: "frame", name: "Carbon Frame", blurb: "Matte black, deep shadow.", price: 150, preview: "#3a3a44" },
  { id: "frame-chrome", kind: "frame", name: "Chrome Frame", blurb: "Polished silver shine.", price: 200, preview: "#e5e5e5" },
  { id: "frame-royal", kind: "frame", name: "Royal Frame", blurb: "Purple prestige border.", price: 280, preview: "#c79bff" },
  // Victory banners (Champion overlay style)
  { id: "banner-default", kind: "banner", name: "Classic Gold Banner", blurb: "The default champion text.", price: 0, preview: "linear-gradient(90deg,#ffcf49,#fff)" },
  { id: "banner-electric", kind: "banner", name: "Electric Banner", blurb: "Animated cyan/violet shine.", price: 200, preview: "linear-gradient(90deg,#4dfaff,#9a6cff)" },
  { id: "banner-inferno", kind: "banner", name: "Inferno Banner", blurb: "Burning orange victory text.", price: 200, preview: "linear-gradient(90deg,#ff7a3d,#ff3d3d)" },
  { id: "banner-royal", kind: "banner", name: "Royal Banner", blurb: "Regal purple victory text.", price: 260, preview: "linear-gradient(90deg,#c79bff,#8a5cff)" },
  // Level-up FX palettes
  { id: "fx-default", kind: "fx", name: "Golden Sparks", blurb: "The default level-up particles.", price: 0, preview: "linear-gradient(135deg,#ffcf49,#fff3c4)" },
  { id: "fx-inferno", kind: "fx", name: "Inferno Sparks", blurb: "Red-hot level-up particles.", price: 170, preview: "linear-gradient(135deg,#ff5a3d,#ffb700)" },
  { id: "fx-aurora", kind: "fx", name: "Aurora Sparks", blurb: "Green-teal level-up particles.", price: 170, preview: "linear-gradient(135deg,#3dffb0,#8fe3ff)" },
  // Profile banners
  { id: "pbanner-default", kind: "profile-banner", name: "Standard Banner", blurb: "The default profile card backdrop.", price: 0, preview: "linear-gradient(120deg,#2a1d4a,#14101f)" },
  { id: "pbanner-champion", kind: "profile-banner", name: "Champion Gold", blurb: "Gold-trimmed profile backdrop.", price: 220, preview: "linear-gradient(120deg,#5c4a1a,#2a1d0f)" },
  { id: "pbanner-frost", kind: "profile-banner", name: "Frost Banner", blurb: "Icy blue profile backdrop.", price: 220, preview: "linear-gradient(120deg,#123a5c,#0f1a2a)" },
  { id: "pbanner-toxic", kind: "profile-banner", name: "Toxic Banner", blurb: "Radioactive green profile backdrop.", price: 220, preview: "linear-gradient(120deg,#2a5c1a,#0f2a0f)" },
  // Team badge shapes
  { id: "shape-hex", kind: "badge-shape", name: "Hex Badge", blurb: "The default hexagon shape.", price: 0, preview: "hex" },
  { id: "shape-circle", kind: "badge-shape", name: "Circle Badge", blurb: "Round team badges.", price: 80, preview: "circle" },
  { id: "shape-shield", kind: "badge-shape", name: "Shield Badge", blurb: "Shield-shaped team badges.", price: 80, preview: "shield" },
];

const SLOT_FOR: Record<ShopKind, keyof Equipped> = {
  theme: "theme", title: "title", "coin-skin": "coinSkin", frame: "frame",
  banner: "banner", fx: "fx", "profile-banner": "profileBanner", "badge-shape": "badgeShape",
};

export function Shop() {
  const { t } = useTranslation();
  const [coins, setCoins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [owned, setOwned] = useState<Set<string>>(() => readOwned());
  const [equipped, setEquipped] = useState<Equipped>(() => readEquipped());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { writeStoredValue(COIN_STORAGE_KEY, String(coins)); }, [coins]);
  useEffect(() => { writeStoredValue(OWNED_KEY, JSON.stringify([...owned])); }, [owned]);
  useEffect(() => { writeStoredValue(EQUIPPED_KEY, JSON.stringify(equipped)); }, [equipped]);
  useEffect(() => { document.documentElement.setAttribute("data-theme", equipped.theme); document.documentElement.setAttribute("data-frame", equipped.frame); document.documentElement.setAttribute("data-badge-shape", equipped.badgeShape); }, [equipped.theme, equipped.frame, equipped.badgeShape]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2200); return () => window.clearTimeout(t); }, [toast]);

  function buy(item: ShopItem) {
    if (owned.has(item.id) || coins < item.price) return;
    setCoins((c) => c - item.price);
    setOwned((prev) => new Set(prev).add(item.id));
    setEquipped((prev) => ({ ...prev, [SLOT_FOR[item.kind]]: item.id }));
    incrementStat("coinsSpent", item.price);
    setToast(`Unlocked "${item.name}"`);
  }

  function equip(item: ShopItem) {
    if (!owned.has(item.id)) return;
    setEquipped((prev) => ({ ...prev, [SLOT_FOR[item.kind]]: item.id }));
    setToast(`Equipped "${item.name}"`);
  }

  const groups: { kind: ShopKind; label: string }[] = [
    { kind: "theme", label: "ARENA THEMES" },
    { kind: "title", label: "PROFILE TITLES" },
    { kind: "coin-skin", label: "COIN SKINS" },
    { kind: "frame", label: "CARD FRAMES" },
    { kind: "banner", label: "VICTORY BANNERS" },
    { kind: "fx", label: "LEVEL-UP FX" },
    { kind: "profile-banner", label: "PROFILE BANNERS" },
    { kind: "badge-shape", label: "TEAM BADGE SHAPES" },
  ];

  return <main className="arena">
    <ArenaBackdrop />
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>{t("nav_shop")}</b></span></div>
      <div className="top-actions"><div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div></div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">{t("shop_kicker")}</p><h1>{t("shop_title1")}<br /><span>{t("shop_title2")}</span></h1><p className="intro">{t("shop_intro")}</p></div>
      {toast && <p className="shop-toast">{toast}</p>}
      {groups.map((group) => <section className="shop-group" key={group.kind}>
        <div className="panel-title"><span>SHOP</span><b>{group.label}</b></div>
        <div className="shop-grid">
          {SHOP_ITEMS.filter((i) => i.kind === group.kind).map((item) => {
            const isOwned = owned.has(item.id);
            const isEquipped = equipped[SLOT_FOR[item.kind]] === item.id;
            const previewEl = item.kind === "coin-skin" ? <span className="shop-preview-coin" style={{ background: item.preview }} />
              : item.kind === "badge-shape" ? <span className={`shop-preview-badge shape-${item.preview}`} />
              : item.kind === "title" ? <span className="shop-preview-title">{item.preview}</span>
              : <span className="shop-preview-theme" style={{ background: item.preview }} />;
            return <div key={item.id} className={`shop-item ${isEquipped ? "equipped" : ""}`}>
              {previewEl}
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
