
(() => {
  'use strict';

  
  const ARTIST = 'Taylor Swift';

  const SONGS = [
    { id: 'anti-hero',         title: 'Anti-Hero',         album: 'Midnights', year: 2022, duration: 309, file: 'songs/anti-hero_mp3.mp3',         c1: '#1b2748', c2: '#8aa0d6', ink: '#ffffff' },
    { id: 'blank-space',       title: 'Blank Space',       album: '1989',      year: 2014, duration: 272, file: 'songs/blank-space_mp3.mp3',       c1: '#7fb0d4', c2: '#f3e8da', ink: '#16324a' },
    { id: 'cardigan',          title: 'cardigan',          album: 'folklore',  year: 2020, duration: 241, file: 'songs/cardigan_mp3.mp3',          c1: '#3f3f3f', c2: '#c9c1b4', ink: '#ffffff' },
    { id: 'cruel-summer',      title: 'Cruel Summer',      album: 'Lover',     year: 2019, duration: 179, file: 'songs/cruel-summer_mp3.mp3',      c1: '#ff8fc7', c2: '#8fd5ff', ink: '#3a1034' },
    { id: 'karma',             title: 'Karma',             album: 'Midnights', year: 2022, duration: 209, file: 'songs/karma_mp3.mp3',             c1: '#3a2870', c2: '#e58ad0', ink: '#ffffff' },
    { id: 'lavender-haze',     title: 'Lavender Haze',     album: 'Midnights', year: 2022, duration: 210, file: 'songs/lavender-haze_mp3.mp3',     c1: '#6f52c2', c2: '#dccbff', ink: '#1e1240' },
    { id: 'love-story',        title: 'Love Story',        album: 'Fearless',  year: 2008, duration: 237, file: 'songs/love-story_mp3.mp3',        c1: '#c1902a', c2: '#f6df9e', ink: '#3b2606' },
    { id: 'shake-it-off',      title: 'Shake It Off',      album: '1989',      year: 2014, duration: 242, file: 'songs/shake-it-off_mp3.mp3',      c1: '#5f98bf', c2: '#f7f1e8', ink: '#16324a' },
    { id: 'willow',            title: 'willow',            album: 'evermore',  year: 2020, duration: 253, file: 'songs/willow_mp3.mp3',            c1: '#5e3f22', c2: '#dba75b', ink: '#ffffff' },
    { id: 'you-belong-with-me', title: 'You Belong With Me', album: 'Fearless', year: 2008, duration: 229, file: 'songs/you-belong-with-me_mp3.mp3', c1: '#e6bc5c', c2: '#7a4e2a', ink: '#2e1a08' }
  ];

  const TOP_HITS = ['anti-hero', 'cruel-summer', 'shake-it-off', 'blank-space', 'love-story'];
  const ALBUMS = [...new Set(SONGS.map(s => s.album))];
  const byId = Object.fromEntries(SONGS.map(s => [s.id, s]));

  /* ---------- 2. HELPERS ---------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('swiftify.' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('swiftify.' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }
  };

  const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmt = t => {
    if (!isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const icon = (name, fill = false) => `<svg class="icon${fill ? ' icon--fill' : ''}"><use href="#i-${name}"/></svg>`;

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------- State ---------- */
  const audio = $('#audio');
  const seek = $('#seek');
  const volume = $('#volume');

  const state = {
    view: 'home',
    playlistId: 'essentials',
    query: '',
    currentId: null,
    baseQueue: [],      // the list the user started from, in order
    queue: [],          // what actually plays (shuffled when shuffle is on)
    index: -1,
    shuffle: false,
    repeat: 'off',      // 'off' | 'all' | 'one'
    hasPlayed: false,
    dragging: false,
    showRemaining: true,
    liked: new Set(store.get('liked', [])),
    recent: store.get('recent', []).filter(id => byId[id])
  };

  /* ---------- 3. RENDERING ---------- */
  function cover(song, size = 'md') {
    const title = size === 'sm' || size === 'xs' ? '' : `<span class="cover__title">${esc(song.title)}</span>`;
    return `<span class="cover cover--${size}" style="--c1:${song.c1};--c2:${song.c2};--ink:${song.ink}">${title}</span>`;
  }

  function playlistInfo(id) {
    if (id === 'liked') {
      return { id, title: 'Liked Songs', songs: SONGS.filter(s => state.liked.has(s.id)), c1: '#5b3fd0', c2: '#c9b6ff', ink: '#ffffff' };
    }
    if (id.startsWith('album:')) {
      const album = id.slice(6);
      const songs = SONGS.filter(s => s.album === album);
      return { id, title: album, songs, c1: songs[0].c1, c2: songs[0].c2, ink: songs[0].ink, year: songs[0].year };
    }
    return { id: 'essentials', title: 'Taylor Swift Essentials', songs: SONGS, c1: '#6a4bb5', c2: '#e39bc6', ink: '#ffffff' };
  }

  function playlistCover(p, size = 'md') {
    return `<span class="cover cover--${size}" style="--c1:${p.c1};--c2:${p.c2};--ink:${p.ink}"><span class="cover__title">${esc(p.title)}</span></span>`;
  }

  function songCard(song) {
    return `
      <button type="button" class="card" data-song="${song.id}" data-play="${song.id}" aria-label="Play ${esc(song.title)}">
        <span class="card__art">${cover(song)}<span class="card__play"><svg class="icon icon--fill pp"><use href="#i-play"/></svg></span></span>
        <span class="card__title">${esc(song.title)}</span>
        <span class="card__sub">${esc(song.album)}</span>
      </button>`;
  }

  function playlistCard(p) {
    return `
      <button type="button" class="card" data-open-playlist="${p.id}" aria-label="Open ${esc(p.title)}">
        <span class="card__art">${playlistCover(p)}</span>
        <span class="card__title">${esc(p.title)}</span>
        <span class="card__sub">${plural(p.songs.length, 'song')}</span>
      </button>`;
  }

  function songRow(song, i) {
    const liked = state.liked.has(song.id);
    return `
      <li class="row" data-song="${song.id}">
        <button type="button" class="row__main" data-play="${song.id}" aria-label="Play ${esc(song.title)}">
          <span class="row__idx">
            <span class="num">${i + 1}</span>
            <svg class="icon icon--fill hov pp"><use href="#i-play"/></svg>
            <span class="eq"><i></i><i></i><i></i></span>
          </span>
          ${cover(song, 'sm')}
          <span class="row__title"><b>${esc(song.title)}</b><small>${ARTIST}</small></span>
          <span class="row__album">${esc(song.album)}</span>
        </button>
        <button type="button" class="icon-btn like" data-like="${song.id}" aria-pressed="${liked}" aria-label="${liked ? 'Remove from' : 'Add to'} Liked Songs">${icon('heart')}</button>
        <span class="row__time">${fmt(song.duration)}</span>
      </li>`;
  }

  const rows = songs => songs.map(songRow).join('');

  function renderHome() {
    const h = new Date().getHours();
    $('#greeting').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

    ['anti-hero', 'cruel-summer', 'love-story'].forEach((id, n) => {
      $('#stack-' + (n + 1)).innerHTML = cover(byId[id]);
    });

    const recent = state.recent.map(id => byId[id]);
    $('#recent-grid').innerHTML = recent.length
      ? recent.map(songCard).join('')
      : '<p class="empty">Songs you play will show up here.</p>';

    $('#top-grid').innerHTML = TOP_HITS.map(id => songCard(byId[id])).join('');
    $('#album-grid').innerHTML = ALBUMS.map(a => playlistCard(playlistInfo('album:' + a))).join('');
    $('#all-tracks').innerHTML = rows(SONGS);
  }

  function searchResults(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    return SONGS.filter(s => `${s.title} ${s.album} ${s.year} ${ARTIST}`.toLowerCase().includes(q));
  }

  function renderSearch() {
    const body = $('#search-body');
    const q = state.query.trim();
    if (!q) {
      body.innerHTML = `
        <section class="section" style="margin-top:0">
          <h2>Browse all</h2>
          <div class="grid">
            ${ALBUMS.map(a => {
              const p = playlistInfo('album:' + a);
              return `<button type="button" class="tile" data-open-playlist="${p.id}" style="--c1:${p.c1};--c2:${p.c2};--ink:${p.ink}"><b>${esc(a)}</b><span>${plural(p.songs.length, 'song')}</span></button>`;
            }).join('')}
          </div>
        </section>`;
      return;
    }
    const results = searchResults(q);
    body.innerHTML = results.length
      ? `<ol class="tracks" data-context="search">${rows(results)}</ol>`
      : `<p class="empty">No songs match “${esc(q)}”. Try a song title or an album like Midnights.</p>`;
  }

  function renderLibrary() {
    const lists = ['essentials', 'liked', ...ALBUMS.map(a => 'album:' + a)].map(playlistInfo);
    $('#library-playlists').innerHTML = lists.map(playlistCard).join('');
    const liked = SONGS.filter(s => state.liked.has(s.id));
    $('#library-liked').innerHTML = liked.length
      ? `<ol class="tracks">${rows(liked)}</ol>`
      : '<p class="empty">Tap the heart on any song to save it here.</p>';
  }

  function renderPlaylist() {
    const p = playlistInfo(state.playlistId);
    const mins = Math.round(p.songs.reduce((sum, s) => sum + s.duration, 0) / 60);
    const meta = p.songs.length
      ? `${ARTIST}, ${plural(p.songs.length, 'song')}, ${mins} min`
      : `${ARTIST}, no songs yet`;
    $('#playlist-body').innerHTML = `
      <div class="pl-head">
        ${playlistCover(p, 'xl')}
        <div>
          <h1>${esc(p.title)}</h1>
          <p>${meta}</p>
          <div class="pl-actions">
            <button type="button" class="btn btn--primary" data-action="play-context" data-ctx="${p.id}">${icon('play', true)}Play</button>
            <button type="button" class="btn btn--ghost" data-action="shuffle-context" data-ctx="${p.id}">${icon('shuffle')}Shuffle</button>
          </div>
        </div>
      </div>
      ${p.songs.length
        ? `<ol class="tracks" data-context="${p.id}">${rows(p.songs)}</ol>`
        : '<p class="empty">Tap the heart on any song to add it to this playlist.</p>'}`;
  }

  function render() {
    renderHome();
    renderSearch();
    renderLibrary();
    renderPlaylist();
    $('#liked-count').textContent = state.liked.size ? `(${state.liked.size})` : '';
    syncUI();
  }

  /* Update everything that depends on "what is playing / liked right now" */
  function syncUI() {
    const playing = !audio.paused && !audio.ended;
    document.body.classList.toggle('is-playing', playing);

    $$('[data-song]').forEach(el => el.classList.toggle('is-current', el.dataset.song === state.currentId));

    $$('[data-play]').forEach(el => {
      const use = $('.pp use', el);
      if (use) use.setAttribute('href', el.dataset.play === state.currentId && playing ? '#i-pause' : '#i-play');
    });

    const cur = byId[state.currentId];
    $('#hero-sub').textContent = playing && cur
      ? `Now playing: ${cur.title}, from ${cur.album}`
      : 'Ten Taylor Swift songs, ready when you are.';

    $('#play-icon use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('#btn-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');

    $$('[data-like]').forEach(btn => {
      const on = state.liked.has(btn.dataset.like);
      btn.setAttribute('aria-pressed', on);
      btn.setAttribute('aria-label', on ? 'Remove from Liked Songs' : 'Add to Liked Songs');
    });

    $$('.shortcuts button').forEach(btn =>
      btn.classList.toggle('is-active', state.view === 'playlist' && btn.dataset.openPlaylist === state.playlistId));
  }

  /* ---------- 4. NAVIGATION ---------- */
  let enterTimer;
  function setView(name, playlistId) {
    state.view = name;
    if (playlistId) state.playlistId = playlistId;
    $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
    $$('.nav button').forEach(b => {
      if (b.dataset.view === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    closeNowPlaying();
    render();
    $('#main').scrollTop = 0;

    const view = $('#view-' + name);
    view.classList.remove('enter');
    void view.offsetWidth;                         // restart the animation
    $$('.card, .row, .tile', view).forEach((el, i) => el.style.setProperty('--i', i));
    view.classList.add('enter');
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => view.classList.remove('enter'), 1300);

    if (name === 'search') $('#search-input').focus();
  }

  /* ---------- 5. PLAYBACK ---------- */
  function contextSongs(ctx) {
    if (ctx === 'recent') return state.recent.map(id => byId[id]);
    if (ctx === 'top') return TOP_HITS.map(id => byId[id]);
    if (ctx === 'search') return searchResults(state.query);
    return playlistInfo(ctx || 'essentials').songs;
  }

  function buildQueue(currentId) {
    if (state.shuffle) {
      const rest = shuffleArray(state.baseQueue.filter(id => id !== currentId));
      state.queue = [currentId, ...rest];
      state.index = 0;
    } else {
      state.queue = [...state.baseQueue];
      state.index = state.queue.indexOf(currentId);
    }
  }

  function load(id, { autoplay = true } = {}) {
    const song = byId[id];
    if (!song) return;
    state.currentId = id;
    audio.src = song.file;

    $('#player-cover').innerHTML = cover(song, 'xs');
    $('#player-title').textContent = song.title;
    $('#player-artist').textContent = ARTIST;
    $('#player-like').dataset.like = id;
    applyTheme(song);
    updateProgress();

    if (autoplay) {
      state.hasPlayed = true;
      const p = audio.play();
      if (p && p.catch) p.catch(() => { /* real load errors are handled by the 'error' event */ });
      state.recent = [id, ...state.recent.filter(x => x !== id)].slice(0, 5);
      store.set('recent', state.recent);
      document.title = `${song.title}, ${ARTIST}`;
      render();
    } else {
      syncUI();
    }
    updateMediaSession(song);
  }

  function playSong(id, ctx) {
    let list = contextSongs(ctx).map(s => s.id);
    if (!list.includes(id)) list = SONGS.map(s => s.id);
    state.baseQueue = list;
    buildQueue(id);
    load(id);
  }

  function togglePlay() {
    if (!state.currentId) return playSong(SONGS[0].id, 'essentials');
    if (audio.paused) {
      state.hasPlayed = true;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      audio.pause();
    }
  }

  function next(fromEnded = false) {
    if (!state.queue.length) return;
    if (fromEnded && state.repeat === 'one') {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    let i = state.index + 1;
    if (i >= state.queue.length) {
      if (fromEnded && state.repeat === 'off') {   // reached the end of the list: stop
        audio.pause();
        audio.currentTime = 0;
        syncUI();
        return;
      }
      i = 0;
    }
    state.index = i;
    load(state.queue[i]);
  }

  function prev() {
    if (!state.queue.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }   // first press restarts the song
    let i = state.index - 1;
    if (i < 0) i = state.queue.length - 1;
    state.index = i;
    load(state.queue[i]);
  }

  function setShuffle(on) {
    state.shuffle = on;
    const btn = $('#btn-shuffle');
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', on ? 'Shuffle on' : 'Shuffle off');
    if (state.currentId && state.baseQueue.length) buildQueue(state.currentId);
  }

  function cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    state.repeat = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
    const btn = $('#btn-repeat');
    btn.dataset.mode = state.repeat;
    btn.setAttribute('aria-pressed', state.repeat !== 'off');
    btn.setAttribute('aria-label', { off: 'Repeat off', all: 'Repeat all songs', one: 'Repeat this song' }[state.repeat]);
    toast({ off: 'Repeat off', all: 'Repeating all songs', one: 'Repeating this song' }[state.repeat]);
  }

  function playContext(ctx, shuffle = false) {
    const list = contextSongs(ctx);
    if (!list.length) return toast('Nothing here yet. Tap the heart on a song first.');
    state.baseQueue = list.map(s => s.id);
    if (shuffle) setShuffle(true);
    const startId = shuffle ? list[Math.floor(Math.random() * list.length)].id : list[0].id;
    buildQueue(startId);
    load(startId);
  }

  function heartBurst(btn) {
    if (!btn || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = btn.getBoundingClientRect();
    const colors = ['#ff8fc7', '#b9a2ff', '#ffd27a', '#8fd5ff', '#ff7aa8'];
    for (let i = 0; i < 7; i++) {
      const el = document.createElement('span');
      el.className = 'float-heart';
      el.innerHTML = icon('heart');
      el.style.left = (r.left + r.width / 2 - 9 + (Math.random() * 16 - 8)) + 'px';
      el.style.top = (r.top + r.height / 2 - 9) + 'px';
      el.style.color = colors[i % colors.length];
      el.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px');
      el.style.animationDelay = (i * 50) + 'ms';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }

  function toggleLike(id, btn) {
    if (!id) return;
    if (state.liked.has(id)) {
      state.liked.delete(id);
      toast('Removed from Liked Songs');
    } else {
      state.liked.add(id);
      heartBurst(btn);
      toast('Added to Liked Songs');
    }
    store.set('liked', [...state.liked]);
    render();
  }

  /* ---------- 6. PLAYER CONTROLS ---------- */
  function updateProgress(previewValue) {
    const song = byId[state.currentId];
    const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (song ? song.duration : 0);
    const t = previewValue != null ? (previewValue / 1000) * dur : (audio.currentTime || 0);
    const pct = dur ? Math.min(100, (t / dur) * 100) : 0;
    if (previewValue == null) seek.value = Math.round(pct * 10);
    seek.style.setProperty('--pct', pct + '%');
    $('#elapsed').textContent = fmt(t);
    $('#total').textContent = state.showRemaining ? '-' + fmt(Math.max(0, dur - t)) : fmt(dur);
  }

  function updateVolumeUI() {
    const muted = audio.muted || audio.volume === 0;
    $('#btn-mute use').setAttribute('href', muted ? '#i-mute' : '#i-volume');
    $('#btn-mute').setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    volume.style.setProperty('--pct', (muted ? 0 : audio.volume * 100) + '%');
  }

  let toastTimer;
  function toast(msg, ms = 2400) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function updateMediaSession(song) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: ARTIST, album: song.album });
  }

  /* The whole app tints itself with the colors of the song that is playing */
  function applyTheme(song) {
    const root = document.documentElement;
    root.style.setProperty('--np1', song.c1);
    root.style.setProperty('--np2', song.c2);
    const vinyl = $('#vinyl');
    vinyl.style.setProperty('--c1', song.c1);
    vinyl.style.setProperty('--c2', song.c2);
    $('#np-title').textContent = song.title;
    $('#np-sub').textContent = `${ARTIST}, ${song.album} (${song.year})`;
  }

  function openNowPlaying() {
    $('#np').hidden = false;
    $('#btn-expand').setAttribute('aria-expanded', 'true');
    $('#np-close').focus();
  }
  function closeNowPlaying() {
    $('#np').hidden = true;
    $('#btn-expand').setAttribute('aria-expanded', 'false');
  }

  // Bouncing bars for the now-playing screen (CSS-animated, only move while music plays)
  $('#viz').innerHTML = Array.from({ length: 30 }, () =>
    `<i style="--t:${(0.55 + Math.random() * 0.8).toFixed(2)}s;--d:-${(Math.random() * 1.5).toFixed(2)}s;--h:${(0.35 + Math.random() * 0.65).toFixed(2)}"></i>`
  ).join('');

  /* ---------- 7. EVENTS ---------- */
  document.addEventListener('click', e => {
    let el;

    if ((el = e.target.closest('[data-play]'))) {
      const id = el.dataset.play;
      const ctx = el.closest('[data-context]')?.dataset.context || 'essentials';
      if (id === state.currentId && state.hasPlayed) togglePlay();
      else playSong(id, ctx);
      return;
    }
    if ((el = e.target.closest('[data-like]'))) { toggleLike(el.dataset.like, el); return; }
    if ((el = e.target.closest('[data-open-playlist]'))) { setView('playlist', el.dataset.openPlaylist); return; }
    if ((el = e.target.closest('[data-view]'))) { e.preventDefault(); setView(el.dataset.view); return; }
    if ((el = e.target.closest('[data-action]'))) {
      if (el.dataset.action === 'play-context') playContext(el.dataset.ctx, false);
      if (el.dataset.action === 'shuffle-context') playContext(el.dataset.ctx, true);
    }
  });

  $('#btn-expand').addEventListener('click', () => ($('#np').hidden ? openNowPlaying() : closeNowPlaying()));
  $('#np-close').addEventListener('click', closeNowPlaying);
  $('#player-cover').addEventListener('click', () => ($('#np').hidden ? openNowPlaying() : closeNowPlaying()));
  $('#btn-play').addEventListener('click', togglePlay);
  $('#btn-next').addEventListener('click', () => next(false));
  $('#btn-prev').addEventListener('click', prev);
  $('#btn-shuffle').addEventListener('click', () => setShuffle(!state.shuffle));
  $('#btn-repeat').addEventListener('click', cycleRepeat);

  $('#total').addEventListener('click', () => { state.showRemaining = !state.showRemaining; updateProgress(); });

  // Progress bar: preview while dragging, jump when released
  seek.addEventListener('input', () => { state.dragging = true; updateProgress(Number(seek.value)); });
  seek.addEventListener('change', () => {
    const song = byId[state.currentId];
    const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (song ? song.duration : 0);
    if (state.currentId) audio.currentTime = (Number(seek.value) / 1000) * dur;
    state.dragging = false;
    updateProgress();
  });

  // Volume + mute
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    audio.muted = false;
    store.set('volume', Number(volume.value));
  });
  $('#btn-mute').addEventListener('click', () => { audio.muted = !audio.muted; });

  // Search
  $('#search-input').addEventListener('input', e => {
    state.query = e.target.value;
    renderSearch();
    syncUI();
  });

  // Audio element events
  audio.addEventListener('play', syncUI);
  audio.addEventListener('pause', syncUI);
  audio.addEventListener('timeupdate', () => { if (!state.dragging) updateProgress(); });
  audio.addEventListener('loadedmetadata', () => updateProgress());
  audio.addEventListener('durationchange', () => updateProgress());
  audio.addEventListener('volumechange', updateVolumeUI);
  audio.addEventListener('ended', () => next(true));
  audio.addEventListener('error', () => {
    const song = byId[state.currentId];
    const code = audio.error ? audio.error.code : '?';
    console.error('Swiftify audio error', code, audio.currentSrc || audio.src);
    if (song) {
      toast(`Couldn't load “${song.title}” (error ${code}, ${song.file}). Tap "Add songs" on the Home page and pick your MP3 files.`, 9000);
    }
    syncUI();
  });

  // Fallback: let the user pick the MP3 files themselves, matched by file name
  $('#btn-add-songs').addEventListener('click', () => $('#song-picker').click());
  $('#song-picker').addEventListener('change', e => {
    let matched = 0;
    [...e.target.files].forEach(file => {
      const name = file.name.toLowerCase();
      const song = SONGS.find(s => name.includes(s.id));
      if (song) { song.file = URL.createObjectURL(file); matched++; }
    });
    e.target.value = '';
    if (!matched) return toast('None of those files matched. Pick files like anti-hero_mp3.mp3.', 6000);
    toast(`Loaded ${plural(matched, 'song')}. Press play.`, 4000);
    if (state.currentId) {
      const wasPlaying = !audio.paused;
      load(state.currentId, { autoplay: wasPlaying || state.hasPlayed });
    }
  });

  // Space bar toggles play/pause (unless typing or on a button)
  document.addEventListener('keydown', e => {
    if (e.code === 'Escape' && !$('#np').hidden) { closeNowPlaying(); return; }
    if (e.code !== 'Space') return;
    if (e.target.closest('input, textarea, button, a')) return;
    e.preventDefault();
    togglePlay();
  });

  // Media keys / lock screen controls
  if ('mediaSession' in navigator) {
    const actions = {
      play: togglePlay,
      pause: togglePlay,
      previoustrack: prev,
      nexttrack: () => next(false)
    };
    Object.entries(actions).forEach(([name, fn]) => {
      try { navigator.mediaSession.setActionHandler(name, fn); } catch { /* not supported */ }
    });
  }

  /* ---------- 8. START ---------- */
  const savedVolume = store.get('volume', 80);
  volume.value = savedVolume;
  audio.volume = savedVolume / 100;
  updateVolumeUI();

  // Load the first song (paused) so the player is never empty
  state.baseQueue = SONGS.map(s => s.id);
  buildQueue(SONGS[0].id);
  load(SONGS[0].id, { autoplay: false });

  setView('home');
})();
