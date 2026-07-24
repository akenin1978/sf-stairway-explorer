// Single source of truth for rating -> color/label.
// Colors and descriptions extracted directly from your original My Maps KML
// export and your Google Sheet's Legend column -- not guessed defaults.

export const RATING_STYLES = {
  5: {
    color: '#E65100',
    label: 'The best of the best',
    description:
      'These stairways surprise the walker. Elegant or rustic, short or ' +
      'long, they exhibit variety, stir the imagination, and delight the senses.',
  },
  4: {
    color: '#F57C00',
    label: 'Very impressive',
    description:
      'Impressive qualities with minor shortcomings; one outstanding ' +
      'aspect or extremely attractive design.',
  },
  3: {
    color: '#FFD600',
    label: 'Underappreciated gems',
    description:
      'Little known but deserving of wider recognition because of the ' +
      'environs, human-made or natural. Neighborhood is generally very attractive.',
  },
  2: {
    color: '#558B2F',
    label: 'Neighborhood mainstays',
    description:
      'Intrinsic to neighborhood history and ambiance. Well trodden. ' +
      'Functional. In most cases, the architectural context rates ' +
      'considerably higher than the stairway itself, or the view may be ' +
      'worth the visit.',
  },
  1: {
    color: '#0288D1',
    label: "I've seen better",
    description:
      "It may be so boring that you'll fall asleep on the first landing.",
  },
};

export const UNRATED_STYLE = {
  color: '#9e9e9e',
  label: 'Unrated / to verify',
  description: 'Not yet rated, or a note to double-check this entry.',
};

export function getRatingStyle(rating) {
  return RATING_STYLES[rating] ?? UNRATED_STYLE;
}