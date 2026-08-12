import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Globe, EyeOff, Layout, FileText, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/auth');
    }
  }, [token, navigate]);

  // Fetch author posts
  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await fetch('/api/posts/my-posts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPosts(data || []);
        }
      } catch (error) {
        console.error('Error fetching author posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPosts();
  }, [token]);

  const togglePublish = async (post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: post.title,
          summary: post.summary,
          content: post.content,
          tags: post.tags,
          cover_image_url: post.cover_image_url,
          status: newStatus
        })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const publishedCount = posts.filter(p => p.status === 'published').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  if (!user) return null;

  return (
    <div className="container fade-in-up" style={{ paddingBottom: '5rem' }}>
      {/* Dashboard Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        <div style={{ marginTop: '3rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Author Workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome back, <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{user.username}</span>. Manage your drafts and publications.
          </p>
        </div>

        <Link to="/editor" className="btn btn-primary">
          <Plus size={18} />
          <span>Write New Post</span>
        </Link>
      </header>

      {/* Stat Counter cards */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {/* Total Posts */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-color)', padding: '0.75rem', borderRadius: '12px' }}>
            <Layout size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Submissions</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{posts.length}</h2>
          </div>
        </div>

        {/* Published Posts */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'oklch(70% 0.16 140 / 0.15)', color: 'oklch(65% 0.18 140)', padding: '0.75rem', borderRadius: '12px' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Live Publications</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{publishedCount}</h2>
          </div>
        </div>

        {/* Drafts */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'oklch(65% 0.15 40 / 0.15)', color: 'oklch(60% 0.15 40)', padding: '0.75rem', borderRadius: '12px' }}>
            <FileText size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Draft Versions</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{draftCount}</h2>
          </div>
        </div>
      </section>

      {/* Posts Table / List */}
      <section className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Your Stories</h3>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="shimmer" style={{ height: '40px', width: '100%', borderRadius: '4px' }} />
            <div className="shimmer" style={{ height: '40px', width: '100%', borderRadius: '4px' }} />
            <div className="shimmer" style={{ height: '40px', width: '100%', borderRadius: '4px' }} />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't written any posts yet!</p>
            <Link to="/editor" className="btn btn-primary">
              <Plus size={16} />
              <span>Create Your First Post</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Created At</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} className="table-row-hover">
                    {/* Title */}
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <Link to={`/posts/${post.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {post.title}
                      </Link>
                      {post.summary && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {post.summary}
                        </div>
                      )}
                    </td>
                    
                    {/* Created Date */}
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    
                    {/* Status Badge */}
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <button 
                        onClick={() => togglePublish(post)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: post.status === 'published' ? 'oklch(70% 0.16 140 / 0.15)' : 'oklch(65% 0.15 40 / 0.15)',
                          color: post.status === 'published' ? 'oklch(65% 0.18 140)' : 'oklch(60% 0.15 40)',
                          transition: 'var(--transition-smooth)'
                        }}
                        title={`Click to change to ${post.status === 'published' ? 'Draft' : 'Published'}`}
                      >
                        {post.status === 'published' ? (
                          <>
                            <Globe size={12} />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>
                    
                    {/* CRUD Actions */}
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {/* Edit Button */}
                        <Link 
                          to={`/editor/${post.id}`} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', borderRadius: '6px' }}
                          title="Edit post"
                        >
                          <Edit size={14} />
                        </Link>
                        
                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', borderRadius: '6px', color: 'oklch(60% 0.2 20)' }}
                          title="Delete post"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
      {/* Table hover styles injected */}
      <style dangerouslySetInnerHTML={{__html: `
        .table-row-hover:hover {
          background-color: var(--border-color);
        }
      `}} />
    </div>
  );
}
