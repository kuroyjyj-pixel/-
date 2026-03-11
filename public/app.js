let currentStep = 1;
const totalSteps = 4;

function updateStepIndicator(step) {
  document.querySelectorAll('.step').forEach((el, idx) => {
    const stepNum = idx / 2 + 1; // Account for step-lines between steps
    el.classList.remove('active', 'done');
  });

  const stepEls = document.querySelectorAll('.step[data-step]');
  const lineEls = document.querySelectorAll('.step-line');

  stepEls.forEach((el) => {
    const s = parseInt(el.dataset.step);
    if (s === step) el.classList.add('active');
    else if (s < step) el.classList.add('done');
  });

  lineEls.forEach((el, idx) => {
    if (idx + 1 < step) el.classList.add('done');
    else el.classList.remove('done');
  });
}

function showSection(sectionNum) {
  document.querySelectorAll('.form-section').forEach(s => s.classList.add('hidden'));
  const target = document.querySelector(`.form-section[data-section="${sectionNum}"]`);
  if (target) {
    target.classList.remove('hidden');
  }
}

function validateStep(step) {
  if (step === 1) {
    const checked = document.querySelectorAll('input[name="style"]:checked');
    if (checked.length === 0) {
      showValidationError('過ごしたいスタイルを1つ以上選択してください');
      return false;
    }
  }
  if (step === 2) {
    const checked = document.querySelector('input[name="family"]:checked');
    if (!checked) {
      showValidationError('誰と過ごすか選択してください');
      return false;
    }
  }
  if (step === 3) {
    const checked = document.querySelectorAll('input[name="area"]:checked');
    if (checked.length === 0) {
      showValidationError('エリアを1つ以上選択してください');
      return false;
    }
  }
  return true;
}

function showValidationError(msg) {
  const existing = document.querySelector('.validation-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'validation-toast';
  toast.textContent = '⚠️ ' + msg;
  toast.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    background: #c0392b; color: white; padding: 12px 24px;
    border-radius: 100px; font-size: 0.9rem; font-weight: 600;
    box-shadow: 0 8px 24px rgba(192, 57, 43, 0.4);
    z-index: 9999; animation: fadeInDown 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function nextStep(fromStep) {
  if (!validateStep(fromStep)) return;
  currentStep = fromStep + 1;
  showSection(currentStep);
  updateStepIndicator(currentStep);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(fromStep) {
  currentStep = fromStep - 1;
  showSection(currentStep);
  updateStepIndicator(currentStep);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  document.getElementById('resultSection').classList.add('hidden');
  document.querySelector('.plan-form').classList.remove('hidden');
  document.querySelector('.steps').classList.remove('hidden');
  currentStep = 1;
  showSection(1);
  updateStepIndicator(1);
  document.getElementById('planContent').classList.add('hidden');
  document.getElementById('planContent').innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('planForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const style = [...document.querySelectorAll('input[name="style"]:checked')].map(i => i.value);
  const family = document.querySelector('input[name="family"]:checked')?.value;
  const area = [...document.querySelectorAll('input[name="area"]:checked')].map(i => i.value);
  const likes = [...document.querySelectorAll('input[name="likes"]:checked')].map(i => i.value);
  const dislikes = [...document.querySelectorAll('input[name="dislikes"]:checked')].map(i => i.value);

  if (!family) {
    showValidationError('家族構成を選択してください');
    return;
  }

  // Show result section
  document.querySelector('.plan-form').classList.add('hidden');
  document.querySelector('.steps').classList.add('hidden');
  const resultSection = document.getElementById('resultSection');
  resultSection.classList.remove('hidden');

  const loadingState = document.getElementById('loadingState');
  const planContent = document.getElementById('planContent');
  loadingState.classList.remove('hidden');
  planContent.classList.add('hidden');
  planContent.innerHTML = '';

  let fullText = '';

  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style, family, area, likes, dislikes }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
            }
            if (data.done) {
              loadingState.classList.add('hidden');
              renderPlan(fullText, planContent);
              planContent.classList.remove('hidden');
              window.scrollTo({ top: document.querySelector('.result-header').offsetTop - 20, behavior: 'smooth' });
            }
            if (data.error) {
              loadingState.classList.add('hidden');
              planContent.innerHTML = `<div style="background:white;padding:32px;border-radius:16px;text-align:center;color:#c0392b;">
                <p style="font-size:1.1rem;font-weight:600;">エラーが発生しました</p>
                <p style="margin-top:8px;color:#666;">${data.error}</p>
                <p style="margin-top:16px;font-size:0.85rem;color:#999;">ANTHROPIC_API_KEY 環境変数が設定されているか確認してください</p>
              </div>`;
              planContent.classList.remove('hidden');
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    loadingState.classList.add('hidden');
    planContent.innerHTML = `<div style="background:white;padding:32px;border-radius:16px;text-align:center;">
      <p style="color:#c0392b;font-weight:600;">接続エラーが発生しました</p>
      <p style="margin-top:8px;color:#666;">${err.message}</p>
    </div>`;
    planContent.classList.remove('hidden');
  }
});

function renderPlan(text, container) {
  // Extract JSON from the response (may have thinking blocks prepended)
  let jsonText = text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  let plan;
  try {
    plan = JSON.parse(jsonText);
  } catch {
    container.innerHTML = `<div class="section-card" style="padding:24px;">
      <pre style="white-space:pre-wrap;font-size:0.85rem;line-height:1.7;">${escapeHtml(text)}</pre>
    </div>`;
    return;
  }

  let html = '';

  // Header Card
  html += `
    <div class="plan-header-card">
      <div class="plan-badge">🌸 あなたへのおすすめプラン</div>
      <h3>${escapeHtml(plan.title || 'おすすめ名古屋休日プラン')}</h3>
      <p class="plan-summary">${escapeHtml(plan.summary || '')}</p>
    </div>
  `;

  // Schedule
  if (plan.schedule && plan.schedule.length > 0) {
    html += `
      <div class="section-card">
        <div class="section-card-header">
          <span class="icon">🗓️</span>
          <h4>スケジュール</h4>
        </div>
        <div class="schedule-list">
    `;
    plan.schedule.forEach((item) => {
      html += `
        <div class="schedule-item">
          <div class="schedule-time">
            <span class="time-badge">📍 スポット</span>
            <span class="time-text">${escapeHtml(item.time || '')}</span>
            ${item.duration ? `<span class="time-text">⏱ ${escapeHtml(item.duration)}</span>` : ''}
          </div>
          <div class="schedule-body">
            <div class="spot-name">${escapeHtml(item.spot || '')}</div>
            ${item.area ? `<span class="spot-area">📍 ${escapeHtml(item.area)}</span>` : ''}
            <p class="spot-desc">${escapeHtml(item.description || '')}</p>
            <div class="spot-meta">
              ${item.transport ? `<span class="meta-badge">🚃 ${escapeHtml(item.transport)}</span>` : ''}
            </div>
            ${item.tips ? `
              <div class="tips-box">
                <span class="tips-label">💡 ヒント:</span>${escapeHtml(item.tips)}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  // Meals
  if (plan.meals && plan.meals.length > 0) {
    const mealIcons = { '朝食': '🌅', '昼食': '☀️', '夕食': '🌙', 'ランチ': '☀️', 'ディナー': '🌙', 'ブランチ': '🍳' };
    html += `
      <div class="section-card">
        <div class="section-card-header">
          <span class="icon">🍽️</span>
          <h4>おすすめグルメ</h4>
        </div>
        <div class="meals-list">
    `;
    plan.meals.forEach((meal) => {
      const icon = mealIcons[meal.type] || '🍴';
      html += `
        <div class="meal-item">
          <div class="meal-type-badge">
            <span class="meal-type-icon">${icon}</span>
            ${escapeHtml(meal.type || '')}
          </div>
          <div class="meal-info">
            <div class="meal-name">${escapeHtml(meal.spot || '')}</div>
            ${meal.area ? `<div class="meal-area">📍 ${escapeHtml(meal.area)}</div>` : ''}
            <p class="meal-desc">${escapeHtml(meal.description || '')}</p>
            ${meal.budget ? `<span class="meal-budget">💰 ${escapeHtml(meal.budget)}</span>` : ''}
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  // Budget & Advice
  html += `<div class="info-cards">`;

  if (plan.totalBudget) {
    html += `
      <div class="info-card">
        <div class="info-card-header">
          <span class="info-icon">💰</span>
          <h4>予算目安（1人あたり）</h4>
        </div>
        <div class="budget-amount">${escapeHtml(plan.totalBudget)}</div>
      </div>
    `;
  }

  if (plan.advice) {
    html += `
      <div class="info-card">
        <div class="info-card-header">
          <span class="info-icon">💝</span>
          <h4>楽しむためのアドバイス</h4>
        </div>
        <p class="advice-text">${escapeHtml(plan.advice)}</p>
      </div>
    `;
  }

  html += `</div>`;

  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize
updateStepIndicator(1);
