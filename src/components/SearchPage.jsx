import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ProfileModal from "./ProfileModal";
import "../components/SearchPage.css";

const SearchPage = () => {
  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null); // ← NEW

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ← GET CURRENT USER ID FROM JWT ONCE
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.id);
      } catch (err) {
        console.error("Invalid token");
      }
    }
  }, [token]);

  // Live search
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = input.trim();
      if (query && token) {
        setLoading(true);
        axios
          .get(`http://localhost:5000/api/auth/search-users?username=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => setSearchResults(res.data.users || []))
          .catch(() => setSearchResults([]))
          .finally(() => setLoading(false));
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [input, token]);

  // Suggested users
  useEffect(() => {
    if (!token) return;
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const res = await axios.get("http://localhost:5000/api/auth/suggested-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuggestedUsers(res.data.suggestedUsers || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [token]);

  const handleFollow = async (userId, isFollowing, isSuggestion = false) => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/follow",
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data.isFollowing;

      if (isSuggestion) {
        setSuggestedUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isFollowing: updated } : u))
        );
      } else {
        setSearchResults((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isFollowing: updated } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserClick = (userId) => setSelectedUserId(userId);
  const handleCloseModal = () => setSelectedUserId(null);

  return (
    <div className="search-page-wrapper">
      {/* LEFT */}
      <div className="search-left">
        <div className="content">
          <input
            type="text"
            className="search-input"
            placeholder="Search users..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          {loading && <p className="loading">Searching...</p>}

          <div className="search-results">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user._id}
                  className="search-result-item"
                  onClick={() => handleUserClick(user._id)}
                >
                  <img
                    src={
                      user.profilePic
                        ? `http://localhost:5000${user.profilePic}`
                        : "https://via.placeholder.com/50"
                    }
                    alt={user.username}
                    className="result-profile-pic"
                  />
                  <span className="result-username">{user.username}</span>
                  <button
                    className={`follow-button ${user.isFollowing ? "unfollow" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(user._id, user.isFollowing, false);
                    }}
                  >
                    {user.isFollowing ? "Unfollow" : "Follow"}
                  </button>
                </div>
              ))
            ) : input.trim() && !loading ? (
              <p className="no-results">No users found</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="search-right">
        <div className="suggestions-block">
          <h3>Suggested for you</h3>
          {loadingSuggestions ? (
            <p className="loading">Loading...</p>
          ) : suggestedUsers.length > 0 ? (
            suggestedUsers.map((user) => (
              <div
                key={user._id}
                className="search-result-item suggestion-item"
                onClick={() => handleUserClick(user._id)}
              >
                <img
                  src={
                    user.profilePic
                      ? `http://localhost:5000${user.profilePic}`
                      : "https://via.placeholder.com/50"
                  }
                  alt={user.username}
                  className="result-profile-pic"
                />
                <div className="suggestion-info">
                  <span className="result-username">{user.username}</span>
                  <small>{user.mutualText || "Suggested for you"}</small>
                </div>
                <button
                  className="follow-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(user._id, false, true);
                  }}
                >
                  Follow
                </button>
              </div>
            ))
          ) : (
            <p className="no-suggestions">No suggestions yet</p>
          )}
        </div>
      </div>

      {/* MODAL – ONLY SHOW WHEN WE HAVE BOTH IDs */}
      {selectedUserId && currentUserId && (
        <ProfileModal
          userId={selectedUserId}
          onClose={handleCloseModal}
          token={token}
          currentUserId={currentUserId}
        />
      )}

      {/* Bottom Nav */}
      <div className="bottom-block">
        <h1>
          <img 
            src="/logo.png" 
            alt="Glimpse Logo" 
            className="glimpse-logo"
          />
          Glimpse
        </h1>
        <button className="nav-button" onClick={() => navigate("/home")}>Home</button>
        <button className="nav-button" onClick={() => navigate("/moments")}>Moments</button>
        <button className="nav-button" onClick={() => navigate("/search")}>Search</button>
        <button className="nav-button" onClick={() => navigate("/chat")}>Chat</button>
        <button className="nav-button" onClick={() => navigate("/profile")}>Profile</button>
      </div>
    </div>
  );
};

export default SearchPage;