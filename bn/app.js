(() => {
  // ── Board config ──────────────────────────────────────────────
  // Row indices: 0 = front (5 cells), 1 = mid (5 cells), 2 = back (3 cells)
  const BOARD_ROWS  = [5, 5, 3];
  const ROW_LABELS  = ['Front', 'Mid', 'Back'];

  // ── Unit definitions ──────────────────────────────────────
  const UNITS = {
    pelican: {
      id:       'pelican',
      name:     'Pelican',
      img:      'assets/Pelican.png',
      wikiPage: 'SC-2_Pelican',
    },
  };

  // ── Goliath Tank — composite boss with two variants ───────────
  // Each variant places 3 sub-units on P2's front row: [col1]=MLRS Left,
  // [col2]=Main Body, [col3]=MLRS Right
  const GOLIATH_VARIANTS = {
    repeatable: {
      label: 'Repeatable',
      subUnits: [
        { id: 'mlrsLeft',    name: 'MLRS (Left)',   wikiPage: 'Multi-Launch_Rocket_System_(Left)',          img: 'assets/GoliathTankLeft.png',  col: 1 },
        { id: 'goliathMain', name: 'Goliath Tank',  wikiPage: 'Goliath_Tank_(Main)',                        img: 'assets/GoliathTankMain.png',  col: 2, isBoss: true },
        { id: 'mlrsRight',   name: 'MLRS (Right)',  wikiPage: 'Multi-Launch_Rocket_System_(Right)',         img: 'assets/GoliathTankRight.png', col: 3 },
      ],
    },
    mission: {
      label: 'Mission',
      subUnits: [
        { id: 'mlrsLeftM',    name: 'MLRS (Left)',  wikiPage: 'Multi-Launch_Rocket_System_(Left)_(Mission)',  img: 'assets/GoliathTankLeft.png',  col: 1 },
        { id: 'goliathMainM', name: 'Goliath Tank', wikiPage: 'Goliath_Tank_(Main)_(Mission)',                img: 'assets/GoliathTankMain.png',  col: 2, isBoss: true },
        { id: 'mlrsRightM',   name: 'MLRS (Right)', wikiPage: 'Multi-Launch_Rocket_System_(Right)_(Mission)', img: 'assets/GoliathTankRight.png', col: 3 },
      ],
    },
  };

  const TRAY_COUNT = 11;

  function freshBoard() {
    return BOARD_ROWS.map(n => Array(n).fill(null));
  }

  function freshTray() {
    return { pelican: { count: TRAY_COUNT, rank: 1 } };
  }

  function setupAI(board) {
    const variant = GOLIATH_VARIANTS[state.goliathVariant];
    variant.subUnits.forEach(u => {
      board.p2[0][u.col] = { ...u, owner: 'p2' };
    });
  }

  // ── State ───────────────────────────────────────────────────
  // Center-first default: main body, then left, then right
  function defaultTargetPriority() {
    const subs = GOLIATH_VARIANTS[state.goliathVariant].subUnits;
    const center = subs.find(u => u.col === 2);
    const left   = subs.find(u => u.col === 1);
    const right  = subs.find(u => u.col === 3);
    return [center, left, right].filter(Boolean).map(u => u.id);
  }

  const state = {
    running:        false,
    turn:           0,
    goliathVariant: 'repeatable',
    board:          { p1: freshBoard(), p2: freshBoard() },
    tray:           freshTray(),
    unitStats:      {},
    patterns:       {},
    attackPriority: {},
    targetPriority: [],   // populated after defaultTargetPriority() is callable    sim:            null,
    simConfig:      { speed: 2, numRuns: 1 },
  };

  // ── DOM refs ─────────────────────────────────────────────────
  const els = {
    battleArena:     document.getElementById('battle-arena'),
    trayItems:       document.getElementById('tray-items'),
    unitTray:        document.getElementById('unit-tray'),
    logOutput:       document.getElementById('log-output'),
    attackPriority:  document.getElementById('attack-priority'),
    btnStart:        document.getElementById('btn-start'),
    btnPause:        document.getElementById('btn-pause'),
    btnNext:         document.getElementById('btn-next'),
    btnReset:        document.getElementById('btn-reset'),
    goliathVariant:  document.getElementById('goliath-variant'),
    simSpeed:        document.getElementById('sim-speed'),
    speedLabel:      document.getElementById('speed-label'),
    simRuns:         document.getElementById('sim-runs'),
  };

  // ── Log helper ────────────────────────────────────────────────
  function logMessage(text, turn = null) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    if (turn !== null) {
      const label = document.createElement('span');
      label.className = 'log-turn';
      label.textContent = `T${turn}`;
      entry.appendChild(label);
    }

    entry.appendChild(document.createTextNode(text));
    els.logOutput.appendChild(entry);
    els.logOutput.scrollTop = els.logOutput.scrollHeight;
  }

  // ── Battle view ───────────────────────────────────────────────
  function buildPlayerField(player, rowDisplayOrder) {
    const field = document.createElement('div');
    field.className = `player-field player-field--${player}`;

    const nameTag = document.createElement('div');
    nameTag.className = 'player-label';
    nameTag.textContent = player === 'p1' ? 'Player 1' : 'Player 2';

    if (player === 'p2') field.appendChild(nameTag);

    for (const rowIdx of rowDisplayOrder) {
      const rowEl = document.createElement('div');
      rowEl.className = 'field-row';
      rowEl.dataset.rowLabel = ROW_LABELS[rowIdx];

      const cells = state.board[player][rowIdx];
      for (let col = 0; col < cells.length; col++) {
        const cell = document.createElement('div');
        cell.className = 'field-cell';
        cell.dataset.player = player;
        cell.dataset.row = rowIdx;
        cell.dataset.col = col;

        const unit = cells[col];
        if (unit) {
          const img = document.createElement('img');
          img.src = unit.img;
          img.alt = unit.name;
          img.className = 'unit-img';
          img.title = unit.name;
          cell.appendChild(img);
          cell.classList.add('field-cell--occupied');
        }

        rowEl.appendChild(cell);
      }
      field.appendChild(rowEl);
    }

    if (player === 'p1') field.appendChild(nameTag);
    return field;
  }

  function renderBattleView() {
    els.battleArena.innerHTML = '';

    els.battleArena.appendChild(buildPlayerField('p2', [2, 1, 0]));

    const divider = document.createElement('div');
    divider.className = 'battle-divider';
    divider.setAttribute('aria-hidden', 'true');
    els.battleArena.appendChild(divider);

    els.battleArena.appendChild(buildPlayerField('p1', [0, 1, 2]));

    setupDropZones();
  }

  // ── Unit tray ─────────────────────────────────────────────────
  function trayTotal() {
    return Object.values(state.tray).reduce((s, e) => s + e.count, 0);
  }

  function renderUnitTray() {
    els.trayItems.innerHTML = '';
    els.unitTray.style.display = trayTotal() === 0 ? 'none' : 'flex';

    Object.entries(state.tray).forEach(([unitId, entry]) => {
      if (entry.count === 0) return;
      const unit  = UNITS[unitId];
      const stats = state.unitStats[unitId];

      const token = document.createElement('div');
      token.className = 'tray-token';
      token.draggable = true;
      token.dataset.unitId = unitId;

      const img = document.createElement('img');
      img.src = unit.img;
      img.alt = unit.name;
      img.className = 'tray-unit-img';
      img.draggable = false;

      // Rank dropdown — populated once stats are available
      const rankSel = document.createElement('select');
      rankSel.className = 'tray-rank-select';
      rankSel.title = 'Unit rank';
      if (stats && stats.ranks.length > 0) {
        stats.ranks.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.rank;
          opt.textContent = `R${r.rank}`;
          if (r.rank === entry.rank) opt.selected = true;
          rankSel.appendChild(opt);
        });
      } else {
        // Stats not loaded yet — show placeholder
        const opt = document.createElement('option');
        opt.textContent = '…';
        rankSel.appendChild(opt);
        rankSel.disabled = true;
      }
      rankSel.addEventListener('change', (e) => {
        e.stopPropagation();
        state.tray[unitId].rank = parseInt(rankSel.value);
      });
      rankSel.addEventListener('mousedown', e => e.stopPropagation());

      const rndBtn = document.createElement('button');
      rndBtn.className = 'tray-randomize-btn';
      rndBtn.title = 'Place all randomly';
      rndBtn.textContent = '🎲';
      rndBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        randomizePlacement();
      });

      token.appendChild(img);
      token.appendChild(rankSel);
      token.appendChild(rndBtn);

      token.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', unitId);
        e.dataTransfer.effectAllowed = 'move';
        token.classList.add('dragging');
      });
      token.addEventListener('dragend', () => token.classList.remove('dragging'));

      els.trayItems.appendChild(token);
    });
  }

  // ── Drop zones (P1 cells) ─────────────────────────────────────
  function setupDropZones() {
    document.querySelectorAll('.field-cell[data-player="p1"]').forEach(cell => {
      cell.addEventListener('dragover', (e) => {
        const row = +cell.dataset.row;
        const col = +cell.dataset.col;
        if (!state.board.p1[row][col] && trayTotal() > 0) {
          e.preventDefault();
          cell.classList.add('drag-over');
        }
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        const unitId = e.dataTransfer.getData('text/plain');
        const row = +cell.dataset.row;
        const col = +cell.dataset.col;
        const entry = state.tray[unitId];
        if (entry && entry.count > 0 && !state.board.p1[row][col]) {
          state.board.p1[row][col] = { ...UNITS[unitId], owner: 'p1', rank: entry.rank };
          entry.count--;
          renderBattleView();
          renderUnitTray();
          renderAttackPriority();
          renderControls();
        }
      });
    });
  }

  // ── Randomize placement ───────────────────────────────────────
  function randomizePlacement() {
    const empty = [];
    state.board.p1.forEach((row, r) =>
      row.forEach((cell, c) => { if (!cell) empty.push([r, c]); })
    );
    for (let i = empty.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [empty[i], empty[j]] = [empty[j], empty[i]];
    }
    let placed = 0;
    Object.entries(state.tray).forEach(([unitId, entry]) => {
      for (let k = 0; k < entry.count && placed < empty.length; k++, placed++) {
        const [r, c] = empty[placed];
        state.board.p1[r][c] = { ...UNITS[unitId], owner: 'p1', rank: entry.rank };
      }
      entry.count = 0;
    });
    renderBattleView();
    renderUnitTray();
    renderAttackPriority();
    renderControls();
    logMessage('P1 units placed randomly.');
  }

  // ── Wiki stats fetching ───────────────────────────────────────
  async function loadUnitStats() {
    // Collect all unique wiki pages to fetch
    const toFetch = [
      { id: 'pelican', ...UNITS.pelican },
      ...Object.values(GOLIATH_VARIANTS)
        .flatMap(v => v.subUnits),
    ];
    // Deduplicate by wikiPage (Left/Right Mission variants share same page structure)
    const seen = new Set();
    const unique = toFetch.filter(u => seen.has(u.wikiPage) ? false : seen.add(u.wikiPage));

    logMessage(`Fetching stats for ${unique.length} unit page(s)…`);

    const results = await Promise.allSettled(
      unique.map(u => WikiFetcher.fetchUnitStats(u.wikiPage))
    );

    results.forEach((result, i) => {
      const unit = unique[i];
      if (result.status === 'fulfilled') {
        state.unitStats[unit.id] = result.value;
        // Also store under wikiPage key for lookup by other variants sharing the page
        state.unitStats[unit.wikiPage] = result.value;

        const s         = result.value;
        const firstRank = s.ranks[0];
        const lastRank  = s.ranks[s.ranks.length - 1];
        const hpRange   = firstRank ? `HP ${firstRank.hp}–${lastRank.hp}` : 'HP n/a';
        if (state.tray[unit.id]) {
          state.tray[unit.id].rank = lastRank ? lastRank.rank : 1;
        }
        logMessage(`✓ ${s.name} — ${s.attacks.length} attack(s), ${s.ranks.length} rank(s), ${hpRange}`);
      } else {
        logMessage(`✗ ${unit.name}: ${result.reason.message}`);
      }
    });
    renderUnitTray();
    renderAttackPriority();
    mergePatterns();
  }

  // ── Attack patterns loading ───────────────────────────────────
  function loadPatterns() {
    if (window.ATTACK_PATTERNS) {
      Object.assign(state.patterns, window.ATTACK_PATTERNS);
      logMessage(`✓ Attack patterns loaded (${Object.keys(state.patterns).length} patterns).`);
    } else {
      logMessage('✗ Attack patterns not found (patterns.js missing).');
    }
    return Promise.resolve();
  }

  // Merge loaded patterns into unitStats attack objects
  function mergePatterns() {
    if (!Object.keys(state.patterns).length) return;
    Object.values(state.unitStats).forEach(stats => {
      if (!stats || !stats.attacks) return;
      stats.attacks.forEach(atk => {
        const key = atk.internalName || atk.gameFileName;
        if (key && state.patterns[key]) {
          atk.pattern = state.patterns[key];
        }
      });
    });
  }
  function getBoardUnitTypes() {
    const seen  = new Set();
    const types = [];
    ['p1', 'p2'].forEach(player => {
      state.board[player].forEach(row => row.forEach(cell => {
        if (!cell) return;
        const key = cell.wikiPage || cell.id;
        if (!seen.has(key)) { seen.add(key); types.push({ cell, player }); }
      }));
    });
    return types;
  }

  function ensurePriority(wikiPage) {
    if (!state.attackPriority[wikiPage]) {
      const stats = state.unitStats[wikiPage];
      if (!stats) { state.attackPriority[wikiPage] = []; return; }
      let order = stats.attacks.map((_, i) => i);
      // Default: Shrapnel Bomb first if present
      const bombIdx = stats.attacks.findIndex(a => a.internalName === 'air_bomb_drop_rnd');
      if (bombIdx > 0) order = [bombIdx, ...order.filter(i => i !== bombIdx)];
      state.attackPriority[wikiPage] = order;
    }
  }

  function renderAttackPriority() {
    els.attackPriority.innerHTML = '';

    // ── Target priority (P1 only) ─────────────────────────────
    // ── Target priority: ordered list of P2 sub-units ─────────
    const subs = GOLIATH_VARIANTS[state.goliathVariant].subUnits;
    // Ensure targetPriority contains current variant's IDs; reset if stale
    const validIds = new Set(subs.map(u => u.id));
    if (!state.targetPriority.length || !state.targetPriority.every(id => validIds.has(id))) {
      state.targetPriority = defaultTargetPriority();
    }

    const tpSection = document.createElement('div');
    tpSection.className = 'ap-unit';

    const tpHeader = document.createElement('div');
    tpHeader.className = 'ap-unit-header';
    const tpTitle = document.createElement('span');
    tpTitle.className = 'ap-unit-name';
    tpTitle.textContent = 'P1 Target Priority';
    const tpBadge = document.createElement('span');
    tpBadge.className = 'ap-owner-badge ap-owner-badge--p1';
    tpBadge.textContent = 'P1';
    tpHeader.append(tpTitle, tpBadge);
    tpSection.appendChild(tpHeader);

    const tpList = document.createElement('ol');
    tpList.className = 'ap-list';

    state.targetPriority.forEach((unitId, pos) => {
      const sub = subs.find(u => u.id === unitId);
      if (!sub) return;

      const item = document.createElement('li');
      item.className = 'ap-item';
      item.draggable = true;
      item.dataset.pos = pos;

      const handle = document.createElement('span');
      handle.className = 'ap-handle'; handle.textContent = '⠿';

      const icon = document.createElement('img');
      icon.src = sub.img; icon.alt = sub.name; icon.className = 'ap-unit-icon';

      const label = document.createElement('span');
      label.className = 'ap-atk-name';
      label.textContent = sub.name;

      item.append(handle, icon, label);

      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('tp-from', String(pos));
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('ap-dragging');
      });
      item.addEventListener('dragend',  () => item.classList.remove('ap-dragging'));
      item.addEventListener('dragover',  e => { e.preventDefault(); item.classList.add('ap-over'); });
      item.addEventListener('dragleave', () => item.classList.remove('ap-over'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('ap-over');
        const from = parseInt(e.dataTransfer.getData('tp-from'));
        if (!isNaN(from) && from !== pos) {
          const [moved] = state.targetPriority.splice(from, 1);
          state.targetPriority.splice(pos, 0, moved);
          renderAttackPriority();
        }
      });

      tpList.appendChild(item);
    });

    tpSection.appendChild(tpList);
    els.attackPriority.appendChild(tpSection);

    const unitTypes = getBoardUnitTypes();

    if (unitTypes.length === 0) {
      els.attackPriority.innerHTML += '<p class="ap-empty">Place units to set attack priority.</p>';
      return;
    }

    unitTypes.forEach(({ cell, player }) => {
      const wikiPage = cell.wikiPage || cell.id;
      const stats    = state.unitStats[wikiPage] || state.unitStats[cell.id];
      ensurePriority(wikiPage);
      const priority = state.attackPriority[wikiPage];

      const section = document.createElement('div');
      section.className = 'ap-unit';

      // Header: icon + name + P1/P2 badge
      const header = document.createElement('div');
      header.className = 'ap-unit-header';

      const icon = document.createElement('img');
      icon.src = cell.img; icon.alt = cell.name; icon.className = 'ap-unit-icon';

      const nameEl = document.createElement('span');
      nameEl.className = 'ap-unit-name';
      nameEl.textContent = cell.name;

      const badge = document.createElement('span');
      badge.className = `ap-owner-badge ap-owner-badge--${player}`;
      badge.textContent = player === 'p1' ? 'P1' : 'AI';

      header.append(icon, nameEl, badge);
      section.appendChild(header);

      if (!stats || stats.attacks.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'ap-empty';
        msg.textContent = stats ? 'No attacks.' : 'Loading…';
        section.appendChild(msg);
      } else {
        // Re-init priority if attack count changed (e.g. stats just loaded)
        if (priority.length !== stats.attacks.length) {
          state.attackPriority[wikiPage] = stats.attacks.map((_, i) => i);
        }

        const list = document.createElement('ol');
        list.className = 'ap-list';

        state.attackPriority[wikiPage].forEach((atkIdx, pos) => {
          const atk = stats.attacks[atkIdx];
          if (!atk) return;

          const item = document.createElement('li');
          item.className = 'ap-item';
          item.draggable = true;
          item.dataset.pos = pos;

          const handle = document.createElement('span');
          handle.className = 'ap-handle'; handle.textContent = '⠿';

          const atkName = document.createElement('span');
          atkName.className = 'ap-atk-name';
          atkName.textContent = atk.name || atk.internalName;

          const pill = document.createElement('span');
          pill.className = `ap-dmg-pill ap-dmg-${(atk.damageType || '').toLowerCase()}`;
          pill.textContent = atk.damageType || '?';

          item.append(handle, atkName, pill);

          item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('ap-page', wikiPage);
            e.dataTransfer.setData('ap-from', String(pos));
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('ap-dragging');
          });
          item.addEventListener('dragend',  () => item.classList.remove('ap-dragging'));
          item.addEventListener('dragover',  e => { e.preventDefault(); item.classList.add('ap-over'); });
          item.addEventListener('dragleave', () => item.classList.remove('ap-over'));
          item.addEventListener('drop', e => {
            e.preventDefault();
            item.classList.remove('ap-over');
            const fromPage = e.dataTransfer.getData('ap-page');
            const fromPos  = parseInt(e.dataTransfer.getData('ap-from'));
            if (fromPage === wikiPage && fromPos !== pos) {
              const arr = state.attackPriority[wikiPage];
              const [moved] = arr.splice(fromPos, 1);
              arr.splice(pos, 0, moved);
              renderAttackPriority();
            }
          });

          list.appendChild(item);
        });

        section.appendChild(list);
      }

      els.attackPriority.appendChild(section);
    });
  }

  function renderControls() {
    const hasP1Units = state.board.p1.some(row => row.some(c => c !== null));
    els.btnStart.disabled = state.running || !hasP1Units;
    els.btnPause.disabled = !state.running;
    els.btnNext.disabled  = !state.running || state.simConfig.speed !== 0;
    els.btnReset.disabled = state.turn === 0 && !state.running;
  }

  // ── Simulation engine wiring ──────────────────────────────────
  const SPEED_DELAYS  = [0, 1200, 400, 80, 0];
  const SPEED_LABELS  = ['Step', 'Slow', 'Normal', 'Fast', 'Instant'];
  let   _autoTimer    = null;

  function boardStatsReady() {
    const cells = [...state.board.p1.flat(), ...state.board.p2.flat()].filter(Boolean);
    return cells.length > 0 && cells.every(c =>
      state.unitStats[c.wikiPage] || state.unitStats[c.id]
    );
  }

  function startSimulation() {
    if (!state.board.p1.some(row => row.some(c => c !== null))) {
      logMessage('⚠ Place at least one unit before starting.'); return;
    }
    if (!boardStatsReady()) {
      logMessage('⚠ Unit stats still loading — try again in a moment.'); return;
    }
    state.sim     = SimEngine.createSim(
      state.board, state.unitStats, state.patterns, state.attackPriority, state.targetPriority
    );
    state.running = true;
    state.turn    = 0;
    logMessage('Simulation started — P1 attacks first.', 0);
    renderControls();

    const speed = state.simConfig.speed;
    const runs  = state.simConfig.numRuns;

    if (speed === 4 && runs > 1) { runBatch(); }
    else if (speed === 4)        { runInstant(state.sim); finishSim(); }
    else if (speed > 0)          { startAutoRun(); }
    // speed === 0: manual — wait for Next Turn button
  }

  function runStep() {
    if (!state.sim || state.sim.finished) return;
    const events = SimEngine.simTurn(state.sim);
    state.turn   = state.sim.turn;
    logSimEvents(events);
    renderSimHP(state.sim);
    if (state.sim.finished) finishSim();
  }

  function startAutoRun() {
    const delay = SPEED_DELAYS[state.simConfig.speed];
    function tick() {
      if (!state.running || !state.sim) return;
      const events = SimEngine.simTurn(state.sim);
      state.turn   = state.sim.turn;
      logSimEvents(events);
      renderSimHP(state.sim);
      if (state.sim.finished) { finishSim(); return; }
      _autoTimer = setTimeout(tick, delay);
    }
    _autoTimer = setTimeout(tick, delay);
  }

  function stopAutoRun() {
    if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
  }

  function runInstant(sim) {
    let safety = 0;
    while (!sim.finished && safety++ < 1500) SimEngine.simTurn(sim);
    state.turn = sim.turn;
    renderSimHP(sim);
  }

  function runBatch() {
    const n = state.simConfig.numRuns;
    const results = [];
    for (let i = 0; i < n; i++) {
      const sim = SimEngine.createSim(
        state.board, state.unitStats, state.patterns, state.attackPriority, state.targetPriority
      );
      runInstant(sim);
      results.push({ winner: sim.winner, turns: sim.turn });
    }
    const p1w  = results.filter(r => r.winner === 'p1').length;
    const p2w  = results.filter(r => r.winner === 'p2').length;
    const drws = results.filter(r => r.winner === 'draw').length;
    const avg  = (results.reduce((s, r) => s + r.turns, 0) / n).toFixed(1);
    logMessage(
      `📊 ${n} runs — P1: ${p1w} (${(p1w/n*100).toFixed(1)}%) | ` +
      `AI: ${p2w} (${(p2w/n*100).toFixed(1)}%) | Draws: ${drws} | Avg turns: ${avg}`
    );
    // Show the last simulation's board state
    renderSimHP(results.length > 0 ? state.sim : null);
    state.running = false;
    renderControls();
  }

  function finishSim() {
    stopAutoRun();
    state.running = false;
    const w = state.sim?.winner;
    if      (w === 'p1')   logMessage('🏆 Player 1 wins!', state.turn);
    else if (w === 'p2')   logMessage('💥 AI wins!', state.turn);
    else if (w === 'draw') logMessage('⚖ Draw — turn limit reached.', state.turn);
    renderControls();
  }

  // ── HP overlay ────────────────────────────────────────────────
  function renderSimHP(sim) {
    // Remove old bars / dead markers
    document.querySelectorAll('.hp-bar-wrap').forEach(el => el.remove());
    document.querySelectorAll('.field-cell--dead').forEach(el =>
      el.classList.remove('field-cell--dead')
    );
    if (!sim) return;

    ['p1', 'p2'].forEach(player => {
      sim.units[player].forEach(unit => {
        const cell = document.querySelector(
          `.field-cell[data-player="${player}"][data-row="${unit.row}"][data-col="${unit.col}"]`
        );
        if (!cell) return;

        if (!unit.alive) cell.classList.add('field-cell--dead');

        const pct  = unit.maxHp > 0 ? unit.currentHp / unit.maxHp : 0;
        const tier = pct > 0.6 ? 'high' : pct > 0.3 ? 'medium' : 'low';
        const wrap = document.createElement('div');
        wrap.className = 'hp-bar-wrap';
        const bar  = document.createElement('div');
        bar.className = `hp-bar hp-bar--${tier}`;
        bar.style.width = `${Math.max(0, Math.min(100, pct * 100)).toFixed(1)}%`;
        wrap.appendChild(bar);
        cell.appendChild(wrap);
      });
    });
  }

  // ── Log sim events ────────────────────────────────────────────
  function logSimEvents(events) {
    events.forEach(ev => {
      switch (ev.type) {
        case 'attack':
          logMessage(
            `${ev.attacker.name} → ${ev.target.name}: ` +
            `${ev.damage} dmg${ev.crit ? ' ✨CRIT' : ''}${ev.killed ? ' ☠' : ''}`,
            ev.turn
          );
          break;
        // noAttack intentionally not logged — too noisy; visible via HP bars
        case 'victory':
          logMessage(`⚔ All ${ev.winner === 'p1' ? 'AI' : 'P1'} units destroyed!`, ev.turn);
          break;
        case 'draw':
          logMessage(`⚖ Draw — turn limit reached.`, ev.turn);
          break;
      }
    });
  }

  // ── Button handlers ───────────────────────────────────────────
  els.goliathVariant.addEventListener('change', () => {
    state.goliathVariant = els.goliathVariant.value;
    state.targetPriority = defaultTargetPriority();
    state.board.p2 = freshBoard();
    setupAI(state.board);
    renderBattleView();
    renderAttackPriority();
    logMessage(`Goliath variant: ${GOLIATH_VARIANTS[state.goliathVariant].label}`);
  });

  els.btnStart.addEventListener('click', startSimulation);

  els.btnPause.addEventListener('click', () => {
    state.running = false;
    stopAutoRun();
    logMessage('Simulation paused.', state.turn);
    renderControls();
  });

  els.btnNext.addEventListener('click', runStep);

  els.btnReset.addEventListener('click', () => {
    stopAutoRun();
    state.running = false;
    state.sim     = null;
    state.turn    = 0;
    state.board   = { p1: freshBoard(), p2: freshBoard() };
    state.tray    = freshTray();
    setupAI(state.board);
    els.logOutput.innerHTML = '';
    renderBattleView();
    renderUnitTray();
    renderAttackPriority();
    renderControls();
    logMessage('Simulation reset.');
  });

  els.simSpeed.addEventListener('input', () => {
    state.simConfig.speed     = parseInt(els.simSpeed.value);
    els.speedLabel.textContent = SPEED_LABELS[state.simConfig.speed];
    renderControls();
  });

  els.simRuns.addEventListener('change', () => {
    const v = Math.max(1, Math.min(10000, parseInt(els.simRuns.value) || 1));
    state.simConfig.numRuns = v;
    els.simRuns.value = v;
  });

  // ── Init ──────────────────────────────────────────────────────
  function initResizeHandles() {
    const app       = document.getElementById('app');
    const vHandle   = document.getElementById('v-drag');
    const hHandle   = document.getElementById('h-drag');
    const rightPane = document.getElementById('right-pane');

    // Vertical: resize left / right columns
    vHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      const startX  = e.clientX;
      const startW  = document.getElementById('battle-view').getBoundingClientRect().width;
      vHandle.classList.add('dragging');
      const onMove = ev => {
        const appW  = app.getBoundingClientRect().width;
        const newW  = Math.max(180, Math.min(appW - 280, startW + ev.clientX - startX));
        document.documentElement.style.setProperty('--left-w', newW + 'px');
      };
      const onUp = () => {
        vHandle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Horizontal: resize controls / logs height
    hHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      const startY  = e.clientY;
      const startH  = document.getElementById('controls').getBoundingClientRect().height;
      hHandle.classList.add('dragging');
      const onMove = ev => {
        const paneH = rightPane.getBoundingClientRect().height;
        const newH  = Math.max(100, Math.min(paneH - 120, startH + ev.clientY - startY));
        document.documentElement.style.setProperty('--controls-h', newH + 'px');
      };
      const onUp = () => {
        hHandle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  document.getElementById('btn-copy-log').addEventListener('click', () => {
    const lines = Array.from(els.logOutput.querySelectorAll('.log-entry'))
      .map(el => el.textContent.trim()).join('\n');
    navigator.clipboard.writeText(lines)
      .then(() => logMessage('📋 Log copied to clipboard.'))
      .catch(() => logMessage('⚠ Clipboard write denied.'));
  });
  function init() {
    state.targetPriority = defaultTargetPriority();
    setupAI(state.board);
    renderBattleView();
    renderUnitTray();
    renderAttackPriority();
    renderControls();
    initResizeHandles();
    logMessage('Ready. Place your units then press Start.');
    Promise.all([loadUnitStats(), loadPatterns()]).then(mergePatterns);
  }

  init();
})();
