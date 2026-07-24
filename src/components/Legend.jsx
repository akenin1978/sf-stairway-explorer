import { RATING_STYLES, UNRATED_STYLE } from '../ratingColors';

export default function Legend() {
  const entries = [5, 4, 3, 2, 1].map((rating) => ({
    key: rating,
    rating,
    ...RATING_STYLES[rating],
  }));

  return (
    <div>
      {[...entries, { key: 'unrated', ...UNRATED_STYLE }].map(
        ({ key, rating, color, label, description }) => (
          <div className="legend-row" key={key} title={description}>
            <span className="legend-dot" style={{ backgroundColor: color }} />
            <span>{rating != null ? `${rating} — ${label}` : label}</span>
          </div>
        )
      )}
    </div>
  );
}
