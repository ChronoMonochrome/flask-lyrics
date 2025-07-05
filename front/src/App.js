// front/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css'; // Your main CSS
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RiddlesPage from './components/RiddlesPage';
// No specific GuestMode component, it's handled within RiddlesPage for simplicity

function App() {
  // State for authentication token (for authenticated users)
  // Store token in localStorage for persistence across sessions
  const [token, setToken] = useState(localStorage.getItem('jwt_token'));
  const navigate = useNavigate(); // For programmatic navigation

  // Function to handle successful login
  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('jwt_token', newToken);
    navigate('/riddles'); // Navigate to riddles page after login
  };

  // Function to handle logout
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('guest_progress'); // Clear guest progress on logout
    navigate('/'); // Navigate to home page after logout
  };

  return (
    <div className="App">
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          {!token && <li><Link to="/login">Login</Link></li>}
          {!token && <li><Link to="/register">Register</Link></li>}
          {token && <li><button onClick={handleLogout}>Logout</button></li>}
          <li><Link to="/riddles">Riddles</Link></li> {/* Riddles for both guest and logged in */}
        </ul>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={
            <div>
              <h1>Welcome to Japanese Riddles!</h1>
              <p>Login or Register to track your progress, or play as a guest.</p>
              <p>Click "Riddles" to start playing.</p>
            </div>
          } />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/riddles" element={<RiddlesPage token={token} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;