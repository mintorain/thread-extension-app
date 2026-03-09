(() => {
  const backendUrlEl = document.getElementById('backendUrl');
  const providerEl = document.getElementById('provider');
  const apiKeyEl = document.getElementById('apiKey');
  const toneEl = document.getElementById('tone');
  const lengthEl = document.getElementById('length');

  const settingsPanelEl = document.getElementById('settingsPanel');
  const settingsToggleBtn = document.getElementById('settingsToggleBtn');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const testBackendBtn = document.getElementById('testBackendBtn');

  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const getKeyLink = document.getElementById('getKeyLink');

  const extractBtn = document.getElementById('extractBtn');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const statusEl = document.getElementById('status');
  const outputEl = document.getElementById('output');

  let extracted = null;
  let lastOutput = '';

  const PROVIDER_KEY_URLS = {
    claude: 'https://console.anthropic.com/settings/keys',
    chatgpt: 'https://platform.openai.com/api-keys',
    gemini: 'https://aistudio.google.com/apikey',
    grok: 'https://console.x.ai/',
  };

  const PROVIDER_KEY_PLACEHOLDERS = {
    claude: 'sk-ant-...',
    chatgpt: 'sk-proj-...',
    gemini: 'AI...',
    grok: 'xai-...',
  };

  function setStatus(msg, type) {
    statusEl.className = 'status';
    if (type === 'error') {
      statusEl.className = 'status status-error';
      statusEl.innerHTML = msg;
    } else if (type === 'success') {
      statusEl.className = 'status status-success';
      statusEl.innerHTML = msg;
    } else if (type === 'loading') {
      statusEl.className = 'status status-loading';
      statusEl.innerHTML = '<span class="spinner"></span>' + msg;
    } else {
      statusEl.textContent = msg;
    }
  }

  function setOutput(msg) {
    outputEl.value = msg;
    lastOutput = msg;
    if (copyBtn) {
      copyBtn.classList.toggle('hidden', !msg);
    }
  }

  function setButtonsDisabled(disabled) {
    extractBtn.disabled = disabled;
    generateBtn.disabled = disabled;
  }

  function showSettingsPanel(show) {
    settingsPanelEl.classList.toggle('hidden', !show);
  }

  function updateProviderUI() {
    const provider = providerEl.value;
    if (getKeyLink) {
      getKeyLink.href = PROVIDER_KEY_URLS[provider] || '#';
    }
    if (apiKeyEl) {
      apiKeyEl.placeholder = PROVIDER_KEY_PLACEHOLDERS[provider] || 'API Key';
    }
  }

  function normalizeBackendUrl(raw) {
    const value = (raw || '').trim();
    if (!value) throw new Error('Backend URL이 비어 있습니다.');
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error('Backend URL 형식이 올바르지 않습니다. 예: https://threadhook-api-production.up.railway.app');
    }
    if (!/^https?:$/.test(url.protocol)) {
      throw new Error('Backend URL은 http 또는 https만 지원합니다.');
    }
    return url.origin;
  }

  function toHelpfulError(err, backendUrl) {
    const msg = err?.message || String(err);
    if (/Failed to fetch|NetworkError|ERR_CONNECTION|Load failed|fetch failed/i.test(msg)) {
      return `백엔드 연결 실패: ${backendUrl}\n1) 서버 실행 여부\n2) URL/포트 확인`;
    }
    if (/timeout/i.test(msg)) {
      return `백엔드 응답 지연(타임아웃): ${backendUrl} (서버 상태 확인 필요)`;
    }
    return msg;
  }

  async function apiFetch(path, options = {}) {
    const backendUrl = normalizeBackendUrl(backendUrlEl.value);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('timeout')), 60000);

    try {
      const res = await fetch(`${backendUrl}${path}`, {
        ...options,
        signal: controller.signal
      });
      return res;
    } catch (err) {
      throw new Error(toHelpfulError(err, backendUrl));
    } finally {
      clearTimeout(timeout);
    }
  }

  async function testBackendConnection() {
    const res = await apiFetch('/health', { method: 'GET' });
    if (!res.ok) {
      throw new Error(`백엔드 연결 실패: /health ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    if (data?.ok !== true) {
      throw new Error('백엔드 응답 형식이 예상과 다릅니다. /health 확인 필요');
    }
    return true;
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
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
    updateProviderUI();
  }

  async function saveSettings() {
    await chrome.storage.local.set({
      backendUrl: backendUrlEl.value.trim(),
      provider: providerEl.value,
      tone: toneEl.value,
      length: lengthEl.value,
    });
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) throw new Error('활성 탭을 찾을 수 없습니다.');
    return tabs[0];
  }

  async function ensureContentScript(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'THREADHOOK_PING' });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
    }
  }

  async function extractCurrentPage() {
    const tab = await getActiveTab();
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      throw new Error('Chrome 내부 페이지에서는 콘텐츠를 추출할 수 없습니다. 뉴스/블로그 페이지에서 시도하세요.');
    }
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'THREADHOOK_EXTRACT' });
    if (!response || !response.ok) {
      throw new Error('페이지 추출 실패. 페이지를 새로고침한 후 다시 시도하세요.');
    }
    extracted = response.payload;
    return extracted;
  }

  async function saveKey() {
    const provider = providerEl.value;
    const apiKey = apiKeyEl.value.trim();
    if (!apiKey) throw new Error('API Key를 입력하세요.');

    const res = await apiFetch(`/v1/keys/${provider}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`API 등록 실패: ${res.status} ${txt}`);
    }
    return res.json();
  }

  function formatThread(data) {
    const t = data.thread || {};
    const points = Array.isArray(t.points) ? t.points.map((p, i) => `${i + 1}. ${p}`).join('\n') : '';
    const hashtags = Array.isArray(t.hashtags) ? t.hashtags.join(' ') : '';
    const metrics = data.metrics || {};
    return [
      `[${data.providerUsed}/${data.model}]`,
      '',
      t.hook || '',
      '',
      points,
      '',
      `인사이트: ${t.insight || ''}`,
      `출처: ${t.source || ''}`,
      hashtags,
      '',
      metrics.tokenIn ? `(토큰: ${metrics.tokenIn} in / ${metrics.tokenOut} out)` : '',
    ].filter(Boolean).join('\n');
  }

  async function generateThread() {
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
      options: { tone, length, language: 'ko', model: null },
      providerMode: 'single',
      provider,
      authMethod: 'api_key'
    };

    const res = await apiFetch('/v1/generate/thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let msg = `생성 실패 (${res.status})`;
      try {
        const errBody = await res.json();
        if (errBody.detail) msg = errBody.detail;
      } catch {
        const txt = await res.text();
        if (txt) msg = txt;
      }
      throw new Error(msg);
    }

    return res.json();
  }

  // --- Event Listeners ---

  settingsToggleBtn.addEventListener('click', () => {
    showSettingsPanel(settingsPanelEl.classList.contains('hidden'));
  });

  settingsCloseBtn.addEventListener('click', () => {
    showSettingsPanel(false);
  });

  testBackendBtn.addEventListener('click', async () => {
    try {
      setStatus('백엔드 연결 테스트 중...', 'loading');
      await saveSettings();
      await testBackendConnection();
      setStatus('백엔드 연결 성공 (/health ok)', 'success');
    } catch (err) {
      setStatus(err.message || String(err), 'error');
    }
  });

  providerEl.addEventListener('change', async () => {
    updateProviderUI();
    await saveSettings();
  });

  saveKeyBtn.addEventListener('click', async () => {
    try {
      setStatus('API 등록 중...', 'loading');
      await saveSettings();
      const result = await saveKey();
      if (result.keyStatus === 'invalid') {
        setStatus('API Key가 유효하지 않습니다. 키를 확인해주세요.', 'error');
      } else {
        setStatus(`API 등록 완료 (${providerEl.value})`, 'success');
      }
    } catch (err) {
      setStatus(err.message || String(err), 'error');
    }
  });

  backendUrlEl.addEventListener('change', saveSettings);
  toneEl.addEventListener('change', saveSettings);
  lengthEl.addEventListener('change', saveSettings);

  extractBtn.addEventListener('click', async () => {
    try {
      setStatus('페이지 추출 중...', 'loading');
      setButtonsDisabled(true);
      await saveSettings();
      const data = await extractCurrentPage();
      setStatus('페이지 추출 완료', 'success');
      setOutput(`제목: ${data.title}\nURL: ${data.url}\n\n${data.content.slice(0, 700)}...`);
    } catch (err) {
      setStatus(err.message || String(err), 'error');
    } finally {
      setButtonsDisabled(false);
    }
  });

  generateBtn.addEventListener('click', async () => {
    try {
      setStatus('스레드 생성 중... (AI 응답 대기)', 'loading');
      setButtonsDisabled(true);
      await saveSettings();
      const data = await generateThread();
      const text = formatThread(data);
      setOutput(text);
      await copyToClipboard(text);
      setStatus('스레드 생성 완료 (클립보드 자동 복사됨)', 'success');
    } catch (err) {
      setStatus(err.message || String(err), 'error');
    } finally {
      setButtonsDisabled(false);
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!lastOutput) return;
      try {
        await copyToClipboard(lastOutput);
        setStatus('클립보드에 복사됨', 'success');
        copyBtn.textContent = '복사 완료!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = '클립보드에 복사';
          copyBtn.classList.remove('copied');
        }, 1500);
      } catch (err) {
        setStatus('복사 실패: ' + (err.message || String(err)), 'error');
      }
    });
  }

  loadSettings()
    .then(() => {
      showSettingsPanel(false);
    })
    .catch(() => {
      setStatus('설정 로드 실패', 'error');
      showSettingsPanel(false);
    });
})();
