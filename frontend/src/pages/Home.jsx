import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, Tag, ArrowRight } from 'lucide-react';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  // Fetch all published posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        // Call the API endpoint
        const response = await fetch('/api/posts');
        if (response.ok) {
          const data = await response.json();
          setPosts(data || []);

          // Extract unique tags
          const tags = new Set();
          data?.forEach(post => {
            post.tags?.forEach(tag => tags.add(tag.trim()));
          });
          setAvailableTags(Array.from(tags));
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Filter posts based on search input and selected tag
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(search.toLowerCase()) ||
      post.summary?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag ? post.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="container fade-in-up" style={{ paddingBottom: '4rem' }}>
      {/* Hero Banner Section */}
      <header style={{
        textAlign: 'center',
        margin: '3rem 0 4rem 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <h1 style={{ fontWeight: 800, letterSpacing: '-1.5px' }}>
          Explore the world of <span style={{
            background: 'linear-gradient(135deg, var(--brand-indigo), var(--brand-teal))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>ideas</span>
        </h1>
        <p style={{ maxWidth: '600px', fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
          Discover insightful articles, tutorials, and thoughts from creators around the globe.
        </p>
      </header>

      {/* Filters Bar */}
      <section className="glass" style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '3rem'
      }}>
        {/* Search Field */}
        <div style={{
          position: 'relative',
          flex: '1 1 300px'
        }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search articles by title or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control"
            style={{
              width: '100%',
              paddingLeft: '2.75rem',
              borderRadius: 'var(--radius-sm)'
            }}
          />
        </div>

        {/* Tag Filters */}
        {availableTags.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            maxWidth: '100%',
            padding: '2px 0'
          }}>
            <button
              onClick={() => setSelectedTag('')}
              className={`btn ${selectedTag === '' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
            >
              All Tags
            </button>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`btn ${selectedTag === tag ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '20px' }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Main Blog Post Grid */}
      {loading ? (
        <div className="grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass" style={{ height: '380px', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="shimmer" style={{ height: '180px', width: '100%', borderRadius: 'var(--radius-sm)' }} />
              <div className="shimmer" style={{ height: '28px', width: '80%', borderRadius: '4px' }} />
              <div className="shimmer" style={{ height: '16px', width: '90%', borderRadius: '4px' }} />
              <div className="shimmer" style={{ height: '16px', width: '50%', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="glass flex-center" style={{
          flexDirection: 'column',
          padding: '5rem 2rem',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          gap: '1rem'
        }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>No articles found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try refining your search or matching tags filters.</p>
        </div>
      ) : (
        <div className="grid-cols-3">
          {filteredPosts.map(post => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              aria-label={`Read ${post.title}`}
              className="glass glass-interactive"
              style={{
                display: 'block',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                height: '100%',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <article style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
              {/* Cover Image or CSS Graphic */}
              <div style={{
                height: '180px',
                width: '100%',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, var(--brand-indigo), var(--brand-purple))',
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    {post.title}
                  </div>
                )}

                {/* Author badge overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  color: '#ffffff'
                }}>
                  <User size={12} />
                  <span>{post.author_name}</span>
                </div>
              </div>

              {/* Content Body */}
              <div style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                gap: '0.75rem'
              }}>
                {/* Post Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.7rem',
                          background: 'var(--accent-glow)',
                          color: 'var(--accent-color)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}
                      >
                        <Tag size={8} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Post Title */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {post.title}
                </h3>

                {/* Summary */}
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5,
                  marginBottom: '1rem'
                }}>
                  {post.summary || post.content?.replace(/<[^>]*>/g, '').substring(0, 150)}
                </p>

                {/* Footer details */}
                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem'
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <Calendar size={12} />
                    {new Date(post.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>

                  <span
                    className="flex-center"
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--accent-color)',
                      gap: '0.25rem'
                    }}
                  >
                    <span>Read post</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
