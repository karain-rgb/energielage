export const theme = {
  color: {
    bg: "#ffffff",
    text: "#14161a",
    textMuted: "#6b7280",
    textFaint: "#9ca3af",
    rule: "#e3e5e8",
    ruleStrong: "#14161a",
    band: "#e5e7eb",
    signal: "#b45309",
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
  font: {
    family: "'Sora Variable', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    size: { tick: 10, label: 11, body: 13, lead: 15, title: 22, value: 40 },
    weight: { normal: 400, medium: 500, bold: 600 },
  },
  radius: { sm: 0, md: 0 },
  maxWidth: 1100,
} as const;
