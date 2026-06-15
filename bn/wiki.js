// wiki.js — Battle Nations wiki fetcher & wikitext parser
window.WikiFetcher = (() => {
  const API = 'https://battlenations.miraheze.org/w/api.php';

  // ── Public API ────────────────────────────────────────────────
  async function fetchUnitStats(wikiPage) {
    const url = `${API}?action=parse&page=${encodeURIComponent(wikiPage)}&format=json&origin=*&prop=wikitext`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (json.error) throw new Error(json.error.info);
    return parseUnitWikitext(json.parse.wikitext['*'], wikiPage);
  }

  // ── Top-level parser ──────────────────────────────────────────
  function parseUnitWikitext(wikitext, wikiPage) {
    const profile  = parseTemplate(wikitext, 'UnitProfile');
    const isPlayer = Object.keys(profile).length > 0;

    if (isPlayer) {
      const ranksBox = parseTemplate(wikitext, 'UnitRanksBox');
      const weapons  = extractAllTemplates(wikitext, 'WeaponBoxTabber').map(parseWeapon);
      return {
        wikiPage,
        isNPC:       false,
        name:        profile.shortname || wikiPage.replace(/_/g, ' '),
        unitType:    stripWikiMarkup(profile['unit type']   || ''),
        unitLevel:   parseInt(profile['unit level'])        || 0,
        immunities:  parseImmunities(profile.immunities     || ''),
        blocking:    stripWikiMarkup(profile.blocking       || 'None'),
        resistances: parseResistances(profile['hp defense'] || ''),
        ranks:       parseRanks(ranksBox),
        attacks:     weapons.filter(Boolean),
      };
    }

    // NPC / boss format
    const infobox = parseTemplate(wikitext, 'UnitInfobox');
    const weapons  = extractAllTemplates(wikitext, 'WeaponBox').flatMap(parseWeaponBox);
    return {
      wikiPage,
      isNPC:       true,
      name:        infobox.name || wikiPage.replace(/_/g, ' '),
      unitType:    stripWikiMarkup(infobox.ut || ''),
      unitLevel:   parseInt(infobox.enemylevel) || 0,
      immunities:  parseImmunities(infobox.immunities || ''),
      blocking:    stripWikiMarkup(infobox.blocking    || 'None'),
      resistances: parseNPCResistances(infobox),
      ranks:       parseNPCRanks(infobox),
      attacks:     weapons.filter(Boolean),
    };
  }

  // ── Section parsers ───────────────────────────────────────────
  function parseImmunities(str) {
    return str
      .replace(/\{\{[^|}]+\|[^}]+\}\}/g, '')
      .replace(/\{\{[^|}]+\}\}/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function parseResistances(str) {
    const res = {};
    for (const m of str.matchAll(/\{\{(\w+)\|(\d+)%?\}\}/g)) {
      if (m[1] !== 'HP') res[m[1]] = parseInt(m[2]);
    }
    return res;
  }

  function parseRanks(args) {
    const hp      = parseRankArray(args.hp      || '');
    const bravery = parseRankArray(args.bravery || '');
    const defense = parseRankArray(args.defense || '');
    const dodge   = parseRankArray(args.dodge   || '');
    const uv      = parseRankArray(args.uv      || '');

    return hp.map((h, i) => ({
      rank:    i + 1,
      hp:      h,
      bravery: bravery[i] ?? 0,
      defense: defense[i] ?? 0,
      dodge:   dodge[i]   ?? 0,
      uv:      uv[i]      ?? 0,
    }));
  }

  function parseWeapon(tabberBody) {
    const tabberArgs = parseTemplateArgs(tabberBody);
    const attackBody = extractTemplateFromStr(tabberBody, 'AttackBox');
    if (!attackBody) return null;
    const atk = parseTemplateArgs(attackBody);

    return {
      name:          atk.name                         || '',
      internalName:  atk.internal_name                || '',
      damageType:    atk.damagetype                   || '',
      minDmg:        parseInt(atk.mindmg)             || 0,
      maxDmg:        parseInt(atk.maxdmg)             || 0,
      numAttacks:    parseInt(atk.numattacks)         || 1,
      baseOffense:   parseInt(atk.baseoffense)        || 0,
      accuracy:      parseRankArray(atk.accuracy      || ''),
      baseCrit:      parseInt(atk.basecrit)           || 0,
      critMod:       parseRankArray(atk.critmod       || ''),
      armorPiercing: parseInt(atk.armorpiercing)      || 0,
      power:         parseRankArray(atk.power         || ''),
      targets:       (atk.targets || '').split(',').map(s => s.trim()).filter(Boolean),
      range:         atk.range                        || '',
      lof:           atk.lof                          || '',
      ammo:          parseInt(tabberArgs.ammo)        || 0,
      ammoUsed:      parseInt(atk.ammoused)           || 1,
      reload:        parseInt(tabberArgs.reload)      || 0,
      cooldown:      parseInt(atk.cooldown)           || 0,
      dotType:       atk.dottype                      || null,
      dotDuration:   parseInt(atk.dotduration)        || 0,
    };
  }

  // ── NPC / boss parsers ────────────────────────────────────────
  function parseNPCRanks(args) {
    return [{
      rank:    1,
      hp:      parseInt((args.hp      || '0').replace(/,/g, '')) || 0,
      defense: parseInt(args.defense) || 0,
      dodge:   parseInt(args.dodge)   || 0,
      bravery: parseInt(args.bravery) || 0,
      uv:      parseInt(args.uv)      || 0,
      armor:   parseInt((args.armor   || '0').replace(/,/g, '')) || 0,
    }];
  }

  function parseNPCResistances(args) {
    const res = {};
    ['cold', 'crushing', 'explosive', 'fire', 'piercing'].forEach(t => {
      const val = parseInt(args[`armor_${t}_defense`] || args[`base_${t}_defense`] || '');
      if (!isNaN(val)) res[t.charAt(0).toUpperCase() + t.slice(1)] = val;
    });
    return res;
  }

  // NPC weapon: {{WeaponBox}} may contain multiple {{UnitAttackBox}} (tabber tabs)
  function parseWeaponBox(tabberBody) {
    const tabberArgs = parseTemplateArgs(tabberBody);
    const attackBodies = extractAllTemplatesFromStr(tabberBody, 'UnitAttackBox');
    if (!attackBodies.length) return [];

    return attackBodies.map(attackBody => {
      const atk = parseTemplateArgs(attackBody);
      const dmgMatch = (atk.damage || '').match(/\{\{(\w+)\|(\d+)-(\d+)\}\}/);
      const critPct   = parseInt(((atk.crit || '').match(/^(\d+)%/) || [])[1]) || 0;
      return {
        name:          stripWikiMarkup(atk['game file name'] || '').replace(/_/g, ' '),
        internalName:  atk['game file name'] || '',
        damageType:    dmgMatch ? dmgMatch[1] : '',
        minDmg:        dmgMatch ? parseInt(dmgMatch[2]) : 0,
        maxDmg:        dmgMatch ? parseInt(dmgMatch[3]) : 0,
        numAttacks:    1,
        baseOffense:   parseInt(atk.offense)       || 0,
        accuracy:      [],
        baseCrit:      critPct,
        critMod:       [],
        armorPiercing: parseInt(atk.armorpiercing)  || 0,
        power:         [],
        targets:       (atk.targets || '').split(',').map(s => s.trim()).filter(Boolean),
        range:         atk.range || '',
        lof:           atk.lof  || '',
        ammo:          parseInt(tabberArgs.ammo)    || 0,
        ammoUsed:      parseInt(atk.ammoused)       || 1,
        reload:        parseInt(tabberArgs.reload)  || 0,
        preptime:      parseInt(atk.preptime)       || 0,
        cooldown:      parseInt(atk.cooldown)       || parseInt(tabberArgs.cooldown) || 0,
        dotType:       null,
        dotDuration:   0,
      };
    });
  }

  // ── Template extraction ───────────────────────────────────────
  // Walks a string from `start` (position of first '{'), returns
  // { content, end } where content is the text between {{ and }}.
  function extractRawTemplate(str, start) {
    let depth = 0, i = start;
    while (i < str.length - 1) {
      if (str[i] === '{' && str[i + 1] === '{') {
        depth++; i += 2;
      } else if (str[i] === '}' && str[i + 1] === '}') {
        depth--; i += 2;
        if (depth === 0) return { content: str.substring(start + 2, i - 2), end: i };
      } else {
        i++;
      }
    }
    return null;
  }

  function parseTemplate(wikitext, name) {
    const start = wikitext.indexOf(`{{${name}`);
    if (start === -1) return {};
    const raw = extractRawTemplate(wikitext, start);
    return raw ? parseTemplateArgs(raw.content.substring(name.length)) : {};
  }

  function extractAllTemplates(wikitext, name) {
    const marker  = `{{${name}`;
    const results = [];
    let pos = 0;
    while (true) {
      const start = wikitext.indexOf(marker, pos);
      if (start === -1) break;
      const raw = extractRawTemplate(wikitext, start);
      if (!raw) break;
      results.push(raw.content.substring(name.length));
      pos = raw.end;
    }
    return results;
  }

  function extractTemplateFromStr(str, name) {
    const start = str.indexOf(`{{${name}`);
    if (start === -1) return null;
    const raw = extractRawTemplate(str, start);
    return raw ? raw.content.substring(name.length) : null;
  }

  function extractAllTemplatesFromStr(str, name) {
    const results = [];
    let pos = 0;
    while (true) {
      const start = str.indexOf(`{{${name}`, pos);
      if (start === -1) break;
      const raw = extractRawTemplate(str, start);
      if (!raw) break;
      results.push(raw.content.substring(name.length));
      pos = raw.end;
    }
    return results;
  }

  // ── Template arg parsing ──────────────────────────────────────
  // Splits on '|' while respecting nested {{ }} and [[ ]] depth.
  function splitOnPipe(str) {
    const parts = [];
    let depth = 0, current = '', i = 0;
    while (i < str.length) {
      const c = str[i], c2 = str[i + 1];
      if ((c === '{' && c2 === '{') || (c === '[' && c2 === '[')) {
        depth++; current += c + c2; i += 2;
      } else if ((c === '}' && c2 === '}') || (c === ']' && c2 === ']')) {
        depth--; current += c + c2; i += 2;
      } else if (c === '|' && depth === 0) {
        parts.push(current); current = ''; i++;
      } else {
        current += c; i++;
      }
    }
    if (current.trim()) parts.push(current);
    return parts;
  }

  function parseTemplateArgs(body) {
    const args  = {};
    const parts = splitOnPipe(body);
    for (const part of parts) {
      const trimmed = part.trim();
      const eq      = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.substring(0, eq).trim();
      const val = trimmed.substring(eq + 1).trim();
      if (key) args[key] = val;
    }
    return args;
  }

  // ── Helpers ───────────────────────────────────────────────────
  function parseRankArray(str) {
    return str.split(';').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  }

  function stripWikiMarkup(str) {
    return str
      .replace(/\[\[File:[^\]]*\]\]/gi, '')
      .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
      .replace(/\[\[([^\]|]+)\]\]/g, '$1')
      .replace(/\{\{[^{}|]*\|([^{}]*)\}\}/g, '$1')
      .replace(/\{\{[^{}]*\}\}/g, '')
      .replace(/<br\s*\/?>/gi, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { fetchUnitStats };
})();
