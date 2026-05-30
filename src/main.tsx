import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MultiOutletProvider } from './contexts/MultiOutletContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MultiOutletProvider>
      <App />
    </MultiOutletProvider>
  </React.StrictMode>
);
