// Shared nav, lightbox, markdown renderer, blog modal, helpers

// ===== SIMPLE MARKDOWN RENDERER =====
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    // Escape HTML first
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Unordered list items
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:1rem 0;">');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/gs, match => '<ul>' + match + '</ul>');

  // Paragraphs: wrap non-tag lines
  const lines = html.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { out.push(''); continue; }
    if (/^<(h[1-6]|ul|ol|li|blockquote|hr|img|pre|code)/.test(line)) {
      out.push(line);
    } else {
      out.push('<p>' + line + '</p>');
    }
  }
  return out.join('\n');
}

// ===== NAV =====
function renderNav(activePage) {
  const pages = [
    { href: 'projects.html', label: 'Projects' },
    { href: 'blog.html', label: 'Blog' },
    { href: 'index.html#about', label: 'About' }
  ];
  const links = pages.map(p =>
    `<li><a href="${p.href}"${activePage === p.href ? ' class="active"' : ''}>${p.label}</a></li>`
  ).join('');
  return `
    <nav class="site-nav">
      <a href="index.html" class="nav-logo">MHC.dev</a>
      <ul class="nav-links" id="navLinks">${links}</ul>
      <div style="display:flex;align-items:center;gap:1rem;">
        <a href="admin.html" class="nav-admin-link">Admin</a>
        <button class="nav-toggle" id="navToggle" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  `;
}

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
}

// ===== FULLSCREEN BLOG MODAL =====
let blogModal;
function initBlogModal() {
  if (document.getElementById('globalBlogModal')) return;
  blogModal = document.createElement('div');
  blogModal.id = 'globalBlogModal';
  blogModal.className = 'blog-fullscreen-modal';
  blogModal.innerHTML = `
    <div class="blog-fullscreen-inner">
      <div class="blog-fullscreen-header">
        <button class="blog-fullscreen-close" id="blogModalClose">&times; Close</button>
      </div>
      <div class="blog-fullscreen-content" id="blogModalContent"></div>
    </div>
  `;
  document.body.appendChild(blogModal);

  document.getElementById('blogModalClose').addEventListener('click', closeBlogModal);
  blogModal.addEventListener('click', e => { if (e.target === blogModal) closeBlogModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBlogModal(); });
}

function openBlogModal(postId) {
  const post = getPostById(postId);
  if (!post) return;
  const imgHtml = post.media
    ? `<img src="${post.media}" alt="${post.title}" class="blog-hero-img">`
    : '';
  document.getElementById('blogModalContent').innerHTML = `
    <div class="blog-article-meta">
      <span class="post-cat">${post.category || 'General'}</span>
      <span class="blog-article-date">${post.date || ''}</span>
    </div>
    <h1 class="blog-article-title">${post.title}</h1>
    ${imgHtml}
    <div class="blog-article-body markdown-body">${renderMarkdown(post.content || post.summary)}</div>
  `;
  blogModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('blogModalContent').scrollTop = 0;
}

function closeBlogModal() {
  if (blogModal) {
    blogModal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ===== PROJECT CARD RENDERER =====
function renderProjectCard(p) {
  const tags = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const mediaHtml = (p.media && p.media.length)
    ? `<div class="project-media">${p.media.map(src => `<img src="${src}" alt="${p.title}" onclick="openLightbox('${src}')" loading="lazy">`).join('')}</div>`
    : '';
  const videoHtml = p.video
    ? `<video class="project-video" controls preload="none"><source src="${p.video}" type="video/mp4">Your browser does not support video.</video>`
    : '';
  const linkHtml = p.link
    ? `<a href="${p.link}" target="_blank" rel="noopener" class="project-link">View Project &rarr;</a>`
    : '';
  const date = p.date ? `<span style="font-family:var(--mono);font-size:0.7rem;color:var(--muted);">${p.date}</span>` : '';
  const pinnedBadge = p.pinned ? `<span class="pinned-badge">📌 Pinned</span>` : '';

  // Blog journey block — only show if blogId is set and the post exists
  let blogBlock = '';
  if (p.blogId) {
    const post = getPostById(p.blogId);
    if (post) {
      blogBlock = `
        <div class="project-blog-block">
          <div class="project-blog-label">📖 Full Journey</div>
          <div class="project-blog-title">${post.title}</div>
          <div class="project-blog-summary">${post.summary}</div>
          <button class="project-blog-btn" onclick="openBlogModal('${post.id}')">Read Full Journey &rarr;</button>
        </div>
      `;
    }
  }

  return `
    <div class="project-card fade-up">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;flex-wrap:wrap;">
        <div class="project-card-title">${p.title}</div>
        <div style="display:flex;gap:0.5rem;align-items:center;">${pinnedBadge}${date}</div>
      </div>
      <p class="project-card-desc">${p.description}</p>
      <div class="project-tags">${tags}</div>
      ${mediaHtml}
      ${videoHtml}
      <div class="project-card-actions">
        ${linkHtml}
      </div>
      ${blogBlock}
    </div>
  `;
}

function renderProjectsSection(category, sectionEl) {
  const projects = getProjects(category);
  if (!projects.length) {
    sectionEl.innerHTML = '<div class="empty-state">No projects yet. Add some via the Admin panel.</div>';
    return;
  }
  sectionEl.innerHTML = `<div class="projects-grid">${projects.map(renderProjectCard).join('')}</div>`;
}

// ===== LIGHTBOX =====
let lightbox;
function initLightbox() {
  lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button class="lightbox-close" onclick="closeLightbox()">&times;</button><img id="lb-img" src="" alt="">';
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.body.appendChild(lightbox);
}
function openLightbox(src) {
  document.getElementById('lb-img').src = src;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  refreshCategoryNames();
  initLightbox();
  initBlogModal();
  initMobileNav();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); closeBlogModal(); } });
