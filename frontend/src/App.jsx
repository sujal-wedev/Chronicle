import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Auth from './pages/Auth';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
          <Navbar />
          <main style={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/posts/:id" element={<PostDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:id" element={<Editor />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}><h2>Page Not Found</h2></div>} />
            </Routes>
          </main>
          <footer style={{
            padding: '2rem 0',
            textAlign: 'center',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: 'auto'
          }}>
            <div className="container">
              © {new Date().getFullYear()} Chronicle. Made with care, for every story worth telling.
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
