// front/src/components/NavBar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook

const NavBar = () => {
  const { currentUser, logout, loading } = useAuth(); // Use useAuth here
  const navigate = useNavigate();

  // If loading, you might want to show a simplified nav or nothing
  if (loading) {
    return (
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li>Loading Navigation...</li>
        </ul>
      </nav>
    );
  }

  const handleLogout = () => {
    logout();
    localStorage.removeItem('guest_progress'); // Clear guest progress on logout
    navigate('/'); // Navigate to home page after logout
  };

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        {!currentUser && <li><Link to="/login">Login</Link></li>}
        {!currentUser && <li><Link to="/register">Register</Link></li>}
        {currentUser && <li><Link to="/dashboard">Dashboard</Link></li>}
        {currentUser && currentUser.role === 'admin' && <li><Link to="/admin">Admin Panel</Link></li>}
        {currentUser && <li><button onClick={handleLogout}>Logout</button></li>}
        <li><Link to="/riddles">Riddles</Link></li>
        <li><Link to="/random-riddle">Random Riddle</Link></li>
      </ul>
    </nav>
  );
};

export default NavBar;