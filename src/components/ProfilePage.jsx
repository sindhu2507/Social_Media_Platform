import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfilePage.css";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profilePic, setProfilePic] = useState(null);
  const [preview, setPreview] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("bio...");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [newPostPhoto, setNewPostPhoto] = useState(null);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [postUploading, setPostUploading] = useState(false);
  const [postPreview, setPostPreview] = useState("");
  const [isMockMode, setIsMockMode] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [menuOpenPostId, setMenuOpenPostId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editProfilePic, setEditProfilePic] = useState(null);
  const [editPreview, setEditPreview] = useState("");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.data;
        if (!data.username || !data.posts || !data.following || !data.followers) {
          throw new Error("Incomplete user data received");
        }
        setUsername(data.username || "Unnamed User");
        setPreview(data.profilePic ? `http://localhost:5000${data.profilePic}` : "");
        setBio(data.bio || "");

        setEditUsername(data.username || "Unnamed User"); // Added: Initialize editUsername
        setEditBio(data.bio || ""); // Added: Initialize editBio
        setEditPreview(data.profilePic ? `http://localhost:5000${data.profilePic}` : ""); // Added: Initialize editPreview

        const postsWithLikes = (data.posts || []).map(post => ({
          ...post,
          likes: post.likes ? post.likes.length : 0,
          userLiked: post.userLiked || false,
        }));
        setPosts(postsWithLikes);
        setFollowingCount(data.following?.length || 0);
        setFollowersCount(data.followers?.length || 0);
      } catch (error) {
        setIsMockMode(true);
        setUsername("TestUser");
        setBio("..");
        setPosts([]);
        setFollowingCount(0);
        setFollowersCount(0);

        setEditUsername("TestUser"); // Added: Initialize editUsername for mock mode
        setEditBio(".."); // Added: Initialize editBio for mock mode

        
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate, refreshTrigger]);

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreview(URL.createObjectURL(file));
      if (!isMockMode) uploadProfilePicture(file);
    }
  };

  const uploadProfilePicture = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/auth/upload-profile-pic",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setPreview(`http://localhost:5000${response.data.profilePic}`);
      alert("Profile picture uploaded successfully!");
    } catch (error) {
      alert("Failed to upload profile picture.");
      setPreview("");
      setProfilePic(null);
    } finally {
      setUploading(false);
    }
  };

  const handlePostPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewPostPhoto(file);
      setPostPreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostPhoto) {
      alert("Please select a photo.");
      return;
    }

    setPostUploading(true);
    const formData = new FormData();
    formData.append("postImage", newPostPhoto);
    formData.append("caption", newPostCaption);

    if (isMockMode) {
      const mockPost = {
        _id: Date.now().toString(),
        photo: URL.createObjectURL(newPostPhoto),
        caption: newPostCaption || "No caption",
        createdAt: new Date(),
        likes: 0,
        userLiked: false,
      };
      setPosts([mockPost, ...posts]);
      setNewPostPhoto(null);
      setNewPostCaption("");
      setPostPreview("");
      setPostUploading(false);
      setIsCreatePostOpen(false);
    } else {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          "http://localhost:5000/api/auth/create-post",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        const newPost = { ...response.data.post, createdAt: new Date(), likes: 0, userLiked: false };
        setPosts([newPost, ...posts]);
        setNewPostPhoto(null);
        setNewPostCaption("");
        setPostPreview("");
        setIsCreatePostOpen(false);
      } catch (error) {
        alert("Failed to create post.");
      } finally {
        setPostUploading(false);
      }
    }
  };

  const handleDeletePost = (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    if (isMockMode) {
      setPosts(posts.filter((post) => post._id !== postId));
    } else {
      try {
        const token = localStorage.getItem("token");
        axios.delete(`http://localhost:5000/api/auth/delete-post/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts(posts.filter((post) => post._id !== postId));
        alert("Post deleted successfully!");
      } catch (error) {
        alert("Failed to delete post.");
      }
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/auth/like-post/${postId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && typeof response.data.likes !== "undefined" && typeof response.data.userLiked !== "undefined") {
        setPosts(posts.map(p =>
          p._id === postId ? { ...p, likes: response.data.likes, userLiked: response.data.userLiked } : p
        ));
      } else {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleEdit = (postId) => {
    const postToEdit = posts.find((post) => post._id === postId);
    if (postToEdit) {
      const newCaption = prompt("Edit caption:", postToEdit.caption);
      if (newCaption !== null && newCaption.trim()) {
        setPosts(posts.map((post) =>
          post._id === postId ? { ...post, caption: newCaption.trim() } : post
        ));
      }
    }
    setMenuOpenPostId(null);
  };

  const toggleMenu = (postId) => {
    setMenuOpenPostId(menuOpenPostId === postId ? null : postId);
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/");
    }
  };

  const handleCreatePostClick = () => {
    setIsCreatePostOpen(true); 
  };

  // Updated: Handle opening the edit profile modal
  const handleEditProfile = () => {
    setIsEditProfileOpen(true);
  };

  // Added: Handle saving the edited profile
  const handleSaveProfile = async () => {
    if (isMockMode) {
      setUsername(editUsername);
      setBio(editBio);
      setPreview(editPreview);
      setIsEditProfileOpen(false);
      alert("Profile updated successfully (mock mode)!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("username", editUsername);
      formData.append("bio", editBio);
      if (editProfilePic) formData.append("profilePic", editProfilePic);

      const response = await axios.put(
        "http://localhost:5000/api/auth/update-profile",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setUsername(response.data.username);
      setBio(response.data.bio);
      setPreview(response.data.profilePic ? `http://localhost:5000${response.data.profilePic}` : preview);
      setIsEditProfileOpen(false);
      setRefreshTrigger(prev => prev + 1);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error.response ? error.response.data : error.message);
      alert("Failed to update profile. Check console for details.");
    }
  };

  // Added: Handle profile picture change in edit modal
  const handleEditProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditProfilePic(file);
      setEditPreview(URL.createObjectURL(file));
    }
  };



  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpenPostId && !event.target.closest(".menu-button") && !event.target.closest(".menu-dropdown")) {
        setMenuOpenPostId(null);
      }
      if (profileMenuOpen && !event.target.closest(".profile-menu-button") && !event.target.closest(".profile-menu-dropdown")) {
        setProfileMenuOpen(false);
      }
      if (isCreatePostOpen && !event.target.closest(".create-post-form-sidebar") && !event.target.closest(".create-post")) {
        setIsCreatePostOpen(false); // Close create post modal on outside click
      }
      if (isEditProfileOpen && !event.target.closest(".edit-profile-content") && !event.target.closest(".profile-menu-option")) {
        setIsEditProfileOpen(false); // Close edit profile modal on outside click
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpenPostId, profileMenuOpen]);


  return (
    <div className="profile-container">
      {loading ? (
        <div className="loading">Loading profile...</div>
      ) : (
        <div className="profile-layout">
          <div className="profile-sidebar">
            <button className="profile-menu-button" onClick={toggleProfileMenu}>⋮</button>
            {profileMenuOpen && (
              <div className="profile-menu-dropdown">
                <button className="profile-menu-option" onClick={handleEditProfile}>
                  Edit the profile
                </button>
                <button className="profile-menu-option" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
            <div className="profile-info">
              <label className="profilepage-profile-photo">
                
                {preview ? (
                  <img src={preview} alt="Profile" className="profile-preview-image" />
                ) : (
                  <div className="default-icon">Add Photo</div>
                )}
              </label>
              <div className="profile-username">{username}</div>
              <div className="bio">{bio}</div>
            </div>
            <div className="profile-stats">
              <div className="stat">
                <div className="stat-label">Following</div>
                <div className="stat-number">{followingCount}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Followers</div>
                <div className="stat-number">{followersCount}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Posts</div>
                <div className="stat-number">{posts.length}</div>
              </div>
              <button className="create-post" onClick={handleCreatePostClick}>
                Create a Post
              </button>
            </div>
          </div> 

          <div className="posts-section">
            <h3>Your Posts</h3>
            {posts.length === 0 ? (
              <p>No posts available</p>
            ) : (
              <div className="posts-grid">
                {posts.map((post) => (
                  <div key={post._id} className="post-item">
                    <img
                      src={isMockMode ? post.photo : `http://localhost:5000${post.image}`}
                      alt="Post"
                      className="post-image"
                      onError={(e) => (e.target.src = "https://via.placeholder.com/300")}
                    />
                    <p className="post-caption">{post.caption}</p>
                    <p className="post-date">
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <div className="post-actions">
                      <button
                        className={`like-button ${post.userLiked ? "liked" : ""}`}
                        onClick={() => handleLike(post._id)}
                      >
                        👍 {post.likes}
                      </button>
                      
                      <button
                        className="menu-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(post._id);
                        }}
                      >
                        ⋮
                      </button>
                      {menuOpenPostId === post._id && (
                        <div className="menu-dropdown">
                          <button
                            className="menu-option"
                            onClick={() => handleEdit(post._id)}
                          >
                            Edit the post
                          </button>
                          <button
                            className="menu-option"
                            onClick={() => handleDeletePost(post._id)}
                          >
                            Delete the post
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
      )}
      {/* Added: Edit profile modal */}
      {isEditProfileOpen && (
        <div className="edit-profile-modal">
          <div className="edit-profile-content">
            <button  className="edit-profile-wrong"onClick={() => setIsEditProfileOpen(false)}>✕</button>
            <h2>Edit Profile</h2>
            <label>
              Profile Picture:
              <input
                type="file"
                accept="image/*"
                onChange={handleEditProfilePicChange}
              />
              {editPreview && (
                <img src={editPreview} alt="Edit Preview" className="edit-preview-image" />
              )}
            </label>
            <label>
              Username:
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </label>
            <label>
              Bio:
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </label>
            <button className="edit-profile-save"onClick={handleSaveProfile}>Save</button>
            
          </div>
        </div>
      )}
      {/* Create Post Modal */}
      {isCreatePostOpen && (
        <div className="edit-profile-modal"> {/* Reuse edit-profile-modal for overlay */}
          <div className="create-post-form-sidebar">
            <button className="edit-profile-wrong" onClick={() => setIsCreatePostOpen(false)}>✕</button>
            <h3>Create a Post</h3>
            <form onSubmit={handleCreatePost}>
              <label className="create-post-photo-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePostPhotoChange}
                  style={{ display: "none" }}
                  disabled={postUploading}
                />
                {postPreview ? (
                  <img
                    src={postPreview}
                    alt="Post Preview"
                    className="create-post-preview-image"
                  />
                ) : (
                  <div className="create-post-photo-placeholder">Choose Photo</div>
                )}
              </label>
              <textarea
                className="create-post-caption"
                placeholder="Write a caption..."
                value={newPostCaption}
                onChange={(e) => setNewPostCaption(e.target.value)}
                disabled={postUploading}
              />
              <button
                type="submit"
                className="create-post-button"
                disabled={postUploading}
              >
                {postUploading ? "Posting..." : "Post"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;