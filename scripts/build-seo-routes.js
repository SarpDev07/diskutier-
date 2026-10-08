const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\PRIVAT\\diskutier.ch';
const BASE_HTML = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const POLLS = require('C:\\Users\\Info\\Documents\\diskutier-backups\\backup_20261008_pre_v2_migration\\polls.json');
const POSTS = require('C:\\Users\\Info\\Documents\\diskutier-backups\\backup_20261008_pre_v2_migration\\posts.json');

const CATEGORIES = [
  'Schweiz & Politik',
  'Geld & Beruf',
  'Wohnen',
  'Beziehungen',
  'Alltag',
  'Technologie',
  'Gesellschaft',
  'Essen',
  'Gaming',
  'Auto & Mobilität',
  'Sport',
  'Schule & Ausbildung'
];

const STATIC_PAGES = [
  { path: 'schweiz-match', title: 'Dein persönlicher Schweiz-Match | statistisches Profil', desc: 'Finde heraus, wie typisch schweizerisch du denkst. Vergleiche deine Meinungen zu Politik, Alltag und Geld mit der Schweizer Mehrheit.' },
  { path: 'beitraege', title: 'Aktuelle Debatten & Foren-Beiträge', desc: 'Alle Community-Beiträge und Diskussionen aus der ganzen Schweiz im Überblick.' },
  { path: 'kategorien', title: 'Themen & Kategorien', desc: 'Wähle aus Themen wie Politik, Wirtschaft, Wohnen, Beziehungen und Technik.' },
  { path: 'ueber-uns', title: 'Über diskutier.ch', desc: 'Erfahre mehr über die unabhängige Schweizer Meinungsplattform diskutier.ch.' },
  { path: 'kontakt', title: 'Kontakt & Support', desc: 'Nimm Kontakt mit dem Team von diskutier.ch auf.' },
  { path: 'datenschutz', title: 'Datenschutzerklärung', desc: 'Datenschutzbestimmungen von diskutier.ch gemäss Schweizer DSG.' },
  { path: 'impressum', title: 'Impressum', desc: 'Rechtliche Informationen und Kontaktangaben zu diskutier.ch.' },
  { path: 'richtlinien', title: 'Community-Richtlinien', desc: 'Regeln für respektvolle und konstruktive Debatten auf diskutier.ch.' }
];

function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/é|è|ê|ë/g, "e")
    .replace(/à|â/g, "a")
    .replace(/ô/g, "o")
    .replace(/ç/g, "c")
    .replace(/chf\s*/g, "chf-")
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryToSlug(catName) {
  return slugify(catName.replace(/&/g, "").replace(/\+/g, ""));
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generatePrerenderHtml({ title, description, canonicalUrl, ogType = 'website', jsonLd = null }) {
  let html = BASE_HTML;

  // Title
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} | diskutier.ch</title>`);
  
  // Description
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${escapeHtml(description)}">`);
  
  // Canonical
  html = html.replace(/<link rel="canonical" href=".*?">/, `<link rel="canonical" href="${canonicalUrl}">`);
  
  // Open Graph
  html = html.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${canonicalUrl}">`);
  html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${escapeHtml(title)} | diskutier.ch">`);
  html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:type" content=".*?">/, `<meta property="og:type" content="${ogType}">`);

  // Twitter
  html = html.replace(/<meta name="twitter:url" content=".*?">/, `<meta name="twitter:url" content="${canonicalUrl}">`);
  html = html.replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${escapeHtml(title)} | diskutier.ch">`);
  html = html.replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);

  if (jsonLd) {
    const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n</head>`;
    html = html.replace('</head>', jsonLdScript);
  }

  return html;
}

function ensureDirAndWrite(relPath, content) {
  const fullDirPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullDirPath)) {
    fs.mkdirSync(fullDirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(fullDirPath, 'index.html'), content, 'utf-8');
}

async function buildAll() {
  console.log('Building static routes & SEO prerender shells...');

  const sitemapUrls = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Root Homepage
  sitemapUrls.push({
    loc: 'https://diskutier.ch/',
    changefreq: 'daily',
    priority: '1.0',
    lastmod: today
  });

  // 2. Static Pages
  for (const page of STATIC_PAGES) {
    const canonical = `https://diskutier.ch/${page.path}`;
    const html = generatePrerenderHtml({
      title: page.title,
      description: page.desc,
      canonicalUrl: canonical
    });
    ensureDirAndWrite(page.path, html);
    sitemapUrls.push({
      loc: canonical,
      changefreq: page.path === 'beitraege' || page.path === 'schweiz-match' ? 'daily' : 'weekly',
      priority: page.path === 'beitraege' || page.path === 'schweiz-match' ? '0.9' : '0.7',
      lastmod: today
    });
    console.log(`-> Generated static route: /${page.path}/index.html`);
  }

  // 3. Categories
  for (const cat of CATEGORIES) {
    const slug = categoryToSlug(cat);
    const canonical = `https://diskutier.ch/kategorie/${slug}`;
    const html = generatePrerenderHtml({
      title: `${cat} — Meinungen & Abstimmungen`,
      description: `Alle Schweizer Abstimmungen und Forendiskussionen zur Kategorie ${cat} auf diskutier.ch.`,
      canonicalUrl: canonical
    });
    ensureDirAndWrite(`kategorie/${slug}`, html);
    sitemapUrls.push({
      loc: canonical,
      changefreq: 'daily',
      priority: '0.8',
      lastmod: today
    });
    console.log(`-> Generated category route: /kategorie/${slug}/index.html`);
  }

  // 4. Polls (Fragen)
  for (const poll of POLLS) {
    const slug = slugify(poll.title);
    const canonical = `https://diskutier.ch/frage/${slug}`;
    const desc = poll.description || `Stimme jetzt ab: «${poll.title}». Sieh die Schweizer Mehrheitsergebnisse in Echtzeit.`;
    
    const options = Array.isArray(poll.options) ? poll.options : ["JA", "NEIN"];
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Question",
      "name": poll.title,
      "text": desc,
      "dateCreated": poll.created_at || today,
      "author": {
        "@type": "Organization",
        "name": "diskutier.ch"
      },
      "suggestedAnswer": options.map(opt => ({
        "@type": "Answer",
        "text": opt
      }))
    };

    const html = generatePrerenderHtml({
      title: poll.title,
      description: desc,
      canonicalUrl: canonical,
      jsonLd: jsonLd
    });
    ensureDirAndWrite(`frage/${slug}`, html);
    sitemapUrls.push({
      loc: canonical,
      changefreq: 'daily',
      priority: '0.9',
      lastmod: (poll.created_at ? poll.created_at.split('T')[0] : today)
    });
    console.log(`-> Generated poll route: /frage/${slug}/index.html`);
  }

  // 5. Posts (Beiträge)
  for (const post of POSTS) {
    const slug = slugify(post.title);
    const canonical = `https://diskutier.ch/beitrag/${slug}`;
    const desc = post.excerpt || `Diskutiere mit: «${post.title}». Teile deine Meinung auf diskutier.ch.`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      "headline": post.title,
      "articleBody": desc,
      "datePublished": post.created_at || today,
      "mainEntityOfPage": canonical,
      "author": {
        "@type": "Person",
        "name": "Community-Mitglied"
      },
      "publisher": {
        "@type": "Organization",
        "name": "diskutier.ch",
        "logo": {
          "@type": "ImageObject",
          "url": "https://diskutier.ch/logo.png"
        }
      }
    };

    const html = generatePrerenderHtml({
      title: post.title,
      description: desc,
      canonicalUrl: canonical,
      jsonLd: jsonLd
    });
    ensureDirAndWrite(`beitrag/${slug}`, html);
    sitemapUrls.push({
      loc: canonical,
      changefreq: 'daily',
      priority: '0.8',
      lastmod: (post.created_at ? post.created_at.split('T')[0] : today)
    });
    console.log(`-> Generated post route: /beitrag/${slug}/index.html`);
  }

  // 6. Generate Clean, Valid XML Sitemap with lastmod
  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const item of sitemapUrls) {
    sitemapXml += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>\n`;
  }
  sitemapXml += `</urlset>\n`;
  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log(`-> sitemap.xml updated with ${sitemapUrls.length} verified URLs.`);

  // 7. Write vercel.json
  const vercelConfig = {
    "version": 2,
    "cleanUrls": true,
    "trailingSlash": false,
    "headers": [
      {
        "source": "/sitemap.xml",
        "headers": [
          { "key": "Content-Type", "value": "application/xml; charset=utf-8" },
          { "key": "Cache-Control", "value": "public, max-age=3600, s-maxage=3600" }
        ]
      },
      {
        "source": "/robots.txt",
        "headers": [
          { "key": "Content-Type", "value": "text/plain; charset=utf-8" }
        ]
      }
    ],
    "rewrites": [
      { "source": "/sitemap.xml", "destination": "/sitemap.xml" },
      { "source": "/robots.txt", "destination": "/robots.txt" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  };
  fs.writeFileSync(path.join(ROOT_DIR, 'vercel.json'), JSON.stringify(vercelConfig, null, 2), 'utf-8');
  console.log('-> vercel.json created.');

  // 8. Write _redirects for Cloudflare Pages / Netlify
  const redirectsContent = `/sitemap.xml  /sitemap.xml  200\n/robots.txt   /robots.txt   200\n/*            /index.html   200\n`;
  fs.writeFileSync(path.join(ROOT_DIR, '_redirects'), redirectsContent, 'utf-8');
  console.log('-> _redirects created.');

  console.log('=== BUILD COMPLETE: ALL ROUTES GENERATED SUCCESSFULLY ===');
}

buildAll().catch(err => {
  console.error('Build Error:', err);
  process.exit(1);
});
