// front/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18+
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter here
import './index.css'; // Your global CSS
import App from './App'; // Your main App component

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/*
      IMPORTANT: Wrap your entire App component (or the part that uses React Router)
      with BrowserRouter.
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
