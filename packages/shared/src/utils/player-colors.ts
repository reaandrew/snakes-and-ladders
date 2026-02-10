/**
 * Player color generation using HSL with golden ratio hue distribution.
 * This ensures maximum visual separation between consecutive player colors
 * while supporting up to 300 unique, distinguishable colors.
 */

const GOLDEN_RATIO = 0.618033988749895;
export const MAX_PLAYERS = 300;

/**
 * Converts HSL color values to a hex color string.
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string (e.g., "#FF5733")
 */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number): string => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Generates a unique player color for a given index using golden ratio distribution.
 * The golden ratio ensures maximum hue separation between consecutive players.
 *
 * @param index 0-indexed player position
 * @returns Hex color string
 */
export function generatePlayerColor(index: number): string {
  // Golden ratio ensures maximum hue separation between consecutive players
  const hue = (index * GOLDEN_RATIO * 360) % 360;

  // Vary saturation/lightness to create more distinction between similar hues
  const saturation = 70 + (index % 3) * 10; // 70%, 80%, 90%
  const lightness = 50 + (index % 4) * 8; // 50%, 58%, 66%, 74%

  return hslToHex(hue, saturation, lightness);
}

/**
 * Gets the player color for a given 1-indexed player number.
 *
 * @param playerNumber 1-indexed player number (1-300)
 * @returns Hex color string
 */
export function getPlayerColor(playerNumber: number): string {
  return generatePlayerColor(playerNumber - 1);
}

/**
 * Pre-generated array of 300 unique player colors for consistency.
 * Colors are generated using golden ratio hue distribution for maximum visual separation.
 */
export const PLAYER_COLORS: readonly string[] = Object.freeze(
  Array.from({ length: MAX_PLAYERS }, (_, i) => generatePlayerColor(i))
);
