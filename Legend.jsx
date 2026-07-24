import { RATING_STYLES, UNRATED_STYLE } from '../ratingColors';

export default function Legend() {
  const entries = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    ...RATING_STYLES[rating],
  }));

  return (
    <div className="legend">
      <div className="legend-title">Rating</div>
      {entries.map(({ rating, color, label }) => (
        <div className="legend-row" key={rating}>
          <span className="legend-dot" style={{ backgroundColor: color }} />
          <span>{rating} — {label}</span>
        </div>
      ))}
      <div className="legend-row">
        <span
          className="legend-dot"
          style={{ backgroundColor: UNRATED_STYLE.color }}
        />
        <span>{UNRATED_STYLE.label}</span>
      </div>
    </div>
  );
}
