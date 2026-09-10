"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// All modes read localStorage for their initial state (coins/xp/cosmetics/player key/stats),
// which doesn't exist during server rendering -- ssr:false avoids the inevitable hydration
// mismatch instead of fighting it with placeholder states.
const DraftArena = dynamic(() => import("@/components/draft-arena").then((m) => m.DraftArena), { ssr: false });
const OnlineDuel = dynamic(() => import("@/components/online-duel").then((m) => m.OnlineDuel), { ssr: false });
const Shop = dynamic(() => import("@/components/shop").then((m) => m.Shop), { ssr: false });
const Profile = dynamic(() => import("@/components/profile").then((m) => m.Profile), { ssr: false });

type Mode = "campaign" | "ranked" | "shop" | "profile";

export function AppShell() {
  const [mode, setMode] = useState<Mode>("campaign");

  return <>
    <nav className="mode-nav">
      <button className={mode === "campaign" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("campaign")}>🏆 CAMPAIGN</button>
      <button className={mode === "ranked" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("ranked")}>⚔ RANKED 1v1</button>
      <button className={mode === "shop" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("shop")}>🛒 SHOP</button>
      <button className={mode === "profile" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("profile")}>🪪 PROFILE</button>
    </nav>
    {mode === "campaign" && <DraftArena />}
    {mode === "ranked" && <OnlineDuel />}
    {mode === "shop" && <Shop />}
    {mode === "profile" && <Profile />}
  </>;
}
