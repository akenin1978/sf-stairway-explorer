import { useState } from 'react';
import { RATING_STYLES, UNRATED_STYLE } from '../ratingColors';

export default function FiltersPanel({
  visibleRatings,
  onToggleRating,
  allNeighborhoods,
  visibleNeighborhoods,
  onToggleNeighborhood,
  onShowAllNeighborhoods,
  onHideAllNeighborhoods,
}) {
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');

  const ratingEntries = [5, 4, 3, 2, 1].map((rating) => ({
    key: rating,
    rating,
    ...RATING_STYLES[rating],
  }));

  const matchingNeighborhoods = allNeighborhoods.filter((n) =>
    n.toLowerCase().includes(neighborhoodSearch.toLowerCase())
  );

  return (
    <div>
      <p className="filters-section-title">Rating</p>
      <div className="filters-pill-row">
        {[...ratingEntries, { key: 'unrated', ...UNRATED_STYLE }].map(
          ({ key, rating, color, label }) => (
            <label className="filters-pill" key={key} title={label}>
              <input
                type="checkbox"
                checked={visibleRatings.has(key)}
                onChange={() => onToggleRating(key)}
              />
              <span className="legend-dot" style={{ backgroundColor: color }} />
              <span>{rating ?? 'N/A'}</span>
            </label>
          )
        )}
      </div>

      <p className="filters-section-title" style={{ marginTop: '14px' }}>
        Neighborhood
      </p>
      <input
        className="filters-search"
        placeholder="Search neighborhoods…"
        value={neighborhoodSearch}
        onChange={(e) => setNeighborhoodSearch(e.target.value)}
      />
      <div className="filters-neighborhood-list">
        {matchingNeighborhoods.map((n) => (
          <label className="filters-checkbox-row" key={n}>
            <input
              type="checkbox"
              checked={visibleNeighborhoods.has(n)}
              onChange={() => onToggleNeighborhood(n)}
            />
            <span>{n}</span>
          </label>
        ))}
        {matchingNeighborhoods.length === 0 && (
          <p className="filters-no-match">No matching neighborhoods</p>
        )}
      </div>
      <div className="legend-actions">
        <button className="legend-link" onClick={onShowAllNeighborhoods}>
          Show all
        </button>
        <span aria-hidden="true"> · </span>
        <button className="legend-link" onClick={onHideAllNeighborhoods}>
          Hide all
        </button>
      </div>
    </div>
  );
}
