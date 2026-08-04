export interface ThemeColors {
  background?: string;
  foreground?: string;
  card?: string;
  border?: string;
}
export interface ThemeColorSet {
  light?: ThemeColors;
  dark?: ThemeColors;
}
export interface BrandingData {
  displayName: string;
  brandColor: string | null;
  theme: 'light' | 'dark' | 'system';
  colors: ThemeColorSet;
}
