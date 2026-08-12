import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Save,
  Send,
  Image,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Code,
  List,
  Link2,
  Quote,
  Table,
  Trash2,
  Download,
  Laptop,
  Smartphone,
  ChevronRight,
  FolderTree
} from 'lucide-react';
import { marked } from 'marked';
import MarkdownRenderer, { parseMarkdown } from '../components/MarkdownRenderer';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const fileInputRef = useRef(null);
  const inlineFileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const workspaceRef = useRef(null);

  // Post form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState('draft');

  // Page layout & feature state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [previewTheme, setPreviewTheme] = useState('sans'); // 'serif', 'sans', 'cyber', 'retro'
  const [isMobileView, setIsMobileView] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50); // width in percentage
  const [isDragging, setIsDragging] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/auth');
    }
  }, [token, navigate]);

  // Disable body scroll when Editor is active to create app feel
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Load existing post if in edit mode
  useEffect(() => {
    if (!id || !token) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/posts/${id}`);
        if (response.ok) {
          const post = await response.json();
          setTitle(post.title || '');
          setSummary(post.summary || '');
          setContent(post.content || '');
          setCoverImageUrl(post.cover_image_url || '');
          setTags(post.tags || []);
          setStatus(post.status || 'draft');
        }
      } catch (error) {
        console.error('Error loading post for editing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, token]);

  // Draggable Divider Resize Hook
  const startResizing = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      if (workspaceRef.current) {
        const containerRect = workspaceRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        setLeftWidth(Math.max(25, Math.min(75, newWidth))); // clamp between 25% and 75%
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Add tag helper
  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().toLowerCase();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setTagInput('');
    }
  };

  // Remove tag helper
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Handle Cover Photo Upload (sends to backend -> MinIO/Filebase)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingImage(true);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCoverImageUrl(data.url);
      } else {
        alert('Image upload failed. Check backend storage configuration.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading file to storage provider.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingInlineImage(true);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        insertFormat(`![${file.name.split('.')[0] || 'Image'}](${data.url})`, '');
      } else {
        alert('Inline image upload failed.');
      }
    } catch (error) {
      console.error('Error uploading inline image:', error);
      alert('Error uploading file to storage provider.');
    } finally {
      setUploadingInlineImage(false);
    }
  };

  // Format Helper for Textarea Selection
  const insertFormat = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = before + selectedText + after;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    setContent(newContent);

    // Focus & reposition selection after React states update
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + after.length);
    }, 0);
  };

  // Table Generator Toolbar action
  const handleInsertTable = () => {
    const tableTemplate = "\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n";
    insertFormat(tableTemplate, "");
  };

  // Submit post
  const handleSubmit = async (submitStatus) => {
    if (!title.trim()) {
      alert('Please provide a title for your blog post.');
      setIsAccordionOpen(true);
      return;
    }
    if (!content.trim()) {
      alert('Please write some content before saving.');
      return;
    }

    setSaving(true);
    const postPayload = {
      title,
      summary,
      content,
      cover_image_url: coverImageUrl,
      tags,
      status: submitStatus
    };

    const url = id ? `/api/posts/${id}` : '/api/posts';
    const method = id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postPayload)
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save post');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to connect to the backend server.');
    } finally {
      setSaving(false);
    }
  };
  const handleUpdateElement = (rawElement, newString) => {
    setContent(prevContent => {
      const index = prevContent.indexOf(rawElement);
      if (index === -1) return prevContent;
      return prevContent.slice(0, index) + newString + prevContent.slice(index + rawElement.length);
    });
  };

  const handleSectionClick = (startIndex) => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      
      const textBeforeCursor = textarea.value.slice(0, startIndex);
      const linesBeforeCursor = textBeforeCursor.split('\n').length;
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
      const scrollToY = (linesBeforeCursor - 4) * lineHeight;
      
      textarea.scrollTo({
        top: Math.max(0, scrollToY),
        behavior: 'smooth'
      });
      
      textarea.setSelectionRange(startIndex, startIndex);
    }
  };

  const handleTextareaSelect = (e) => {
    if (document.activeElement !== textareaRef.current) return;
    
    const selectionStart = e.target.selectionStart;
    const sections = parseMarkdown(content);
    if (!sections.length) return;
    
    const activeIdx = sections.findIndex(
      sec => selectionStart >= sec.startIndex && selectionStart <= sec.endIndex
    );
    
    if (activeIdx !== -1) {
      const el = document.getElementById(`preview-section-${activeIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Metrics calculators
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Exporters
  const handleDownloadMarkdown = () => {
    const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'story';
    const metaHeader = `---\ntitle: ${title}\nsummary: ${summary}\ntags: ${tags.join(', ')}\ncover_image: ${coverImageUrl}\n---\n\n`;
    const element = document.createElement("a");
    const file = new Blob([metaHeader + content], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${safeTitle}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadHtml = () => {
    const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'story';
    const parsedMarkdown = marked.parse(content || '');
    const htmlOutput = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Untitled Post'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #2d3748; }
    h1 { font-size: 2.5rem; color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h2 { font-size: 1.8rem; color: #2d3748; margin-top: 2rem; }
    pre { background: #edf2f7; padding: 1.25rem; border-radius: 6px; overflow-x: auto; font-family: monospace; }
    code { background: #edf2f7; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    blockquote { border-left: 4px solid #4a5568; padding-left: 1.5rem; margin: 1.5rem 0; font-style: italic; color: #4a5568; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
    th { background-color: #f7fafc; font-weight: 600; }
  </style>
</head>
<body>
  ${coverImageUrl ? `<img src="${coverImageUrl}" alt="Cover photo" style="width:100%; max-height:380px; object-fit:cover; border-radius:8px; margin-bottom:2rem;" />` : ''}
  <h1>${title || 'Untitled Story'}</h1>
  ${summary ? `<p style="font-size:1.15rem; color:#4a5568; font-style:italic;">${summary}</p>` : ''}
  ${tags.length > 0 ? `<p style="color:#718096; font-size:0.9rem;">Tags: ${tags.map(t => `#${t}`).join(', ')}</p>` : ''}
  <hr style="border:0; border-top:1px solid #e2e8f0; margin: 2rem 0;" />
  <div class="blog-content">
    ${parsedMarkdown}
  </div>
</body>
</html>`;

    const element = document.createElement("a");
    const file = new Blob([htmlOutput], { type: 'text/html;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${safeTitle}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Convert markdown body to HTML string for preview
  const getParsedHtml = () => {
    try {
      return { __html: marked.parse(content || '<p style="color: var(--text-muted); font-style: italic;">Start writing in the editor to see your live preview here...</p>') };
    } catch (e) {
      console.error(e);
      return { __html: `<p style="color:red">Parsing error occurred: ${e.message}</p>` };
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 0', maxWidth: '800px' }}>
        <div className="shimmer" style={{ height: '40px', width: '60%', borderRadius: '4px', marginBottom: '2rem' }} />
        <div className="shimmer" style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  return (
    <div className="editor-page-container fade-in-up">
      {/* Editor Header Bar */}
      <header className="editor-header-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            {id ? 'Edit Story Workspace' : 'Studio Workspace'}
          </h1>

        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={saving}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            <Save size={14} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('published')}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            <Send size={14} />
            <span>Publish Post</span>
          </button>
        </div>
      </header>

      {/* Main Split Panel Area */}
      <div className="editor-split-workspace" ref={workspaceRef}>

        {/* LEFT PANE - WRITER PANEL */}
        <div className="editor-left-pane" style={{ width: `${leftWidth}%` }}>

          {/* Metadata Collapsible Settings Drawer */}
          <div className="metadata-accordion">
            <div
              className="metadata-accordion-header"
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            >
              <span>Story Options & Metadata</span>
              {isAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {isAccordionOpen && (
              <div className="metadata-accordion-body">
                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Story Title</label>
                  <input
                    type="text"
                    placeholder="Enter post title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-control"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                    required
                  />
                </div>

                {/* Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Short Summary</label>
                  <textarea
                    rows="2"
                    placeholder="Short engaging description for search feeds..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="form-control"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', resize: 'none' }}
                  />
                </div>

                {/* Cover Image */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cover Image</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Cover image url..."
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      className="form-control"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', flex: 1 }}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      disabled={uploadingImage}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                    >
                      <Image size={14} />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                    </button>
                  </div>

                  {coverImageUrl && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.25rem',
                      background: 'var(--bg-secondary)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, color: 'var(--text-muted)' }}>
                        {coverImageUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'oklch(60% 0.2 20)', display: 'flex' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tags</label>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    {tags.map(t => (
                      <span
                        key={t}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2,em',
                          fontSize: '0.7rem',
                          background: 'var(--border-color)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}
                      >
                        <span>{t}</span>
                        <X size={10} style={{ cursor: 'pointer' }} onClick={() => handleRemoveTag(t)} />
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag(e)}
                      className="form-control"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Markdown helper toolbar */}
          <div className="editor-formatting-toolbar">
            <button className="toolbar-btn" title="Bold (**)" onClick={() => insertFormat('**', '**')}><Bold size={14} /></button>
            <button className="toolbar-btn" title="Italic (*)" onClick={() => insertFormat('*', '*')}><Italic size={14} /></button>

            <div className="toolbar-divider" />

            <button className="toolbar-btn" title="Header 1 (#)" onClick={() => insertFormat('# ', '')}><Heading1 size={14} /></button>
            <button className="toolbar-btn" title="Header 2 (##)" onClick={() => insertFormat('## ', '')}><Heading2 size={14} /></button>
            <button className="toolbar-btn" title="Header 3 (###)" onClick={() => insertFormat('### ', '')}><Heading3 size={14} /></button>

            <div className="toolbar-divider" />

            <button className="toolbar-btn" title="Block Quote" onClick={() => insertFormat('> ', '')}><Quote size={14} /></button>
            <button className="toolbar-btn" title="Code Block" onClick={() => insertFormat('```\n', '\n```')}><Code size={14} /></button>
            <button className="toolbar-btn" title="Bullet List" onClick={() => insertFormat('- ', '')}><List size={14} /></button>
            <button type="button" className="toolbar-btn" title="Link" onClick={() => insertFormat('[', '](url)')}><Link2 size={13} /></button>
            <button 
              type="button" 
              className="toolbar-btn" 
              title={uploadingInlineImage ? "Uploading image..." : "Upload & Insert Image"} 
              onClick={() => inlineFileInputRef.current.click()}
              disabled={uploadingInlineImage}
            >
              <Image size={13} style={{ color: uploadingInlineImage ? 'var(--accent-color)' : 'inherit' }} />
            </button>
            <button type="button" className="toolbar-btn" title="Table Grid" onClick={handleInsertTable}><Table size={13} /></button>
            <button 
              type="button" 
              className="toolbar-btn" 
              title="Insert Git Codebase Viewer" 
              onClick={() => insertFormat('```github-repo\nrepository: https://github.com/owner/repo\ncommit: commit-hash\n```\n')}
            >
              <FolderTree size={14} style={{ color: 'var(--accent-color)' }} />
            </button>

            <div className="toolbar-divider" style={{ marginLeft: 'auto' }} />

            <button
              className="toolbar-btn"
              title="Clear Editor"
              style={{ color: 'oklch(60% 0.2 20)' }}
              onClick={() => window.confirm("Are you sure you want to clear all post content?") && setContent('')}
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Text Area */}
          <div className="editor-textarea-container">
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              placeholder="Start drafting here... Use markdown syntax or rich HTML tags. Hover over splitter divider and drag to resize your live preview."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyUp={handleTextareaSelect}
              onMouseUp={handleTextareaSelect}
              onSelect={handleTextareaSelect}
              style={{ padding: '1.5rem', border: 'none', background: 'transparent', height: '100%' }}
              required
            />
            <input 
              type="file" 
              ref={inlineFileInputRef} 
              onChange={handleInlineImageUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
        </div>

        {/* DRAGGABLE SPLITTER */}
        <div
          className={`editor-resizer ${isDragging ? 'is-dragging' : ''}`}
          onMouseDown={startResizing}
        />

        {/* RIGHT PANE - PREVIEW PANEL */}
        <div className="editor-right-pane" style={{ width: `${100 - leftWidth}%` }}>

          {/* Live Preview Control Toolbar */}
          <div className="preview-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>PREVIEW STYLE:</span>

              {/* Theme switcher */}
              <select
                value={previewTheme}
                onChange={(e) => setPreviewTheme(e.target.value)}
                className="form-control"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minWidth: '100px', cursor: 'pointer' }}
              >
                <option value="sans">Modern Sans</option>
                <option value="serif">Classic Serif</option>
                <option value="cyber">Cyberpunk Dark</option>
                <option value="retro">Vintage Terminal</option>
              </select>
            </div>

            {/* Simulated Width view toggles */}
            <div className="preview-toolbar-actions">
              <button
                onClick={() => setIsMobileView(false)}
                className={`toolbar-btn ${!isMobileView ? 'btn-primary' : ''}`}
                style={{ width: '26px', height: '26px', padding: 0 }}
                title="Desktop View Mode"
              >
                <Laptop size={14} />
              </button>

              <button
                onClick={() => setIsMobileView(true)}
                className={`toolbar-btn ${isMobileView ? 'btn-primary' : ''}`}
                style={{ width: '26px', height: '26px', padding: 0 }}
                title="Simulate Mobile Device View"
              >
                <Smartphone size={14} />
              </button>

              <div className="toolbar-divider" />

              {/* Exporters */}
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '0.25rem', height: '26px' }}
                onClick={handleDownloadMarkdown}
                title="Download post as Markdown (.md)"
              >
                <Download size={10} />
                <span>Markdown</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '0.25rem', height: '26px' }}
                onClick={handleDownloadHtml}
                title="Download post as HTML (.html)"
              >
                <Download size={10} />
                <span>HTML</span>
              </button>
            </div>
          </div>

          {/* Scrollable Live render page */}
          <div className="preview-content-scrollable">
            <div className={`preview-document theme-${previewTheme} ${isMobileView ? 'mobile-view' : ''}`}>

              {/* Cover photo preview */}
              {coverImageUrl && (
                <div style={{ width: '100%', maxHeight: '280px', overflow: 'hidden', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                  <img src={coverImageUrl} alt="Blog post cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* Title & metadata heading */}
              <h1 style={{ fontSize: isMobileView ? '1.75rem' : '2.25rem', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
                {title || 'Untitled Post'}
              </h1>

              {/* Live dynamic reading metrics */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0 1.25rem 0' }}>
                <span className="counter-badge">
                  ⏱️ {readingTime} min read
                </span>
                <span className="counter-badge">
                  📝 {wordCount} words
                </span>
                <span className="counter-badge">
                  🔤 {charCount} chars
                </span>
              </div>

              {/* Tags list */}
              {tags.length > 0 && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {tags.map(t => (
                    <span
                      key={t}
                      style={{
                        fontSize: '0.7rem',
                        background: previewTheme === 'cyber' ? 'rgba(0,255,204,0.1)' : 'var(--accent-glow)',
                        color: previewTheme === 'cyber' ? '#00ffcc' : 'var(--accent-color)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Short summary block */}
              {summary && (
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderLeft: `3px solid ${previewTheme === 'cyber' ? '#ff007f' : 'var(--accent-color)'}`,
                  fontStyle: 'italic',
                  color: 'var(--text-secondary)',
                  marginBottom: '1.5rem',
                  fontSize: '0.95rem',
                  lineHeight: '1.5'
                }}>
                  {summary}
                </div>
              )}

              {/* Structured parsed body */}
              <div className="blog-content">
                <MarkdownRenderer 
                  content={content} 
                  editorMode={true} 
                  onUpdateElement={handleUpdateElement} 
                  onSectionClick={handleSectionClick}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
