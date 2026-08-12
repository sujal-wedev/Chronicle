import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Search, 
  Terminal, 
  EyeOff, 
  Eye, 
  Settings, 
  AlertTriangle,
  FolderTree
} from 'lucide-react';
import Prism from 'prismjs';

// Load Prism languages
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css';

import './CodebaseViewer.css';

// Helpers

// Helper to construct a nested hierarchy from the GitHub API flat tree
function buildFileTree(flatTree) {
  const root = { name: 'root', type: 'tree', children: {} };

  flatTree.forEach(node => {
    const parts = node.path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const type = isLast ? node.type : 'tree';

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: node.path,
          type: type,
          sha: isLast ? node.sha : undefined,
          children: type === 'tree' ? {} : undefined
        };
      }
      current = current.children[part];
    });
  });

  function convertToArray(node) {
    if (node.type === 'tree' && node.children) {
      node.children = Object.values(node.children);
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'tree' ? -1 : 1; // Folders first
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(convertToArray);
    }
  }

  convertToArray(root);
  return root.children;
}

// Get appropriate file icon and color
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const iconProps = { size: 14, className: 'tree-node-icon' };

  switch (ext) {
    case 'go':
      return <FileCode {...iconProps} style={{ color: '#00add8' }} />;
    case 'js':
    case 'jsx':
      return <FileCode {...iconProps} style={{ color: '#f7df1e' }} />;
    case 'ts':
    case 'tsx':
      return <FileCode {...iconProps} style={{ color: '#3178c6' }} />;
    case 'css':
      return <FileCode {...iconProps} style={{ color: '#264de4' }} />;
    case 'html':
      return <FileCode {...iconProps} style={{ color: '#e34c26' }} />;
    case 'json':
      return <Settings {...iconProps} style={{ color: '#cbcb41' }} />;
    case 'md':
      return <File {...iconProps} style={{ color: '#083fa1' }} />;
    default:
      return <File {...iconProps} style={{ color: '#a0a0a0' }} />;
  }
}

// Determine Prism syntax language identifier
function getLanguageFromExtension(filename) {
  if (!filename) return 'markup';
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'jsx';
    case 'ts':
    case 'tsx':
      return 'tsx';
    case 'go':
      return 'go';
    case 'css':
      return 'css';
    case 'html':
    case 'xml':
      return 'markup';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'markup';
  }
}

export default function CodebaseViewer({ repo, commit, width = '100%', align = 'center' }) {
  const [height, setHeight] = useState(520);
  const heightDragRef = useRef({ isDragging: false, startY: 0, startHeight: 0 });

  const handleHeightDragStart = (e) => {
    e.preventDefault();
    heightDragRef.current = {
      isDragging: true,
      startY: e.clientY,
      startHeight: height
    };
    document.addEventListener('mousemove', handleHeightDragMove);
    document.addEventListener('mouseup', handleHeightDragStop);
  };

  const handleHeightDragMove = (e) => {
    if (!heightDragRef.current.isDragging) return;
    const deltaY = e.clientY - heightDragRef.current.startY;
    const newHeight = Math.max(300, Math.min(1000, heightDragRef.current.startHeight + deltaY));
    setHeight(newHeight);
  };

  const handleHeightDragStop = () => {
    heightDragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleHeightDragMove);
    document.removeEventListener('mouseup', handleHeightDragStop);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleHeightDragMove);
      document.removeEventListener('mouseup', handleHeightDragStop);
    };
  }, []);

  const [flatTree, setFlatTree] = useState([]);
  const [tree, setTree] = useState([]);
  const [openFolders, setOpenFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs management
  const [tabs, setTabs] = useState([]);
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [fileContents, setFileContents] = useState({});

  const codeContainerRef = useRef(null);
  const lineGutterRef = useRef(null);

  // Sync scrolling of line numbers gutter and code content
  const handleScroll = () => {
    if (codeContainerRef.current && lineGutterRef.current) {
      lineGutterRef.current.scrollTop = codeContainerRef.current.scrollTop;
    }
  };

  // Fetch codebase tree on mount or when repo/commit changes
  useEffect(() => {
    if (!repo || !commit) {
      setError('Missing repository or commit hash.');
      setLoading(false);
      return;
    }

    const fetchTree = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`;
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('GitHub API rate limit exceeded or access denied. Please try again later.');
          }
          if (response.status === 404) {
            throw new Error('Repository or commit hash not found. Please verify the link and commit hash.');
          }
          throw new Error(`Failed to load repository (${response.statusText})`);
        }
        const data = await response.json();
        if (!data.tree || !Array.isArray(data.tree)) {
          throw new Error('Invalid repository data format received.');
        }

        setFlatTree(data.tree);
        const structuredTree = buildFileTree(data.tree);
        setTree(structuredTree);
        
        // Auto-expand top level folders by default
        const initialOpen = {};
        structuredTree.forEach(node => {
          if (node.type === 'tree') {
            initialOpen[node.path] = true;
          }
        });
        setOpenFolders(initialOpen);

      } catch (err) {
        console.error('Error fetching tree:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [repo, commit]);

  // Fetch file content when tab changes or a new file is opened
  const fetchFileContent = async (path) => {
    if (fileContents[path]) return; // Already fetched

    setFileContents(prev => ({
      ...prev,
      [path]: { text: '', loading: true, error: null }
    }));

    try {
      const url = `https://raw.githubusercontent.com/${repo}/${commit}/${path}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not fetch file content (${response.statusText})`);
      }
      const text = await response.text();
      setFileContents(prev => ({
        ...prev,
        [path]: { text, loading: false, error: null }
      }));
    } catch (err) {
      console.error(`Error fetching file content for ${path}:`, err);
      setFileContents(prev => ({
        ...prev,
        [path]: { text: '', loading: false, error: err.message }
      }));
    }
  };

  // Handle folder expand/collapse toggle
  const toggleFolder = (path) => {
    setOpenFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Open file in tabs
  const openFile = (node) => {
    if (tabs.some(tab => tab.path === node.path)) {
      setActiveTabPath(node.path);
    } else {
      const newTab = { name: node.name, path: node.path, sha: node.sha };
      setTabs([...tabs, newTab]);
      setActiveTabPath(node.path);
    }
    fetchFileContent(node.path);
  };

  // Close tab
  const closeTab = (e, path) => {
    e.stopPropagation();
    const remainingTabs = tabs.filter(tab => tab.path !== path);
    setTabs(remainingTabs);

    if (activeTabPath === path) {
      if (remainingTabs.length > 0) {
        setActiveTabPath(remainingTabs[remainingTabs.length - 1].path);
      } else {
        setActiveTabPath(null);
      }
    }
  };

  // Renders the recursive tree nodes
  const renderTreeNodes = (nodes, level = 0) => {
    return nodes.map(node => {
      const isFolder = node.type === 'tree';
      const isOpen = !!openFolders[node.path];
      const isActive = activeTabPath === node.path;
      const paddingLeft = `${level * 12 + 10}px`;

      if (isFolder) {
        return (
          <div key={node.path}>
            <div 
              className="tree-node"
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft }}
            >
              <span className="tree-node-icon" style={{ color: '#858585' }}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className="tree-node-icon" style={{ color: isOpen ? '#e5c07b' : '#d19a66' }}>
                {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
              </span>
              <span className="tree-node-label">{node.name}</span>
            </div>
            {isOpen && node.children && renderTreeNodes(node.children, level + 1)}
          </div>
        );
      } else {
        return (
          <div 
            key={node.path}
            className={`tree-node ${isActive ? 'active' : ''}`}
            onClick={() => openFile(node)}
            style={{ paddingLeft: `${level * 12 + 24}px` }}
          >
            {getFileIcon(node.name)}
            <span className="tree-node-label">{node.name}</span>
          </div>
        );
      }
    });
  };

  // Search filter output
  const renderSearchMatches = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return null;

    const matches = flatTree.filter(node => 
      node.type === 'blob' && node.path.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      return (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#858585', fontSize: '0.8rem' }}>
          No files matching "{searchQuery}"
        </div>
      );
    }

    return matches.map(node => {
      const filename = node.path.split('/').pop();
      const folderPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const isActive = activeTabPath === node.path;

      return (
        <div 
          key={node.path}
          className={`tree-node ${isActive ? 'active' : ''}`}
          onClick={() => openFile({ name: filename, path: node.path, sha: node.sha })}
          style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '6px 12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {getFileIcon(filename)}
            <span style={{ fontWeight: 600 }}>{filename}</span>
          </div>
          {folderPath && (
            <span style={{ fontSize: '0.68rem', color: '#6b6b6b', marginLeft: '20px' }}>
              {folderPath}
            </span>
          )}
        </div>
      );
    });
  };

  // Find active tab file data
  const activeTab = tabs.find(tab => tab.path === activeTabPath);
  const activeFile = activeTabPath ? fileContents[activeTabPath] : null;

  // Run Prism code highlight
  const getHighlightedCode = (text, language) => {
    try {
      if (!Prism.languages[language]) {
        return text;
      }
      return Prism.highlight(text, Prism.languages[language], language);
    } catch (e) {
      console.error('Prism highlighting error:', e);
      return text;
    }
  };

  // Render Editor Main Content Pane
  const renderEditorContent = () => {
    if (!activeTabPath || !activeFile) {
      return (
        <div className="codebase-empty-state">
          <FolderTree size={48} className="codebase-empty-icon" />
          <h3 className="codebase-empty-title">{repo.split('/').pop()}</h3>
          <p className="codebase-empty-desc">
            Explore and review this commit's files. Select any file from the explorer sidebar to read the code.
          </p>
        </div>
      );
    }

    if (activeFile.loading) {
      return (
        <div className="codebase-shimmer-overlay">
          <div className="codebase-spinner" />
          <span>Fetching file contents from GitHub...</span>
        </div>
      );
    }

    if (activeFile.error) {
      return (
        <div className="codebase-error-ui">
          <AlertTriangle size={32} style={{ color: '#f48771', marginBottom: '10px' }} />
          <div className="codebase-error-title">Could Not Load File</div>
          <div className="codebase-error-desc">{activeFile.error}</div>
          <button className="codebase-error-btn" onClick={() => fetchFileContent(activeTabPath)}>
            Retry Download
          </button>
        </div>
      );
    }

    const language = getLanguageFromExtension(activeTab.name);
    const highlightedHtml = getHighlightedCode(activeFile.text, language);
    const lines = activeFile.text.split('\n');

    return (
      <>
        {/* Line Numbers Gutter */}
        <div className="codebase-line-numbers" ref={lineGutterRef}>
          {lines.map((_, i) => (
            <div key={i} className="codebase-line-number">{i + 1}</div>
          ))}
        </div>

        {/* Code Content */}
        <div 
          className="codebase-code-container" 
          ref={codeContainerRef}
          onScroll={handleScroll}
        >
          <pre className="codebase-code-pre">
            <code 
              className={`language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml || ' ' }}
            />
          </pre>
        </div>
      </>
    );
  };

  return (
    <div 
      className="codebase-container"
      style={{
        width: width,
        maxWidth: '100%',
        margin: align === 'center' ? '2rem auto' : align === 'left' ? '2rem auto 2rem 0' : '2rem 0 2rem auto',
        height: `${height}px`
      }}
    >
      {/* Loading main overlay */}
      {loading && (
        <div className="codebase-shimmer-overlay">
          <div className="codebase-spinner" />
          <span>Loading repository explorer ({repo})...</span>
        </div>
      )}

      {/* Main error layout */}
      {error && (
        <div className="codebase-error-ui" style={{ flex: 1 }}>
          <AlertTriangle size={40} style={{ color: '#f48771', marginBottom: '12px' }} />
          <div className="codebase-error-title" style={{ fontSize: '1.2rem' }}>Failed to Load Workspace</div>
          <div className="codebase-error-desc" style={{ maxWidth: '400px' }}>{error}</div>
          <button className="codebase-error-btn" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="codebase-workspace">
            {/* Sidebar Gutter Switcher (VS Code activity bar mockup) */}
            <div className="codebase-gutter-toggle">
              <div 
                className={`gutter-action ${!sidebarCollapsed ? 'active' : ''}`}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Show File Explorer' : 'Hide File Explorer'}
              >
                {sidebarCollapsed ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
            </div>

            {/* Sidebar Drawer */}
            <div className={`codebase-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
              <div className="codebase-sidebar-header">
                <span className="codebase-sidebar-title">Explorer</span>
                <span style={{ fontSize: '0.65rem', color: '#858585', fontStyle: 'italic' }}>
                  sha: {commit.substring(0, 7)}
                </span>
              </div>

              {/* Sidebar Search */}
              <div className="codebase-search-box">
                <span className="codebase-search-icon">
                  <Search size={12} />
                </span>
                <input 
                  type="text" 
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="codebase-search-input"
                />
              </div>

              {/* Sidebar Tree list */}
              <div className="codebase-file-tree">
                {searchQuery.trim() ? renderSearchMatches() : renderTreeNodes(tree)}
              </div>
            </div>

            {/* Editor Workspace Panel */}
            <div className="codebase-editor-panel">
              {/* Tab headers bar */}
              {tabs.length > 0 && (
                <div className="codebase-tabs-bar">
                  {tabs.map(tab => {
                    const isActive = tab.path === activeTabPath;
                    return (
                      <div 
                        key={tab.path}
                        className={`codebase-tab ${isActive ? 'active' : ''}`}
                        onClick={() => openFile(tab)}
                      >
                        {getFileIcon(tab.name)}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {tab.name}
                        </span>
                        <button 
                          className="codebase-tab-close" 
                          onClick={(e) => closeTab(e, tab.path)}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Breadcrumbs Row */}
              {activeTab && (
                <div className="codebase-breadcrumbs">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Terminal size={10} /> {repo.split('/').pop()}
                  </span>
                  {activeTabPath.split('/').map((part, i, arr) => (
                    <span key={i} className="breadcrumb-item">
                      <span className="breadcrumb-separator">/</span>
                      <span>{part}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Editor Workspace view */}
              <div className="codebase-editor-body">
                {renderEditorContent()}
              </div>
            </div>
          </div>

          {/* Height resizer bar */}
          <div className="codebase-height-resizer" onMouseDown={handleHeightDragStart} />

          {/* Codebase Status Bar */}
          <div className="codebase-status-bar">
            <div className="status-bar-section">
              <div className="status-bar-item status-bar-item-clickable" onClick={() => window.open(`https://github.com/${repo}/tree/${commit}`, '_blank')}>
                <Terminal size={11} />
                <span>github.com/{repo}</span>
              </div>
              <div className="status-bar-item" style={{ opacity: 0.7 }}>
                <span>({commit.substring(0, 7)})</span>
              </div>
            </div>
            
            {activeTab && activeFile && !activeFile.loading && !activeFile.error && (
              <div className="status-bar-section">
                <div className="status-bar-item">
                  <span>Lines {activeFile.text.split('\n').length}</span>
                </div>
                <div className="status-bar-item" style={{ textTransform: 'uppercase' }}>
                  <span>{getLanguageFromExtension(activeTab.name)}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
