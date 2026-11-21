
import React, { useState } from "react";

export default function UploadPet({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      window.location.hash = "/login";
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to upload report"
        );
      }

      setSuccess("Pet report uploaded successfully!");
      form.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section>
        <h2>Report a Lost or Found Pet</h2>
        <p>You must log in to submit a report.</p>
        <a href="#/login">Log In</a>
      </section>
    );
  }

  return (
    <section className="upload-page">
      <h2>Report a Lost or Found Pet</h2>

      <p>
        Provide as much information as possible
        to help identify your pet.
      </p>

      {error && <div className="error">{error}</div>}
      {success && <p role="status">{success}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Report Type
          <select name="kind" required>
            <option value="lost">Lost Pet</option>
            <option value="found">Found Pet</option>
          </select>
        </label>

        <label>
          Pet Name
          <input
            name="name"
            placeholder="Pet's name"
          />
        </label>

        <label>
          Species
          <select name="species" required>
            <option value="">Select Species</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="rabbit">Rabbit</option>
            <option value="other">Other</option>
          </select>
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
          Date Lost or Found
          <input
            name="event_date"
            type="date"
            required
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            placeholder="Breed, color, collar, markings, and identifying features"
          />
        </label>

        <label>
          Latitude (Optional)
          <input
            name="lat"
            type="number"
            step="any"
            min="-90"
            max="90"
          />
        </label>

        <label>
          Longitude (Optional)
          <input
            name="lon"
            type="number"
            step="any"
            min="-180"
            max="180"
          />
        </label>

        <label>
          Original Listing URL (Optional)
          <input
            name="source_url"
            type="url"
            placeholder="https://..."
          />
        </label>

        <label>
          Upload Pet Photograph
          <input
            name="photo"
            type="file"
            accept="image/*"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Submit Report"}
        </button>
      </form>
    </section>
  );
}
