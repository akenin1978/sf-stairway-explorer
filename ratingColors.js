// Single source of truth for rating -> color/label.
// If your Google Sheet's "Legend" tab uses different colors or wording,
// just edit the values below -- nothing else needs to change.

export const RATING_STYLES = {
  1: { color: '#d32f2f', label: 'Basic' },
  2: { color: '#f57c00', label: 'Nice' },
  3: { color: '#fbc02d', label: 'Good' },
  4: { color: '#7cb342', label: 'Great' },
  5: { color: '#2e7d32', label: 'Scheherazade' },
};

export const UNRATED_STYLE = { color: '#9e9e9e', label: 'Unrated' };

export function getRatingStyle(rating) {
  return RATING_STYLES[rating] ?? UNRATED_STYLE;
}
