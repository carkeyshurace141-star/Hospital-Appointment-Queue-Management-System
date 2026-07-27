import React from 'react';
import ReactDOM from 'react-dom/client';
import DevSocketListener from './components/DevSocketListener.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DevSocketListener />
  </React.StrictMode>,
);
