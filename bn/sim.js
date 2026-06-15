// sim.js — Pure simulation engine (no DOM)
window.SimEngine = (() => {
  const MAX_TURNS  = 500;

  // ── Build simulation state from placed board ───────────────────
  function createSim(board, unitStats, patterns, attackPriority, targetPriority) {
    const units = { p1: [], p2: [] };

    ['p1', 'p2'].forEach(player => {
      board[player].forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (!cell) return;
          const stats = unitStats[cell.wikiPage] || unitStats[cell.id];
          if (!stats) return;

          const rank     = cell.rank || 1;
          const rankData = stats.ranks.find(r => r.rank === rank)
                        || stats.ranks[stats.ranks.length - 1]
                        || { hp: 100 };

          const atkStates = stats.attacks.map(atk => ({
            ammoLeft:        atk.ammo > 0 ? atk.ammo : Infinity,
            reloadCountdown: 0,
            prepCountdown:   atk.preptime || 0,
          }));

          units[player].push({
            player, row: rowIdx, col: colIdx,
            id: cell.id, name: cell.name, img: cell.img, wikiPage: cell.wikiPage,
            isBoss: cell.isBoss || false,
            rank, stats, rankData,
            maxHp: rankData.hp, currentHp: rankData.hp,
            atkStates, alive: true,
          });
        });
      });
    });

    return { units, turn: 0, _p1Next: 0, finished: false, winner: null,
             attackPriority, targetPriority: targetPriority || ['center', 'left', 'right'], patterns };
  }

  // ── Advance one turn: one shot per side, everyone's states tick ─
  function simTurn(sim) {
    if (sim.finished) return [];
    sim.turn++;
    const events = [];

    // P1: next unit in round-robin order fires one shot
    fireOne(sim, 'p1', 'p2', events);
    if (checkVictory(sim, 'p2', events)) { tickAll(sim); return events; }

    // P2: random available unit fires one shot
    fireOne(sim, 'p2', 'p1', events);
    checkVictory(sim, 'p1', events);

    // Tick everyone's cooldowns/reloads regardless of who fired
    tickAll(sim);

    if (!sim.finished && sim.turn >= MAX_TURNS) {
      sim.finished = true;
      sim.winner   = 'draw';
      events.push({ type: 'draw', turn: sim.turn });
    }

    return events;
  }

  function fireOne(sim, atkSide, defSide, events) {
    const all      = sim.units[atkSide];
    const defenders = sim.units[defSide];
    const aliveDef  = defenders.filter(u => u.alive);
    if (!aliveDef.length) return;

    let unit = null, atkIdx = -1;

    if (atkSide === 'p1') {
      // Round-robin: scan from _p1Next, wrap around
      const n = all.length;
      for (let i = 0; i < n; i++) {
        const u = all[(sim._p1Next + i) % n];
        if (!u.alive) continue;
        const idx = chooseAttack(u, aliveDef, 'p1', sim);
        if (idx !== -1) {
          unit   = u;
          atkIdx = idx;
          sim._p1Next = (all.indexOf(u) + 1) % n;
          break;
        }
      }
    } else {
      // P2: random among available
      const avail = all.filter(u => u.alive && chooseAttack(u, aliveDef, 'p2', sim) !== -1);
      if (avail.length) {
        unit   = avail[Math.floor(Math.random() * avail.length)];
        atkIdx = chooseAttack(unit, aliveDef, 'p2', sim);
      }
    }

    if (!unit || atkIdx === -1) return;

    const atk      = unit.stats.attacks[atkIdx];
    const atkState = unit.atkStates[atkIdx];

    // Consume ammo
    if (isFinite(atkState.ammoLeft)) {
      atkState.ammoLeft -= atk.ammoUsed || 1;
      if (atkState.ammoLeft <= 0) {
        atkState.ammoLeft        = 0;
        atkState.reloadCountdown = atk.reload > 0 ? atk.reload : 0;
      }
    }

    // Reset between-shot cooldown after every shot
    if (atk.cooldown > 0) {
      atkState.prepCountdown = atk.cooldown;
    }

    // Resolve hits
    const targetPos = chooseTarget(unit, atk, aliveDef, atkSide, sim);
    if (targetPos) {
      const hits = resolveHitTiles(atk.pattern, targetPos.row, targetPos.col);
      for (const hit of hits) {
        if (hit.hitChance < 1.0 && Math.random() > hit.hitChance) continue;
        const target = defenders.find(u => u.alive && u.row === hit.row && u.col === hit.col);
        if (!target || !canHit(atk, target)) continue;

        const baseDmg  = calcDamage(atk, target, unit.rank);
        const finalDmg = Math.max(0, Math.round(baseDmg * (hit.dmgMult ?? 1.0)));
        const isCrit   = _lastCritFlag;

        target.currentHp = Math.max(0, target.currentHp - finalDmg);
        if (target.currentHp === 0) target.alive = false;

        events.push({
          type: 'attack', attacker: unit, target, attack: atk,
          damage: finalDmg, crit: isCrit, killed: !target.alive, turn: sim.turn,
        });
      }
    }
  }

  // Tick ALL units' states at end of each turn
  function tickAll(sim) {
    ['p1', 'p2'].forEach(side => {
      sim.units[side].forEach(unit => {
        unit.atkStates.forEach((as, i) => {
          if (as.prepCountdown > 0) as.prepCountdown--;
          if (as.reloadCountdown > 0) {
            as.reloadCountdown--;
            if (as.reloadCountdown === 0) {
              const ammo = unit.stats.attacks[i].ammo;
              as.ammoLeft = ammo > 0 ? ammo : Infinity;
            }
          }
        });
      });
    });
  }

  function checkVictory(sim, loserSide, events) {
    const units   = sim.units[loserSide];
    // P2 loses when the boss (Goliath Main) dies; P1 loses when all units die
    const defeated = loserSide === 'p2'
      ? units.some(u => u.isBoss && !u.alive)
      : units.every(u => !u.alive);
    if (defeated) {
      sim.finished = true;
      sim.winner   = loserSide === 'p2' ? 'p1' : 'p2';
      events.push({ type: 'victory', winner: sim.winner, turn: sim.turn });
      return true;
    }
    return false;
  }

  // ── Target priority — focus fire on P2 units in preferred order ─
  const BOARD_ROWS = [5, 5, 3];

  function filterByTargetPriority(defenders, targetPriority) {
    for (const unitId of targetPriority) {
      const matching = defenders.filter(u => u.id === unitId);
      if (matching.length) return matching;
    }
    return defenders;
  }
  function chooseAttack(unit, aliveDef, side, sim) {
    const attacks = unit.stats.attacks;

    if (side === 'p2') {
      // Random applicable attack
      const avail = attacks
        .map((a, i) => ({ a, i }))
        .filter(({ a, i }) => isAvailable(unit.atkStates[i]) && hasTarget(a, aliveDef));
      if (!avail.length) return -1;
      return avail[Math.floor(Math.random() * avail.length)].i;
    }

    // P1: priority order
    const priority = sim.attackPriority[unit.wikiPage] || attacks.map((_, i) => i);
    for (const idx of priority) {
      if (isAvailable(unit.atkStates[idx]) && hasTarget(attacks[idx], aliveDef)) return idx;
    }
    return -1;
  }

  function isAvailable({ prepCountdown, reloadCountdown, ammoLeft }) {
    return prepCountdown === 0 && reloadCountdown === 0 && ammoLeft > 0;
  }

  function hasTarget(attack, aliveDef) {
    return aliveDef.some(u => canHit(attack, u));
  }

  function canHit(attack, target) {
    const targets = attack.targets || [];
    if (!targets.length) return true;
    const type  = (target.stats.unitType || '').toLowerCase();
    // Recognise air unit types from the wiki (unitType field)
    const isAir = /air|seaplane|helicopter|fighter|bomber|gunship|aircraft|drone/.test(type);
    const low   = targets.map(t => t.toLowerCase());
    // 'all' or 'both' hits anything
    if (low.some(t => t === 'all' || t === 'both')) return true;
    return isAir
      ? low.some(t => t.includes('air'))
      : low.some(t => t.includes('ground') || t.includes('land') || t.includes('surface'));
  }

  function chooseTarget(unit, attack, aliveDef, side, sim) {
    if (!aliveDef.length) return null;
    const pat = attack.pattern;
    if (!pat || pat.targeting === 'absolute') return { row: 0, col: 0 };

    // P1: apply target zone priority before picking best tile/col/row
    const pool = side === 'p1'
      ? filterByTargetPriority(aliveDef, sim.targetPriority)
      : aliveDef;

    if (pat.targeting === 'tile') {
      if (side === 'p1') return bestTileTarget(attack, pool);
      const t = pool[Math.floor(Math.random() * pool.length)];
      return { row: t.row, col: t.col };
    }

    if (pat.targeting === 'column') {
      const cols = [...new Set(pool.map(u => u.col))];
      if (side === 'p1') {
        const best = cols.sort((a, b) =>
          pool.filter(u => u.col === b).length - pool.filter(u => u.col === a).length)[0];
        return { row: 0, col: best };
      }
      return { row: 0, col: cols[Math.floor(Math.random() * cols.length)] };
    }

    if (pat.targeting === 'row') {
      const rows = [...new Set(pool.map(u => u.row))];
      if (side === 'p1') {
        const best = rows.sort((a, b) =>
          pool.filter(u => u.row === b).length - pool.filter(u => u.row === a).length)[0];
        return { row: best, col: 0 };
      }
      return { row: rows[Math.floor(Math.random() * rows.length)], col: 0 };
    }

    return null;
  }

  function bestTileTarget(attack, aliveDef) {
    let best = { row: aliveDef[0].row, col: aliveDef[0].col, score: -1 };
    for (const def of aliveDef) {
      const hits  = resolveHitTiles(attack.pattern, def.row, def.col);
      const score = hits.reduce((s, h) =>
        s + (h.hitChance ?? 1) * (h.dmgMult ?? 1) *
        (aliveDef.some(d => d.row === h.row && d.col === h.col) ? 1 : 0), 0);
      if (score > best.score) best = { row: def.row, col: def.col, score };
    }
    return best;
  }

  // ── Pattern → hit tiles ────────────────────────────────────────
  function resolveHitTiles(pattern, tRow, tCol) {
    if (!pattern) return [{ row: tRow, col: tCol, dmgMult: 1.0, hitChance: 1.0 }];
    const ok   = (r, c) => r >= 0 && r < BOARD_ROWS.length && c >= 0 && c < BOARD_ROWS[r];
    const hits = [];

    switch (pattern.targeting) {
      case 'absolute':
        for (const h of pattern.hits) {
          const [r, c] = h.pos;
          if (ok(r, c)) hits.push({ row: r, col: c, dmgMult: h.dmgMult ?? 1.0, hitChance: 1.0 });
        }
        break;

      case 'tile':
        for (const h of pattern.hits) {
          const r = tRow + h.offset[0], c = tCol + h.offset[1];
          if (ok(r, c)) hits.push({ row: r, col: c, dmgMult: h.dmgMult ?? 1.0, hitChance: h.hitChance ?? 1.0 });
        }
        break;

      case 'column':
        for (const h of pattern.hits) {
          const r = h.rowIndex, c = tCol;
          if (ok(r, c)) hits.push({ row: r, col: c, dmgMult: h.dmgMult ?? 1.0, hitChance: 1.0 });
        }
        break;

      case 'row': {
        const cols = BOARD_ROWS[tRow] ?? 0;
        for (let c = 0; c < cols; c++)
          hits.push({ row: tRow, col: c, dmgMult: pattern.dmgMult ?? 1.0, hitChance: 1.0 });
        break;
      }
    }

    return hits;
  }

  // ── Damage ─────────────────────────────────────────────────────
  let _lastCritFlag = false;

  function calcDamage(attack, target, attackerRank) {
    let dmg = attack.minDmg + Math.random() * (attack.maxDmg - attack.minDmg);

    // Crit
    const critMod = (attack.critMod || [])[attackerRank - 1] ?? 0;
    _lastCritFlag = Math.random() * 100 < (attack.baseCrit || 0) + critMod;
    if (_lastCritFlag) dmg *= 2;

    // Armor piercing + resistance
    const res = target.stats.resistances[attack.damageType] ?? 100;
    const ap  = attack.armorPiercing || 0;
    dmg = dmg * (ap / 100) + dmg * (1 - ap / 100) * (res / 100);

    return Math.round(dmg);
  }

  return { createSim, simTurn };
})();
