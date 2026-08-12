import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  User, 
  ArrowLeft, 
  Send, 
  Trash2, 
  Tag, 
  Link2, 
  MessageSquare, 
  ChevronUp,
  ThumbsUp,
  Bookmark,
  Globe,
  Menu,
  X
} from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';

// Custom inline SVG for the X (Twitter) icon compatible with any lucide version
const XIcon = ({ size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

// Custom inline SVG for the GitHub icon compatible with any lucide version
const GithubIcon = ({ size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const slugifyHeading = (text = '') =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Layout features states
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTocOverflow, setIsTocOverflow] = useState(false);

  // Micro-interaction states
  const [claps, setClaps] = useState(24);
  const [hasClapped, setHasClapped] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [tocExpanded, setTocExpanded] = useState(false);
  const sidebarRef = useRef(null);
  const articleRef = useRef(null);
  const articleScrollRef = useRef(null);
  const tocBottomSentinelRef = useRef(null);
  
  // Ref for click scroll tracking to prevent scroll-spy jitter
  const isClickScrolling = useRef(false);
  const clickScrollTimeout = useRef(null);

  // Fetch post and comments
  useEffect(() => {
    const fetchPostAndComments = async () => {
      try {
        setLoading(true);
        const postResp = await fetch(`/api/posts/${id}`);
        if (!postResp.ok) {
          throw new Error('Post not found');
        }
        const postData = await postResp.json();
        setPost(postData);

        // Generate baseline claps from post ID string hash to feel persistent
        const hash = postData.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        setClaps((hash % 45) + 12);

        const commResp = await fetch(`/api/comments/post/${id}`);
        if (commResp.ok) {
          const commData = await commResp.json();
          setComments(commData || []);
        }
      } catch (error) {
        console.error('Error fetching post detail:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndComments();
  }, [id, navigate]);

  // Extract headings from markdown content
  useEffect(() => {
    if (!post || !post.content) return;

    const lines = post.content.split('\n');
    const list = [];
    let inCodeBlock = false;

    for (let line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const match = line.match(/^(##|###)\s+(.+)$/);
      if (match) {
        const level = match[1].length; // 2 for h2, 3 for h3
        const text = match[2].replace(/[*\-_`[\]]/g, '').trim();
        const headingId = slugifyHeading(text);
        list.push({ level, text, id: headingId });
      }
    }
    setHeadings(list);
  }, [post]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickScrollTimeout.current) clearTimeout(clickScrollTimeout.current);
    };
  }, []);

  // Toggle reader-mode-active class on body when mounted/unmounted
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleViewportChange = (e) => {
      if (e.matches) {
        document.body.classList.add('reader-mode-active');
      } else {
        document.body.classList.remove('reader-mode-active');
      }
    };
    
    if (mediaQuery.matches) {
      document.body.classList.add('reader-mode-active');
    }

    mediaQuery.addEventListener('change', handleViewportChange);
    
    return () => {
      document.body.classList.remove('reader-mode-active');
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  // Keyboard navigation shortcuts directed to article scroller
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return;

      const scroller = articleScrollRef.current;
      if (!scroller) return;

      const scrollAmount = 150;
      const pageAmount = scroller.clientHeight - 40;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (e.shiftKey) {
            scroller.scrollBy({ top: -pageAmount, behavior: 'smooth' });
          } else {
            scroller.scrollBy({ top: pageAmount, behavior: 'smooth' });
          }
          break;
        case 'PageDown':
          e.preventDefault();
          scroller.scrollBy({ top: pageAmount, behavior: 'smooth' });
          break;
        case 'PageUp':
          e.preventDefault();
          scroller.scrollBy({ top: -pageAmount, behavior: 'smooth' });
          break;
        case 'ArrowDown':
          e.preventDefault();
          scroller.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          break;
        case 'ArrowUp':
          e.preventDefault();
          scroller.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          break;
        case 'Home':
          e.preventDefault();
          scroller.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
          break;
        default:
          break;
      }
    };

    const isTabletOrDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isTabletOrDesktop) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading]);

  // Focus the article container automatically on load to ensure key scroll works
  useEffect(() => {
    if (!loading && articleScrollRef.current) {
      articleScrollRef.current.focus({ preventScroll: true });
    }
  }, [loading]);

  // Auto-scroll TOC scroller to keep the active link visible
  useEffect(() => {
    if (!activeHeadingId) return;
    const activeLink = document.querySelector('.toc-scroller .toc-link.active');
    if (activeLink) {
      activeLink.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [activeHeadingId]);

  // Group headings into a hierarchical tree (H3s inside H2s)
  const getHeadingsTree = () => {
    const tree = [];
    let currentH2 = null;
    headings.forEach(heading => {
      if (heading.level === 2) {
        currentH2 = { ...heading, children: [] };
        tree.push(currentH2);
      } else if (heading.level === 3) {
        if (currentH2) {
          currentH2.children.push(heading);
        } else {
          tree.push({ ...heading, children: [] });
        }
      }
    });
    return tree;
  };

  const headingsTree = getHeadingsTree();

  const syncActiveHeading = () => {
    if (!headings.length) return;

    const scroller = articleScrollRef.current;
    const hasInternalScroller = scroller && scroller.scrollHeight > scroller.clientHeight + 4;
    const probeLine = hasInternalScroller
      ? scroller.getBoundingClientRect().top + 140
      : 140;

    let candidate = '';

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      if (rect.top <= probeLine) {
        candidate = heading.id;
      } else {
        break;
      }
    }

    if (!candidate && headings[0]) {
      candidate = headings[0].id;
    }

    if (candidate && candidate !== activeHeadingId) {
      setActiveHeadingId(candidate);
    }
  };

  const handleHeadingClick = (e, headingId) => {
    e.preventDefault();
    const target = document.getElementById(headingId);
    const scroller = articleScrollRef.current;
    const hasInternalScroller = scroller && scroller.scrollHeight > scroller.clientHeight + 4;
    if (target) {
      isClickScrolling.current = true;
      if (clickScrollTimeout.current) clearTimeout(clickScrollTimeout.current);

      setActiveHeadingId(headingId);
      setIsSidebarOpen(false); // Close Tablet drawer on click

      if (hasInternalScroller) {
        const scrollerTop = scroller.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        const offset = targetTop - scrollerTop + scroller.scrollTop - 24;
        scroller.scrollTo({ top: offset, behavior: 'smooth' });
      } else {
        const offset = window.scrollY + target.getBoundingClientRect().top - 92;
        window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      }

      clickScrollTimeout.current = setTimeout(() => {
        isClickScrolling.current = false;
      }, 1000);
    }
  };

  // Reading Scroll Progress indicator — tracks the article container, not the browser window
  useEffect(() => {
    if (loading) return;
    const scroller = articleScrollRef.current;
    if (!scroller) return;
    const hasInternalScroller = scroller.scrollHeight > scroller.clientHeight + 4;

    const handleScroll = () => {
      const scrollable = hasInternalScroller
        ? scroller.scrollHeight - scroller.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0) {
        const currentScroll = hasInternalScroller ? scroller.scrollTop : window.scrollY;
        setScrollProgress((currentScroll / scrollable) * 100);
      }
      syncActiveHeading();
    };

    const scrollTarget = hasInternalScroller ? scroller : window;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    requestAnimationFrame(handleScroll);

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [loading, headings, activeHeadingId]);

  // Detect if TOC has scrollable overflow at the bottom
  useEffect(() => {
    if (!tocBottomSentinelRef.current || headings.length === 0) return;

    const scroller = document.querySelector('.toc-scroller');
    if (!scroller) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsTocOverflow(!entry.isIntersecting);
      },
      {
        root: scroller,
        threshold: 0.1
      }
    );

    observer.observe(tocBottomSentinelRef.current);
    return () => observer.disconnect();
  }, [headings, activeHeadingId]);

  // Copy Code blocks helper logic
  useEffect(() => {
    if (!post || !post.content) return;

    const timer = setTimeout(() => {
      const preBlocks = document.querySelectorAll('.blog-content pre');
      preBlocks.forEach(pre => {
        if (pre.querySelector('.copy-code-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.innerText = 'Copy';
        btn.title = 'Copy code snippet';

        btn.addEventListener('click', () => {
          const code = pre.querySelector('code');
          if (code) {
            navigator.clipboard.writeText(code.innerText);
            btn.innerText = 'Copied!';
            setTimeout(() => {
              btn.innerText = 'Copy';
            }, 2000);
          }
        });

        pre.style.position = 'relative';
        pre.appendChild(btn);
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [post]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await fetch(`/api/comments/post/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data, ...prev]);
        setNewComment('');
      } else {
        console.error('Failed to submit comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      } else {
        console.error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out "${post?.title}" on Chronicle!`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const scrollToComments = () => {
    const section = document.getElementById('comments-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClapClick = () => {
    setClaps(prev => prev + (hasClapped ? -1 : 1));
    setHasClapped(prev => !prev);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 0', maxWidth: '800px' }}>
        <div className="shimmer" style={{ height: '30px', width: '30%', borderRadius: '4px', marginBottom: '2rem' }} />
        <div className="shimmer" style={{ height: '400px', width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }} />
        <div className="shimmer" style={{ height: '40px', width: '80%', borderRadius: '4px', marginBottom: '1rem' }} />
        <div className="shimmer" style={{ height: '20px', width: '60%', borderRadius: '4px', marginBottom: '1rem' }} />
        <div className="shimmer" style={{ height: '100px', width: '100%', borderRadius: 'var(--radius-sm)' }} />
      </div>
    );
  }

  if (!post) return null;

  const wordCount = post.content?.trim().split(/\s+/).length || 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <>
      {/* Scroll Progress Bar (anchored to absolute bottom viewport) */}
      <div className="reading-progress-bar" style={{ width: `${scrollProgress}%` }} />



      {/* Floating Sidebar Toggle Button for Tablet */}
      <button 
        className="tablet-sidebar-toggle-btn"
        onClick={() => setIsSidebarOpen(true)}
        title="Open Table of Contents"
      >
        <Menu size={18} />
        <span>Table of Contents</span>
      </button>

      <div className="container fade-in-up post-reader-container" style={{ maxWidth: '1440px', paddingBottom: '5rem', paddingTop: '1rem' }}>
        
        {/* Three-Column Professional Reading Grid Layout */}
        <div className="post-detail-layout">
          {/* Backdrop for Tablet/Mobile Drawer (rendered inside layout to avoid stacking context issues) */}
          {isSidebarOpen && (
            <div 
              className="sidebar-backdrop" 
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          {/* COLUMN 1: Sticky Sidebar (TOC + Author card) */}
          <aside className={`post-sidebar ${isSidebarOpen ? 'drawer-open' : ''}`} ref={sidebarRef}>
            {/* Back button and Close Drawer button */}
            <div className="sidebar-header-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              width: '100%'
            }}>
              <Link to="/" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                textDecoration: 'none'
              }}>
                <ArrowLeft size={16} />
                <span>Back to feed</span>
              </Link>
              
              <button 
                className="drawer-close-btn"
                onClick={() => setIsSidebarOpen(false)}
                title="Close Sidebar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'none', // Overridden in responsive CSS
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Author Profile widget */}
            <div className="sidebar-widget author-widget-card">
              <div className="author-profile-card">
                <h3 className="toc-title" style={{ marginBottom: '0.5rem' }}>Author</h3>
                <div className="author-header">
                  <div className="author-avatar">{getInitials(post.author_name)}</div>
                  <div className="author-meta-info">
                    <span className="author-meta-name">{post.author_name}</span>
                    <span className="author-meta-role">Chronicle Writer</span>
                  </div>
                </div>
                <p className="author-bio">
                  Passionate content creator sharing ideas and exploring technology, engineering, design, and user interfaces on the premium Chronicle publishing network.
                </p>
                <div className="author-social-links">
                  <a 
                    href={`https://github.com/${post.author_name.toLowerCase().replace(/\s+/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="author-social-btn"
                    title="GitHub Profile"
                  >
                    <GithubIcon size={16} />
                  </a>
                  <a 
                    href={`https://twitter.com/${post.author_name.toLowerCase().replace(/\s+/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="author-social-btn"
                    title="Twitter/X Profile"
                  >
                    <XIcon size={16} />
                  </a>
                  <a 
                    href="https://learnpytorch.io" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="author-social-btn"
                    title="Personal Website"
                  >
                    <Globe size={16} />
                  </a>
                </div>
              </div>
            </div>

            {/* Dynamic Table of Contents outline (Only renders if headings exist) */}
            {headings.length > 0 && (
              <div className={`sidebar-widget toc-widget-card ${isTocOverflow ? 'has-overflow-bottom' : ''}`}>
                <h3 className="toc-title">Table of Contents</h3>
                
                <div className="toc-scroller">
                  <div className="toc-list">
                    {headingsTree.map((h2) => {
                      const isH2Active = activeHeadingId === h2.id;
                      const isChildActive = h2.children.some(child => child.id === activeHeadingId);
                      const isExpanded = isH2Active || isChildActive;

                      return (
                        <div key={h2.id} className="toc-group">
                          <a 
                            href={`#${h2.id}`}
                            onClick={(e) => handleHeadingClick(e, h2.id)}
                            className={`toc-link level-2 ${isH2Active ? 'active' : ''}`}
                          >
                            {h2.text}
                          </a>
                          
                          {h2.children.length > 0 && (
                            <div className={`toc-nested-list-wrapper ${isExpanded ? 'expanded' : ''}`}>
                              <ul className="toc-nested-list">
                                {h2.children.map((h3) => (
                                  <li key={h3.id} className="toc-item">
                                    <a 
                                      href={`#${h3.id}`}
                                      onClick={(e) => handleHeadingClick(e, h3.id)}
                                      className={`toc-link level-3 ${activeHeadingId === h3.id ? 'active' : ''}`}
                                    >
                                      {h3.text}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="toc-sentinel-bottom" ref={tocBottomSentinelRef} />
                  </div>
                </div>
                <div className="toc-fade-bottom" />
              </div>
            )}
          </aside>

          {/* COLUMN 2: Main Article Content */}
          <main className="post-main-content" ref={articleScrollRef} tabIndex={0}>
            <article ref={articleRef}>
              
              {/* Header inside the article column (so TOC/Author displays to its left on desktop) */}
              <header className="article-header">
                {/* Post tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="article-tags-row">
                    {post.tags.map(tag => (
                      <span key={tag} className="article-tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Core Title */}
                <h1 className="article-title">
                  {post.title}
                </h1>

                {/* Medium-Style Premium Author Header Row */}
                <div className="premium-author-row">
                  <div className="author-row-left">
                    <div className="author-row-avatar">
                      {getInitials(post.author_name)}
                    </div>
                    <div className="author-row-text">
                      <span className="author-row-name">{post.author_name}</span>
                      <span className="author-row-details">
                        {new Date(post.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {' · '}
                        {readingTime} min read ({wordCount} words)
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions Row */}
                  <div className="author-row-right">
                    <button 
                      className={`author-row-btn ${copied ? 'active' : ''}`}
                      onClick={handleCopyLink}
                      title={copied ? 'Link Copied!' : 'Copy Link'}
                      style={{ color: copied ? 'var(--accent-color)' : 'inherit' }}
                    >
                      <Link2 size={16} />
                    </button>
                    <button 
                      className="author-row-btn"
                      onClick={handleShareTwitter}
                      title="Share on X"
                    >
                      <XIcon size={16} />
                    </button>
                    <button 
                      className={`author-row-btn ${isBookmarked ? 'active' : ''}`}
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      title={isBookmarked ? 'Saved to Bookmarks' : 'Save Bookmark'}
                      style={{ color: isBookmarked ? 'var(--accent-color)' : 'inherit' }}
                    >
                      <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                {/* Header Cover Photo */}
                {post.cover_image_url && (
                  <div className="article-cover-wrapper">
                    <img 
                      src={post.cover_image_url} 
                      alt={post.title} 
                      className="article-cover-img"
                    />
                  </div>
                )}
              </header>

              {/* Summary Block / Quote */}
              {post.summary && (
                <div className="article-quote-block">
                  {post.summary}
                </div>
              )}

              {/* Parsed Rich Markdown Body */}
              <div className="blog-content">
                <MarkdownRenderer content={post.content} />
              </div>
            </article>

            {/* Comments Area */}
            <section id="comments-section" style={{ marginTop: '4rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '2rem' }}>
                Comments ({comments.length})
              </h2>

              {/* Add Comment Box */}
              {user ? (
                <form onSubmit={handleCommentSubmit} className="glass" style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Join the discussion
                  </h3>
                  
                  <div style={{ position: 'relative' }}>
                    <textarea 
                      rows="3" 
                      placeholder="Share your thoughts on this post..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="form-control"
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        minHeight: '80px',
                        borderRadius: 'var(--radius-sm)'
                      }}
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submittingComment || !newComment.trim()}
                    style={{ alignSelf: 'flex-end', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  >
                    <Send size={14} />
                    <span>{submittingComment ? 'Sending...' : 'Post Comment'}</span>
                  </button>
                </form>
              ) : (
                <div className="glass" style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  marginBottom: '3rem'
                }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    You must be signed in to leave a comment.
                  </p>
                  <Link to="/auth" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                    Sign In to Comment
                  </Link>
                </div>
              )}

              {/* Comments List */}
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {comments.map(comment => {
                    const canDelete = user && (user.id === comment.user_id || user.id === post.author_id);

                    return (
                      <div 
                        key={comment.id} 
                        className="glass" 
                        style={{
                          padding: '1.25rem',
                          borderRadius: 'var(--radius-sm)',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                          fontSize: '0.85rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={14} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {comment.author_name}
                            </span>
                            {comment.user_id === post.author_id && (
                              <span style={{
                                fontSize: '0.65rem',
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-color)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700
                              }}>
                                Author
                              </span>
                            )}
                          </div>
                          
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {new Date(comment.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <p style={{
                          fontSize: '0.95rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap',
                          paddingRight: canDelete ? '2.5rem' : '0'
                        }}>
                          {comment.content}
                        </p>

                        {canDelete && (
                          <button 
                            onClick={() => handleCommentDelete(comment.id)}
                            className="btn"
                            style={{
                              position: 'absolute',
                              bottom: '1rem',
                              right: '1rem',
                              padding: '0.4rem',
                              borderRadius: '50%',
                              background: 'transparent',
                              color: 'oklch(60% 0.2 20 / 0.7)',
                              border: 'none'
                            }}
                            title="Delete comment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            {/* Inline Footer inside scrollable area (Desktop/Tablet only) */}
            <footer className="reader-inline-footer">
              © {new Date().getFullYear()} Chronicle. Made with care, for every story worth telling.
            </footer>
          </main>

          {/* COLUMN 3: Sticky Social Actions Bar (Desktop Only) */}
          <aside className="post-right-bar">
            <div className="floating-actions-container">
              <button 
                className={`floating-action-btn ${hasClapped ? 'active' : ''}`} 
                onClick={handleClapClick}
                title={hasClapped ? 'Remove Clap' : 'Clap for this post'}
              >
                <ThumbsUp size={18} fill={hasClapped ? 'currentColor' : 'none'} />
                <span className="btn-count">{claps}</span>
              </button>

              <button 
                className="floating-action-btn" 
                onClick={scrollToComments}
                title="Jump to Comments"
              >
                <MessageSquare size={18} />
                <span className="btn-count">{comments.length}</span>
              </button>

              <button 
                className={`floating-action-btn ${isBookmarked ? 'active' : ''}`}
                onClick={() => setIsBookmarked(!isBookmarked)}
                title={isBookmarked ? 'Bookmarked' : 'Save Bookmark'}
              >
                <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>

              <button 
                className="floating-action-btn" 
                onClick={handleShareTwitter}
                title="Share on X"
              >
                <XIcon size={16} />
              </button>

              <div className="floating-actions-divider" />

              <button 
                className="floating-action-btn" 
                onClick={() => articleScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Scroll to Top"
              >
                <ChevronUp size={18} />
              </button>
            </div>
          </aside>

        </div>

        {/* Bottom Floating Toolbar for Mobile/Tablet */}
        <div className="mobile-bottom-toolbar">
          <button className="mobile-toolbar-btn" onClick={handleClapClick}>
            <ThumbsUp size={18} fill={hasClapped ? 'currentColor' : 'none'} />
            <span>{claps}</span>
          </button>
          <button className="mobile-toolbar-btn" onClick={scrollToComments}>
            <MessageSquare size={18} />
            <span>{comments.length}</span>
          </button>
          <button className="mobile-toolbar-btn" onClick={() => setIsBookmarked(!isBookmarked)}>
            <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button className="mobile-toolbar-btn" onClick={handleShareTwitter}>
            <XIcon size={16} />
          </button>
        </div>

      </div>
    </>
  );
}
