import React from "react";
import { useNavigate } from "react-router-dom";
import "../components/StartingPage.css";

const StartingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="full-screen">
      <div className="card">
        <h1 className="title">Glimpse</h1>
        <p className="tagline">Connect with the world.</p>
        <div className="button-container">
          <button className="signup-btn" onClick={() => navigate("/signup")}>Sign Up</button>
          <button className="login-btn" onClick={() => navigate("/login")}>Log In</button>
        </div>
      </div>
    </div>
  );
};

export default StartingPage;