import React, { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./App.css";

const socket = io("http://localhost:4000");

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [users, setUsers] = useState([]);
  const [receiver, setReceiver] = useState(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const fetchUsers = useCallback(async () => {
    const res = await axios.get("http://localhost:4000/users");
    setUsers(res.data.filter((u) => u._id !== user?._id));
  }, [user]);

  useEffect(() => {
    if (!user) return;

    socket.emit("addUser", user._id);
    fetchUsers();

    const handleNewUser = () => {
      fetchUsers();
    };

    socket.on("newUserRegistered", handleNewUser);

    return () => {
      socket.off("newUserRegistered", handleNewUser);
    };
  }, [user, fetchUsers]);

  useEffect(() => {
    if (user && receiver) {
      axios.get(`http://localhost:4000/messages?senderId=${user._id}&receiverId=${receiver._id}`)
        .then(res => setChat(res.data));
    }
  }, [receiver, user]);

  useEffect(() => {
    socket.on("receiveMessage", ({ senderId, message }) => {
      if (receiver && senderId === receiver._id) {
        setChat(prev => [...prev, { senderId, receiverId: user._id, message }]);
      }
    });
  }, [receiver, user]);

  const handleSend = () => {
    if (!user || !receiver || !message) return;
    const msgObj = { senderId: user._id, receiverId: receiver._id, message };
    socket.emit("sendMessage", msgObj);
    axios.post("http://localhost:4000/messages", msgObj);
    setChat([...chat, msgObj]);
    setMessage("");
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (authMode === "login") {
        res = await axios.post("http://localhost:4000/login", {
          email: form.email,
          password: form.password,
        });
      } else {
        res = await axios.post("http://localhost:4000/users", form);
      }
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (err) {
      alert(err.response?.data?.error || "Authentication failed");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setUsers([]);
    setReceiver(null);
    setChat([]);
    setMessage("");
  };

  return (
    <div className="app">
      {!user ? (
        <div className="auth-container">
          <h2>{authMode === "login" ? "Login" : "Register"}</h2>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button type="submit">{authMode === "login" ? "Login" : "Register"}</button>
          </form>
          <p>
            {authMode === "login" ? "Don't have an account?" : "Already have an account?"} {" "}
            <span onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} className="auth-toggle">
              {authMode === "login" ? "Register" : "Login"}
            </span>
          </p>
        </div>
      ) : (
        <div className="chat-container">
          <div className="user-list">
            <h3>Contacts</h3>
            <button onClick={handleLogout}>Logout</button>
            {users.map(u => (
              <div key={u._id} className={`user-item ${receiver && receiver._id === u._id ? 'active' : ''}`} onClick={() => setReceiver(u)}>
                {u.name}
              </div>
            ))}
          </div>
          <div className="chat-area">
            {receiver ? (
              <>
                <h4>Chat with {receiver.name}</h4>
                <div className="chat-box">
                  {chat.map((msg, i) => (
                    <div
                      key={i}
                      className={`chat-msg ${msg.senderId === user._id ? 'own' : 'received'}`}
                    >
                      {msg.message}
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button onClick={handleSend}>Send</button>
                </div>
              </>
            ) : <p>Select a user to chat.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;