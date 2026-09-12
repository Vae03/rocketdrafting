// A curated, server-validated allowlist -- avatars are "pick an emoji + a color" rather than an
// arbitrary image upload, which sidesteps needing file storage/moderation entirely while still
// giving every profile a distinct, personalizable look.
export const AVATAR_EMOJI = ["🚀", "⚡", "🔥", "🌟", "🛡", "🎯", "🏆", "👾", "🐺", "🦈", "🐉", "🦅", "☄", "🧊", "🎮", "💎"];

export const AVATAR_COLORS = ["#ffcf49", "#ff5f6d", "#4facfe", "#43e97b", "#a18cd1", "#fa709a", "#30cfd0", "#ff9a4d"];

// Uploaded avatars are resized client-side (canvas, <=256px) before they're ever sent, but the
// server never trusts that -- it re-checks the encoded type and caps the string length itself.
// Raster formats only (no SVG): an SVG data URI can carry a <script>, and even though browsers
// don't execute it when the SVG is loaded as a plain <img>, there's no reason to accept the risk
// for user-uploaded content.
export const MAX_AVATAR_IMAGE_DATA_URI_LENGTH = 700_000; // ~512KB of raw image data once decoded
const AVATAR_IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

export function isValidAvatarImageDataUri(value: string): boolean {
  return value.length <= MAX_AVATAR_IMAGE_DATA_URI_LENGTH && AVATAR_IMAGE_PATTERN.test(value);
}
