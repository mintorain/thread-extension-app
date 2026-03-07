(() => {
  function collectContent() {
    const articlePs = Array.from(document.querySelectorAll('article p'));
    const genericPs = Array.from(document.querySelectorAll('p'));
    const candidates = articlePs.length >= 3 ? articlePs : genericPs;

    const chunks = [];
    for (const el of candidates) {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length >= 40) {
        chunks.push(text);
      }
      if (chunks.length >= 20) break;
    }

    let content = chunks.join('\n');
    if (!content) {
      content = (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 4000);
    } else {
      content = content.slice(0, 5000);
    }

    return {
      title: document.title || '제목 없음',
      url: location.href,
      content,
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
