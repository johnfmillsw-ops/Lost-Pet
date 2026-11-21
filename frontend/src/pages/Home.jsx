
import React from "react";

export default function Home() {
  return (
    <section className="home-page">
      <h2>Every Lost Pet Deserves to Come Home</h2>

      <p>
        Lost-Pet helps reunite missing animals with their
        families through photo-based matching and
        community-reported sightings.
      </p>

      <p>
        Report a missing pet, upload a photograph, and
        search for potential matches.
      </p>

      <div className="home-actions">
        <a href="#/search">
          Search for a Lost Pet
        </a>

        <p>
          <a href="#/upload">
            Report a Lost or Found Pet
          </a>
        </p>
      </div>

      <h3>How Lost-Pet Works</h3>

      <ol>
        <li>
          Create an account and upload your pet's photo.
        </li>
        <li>
          Add the last-known location and identifying details.
        </li>
        <li>
          Search for possible matches in the Lost-Pet database.
        </li>
        <li>
          Review photographs and reported sightings.
        </li>
      </ol>

      <p>
        We're building toward automated searches across
        supported social-media platforms and animal shelters.
        Those integrations are not active yet.
      </p>
    </section>
  );
}
