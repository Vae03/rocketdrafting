"use client";

import { useState } from "react";
import {
  ArenaBackdrop,
  CoinIcon,
  readStoredNumber,
  readOwned,
  readEquipped,
  COIN_STORAGE_KEY,
  XP_STORAGE_KEY,
} from "@/components/draft-shared";
import { levelFromXp } from "@/lib/simulation";
import { readStats } from "@/lib/stats";
import { computeBadgeProgress } from "@/lib/badges";
import { SHOP_ITEMS } from "@/components/shop";
import { AVATAR_COLORS, AVATAR_EMOJI } from "@/lib/avatar-options";
import { useTranslation } from "@/components/i18n-provider";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AuthGate, type AuthUser } from "@/components/auth-shared";

const MAX_AVATAR_DIMENSION = 256;
const MAX_UPLOAD_BYTES = 8_000_000; // pre-resize guard; the resized result ends up far smaller

/** Downscales an uploaded image to at most 256px on its longest side and re-encodes it as JPEG,
 * client-side, before it ever reaches the server -- keeps avatar payloads small and normalizes
 * the format regardless of what the user picked (HEIC screenshots, huge camera photos, etc.). */
function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Your browser can't process images")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function AvatarPicker({ user, onSaved }: { user: AuthUser; onSaved: (user: AuthUser) => void }) {
  const [name, setName] = useState(user.displayName);
  const [emoji, setEmoji] = useState(user.avatarEmoji);
  const [color, setColor] = useState(user.avatarColor);
  const [image, setImage] = useState<string | null>(user.avatarImage);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const dirty = name !== user.displayName || emoji !== user.avatarEmoji || color !== user.avatarColor || image !== user.avatarImage;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) { setUploadError("Please pick an image file"); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setUploadError("That file is too large (max 8MB)"); return; }
    setUploading(true);
    try {
      setImage(await resizeImageFile(file));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't process that image");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, avatarEmoji: emoji, avatarColor: color, avatarImage: image }),
      });
      const data = await res.json();
      if (res.ok) { onSaved(data); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800); }
      else setUploadError(data.error ?? "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  return <section className="avatar-editor">
    <div className="panel-title"><span>EDIT</span><b>YOUR CARD</b></div>
    <div className="avatar-editor-grid">
      <div className="avatar-preview-col">
        <Avatar user={{ avatarEmoji: emoji, avatarColor: color, avatarImage: image }} className="avatar-preview" />
        <label className="avatar-upload-button">{uploading ? "PROCESSING…" : "UPLOAD PHOTO"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} disabled={uploading} hidden /></label>
        {image && <button type="button" className="link-button" onClick={() => setImage(null)}>remove photo</button>}
        {uploadError && <small className="auth-hint">⚠ {uploadError}</small>}
      </div>
      <div className="avatar-fields">
        <label>DISPLAY NAME<input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} /></label>
        {!image && <>
          <div className="avatar-emoji-grid">{AVATAR_EMOJI.map((e) => <button type="button" key={e} className={e === emoji ? "avatar-emoji-option selected" : "avatar-emoji-option"} onClick={() => setEmoji(e)}>{e}</button>)}</div>
          <div className="avatar-color-grid">{AVATAR_COLORS.map((c) => <button type="button" key={c} className={c === color ? "avatar-color-option selected" : "avatar-color-option"} style={{ "--swatch": c } as React.CSSProperties} onClick={() => setColor(c)} />)}</div>
        </>}
        <button type="button" onClick={save} disabled={!dirty || saving} className="reroll-button">{saving ? "SAVING…" : savedFlash ? "✓ SAVED" : "SAVE CHANGES"}</button>
      </div>
    </div>
  </section>;
}

export function Profile() {
  const { t } = useTranslation();
  const { user: authUser, onAuthed, logout, updateUser } = useAuth();
  const [coins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [xp] = useState(() => readStoredNumber(XP_STORAGE_KEY));
  const [equipped] = useState(() => readEquipped());
  const [owned] = useState(() => readOwned());
  const [stats] = useState(() => readStats());

  const progress = levelFromXp(xp);
  const equippedTitle = SHOP_ITEMS.find((i) => i.id === equipped.title);
  const equippedBanner = SHOP_ITEMS.find((i) => i.id === equipped.profileBanner);
  const badgeProgress = computeBadgeProgress(stats, { xp, shopOwned: owned.size });
  const unlockedCount = badgeProgress.filter((b) => b.tier > 0).length;
  const goldCount = badgeProgress.filter((b) => b.tier === 3).length;

  return <main className="arena">
    <ArenaBackdrop />
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>{t("nav_profile")}</b></span></div>
      <div className="top-actions"><div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div></div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">{t("profile_kicker")}</p><h1>{t("profile_title1")}<br /><span>{t("profile_title2")}</span></h1></div>

      <section className="profile-card" style={equippedBanner ? { background: equippedBanner.preview } : undefined}>
        {authUser ? <Avatar user={authUser} className="profile-avatar" /> : <div className="profile-avatar">RL</div>}
        <div className="profile-meta">
          {equippedTitle && <span className="profile-title">&quot;{equippedTitle.preview}&quot;</span>}
          <div className="profile-level"><b>LEVEL {progress.level}</b><small>{xp} total XP</small></div>
        </div>
        <div className="profile-stat-grid">
          <div><b>{stats.campaignWins}</b><small>FREEPLAY WINS</small></div>
          <div><b>{stats.rankedWins}</b><small>RANKED WINS</small></div>
          <div><b>{stats.careerWins}</b><small>CAREER WINS</small></div>
          <div><b>{stats.peakPower || "—"}</b><small>PEAK POWER</small></div>
          <div><b>{stats.peakMmr || "—"}</b><small>PEAK MMR</small></div>
          <div><b>{unlockedCount}/{badgeProgress.length}</b><small>BADGES</small></div>
          <div><b>{goldCount}</b><small>GOLD BADGES</small></div>
        </div>
      </section>

      {authUser === undefined ? <p className="power-rule">Loading account…</p>
        : authUser === null ? <AuthGate onAuthed={onAuthed} />
        : <>
          <section className="account-bar">
            <Avatar user={authUser} className="friend-avatar account-avatar" />
            <div><b>{authUser.displayName}</b><small>{authUser.email}</small></div>
            <button className="link-button" onClick={logout}>sign out</button>
          </section>
          <AvatarPicker user={authUser} onSaved={updateUser} />
        </>}

      <section className="badges-section">
        <div className="panel-title"><span>CHALLENGES</span><b>BADGES — {unlockedCount} / {badgeProgress.length} UNLOCKED</b></div>
        <div className="badges-grid">
          {badgeProgress.map((b) => <div key={b.def.id} className={`badge-card tier-${b.tier}`}>
            <span className="badge-icon">{b.def.icon}</span>
            <b>{b.def.name}</b>
            <p>{b.def.description}</p>
            <div className="badge-pips">{[1, 2, 3].map((t) => <span key={t} className={t <= b.tier ? `pip pip-${t} filled` : "pip"} />)}</div>
            <small className="badge-progress-text">{b.tier === 3 ? "MAX TIER" : `${b.value} / ${b.nextThreshold}${b.tierName ? ` · ${b.tierName}` : ""}`}</small>
          </div>)}
        </div>
      </section>
    </section>
  </main>;
}
