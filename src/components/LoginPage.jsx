import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/LoginPage.css";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = "Username or Email is required";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Login successful", data);
          localStorage.setItem("token", data.token); // Save token
          localStorage.setItem("username", data.user.username);// ✅ Save username
          navigate("/home");
        } else {
          setServerError(data.message || "Invalid credentials");
        }
      } catch (error) {
        setServerError("Server error. Please try again later.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="full-screen">
      <div className="login-card">
        <h1 className="login-title">Login Page</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              name="usernameOrEmail"
              placeholder="Username or Email"
              value={formData.usernameOrEmail}
              onChange={handleChange}
            />
            {errors.usernameOrEmail && <p className="error">{errors.usernameOrEmail}</p>}
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="error">{errors.password}</p>}
          </div>

          {serverError && <p className="error">{serverError}</p>}
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p>Don't have an account? <button className="link-btn" onClick={() => navigate("/signup")}>Sign Up</button></p>
      </div>
    </div>
  );
};

export default LoginPage;
