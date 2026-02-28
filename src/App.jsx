import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from './context/SessionContext';
import { AuthProvider } from './context/AuthContext';
import MainPage from './pages/MainPage';
import ImportExportPage from './pages/ImportExportPage';
import DayMatrixPage from './pages/DayMatrixPage';
import AuthPage from './pages/AuthPage';
import CloudSyncPage from './pages/CloudSyncPage';
import ConflictsPage from './pages/ConflictsPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            background: '#1e1e2e',
            color: '#cdd6f4',
            border: '1px solid rgba(205,214,244,0.1)',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
      <AuthProvider>
        <SessionProvider>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/import-export" element={<ImportExportPage />} />
            <Route path="/day-matrix" element={<DayMatrixPage />} />
            <Route path="/cloud-sync" element={<CloudSyncPage />} />
            <Route path="/conflicts" element={<ConflictsPage />} />
          </Routes>
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
