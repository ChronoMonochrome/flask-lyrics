// front/src/App.js
import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
// REMOVE: import { useAuth } from './contexts/AuthContext'; // This hook should NOT be used directly in App.js
import './App.css'; // Your main CSS
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RiddlesPage from './components/RiddlesPage';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import RandomRiddlePage from './components/RandomRiddlePage';
import NavBar from './components/NavBar'; // Assuming you'll create a NavBar component

function App() {
  // REMOVE: const { currentUser, logout } = useAuth(); // No useAuth() call here
  // REMOVE: const navigate = useNavigate(); // Move useNavigate into NavBar if needed there

  // The App component itself should NOT depend on currentUser directly.
  // The NavBar component will handle conditional links based on auth state.
  // If a route requires authentication, you'd use a ProtectedRoute pattern,
  // or handle the redirect/message inside the specific page component (e.g., UserDashboard).

  return (
    <div className="App">
      {/* NavBar will now handle the links and logout logic using useAuth() */}
      <NavBar /> 

      <main>
        <Routes>
          <Route path="/" element={
            <div>
              <h1>Welcome to Japanese Riddles!</h1>
              <p>Login or Register to track your progress, or play as a guest.</p>
              <p>Click "Riddles" to start playing.</p>
            </div>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/riddles" element={<RiddlesPage />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/random-riddle" element={<RandomRiddlePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;