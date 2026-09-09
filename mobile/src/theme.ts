// Grounded in SFU's actual brand palette (deep red + ink) rather than a
// generic app look, since this is specifically an SFU campus tool.
export const colors = {
  background: "#FBFAF8",
  surface: "#FFFFFF",
  ink: "#1A1A1A",
  inkMuted: "#6B6B6B",
  border: "#E8E5E0",
  sfuRed: "#A6192E",
  sfuRedMuted: "#F4E4E7",
  statusEmpty: "#2E7D46",
  statusSomeSpace: "#4C9A5E",
  statusCrowded: "#C98A1E",
  statusPacked: "#B3372C",
  statusNoData: "#A3A3A3",
};

export function occupancyColor(percent: number | null): string {
  if (percent === null) return colors.statusNoData;
  if (percent < 30) return colors.statusEmpty;
  if (percent < 55) return colors.statusSomeSpace;
  if (percent < 80) return colors.statusCrowded;
  return colors.statusPacked;
}

export function occupancyLabel(percent: number | null): string {
  if (percent === null) return "No recent data";
  if (percent < 30) return "Plenty of space";
  if (percent < 55) return "Some space";
  if (percent < 80) return "Crowded";
  return "Packed";
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const typography = {
  heading: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  subheading: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
};
