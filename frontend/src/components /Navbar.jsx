
import React from "react";
import "./Navbar.css";

const links = [
  ["Home", "/"],
  ["About", "/about"],
  ["Donations", "/donations"],
  ["Search for Lost Pet", "/search"],
  ["Upload Lost Pet", "/upload"],
];

export default function Navbar({ signedIn = false, onLogout }) {
  const current = window.location.hash.slice(1) || "/";

  return (
    <div className="navbar">
      <a href="#/" className="navbar-logo">
        🐾 Lost-Pet
      </a>

      <nav className="navbar-links" aria-label="Main navigation">
        {links.map(([label, path]) => (
          <a
            key={path}
            href={"#" + path}
            className={
              "nav-link " + (current === path ? "active" : "")
            }
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="navbar-auth">
        {signedIn ? (
          <button className="secondary" onClick={onLogout}>
            Sign out
          </button>
        ) : (
          <>
            <a href="#/login" className="login-btn">
              Log In
            </a>
            <a href="#/register" className="register-btn">
              Create Account
            </a>
          </>
        )}
      </div>
    </div>
  );
}
