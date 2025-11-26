import React, { useState, useEffect } from "react";
import axios from "axios";
import "../components/ProfileModal.css";

const ProfileModal = ({ userId, onClose, token, currentUserId }) => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!token || !userId || !currentUserId) return;

      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:5000/api/auth/me?userId=${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const userData = response.data;

        const follows = userData.followers.some(
          (f) => f._id === currentUserId
        );
        setIsFollowing(follows);

        const postsWithLikes = (userData.posts || []).map((post) => ({
          ...post,
          likes: post.likes?.length || 0,
          userLiked:
            post.likes?.some((l) => l.user.toString() === currentUserId) ||
            false,
        }));

        setUser(userData);
        setPosts(postsWithLikes);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, token, currentUserId]);

  const handleFollowToggle = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/follow",
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsFollowing(res.data.isFollowing);
      setUser((prev) => ({
        ...prev,
        followers: res.data.isFollowing
          ? [...prev.followers, { _id: currentUserId }]
          : prev.followers.filter((f) => f._id !== currentUserId),
      }));
    } catch (err) {
      alert("Follow/Unfollow failed!");
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await axios.post(
        `http://localhost:5000/api/auth/like-post/${postId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, likes: res.data.likes, userLiked: res.data.userLiked }
            : p
        )
      );
    } catch (err) {
      console.error("Like failed");
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <img
            src={
              user.profilePic
                ? `http://localhost:5000${user.profilePic}`
                : "https://via.placeholder.com/100"
            }
            alt={user.username}
            className="modal-profile-pic"
          />

          <div className="modal-user-info">
            <h2>{user.username}</h2>

            <div className="stats-grid">
              <p><strong>{posts.length}</strong> posts</p>
              <p><strong>{user.followers.length}</strong> followers</p>
              <p><strong>{user.following.length}</strong> following</p>
            </div>

            {userId !== currentUserId && (
              <button
                onClick={handleFollowToggle}
                className={`follow-btn ${isFollowing ? "following" : ""}`}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </button>
            )}
          </div>

          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-posts">
          {posts.length === 0 ? (
            <p style={{ textAlign: "center", padding: "40px", color: "#888" }}>
              No posts yet
            </p>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="post-block">
                <img
                  src={`http://localhost:5000${post.image}`}
                  alt="post"
                  className="post-image"
                />
                <p>{post.caption || "No caption"}</p>
                <div className="post-actions">
                  <button
                    className={`like-button ${post.userLiked ? "liked" : ""}`}
                    onClick={() => handleLike(post._id)}
                  >👍
                    {post.likes}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;