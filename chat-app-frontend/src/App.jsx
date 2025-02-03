import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5000");

function App() {
    const [username, setUsername] = useState("");
    const [users, setUsers] = useState([]);
    const [chats, setChats] = useState({});
    const [unreadMessages, setUnreadMessages] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [activeChat, setActiveChat] = useState(null);
    const [message, setMessage] = useState("");
    const [typingUser, setTypingUser] = useState("");
    const [isUsernameSet, setIsUsernameSet] = useState(false);

    useEffect(() => {
        socket.on("receive_private_message", ({ sender, text }) => {
            setChats((prevChats) => ({
                ...prevChats,
                [sender]: [...(prevChats[sender] || []), { sender, text, self: false }]
            }));
            setLastMessages((prev) => ({ ...prev, [sender]: text }));
        });

        socket.on("update_users", (userList) => {
            setUsers(userList.filter((user) => user !== username));
        });

        socket.on("update_unread_messages", (unread) => {
            setUnreadMessages(unread);
        });

        socket.on("user_typing", (sender) => {
            setTypingUser(sender);
        });

        socket.on("user_stopped_typing", () => {
            setTypingUser("");
        });

        return () => {
            socket.off("receive_private_message");
            socket.off("update_users");
            socket.off("update_unread_messages");
            socket.off("user_typing");
            socket.off("user_stopped_typing");
        };
    }, [username]);

    const joinChat = () => {
        if (username.trim() !== "") {
            socket.emit("join", username);
            setIsUsernameSet(true);
        }
    };

    const sendMessage = () => {
        if (message.trim() !== "" && activeChat) {
            const messageData = { sender: username, recipient: activeChat, text: message };
            socket.emit("send_private_message", messageData);
            setChats((prevChats) => ({
                ...prevChats,
                [activeChat]: [...(prevChats[activeChat] || []), { sender: username, text: message, self: true }]
            }));
            setLastMessages((prev) => ({ ...prev, [activeChat]: message }));
            setMessage("");
            socket.emit("stop_typing", { recipient: activeChat });
        }
    };

    const handleTyping = () => {
        if (message.trim() !== "") {
            socket.emit("typing", { sender: username, recipient: activeChat });
        } else {
            socket.emit("stop_typing", { recipient: activeChat });
        }
    };

    const openChat = (user) => {
        setActiveChat(user);
        setUnreadMessages((prev) => {
            const newUnread = { ...prev };
            delete newUnread[user];
            return newUnread;
        });
        socket.emit("mark_messages_as_read", { user: username, sender: user });
    };

    return (
      <div className="h-screen bg-gray-100 flex flex-col md:flex-row">
          {!isUsernameSet ? (
              <div className="m-auto bg-white p-6 rounded-lg shadow-md w-80">
                  <h2 className="text-xl font-bold text-center mb-4">Enter Your Username</h2>
                  <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full border p-2 rounded-md mb-4"
                  />
                  <button onClick={joinChat} className="w-full bg-blue-500 text-white p-2 rounded-md">
                      Join Chat
                  </button>
              </div>
          ) : (
              <div className="flex flex-col md:flex-row w-full h-screen">
                  <div className="w-full md:w-1/4 bg-gray-800 text-white p-4">
                      <h2 className="text-lg font-bold mb-4">TalkHub</h2>
                      <h2 className="text-lg font-bold">Active Users</h2>
                      {users.map((user, index) => (
                          <button
                              key={index}
                              onClick={() => openChat(user)}
                              className={`w-full p-2 text-left mt-2 rounded-md flex justify-between hover:bg-gray-700 ${
                                  activeChat === user ? "bg-green-500" : ""
                              }`}
                          >
                              <div>
                                  {user} {unreadMessages[user] && (
                                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadMessages[user]}</span>
                                  )}
                              </div>
                              <span className="text-sm text-gray-300">
                                  {lastMessages[user] ? lastMessages[user].slice(0, 20) + "..." : ""}
                              </span>
                          </button>
                      ))}
                  </div>
  
                  <div className="w-full md:w-3/4 flex flex-col bg-white shadow-lg rounded-lg">
                      {activeChat ? (
                          <>
                              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                                  <h2 className="text-lg font-semibold">{activeChat}</h2>
                              </div>
  
                              <div className="flex-1 overflow-y-scroll p-4 flex flex-col bg-gray-100 mb-20"> {/* Ensure scrollable area is above input */}
                                  {chats[activeChat]?.map((msg, index) => (
                                      <div key={index} className={`p-2 max-w-xs rounded-lg ${msg.self ? "ml-auto bg-blue-500 text-white" : "mr-auto bg-gray-300 text-black"}`}>
                                          <p className="text-sm">{msg.text}</p>
                                      </div>
                                  ))}
                              </div>
  
                              {typingUser === activeChat && <p className="text-gray-500 p-2">{activeChat} is typing...</p>}
  
                              {/* Fixed position input field at the bottom */}
                              <div className="p-3 flex border-t bg-white fixed bottom-0 left-0 w-full z-10">
                                  <input
                                      type="text"
                                      value={message}
                                      onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                                      placeholder="Type a message..."
                                      className="flex-grow p-2 border rounded-l-md"
                                  />
                                  <button onClick={sendMessage} className="bg-green-600 text-white px-4 rounded-r-md">Send</button>
                              </div>
                          </>
                      ) : (
                          <div className="flex items-center justify-center flex-1 text-gray-500">Select a user to start chatting</div>
                      )}
                  </div>
              </div>
          )}
      </div>
  );
  }

export default App;
