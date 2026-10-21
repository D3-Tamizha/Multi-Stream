(function () {
  const scenesList = document.getElementById('scenes-list');
  const sourcesList = document.getElementById('sources-list');
  const mixerList = document.getElementById('audio-mixer-list');
  const platformsList = document.getElementById('platforms-list');
  const streamToggleBtn = document.getElementById('stream-toggle');
  const streamErrorBox = document.getElementById('stream-error');
  const statusDot = document.getElementById('status-dot');
  const statusLabel = document.getElementById('status-label');
  const uptimeVal = document.getElementById('uptime-val');

  function iconEye(open) {
    return open
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19M1 1l22 22"/></svg>';
  }
  function iconLock(locked) {
    return locked
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>';
  }

  // ---------------- Scenes ----------------
  function renderScenes() {
    scenesList.innerHTML = '';
    if (store.state.scenes.length === 0) {
      scenesList.innerHTML = '<div class="empty-hint">No scenes yet</div>';
      return;
    }
    store.state.scenes.forEach((scene) => {
      const row = document.createElement('div');
      row.className = 'list-row' + (scene.id === store.state.selectedSceneId ? ' active' : '');
      const name = document.createElement('span');
      name.className = 'row-name';
      name.textContent = scene.name + (scene.id === store.state.activeSceneId ? '  •' : '');
      name.title = scene.id === store.state.activeSceneId ? `${scene.name} (live / on air)` : scene.name;
      name.addEventListener('click', async () => {
        store.state.selectedSceneId = scene.id;
        store.notify();
        try {
          await api.activateScene(scene.id);
          await store.refreshScenes();
        } catch (e) { alert(e.message); }
      });
      row.appendChild(name);
      scenesList.appendChild(row);
    });
  }

  document.getElementById('scene-add').addEventListener('click', () => modals.openAddScene());
  document.getElementById('scene-remove').addEventListener('click', async () => {
    const scene = store.selectedScene();
    if (!scene) return;
    if (store.state.scenes.length === 1) { alert('At least one scene must exist.'); return; }
    if (!confirm(`Remove scene "${scene.name}"?`)) return;
    try { await api.removeScene(scene.id); await store.refreshScenes(); } catch (e) { alert(e.message); }
  });
  document.getElementById('scene-up').addEventListener('click', async () => {
    const scene = store.selectedScene();
    if (!scene) return;
    await api.moveScene(scene.id, 'up'); await store.refreshScenes();
  });
  document.getElementById('scene-down').addEventListener('click', async () => {
    const scene = store.selectedScene();
    if (!scene) return;
    await api.moveScene(scene.id, 'down'); await store.refreshScenes();
  });
  document.getElementById('scene-props').addEventListener('click', () => {
    const scene = store.selectedScene();
    if (!scene) return;
    modals.openSceneProperties(scene);
  });

  // ---------------- Sources ----------------
  function renderSources() {
    sourcesList.innerHTML = '';
    const scene = store.selectedScene();
    if (!scene || scene.sources.length === 0) {
      sourcesList.innerHTML = '<div class="empty-hint">No sources in this scene</div>';
      return;
    }
    // Render top-of-stack first (last item in array = topmost / rendered last by ffmpeg = on top)
    [...scene.sources].reverse().forEach((source) => {
      const row = document.createElement('div');
      row.className = 'list-row' + (source.id === store.state.selectedSourceId ? ' active' : '');
      const type = document.createElement('span');
      type.className = 'row-type';
      type.textContent = source.type;
      const name = document.createElement('span');
      name.className = 'row-name';
      name.textContent = source.name;
      name.addEventListener('click', () => { store.state.selectedSourceId = source.id; store.notify(); });

      const lockBtn = document.createElement('button');
      lockBtn.className = 'icon-btn' + (source.locked ? ' active' : '');
      lockBtn.innerHTML = iconLock(source.locked);
      lockBtn.title = source.locked ? 'Unlock' : 'Lock';
      lockBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await api.updateSource(scene.id, source.id, { locked: !source.locked });
        await store.refreshScenes();
      });

      const showBtn = document.createElement('button');
      showBtn.className = 'icon-btn' + (source.visible !== false ? ' active' : '');
      showBtn.innerHTML = iconEye(source.visible !== false);
      showBtn.title = source.visible !== false ? 'Hide' : 'Show';
      showBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await api.updateSource(scene.id, source.id, { visible: source.visible === false });
        await store.refreshScenes();
      });

      row.appendChild(type);
      row.appendChild(name);
      row.appendChild(lockBtn);
      row.appendChild(showBtn);
      sourcesList.appendChild(row);
    });
  }

  document.getElementById('source-add').addEventListener('click', () => modals.openAddSourceChooser());
  document.getElementById('source-remove').addEventListener('click', async () => {
    const scene = store.selectedScene();
    const source = store.selectedSource();
    if (!scene || !source) return;
    if (!confirm(`Remove source "${source.name}"?`)) return;
    try { await api.removeSource(scene.id, source.id); store.state.selectedSourceId = null; await store.refreshScenes(); } catch (e) { alert(e.message); }
  });
  document.getElementById('source-up').addEventListener('click', async () => {
    const scene = store.selectedScene(); const source = store.selectedSource();
    if (!scene || !source) return;
    await api.moveSource(scene.id, source.id, 'up'); await store.refreshScenes();
  });
  document.getElementById('source-down').addEventListener('click', async () => {
    const scene = store.selectedScene(); const source = store.selectedSource();
    if (!scene || !source) return;
    await api.moveSource(scene.id, source.id, 'down'); await store.refreshScenes();
  });
  document.getElementById('source-props').addEventListener('click', () => {
    const source = store.selectedSource();
    if (!source) return;
    modals.openSourceProperties(source);
  });

  // ---------------- Audio Mixer ----------------
  function renderMixer() {
    mixerList.innerHTML = '';
    const scene = store.selectedScene();
    const audioSources = scene ? scene.sources.filter((s) => s.type === 'media') : [];
    if (audioSources.length === 0) {
      mixerList.innerHTML = '<div class="empty-hint">No media sources</div>';
      return;
    }
    audioSources.forEach((source) => {
      const strip = document.createElement('div');
      strip.className = 'mixer-strip';
      const head = document.createElement('div');
      head.className = 'mixer-strip-head';
      const name = document.createElement('span');
      name.className = 'mixer-strip-name';
      name.textContent = source.name;
      const muteBtn = document.createElement('button');
      muteBtn.className = 'icon-btn' + (source.muted ? ' active' : '');
      muteBtn.textContent = source.muted ? '🔇' : '🔊';
      muteBtn.title = source.muted ? 'Unmute' : 'Mute (local only)';
      muteBtn.addEventListener('click', async () => {
        await api.updateSource(store.selectedScene().id, source.id, { muted: !source.muted });
        await store.refreshScenes();
      });
      head.appendChild(name);
      head.appendChild(muteBtn);

      const row = document.createElement('div');
      row.className = 'mixer-meter-row';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'mixer-slider';
      slider.min = '0'; slider.max = '2'; slider.step = '0.01';
      slider.value = source.volume !== undefined ? source.volume : 1;
      slider.addEventListener('change', async () => {
        await api.updateSource(store.selectedScene().id, source.id, { volume: Number(slider.value) });
        await store.refreshScenes();
      });
      row.appendChild(slider);

      strip.appendChild(head);
      strip.appendChild(row);
      mixerList.appendChild(strip);
    });
  }

  // ---------------- Platforms ----------------
  function renderPlatforms() {
    platformsList.innerHTML = '';
    if (store.state.platforms.length === 0) {
      platformsList.innerHTML = '<div class="empty-hint">No platforms added</div>';
      return;
    }
    store.state.platforms.forEach((platform) => {
      const row = document.createElement('div');
      row.className = 'platform-row' + (platform.id === store.state.selectedPlatformId ? ' active' : '');
      row.addEventListener('click', () => { store.state.selectedPlatformId = platform.id; store.notify(); });

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!platform.enabled;
      checkbox.addEventListener('click', (e) => e.stopPropagation());
      checkbox.addEventListener('change', async () => {
        await api.updatePlatform(platform.id, { enabled: checkbox.checked });
        await store.refreshPlatforms();
      });

      const dot = document.createElement('span');
      dot.className = 'platform-dot' + (platform.enabled ? ' on' : '');

      const label = document.createElement('span');
      label.className = 'platform-name';
      label.innerHTML = `${platform.name} <span class="platform-service">${platform.service}</span>`;

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.textContent = '✎';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); modals.openEditPlatform(platform); });

      row.appendChild(checkbox);
      row.appendChild(dot);
      row.appendChild(label);
      row.appendChild(editBtn);
      platformsList.appendChild(row);
    });
  }

  document.getElementById('platform-add').addEventListener('click', () => {
    window.location.hash = '#/settings/stream';
  });
  document.getElementById('platform-remove').addEventListener('click', async () => {
    const id = store.state.selectedPlatformId;
    const platform = store.state.platforms.find((p) => p.id === id);
    if (!platform) { alert('Select a platform first.'); return; }
    if (!confirm(`Remove platform "${platform.name}"?`)) return;
    await api.removePlatform(platform.id);
    store.state.selectedPlatformId = null;
    await store.refreshPlatforms();
  });

  // ---------------- Controls / Status ----------------
  function formatUptime(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function renderStreamStatus() {
    const st = store.state.streamStatus;
    streamToggleBtn.textContent = st.streaming ? 'End Streaming' : 'Start Streaming';
    streamToggleBtn.classList.toggle('live', st.streaming);
    statusDot.classList.toggle('live', st.streaming);
    statusLabel.textContent = st.streaming ? 'Streaming' : 'Offline';
    uptimeVal.textContent = formatUptime(st.uptimeSeconds || 0);
    if (st.lastError) {
      streamErrorBox.textContent = st.lastError;
      streamErrorBox.classList.remove('hidden');
    } else {
      streamErrorBox.classList.add('hidden');
    }
  }

    // ---------------- Stream stop timer ----------------
  const timerEnabled = document.getElementById('stream-timer-enabled');
  const timerSettings = document.getElementById('stream-timer-settings');
  const timerPreset = document.getElementById('stream-timer-preset');
  const timerCustom = document.getElementById('stream-timer-custom');
  const timerHours = document.getElementById('stream-timer-hours');
  const timerMinutes = document.getElementById('stream-timer-minutes');
  const timerCountdown = document.getElementById('stream-timer-countdown');
  const timerCancel = document.getElementById('stream-timer-cancel');

  let timerInterval = null;
  let timerEndAt = 0;
  let timerDeadline = 0;
  let timerStopping = false;

  function formatTimer(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));

    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');

    return `${h}:${m}:${s}`;
  }

  function getTimerDuration() {
    if (timerPreset.value !== 'custom') {
      return Number(timerPreset.value);
    }

    const hours = Number(timerHours.value);
    const minutes = Number(timerMinutes.value);

    if (
      timerHours.value.trim() === '' ||
      timerMinutes.value.trim() === '' ||
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 999 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error('Enter valid timer hours and minutes.');
    }

    return hours * 3600 + minutes * 60;
  }

  function clearStreamTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    timerEndAt = 0;
    timerDeadline = 0;
    timerStopping = false;
    timerCountdown.textContent = '00:00:00';
  }

  function updateTimerDisplay() {
    if (!timerEndAt) return;

    const remaining = Math.max(0, Math.ceil(
      (timerEndAt - Date.now()) / 1000
    ));

    timerCountdown.textContent = formatTimer(remaining);

    if (remaining === 0) {
      stopStreamWhenTimerExpires();
    }
  }

  function startStreamTimer() {
    clearStreamTimer();

    if (!timerEnabled.checked) return;

    let duration;

    try {
      duration = getTimerDuration();
    } catch (error) {
      alert(error.message);
      timerEnabled.checked = false;
      timerSettings.classList.add('hidden');
      return;
    }

    if (!Number.isSafeInteger(duration) || duration <= 0) {
      alert('Timer duration must be greater than zero.');
      timerEnabled.checked = false;
      timerSettings.classList.add('hidden');
      return;
    }

    timerEndAt = Date.now() + duration * 1000;
    timerDeadline = timerEndAt;

    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 250);
  }

  async function stopStreamWhenTimerExpires() {
    if (timerStopping || !timerEndAt) return;

    timerStopping = true;

    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    try {
      await api.stopStream();
      await store.refreshStreamStatus();
      timerCountdown.textContent = '00:00:00';
      timerEnabled.checked = false;
      timerSettings.classList.add('hidden');
    } catch (error) {
      streamErrorBox.textContent =
        `Automatic stream stop failed: ${error.message}`;
      streamErrorBox.classList.remove('hidden');
    } finally {
      timerEndAt = 0;
      timerDeadline = 0;
      timerStopping = false;
    }
  }

  timerEnabled.addEventListener('change', () => {
    timerSettings.classList.toggle('hidden', !timerEnabled.checked);

    if (!timerEnabled.checked) {
      clearStreamTimer();
    } else if (store.state.streamStatus.streaming) {
      startStreamTimer();
    } else {
      try {
        timerCountdown.textContent =
          formatTimer(getTimerDuration());
      } catch (error) {
        timerCountdown.textContent = '--:--:--';
      }
    }
  });

  timerPreset.addEventListener('change', () => {
    timerCustom.classList.toggle(
      'hidden',
      timerPreset.value !== 'custom'
    );

    if (timerEnabled.checked && store.state.streamStatus.streaming) {
      startStreamTimer();
    } else {
      try {
        timerCountdown.textContent =
          formatTimer(getTimerDuration());
      } catch (error) {
        timerCountdown.textContent = '--:--:--';
      }
    }
  });

  timerHours.addEventListener('change', () => {
    if (timerEnabled.checked && store.state.streamStatus.streaming) {
      startStreamTimer();
    }
  });

  timerMinutes.addEventListener('change', () => {
    if (timerEnabled.checked && store.state.streamStatus.streaming) {
      startStreamTimer();
    }
  });

  timerCancel.addEventListener('click', () => {
    clearStreamTimer();
    timerEnabled.checked = false;
    timerSettings.classList.add('hidden');
  });
  
  streamToggleBtn.addEventListener('click', async () => {
    streamToggleBtn.disabled = true;
    try {
if (store.state.streamStatus.streaming) {
  await api.stopStream();
  clearStreamTimer();
} else {
  clearStreamTimer();
  await api.startStream();
  await store.refreshStreamStatus();

  if (store.state.streamStatus.streaming) {
    startStreamTimer();
  }
}
await store.refreshStreamStatus();
    } catch (e) {
      streamErrorBox.textContent = e.message;
      streamErrorBox.classList.remove('hidden');
    } finally {
      streamToggleBtn.disabled = false;
    }
  });

  setInterval(() => {
    const editorView = document.getElementById('editor-view');
    if (editorView && !editorView.classList.contains('hidden')) store.refreshStreamStatus();
  }, 2000);

  function renderAll() {
    renderScenes();
    renderSources();
    renderMixer();
    renderPlatforms();
    renderStreamStatus();
  }

  window.addEventListener('sources:changed', () => store.refreshScenes());
  store.subscribe(renderAll);
  window.panels = { renderAll };
})();
