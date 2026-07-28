import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { CheckInsProvider } from './CheckInsContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CheckInsProvider>
        <App />
      </CheckInsProvider>
    </AuthProvider>
  </React.StrictMode>
);
