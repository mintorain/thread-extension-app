(() => {
  const backendUrlEl = document.getElementById('backendUrl');
  const providerEl = document.getElementById('provider');
  const apiKeyEl = document.getElementById('apiKey');
  const toneEl = document.getElementById('tone');
  const lengthEl = document.getElementById('length');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const extractBtn = document.getElementById('extractBtn');
  const generateBtn = document.getElementById('generateBtn');
  const statusEl = document.getElementById('status');
  const outputEl = document.getElementById('output');

  let extracted = null;

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function setOutput(msg) {
    outputEl.value = msg;
  }
  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for environments where Clipboard API is restricted.
    outputEl.removeAttribute('readonly');
    outputEl.focus();
    outputEl.select();
    document.execCommand('copy');
    outputEl.setAttribute('readonly', 'readonly');
  }

  async function loadSettings() {
    const data = await chrome.storage.local.get(['backendUrl', 'provider', 'tone', 'length']);
    if (data.backendUrl) backendUrlEl.value = data.backendUrl;
    if (data.provider) providerEl.value = data.provider;
    if (data.tone) toneEl.value = data.tone;
    if (data.length) lengthEl.value = data.length;
  }

  async function saveSettings() {
    await chrome.storage.local.set({
      backendUrl: backendUrlEl.value.trim(),
      provider: providerEl.value,
      tone: toneEl.value,
      length: lengthEl.value
    });
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) throw new Error('활성 탭을 찾을 수 없습니다.');
    return tabs[0];
  }

  async function extractCurrentPage() {
    const tab = await getActiveTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'THREADHOOK_EXTRACT' });
    if (!response || !response.ok) {
      throw new Error('페이지 추출 실패. 새로고침 후 다시 시도하세요.');
    }
    extracted = response.payload;
    return extracted;
  }

  async function saveKey() {
    const backendUrl = backendUrlEl.value.trim();
    const provider = providerEl.value;
    const apiKey = apiKeyEl.value.trim();

    if (!apiKey) throw new Error('API Key를 입력하세요.');

    const res = await fetch(`${backendUrl}/v1/keys/${provider}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`키 저장 실패: ${res.status} ${txt}`);
    }

    const data = await res.json();
    return data;
  }

  function formatThread(data) {
    const t = data.thread || {};
    const points = Array.isArray(t.points) ? t.points.map((p, i) => `${i + 1}. ${p}`).join('\n') : '';
    const hashtags = Array.isArray(t.hashtags) ? t.hashtags.join(' ') : '';
    return [
      `[${data.providerUsed}/${data.model}]`,
      '',
      t.hook || '',
      '',
      points,
      '',
      `인사이트: ${t.insight || ''}`,
      `출처: ${t.source || ''}`,
      hashtags
    ].join('\n');
  }

  async function generateThread() {
    const backendUrl = backendUrlEl.value.trim();
    const provider = providerEl.value;
    const tone = toneEl.value;
    const length = lengthEl.value;

    if (!extracted) {
      extracted = await extractCurrentPage();
    }

    const payload = {
      input: {
        title: extracted.title,
        url: extracted.url,
        content: extracted.content
      },
      options: {
        tone,
        length,
        language: 'ko',
        model: null
      },
      providerMode: 'single',
      provider
    };

    const res = await fetch(`${backendUrl}/v1/generate/thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`생성 실패: ${res.status} ${txt}`);
    }

    return res.json();
  }

  saveKeyBtn.addEventListener('click', async () => {
    try {
      setStatus('키 저장 중...');
      await saveSettings();
      const result = await saveKey();
      setStatus(`키 저장 완료 (${result.keyStatus || 'ok'})`);
    } catch (err) {
      setStatus(err.message || String(err));
    }
  });

  extractBtn.addEventListener('click', async () => {
    try {
      setStatus('페이지 추출 중...');
      await saveSettings();
      const data = await extractCurrentPage();
      setStatus('페이지 추출 완료');
      setOutput(`제목: ${data.title}\nURL: ${data.url}\n\n${data.content.slice(0, 700)}...`);
    } catch (err) {
      setStatus(err.message || String(err));
    }
  });

  generateBtn.addEventListener('click', async () => {
    try {
      setStatus('스레드 생성 중...');
      await saveSettings();
      const data = await generateThread();
      const text = formatThread(data);
      setOutput(text);
      await copyToClipboard(text);
      setStatus('스레드 생성 완료 (클립보드 자동 복사됨)');
    } catch (err) {
      setStatus(err.message || String(err));
    }
  });

  loadSettings().catch(() => {
    setStatus('설정 로드 실패');
  });
})();

