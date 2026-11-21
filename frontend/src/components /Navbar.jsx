
import React from "react";
import { NavLink, Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const links = [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "Donations", path: "/donations" },
    { label: "Search for Lost Pet", path: "/search" },
    { label: "Upload Lost Pet", path: "/upload" },
  ];

  return (
    <header className="navbar">
      <Link to="/" className="navbar-logo">
        🐾 Lost-Pet
      </Link>

      <nav className="navbar-links" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === "/"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="navbar-auth">
        <Link to="/login" className="login-btn">
          Log In
        </Link>
        <Link to="/register" className="register-btn">
          Create Account
        </Link>
      </div>
    </header>
  );
}
