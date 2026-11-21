
import React, { useState } from "react";

export default function UploadPet({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to submit report"
        );
      }

      setSuccess(
        `Your report was submitted successfully! ` +
        `Report number: ${data.report.id}`
      );

      form.reset();

      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="upload-page">
      <h2>Report a Lost or Found Pet</h2>

      <p>
        Help reunite pets with their families.
        No account is required to submit a report.
      </p>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div role="status">
          <p>{success}</p>
          <p>
            <a href="#/search">
              View Community Pet Reports
            </a>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label>
          Are You Reporting a Lost or Found Pet?
          <select name="kind" required>
            <option value="lost">
              I Lost My Pet
            </option>
            <option value="found">
              I Found a Pet
            </option>
          </select>
        </label>

        <label>
          Pet's Name (If Known)
          <input
            name="name"
            type="text"
            placeholder="Example: Buddy"
            maxLength="100"
          />
        </label>

        <label>
          Animal Type
          <select name="species" required>
            <option value="">Select Animal</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="rabbit">Rabbit</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          City or Area Last Seen
          <input
            name="city"
            type="text"
            placeholder="Example: Tampa, FL"
            maxLength="150"
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
            maxLength="3000"
            placeholder={
              "Breed, size, color, collar, markings, " +
              "temperament, and where the pet was last seen."
            }
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
            placeholder="27.9506"
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
            placeholder="-82.4572"
          />
        </label>

        <label>
          Original Listing Link (Optional)
          <input
            name="source_url"
            type="url"
            placeholder="https://..."
          />
        </label>

        <label>
          Upload a Photograph
          <input
            name="photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            required
          />
        </label>

        {preview && (
          <div>
            <p>Photo Preview</p>
            <img
              src={preview}
              alt="Selected pet"
              style={{
                maxWidth: "300px",
                width: "100%",
                borderRadius: "8px",
              }}
            />
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: "-9999px",
          }}
          aria-hidden="true"
        >
          <label>
            Leave This Field Empty
            <input
              name="website"
              type="text"
              tabIndex="-1"
              autoComplete="off"
            />
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading
            ? "Submitting Report..."
            : "Submit Pet Report"}
        </button>
      </form>

      <p>
        Your report and photograph will be publicly
        visible so others can help identify the animal.
        Avoid including private addresses, phone numbers,
        or other sensitive information in the description.
      </p>
    </section>
  );
}
