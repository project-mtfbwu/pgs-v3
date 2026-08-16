export function relativeLuminance(hex: string): number {
  const channels = hex.replace("#", "").match(/.{2}/g);
  if (!channels || channels.length !== 3) throw new Error("Expected a six-digit hex color");
  const [red, green, blue] = channels.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export const OPERATIONS_CONTRAST_PAIRS = [
  { name: "body on page", foreground: "#17171b", background: "#f7f8fa", minimum: 4.5 },
  { name: "body on card", foreground: "#17171b", background: "#ffffff", minimum: 4.5 },
  { name: "muted on card", foreground: "#696b74", background: "#ffffff", minimum: 4.5 },
  { name: "muted on muted surface", foreground: "#696b74", background: "#f0f1f4", minimum: 4.5 },
  { name: "description on page", foreground: "#696b74", background: "#f7f8fa", minimum: 4.5 },
  { name: "secondary badge", foreground: "#25262b", background: "#f0f1f4", minimum: 4.5 },
  { name: "premium badge", foreground: "#5938a7", background: "#f0ecff", minimum: 4.5 },
  { name: "primary button", foreground: "#ffffff", background: "#19191d", minimum: 4.5 },
  { name: "focus ring on card", foreground: "#7357bf", background: "#ffffff", minimum: 3 }
] as const;
