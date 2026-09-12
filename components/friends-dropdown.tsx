"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Avatar, type PublicUser } from "@/components/auth-shared";

type FriendRow = { friendshipId: string; user: PublicUser };

export function FriendsDropdown({ onClose, onBattle }: { onClose: () => void; onBattle: (friend: { id: string; displayName: string }) => void }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    fetch("/api/friends").then((r) => r.json()).then((data) => {
      setFriends(data.friends ?? []); setIncoming(data.incoming ?? []); setOutgoing(data.outgoing ?? []);
    });
  }
  useEffect(() => { if (user) refresh(); }, [user]);

  useEffect(() => {
    const trimmed = query.trim();
    const handle = setTimeout(() => {
      if (trimmed.length < 2) { setResults([]); return; }
      fetch(`/api/friends/search?q=${encodeURIComponent(trimmed)}`).then((r) => r.json()).then((data) => setResults(data.results ?? []));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function sendRequest(targetUserId: string) {
    const res = await fetch("/api/friends/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId }) });
    const data = await res.json();
    setNotice(res.ok ? (data.status === "ACCEPTED" ? "You're now friends!" : "Friend request sent") : data.error);
    if (res.ok) { setQuery(""); setResults([]); refresh(); }
  }

  async function respond(friendshipId: string, accept: boolean) {
    await fetch("/api/friends/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendshipId, accept }) });
    refresh();
  }

  async function remove(friendshipId: string) {
    await fetch("/api/friends/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendshipId }) });
    refresh();
  }

  if (user === undefined) return <div className="nav-dropdown friends-dropdown"><p className="power-rule">Loading…</p></div>;
  if (user === null) return <div className="nav-dropdown friends-dropdown">
    <p className="power-rule">Sign in (⚙ menu) to add friends and start friendly battles.</p>
  </div>;

  return <div className="nav-dropdown friends-dropdown">
    <div className="friend-search">
      <input placeholder="Search by display name…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      {notice && <small className="friend-notice">{notice}</small>}
      {results.length > 0 && <div className="friend-search-results">
        {results.map((u) => <div key={u.id} className="friend-row">
          <Avatar user={u} className="friend-avatar" />
          <b>{u.displayName}</b>
          <button className="link-button" onClick={() => sendRequest(u.id)}>+ add friend</button>
        </div>)}
      </div>}
    </div>

    {incoming.length > 0 && <div className="friend-group">
      <small>INCOMING REQUESTS</small>
      {incoming.map((f) => <div key={f.friendshipId} className="friend-row">
        <Avatar user={f.user} className="friend-avatar" />
        <b>{f.user.displayName}</b>
        <button className="link-button" onClick={() => respond(f.friendshipId, true)}>accept</button>
        <button className="link-button" onClick={() => respond(f.friendshipId, false)}>decline</button>
      </div>)}
    </div>}

    {outgoing.length > 0 && <div className="friend-group">
      <small>PENDING</small>
      {outgoing.map((f) => <div key={f.friendshipId} className="friend-row">
        <Avatar user={f.user} className="friend-avatar" />
        <b>{f.user.displayName}</b>
        <button className="link-button" onClick={() => remove(f.friendshipId)}>cancel</button>
      </div>)}
    </div>}

    <div className="friend-group">
      <small>FRIENDS — {friends.length}</small>
      {friends.length === 0 && <p className="power-rule">No friends yet — search above to add some.</p>}
      {friends.map((f) => <div key={f.friendshipId} className="friend-row">
        <Avatar user={f.user} className="friend-avatar" />
        <b>{f.user.displayName}</b>
        <button className="link-button" onClick={() => { onBattle(f.user); onClose(); }}>⚔ battle</button>
        <button className="link-button" onClick={() => remove(f.friendshipId)}>remove</button>
      </div>)}
    </div>
  </div>;
}
