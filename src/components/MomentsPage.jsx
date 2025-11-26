import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./MomentsPage.css";

const MomentsPage = () => {
  const navigate = useNavigate();
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [myMoments, setMyMoments] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedMoments, setSelectedMoments] = useState([]);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [userIndex, setUserIndex] = useState(0);
  const [momentTimer, setMomentTimer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPostedToday, setHasPostedToday] = useState(false);

  const handleCaptionChange = (e) => setCaption(e.target.value);

  const handleFileInputClick = () => {
    if (momentTimer) clearInterval(momentTimer);
    document.getElementById("fileInput")?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      alert("Please select a valid image");
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (momentTimer) clearInterval(momentTimer);
    handleFileChange(e);
  };

  const handleUpload = async () => {
    const token = localStorage.getItem("token");
    if (!token || !selectedFile) return;

    const formData = new FormData();
    formData.append("momentImage", selectedFile);
    formData.append("caption", caption);

    try {
      await axios.post("http://localhost:5000/api/auth/create-moment", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      const myRes = await axios.get(`http://localhost:5000/api/auth/moments/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = myRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyMoments(sorted);
      setHasPostedToday(true);

      setCaption("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setShowUpload(false);
      if (momentTimer) clearInterval(momentTimer);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Try again.");
    }
  };

  // DELETE STORY FUNCTION
  const handleDeleteMyStory = async () => {
    if (!window.confirm("Delete your story? This cannot be undone.")) return;

    const token = localStorage.getItem("token");
    const momentId = myMoments[0]._id;

    try {
      await axios.delete(`http://localhost:5000/api/auth/delete-moment/${momentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh your moments
      const res = await axios.get(`http://localhost:5000/api/auth/moments/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyMoments(sorted);
      setHasPostedToday(sorted.length > 0);

      alert("Your story has been deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete story");
    }
  };

  const handleUserClick = async (userId) => {
    if (userId === currentUser?._id) {
      setShowUpload(true);
      return;
    }

    if (momentTimer) clearInterval(momentTimer);

    try {
      setIsLoading(true);
      const res = await axios.get(`http://localhost:5000/api/auth/moments/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const moments = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSelectedUserId(userId);
      setSelectedMoments(moments);
      setCurrentMomentIndex(0);
      const idx = following.findIndex(u => u._id === userId);
      setUserIndex(idx !== -1 ? idx : 0);
    } catch (err) {
      console.error("Error loading moments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedUserId || selectedMoments.length === 0) return;
    if (momentTimer) clearInterval(momentTimer);

    const timer = setInterval(() => {
      if (currentMomentIndex >= selectedMoments.length - 1) {
        cycleUsers();
        setCurrentMomentIndex(0);
      } else {
        setCurrentMomentIndex(prev => prev + 1);
      }
    }, 3000);

    setMomentTimer(timer);
    return () => clearInterval(timer);
  }, [selectedUserId, selectedMoments, currentMomentIndex]);

  const cycleUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token || following.length === 0) return;

    let nextIndex = (userIndex + 1) % following.length;
    setIsLoading(true);

    for (let i = 0; i < following.length; i++) {
      const userId = following[nextIndex]._id;
      try {
        const res = await axios.get(`http://localhost:5000/api/auth/moments/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.length > 0) {
          setSelectedUserId(userId);
          setSelectedMoments(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setUserIndex(nextIndex);
          setCurrentMomentIndex(0);
          setIsLoading(false);
          return;
        }
      } catch (err) { }
      nextIndex = (nextIndex + 1) % following.length;
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!following.length || selectedUserId) return;
    handleUserClick(following[0]._id);
  }, [following]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchData = async () => {
      try {
        const [userRes, momentsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/auth/following-with-moments", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setCurrentUser(userRes.data);

        const myMomentsRes = await axios.get(`http://localhost:5000/api/auth/moments/${userRes.data._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sortedMyMoments = myMomentsRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMyMoments(sortedMyMoments);
        setHasPostedToday(sortedMyMoments.length > 0);

        const others = (momentsRes.data.followingWithMoments || []).filter(u => u._id !== userRes.data._id);
        setFollowing(others);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="moments-body" onClick={() => momentTimer && clearInterval(momentTimer)}>
      <div className="moments-container">
        <div className="moments-content">

          {/* Left: Story List */}
          <div className="left-section">
            <div className="following-list">
              {currentUser && (
                <div className="following-item your-story-item" onClick={() => setShowUpload(true)}>
                  <div className={`story-ring ${hasPostedToday ? 'has-story' : 'add-story'}`}>
                    <img
                      src={currentUser.profilePic ? `http://localhost:5000${currentUser.profilePic}` : "https://picsum.photos/50"}
                      alt="You"
                      className="following-photo"
                    />
                    {!hasPostedToday && <div className="plus-icon"></div>}
                  </div>
                  <p className="following-username">Your moments</p>
                </div>
              )}

              {following.length > 0 ? following.map(user => (
                <div key={user._id} className="following-item" onClick={() => handleUserClick(user._id)}>
                  <div className="story-ring has-story">
                    <img src={user.profilePic ? `http://localhost:5000${user.profilePic}` : "https://picsum.photos/50"} alt={user.username} className="following-photo" />
                  </div>
                  <p className="following-username">{user.username}</p>
                </div>
              )) : (
                <p className="no-moments-text">No new moments from friends</p>
              )}
            </div>
          </div>

          {/* Right: Moment Viewer */}
          <div className="right-section">
            {selectedUserId && following[userIndex] && (
              <div className="user-header">
                <img src={following[userIndex].profilePic ? `http://localhost:5000${following[userIndex].profilePic}` : "https://picsum.photos/50"} alt="" className="user-photo" />
                <p className="user-username">{following[userIndex].username}</p>
              </div>
            )}

            {isLoading ? <p className="loading-text">Loading...</p> :
             selectedMoments.length > 0 ? (
              <div className="moment-card">
                <img src={`http://localhost:5000${selectedMoments[currentMomentIndex].image}`} alt="Moment" className="moment-image" />
                {selectedMoments[currentMomentIndex].caption && <p className="moment-caption">{selectedMoments[currentMomentIndex].caption}</p>}
              </div>
             ) : <p className="no-moments-text">No moments to show</p>}
          </div>
        </div>

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
          <button className="nav-button" onClick={() => { if (momentTimer) clearInterval(momentTimer); navigate("/home"); }}>Home</button>
          <button className="nav-button" onClick={() => { if (momentTimer) clearInterval(momentTimer); navigate("/moments"); }}>Moments</button>
          <button className="nav-button" onClick={() => { if (momentTimer) clearInterval(momentTimer); navigate("/search"); }}>Search</button>
          <button className="nav-button" onClick={() => { if (momentTimer) clearInterval(momentTimer); navigate("/chat"); }}>Chat</button>
          <button className="nav-button" onClick={() => { if (momentTimer) clearInterval(momentTimer); navigate("/profile"); }}>Profile</button>
        </div>

        {/* CLEAN WHITE UPLOAD MODAL WITH DELETE BUTTON */}
        {showUpload && (
          <div className="modal-overlay" onClick={() => setShowUpload(false)}>
            <div className="glimpse-upload-modal" onClick={e => e.stopPropagation()}>

              {/* Left: Current Story + Delete Button */}
              {hasPostedToday && myMoments.length > 0 && (
                <div className="current-story-preview">
                  <div className="preview-header">
                    <p>Your Current moment</p>
                    <button className="delete-story-btn" onClick={handleDeleteMyStory}>
                      Delete
                    </button>
                  </div>
                  <img src={`http://localhost:5000${myMoments[0].image}`} alt="Your story" className="current-story-img" />
                  {myMoments[0].caption && <p className="current-story-caption">{myMoments[0].caption}</p>}
                </div>
              )}

              {/* Right: Upload Section */}
              <div className={`upload-section ${!hasPostedToday ? 'full-width' : ''}`}>
                <h3>{hasPostedToday ? "Add your moments" : "Upload your Moments"}</h3>

                <div className="drop-zone" onDragOver={handleDragOver} onDrop={handleDrop} onClick={handleFileInputClick}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="preview-img" />
                  ) : (
                    <div className="placeholder-text">
                      <span role="img" aria-label="camera"></span>
                      <p>Drop image or click to select</p>
                    </div>
                  )}
                  <input id="fileInput" type="file" accept="image/*" onChange={handleFileChange} style={{display: "none"}} />
                </div>

                <input
                  type="text"
                  placeholder="Add caption..."
                  value={caption}
                  onChange={handleCaptionChange}
                  className="caption-input"
                />

                <div className="action-buttons">
                  <button className="upload-btn" onClick={handleUpload}>
                    {hasPostedToday ? "Upload Moments" : "Upload Moments"}
                  </button>
                  <button className="cancel-btn" onClick={() => setShowUpload(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MomentsPage;