
import React, { useEffect, useState } from "react";

export default function SearchPets() {
  const [reports, setReports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);

  const [species, setSpecies] = useState("dog");
  const [kind, setKind] = useState("all");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(100);

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (species !== "all") {
        params.set("species", species);
      }

      if (kind !== "all") {
        params.set("kind", kind);
      }

      if (city.trim()) {
        params.set("city", city.trim());
      }

      const response = await fetch(
        `/api/reports?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load reports"
        );
      }

      setReports(data.reports || []);
      setSelected(null);
      setMatches([]);
      setNotice("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function findMatches(report) {
    setSelected(report);
    setMatches([]);
    setNotice("");
    setError("");
    setSearching(true);

    try {
      const response = await fetch(
        `/api/reports/${report.id}/matches?radius_km=${radius}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to find matches"
        );
      }

      setMatches(data.matches || []);
      setNotice(data.notice || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function PetCard({ report, showMatchButton = true }) {
    return (
      <article className="pet-card">
        <img
          src={report.photo_url}
          alt={report.name || report.species}
        />

        <div>
          <h3>
            {report.name || "Unknown Name"}
          </h3>

          <p>
            <strong>
              {report.kind === "lost"
                ? "Missing Pet"
                : "Found Pet"}
            </strong>
          </p>

          <p>
            Species: {report.species}
          </p>

          <p>
            Location: {report.city}
          </p>

          <p>
            Date: {report.event_date}
          </p>

          {report.description && (
            <p>{report.description}</p>
          )}

          {report.visual_similarity !== undefined && (
            <p>
              Photo similarity:{" "}
              {Math.round(
                report.visual_similarity * 100
              )}%
            </p>
          )}

          {report.distance_km != null && (
            <p>
              Approximate distance:{" "}
              {report.distance_km} km
            </p>
          )}

          {report.source_url && (
            <p>
              <a
                href={report.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Original Listing
              </a>
            </p>
          )}

          {showMatchButton && (
            <button
              type="button"
              onClick={() => findMatches(report)}
              disabled={searching}
            >
              Find Photo Matches
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="search-page">
      <section>
        <h2>Search Lost & Found Pets</h2>

        <p>
          Search community pet reports without creating
          an account.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadReports();
          }}
        >
          <label>
            Animal Type
            <select
              value={species}
              onChange={(event) =>
                setSpecies(event.target.value)
              }
            >
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="bird">Birds</option>
              <option value="rabbit">Rabbits</option>
              <option value="other">Other</option>
              <option value="all">All Animals</option>
            </select>
          </label>

          <label>
            Report Type
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value)
              }
            >
              <option value="all">Lost & Found</option>
              <option value="lost">Missing Pets</option>
              <option value="found">Found Pets</option>
            </select>
          </label>

          <label>
            City or Area
            <input
              type="text"
              placeholder="Example: Tampa"
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
            />
          </label>

          <label>
            Match Radius (Kilometers)
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

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search Pets"}
          </button>
        </form>
      </section>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <section>
        <h2>Community Pet Reports</h2>

        {loading ? (
          <p>Loading reports...</p>
        ) : reports.length === 0 ? (
          <p>
            No reports found for your search.
            Try another location or animal type.
          </p>
        ) : (
          <>
            <p>
              Showing {reports.length} report(s).
            </p>

            <div className="cards">
              {reports.map((report) => (
                <PetCard
                  key={report.id}
                  report={report}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {selected && (
        <section>
          <h2>
            Potential Matches for{" "}
            {selected.name || selected.species}
          </h2>

          {searching && (
            <p>Comparing photographs...</p>
          )}

          {notice && (
            <p className="notice">{notice}</p>
          )}

          {!searching &&
            !error &&
            matches.length === 0 && (
              <p>
                No potential matches found in
                the current database.
              </p>
            )}

          <div className="cards">
            {matches.map((match) => (
              <PetCard
                key={match.id}
                report={match}
                showMatchButton={false}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>Missing a Pet?</h3>

        <p>
          Add your missing pet to the database.
          No account is required.
        </p>

        <a href="#/upload">
          Report a Missing Pet
        </a>
      </section>
    </div>
  );
}
