// Unicode "flag" emoji (regional indicator pairs like U+1F1FA U+1F1F8 for US) depend entirely on
// the OS having a color-emoji font that maps them to a flag glyph. Windows historically doesn't --
// Chrome/Edge on Windows render the two letters as plain text instead of a flag, which is exactly
// why the flags added earlier this session were invisible on Windows. These are small hand-drawn
// SVGs instead: no font dependency, no hotlinked image, renders identically everywhere.
type FlagSpec =
  | { type: "h"; colors: string[] } // horizontal stripes, top to bottom
  | { type: "v"; colors: string[] } // vertical stripes, left to right
  | { type: "nordic"; bg: string; cross: string } // off-center cross (Scandinavian flags)
  | { type: "cross"; bg: string; cross: string } // centered cross (Switzerland)
  | { type: "saltire"; bg: string; cross: string } // diagonal cross (Scotland)
  | { type: "circle"; bg: string; circle: string } // centered disc (Japan)
  | { type: "canton"; bg: string } // dark field with a small crossed canton (Australia/NZ, simplified)
  | { type: "usa" }
  | { type: "solid"; color: string };

const FLAGS: Record<string, FlagSpec> = {
  US: { type: "usa" },
  GB: { type: "saltire", bg: "#00247d", cross: "#fff" },
  "GB-ENG": { type: "cross", bg: "#fff", cross: "#ce1124" },
  "GB-SCT": { type: "saltire", bg: "#005eb8", cross: "#fff" },
  "GB-WLS": { type: "h", colors: ["#ffffff", "#00b140"] },
  CA: { type: "v", colors: ["#d80621", "#ffffff", "#d80621"] },
  MX: { type: "v", colors: ["#006847", "#ffffff", "#ce1126"] },
  BR: { type: "solid", color: "#009c3b" },
  AR: { type: "h", colors: ["#74acdf", "#ffffff", "#74acdf"] },
  CL: { type: "h", colors: ["#ffffff", "#d52b1e"] },
  CO: { type: "h", colors: ["#fcd116", "#003893", "#ce1126"] },
  PE: { type: "v", colors: ["#d91023", "#ffffff", "#d91023"] },
  UY: { type: "h", colors: ["#ffffff", "#0038a8"] },
  FR: { type: "v", colors: ["#0055a4", "#ffffff", "#ef4135"] },
  DE: { type: "h", colors: ["#000000", "#dd0000", "#ffce00"] },
  ES: { type: "h", colors: ["#aa151b", "#f1bf00", "#aa151b"] },
  IT: { type: "v", colors: ["#009246", "#ffffff", "#ce2b37"] },
  PT: { type: "v", colors: ["#046a38", "#da020e"] },
  NL: { type: "h", colors: ["#ae1c28", "#ffffff", "#21468b"] },
  BE: { type: "v", colors: ["#000000", "#fdda24", "#ef3340"] },
  CH: { type: "cross", bg: "#d52b1e", cross: "#fff" },
  AT: { type: "h", colors: ["#ed2939", "#ffffff", "#ed2939"] },
  SE: { type: "nordic", bg: "#006aa7", cross: "#fecc02" },
  NO: { type: "nordic", bg: "#ba0c2f", cross: "#00205b" },
  DK: { type: "nordic", bg: "#c60c30", cross: "#fff" },
  FI: { type: "nordic", bg: "#fff", cross: "#003580" },
  IS: { type: "nordic", bg: "#02529c", cross: "#dc1e35" },
  IE: { type: "v", colors: ["#169b62", "#ffffff", "#ff883e"] },
  PL: { type: "h", colors: ["#ffffff", "#dc143c"] },
  RU: { type: "h", colors: ["#ffffff", "#0039a6", "#d52b1e"] },
  UA: { type: "h", colors: ["#005bbb", "#ffd500"] },
  LT: { type: "h", colors: ["#fdb913", "#006a44", "#c1272d"] },
  MA: { type: "solid", color: "#c1272d" },
  ZA: { type: "h", colors: ["#007a4d", "#ffb612", "#000000"] },
  SA: { type: "solid", color: "#006c35" },
  JP: { type: "circle", bg: "#fff", circle: "#bc002d" },
  ID: { type: "h", colors: ["#ce1126", "#ffffff"] },
  MY: { type: "h", colors: ["#010066", "#ffffff", "#cc0001"] },
  SG: { type: "h", colors: ["#ed2939", "#ffffff"] },
  TH: { type: "h", colors: ["#a51931", "#f4f5f8", "#2d2a4a", "#f4f5f8", "#a51931"] },
  KW: { type: "h", colors: ["#007a3d", "#ffffff", "#ce1126"] },
  AU: { type: "canton", bg: "#00247d" },
  NZ: { type: "canton", bg: "#00247d" },
  PR: { type: "h", colors: ["#ed3126", "#ffffff", "#ed3126", "#ffffff", "#ed3126"] },
  RE: { type: "v", colors: ["#0055a4", "#ffffff", "#ef4135"] },
};

export const HAS_FLAG_ICON = (iso: string) => iso in FLAGS;

function StripedFlag({ colors, vertical }: { colors: string[]; vertical: boolean }) {
  const size = 100 / colors.length;
  return <>{colors.map((c, i) => <rect key={i} x={vertical ? `${i * size}` : 0} y={vertical ? 0 : `${i * size}`} width={vertical ? `${size}` : 100} height={vertical ? 100 : `${size}`} fill={c} />)}</>;
}

export function FlagIcon({ iso, className }: { iso: string; className?: string }) {
  const spec = FLAGS[iso];
  if (!spec) return <svg viewBox="0 0 30 20" className={className} aria-hidden="true"><rect width="30" height="20" fill="#4a4b5c" /></svg>;

  return <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
    <clipPath id={`flagclip-${iso}`}><rect width="30" height="20" /></clipPath>
    <g clipPath={`url(#flagclip-${iso})`}>
      <svg viewBox="0 0 100 100" width="30" height="20" preserveAspectRatio="none">
        {spec.type === "h" && <StripedFlag colors={spec.colors} vertical={false} />}
        {spec.type === "v" && <StripedFlag colors={spec.colors} vertical={true} />}
        {spec.type === "solid" && <rect width="100" height="100" fill={spec.color} />}
        {spec.type === "cross" && <>
          <rect width="100" height="100" fill={spec.bg} />
          <rect x="40" width="20" height="100" fill={spec.cross} />
          <rect y="40" width="100" height="20" fill={spec.cross} />
        </>}
        {spec.type === "nordic" && <>
          <rect width="100" height="100" fill={spec.bg} />
          <rect x="32" width="16" height="100" fill={spec.cross} />
          <rect y="40" width="100" height="20" fill={spec.cross} />
        </>}
        {spec.type === "saltire" && <>
          <rect width="100" height="100" fill={spec.bg} />
          <polygon points="0,0 14,0 100,86 100,100 86,100 0,14" fill={spec.cross} />
          <polygon points="86,0 100,0 100,14 14,100 0,100 0,86" fill={spec.cross} />
        </>}
        {spec.type === "circle" && <>
          <rect width="100" height="100" fill={spec.bg} />
          <circle cx="50" cy="50" r="26" fill={spec.circle} />
        </>}
        {spec.type === "canton" && <>
          <rect width="100" height="100" fill={spec.bg} />
          <rect width="50" height="34" fill="#00247d" />
          <polygon points="0,0 7,0 50,26 50,34 43,34 0,8" fill="#fff" />
          <polygon points="43,0 50,0 50,8 7,34 0,34 0,26" fill="#fff" />
          <rect x="20" width="10" height="34" fill="#fff" />
          <rect y="12" width="50" height="10" fill="#fff" />
          <rect x="22" width="6" height="34" fill="#cf142b" />
          <rect y="14" width="50" height="6" fill="#cf142b" />
          <circle cx="76" cy="66" r="5" fill="#fff" />
          <circle cx="90" cy="30" r="4" fill="#fff" />
          <circle cx="70" cy="20" r="3" fill="#fff" />
          <circle cx="92" cy="80" r="4" fill="#fff" />
        </>}
        {spec.type === "usa" && <>
          <rect width="100" height="100" fill="#b22234" />
          {[1, 3, 5, 7, 9, 11].map((i) => <rect key={i} y={`${(i - 1) * (100 / 13)}`} width="100" height={`${100 / 13}`} fill="#fff" />)}
          <rect width="46" height="54" fill="#3c3b6e" />
          {[10, 23, 36].flatMap((cx) => [10, 27, 44].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#fff" />))}
        </>}
      </svg>
    </g>
  </svg>;
}
