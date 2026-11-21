
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar.jsx";

const API = "/api";

export default function App() {
  const [page, setPage] = useState(
    window.location.hash.slice(1) || "/"
  );

  const [token, setToken] = useState(
    localStorage.getItem("pet_token") || ""
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [radius, setRadius] = useState(100);

  useEffect(() => {
    const onHash = () => {
      setPage(window.location.hash.slice(1) || "/");
      setError("");
    };

    window.addEventListener("hashchange", onHash);

    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  async function req(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  async function load() {
    try {
      const data = await req("/reports");
      setReports(data.reports);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token]);

  async function auth(event) {
    event.preventDefault();
    setError("");

    const registering = page === "/register";

    try {
      const response = await fetch(
        API + (registering ? "/register" : "/login"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      localStorage.setItem("pet_token", data.token);
      setToken(data.token);
      setPassword("");
      window.location.hash = "/";
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("pet_token");
    setToken("");
    setReports([]);
    setSelected(null);
    setMatches([]);
    window.location.hash = "/";
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await req("/reports", {
        method: "POST",
        body: formData,
      });

      form.reset();
      await load();

      setNotice(
        "Report saved. Select a report to search for matches."
      );

      window.location.hash = "/search";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function search(report) {
    setSelected(report);
    setMatches([]);
    setError("");

    try {
      const data = await req(
        `/reports/${report.id}/matches?radius_km=${radius}`
      );

      setMatches(data.matches);
      setNotice(data.notice);
    } catch (err) {
      setError(err.message);
    }
  }

  function AuthForm() {
    const registering = page === "/register";

    return (
      <section>
        <h2>{registering ? "Create Account" : "Log In"}</h2>

        <form onSubmit={auth}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={registering ? 10 : undefined}
            required
          />

          <button type="submit">
            {registering ? "Create Account" : "Log In"}
          </button>
        </form>

        <p>
          {registering
            ? "Already have an account?"
            : "Don't have an account?"}
        </p>

        <a href={registering ? "#/login" : "#/register"}>
          {registering ? "Log In" : "Create Account"}
        </a>
      </section>
    );
  }

  function UploadForm() {
    return (
      <section>
        <h2>Upload a Pet Report</h2>
        <p>
          Add a missing or found pet to the Lost-Pet database.
        </p>

        <form onSubmit={submit}>
          <label>
            Report Type
            <select name="kind" required>
              <option value="lost">Lost Pet</option>
              <option value="found">Found Pet</option>
            </select>
          </label>

          <label>
            Pet Name
            <input name="name" placeholder="Buddy" />
          </label>

          <label>
            Species
            <input
              name="species"
              placeholder="Dog, Cat, etc."
              required
            />
          </label>

          <label>
            City
            <input
              name="city"
              placeholder="Tampa, FL"
              required
            />
          </label>

          <label>
            Date Last Seen / Found
            <input name="event_date" type="date" required />
          </label>

          <label>
            Description
            <textarea
              name="description"
              placeholder="Color, collar, markings, distinguishing features"
            />
          </label>

          <label>
            Latitude (Optional)
            <input
              name="lat"
              type="number"
              step="any"
              placeholder="27.9506"
            />
          </label>

          <label>
            Longitude (Optional)
            <input
              name="lon"
              type="number"
              step="any"
              placeholder="-82.4572"
            />
          </label>

          <label>
            Original Source URL (Optional)
            <input
              name="source_url"
              type="url"
              placeholder="https://..."
            />
          </label>

          <label>
            Pet Photograph
            <input
              name="photo"
              type="file"
              accept="image/*"
              required
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save Pet Report"}
          </button>
        </form>
      </section>
    );
  }

  function ReportsList() {
    return (
      <section>
        <h2>My Pet Reports</h2>

        {reports.length === 0 ? (
          <p>No reports yet.</p>
        ) : (
          <div className="cards">
            {reports.map((report) => (
              <article key={report.id}>
                <img
                  src={report.photo_url}
                  alt={report.name || report.species}
                />

                <div>
                  <strong>
                    {report.name || report.species} — {report.kind}
                  </strong>

                  <p>
                    {report.city} · {report.event_date}
                  </p>

                  <button onClick={() => search(report)}>
                    Find Matches
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  function MatchResults() {
    if (!selected) return null;

    return (
      <section>
        <h2>
          Matches for {selected.name || selected.species}
        </h2>

        <label>
          Search Radius (km)
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

        <button onClick={() => search(selected)}>
          Search Again
        </button>

        <p className="notice">{notice}</p>

        {matches.length === 0 ? (
          <p>No matching reports found in the current database.</p>
        ) : (
          <div className="cards">
            {matches.map((match) => (
              <article key={match.id}>
                <img
                  src={match.photo_url}
                  alt={match.name || match.species}
                />

                <div>
                  <strong>
                    {match.name || match.species}
                  </strong>

                  <p>
                    {Math.round(match.visual_similarity * 100)}%
                    visual similarity
                  </p>

                  <p>
                    {match.city} · {match.event_date}
                  </p>

                  {match.distance_km !== null && (
                    <p>{match.distance_km} km away</p>
                  )}

                  <p>{match.description}</p>

                  {match.source_url && (
                    <a
                      href={match.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Original Listing
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  function HomePage() {
    return (
      <section>
        <h2>Help Bring Lost Pets Home</h2>

        <p>
          Lost-Pet helps connect missing animals with
          potential sightings using photographs and
          location information.
        </p>

        <p>
          Our current prototype matches reports submitted
          directly to the application.
        </p>

        <a href="#/search">
          Search for a Lost Pet
        </a>

        <p>
          <a href="#/upload">
            Report a Lost or Found Pet
          </a>
        </p>
      </section>
    );
  }

  function renderPage() {
    if (page === "/about") {
      return (
        <section>
          <h2>About Lost-Pet</h2>
          <p>
            Lost-Pet is being developed to help reunite
            missing animals with their families.
          </p>
          <p>
            Future development will focus on automated
            searches across external pet listings and
            supported social platforms.
          </p>
          <p>
            External social-media and shelter scanning
            is not connected yet.
          </p>
        </section>
      );
    }

    if (page === "/donations") {
      return (
        <section>
          <h2>Support Lost-Pet</h2>
          <p>
            Donation processing is not available yet.
          </p>
        </section>
      );
    }

    if (page === "/login" || page === "/register") {
      return token ? <HomePage /> : <AuthForm />;
    }

    if (page === "/upload") {
      return token ? <UploadForm /> : <AuthForm />;
    }

    if (page === "/search") {
      return token ? (
        <>
          <ReportsList />
          <MatchResults />
        </>
      ) : (
        <AuthForm />
      );
    }

    return <HomePage />;
  }

  return (
    <>
      <Navbar signedIn={!!token} onLogout={logout} />

      <main>
        <div className="page-header">
          <h1>🐾 Lost-Pet</h1>
          <p>Helping reunite pets with their families.</p>
        </div>

        {error && <div className="error">{error}</div>}

        {renderPage()}
      </main>
    </>
  );
}
