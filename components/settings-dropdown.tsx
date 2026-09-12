"use client";

import { useTranslation, LANGUAGES } from "@/components/i18n-provider";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AuthGate } from "@/components/auth-shared";

export function SettingsDropdown({ onClose, onOpenProfile }: { onClose: () => void; onOpenProfile: () => void }) {
  const { language, setLanguage, t } = useTranslation();
  const { user, onAuthed, logout } = useAuth();

  return <div className="nav-dropdown settings-dropdown">
    <div className="nav-dropdown-section">
      <small>{t("settings_language_label")}</small>
      <div className="language-grid compact">
        {LANGUAGES.map((lang) => <button key={lang.code} onClick={() => setLanguage(lang.code)} className={lang.code === language ? "language-option selected" : "language-option"}>
          <span className="language-flag">{lang.flag}</span><b>{lang.name}</b>
        </button>)}
      </div>
    </div>

    <div className="nav-dropdown-section">
      <small>ACCOUNT</small>
      {user === undefined ? <p className="power-rule">Loading…</p>
        : user === null ? <AuthGate compact onAuthed={(u) => { onAuthed(u); onClose(); }} />
        : <div className="nav-account-row">
          <Avatar user={user} className="friend-avatar" />
          <div><b>{user.displayName}</b><small>{user.email}</small></div>
        </div>}
      {user && <div className="nav-dropdown-actions">
        <button className="link-button" onClick={() => { onOpenProfile(); onClose(); }}>manage profile</button>
        <button className="link-button" onClick={logout}>sign out</button>
      </div>}
    </div>
  </div>;
}
