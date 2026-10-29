import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Login, { AUTH_KEY } from './Login.jsx';
import './index.css';

function isAuthed() {
  try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch { return false; }
}

function Root() {
  const [authed, setAuthed] = useState(isAuthed);
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return (
    <App
      onSignOut={() => {
        try { sessionStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
        setAuthed(false);
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
