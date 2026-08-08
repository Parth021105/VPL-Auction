/**
 * Volleyball Premier League (VPL) - Live Physical Auction Engine v2
 * 
 * Rules implemented:
 *  - Exactly 5 Team Owners, each with a strict ₹500 purse.
 *  - Live Spotlight only shows the PLAYER NAME (auction conducted physically).
 *  - Enter final sold price (₹), click the winning owner, then MARK AS SOLD.
 *  - Owner purse cannot be exceeded (strict validation, blocked).
*  - Round 1: random draw from all registered players, no repeats.
 *  - Rounds 2-4: after each round, unsold players are randomly re-auctioned in the next round.
 */

document.addEventListener('DOMContentLoaded', () => {

  // --- APPLICATION STATE ---
  let state = {
    teams: [],          // { id, name, owner, logo, budget:500 }
    players: [],        // { id, name, status, teamId, finalPrice }
    activePlayerId: null,
    winningTeamId: '',
    round: 1,           // 1 = main draw, 2/3/4 = unsold second-chance rounds
    roundQueue: [],     // shuffled ids of unsold players for the current repeat round
    roundTotal: 0,      // total unsold players when the current repeat round began
    pendingQueue: [],   // ids marked UNSOLD this round, to be re-auctioned in the next round
    auctionComplete: false
  };

  const STORAGE_KEY = 'VPL_AUCTION_STATE_2026_V7';

  // Maximum number of auction rounds (subsequent rounds re-auction unsold players).
  const MAX_ROUNDS = 4;

  // VPL Registered Team Owners (₹500 each).
  // Logos are stored in the VPL2 folder with the team names as filenames.
  const DEFAULT_TEAMS = [
    { id: 'team-1', name: '7 Deadly Zins', owner: 'Saish Kedari', logo: '7 Deadly Zins.jpeg', budget: 500 },
    { id: 'team-2', name: 'Black Jackals', owner: 'Yash Shinde', logo: 'Black Jackals.jpeg', budget: 500 },
    { id: 'team-3', name: 'RKD Warriors', owner: 'Abhishek Achrekar', logo: 'RKD Warriors.jpeg', budget: 500 },
    { id: 'team-4', name: 'Thunder Hawks', owner: 'Adesh Durafe', logo: 'Thunder Hawks.jpeg', budget: 500 },
{ id: 'team-5', name: 'Shivaay Spikers', owner: 'Harshad Natekar', logo: 'Shivaay Spikers.jpeg', budget: 500 }
  ];


  // Sample data load uses the same registered teams.
  const DEMO_TEAMS = DEFAULT_TEAMS.map(t => ({ ...t }));

//  Official VPL registered players list (39 players).

  const DEFAULT_PLAYERS = [
    'Parth Wavhal', 'Rushab Pendurkar', 'Vijay Karande', 'Sujal Kaspale',
    'Ritesh Chavan', 'Sahil Gharkar', 'Yug Sanil', 'Sarthak Khapre',
    'Krishna Karande', 'Shantanu Rajeshirke', 'Saurabh Rajeshirke', 'Swayam Rajeshirke',
    'Nilu Sonar', 'Prasad Natekar', 'Ganesh Waikar', 'Pratik Marathe',
    'Aryan Shinde', 'Nitin Utekar', 'Soham Dongre', 'Shivansh Patil',
    'Sachin Vichare', 'Manmohan Konde', 'Gopal Koyande', 'Vinayak Utekar',
'Ashish Chavan', 'Shubham Achrekar', 'Amey Bhatkar', 'Akshay Shimpi',
    'Shyam More', 'Nikhil Shendge',
'Shivam Sonawane', 'Pranav Kadam', 'Krishna Yadav', 'Abhijeet Kadam',
'Aryan Kadam', 'Atharva Kokane', 'Sarthak Kedari', 'Ruturaj Shigvan',
'Sopan Nerpagar', 'Vinod Rane'
  ];

  function buildDefaultPlayers() {
    return DEFAULT_PLAYERS.map((name, i) => ({
      id: 'p-' + (i + 1),
      name: name,
      status: 'UNAUCTIONED',
      teamId: null,
      finalPrice: 0
    }));
  }

  // --- INITIALIZATION ---
  init();

  function init() {
    loadStateFromStorage();

    if (state.teams.length === 0) {
      state.teams = DEFAULT_TEAMS.map(t => ({ ...t }));
    }

    // Load the official players list on first run / if no players saved
    if (state.players.length === 0) {
      state.players = buildDefaultPlayers();
    }

    // Normalize / migrate safety
    state.teams.forEach(t => { t.budget = 500; });
    if (!state.round) state.round = 1;
    if (!Array.isArray(state.roundQueue)) state.roundQueue = [];
    if (!Array.isArray(state.pendingQueue)) state.pendingQueue = [];
    if (typeof state.auctionComplete !== 'boolean') state.auctionComplete = false;

    setupEventListeners();
    renderAll();
  }

  // --- LOCAL STORAGE PERSISTENCE ---
  function saveStateToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  function loadStateFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state:', e);
      }
    }
  }

  // --- HELPERS ---
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function fmtRupees(n) {
    return '₹' + (n || 0).toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '<')
      .replace(/>/g, '>').replace(/"/g, '"');
  }

  function getActivePlayer() {
    return state.players.find(p => p.id === state.activePlayerId);
  }

  function getTeamSpent(teamId) {
    return state.players
      .filter(p => p.teamId === teamId && p.status === 'SOLD')
      .reduce((sum, p) => sum + (p.finalPrice || 0), 0);
  }

  function getTeamRemaining(teamId) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return 0;
    return team.budget - getTeamSpent(teamId);
  }

  function getLogoPath(team) {
    if (!team.logo) return '';
    const logo = String(team.logo).trim();
    if (!logo) return '';
    if (logo.startsWith('data:') || logo.startsWith('http') ||
        logo.includes('/') || logo.includes('\\')) {
      return logo;
    }
    return './' + logo;
  }

  // Global fallback for missing logo images (uses owner initial)
  window.__logoFallback = function (img) {
    img.onerror = null;
    const initial = (img.alt || 'T').charAt(0).toUpperCase();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
      '<rect width="100" height="100" rx="50" fill="#1e293b"/>' +
      '<circle cx="50" cy="50" r="34" fill="none" stroke="#00f2fe" stroke-width="3"/>' +
      '<text x="50" y="59" font-size="34" text-anchor="middle" fill="#00f2fe" ' +
      'font-family="Arial" font-weight="bold">' + initial + '</text></svg>';
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };

  function logoHtml(team, imgClass) {
    const path = getLogoPath(team);
    const alt = escapeHtml(team.name || 'Team');
    if (path) {
      return '<img class="' + imgClass + '" src="' + escapeHtml(path) + '" alt="' + alt + '" onerror="window.__logoFallback(this)">';
    }
    return '<div class="' + imgClass + ' logo-fallback"><i class="fa-solid fa-volleyball"></i></div>';
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    // Sample data (testing only)
    document.getElementById('btn-quick-demo').addEventListener('click', loadDemoData);

    // Reset all
    document.getElementById('btn-reset-all').addEventListener('click', resetAll);

    // Draw random player
    document.getElementById('btn-draw-player').addEventListener('click', drawRandomPlayer);

    // Press Enter on amount input to mark sold quickly
    document.getElementById('input-sold-amount').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        markPlayerSold();
      }
    });

    // Mark sold / unsold
    document.getElementById('btn-mark-sold').addEventListener('click', markPlayerSold);
    document.getElementById('btn-mark-unsold').addEventListener('click', markPlayerUnsold);

    // Add single player
    document.getElementById('form-add-player').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('player-name').value.trim();
      if (!name) return;

      state.players.push({
        id: 'p-' + Date.now(),
        name: name,
        status: 'UNAUCTIONED',
        teamId: null,
        finalPrice: 0
      });

      document.getElementById('form-add-player').reset();
      saveStateToStorage();
      renderAll();
    });

    // Bulk append players
    document.getElementById('btn-bulk-import').addEventListener('click', () => {
      const text = document.getElementById('bulk-player-names').value.trim();
      if (!text) return;

      const names = text.split('\n').map(s => s.trim()).filter(Boolean);
      names.forEach((name, i) => {
        state.players.push({
          id: 'p-' + Date.now() + '-' + i,
          name: name,
          status: 'UNAUCTIONED',
          teamId: null,
          finalPrice: 0
        });
      });

      document.getElementById('bulk-player-names').value = '';
      saveStateToStorage();
      renderAll();
    });

    // Bulk overwrite (replaces entire player list)
    document.getElementById('btn-bulk-overwrite').addEventListener('click', () => {
      const text = document.getElementById('bulk-player-names').value.trim();
      if (!text) return;
      if (!confirm('This will REPLACE the entire player list and reset the auction. Continue?')) return;

      const names = text.split('\n').map(s => s.trim()).filter(Boolean);
      state.players = names.map((name, i) => ({
        id: 'p-' + Date.now() + '-' + i,
        name: name,
        status: 'UNAUCTIONED',
        teamId: null,
        finalPrice: 0
      }));

      state.activePlayerId = null;
      state.winningTeamId = '';
      state.round = 1;
      state.roundQueue = [];
      state.roundTotal = 0;
      state.pendingQueue = [];
      state.auctionComplete = false;

      document.getElementById('bulk-player-names').value = '';
      saveStateToStorage();
      renderAll();
    });

    // Player table filter
    document.getElementById('filter-player-status').addEventListener('change', renderPlayersTable);

    // Teams configure modal
    document.getElementById('btn-open-teams-modal').addEventListener('click', openTeamsModal);
    document.getElementById('btn-save-teams-config').addEventListener('click', saveTeamsConfig);
    document.querySelectorAll('.close-modal').forEach(b => {
      b.addEventListener('click', closeModal);
    });
    document.getElementById('modal-config-teams').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-config-teams')) closeModal();
    });

    // PDF export
    document.getElementById('btn-download-pdf').addEventListener('click', generatePDF);
    document.getElementById('btn-print-page').addEventListener('click', () => window.print());
  }

  // --- DEMO DATA ---
  function loadDemoData() {
    if (!confirm('Load sample teams & players for testing? This will replace current data.')) return;

    state.teams = DEMO_TEAMS.map(t => ({ ...t }));
    state.players = buildDefaultPlayers();
    state.activePlayerId = null;
    state.winningTeamId = '';
    state.round = 1;
    state.roundQueue = [];
    state.roundTotal = 0;
    state.pendingQueue = [];
    state.auctionComplete = false;

    saveStateToStorage();
    renderAll();
    alert('Default player list & teams loaded!');
  }

  // --- RESET ---
  function resetAll() {
    if (!confirm('Clear all auction data? This cannot be undone.')) return;

    state.teams = DEFAULT_TEAMS.map(t => ({ ...t }));
    state.players = buildDefaultPlayers();
    state.activePlayerId = null;
    state.winningTeamId = '';
    state.round = 1;
    state.roundQueue = [];
    state.roundTotal = 0;
    state.pendingQueue = [];
    state.auctionComplete = false;

    saveStateToStorage();
    renderAll();
  }

  // --- TAB SWITCHING ---
  function switchTab(tabId) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector('.nav-btn[data-tab="' + tabId + '"]');
    const content = document.getElementById(tabId);

    if (btn && content) {
      btn.classList.add('active');
      content.classList.add('active');

      if (tabId === 'tab-pdf') renderPDFView();
    }
  }

  // --- RENDER ALL ---
  function renderAll() {
    renderStats();
    renderPhaseBanner();
    renderSpotlight();
    renderUnsoldChips();
    renderRosters();
    renderPlayersTable();
    renderPDFView();
  }

  // --- STATS BAR ---
  function renderStats() {
    const total = state.players.length;
    const sold = state.players.filter(p => p.status === 'SOLD').length;
    const remaining = state.players.filter(p => p.status === 'UNAUCTIONED').length;
    const unsold = state.players.filter(p => p.status === 'UNSOLD').length;
    const spent = state.players.filter(p => p.status === 'SOLD').reduce((s, p) => s + (p.finalPrice || 0), 0);

    document.getElementById('stat-total-players').textContent = total;
    document.getElementById('stat-sold-players').textContent = sold;
    document.getElementById('stat-remaining-players').textContent = remaining;
    document.getElementById('stat-unsold-players').textContent = unsold;
    document.getElementById('stat-total-spent').textContent = fmtRupees(spent);
    document.getElementById('nav-player-count').textContent = total;
  }

  // --- ROUND PHASE BANNER ---
  function renderPhaseBanner() {
    const badge = document.getElementById('phase-badge');
    const progress = document.getElementById('phase-progress');
    const total = state.players.length;
    const unauctioned = state.players.filter(p => p.status === 'UNAUCTIONED').length;
    const unsold = state.players.filter(p => p.status === 'UNSOLD').length;
    const processed = total - unauctioned;

    if (state.auctionComplete) {
      badge.classList.remove('round-2');
      badge.innerHTML = '<i class="fa-solid fa-trophy"></i> AUCTION COMPLETE';
      progress.textContent = 'All players processed!';
      return;
    }

    if (state.round > 1) {
      badge.classList.add('round-2');
      badge.innerHTML = '<i class="fa-solid fa-rotate-left"></i> ROUND ' + state.round + ': UNSOLD PLAYERS SECOND CHANCE';
      const done = (state.roundTotal || 0) - state.roundQueue.length;
      progress.textContent = 'Round ' + state.round + ': ' + done + ' / ' + (state.roundTotal || 0) + ' Unsold Players Auctioned';
      return;
    }

    // Round 1
    badge.classList.remove('round-2');
    if (unauctioned === 0 && unsold > 0) {
      badge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> ROUND 1 COMPLETE';
      progress.textContent = 'Round 2 starts automatically on next draw (' + unsold + ' unsold player' + (unsold > 1 ? 's' : '') + ')';
    } else {
      badge.innerHTML = '<i class="fa-solid fa-layer-group"></i> ROUND 1: MAIN DRAW';
      progress.textContent = processed + ' / ' + total + ' Players Auctioned';
    }
  }

// --- RANDOM PLAYER DRAW ---
  function drawRandomPlayer() {
    if (state.activePlayerId) {
      alert('Please mark the current player as SOLD or UNSOLD first!');
      return;
    }

    // Round 1: transition to round 2 when pool empty & unsold players remain
    if (state.round === 1) {
      const unauctioned = state.players.filter(p => p.status === 'UNAUCTIONED');
      if (unauctioned.length === 0) {
        const unsold = state.players.filter(p => p.status === 'UNSOLD');
        if (unsold.length === 0) {
          state.auctionComplete = true;
          saveStateToStorage();
          renderAll();
          alert('🎉 Auction complete! All players have been processed.');
          return;
        }
        if (state.round >= MAX_ROUNDS) {
          state.auctionComplete = true;
          saveStateToStorage();
          renderAll();
          alert('🏁 All ' + MAX_ROUNDS + ' rounds complete! ' + unsold.length + ' player(s) remain unsold.');
          return;
        }
        state.round = 2;
        state.roundTotal = unsold.length;
        state.roundQueue = shuffleArray(unsold.map(p => p.id));
        state.pendingQueue = [];
        saveStateToStorage();
      }
    } else {
      // Repeat rounds (2, 3, 4)
      if (state.roundQueue.length === 0) {
        // This round's queue is exhausted. If players were marked UNSOLD this round,
        // carry them into the next round (if more rounds remain).
        if (state.pendingQueue.length > 0) {
          if (state.round + 1 > MAX_ROUNDS) {
            state.auctionComplete = true;
            saveStateToStorage();
            renderAll();
            alert('🏁 All ' + MAX_ROUNDS + ' rounds complete! ' + state.pendingQueue.length + ' player(s) remain unsold.');
            return;
          }
          state.round += 1;
          state.roundTotal = state.pendingQueue.length;
          state.roundQueue = shuffleArray(state.pendingQueue.slice());
          state.pendingQueue = [];
          saveStateToStorage();
        } else {
          state.auctionComplete = true;
          saveStateToStorage();
          renderAll();
          alert('🏁 Round ' + state.round + ' complete! Auction finished.');
          return;
        }
      }
    }

    // Pick the final player
    let selected = null;
    if (state.round > 1) {
      const idx = Math.floor(Math.random() * state.roundQueue.length);
      const pid = state.roundQueue.splice(idx, 1)[0];
      selected = state.players.find(p => p.id === pid);
    } else {
      const pool = state.players.filter(p => p.status === 'UNAUCTIONED');
      selected = pool[Math.floor(Math.random() * pool.length)];
    }

    if (!selected) return;

    // Slot-machine shuffle animation
    const display = document.getElementById('shuffle-display');
    const drawBtn = document.getElementById('btn-draw-player');
    drawBtn.disabled = true;

    const tempPool = state.round > 1
      ? state.players.filter(p => p.status === 'UNSOLD')
      : state.players.filter(p => p.status === 'UNAUCTIONED');

    let iter = 0;
    const interval = setInterval(() => {
      const temp = tempPool.length ? tempPool[Math.floor(Math.random() * tempPool.length)] : selected;
      display.innerHTML = '<div class="slot-text spinning">' + escapeHtml(temp.name) + '</div>' +
        '<p class="slot-sub">Randomizing player…</p>';
      iter++;
      if (iter >= 16) {
        clearInterval(interval);
        display.innerHTML = '<div class="slot-text" style="color: var(--accent-gold);">' + escapeHtml(selected.name) + '</div>' +
          '<p class="slot-sub">Now conducting physical bidding!</p>';
        drawBtn.disabled = false;
        setActivePlayer(selected);
      }
    }, 80);
  }

  function setActivePlayer(player) {
    state.activePlayerId = player.id;
    state.winningTeamId = '';
    document.getElementById('input-sold-amount').value = '';
    saveStateToStorage();
    renderAll();
  }

  // --- SPOTLIGHT RENDERER ---
  function renderSpotlight() {
    const player = getActivePlayer();
    const emptyState = document.getElementById('stage-empty-state');
    const activeState = document.getElementById('stage-active-player');
    const statusTag = document.getElementById('auction-status-tag');
    const display = document.getElementById('shuffle-display');

    if (!player) {
      emptyState.classList.remove('hidden');
      activeState.classList.add('hidden');
      statusTag.innerHTML = '<i class="fa-solid fa-circle-dot"></i> WAITING FOR DRAW';
      statusTag.style.color = 'var(--text-muted)';
      display.innerHTML = '<div class="slot-text">READY TO DRAW</div>' +
        '<p class="slot-sub">Click below to randomly pick the next player</p>';
      document.getElementById('owner-selector-grid').innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');
    activeState.classList.remove('hidden');
    statusTag.innerHTML = '<i class="fa-solid fa-circle-play"></i> LIVE BIDDING IN PROGRESS';
    statusTag.style.color = 'var(--accent-green)';

    document.getElementById('spotlight-name').textContent = player.name;
    renderOwnerGrid();
  }

  // --- OWNER SELECTOR GRID (click-to-select cards) ---
  function renderOwnerGrid() {
    const grid = document.getElementById('owner-selector-grid');
    grid.innerHTML = '';

    if (state.teams.length === 0) {
      grid.innerHTML = '<p class="empty-text">No team owners configured yet. Use the "Configure Owners & Logos" button.</p>';
      return;
    }

    state.teams.forEach(team => {
      const remaining = getTeamRemaining(team.id);
      const canBid = remaining > 0;
      const card = document.createElement('div');
      card.className = 'owner-select-card' +
        (team.id === state.winningTeamId ? ' selected' : '') +
        (canBid ? '' : ' disabled');
      card.dataset.teamId = team.id;

      const purseClass = remaining <= 100 ? 'low' : '';

      card.innerHTML =
        logoHtml(team, 'owner-logo-img') +
        '<div class="owner-info-text">' +
          '<strong>' + escapeHtml(team.owner) + '</strong>' +
          '<span style="font-size:11px;color:var(--text-muted);display:block;">' + escapeHtml(team.name) + '</span>' +
          '<div class="purse-left ' + purseClass + '">Purse Left: ' + fmtRupees(remaining) + '</div>' +
        '</div>';

      card.addEventListener('click', () => {
        if (!canBid) {
          alert(team.owner + ' (' + team.name + ') has no purse left (₹0 remaining).');
          return;
        }
        state.winningTeamId = team.id;
        renderOwnerGrid();
      });

      grid.appendChild(card);
    });
  }

  // --- MARK AS SOLD (with strict ₹500 purse validation) ---
  function markPlayerSold() {
    const player = getActivePlayer();
    if (!player) {
      alert('No active player on the stage! Draw a player first.');
      return;
    }

    const teamId = state.winningTeamId;
    if (!teamId) {
      alert('Please select the winning Team Owner first!');
      return;
    }

    const price = parseInt(document.getElementById('input-sold-amount').value, 10);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid final sold price in Rupees (₹).');
      return;
    }

    const team = state.teams.find(t => t.id === teamId);
    const remaining = getTeamRemaining(teamId);

    // STRICT validation: owner cannot exceed their ₹500 wallet
    if (price > remaining) {
      alert('⚠️ ' + team.owner + ' (' + team.name + ') only has ' + fmtRupees(remaining) +
            ' left in the purse.\n' + player.name + ' cannot be bought for ' + fmtRupees(price) + '.');
      return;
    }

    // Assign player
    player.status = 'SOLD';
    player.teamId = teamId;
    player.finalPrice = price;

    // Confetti celebration
    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
    }

    const newRemaining = remaining - price;
    const ownerName = team.owner;

    state.activePlayerId = null;
    state.winningTeamId = '';
    document.getElementById('input-sold-amount').value = '';

    saveStateToStorage();
    renderAll();

    alert('🎉 ' + player.name + ' SOLD to ' + ownerName + ' (' + team.name + ') for ' +
          fmtRupees(price) + '!\nRemaining purse of ' + ownerName + ': ' + fmtRupees(newRemaining));
  }

  // --- MARK AS UNSOLD (goes into Round 2 pool) ---
  function markPlayerUnsold() {
    const player = getActivePlayer();
    if (!player) {
      alert('No active player on the stage! Draw a player first.');
      return;
    }

    const nextRound = state.round + 1;
    const roundLabel = nextRound > MAX_ROUNDS ? 'the final round' : 'Round ' + nextRound;
    if (!confirm('Mark "' + player.name + '" as UNSOLD?\nThey will be re-auctioned randomly in ' + roundLabel + '.')) {
      return;
    }

    player.status = 'UNSOLD';
    player.teamId = null;
    player.finalPrice = 0;

    // Queue this player for the next round (if a next round exists).
    if (state.round < MAX_ROUNDS && state.pendingQueue.indexOf(player.id) === -1) {
      state.pendingQueue.push(player.id);
    }

    state.activePlayerId = null;
    state.winningTeamId = '';
    document.getElementById('input-sold-amount').value = '';

    saveStateToStorage();
    renderAll();
  }

  // --- UNSOLD CHIPS (display only, Round 2 auto-draws them) ---
  function renderUnsoldChips() {
    const container = document.getElementById('unsold-chip-list');
    const countSpan = document.getElementById('unsold-count');

    const unsold = state.players.filter(p => p.status === 'UNSOLD');
    countSpan.textContent = unsold.length;

    if (unsold.length === 0) {
      container.innerHTML = '<span class="empty-text">No unsold players yet</span>';
      return;
    }

    container.innerHTML = '';
    unsold.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'chip';
chip.innerHTML = '<i class="fa-solid fa-undo"></i> ' + escapeHtml(p.name);
      chip.title = 'Will be re-auctioned in the next round';
      container.appendChild(chip);
    });
  }

  // --- 5 TEAM ROSTERS GRID ---
  function renderRosters() {
    const grid = document.getElementById('teams-roster-grid');

    if (state.teams.length === 0) {
      grid.innerHTML = '<div class="glass-panel" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">' +
        '<i class="fa-solid fa-shield-halved" style="font-size:40px;margin-bottom:12px;"></i>' +
        '<h3>No Teams Configured</h3><p>Use "Configure Owners & Logos" to set up the 5 team owners.</p></div>';
      return;
    }

    grid.innerHTML = '';

    state.teams.forEach(team => {
      const teamPlayers = state.players.filter(p => p.teamId === team.id && p.status === 'SOLD');
      const spent = teamPlayers.reduce((s, p) => s + (p.finalPrice || 0), 0);
      const remaining = team.budget - spent;

      let playersHtml = '';
      if (teamPlayers.length === 0) {
        playersHtml = '<div class="no-players-msg">No players acquired yet</div>';
      } else {
        playersHtml = teamPlayers.map(p => {
          return '<div class="roster-player-item">' +
            '<div class="player-item-details">' +
              '<span class="player-item-name">' + escapeHtml(p.name) + '</span>' +
            '</div>' +
            '<span class="player-item-price">' + fmtRupees(p.finalPrice || 0) + '</span>' +
          '</div>';
        }).join('');
      }

      const card = document.createElement('div');
      card.className = 'team-card';

      card.innerHTML =
        '<div class="team-card-header">' +
          '<div class="team-brand-header">' +
            logoHtml(team, 'team-logo-large') +
            '<div class="team-brand-info">' +
              '<h3>' + escapeHtml(team.name) + '</h3>' +
              '<div class="owner-name-tag">Owner: <strong>' + escapeHtml(team.owner) + '</strong></div>' +
            '</div>' +
          '</div>' +
          '<div class="team-purse-block">' +
            '<div class="purse-val ' + (remaining <= 100 ? 'low' : '') + '">' + fmtRupees(remaining) + '</div>' +
            '<div class="purse-sub">Spent ' + fmtRupees(spent) + ' • ' + teamPlayers.length + ' Player' + (teamPlayers.length === 1 ? '' : 's') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="team-roster-list">' + playersHtml + '</div>';

      grid.appendChild(card);
    });
  }

  // --- PLAYERS TABLE ---
  function renderPlayersTable() {
    const tbody = document.getElementById('players-table-body');
    const filter = document.getElementById('filter-player-status').value;

    let players = state.players;
    if (filter !== 'ALL') {
      players = players.filter(p => p.status === filter);
    }

    document.getElementById('players-table-count').textContent = state.players.length;

    if (players.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:30px;">' +
        'No players match the current criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    players.forEach((p, index) => {
      const team = state.teams.find(t => t.id === p.teamId);
      let statusBadge = '<span class="badge badge-warning">UNAUCTIONED</span>';
      if (p.status === 'SOLD') statusBadge = '<span class="badge badge-success">SOLD</span>';
      if (p.status === 'UNSOLD') statusBadge = '<span class="badge badge-danger">UNSOLD</span>';

      const row = document.createElement('tr');
      row.innerHTML =
        '<td>' + (index + 1) + '</td>' +
        '<td><strong>' + escapeHtml(p.name) + '</strong></td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + (team ? escapeHtml(team.name) + ' (' + escapeHtml(team.owner) + ')' : '-') + '</td>' +
        '<td>' + (p.status === 'SOLD' ? '<strong>' + fmtRupees(p.finalPrice || 0) + '</strong>' : '-') + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline-danger btn-delete-player" data-id="' + p.id + '" title="Delete Player">' +
            '<i class="fa-solid fa-trash"></i>' +
          '</button>' +
        '</td>';

      tbody.appendChild(row);
    });

    // Delete player handlers
    document.querySelectorAll('.btn-delete-player').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const p = state.players.find(x => x.id === id);
        if (p && confirm('Delete "' + p.name + '" from the player pool?')) {
          state.players = state.players.filter(x => x.id !== id);
          if (state.activePlayerId === id) state.activePlayerId = null;
          saveStateToStorage();
          renderAll();
        }
      });
    });
  }

  // --- TEAMS CONFIG MODAL ---
  function openTeamsModal() {
    const container = document.getElementById('modal-teams-inputs-container');
    container.innerHTML = '';

    state.teams.forEach((team, i) => {
      const row = document.createElement('div');
      row.className = 'team-config-row';
      row.innerHTML =
        '<input class="cfg-team-name" placeholder="Team ' + (i + 1) + ' name" value="' + escapeHtml(team.name) + '">' +
        '<input class="cfg-owner-name" placeholder="Owner ' + (i + 1) + ' name" value="' + escapeHtml(team.owner) + '">' +
        '<input class="cfg-logo" placeholder="logo.png" value="' + escapeHtml(team.logo || '') + '">';
      container.appendChild(row);
    });

    document.getElementById('modal-config-teams').classList.add('active');
  }

  function saveTeamsConfig() {
    const rows = document.querySelectorAll('.team-config-row');
    rows.forEach((row, i) => {
      const team = state.teams[i];
      if (!team) return;
      team.name = row.querySelector('.cfg-team-name').value.trim() || team.name;
      team.owner = row.querySelector('.cfg-owner-name').value.trim() || team.owner;
      team.logo = row.querySelector('.cfg-logo').value.trim();
      team.budget = 500;
    });

    saveStateToStorage();
    renderAll();
    closeModal();
  }

  function closeModal() {
    document.getElementById('modal-config-teams').classList.remove('active');
  }

  // --- PDF REPORT VIEW ---
  function renderPDFView() {
    document.getElementById('pdf-report-date').textContent = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const totalSold = state.players.filter(p => p.status === 'SOLD').length;
    const totalUnsold = state.players.filter(p => p.status === 'UNSOLD').length;
    const totalSpent = state.players.filter(p => p.status === 'SOLD').reduce((s, p) => s + (p.finalPrice || 0), 0);

    document.getElementById('pdf-stat-teams').textContent = state.teams.length;
    document.getElementById('pdf-stat-total').textContent = state.players.length;
    document.getElementById('pdf-stat-sold').textContent = totalSold;
    document.getElementById('pdf-stat-unsold').textContent = totalUnsold;
    document.getElementById('pdf-stat-spent').textContent = fmtRupees(totalSpent);

    // Teams content
    const teamsContainer = document.getElementById('pdf-teams-content');
    if (state.teams.length === 0) {
      teamsContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;">No registered teams found.</div>';
      return;
    }

    teamsContainer.innerHTML = '';

    state.teams.forEach(team => {
      const teamPlayers = state.players.filter(p => p.teamId === team.id && p.status === 'SOLD');
      const spent = teamPlayers.reduce((s, p) => s + (p.finalPrice || 0), 0);
      const remaining = team.budget - spent;

      const block = document.createElement('div');
      block.className = 'pdf-team-block';

      let tableRows = '';
      if (teamPlayers.length === 0) {
        tableRows = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No players purchased</td></tr>';
      } else {
        tableRows = teamPlayers.map((p, idx) => {
          return '<tr>' +
            '<td style="width:40px;">' + (idx + 1) + '</td>' +
            '<td><strong>' + escapeHtml(p.name) + '</strong></td>' +
            '<td style="text-align:right;font-weight:700;color:#0284c7;">' + fmtRupees(p.finalPrice || 0) + '</td>' +
          '</tr>';
        }).join('');
      }

      block.innerHTML =
        '<div class="pdf-team-header">' +
          '<div>' +
            '<div class="pdf-team-title">' + escapeHtml(team.name) + '</div>' +
            '<div class="pdf-team-owner">Team Owner: <strong>' + escapeHtml(team.owner) + '</strong></div>' +
          '</div>' +
          '<div style="text-align:right;font-size:12px;">' +
            '<div>Players Acquired: <strong>' + teamPlayers.length + '</strong></div>' +
            '<div>Total Spent: <strong>' + fmtRupees(spent) + '</strong> (Remaining: ' + fmtRupees(remaining) + ')</div>' +
          '</div>' +
        '</div>' +
        '<table class="pdf-table">' +
          '<thead><tr><th>#</th><th>Player Name</th><th style="text-align:right;">Winning Bid</th></tr></thead>' +
          '<tbody>' + tableRows + '</tbody>' +
        '</table>';

      teamsContainer.appendChild(block);
    });

    // Unsold / remaining players appendix
    const unsoldContainer = document.getElementById('pdf-unsold-content');
    const unsoldPlayers = state.players.filter(p => p.status === 'UNSOLD' || p.status === 'UNAUCTIONED');

    if (unsoldPlayers.length > 0) {
      const rows = unsoldPlayers.map((p, idx) => {
        return '<tr>' +
          '<td>' + (idx + 1) + '</td>' +
          '<td>' + escapeHtml(p.name) + '</td>' +
          '<td>' + p.status + '</td>' +
        '</tr>';
      }).join('');

      unsoldContainer.innerHTML =
        '<h3 style="font-family:Outfit,sans-serif;font-size:16px;margin:30px 0 12px;color:#0f172a;">UNSOLD / REMAINING PLAYERS (' + unsoldPlayers.length + ')</h3>' +
        '<table class="pdf-table">' +
          '<thead><tr><th>#</th><th>Player Name</th><th>Status</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>';
    } else {
      unsoldContainer.innerHTML = '';
    }
  }

  // --- PDF GENERATION ---
  function generatePDF() {
    const element = document.getElementById('pdf-report-document');
    if (!element) return;

    const opt = {
      margin: [0.4, 0.4, 0.4, 0.4],
      filename: 'Volleyball_Auction_Summary_' + new Date().toISOString().slice(0, 10) + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
      html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  }

});