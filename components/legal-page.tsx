import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="arena legal-arena">
    <div className="arena-noise" />
    <header className="topbar">
      <Link href="/" className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>DRAFT ARENA</b></span></Link>
      <Link href="/" className="link-button">← back to the app</Link>
    </header>
    <section className="stage legal-stage">
      <h1>{title}</h1>
      <div className="legal-content">{children}</div>
    </section>
  </main>;
}
