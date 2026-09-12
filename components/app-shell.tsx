"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider, useTranslation } from "@/components/i18n-provider";
import { AuthProvider } from "@/components/auth-provider";
import { SettingsDropdown } from "@/components/settings-dropdown";
import { FriendsDropdown } from "@/components/friends-dropdown";

// All modes read localStorage for their initial state (coins/xp/cosmetics/player key/stats),
// which doesn't exist during server rendering -- ssr:false avoids the inevitable hydration
// mismatch instead of fighting it with placeholder states.
const DraftArena = dynamic(() => import("@/components/draft-arena").then((m) => m.DraftArena), { ssr: false });
const CareerArena = dynamic(() => import("@/components/career-arena").then((m) => m.CareerArena), { ssr: false });
const OnlineDuel = dynamic(() => import("@/components/online-duel").then((m) => m.OnlineDuel), { ssr: false });
const Shop = dynamic(() => import("@/components/shop").then((m) => m.Shop), { ssr: false });
const Profile = dynamic(() => import("@/components/profile").then((m) => m.Profile), { ssr: false });
const FriendlyDuel = dynamic(() => import("@/components/friendly-duel").then((m) => m.FriendlyDuel), { ssr: false });

type Mode = "campaign" | "career" | "ranked" | "shop" | "profile";
type BattleFriend = { id: string; displayName: string };

function useCloseOnOutsideClick(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);
  return ref;
}

function ModeNav({ mode, setMode, onBattle }: { mode: Mode; setMode: (m: Mode) => void; onBattle: (friend: BattleFriend) => void }) {
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = useState<"settings" | "friends" | null>(null);
  const close = () => setOpenMenu(null);
  const settingsRef = useCloseOnOutsideClick(openMenu === "settings", close);
  const friendsRef = useCloseOnOutsideClick(openMenu === "friends", close);

  return <nav className="mode-nav">
    <div className="mode-nav-tabs">
      <button className={mode === "campaign" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("campaign")}>🏆 {t("nav_freeplay")}</button>
      <button className={mode === "career" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("career")}>🪜 {t("nav_career")}</button>
      <button className={mode === "ranked" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("ranked")}>⚔ {t("nav_ranked")}</button>
      <button className={mode === "shop" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("shop")}>🛒 {t("nav_shop")}</button>
      <button className={mode === "profile" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("profile")}>🪪 {t("nav_profile")}</button>
    </div>
    <div className="mode-nav-utils">
      <div className="nav-dropdown-wrap" ref={friendsRef}>
        <button className={openMenu === "friends" ? "nav-icon-button active" : "nav-icon-button"} onClick={() => setOpenMenu((m) => (m === "friends" ? null : "friends"))} title="Friends">👥</button>
        {openMenu === "friends" && <FriendsDropdown onClose={close} onBattle={onBattle} />}
      </div>
      <div className="nav-dropdown-wrap" ref={settingsRef}>
        <button className={openMenu === "settings" ? "nav-icon-button active" : "nav-icon-button"} onClick={() => setOpenMenu((m) => (m === "settings" ? null : "settings"))} title={t("nav_settings")}>⚙</button>
        {openMenu === "settings" && <SettingsDropdown onClose={close} onOpenProfile={() => setMode("profile")} />}
      </div>
    </div>
  </nav>;
}

export function AppShell() {
  const [mode, setMode] = useState<Mode>("campaign");
  const [battleFriend, setBattleFriend] = useState<BattleFriend | null>(null);

  return <LanguageProvider><AuthProvider>
    <ModeNav mode={mode} setMode={setMode} onBattle={setBattleFriend} />
    {battleFriend ? <FriendlyDuel friend={battleFriend} onExit={() => setBattleFriend(null)} /> : <>
      {mode === "campaign" && <DraftArena />}
      {mode === "career" && <CareerArena />}
      {mode === "ranked" && <OnlineDuel />}
      {mode === "shop" && <Shop />}
      {mode === "profile" && <Profile />}
    </>}
    <SiteFooter />
  </AuthProvider></LanguageProvider>;
}
