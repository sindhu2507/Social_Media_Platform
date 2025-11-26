import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Assuming you're using axios for API calls
import "../components/HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFollowingPosts = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found, redirecting to login");
        navigate("/login");
        return;
      }

      try {
        const meResponse = await axios.get("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = meResponse.data;
        console.log("Fetched user data:", user);
        const followingIds = user.following.map(f => f._id || (f && f._id ? f._id : null)).filter(id => id);
        console.log("Extracted followingIds:", followingIds);

        if (followingIds.length > 0) {
          const postsResponse = await axios.get("http://localhost:5000/api/auth/posts/following", {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log("Raw posts response:", postsResponse);
          console.log("Fetched posts data:", postsResponse.data);
          const postsData = Array.isArray(postsResponse.data) 
            ? postsResponse.data 
            : postsResponse.data.posts || postsResponse.data || [];
          console.log("Processed posts data:", postsData);
          setPosts(postsData);
        } else {
          console.log("No following users found.");
          setPosts([]);
        }
      } catch (err) {
        console.error("Error fetching following posts:", {
          message: err.message,
          response: err.response ? err.response.data : "No response data",
          status: err.response ? err.response.status : "No status",
        });
        setError("Failed to load posts. Please try again later.");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingPosts();
  }, [navigate]);

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found for like action");
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/auth/like-post/${postId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Like response:", response.data);
      setPosts(posts.map(p =>
        p._id === postId ? { ...p, likesCount: response.data.likes, userLiked: response.data.userLiked } : p
      ));
    } catch (err) {
      console.error("Like action failed:", err);
    }
  };

  /*const handleSearchClick = () => {
    console.log("Search button clicked, attempting to navigate to /search");
    navigate("/search");
  };*/

  /*const handleButtonClick = (path) => {
    console.log(`Button clicked for path: ${path}`);
    navigate(path);
  };*/

  return (
    <div className="home-body">
    <div className="home-container">
      {/* Main Content */}
      <div className="home-content">
        
        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : posts.length > 0 ? (
          <div className="home-posts-block"> {/* New scrollable block */}
            <div className="home-posts-grid">
              {posts.map((post) => (
                <div key={post._id} className="home-post-item">
                  <div className="home-post-header">
                    <img
                      src={`http://localhost:5000${post.user.profilePic || "/uploads/profilepics/default.jpg"}`}
                      alt={`${post.user.username}'s profile`}
                      className="home-post-profile-pic"
                      onError={(e) => (e.target.src = "https://via.placeholder.com/40")}
                    />
                    <span className="home-post-username">{post.user.username}</span>
                  </div>
                  <img
                    src={`http://localhost:5000${post.image}`}
                    alt={post.caption || "Post image"}
                    className="home-post-image"
                    onError={(e) => (e.target.src = "https://via.placeholder.com/300")}
                  />
                  <p className="home-post-caption">{post.caption || "No caption"}</p>
                  <p className="home-post-date">
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="button-group">
                      <button
                        className={`like-button ${post.userLiked ? "liked" : ""}`}
                        onClick={() => handleLike(post._id)}
                      >
                        👍 {post.likesCount || 0}
                      </button>
                      
                    </div>
                  
                </div>
              ))}
            </div>
          </div>
          
        ) : (
          <p className="no-posts">No posts from people you follow yet. Start following users to see their posts!</p>
        )}
      </div>

      
      <div className="bottom-block">
        <h1>
          <img 
        src="/logo.png" 
        alt="Glimpse Logo" 
        className="glimpse-logo"
            />
        Glimpse
        </h1>
        <button className="nav-button" onClick={() => navigate("/home")}>
          Home
        </button>
        <button className="nav-button" onClick={() => navigate("/moments")}>
          Moments
        </button>
        <button className="nav-button" onClick={() => navigate("/search")}>
          Search
        </button>
        <button className="nav-button" onClick={() => navigate("/chat")}>
          Chat
        </button>
        <button className="nav-button" onClick={() => navigate("/profile")}>
          Profile
        </button>
      </div>
    </div>
    </div>
  );
};

export default HomePage;