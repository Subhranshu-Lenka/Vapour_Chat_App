import { useState, useEffect, useRef, use } from "react";
import { io } from "socket.io-client";
import "./App.css";

function App() {
  const host = window.location.hostname; // e.g. "localhost"
  const port = window.location.port; // e.g. "5173"
  const protocol = window.location.protocol; // "http:" or "https:"
  const socketRef = useRef(null);

  const [chatHistory, setChatHistory] = useState({});

  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [socketNotification, setSocketNotification] = useState("");
  const [username, setUsername] = useState("");
  const [inputName, setInputName] = useState("");
  const [status, setStatus] = useState("");

  //------------------------------------
  const [selectedChat, setSelectedChat] = useState(null);
  //------------------------------------

  console.log({ chatHistory });

  useEffect(() => {
    socketRef.current = io(`${protocol}//${host}:8069`, {
      autoConnect: false,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server with ID:", socket.id);
      setIsConnected(true);
      if (isRegistered) {
        console.log("Re-registering with same username:", username);
        socket.emit("register", { username });
      }
    });

    socket.on("disconnect", () => {
      console.log("Dis-Connected from server");
      setIsConnected(false);
    });

    socket.on("notification", (data) => {
      console.log("Received notification:");
      setSocketNotification(data.message);
      console.log({ socketNotification });
    });

    socket.on("register-response", (response) => {
      if (response.success) {
        setIsRegistered(true);
        setUsername(response.username || inputName.trim());
        setStatus("✅ Registered successfully");
        console.log("Registered successfully with server");
      } else {
        setStatus(`❌ Registration failed: ${response.message}`);
        console.log("Registration failed:", response.message);
        if (isRegistered) {
          setIsRegistered(false);
          setUsername("");
          setStatus("Please register again");
        }
      }
    });

    socket.on("receive-message", (data) => {
      const from = data.from;
      const message = data.message;
      const msg = { from, message, timestamp: new Date() };

      console.log(
        `Message received from ${data.from}: ${data.message} : at ${msg.timestamp}`
      );

      setChatHistory((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), msg],
      }));
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }

      socket.removeAllListeners();
    };
  }, []);

  const toggleConnection = () => {
    const socket = socketRef.current;
    if (!socket) return;

    if (isConnected) {
      console.log("Disconnecting Client");
      socket.disconnect();
    } else {
      console.log("Connecting Client");
      socket.connect();
    }
  };

  const registerHandler = () => {
    if (!inputName.trim()) {
      setStatus("Username cannot be empty");
      return;
    }

    const socket = socketRef.current;

    socket.emit("register", { username: inputName.trim() });
    console.log("Registering with username:", inputName.trim());
  };

  return (
    <>
      <div>
        <h2>Chat App is running on :</h2>
        <p>{`${protocol}//${host}:${port}`}</p>
        <br />

        {isConnected ? (
          isRegistered ? (
            <p style={{ fontSize: "36px" }}>Welcome : {username} !</p>
          ) : (
            <div style={{ margin: "20px" }}>
              <input
                type="text"
                placeholder="Enter Username"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                className="text-input"
              />
              <button onClick={registerHandler}>Register</button>
              <br />
              <p>{status}</p>
            </div>
          )
        ) : (
          <p>You're Disconnected</p>
        )}

        <button onClick={toggleConnection}
        style={{margin:"10px"}}
        >
          {isConnected ? "Dis-Connect" : "Connect"}
        </button>
        <br />
        <div>
          <p>{socketNotification}</p>
        </div>
      </div>

      {isConnected && isRegistered && (
        <div className="messaging-section">
          <div className="messaging-card">
            <h2>Send Message</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const to = e.target[0].value.trim();
                const message = e.target[1].value.trim();
                if (to && message) {
                  const msg = {
                    from: "me",
                    to,
                    message,
                    timestamp: new Date(),
                  };

                  socketRef.current.emit("send-message", { to, message });
                  console.log("Sent message to", to);

                  setChatHistory((prev) => ({
                    ...prev,
                    [to]: [...(prev[to] || []), msg],
                  }));

                  // Reset message input but keep recipient
                  e.target[1].value = "";
                }
              }}
              className="message-form"
            >
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Recipient username"
                  className="text-input"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="text-input"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Send Message
              </button>
            </form>
          </div>

          <div className="chat-history-section">
            <h2>Your Conversations</h2>
            <div className="chat-layout">
              {/* Contacts List Sidebar */}
              <div className="contacts-sidebar">
                <div className="contacts-header">
                  <h3>Contacts</h3>
                  <span className="contacts-count">
                    {Object.keys(chatHistory).length} conversations
                  </span>
                </div>

                {Object.keys(chatHistory).length === 0 ? (
                  <div className="empty-contacts">
                    <p>No conversations yet</p>
                    <small>Start a conversation by sending a message</small>
                  </div>
                ) : (
                  <div className="contacts-list">
                    {Object.entries(chatHistory).map(([user, messages]) => (
                      <div
                        key={user}
                        className={`contact-item ${
                          selectedChat === user ? "active" : ""
                        }`}
                        onClick={() => setSelectedChat(user)}
                      >
                        <div className="contact-avatar">
                          {user.charAt(0).toUpperCase()}
                        </div>
                        <div className="contact-info">
                          <div className="contact-name">{user}</div>
                          <div className="last-message">
                            {messages.length > 0
                              ? `${
                                  messages[messages.length - 1].from === "me"
                                    ? "You: "
                                    : ""
                                }${messages[messages.length - 1].message}`
                              : "No messages yet"}
                          </div>
                        </div>
                        <div className="contact-meta">
                          <div className="message-count">{messages.length}</div>
                          {messages.length > 0 && (
                            <div className="last-time">
                              {new Date(
                                messages[messages.length - 1].timestamp
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Thread Main Area */}
              <div className="chat-main">
                {!selectedChat ? (
                  <div className="no-chat-selected">
                    <div className="selection-prompt">
                      <h3>Select a conversation</h3>
                      <p>
                        Choose a contact from the list to view your messages
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="active-chat">
                    <div className="chat-header">
                      <button
                        className="back-button"
                        onClick={() => setSelectedChat(null)}
                        aria-label="Back to contacts"
                      >
                        ← Back
                      </button>
                      <div className="chat-partner">
                        <div className="partner-avatar">
                          {selectedChat.charAt(0).toUpperCase()}
                        </div>
                        <div className="partner-info">
                          <h3>{selectedChat}</h3>
                          <span className="partner-status">Active</span>
                        </div>
                      </div>
                      <div className="chat-actions">
                        <span className="total-messages">
                          {chatHistory[selectedChat]?.length || 0} messages
                        </span>
                      </div>
                    </div>

                    <div className="messages-container">
                      {chatHistory[selectedChat]?.length === 0 ? (
                        <div className="empty-chat">
                          <p>No messages with {selectedChat} yet</p>
                          <small>
                            Send a message to start the conversation
                          </small>
                        </div>
                      ) : (
                        chatHistory[selectedChat]?.map((msg, index) => (
                          <div
                            key={index}
                            className={`message ${
                              msg.from === "me"
                                ? "message-sent"
                                : "message-received"
                            }`}
                          >
                            <div className="message-content">
                              <div className="message-text">{msg.message}</div>
                              <div className="message-time">
                                {new Date(msg.timestamp).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/*
{isConnected && isRegistered && (
  <div>
    <h2>Messaging Section</h2>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        const to = e.target[0].value.trim();
        const message = e.target[1].value.trim();
        if (to && message) {
          const msg = { from: "me", to, message, timestamp: new Date() };

          socketRef.current.emit("send-message", { to, message });
          console.log("Sent message to", to);

          setChatHistory((prev) => ({
            ...prev,
            [to]: [...(prev[to] || []), msg],
          }));
        }
      }}
      className="form-group"
    >
      <input
        type="text"
        placeholder="Recipient Username"
        className="text-input"
      />
      <br />
      <input type="text" placeholder="Message" className="text-input" />
      <br />
      <button type="submit">Send Message</button>
    </form>

    <br />
    <h2>Recieved Messages</h2>
    <p>
      {Object.entries(chatHistory).map(([user, messages]) => (
        <div
          key={user}
          style={{
            border: "1px solid black",
            margin: "10px",
            padding: "10px",
          }}
        >
          <h3>Chat with {user} :</h3>
          {messages.map((msg, index) => (
            <p
              key={index}
              style={{ textAlign: msg.from === "me" ? "right" : "left" }}
            >
              <strong>{msg.from}:</strong> {msg.message} <br />
            </p>
          ))}
        </div>
      ))}
    </p>
  </div>
)}
*/
export default App;
