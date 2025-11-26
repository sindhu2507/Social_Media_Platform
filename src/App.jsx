import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './SocketContext.jsx';
import StartingPage from './components/StartingPage';
import SignUpPage from './components/SignUpPage';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import SearchPage from './components/SearchPage';
import ProfilePage from './components/ProfilePage';
import MomentsPage from './components/MomentsPage';
import AddMomentPage from './components/AddMomentPage';
import ChatPage from './components/ChatPage';
import { useCustomAlert } from './utils/alertUtils';
import './App.css';

function App() {
  const { showAlert, alertMessage, handleCloseAlert } = useCustomAlert();

  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<StartingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/moments" element={<MomentsPage />} />
          <Route path="/add-moment" element={<AddMomentPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
        {showAlert && (
          <div className="custom-alert-modal">
            <div className="custom-alert-content">
              <p>{alertMessage}</p>
              <button onClick={handleCloseAlert}>OK</button>
            </div>
          </div>
        )}
      </Router>
    </SocketProvider>
  );
}

export default App;