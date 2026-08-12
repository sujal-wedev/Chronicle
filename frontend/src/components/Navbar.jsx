import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, LogOut, Edit3, Layout, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('color-scheme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    const metaScheme = document.querySelector('meta[name="color-scheme"]');

    if (theme === 'light') {
      root.classList.add('light-theme');
      if (metaScheme) metaScheme.content = 'light';
    } else {
      root.classList.remove('light-theme');
      if (metaScheme) metaScheme.content = 'dark';
    }
    localStorage.setItem('color-scheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '1rem 0',
      marginBottom: '0rem',
      borderBottom: '1px solid var(--border-color)'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1.5rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, var(--brand-indigo), var(--brand-purple))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px'
        }}>
          Chronicle
        </Link>

        {/* Navigation Action Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px' }}
            title="Toggle light/dark theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {user ? (
            <>
              {/* Write Post Button */}
              <Link to="/editor" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Edit3 size={16} />
                <span>Write</span>
              </Link>

              {/* Dashboard Link */}
              <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Layout size={16} />
                <span>Dashboard</span>
              </Link>

              {/* Profile Menu / Logout */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderLeft: '1px solid var(--border-color)',
                paddingLeft: '1.25rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user.username}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Author</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem', borderRadius: '50%', color: 'oklch(60% 0.2 20)' }}
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
              <User size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
