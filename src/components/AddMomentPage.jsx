import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AddMomentPage = () => {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) return alert("Please select an image");

    const formData = new FormData();
    formData.append("image", image);
    formData.append("caption", caption);

    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5000/auth/api/moments", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      alert("Moment uploaded!");
      navigate("/moments");
    } catch (err) {
      console.error(err);
      alert("Failed to upload moment");
    }
  };

  return (
    <div className="add-moment-container">
      <h2>Add Today's Moment</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
        <input type="text" placeholder="Enter caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <button type="submit">Post Moment</button>
      </form>
    </div>
  );
};

export default AddMomentPage;
