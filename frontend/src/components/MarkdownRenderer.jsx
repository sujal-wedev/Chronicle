import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import CodebaseViewer from './CodebaseViewer';

// Custom header renderer for marked to output slugified semantic IDs for the outline navigation
const customRenderer = new marked.Renderer();
customRenderer.heading = ({ text, depth }) => {
  if (depth === 2 || depth === 3) {
    const cleanText = text.replace(/<[^>]*>/g, '');
    const id = cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  }
  return `<h${depth}>${text}</h${depth}>`;
};

// Split raw content into markdown, codebase block, and image sections
export function parseMarkdown(content) {
  if (!content) return [];
  const sections = [];

  // Matches codebase blocks, HTML images, and Markdown image syntax
  const regex = /(```github-repo\r?\n[\s\S]*?\r?\n```|<img\s+[^>]*\/?>|!\[[^\]]*\]\([^)]+\))/gi;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      sections.push({
        type: 'markdown',
        content: content.slice(lastIndex, match.index),
        startIndex: lastIndex,
        endIndex: match.index
      });
    }

    const block = match[0];
    const startIndex = match.index;
    const endIndex = regex.lastIndex;

    if (block.startsWith('```github-repo')) {
      const innerContent = block.replace(/```github-repo\r?\n/, '').replace(/\r?\n```/, '');
      const repoMatch = innerContent.match(/repository:\s*(\S+)/);
      const commitMatch = innerContent.match(/commit:\s*(\S+)/);
      const widthMatch = innerContent.match(/width:\s*(\S+)/);
      const alignMatch = innerContent.match(/align:\s*(\S+)/);

      let repo = repoMatch ? repoMatch[1].trim() : '';
      let commit = commitMatch ? commitMatch[1].trim() : '';
      let width = widthMatch ? widthMatch[1].trim() : '100%';
      let align = alignMatch ? alignMatch[1].trim() : 'center';

      if (repo.includes('github.com/')) {
        const parts = repo.split('github.com/');
        if (parts[1]) {
          repo = parts[1].replace(/\/$/, '');
        }
      }

      sections.push({
        type: 'github-repo',
        raw: block,
        repo,
        commit,
        width,
        align,
        startIndex,
        endIndex
      });
    } else if (block.toLowerCase().startsWith('<img')) {
      const srcMatch = block.match(/src=["']([^"']+)["']/i);
      const altMatch = block.match(/alt=["']([^"']+)["']/i);
      const styleMatch = block.match(/style=["']([^"']+)["']/i);

      const src = srcMatch ? srcMatch[1] : '';
      const alt = altMatch ? altMatch[1] : '';
      const styleStr = styleMatch ? styleMatch[1] : '';

      let width = '100%';
      let align = 'center';

      if (styleStr) {
        const widthVal = styleStr.match(/width:\s*([^;%]+%|[^;px]+px|[^;]+)/i);
        if (widthVal) width = widthVal[1].trim();

        if (styleStr.includes('margin: 0 auto') || styleStr.includes('margin:0 auto')) {
          align = 'center';
        } else if (styleStr.includes('float: left') || styleStr.includes('margin-right: auto')) {
          align = 'left';
        } else if (styleStr.includes('float: right') || styleStr.includes('margin-left: auto')) {
          align = 'right';
        }
      }

      sections.push({
        type: 'image',
        raw: block,
        src,
        alt,
        width,
        align,
        format: 'html',
        startIndex,
        endIndex
      });
    } else {
      // Markdown image: ![alt](url)
      const mdImageMatch = block.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (mdImageMatch) {
        const alt = mdImageMatch[1];
        const src = mdImageMatch[2];
        sections.push({
          type: 'image',
          raw: block,
          src,
          alt,
          width: '100%',
          align: 'center',
          format: 'markdown',
          startIndex,
          endIndex
        });
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    sections.push({
      type: 'markdown',
      content: content.slice(lastIndex),
      startIndex: lastIndex,
      endIndex: content.length
    });
  }

  return sections;
}

// Canva Element Resizer and Toolbar Wrapper
function ResizableWrapper({ children, type, raw, width, align, onUpdate, src, alt, repo, commit }) {
  const [isSelected, setIsSelected] = useState(false);
  const [tempWidth, setTempWidth] = useState(width);
  const containerRef = useRef(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startWidth: 0, side: 'right' });

  useEffect(() => {
    setTempWidth(width);
  }, [width]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsSelected(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragStart = (e, side) => {
    e.preventDefault();
    e.stopPropagation();

    const parentWidth = containerRef.current.parentElement.getBoundingClientRect().width;
    const currentWidthPx = containerRef.current.getBoundingClientRect().width;

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startWidth: currentWidthPx,
      parentWidth,
      side
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragStop);
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.isDragging) return;

    const { startX, startWidth, parentWidth, side } = dragRef.current;
    const deltaX = e.clientX - startX;

    let newWidthPx;
    if (side === 'right') {
      newWidthPx = startWidth + deltaX * 2; // Symmetric sizing
    } else {
      newWidthPx = startWidth - deltaX * 2;
    }

    let newPct = Math.round((newWidthPx / parentWidth) * 100);
    newPct = Math.max(20, Math.min(100, newPct)); // Bound between 20% and 100%

    setTempWidth(`${newPct}%`);
  };

  const handleDragStop = () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragStop);

    triggerUpdate(tempWidth, align);
  };

  const triggerUpdate = (newW, newA) => {
    let newString = '';
    const cleanW = newW.endsWith('%') ? newW : `${newW}%`;

    if (type === 'image') {
      const displayVal = newA === 'center' ? 'block' : 'inline-block';
      const marginVal = newA === 'center' ? '0 auto' : '0';
      const floatVal = newA !== 'center' ? newA : 'none';
      newString = `<img src="${src}" alt="${alt}" style="width: ${cleanW}; display: ${displayVal}; margin: ${marginVal}; float: ${floatVal};" />`;
    } else if (type === 'github-repo') {
      newString = `\`\`\`github-repo\nrepository: ${repo}\ncommit: ${commit}\nwidth: ${cleanW}\nalign: ${newA}\n\`\`\``;
    }
    onUpdate(raw, newString);
  };

  const handleAlignChange = (newA) => {
    triggerUpdate(tempWidth, newA);
  };

  const handlePresetClick = (pct) => {
    setTempWidth(`${pct}%`);
    triggerUpdate(`${pct}%`, align);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to remove this element?')) {
      onUpdate(raw, '');
    }
  };

  const numericWidth = parseInt(tempWidth) || 100;

  return (
    <div
      ref={containerRef}
      className={`canva-resizable-container ${isSelected ? 'selected' : ''}`}
      style={{
        width: tempWidth,
        maxWidth: '100%',
        margin: align === 'center' ? '1.5rem auto' : align === 'left' ? '1.5rem auto 1.5rem 0' : '1.5rem 0 1.5rem auto',
        display: align === 'center' ? 'block' : 'inline-block',
        float: align !== 'center' ? align : 'none'
      }}
      onClick={(e) => {
        e.stopPropagation();
        setIsSelected(true);
      }}
    >
      <span className="canva-type-badge">{type === 'image' ? 'Image' : 'Codebase Explorer'}</span>

      <div style={{ pointerEvents: isSelected ? 'none' : 'auto' }}>
        {children}
      </div>

      {isSelected && (
        <>
          <div
            className="canva-drag-handle bottom-left"
            onMouseDown={(e) => handleDragStart(e, 'left')}
          />
          <div
            className="canva-drag-handle bottom-right"
            onMouseDown={(e) => handleDragStart(e, 'right')}
          />

          <div className="canva-floating-toolbar" onClick={(e) => e.stopPropagation()}>
            {/* Quick width presets */}
            <div className="canva-toolbar-section">
              <button
                type="button"
                className={`canva-toolbar-btn ${numericWidth === 25 ? 'active' : ''}`}
                onClick={() => handlePresetClick(25)}
                style={{ fontSize: '0.65rem' }}
              >
                25%
              </button>
              <button
                type="button"
                className={`canva-toolbar-btn ${numericWidth === 50 ? 'active' : ''}`}
                onClick={() => handlePresetClick(50)}
                style={{ fontSize: '0.65rem' }}
              >
                50%
              </button>
              <button
                type="button"
                className={`canva-toolbar-btn ${numericWidth === 75 ? 'active' : ''}`}
                onClick={() => handlePresetClick(75)}
                style={{ fontSize: '0.65rem' }}
              >
                75%
              </button>
              <button
                type="button"
                className={`canva-toolbar-btn ${numericWidth === 100 ? 'active' : ''}`}
                onClick={() => handlePresetClick(100)}
                style={{ fontSize: '0.65rem' }}
              >
                100%
              </button>
            </div>

            <div className="canva-toolbar-divider" />

            {/* Slider */}
            <div className="canva-slider-container">
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={numericWidth}
                onChange={(e) => setTempWidth(`${e.target.value}%`)}
                onMouseUp={() => triggerUpdate(tempWidth, align)}
                onTouchEnd={() => triggerUpdate(tempWidth, align)}
                className="canva-slider"
              />
              <span className="canva-width-label">{numericWidth}%</span>
            </div>

            <div className="canva-toolbar-divider" />

            {/* Alignments */}
            <div className="canva-toolbar-section">
              <button
                type="button"
                className={`canva-toolbar-btn ${align === 'left' ? 'active' : ''}`}
                onClick={() => handleAlignChange('left')}
                title="Align Left"
              >
                <AlignLeft size={13} />
              </button>
              <button
                type="button"
                className={`canva-toolbar-btn ${align === 'center' ? 'active' : ''}`}
                onClick={() => handleAlignChange('center')}
                title="Align Center"
              >
                <AlignCenter size={13} />
              </button>
              <button
                type="button"
                className={`canva-toolbar-btn ${align === 'right' ? 'active' : ''}`}
                onClick={() => handleAlignChange('right')}
                title="Align Right"
              >
                <AlignRight size={13} />
              </button>
            </div>

            <div className="canva-toolbar-divider" />

            {/* Remove */}
            <button
              type="button"
              className="canva-toolbar-btn danger"
              onClick={handleDelete}
              title="Delete Element"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MarkdownRenderer({ content, editorMode = false, onUpdateElement, onSectionClick }) {
  if (!content) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Start writing in the editor to see your live preview here...</p>;
  }

  const sections = parseMarkdown(content);

  return (
    <>
      {sections.map((section, idx) => {
        if (section.type === 'github-repo') {
          const codebaseNode = (
            <CodebaseViewer
              repo={section.repo}
              commit={section.commit}
              width={section.width}
              align={section.align}
            />
          );

          if (editorMode && onUpdateElement) {
            return (
              <div
                key={idx}
                id={`preview-section-${idx}`}
                onClick={() => onSectionClick && onSectionClick(section.startIndex)}
                style={{ cursor: 'pointer' }}
              >
                <ResizableWrapper
                  type="github-repo"
                  raw={section.raw}
                  width={section.width}
                  align={section.align}
                  onUpdate={onUpdateElement}
                  repo={section.repo}
                  commit={section.commit}
                >
                  {codebaseNode}
                </ResizableWrapper>
              </div>
            );
          }

          // Static reader display mode
          return (
            <div
              key={idx}
              id={`preview-section-${idx}`}
              style={{
                width: section.width,
                maxWidth: '100%',
                margin: section.align === 'center' ? '1.5rem auto' : section.align === 'left' ? '1.5rem auto 1.5rem 0' : '1.5rem 0 1.5rem auto',
                display: section.align === 'center' ? 'block' : 'inline-block',
                float: section.align !== 'center' ? section.align : 'none'
              }}
            >
              {codebaseNode}
            </div>
          );
        } else if (section.type === 'image') {
          const imageNode = (
            <img
              src={section.src}
              alt={section.alt || 'Blog Image'}
              style={{
                width: '100%', // Controlled by outer wrapper dimensions
                height: 'auto',
                display: 'block',
                borderRadius: 'var(--radius-sm)'
              }}
            />
          );

          if (editorMode && onUpdateElement) {
            return (
              <div
                key={idx}
                id={`preview-section-${idx}`}
                onClick={() => onSectionClick && onSectionClick(section.startIndex)}
                style={{ cursor: 'pointer' }}
              >
                <ResizableWrapper
                  type="image"
                  raw={section.raw}
                  width={section.width}
                  align={section.align}
                  onUpdate={onUpdateElement}
                  src={section.src}
                  alt={section.alt}
                >
                  {imageNode}
                </ResizableWrapper>
              </div>
            );
          }

          // Static reader display mode
          return (
            <div
              key={idx}
              id={`preview-section-${idx}`}
              style={{
                width: section.width,
                maxWidth: '100%',
                display: section.align === 'center' ? 'block' : 'inline-block',
                margin: section.align === 'center' ? '1.5rem auto' : '0',
                float: section.align !== 'center' ? section.align : 'none',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <img
                src={section.src}
                alt={section.alt || 'Blog Image'}
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-sm)',
                  display: 'block'
                }}
              />
            </div>
          );
        } else {
          return (
            <div
              key={idx}
              id={`preview-section-${idx}`}
              onClick={() => editorMode && onSectionClick && onSectionClick(section.startIndex)}
              style={{ cursor: editorMode ? 'pointer' : 'inherit' }}
              dangerouslySetInnerHTML={{
                __html: marked.parse(section.content, { renderer: customRenderer })
              }}
            />
          );
        }
      })}
    </>
  );
}
