/* Idea Decision Board: renders window.DATA (data.js). No build step, no network. */
(function () {
  const D = window.DATA; D.hackathon = window.HACKATHON;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sa26:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sa26:' + k, JSON.stringify(v)); } catch (e) {} }
  };
  const CRIT = ['impact', 'creativity', 'validity', 'relevance', 'presentation'];
  const FEAS = { Yes: 5, Partly: 3, No: 1 };
  const LEVEL = { Low: 5, Med: 3, High: 1 };
  const total = i => CRIT.reduce((a, k) => a + (i.scores[k] || 0), 0);
  const pillFeas = f => `<span class="pill ${f === 'Yes' ? 'g' : f === 'Partly' ? 'm' : 'b'}">${esc(f)}</span>`;
  const pillLvl = f => `<span class="pill ${f === 'Low' ? 'g' : f === 'Med' ? 'm' : 'b'}">${esc(f)}</span>`;

  /* ---------- countdown ---------- */
  function clock() {
    const fmt = t => { const ms = t - Date.now(); if (ms <= 0) return 'passed'; const h = Math.floor(ms / 3.6e6), m = Math.floor(ms % 3.6e6 / 6e4); return `${h} h ${String(m).padStart(2, '0')} min`; };
    $('#cd-team').textContent = fmt(Date.parse(D.meta.teamCutoff));
    $('#cd-official').textContent = fmt(Date.parse(D.meta.officialDeadline));
  }
  clock(); setInterval(clock, 30000);

  /* ---------- decision score ---------- */
  const DEFAULT_W = { judging: 35, feasibility: 25, teamFit: 15, dataEase: 15, risk: 10 };
  let W = store.get('weights', DEFAULT_W);
  function decision(i) {
    const parts = {
      judging: total(i) / 25,
      feasibility: (FEAS[i.feasible] || 1) / 5,
      teamFit: (i.teamFit || 1) / 5,
      dataEase: (LEVEL[i.dataEffort] || 1) / 5,
      risk: (6 - (i.riskLevel || 3)) / 5
    };
    const sw = Object.values(W).reduce((a, b) => a + b, 0) || 1;
    return Math.round(100 * Object.keys(parts).reduce((a, k) => a + parts[k] * (W[k] || 0), 0) / sw);
  }

  /* ---------- views ---------- */
  const views = {
    overview() {
      const ranked = [...D.ideas].sort((a, b) => decision(b) - decision(a));
      const max = Math.max(...ranked.map(decision), 1);
      return `
      <section>
        <div class="callout"><h3>${esc(D.meta.headline)}</h3><p>${esc(D.meta.subline)}</p></div>
      </section>
      <section>
        <h2>Ranking</h2>
        <p class="muted small">Decision score (0–100) = weighted mix of estimated judging score, feasibility by the team cut-off, team fit, ease of data access and (inverse) technical risk. Move the sliders to match what the team cares about; the order updates live and is remembered in this browser.</p>
        <div class="panel weights">${Object.entries({ judging: 'Estimated judging score', feasibility: 'Feasible by Sun 16:00', teamFit: 'Team skill fit', dataEase: 'Ease of data access', risk: 'Low technical risk' }).map(([k, l]) =>
          `<label for="w-${k}">${l} <span class="v" id="wv-${k}">${W[k]}</span><input type="range" min="0" max="50" step="5" id="w-${k}" data-w="${k}" value="${W[k]}"></label>`).join('')}
          <label><span>&nbsp;</span><button id="w-reset" class="vote-reset" style="font:500 13px var(--f-body);padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);cursor:pointer">Reset weights</button></label>
        </div>
        <div class="panel rank">${ranked.map((i, n) => `
          <div class="r"><span class="n">${n + 1}</span><a href="#idea-${i.id}">${esc(i.name)}</a>
          <div class="bar"><i style="width:${(decision(i) / max) * 100}%"></i></div><span class="num score" style="font-size:15px">${decision(i)}</span></div>`).join('')}
        </div>
      </section>
      <section>
        <h2>All ideas</h2>
        <div class="grid">${D.ideas.map(card).join('')}</div>
      </section>`;
    },
    compare() {
      return `
      <section><h2>Feasibility</h2>${table(['Idea', 'Challenge', 'Core NASA data', 'Data effort', 'Build (person-h)', 'Feasible by Sun 16:00', 'Biggest risk'],
        D.ideas.map(i => [link(i), esc(i.challenge), esc(i.coreData), pillLvl(i.dataEffort), `<span class="num">${esc(i.effortH)}</span>`, pillFeas(i.feasible), esc(i.risk)]))}</section>
      <section><h2>Estimated judging score</h2>${table(['Idea', 'Impact', 'Creativity', 'Validity', 'Relevance', 'Presentation', 'Total /25', 'Why'],
        D.ideas.map(i => [link(i), ...CRIT.map(k => `<span class="num">${i.scores[k]}</span>`), `<b class="num">${total(i)}</b>`, esc(i.scoreWhy)]), true)}</section>
      <section><h2>Resources</h2>${table(['Idea', 'Listed challenge resource', 'Other NASA / partner data', 'Open-source tools', 'Sponsor resources'],
        D.ideas.map(i => [link(i), esc(i.res.listed), esc(i.res.other), esc(i.res.tools), esc(i.res.sponsor)]))}</section>
      <section><h2>MVP scope</h2>${table(['Idea', 'Must-have by Sun 12:00', 'Nice-to-have', 'Cut', '30 s video moment'],
        D.ideas.map(i => [link(i), esc(i.mvp.must), esc(i.mvp.nice), esc(i.mvp.cut), esc(i.mvp.demo)]))}</section>`;
    },
    decide() {
      const votes = store.get('votes', {});
      return `
      <section>
        <h2>Pros and cons</h2>
        ${table(['Idea', 'Pros', 'Cons', 'Score', 'Verdict', 'Evidence'], D.ideas.map(i => [link(i),
          `<ul style="margin:0;padding-left:16px">${i.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`,
          `<ul style="margin:0;padding-left:16px">${i.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`,
          `<b class="num">${decision(i)}</b>`, verdictPill(i.verdict),
          `<ul class="links" style="padding-left:16px">${(i.sources || []).map(s => `<li><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join('')}</ul>`]))}
      </section>
      <section>
        <h2>Decision matrix</h2>
        <p class="muted small">Yes/no checks the team should agree on before committing. ✔ = passes, ~ = with caveats, ✘ = fails.</p>
        ${table(['Idea', ...D.checks.map(c => c.label)], D.ideas.map(i => [link(i), ...D.checks.map(c => mark(i.checks?.[c.key]))]))}
      </section>
      <section>
        <h2>Team vote</h2>
        <p class="muted small">Each member taps their pick; stored in this browser only. Copy the summary into DECISIONS.md.</p>
        <div class="panel" style="display:flex;flex-direction:column;gap:12px">
          ${D.meta.team.map(m => `<div><b>${esc(m)}</b><div class="vote" data-member="${esc(m)}">${D.ideas.map(i =>
            `<button data-idea="${i.id}" class="${votes[m] === i.id ? 'on' : ''}">${esc(i.short)}</button>`).join('')}</div></div>`).join('')}
          <label for="notes"><b>Decision notes</b></label>
          <textarea id="notes" placeholder="Why we picked it, what we cut, who owns what…">${esc(store.get('notes', ''))}</textarea>
          <div><button id="copy" style="font:500 13px var(--f-body);padding:6px 12px;border:1px solid var(--navy);border-radius:6px;background:var(--navy);color:var(--panel);cursor:pointer">Copy decision summary</button> <span id="copied" class="muted small"></span></div>
          <pre id="summary" class="small" style="white-space:pre-wrap;margin:0;font-family:var(--f-mono)"></pre>
        </div>
      </section>`;
    },
    hackathon() {
      const H = D.hackathon;
      return `
      <section><h2>Key dates</h2>${table(['Date', 'Milestone'], H.dates.map(d => [`<span class="num">${esc(d[0])}</span>`, esc(d[1])]))}</section>
      <section><h2>Rules that shape the build</h2>${table(['Rule', 'Detail'], H.rules.map(r => [`<b>${esc(r[0])}</b>`, esc(r[1])]))}</section>
      <section><h2>Judging and awards</h2><div class="panel"><p><b>Criteria (1–5 each):</b> ${H.criteria.join(' · ')}</p><p style="margin-top:8px"><b>Global awards:</b> ${H.awards.join(' · ')}</p></div></section>
      <section><h2>Sponsor resources</h2>${table(['Offer', 'What we get', 'Use'], H.sponsors.map(s => s.map(esc)))}</section>
      <section><h2>The 14 challenges</h2><div class="grid">${H.challenges.map(c => `
        <div class="panel" style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Challenge ${c.n}</div><h3>${esc(c.t)}</h3><p class="small muted">${esc(c.task)}</p>
        <div>${c.ideas.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
        <details><summary>${c.res.length} listed resources</summary><ul class="links">${c.res.map(r => `<li><a href="${esc(r[1])}" target="_blank" rel="noopener">${esc(r[0])}</a></li>`).join('')}</ul></details></div>`).join('')}</div></section>
      <section><h2>Past global winners: patterns</h2><div class="panel"><ul style="margin:0;padding-left:18px;display:grid;gap:6px">${H.winners.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div></section>`;
    },
    research() {
      return `<section><h2>Research files</h2>${table(['File', 'What it contains'], D.reports.map(r => [`<a href="${esc(r[0])}">${esc(r[0].replace('../', ''))}</a>`, esc(r[1])]))}
      <p class="muted small">Links open the Markdown files relative to this page.</p></section>`;
    }
  };

  function card(i) {
    return `<a class="card" href="#idea-${i.id}" style="text-decoration:none">
      <div class="row"><span class="eyebrow">Ch. ${esc(i.chNum)} · ${esc(i.family)}</span>${verdictPill(i.verdict)}</div>
      <h3>${esc(i.name)}</h3><p class="small muted">${esc(i.summary)}</p>
      <div class="row"><span class="small">Judging ${total(i)}/25 · ${pillFeas(i.feasible)}</span><span class="score">${decision(i)}</span></div>
      <div class="bar"><i style="width:${decision(i)}%"></i></div></a>`;
  }
  function ideaView(id) {
    const i = D.ideas.find(x => x.id === id); if (!i) return '<p>Unknown idea.</p>';
    return `
    <section>
      <a href="#overview" class="small">← All ideas</a>
      <div class="eyebrow">Challenge ${esc(i.chNum)} · ${esc(i.challenge)}</div>
      <h2 style="font-size:28px">${esc(i.name)}</h2>
      <p>${esc(i.summary)}</p>
      <div>${verdictPill(i.verdict)} ${pillFeas(i.feasible)} <span class="chip">Decision score ${decision(i)}</span> <span class="chip">Judging ${total(i)}/25</span> <span class="chip">${esc(i.effortH)} person-h</span></div>
    </section>
    <section class="pc">
      <div class="panel pro"><h4>Pros</h4><ul>${i.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <div class="panel con"><h4>Cons</h4><ul>${i.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
    </section>
    <section><h3>Judging estimate</h3>${table(CRIT.map(c => c[0].toUpperCase() + c.slice(1)).concat(['Total']), [[...CRIT.map(k => `<span class="num">${i.scores[k]}</span>`), `<b class="num">${total(i)}</b>`]])}<p class="small muted">${esc(i.scoreWhy)}</p></section>
    <section><h3>MVP plan</h3>${table(['Must-have by Sun 12:00', 'Nice-to-have', 'Cut', '30 s video moment'], [[esc(i.mvp.must), esc(i.mvp.nice), esc(i.mvp.cut), esc(i.mvp.demo)]])}</section>
    ${i.roles ? `<section><h3>Who does what</h3>${table(['Person', 'Task'], i.roles.map(r => r.map(esc)))}</section>` : ''}
    <section><h3>Data and tools</h3><div class="grid">
      <div class="panel"><h4>Data sources</h4><ul class="links">${i.data.map(d => `<li><a href="${esc(d[1])}" target="_blank" rel="noopener">${esc(d[0])}</a>${d[2] ? ` <span class="muted">· ${esc(d[2])}</span>` : ''}</li>`).join('')}</ul></div>
      <div class="panel"><h4>Tools & sponsors</h4><p class="small">${esc(i.res.tools)}</p><p class="small" style="margin-top:6px">${esc(i.res.sponsor)}</p></div>
    </div></section>
    <section><h3>Prior art & competition</h3><div class="panel"><ul style="margin:0;padding-left:18px;display:grid;gap:4px">${i.prior.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div></section>
    <section><h3>Risks</h3>${table(['Risk', 'Mitigation'], i.risks.map(r => r.map(esc)))}</section>
    <section><h3>Evidence: check these first</h3><div class="panel"><p class="small muted" style="margin-bottom:6px">Sources behind the main claims on this page. Scores and person-hours are AI estimates; see the methodology note.</p><ul class="links">${(i.sources || []).map(s => `<li><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join('')}</ul></div></section>
    <section><div class="callout"><h3>Recommendation: ${esc(i.verdict)}</h3><p>${esc(i.scoreWhy)}</p><p class="small muted">Full report: <a href="${esc(i.report)}">${esc(i.report.replace('../', ''))}</a> · Method: <a href="../00-methodology.md">00-methodology.md</a></p></div></section>`;
  }

  const link = i => `<a href="#idea-${i.id}">${esc(i.name)}</a>`;
  const verdictPill = v => `<span class="pill ${v === 'Build' ? 'g' : v === 'Consider' ? 'm' : v === 'Merge' ? 'm' : 'o'}">${esc(v)}</span>`;
  const mark = v => v === 1 ? '<span class="pill g">✔</span>' : v === 0.5 ? '<span class="pill m">~</span>' : '<span class="pill b">✘</span>';
  function table(head, rows, sortable) {
    return `<div class="tw"><table ${sortable ? 'data-sortable' : ''}><thead><tr>${head.map((h, n) => `<th class="${sortable ? 'sort' : ''}" data-col="${n}">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- routing ---------- */
  const TABS = [['overview', 'Overview & ranking'], ['compare', 'Compare tables'], ['decide', 'Decide'], ['hackathon', 'Hackathon'], ['research', 'Research files']];
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button role="tab" data-tab="${k}">${l}</button>`).join('');
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) location.hash = b.dataset.tab; });

  function render() {
    const h = location.hash.slice(1) || 'overview';
    const tab = h.startsWith('idea-') ? 'overview' : (views[h] ? h : 'overview');
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    $('#view').innerHTML = h.startsWith('idea-') ? ideaView(h.slice(5)) : views[tab]();
    wire(tab);
    window.scrollTo(0, 0);
  }
  function wire(tab) {
    document.querySelectorAll('[data-w]').forEach(inp => inp.addEventListener('input', () => {
      W[inp.dataset.w] = +inp.value; store.set('weights', W);
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }));
    const rs = $('#w-reset'); if (rs) rs.onclick = () => { W = { ...DEFAULT_W }; store.set('weights', W); render(); };
    document.querySelectorAll('table[data-sortable] th.sort').forEach(th => th.addEventListener('click', () => {
      const tb = th.closest('table').tBodies[0], col = +th.dataset.col, dir = th.dataset.dir === 'desc' ? 1 : -1; th.dataset.dir = dir === 1 ? 'asc' : 'desc';
      [...tb.rows].sort((a, b) => { const x = a.cells[col].innerText, y = b.cells[col].innerText; const nx = parseFloat(x), ny = parseFloat(y); return (isNaN(nx) || isNaN(ny) ? x.localeCompare(y) : nx - ny) * dir; }).forEach(r => tb.appendChild(r));
    }));
    if (tab === 'decide') {
      const votes = store.get('votes', {});
      const summary = () => {
        const tally = {}; Object.values(votes).forEach(v => tally[v] = (tally[v] || 0) + 1);
        const lines = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([id, n]) => `- ${D.ideas.find(i => i.id === id)?.name}: ${n} vote(s)`);
        $('#summary').textContent = `Team vote (${new Date().toLocaleString()}):\n${lines.join('\n') || '- no votes yet'}\n\nNotes:\n${$('#notes').value || '-'}`;
      };
      document.querySelectorAll('.vote').forEach(g => g.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        votes[g.dataset.member] = b.dataset.idea; store.set('votes', votes);
        g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); summary();
      }));
      $('#notes').addEventListener('input', e => { store.set('notes', e.target.value); summary(); });
      $('#copy').onclick = () => { const t = $('#summary').textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => $('#copied').textContent = 'Copied.', () => $('#copied').textContent = 'Select the text below and copy it.'); };
      summary();
    }
  }
  window.addEventListener('hashchange', render);
  render();
})();
