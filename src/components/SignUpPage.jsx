import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/SignUpPage.css";

const SignUpPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const validateForm = () => {
    let newErrors = {};

    // Required field validation
    Object.keys(formData).forEach((key) => {
      if (!formData[key]) {
        newErrors[key] = "This field is required"; // Removed "*" to avoid confusion with symbols
      }
    });

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Phone number validation
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Age validation (Must be 18 or older)
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dob = "You must be at least 18 years old to sign up";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (validateForm()) {
      try {
        const response = await fetch("http://localhost:5000/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Something went wrong");
        }

        alert("Sign Up Successful!");
        navigate("/home");
      } catch (error) {
        setServerError(error.message);
      }
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1 className="signup-title">Sign Up</h1>
        {serverError && <p className="error">{serverError}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email ID"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
            />
            {errors.firstName && <p className="error">{errors.firstName}</p>}
          </div>

          <div className="form-group">
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
            />
            {errors.lastName && <p className="error">{errors.lastName}</p>}
          </div>

          <div className="form-group">
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
            />
            {errors.dob && <p className="error">{errors.dob}</p>}
          </div>

          <div className="form-group">
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
            />
            {errors.phone && <p className="error">{errors.phone}</p>}
          </div>

          <div className="form-group">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
            />
            {errors.username && <p className="error">{errors.username}</p>}
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="error">{errors.password}</p>}
          </div>

          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}
          </div>

          <div className="form-group">
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && <p className="error">{errors.gender}</p>}
          </div>

          <button type="submit" className="signup-btn">Sign Up</button>
        </form>
        <p>
          Already have an account?{" "}
          <button className="link-btn" onClick={() => navigate("/login")}>
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;