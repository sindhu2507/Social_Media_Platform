// src/context/AlertContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAlert && !event.target.closest(".custom-alert-content")) {
        setShowAlert(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAlert]);

  // Override window.alert
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      console.log("window.alert overridden with message:", message);
      setAlertMessage(message);
      setShowAlert(true);
    };
    return () => {
      window.alert = originalAlert; // Restore original alert on unmount (optional)
    };
  }, []);

  const handleCloseAlert = () => {
    setShowAlert(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, alertMessage, handleCloseAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);