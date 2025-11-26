import React, { useState, useEffect, useContext, useRef } from 'react';
import { SocketContext } from '../SocketContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../components/ChatPage.css';

const ChatPage = () => {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null); // Ref for scrolling to the latest message
  const [unreadCounts, setUnreadCounts] = useState({});

  // Fetch current user and their following users
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        const followingUsers = response.data.following.map(f => ({
          userId: f._id,
          username: f.username,
          profilePic: f.profilePic,
        }));
        setConversations(followingUsers);

        // Fetch initial unread counts from backend
        const unreadResponse = await axios.get('http://localhost:5000/api/messages/unread', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCounts(unreadResponse.data || {});
      } catch (error) {
        console.error('Error fetching user or unread counts:', error);
        // Fallback to empty object if backend call fails
        const initialUnread = {};
        followingUsers.forEach(conv => {
          initialUnread[conv.userId] = 0;
        });
        setUnreadCounts(initialUnread);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch messages for selected user and scroll to bottom
  useEffect(() => {
    if (selectedUser && user) {
      const fetchMessages = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`http://localhost:5000/api/messages/${selectedUser.userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMessages(response.data);
          setUnreadCounts(prev => ({ ...prev, [selectedUser.userId]: 0 }));
          // Scroll to bottom after messages are loaded
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };
      fetchMessages();
    }
  }, [selectedUser, user]);

  // Handle real-time messages and scroll
  useEffect(() => {
    if (socket && user) {
      // Join the user's own room
      socket.emit('join', user._id);
      
      // Join the selected user's room if a conversation is active
      if (selectedUser) {
        socket.emit('join', selectedUser.userId);
      }

      // Clean up existing listener to avoid duplicates
      socket.off('receiveMessage');
      socket.on('receiveMessage', (message) => {
        console.log('Message received:', message);
        // Only update if the message is not from the sender themselves
        if (
          (message.sender._id === selectedUser?.userId && message.receiver._id === user._id) ||
          (message.sender._id !== user._id && message.receiver._id === selectedUser?.userId)
        ) {
          setMessages((prev) => [...prev, message]);
          // Scroll to bottom when a new message is received
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }
        if (selectedUser?.userId !== message.sender._id) {
          setUnreadCounts(prev => ({
            ...prev,
            [message.sender._id]: (prev[message.sender._id] || 0) + 1,
          }));
        }
      });

      return () => {
        socket.off('receiveMessage');
        socket.emit('leave', user._id);
        if (selectedUser) {
          socket.emit('leave', selectedUser.userId);
        }
      };
    }
  }, [socket, user, selectedUser]);

  // Send message and scroll to bottom
  const sendMessage = () => {
    if (messageInput.trim() && selectedUser && user) {
      const newMessage = {
        sender: { _id: user._id, username: user.username },
        receiver: { _id: selectedUser.userId, username: selectedUser.username },
        content: messageInput,
        timestamp: new Date(),
      };
      socket.emit('sendMessage', {
        senderId: user._id,
        receiverId: selectedUser.userId,
        content: messageInput,
      });
      // Optimistically update the sender's messages
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput('');
      // Scroll to bottom after sending
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="chat-container">
      {/* Conversation List */}
      <div className="conversation-list">
        <h2 className="conversation-title">Conversations</h2>
        {conversations.length === 0 ? (
          <p className="no-conversations">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.userId}
              className={`conversation-item ${selectedUser?.userId === conv.userId ? 'active' : ''}`}
              onClick={() => setSelectedUser(conv)}
            >
              {conv.profilePic && (
                <img
                  src={`http://localhost:5000${conv.profilePic}`}
                  alt={`${conv.username}'s profile`}
                  className="conversation-profile-pic"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                />
              )}
              <div>
                <p className="conversation-username">{conv.username}</p>
                {unreadCounts[conv.userId] > 0 && (
                  <span className="unread-count">{unreadCounts[conv.userId]}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        {selectedUser ? (
          <>
            <h2 className="chat-title">{selectedUser.username}</h2>
            <div className="chat-messages">
              {messages.map((msg, index) => {
                const messageDate = new Date(msg.timestamp);
                const prevMessage = messages[index - 1];
                const prevMessageDate = prevMessage ? new Date(prevMessage.timestamp) : null;

                // Check if this is the first message of a new day
                const isNewDay = !prevMessageDate ||
                  messageDate.toDateString() !== prevMessageDate.toDateString();

                // Format time as "8:47 AM"
                const timeString = messageDate.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });

                // Format date for the header
                const formatDateHeader = (date) => {
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);

                  if (date.toDateString() === today.toDateString()) return 'Today';
                  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
                  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
                };

                return (
                  <React.Fragment key={index}>
                    {/* Date Separator */}
                    {isNewDay && (
                      <div className="date-separator">
                        <span>{formatDateHeader(messageDate)}</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`message ${msg.sender._id === user._id ? 'sent' : 'received'}`}
                    >
                      <p className="message-content">{msg.content}</p>
                      <small className="message-timestamp">{timeString}</small>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="message-input">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <p className="no-conversation">Select a user to start chatting</p>
        )}
      </div>

      {/* Bottom Navigation Block */}
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
  );
};

export default ChatPage;