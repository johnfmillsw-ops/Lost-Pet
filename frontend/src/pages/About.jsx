
import React from "react";

export default function About() {
  return (
    <section className="about-page">
      <h2>About Lost-Pet</h2>

      <p>
        Lost-Pet was created to address a frustrating problem:
        when an animal disappears, its owner must often search
        through countless websites, social-media posts, and
        community groups hoping to find a lead.
      </p>

      <h3>Our Mission</h3>

      <p>
        To make finding missing pets faster, easier, and more
        accessible by bringing reports and potential sightings
        together in one searchable platform.
      </p>

      <h3>Our Technology</h3>

      <p>
        Our current prototype uses photographic similarity
        and location information to identify possible matches
        between lost and found pet reports.
      </p>

      <p>
        Our long-term goal is to integrate AI-assisted image
        comparison, automated searching of supported external
        sources, and notifications when potential matches
        are discovered.
      </p>

      <h3>Important Information</h3>

      <p>
        Image similarity is not proof that two photographs
        show the same animal. Always independently verify
        possible matches before arranging a reunion.
      </p>
    </section>
  );
}
