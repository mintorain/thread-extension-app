(() => {
  function collectContent() {
    const selectors = [
      'article p',
      'main p',
      '[role="main"] p',
      '.post-content p',
      '.article-body p',
      '.entry-content p',
      '.story-body p',
      'p',
    ];

    let candidates = [];
    for (const sel of selectors) {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length >= 3) {
        candidates = els;
        break;
      }
    }

    if (candidates.length < 3) {
      candidates = Array.from(document.querySelectorAll('p'));
    }

    const chunks = [];
    const seen = new Set();
    for (const el of candidates) {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length >= 30 && !seen.has(text)) {
        seen.add(text);
        chunks.push(text);
      }
      if (chunks.length >= 30) break;
    }

    let content = chunks.join('\n');
    if (!content) {
      content = (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 5000);
    } else {
      content = content.slice(0, 5000);
    }

    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
    const ogDesc = document.querySelector('meta[property="og:description"]')?.content || '';
    const description = metaDesc || ogDesc;

    if (description && !content.includes(description)) {
      content = description + '\n\n' + content;
    }

    return {
      title: document.title || '제목 없음',
      url: location.href,
      content: content.slice(0, 5000),
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'THREADHOOK_EXTRACT') return;

    try {
      const payload = collectContent();
      sendResponse({ ok: true, payload });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }

    return true;
  });
})();
