// utils/alertUtils.js
import { useState, useEffect } from "react";

let showAlertCallback = () => {
  console.log("showAlertCallback called, but not set yet");
};
let setAlertMessageCallback = () => {
  console.log("setAlertMessageCallback called, but not set yet");
};

export const useCustomAlert = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  showAlertCallback = setShowAlert; // Assign the setter function
  setAlertMessageCallback = setAlertMessage; // Assign the setter function

  console.log("useCustomAlert initialized", { showAlert, alertMessage }); // Debug log

  const handleCloseAlert = () => {
    setShowAlert(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAlert && !event.target.closest(".custom-alert-content")) {
        setShowAlert(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAlert]);

  return { showAlert, alertMessage, handleCloseAlert };
};

window.alert = (message) => {
  console.log("window.alert overridden with message:", message); // Debug log
  setAlertMessageCallback(message);
  showAlertCallback(true);
};