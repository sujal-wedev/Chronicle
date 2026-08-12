import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, User, AlertCircle, Sparkles } from 'lucide-react';

export default function Auth() {
  const { login, register, token } = useAuth();
  const navigate = useNavigate();

  // Screen toggle
  const [isLogin, setIsLogin] = useState(true);

  // Form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Page state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!username.trim()) {
          setError('Username is required for registration.');
          setLoading(false);
          return;
        }
        await register(username, email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center fade-in-up" style={{ minHeight: 'calc(80dvh - 100px)', paddingBottom: '3rem' }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="flex-center" style={{
            margin: '0 auto 1rem auto',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent-glow)',
            color: 'var(--accent-color)'
          }}>
            <Sparkles size={24} />
          </div>
          
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.5px' }}>
            {isLogin ? 'Sign in to Chronicle' : 'Create an Account'}
          </h2>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? 'Welcome back! Enter your details to continue.' : 'Share your stories and ideas with the world.'}
          </p>
        </div>

        {/* Error Warning */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'oklch(60% 0.2 20 / 0.12)',
            border: '1px solid oklch(60% 0.2 20 / 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: 'oklch(60% 0.2 20)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Username (Register only) */}
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <User size={16} />
                </span>
                
                <input 
                  type="text" 
                  placeholder="john_doe" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </span>
              
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <KeyRound size={16} />
              </span>
              
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        {/* Google Sign In Button */}
        <button 
          type="button"
          onClick={() => window.location.href = '/api/auth/google'}
          className="btn btn-secondary"
          style={{ 
            width: '100%', 
            padding: '0.85rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.75rem',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            transition: 'var(--transition-smooth)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Screen Toggle Trigger */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <span>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-color)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0 0.25rem'
            }}
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
