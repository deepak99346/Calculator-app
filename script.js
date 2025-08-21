
(function(){
  const exprEl = document.getElementById('expression');
  const resultEl = document.getElementById('result');
  const keypad = document.getElementById('keypad');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistory');

  let currentExpr = '';
  let currentResult = '0';
  const STORAGE_KEY = 'calc_history_v1';
  let history = loadHistory();

  function saveHistory(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
  function loadHistory(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e){
      console.warn('load history error', e);
      return [];
    }
  }

  function renderDisplay(){
    exprEl.textContent = currentExpr || '\u00A0';
    resultEl.textContent = currentResult;
  }

  function renderHistory(){
    historyList.innerHTML = '';
    if(history.length === 0){
      historyList.innerHTML = '<div class="small">No calculations yet.</div>';
      return;
    }
    // newest first
    history.slice().reverse().forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const left = document.createElement('div');
      left.className = 'history-left';
      const exp = document.createElement('div');
      exp.className = 'history-exp';
      exp.title = item.expression;
      exp.textContent = item.expression;
      const res = document.createElement('div');
      res.className = 'history-res';
      res.textContent = item.result;
      left.appendChild(exp);
      left.appendChild(res);

      const actions = document.createElement('div');
      actions.className = 'history-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'link';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => {
        currentExpr = item.expression;
        currentResult = item.result;
        renderDisplay();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'link';
      delBtn.style.color = '#b21b1b';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        // remove by index in original order
        const originalIdx = history.length - 1 - idx;
        history.splice(originalIdx, 1);
        saveHistory();
        renderHistory();
      });

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(actions);

      historyList.appendChild(row);
    });
  }

  function pushToHistory(expression, result){
    if(!expression) return;
    history.push({ expression, result });
    // keep last 100 entries max
    if(history.length > 200) history = history.slice(history.length - 200);
    saveHistory();
    renderHistory();
  }

  function safeEval(expr){
    // sanitize: allow only numbers, operators, parentheses, decimal, space, %
    // convert percentage operator usage: treat "50%" as "(50/100)" when standalone number followed by %
    // For simplicity, replace occurrences like "number%" with "(number/100)"
    try{
      // convert percent: replace occurrences of number% with (number/100)
      expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
      // disallow any letters for safety
      if(/[a-zA-Z]/.test(expr)) throw new Error('Invalid characters');
      // evaluate using Function constructor (safer than eval)
      const fn = new Function('return ' + expr);
      const val = fn();
      if(typeof val === 'number' && !isFinite(val)) throw new Error('Math error');
      return val;
    }catch(e){
      return null;
    }
  }

  function handleInputValue(v){
    // prevent multiple decimals in a single number group
    if(v === '.') {
      // check last token (digits after last operator)
      const last = currentExpr.split(/[\+\-\*\/()%]/).pop() || '';
      if(last.includes('.')) return;
    }
    currentExpr += v;
    currentResult = tryComputePreview(currentExpr);
    renderDisplay();
  }

  function tryComputePreview(e){
    const res = safeEval(e);
    return res === null ? '' : String(res);
  }

  function handleControl(action){
    if(action === 'clear'){
      currentExpr = '';
      currentResult = '0';
      renderDisplay();
      return;
    }
    if(action === 'del'){
      if(currentExpr.length) {
        currentExpr = currentExpr.slice(0, -1);
        currentResult = currentExpr ? (tryComputePreview(currentExpr) || '') : '0';
        renderDisplay();
      }
      return;
    }
    if(action === 'equals'){
      if(!currentExpr) return;
      const res = safeEval(currentExpr);
      if(res === null){
        currentResult = 'Error';
        renderDisplay();
        setTimeout(()=>{ currentResult = '0'; renderDisplay(); }, 1200);
        return;
      }
      currentResult = String(res);
      pushToHistory(currentExpr, currentResult);
      currentExpr = currentResult; // allow chaining
      renderDisplay();
      return;
    }
  }

  // attach keypad events
  keypad.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if(!btn) return;
    const value = btn.getAttribute('data-value');
    const action = btn.getAttribute('data-action');

    if(action){
      handleControl(action);
    } else if(value !== null){
      handleInputValue(value);
    }
  });

  // keyboard support
  window.addEventListener('keydown', (ev) => {
    if(ev.key >= '0' && ev.key <= '9'){ handleInputValue(ev.key); return; }
    if(ev.key === '.') { handleInputValue('.'); return; }
    if(ev.key === '+') { handleInputValue('+'); return; }
    if(ev.key === '-') { handleInputValue('-'); return; }
    if(ev.key === '*') { handleInputValue('*'); return; }
    if(ev.key === '/') { handleInputValue('/'); return; }
    if(ev.key === '%') { handleInputValue('%'); return; }
    if(ev.key === 'Enter' || ev.key === '='){ ev.preventDefault(); handleControl('equals'); return; }
    if(ev.key === 'Backspace'){ handleControl('del'); return; }
    if(ev.key.toLowerCase() === 'c'){ handleControl('clear'); return; }
  });

  clearHistoryBtn.addEventListener('click', () => {
    if(!confirm('Clear all history?')) return;
    history = [];
    saveHistory();
    renderHistory();
  });

  // initial render
  renderDisplay();
  renderHistory();

})();
