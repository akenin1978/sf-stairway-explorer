import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const NEIGHBOR_WINDOW = 10; // how many ranks above/below the user to show

function LeaderboardRow({ rank, entry, isMe, isFriend }) {
  return (
    <div className={'leaderboard-row' + (isMe ? ' leaderboard-row-me' : '')}>
      <span className="leaderboard-rank">#{rank}</span>
      <span className="leaderboard-name">
        {isFriend && !isMe && <span className="leaderboard-friend-icon">★</span>}
        {entry.display_name}
        {isMe && <span className="leaderboard-you-tag"> (you)</span>}
      </span>
      <span className="leaderboard-count">{entry.verified_count}</span>
    </div>
  );
}

export default function LeaderboardModal({ onClose }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [friendIds, setFriendIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      supabase.rpc('get_leaderboard'),
      supabase.rpc('get_my_friends'),
    ]).then(([leaderboardRes, friendsRes]) => {
      if (!isMounted) return;
      if (leaderboardRes.error) {
        setError(leaderboardRes.error.message);
      } else {
        setEntries(leaderboardRes.data || []);
      }
      if (!friendsRes.error && friendsRes.data) {
        setFriendIds(
          new Set(
            friendsRes.data
              .filter((f) => f.status === 'accepted')
              .map((f) => f.friend_user_id)
          )
        );
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const myIndex = entries.findIndex((e) => e.user_id === user?.id);
  const topTen = entries.slice(0, 10);

  const neighborStart =
    myIndex > 9 ? Math.max(10, myIndex - NEIGHBOR_WINDOW) : null;
  const neighbors =
    neighborStart !== null
      ? entries.slice(neighborStart, myIndex + NEIGHBOR_WINDOW + 1)
      : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card leaderboard-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Leaderboard</h2>
        <p className="modal-context">
          Ranked by photo-verified check-ins. <span className="leaderboard-friend-icon">★</span> marks a friend.
        </p>

        {loading && <p className="modal-context">Loading…</p>}
        {error && <p className="modal-error">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="modal-context">
            No one's opted in yet -- be the first! You can turn this on in
            Settings.
          </p>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            <h3 className="leaderboard-section-heading">Top 10</h3>
            <div className="leaderboard-list">
              {topTen.map((entry, i) => (
                <LeaderboardRow
                  key={entry.user_id}
                  rank={i + 1}
                  entry={entry}
                  isMe={entry.user_id === user?.id}
                  isFriend={friendIds.has(entry.user_id)}
                />
              ))}
            </div>

            {neighborStart !== null && (
              <>
                <h3 className="leaderboard-section-heading">
                  Your neighbors
                </h3>
                <div className="leaderboard-list">
                  {neighbors.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.user_id}
                      rank={neighborStart + i + 1}
                      entry={entry}
                      isMe={entry.user_id === user?.id}
                      isFriend={friendIds.has(entry.user_id)}
                    />
                  ))}
                </div>
              </>
            )}

            {myIndex === -1 && (
              <p className="modal-context">
                You're not on the board yet -- opt in from Settings to see
                your ranking here.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
