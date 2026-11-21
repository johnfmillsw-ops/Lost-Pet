
import React, { useEffect, useState } from "react";

import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Donations from "./pages/Donations.jsx";
import SearchPets from "./pages/SearchPets.jsx";
import UploadPet from "./pages/UploadPet.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

export default function App() {
  const [page, setPage] = useState(
    window.location.hash.slice(1) || "/"
  );

  const [token, setToken] = useState(
    localStorage.getItem("pet_token") || ""
  );

  useEffect(() => {
    function handleNavigation() {
      setPage(window.location.hash.slice(1) || "/");
    }

    window.addEventListener(
      "hashchange",
      handleNavigation
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        handleNavigation
      );
    };
  }, []);

  function handleLogin(newToken) {
    localStorage.setItem("pet_token", newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("pet_token");
    setToken("");
    window.location.hash = "/";
  }

  function renderPage() {
    switch (page) {
      case "/":
        return <Home />;

      case "/about":
        return <About />;

      case "/donations":
        return <Donations />;

      case "/search":
        return <SearchPets token={token} />;

      case "/upload":
        return <UploadPet token={token} />;

      case "/login":
        return token
          ? <Home />
          : <Login onLogin={handleLogin} />;

      case "/register":
        return token
          ? <Home />
          : <Register onLogin={handleLogin} />;

      default:
        return (
          <section>
            <h2>Page Not Found</h2>
            <a href="#/">Return Home</a>
          </section>
        );
    }
  }

  return (
    <>
      <Navbar
        signedIn={Boolean(token)}
        onLogout={handleLogout}
      />

      <main>{renderPage()}</main>
    </>
  );
}
