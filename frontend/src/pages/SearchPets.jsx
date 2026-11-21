
import React, { useEffect, useState } from "react";

export default function SearchPets({ token }) {
  const [reports, setReports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [radius, setRadius] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return;

    async function loadReports() {
      try {
        const response = await fetch("/api/reports", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load reports"
          );
        }

        setReports(data.reports || []);
      } catch (err) {
        setError(err.message);
      }
    }

    loadReports();
  }, [token]);

  async function findMatches(report) {
    setSelected(report);
    setMatches([]);
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/reports/${report.id}/matches?radius_km=${radius}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Search failed"
        );
      }

      setMatches(data.matches || []);
      setNotice(data.notice || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section>
        <h2>Search for Lost Pets</h2>
        <p>Please log in to search your reports.</p>
        <a href="#/login">Log In</a>
      </section>
    );
  }

  return (
    <div className="search-page">
      <section>
        <h2>Search for Lost Pets</h2>

        <p>
          Select one of your pet reports to find
          potential matches in the Lost-Pet database.
        </p>

        {error && <div className="error">{error}</div>}

        <label>
          Search Radius (Kilometers)
          <input
            type="number"
            min="1"
            max="1000"
            value={radius}
            onChange={(event) =>
              setRadius(event.target.value)
            }
          />
        </label>

        <h3>My Reports</h3>

        {reports.length === 0 ? (
          <p>
            You haven't submitted any pet reports yet.{" "}
            <a href="#/upload">Upload a Pet</a>
          </p>
        ) : (
          <div className="cards">
            {reports.map((report) => (
              <article key={report.id}>
                <img
                  src={report.photo_url}
                  alt={report.name || report.species}
                />

                <div>
                  <h3>
                    {report.name || report.species}
                  </h3>

                  <p>
                    {report.kind.toUpperCase()} — {report.city}
                  </p>

                  <p>{report.event_date}</p>

                  <button
                    disabled={loading}
                    onClick={() => findMatches(report)}
                  >
                    Find Matches
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <section>
          <h2>
            Potential Matches for{" "}
            {selected.name || selected.species}
          </h2>

          {loading && <p>Searching...</p>}
          {notice && <p className="notice">{notice}</p>}

          {!loading && matches.length === 0 && (
            <p>No matching reports found.</p>
          )}

          <div className="cards">
            {matches.map((match) => (
              <article key={match.id}>
                <img
                  src={match.photo_url}
                  alt={match.name || match.species}
                />

                <div>
                  <h3>
                    {match.name || match.species}
                  </h3>

                  <p>
                    Visual Similarity:{" "}
                    {Math.round(
                      match.visual_similarity * 100
                    )}%
                  </p>

                  <p>Location: {match.city}</p>

                  {match.distance_km !== null && (
                    <p>
                      Distance: {match.distance_km} km
                    </p>
                  )}

                  <p>{match.description}</p>

                  {match.source_url && (
                    <a
                      href={match.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Original Report
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
