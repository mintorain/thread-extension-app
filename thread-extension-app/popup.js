(() => {
  const backendUrlEl = document.getElementById('backendUrl');
  const providerEl = document.getElementById('provider');
  const authMethodEl = document.getElementById('authMethod');
  const apiKeyEl = document.getElementById('apiKey');
  const toneEl = document.getElementById('tone');
  const lengthEl = document.getElementById('length');

  const settingsPanelEl = document.getElementById('settingsPanel');
  const settingsToggleBtn = document.getElementById('settingsToggleBtn');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const testBackendBtn = document.getElementById('testBackendBtn');

  const apiKeyArea = document.getElementById('apiKeyArea');
  const oauthArea = document.getElementById('oauthArea');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const oauthRegisterBtn = document.getElementById('oauthRegisterBtn');

  const extractBtn = document.getElementById('extractBtn');
  const generateBtn = document.getElementById('generateBtn');
  const statusEl = document.getElementById('status');
  const outputEl = document.getElementById('output');

  let extracted = null;
  let suppressAutoOAuth = true;
  let oauthInProgress = false;

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function setOutput(msg) {
    outputEl.value = msg;
  }

  function showSettingsPanel(show) {
    settingsPanelEl.classList.toggle('hidden', !show);
  }

  function applyAuthMode() {
    const mode = authMethodEl.value;
    apiKeyArea.classList.toggle('hidden', mode !== 'api_key');
    oauthArea.classList.toggle('hidden', mode !== 'oauth');
  }

  function normalizeBackendUrl(raw) {
    const value = (raw || '').trim();
    if (!value) throw new Error('Backend URL이 비어 있습니다.');
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error('Backend URL 형식이 올바르지 않습니다. 예: http://127.0.0.1:8000');
    }
    if (!/^https?:$/.test(url.protocol)) {
      throw new Error('Backend URL은 http 또는 https만 지원합니다.');
    }
    return url.origin;
  }

  function toHelpfulError(err, backendUrl) {
    const msg = err?.message || String(err);
    if (/Failed to fetch|NetworkError|ERR_CONNECTION|Load failed|fetch failed/i.test(msg)) {
      return `백엔드 연결 실패: ${backendUrl}\n1) 서버 실행 여부\n2) URL/포트 확인\n3) 다른 PC에서 접속 중이면 127.0.0.1 대신 NAS IP/도메인 사용`;
    }
    if (/timeout/i.test(msg)) {
      return `백엔드 응답 지연(타임아웃): ${backendUrl} (서버 상태 확인 필요)`;
    }
    return msg;
  }

  async function apiFetch(path, options = {}) {
    const backendUrl = normalizeBackendUrl(backendUrlEl.value);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('timeout')), 10000);

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
    const data = await chrome.storage.local.get(['backendUrl', 'provider', 'tone', 'length', 'authMethod']);
    if (data.backendUrl) backendUrlEl.value = data.backendUrl;
    if (data.provider) providerEl.value = data.provider;
    if (data.tone) toneEl.value = data.tone;
    if (data.length) lengthEl.value = data.length;
    if (data.authMethod) authMethodEl.value = data.authMethod;

    applyAuthMode();
  }

  async function saveSettings() {
    await chrome.storage.local.set({
      backendUrl: backendUrlEl.value.trim(),
      provider: providerEl.value,
      tone: toneEl.value,
      length: lengthEl.value,
      authMethod: authMethodEl.value
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

  async function checkOAuthStatus(provider) {
    const res = await apiFetch(`/v1/auth/oauth/status?provider=${encodeURIComponent(provider)}`);
    if (!res.ok) return { connected: false };
    return res.json();
  }

  async function startOAuthRegistration() {
    if (oauthInProgress) {
      return { provider: providerEl.value, authType: 'oauth' };
    }

    oauthInProgress = true;
    try {
      const provider = providerEl.value;

      const startRes = await apiFetch('/v1/auth/oauth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });

      if (!startRes.ok) {
        const txt = await startRes.text();
        if (startRes.status === 404) {
          throw new Error('OAuth 엔드포인트를 찾을 수 없습니다. Backend URL을 FastAPI 주소로 설정하세요.');
        }
        throw new Error(`OAuth 시작 실패: ${startRes.status} ${txt}`);
      }

      const startData = await startRes.json();
      if (!startData.authorizationUrl) throw new Error('OAuth authorization URL이 없습니다.');

      await chrome.tabs.create({ url: startData.authorizationUrl });

      for (let i = 0; i < 25; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const status = await checkOAuthStatus(provider);
        if (status.connected) {
          return status;
        }
      }

      throw new Error('OAuth 인증 확인 시간 초과. 인증 페이지에서 승인을 완료했는지 확인하세요.');
    } finally {
      oauthInProgress = false;
    }
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
    const provider = providerEl.value;
    const tone = toneEl.value;
    const length = lengthEl.value;
    const authMethod = authMethodEl.value;

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
      provider,
      authMethod
    };

    const res = await apiFetch('/v1/generate/thread', {
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

  settingsToggleBtn.addEventListener('click', () => {
    showSettingsPanel(settingsPanelEl.classList.contains('hidden'));
  });

  settingsCloseBtn.addEventListener('click', () => {
    showSettingsPanel(false);
  });

  testBackendBtn.addEventListener('click', async () => {
    try {
      setStatus('백엔드 연결 테스트 중...');
      await saveSettings();
      await testBackendConnection();
      setStatus('백엔드 연결 성공 (/health ok)');
    } catch (err) {
      setStatus(err.message || String(err));
    }
  });

  authMethodEl.addEventListener('change', async () => {
    applyAuthMode();
    await saveSettings();
    if (authMethodEl.value === 'oauth' && !suppressAutoOAuth) {
      try {
        setStatus('OAuth 인증 페이지 여는 중...');
        const status = await startOAuthRegistration();
        setStatus(`OAuth 등록 완료 (${status.provider}/${status.authType || 'oauth'})`);
      } catch (err) {
        setStatus(err.message || String(err));
      }
    }
  });

  providerEl.addEventListener('change', async () => {
    await saveSettings();
    if (authMethodEl.value === 'oauth' && !suppressAutoOAuth) {
      try {
        setStatus('Provider 변경 감지: OAuth 인증 페이지 여는 중...');
        const status = await startOAuthRegistration();
        setStatus(`OAuth 등록 완료 (${status.provider}/${status.authType || 'oauth'})`);
      } catch (err) {
        setStatus(err.message || String(err));
      }
    }
  });

  saveKeyBtn.addEventListener('click', async () => {
    try {
      setStatus('API 등록 중...');
      await saveSettings();
      const result = await saveKey();
      setStatus(`API 등록 완료 (${result.keyStatus || 'ok'})`);
    } catch (err) {
      setStatus(err.message || String(err));
    }
  });

  oauthRegisterBtn.addEventListener('click', async () => {
    try {
      setStatus('OAuth 인증 시작...');
      await saveSettings();
      const status = await startOAuthRegistration();
      setStatus(`OAuth 등록 완료 (${status.provider}/${status.authType || 'oauth'})`);
    } catch (err) {
      setStatus(err.message || String(err));
    }
  });

  backendUrlEl.addEventListener('change', saveSettings);
  toneEl.addEventListener('change', saveSettings);
  lengthEl.addEventListener('change', saveSettings);

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

  loadSettings()
    .then(() => {
      suppressAutoOAuth = false;
      showSettingsPanel(false);
    })
    .catch(() => {
      setStatus('설정 로드 실패');
      suppressAutoOAuth = false;
      showSettingsPanel(false);
    });
})();
