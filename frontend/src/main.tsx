import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { Providers } from '@/app/providers';
import { reportWebVitals } from '@/shared/lib/reportWebVitals';
import '@/shared/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);

reportWebVitals();
