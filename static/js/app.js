/**
 * DashMax - Core Client Logic
 * Modern, High-Performance Dashboard Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    config: null,
    metricsHistory: {
      labels: [],
      cpu: [],
      ram: [],
      netUp: [],
      netDown: []
    },
    charts: {},
    activeModalMode: null
  };

  // Icon Mapping Helper
  const iconMap = {
    'server': 'fa-server',
    'container': 'fa-cubes',
    'hard-drive': 'fa-hard-drive',
    'shield-check': 'fa-shield-halved',
    'cpu': 'fa-microchip',
    'home': 'fa-house-signal',
    'wifi': 'fa-wifi',
    'film': 'fa-film',
    'play-circle': 'fa-circle-play',
    'tv': 'fa-tv',
    'download-cloud': 'fa-cloud-arrow-down',
    'activity': 'fa-chart-line',
    'shield': 'fa-shield-cat',
    'lock': 'fa-lock',
    'github': 'fa-brands fa-github',
    'box': 'fa-box-open',
    'zap': 'fa-bolt-lightning',
    'router': 'fa-network-wired',
    'external-link': 'fa-arrow-up-right-from-square'
  };

  function getFaIcon(iconKey) {
    if (!iconKey) return 'fa-solid fa-globe';
    if (iconKey.startsWith('fa-')) return iconKey;
    return `fa-solid ${iconMap[iconKey] || 'fa-cubes'}`;
  }

  // --- 1. Background Particle Mesh Canvas ---
  function initBackgroundMesh() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1
    }));

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';

      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          let p2 = particles[j];
          let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // --- 2. Chart.js Initialization ---
  function initCharts() {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      events: [], // Completely disable click/hover/touch popups
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: {
          display: false,
          min: 0,
          max: 100
        }
      },
      elements: {
        point: { radius: 0 },
        line: { tension: 0.4 }
      }
    };

    // CPU Chart
    const elCpu = document.getElementById('chart-cpu');
    if (elCpu) {
      const ctxCpu = elCpu.getContext('2d');
      const gradCpu = ctxCpu.createLinearGradient(0, 0, 0, 90);
      gradCpu.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
      gradCpu.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

      state.charts.cpu = new Chart(ctxCpu, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: '#00f2fe',
            borderWidth: 2,
            fill: true,
            backgroundColor: gradCpu
          }]
        },
        options: commonOptions
      });
    }

    // RAM Chart (If Canvas Exists)
    const elRam = document.getElementById('chart-ram');
    if (elRam) {
      const ctxRam = elRam.getContext('2d');
      const gradRam = ctxRam.createLinearGradient(0, 0, 0, 90);
      gradRam.addColorStop(0, 'rgba(127, 0, 255, 0.4)');
      gradRam.addColorStop(1, 'rgba(127, 0, 255, 0.0)');

      state.charts.ram = new Chart(ctxRam, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: '#7f00ff',
            borderWidth: 2,
            fill: true,
            backgroundColor: gradRam
          }]
        },
        options: commonOptions
      });
    }

    // Network Chart
    const elNet = document.getElementById('chart-net');
    if (elNet) {
      const ctxNet = elNet.getContext('2d');
      const netOptions = JSON.parse(JSON.stringify(commonOptions));
      delete netOptions.scales.y.max; // Dynamic height for Network speed

      state.charts.net = new Chart(ctxNet, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Download (Mbps)',
              data: [],
              borderColor: '#00e676',
              borderWidth: 2,
              fill: false
            },
            {
              label: 'Upload (Mbps)',
              data: [],
              borderColor: '#ff007f',
              borderWidth: 2,
              fill: false
            }
          ]
        },
        options: netOptions
      });
    }
  }

  function renderIconHtml(iconVal) {
    if (!iconVal) return `<i class="fa-solid fa-cubes"></i>`;
    if (iconVal.startsWith('http://') || iconVal.startsWith('https://') || iconVal.startsWith('/') || iconVal.endsWith('.png') || iconVal.endsWith('.svg')) {
      return `<img src="${iconVal}" alt="icon" style="width: 26px; height: 26px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">`;
    }
    return `<i class="${getFaIcon(iconVal)}"></i>`;
  }

  // --- 3. Render Dashboard UI ---
  function renderDashboard() {
    if (!state.config) return;

    // Set Theme
    const theme = state.config.settings?.theme || 'dark-neon';
    document.documentElement.setAttribute('data-theme', theme);

    // Title, Subtitle & Favicon
    document.getElementById('app-title').textContent = state.config.settings?.title || 'Synology Maison';
    document.getElementById('app-subtitle').textContent = state.config.settings?.subtitle || 'Centre d\'Opérations & Services NAS';

    const brandLogo = document.getElementById('brand-logo-container');
    if (brandLogo) {
      brandLogo.innerHTML = `<i class="fa-solid fa-server"></i>`;
    }

    // Render Category Nav Bar (Horizontal Mobile Bar)
    const navBar = document.getElementById('category-nav-bar');
    if (navBar) {
      navBar.innerHTML = '';
      (state.config.categories || []).forEach((cat, idx) => {
        const a = document.createElement('a');
        a.className = `cat-nav-pill ${idx === 0 ? 'active' : ''}`;
        a.href = `#cat-${cat.id}`;
        a.innerHTML = `${renderIconHtml(cat.icon)} <span>${cat.name}</span>`;
        a.addEventListener('click', () => {
          document.querySelectorAll('.cat-nav-pill').forEach(p => p.classList.remove('active'));
          a.classList.add('active');
        });
        navBar.appendChild(a);
      });
    }

    // Render Quick Links Dock
    const linksContainer = document.getElementById('quick-links-container');
    if (linksContainer) {
      linksContainer.innerHTML = '';
      (state.config.quickLinks || []).forEach(link => {
        const a = document.createElement('a');
        a.className = 'dock-link-item';
        a.href = link.url;
        a.target = link.target || '_self';
        a.title = link.title;
        const abbr = link.abbr || link.title.substring(0, 2).toUpperCase();
        a.innerHTML = `
          <div class="dock-avatar">${abbr}</div>
          <span class="dock-label">${link.title}</span>
        `;
        linksContainer.appendChild(a);
      });
    }


    // Render Categories & Cards
    const catContainer = document.getElementById('categories-container');
    catContainer.innerHTML = '';

    const categories = state.config.categories || [];
    if (categories.length === 0) {
      catContainer.innerHTML = `
        <div style="text-align:center; padding: 60px 20px; color: var(--text-muted); width: 100%;">
          <i class="fa-solid fa-layer-group" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px; display: inline-block; color: var(--accent-cyan);"></i><br>
          <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">Bienvenue sur DashMax !</span><br>
          <p style="font-size: 13px; margin-top: 8px; max-width: 450px; margin-left: auto; margin-right: auto; line-height: 1.5; color: var(--text-muted);">
            Votre tableau de bord est prêt. Cliquez sur le bouton <strong style="color: var(--accent-cyan);"><i class="fa-solid fa-sliders"></i> Configuration</strong> en haut à droite pour ajouter vos premières catégories et cartes de services.
          </p>
        </div>
      `;
    } else {
      categories.forEach(cat => {
      const groupEl = document.createElement('section');
      groupEl.className = 'category-group';
      groupEl.id = `cat-${cat.id}`;

      let cardsHtml = '';
      (cat.services || []).forEach(service => {
        const targetAttr = service.target || '_blank';
        cardsHtml += `
          <a class="service-card" id="card-${service.id}" href="${service.url}" target="${targetAttr}" rel="noopener noreferrer">
            <div class="card-top">
              <div class="card-icon-wrapper">
                ${renderIconHtml(service.icon)}
              </div>
              <div class="status-badge" id="badge-${service.id}">
                <span class="status-dot"></span>
                <span class="status-text">Vérification...</span>
              </div>
            </div>
            <div class="card-title-group">
              <h3>${service.name}</h3>
              <p>${service.description || ''}</p>
            </div>
            <div class="card-bottom">
              <span class="tag-badge">${service.tag || 'Service'}</span>
              <span class="latency-info" id="latency-${service.id}">-- ms</span>
            </div>
          </a>
        `;
      });

      groupEl.innerHTML = `
        <div class="category-header">
          <div class="category-title">
            ${renderIconHtml(cat.icon)}
            <h2>${cat.name}</h2>
          </div>
          <span class="service-count">${(cat.services || []).length} services</span>
        </div>
        <div class="cards-grid">
          ${cardsHtml}
        </div>
      `;

      catContainer.appendChild(groupEl);
    });
    }

    // Trigger initial service ping check
    pingAllServices();
  }

  function updateSegmentBar(containerId, percentage, colorClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (container.children.length !== 10) {
      container.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        const block = document.createElement('div');
        block.className = 'segment-block';
        container.appendChild(block);
      }
    }

    const activeCount = Math.round((percentage / 100) * 10);
    Array.from(container.children).forEach((block, idx) => {
      if (idx < activeCount) {
        block.className = `segment-block ${colorClass}`;
      } else {
        block.className = 'segment-block';
      }
    });
  }

  // --- 4. Metric Polling & Chart Update ---
  async function fetchMetrics() {
    try {
      const res = await fetch('/api/system');
      if (!res.ok) return;
      const data = await res.json();

      const timeLabel = new Date().toLocaleTimeString();

      // CPU
      const cpuVal = Math.round(data.cpu.usage_percent);
      const valCpuEl = document.getElementById('val-cpu');
      const miniCpuEl = document.getElementById('mini-val-cpu');
      if (valCpuEl) valCpuEl.textContent = `${cpuVal}%`;
      if (miniCpuEl) miniCpuEl.textContent = `${cpuVal}%`;
      
      // RAM SVG Radial Gauge
      const ramVal = Math.round(data.memory.usage_percent);
      const valRamEl = document.getElementById('val-ram');
      const miniRamEl = document.getElementById('mini-val-ram');
      if (valRamEl) valRamEl.textContent = `${data.memory.used_gb} / ${data.memory.total_gb} GB`;
      if (miniRamEl) miniRamEl.textContent = `${ramVal}%`;

      const ramRingFill = document.getElementById('ram-ring-fill');
      const ramRingText = document.getElementById('ram-ring-text');
      if (ramRingFill && ramRingText) {
        const strokeDash = 251.2;
        const offset = strokeDash - (strokeDash * (ramVal / 100));
        ramRingFill.style.strokeDashoffset = offset;
        ramRingText.textContent = `${ramVal}%`;
      }

      // Disk
      const diskVal = Math.round(data.disk.usage_percent);
      const valDiskEl = document.getElementById('val-disk');
      const fillDiskEl = document.getElementById('fill-disk');
      const valDiskDetailEl = document.getElementById('val-disk-detail');
      const miniDiskEl = document.getElementById('mini-val-disk');
      if (valDiskEl) valDiskEl.textContent = `${diskVal}%`;
      if (miniDiskEl) miniDiskEl.textContent = `${diskVal}%`;
      if (fillDiskEl) fillDiskEl.style.width = `${diskVal}%`;
      if (valDiskDetailEl) valDiskDetailEl.textContent = `${data.disk.used_gb} GB utilisés / ${data.disk.free_gb} GB libres`;

      // Network
      const dlSpeed = data.network.download_speed_mbps;
      const ulSpeed = data.network.upload_speed_mbps;
      const valNetSpeedEl = document.getElementById('val-net-speed');
      const miniNetEl = document.getElementById('mini-val-net');
      if (valNetSpeedEl) valNetSpeedEl.textContent = `${dlSpeed} Mbps`;
      if (miniNetEl) miniNetEl.textContent = `${dlSpeed}M`;

      // Push history
      const history = state.metricsHistory;
      history.labels.push(timeLabel);
      history.cpu.push(cpuVal);
      history.ram.push(ramVal);
      history.netDown.push(dlSpeed);
      history.netUp.push(ulSpeed);

      if (history.labels.length > 20) {
        history.labels.shift();
        history.cpu.shift();
        history.ram.shift();
        history.netDown.shift();
        history.netUp.shift();
      }

      // Update Charts
      if (state.charts.cpu) {
        state.charts.cpu.data.labels = history.labels;
        state.charts.cpu.data.datasets[0].data = history.cpu;
        state.charts.cpu.update();
      }

      if (state.charts.ram) {
        state.charts.ram.data.labels = history.labels;
        state.charts.ram.data.datasets[0].data = history.ram;
        state.charts.ram.update();
      }

      if (state.charts.net) {
        state.charts.net.data.labels = history.labels;
        state.charts.net.data.datasets[0].data = history.netDown;
        state.charts.net.data.datasets[1].data = history.netUp;
        state.charts.net.update();
      }

    } catch (e) {
      console.error("Metrics fetch error:", e);
    }
  }

  // --- 5. Service Status Ping Check ---
  async function pingAllServices() {
    if (!state.config || !state.config.categories) return;

    const urlsToPing = [];
    state.config.categories.forEach(cat => {
      (cat.services || []).forEach(serv => {
        if (serv.pingUrl || serv.url) {
          urlsToPing.push({
            id: serv.id,
            url: serv.pingUrl || serv.url
          });
        }
      });
    });

    if (urlsToPing.length === 0) return;

    try {
      const res = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToPing })
      });
      if (!res.ok) return;

      const results = await res.json();
      Object.keys(results).forEach(servId => {
        const info = results[servId];
        const badgeEl = document.getElementById(`badge-${servId}`);
        const latencyEl = document.getElementById(`latency-${servId}`);

        if (badgeEl) {
          badgeEl.className = `status-badge ${info.online ? 'online' : 'offline'}`;
          badgeEl.querySelector('.status-text').textContent = info.online ? 'En Ligne' : 'Hors Ligne';
        }
        if (latencyEl) {
          latencyEl.textContent = info.online ? `${info.latency_ms} ms` : 'Inaccessible';
        }
      });

    } catch (e) {
      console.error("Ping error:", e);
    }
  }

  // --- 6. Modal Controls & Features ---
  const modalOverlay = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const btnSaveModal = document.getElementById('btn-save-modal');

  function openModal(title, bodyHtml, mode) {
    state.activeModalMode = mode;
    modalTitle.textContent = title;
    modalContent.innerHTML = bodyHtml;
    modalOverlay.classList.add('active');

    if (mode === 'docker-containers') {
      btnSaveModal.style.display = 'none';
    } else {
      btnSaveModal.style.display = 'inline-block';
    }
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    state.activeModalMode = null;
    btnSaveModal.style.display = 'inline-block';
  }

  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

  // Containers Status Modal Button Header Click
  const btnContainersHeader = document.getElementById('btn-containers');
  if (btnContainersHeader) {
    btnContainersHeader.addEventListener('click', () => {
      renderContainersModal();
    });
  }

  async function safeFetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (res.status === 401) {
        throw new Error("Session expirée. Veuillez vous réauthentifier.");
      }
      const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
      throw new Error(`Réponse serveur (${res.status}): ${cleanText.substring(0, 100) || 'Format invalide'}`);
    }
    return data;
  }

  async function pollServerAndRender(activeView = 'containers') {
    const modalContent = document.getElementById('modal-body-content');
    if (modalContent) {
      modalContent.innerHTML = `
        <div style="text-align:center; padding:45px 20px; color:var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--accent-cyan); margin-bottom:14px; display:inline-block;"></i><br>
          <span style="font-size:14px; font-weight:600; color:var(--text-primary);">Redémarrage du conteneur en cours...</span><br>
          <span style="font-size:12px; opacity:0.7; margin-top:6px; display:inline-block;">Reconnexion automatique dès le démarrage du serveur...</span>
        </div>
      `;
    }

    // Poll /api/auth/status until server responds or max 12 attempts (18 seconds)
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const resp = await fetch('/api/auth/status');
        if (resp.ok) {
          break;
        }
      } catch (e) {
        // Server still booting up...
      }
    }

    await renderContainersModal(activeView);
  }

  async function renderContainersModal(activeView = 'containers') {
    openModal('Gestionnaire Synology Docker & Projets', '<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Chargement des conteneurs et projets...</div>', 'docker-containers');

    try {
      const data = await safeFetchJson('/api/containers');
      const containers = data.containers || [];
      const runningCount = containers.filter(c => c.state === 'running').length;
      const stoppedCount = containers.length - runningCount;

      // Group containers by Container Manager / Compose Project
      const projectsMap = {};
      containers.forEach(c => {
        const pName = c.project;
        if (pName && pName !== 'Autonomes') {
          if (!projectsMap[pName]) {
            projectsMap[pName] = {
              name: pName,
              config_file: c.config_file || '',
              containers: []
            };
          }
          projectsMap[pName].containers.push(c);
        }
      });
      const projectsList = Object.values(projectsMap);

      let html = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div class="settings-nav-tabs" style="border: none; padding-bottom: 0; margin-top: 0;">
            <button type="button" class="tab-btn ${activeView === 'containers' ? 'active' : ''}" id="tab-subview-containers">
              <i class="fa-solid fa-boxes-stacked"></i> Conteneurs (${containers.length})
            </button>
            <button type="button" class="tab-btn ${activeView === 'projects' ? 'active' : ''}" id="tab-subview-projects">
              <i class="fa-solid fa-folder-tree"></i> Projets Synology (${projectsList.length})
            </button>
          </div>
          <button type="button" class="btn-secondary" id="btn-refresh-containers-action" style="padding: 6px 14px; font-size: 12px;">
            <i class="fa-solid fa-rotate-right"></i> Actualiser
          </button>
        </div>
      `;

      if (activeView === 'containers') {
        html += `
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;">
            <span class="badge" style="background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.3); padding: 4px 10px; font-size: 12px; border-radius: var(--radius-sm);">
              <i class="fa-solid fa-circle-play"></i> ${runningCount} en cours
            </span>
            <span class="badge" style="background: rgba(255, 61, 0, 0.15); color: #ff3d00; border: 1px solid rgba(255, 61, 0, 0.3); padding: 4px 10px; font-size: 12px; border-radius: var(--radius-sm);">
              <i class="fa-solid fa-circle-stop"></i> ${stoppedCount} arrêtés
            </span>
          </div>

          <div class="settings-item-list" id="containers-list-box" style="max-height: 380px; overflow-y: auto;">
        `;

        if (containers.length === 0) {
          const socketMsg = data.docker_available 
            ? 'Aucun conteneur en cours ou arrêté n\'a été renvoyé par le démon Docker.'
            : 'Le fichier <code>/var/run/docker.sock</code> n\'est pas accessible sur le serveur. Assurez-vous d\'avoir monté le volume <code>-v /var/run/docker.sock:/var/run/docker.sock:ro</code>.';

          html += `
            <div style="text-align:center; padding:35px 20px; color:var(--text-muted);">
              <i class="fa-brands fa-docker" style="font-size: 40px; opacity: 0.3; margin-bottom: 12px; display: inline-block;"></i><br>
              <span style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">Aucun conteneur Docker détecté</span><br>
              <p style="font-size: 12px; margin-top: 8px; max-width: 450px; margin-left: auto; margin-right: auto; line-height: 1.5; color: var(--text-muted);">${socketMsg}</p>
            </div>
          `;
        } else {
          containers.forEach(c => {
            const isRunning = c.state === 'running';
            const dotColor = isRunning ? '#00e676' : '#ff3d00';
            const stateBadge = isRunning 
              ? '<span style="color: #00e676; background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.3); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">RUNNING</span>'
              : `<span style="color: #ff3d00; background: rgba(255,61,0,0.1); border: 1px solid rgba(255,61,0,0.3); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${(c.state || 'STOPPED').toUpperCase()}</span>`;

            let actionButtons = '';
            if (isRunning) {
              actionButtons = `
                <button type="button" class="btn-icon-secondary btn-container-action" data-id="${c.id}" data-action="restart" title="Redémarrer le conteneur"><i class="fa-solid fa-rotate-right"></i></button>
                <button type="button" class="btn-icon-danger btn-container-action" data-id="${c.id}" data-action="stop" title="Arrêter le conteneur"><i class="fa-solid fa-power-off"></i></button>
              `;
            } else {
              actionButtons = `
                <button type="button" class="btn-icon-success btn-container-action" data-id="${c.id}" data-action="start" title="Démarrer le conteneur"><i class="fa-solid fa-play"></i></button>
              `;
            }
            actionButtons += `
              <button type="button" class="btn-icon-secondary btn-container-logs" data-id="${c.id}" data-name="${c.name}" title="Consulter les logs"><i class="fa-solid fa-terminal"></i></button>
            `;

            html += `
              <div class="settings-list-item container-item-row" data-search="${(c.name + ' ' + c.image + ' ' + c.ports + ' ' + c.project).toLowerCase()}">
                <div class="settings-item-info" style="gap: 12px; width: 100%;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 8px ${dotColor}; flex-shrink: 0;"></div>
                  <div class="settings-item-text" style="flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                      <span class="settings-item-title" style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${c.name}</span>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        ${stateBadge}
                        ${actionButtons}
                      </div>
                    </div>
                    <span class="settings-item-sub" style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 2px;">
                      ${c.project && c.project !== 'Autonomes' ? `<i class="fa-solid fa-cubes" style="font-size: 11px; color: var(--accent-cyan);"></i> Projet: <strong>${c.project}</strong> &bull; ` : ''}<i class="fa-solid fa-box" style="font-size: 11px;"></i> ${c.image}
                    </span>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 3px;">
                      ${c.memory && c.memory !== '-' ? `<span style="font-size: 11px; color: var(--accent-cyan); font-family: var(--font-mono); background: rgba(0, 242, 254, 0.08); padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(0, 242, 254, 0.2);"><i class="fa-solid fa-memory" style="font-size: 10px;"></i> RAM: ${c.memory}</span>` : ''}
                      ${c.ports && c.ports !== '-' ? `<span style="font-size: 11px; color: var(--accent-cyan); font-family: var(--font-mono);"><i class="fa-solid fa-network-wired" style="font-size: 10px;"></i> Ports: ${c.ports}</span>` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `;
          });
        }

        html += '</div>';

      } else {
        // Projects View
        html += `
          <div class="settings-item-list" id="containers-list-box" style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
        `;

        if (projectsList.length === 0) {
          html += `
            <div style="text-align:center; padding:35px 20px; color:var(--text-muted);">
              <i class="fa-solid fa-folder-open" style="font-size: 40px; opacity: 0.3; margin-bottom: 12px;"></i><br>
              <span>Aucun projet Container Manager détecté.</span>
            </div>
          `;
        } else {
          projectsList.forEach(p => {
            const total = p.containers.length;
            const running = p.containers.filter(c => c.state === 'running').length;
            const isAllRunning = running === total;
            const isAllStopped = running === 0;

            let projBadge = '';
            if (isAllRunning) {
              projBadge = '<span style="color: #00e676; background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.3); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap;"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> EN COURS</span>';
            } else if (isAllStopped) {
              projBadge = '<span style="color: #ff3d00; background: rgba(255,61,0,0.1); border: 1px solid rgba(255,61,0,0.3); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap;"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> ARRÊTÉ</span>';
            } else {
              projBadge = `<span style="color: #ffab00; background: rgba(255,171,0,0.1); border: 1px solid rgba(255,171,0,0.3); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap;"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> PARTIEL (${running}/${total})</span>`;
            }

            const shortPath = p.config_file ? (p.config_file.split('/').pop() || p.config_file) : '';

            let containersSubList = p.containers.map(c => {
              const isRun = c.state === 'running';
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: rgba(0,0,0,0.25); border-radius: 6px; font-size: 12px; gap: 8px; border: 1px solid rgba(255,255,255,0.03);">
                  <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                    <div style="width: 7px; height: 7px; border-radius: 50%; background: ${isRun ? '#00e676' : '#ff3d00'}; box-shadow: 0 0 6px ${isRun ? '#00e676' : '#ff3d00'}; flex-shrink: 0;"></div>
                    <span style="color: var(--text-primary); font-weight: 500; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${c.name}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    ${c.ports && c.ports !== '-' ? `<span style="font-size: 10px; color: var(--accent-cyan); font-family: var(--font-mono);">${c.ports}</span>` : ''}
                    <span style="color: ${isRun ? '#00e676' : '#ff3d00'}; font-size: 10px; font-weight: 700; text-transform: uppercase;">${c.state}</span>
                  </div>
                </div>
              `;
            }).join('');

            html += `
              <div class="settings-list-item project-item-row" data-search="${p.name.toLowerCase()}" style="flex-direction: column; align-items: stretch; padding: 14px; background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <i class="fa-solid fa-folder-tree" style="font-size: 16px; color: var(--accent-cyan);"></i>
                    </div>
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 700; font-size: 15px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.name}</div>
                      <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 1px;">
                        <span><i class="fa-solid fa-cubes" style="font-size: 10px;"></i> ${total} conteneur${total > 1 ? 's' : ''}</span>
                        ${shortPath ? `<span style="opacity: 0.7; text-overflow: ellipsis; overflow: hidden; max-width: 140px; white-space: nowrap;" title="${p.config_file}">&bull; ${shortPath}</span>` : ''}
                      </div>
                    </div>
                  </div>
                  <div style="flex-shrink: 0;">${projBadge}</div>
                </div>

                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); flex-wrap: wrap;">
                  <button type="button" class="btn-secondary btn-project-action" data-project="${p.name}" data-action="restart" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;" title="Redémarrer tout le projet">
                    <i class="fa-solid fa-rotate-right"></i> Redémarrer
                  </button>
                  ${running > 0 ? `
                    <button type="button" class="btn-danger btn-project-action" data-project="${p.name}" data-action="stop" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;" title="Arrêter tout le projet">
                      <i class="fa-solid fa-power-off"></i> Arrêter
                    </button>
                  ` : ''}
                  ${running < total ? `
                    <button type="button" class="btn-success btn-project-action" data-project="${p.name}" data-action="start" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;" title="Démarrer tout le projet">
                      <i class="fa-solid fa-play"></i> Démarrer
                    </button>
                  ` : ''}
                </div>

                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
                  ${containersSubList}
                </div>
              </div>
            `;
          });
        }

        html += '</div>';
      }

      modalContent.innerHTML = html;

      // Subview switch handlers
      const tabContainers = document.getElementById('tab-subview-containers');
      if (tabContainers) {
        tabContainers.addEventListener('click', () => {
          renderContainersModal('containers');
        });
      }
      const tabProjects = document.getElementById('tab-subview-projects');
      if (tabProjects) {
        tabProjects.addEventListener('click', () => {
          renderContainersModal('projects');
        });
      }

      // Refresh button event
      const btnRefresh = document.getElementById('btn-refresh-containers-action');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          renderContainersModal(activeView);
        });
      }

      // Container Action buttons event (start, stop, restart)
      document.querySelectorAll('.btn-container-action').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const containerId = btn.getAttribute('data-id');
          const action = btn.getAttribute('data-action');
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

          try {
            const data = await safeFetchJson(`/api/containers/${containerId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action })
            });
            if (!data.success) {
              alert(`Erreur (${action}): ` + (data.error || 'Échec de l\'action'));
            }
          } catch (err) {
            console.log('Action sent, polling for server restart...', err.message);
          } finally {
            await pollServerAndRender(activeView);
          }
        });
      });

      // Project Action buttons event (start, stop, restart entire project)
      document.querySelectorAll('.btn-project-action').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const projectName = btn.getAttribute('data-project');
          const action = btn.getAttribute('data-action');
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

          try {
            const data = await safeFetchJson(`/api/projects/${encodeURIComponent(projectName)}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action })
            });
            if (!data.success) {
              alert(`Erreur projet (${action}): ` + (data.error || 'Échec de l\'action'));
            }
          } catch (err) {
            console.log('Project action sent, polling for server restart...', err.message);
          } finally {
            await pollServerAndRender(activeView);
          }
        });
      });

      // Logs viewer event
      document.querySelectorAll('.btn-container-logs').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const containerId = btn.getAttribute('data-id');
          const containerName = btn.getAttribute('data-name');
          renderContainerLogsModal(containerId, containerName);
        });
      });

    } catch (err) {
      modalContent.innerHTML = `<div style="color: #ff3d00; text-align:center; padding: 20px;">Erreur de chargement des conteneurs: ${err.message}</div>`;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function renderContainerLogsModal(containerId, containerName, tail = 300) {
    const title = `Logs: ${containerName}`;
    const loadingHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <span style="color: var(--text-muted); font-size: 13px;"><i class="fa-solid fa-terminal"></i> ${containerName} (${containerId})</span>
      </div>
      <div style="text-align:center; padding:50px; color:var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>Chargement des logs du conteneur...
      </div>
    `;

    openModal(title, loadingHtml, 'docker-containers');

    try {
      const data = await safeFetchJson(`/api/containers/${containerId}/logs?tail=${tail}`);
      const logs = data.success ? (data.logs || 'Aucun log disponible.') : (`Erreur logs: ` + (data.error || 'Inconnu'));

      const html = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: var(--accent-cyan); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-terminal"></i> ${containerName}</span>
            <select id="sel-log-tail" class="form-select" style="width: auto; padding: 4px 8px; font-size: 12px;">
              <option value="100" ${tail == 100 ? 'selected' : ''}>100 lignes</option>
              <option value="300" ${tail == 300 ? 'selected' : ''}>300 lignes</option>
              <option value="500" ${tail == 500 ? 'selected' : ''}>500 lignes</option>
              <option value="1000" ${tail == 1000 ? 'selected' : ''}>1000 lignes</option>
            </select>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-secondary" id="btn-copy-logs" style="padding: 6px 12px; font-size: 12px;">
              <i class="fa-regular fa-copy"></i> Copier
            </button>
            <button type="button" class="btn-secondary" id="btn-refresh-logs" style="padding: 6px 12px; font-size: 12px;">
              <i class="fa-solid fa-rotate-right"></i> Actualiser
            </button>
            <button type="button" class="btn-secondary" id="btn-back-to-containers" style="padding: 6px 12px; font-size: 12px;">
              <i class="fa-solid fa-arrow-left"></i> Retour
            </button>
          </div>
        </div>

        <pre id="container-logs-view" style="background: rgba(5, 9, 18, 0.95); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; color: #a5f3fc; font-family: var(--font-mono); font-size: 12px; line-height: 1.5; max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin: 0;">${escapeHtml(logs)}</pre>
      `;

      modalContent.innerHTML = html;

      // Scroll to bottom of logs
      const logsBox = document.getElementById('container-logs-view');
      if (logsBox) logsBox.scrollTop = logsBox.scrollHeight;

      // Change tail lines select event
      const selTail = document.getElementById('sel-log-tail');
      if (selTail) {
        selTail.addEventListener('change', (e) => {
          renderContainerLogsModal(containerId, containerName, e.target.value);
        });
      }

      // Refresh logs event
      const btnRefreshLogs = document.getElementById('btn-refresh-logs');
      if (btnRefreshLogs) {
        btnRefreshLogs.addEventListener('click', () => {
          renderContainerLogsModal(containerId, containerName, document.getElementById('sel-log-tail')?.value || 300);
        });
      }

      // Copy logs event
      const btnCopyLogs = document.getElementById('btn-copy-logs');
      if (btnCopyLogs) {
        btnCopyLogs.addEventListener('click', () => {
          navigator.clipboard.writeText(logs);
          btnCopyLogs.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
          setTimeout(() => {
            btnCopyLogs.innerHTML = '<i class="fa-regular fa-copy"></i> Copier';
          }, 2000);
        });
      }

      // Back to containers button event
      const btnBack = document.getElementById('btn-back-to-containers');
      if (btnBack) {
        btnBack.addEventListener('click', () => {
          renderContainersModal();
        });
      }

    } catch (err) {
      modalContent.innerHTML = `<div style="color: #ff3d00; text-align:center; padding: 20px;">Erreur de lecture des logs: ${err.message}</div>`;
    }
  }

  // Theme Picker Button Click -> Opens Settings Center on Thème tab
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      renderSettingsCenterModal('tab-theme');
    });
  }

  // Add Service Modal (if header button exists)
  const btnAddServiceHeader = document.getElementById('btn-add-service');
  if (btnAddServiceHeader) {
    btnAddServiceHeader.addEventListener('click', () => {
      renderSettingsCenterModal('tab-services');
    });
  }

  // Multi-Tab Settings Center Modal
  const btnConfigJson = document.getElementById('btn-config-json');
  if (btnConfigJson) {
    btnConfigJson.addEventListener('click', () => {
      renderSettingsCenterModal();
    });
  }

  function renderSettingsCenterModal(activeTabId = 'tab-general') {
    if (!state.config) {
      state.config = { auth: { enabled: true, user: 'admin' }, categories: [], settings: {}, quickLinks: [] };
    }
    const currentTheme = state.config.settings?.theme || 'dark-neon';
    const jsonStr = JSON.stringify(state.config, null, 2);

    // Build Quick Links List HTML
    let quickLinksHtml = '<div class="settings-item-list">';
    if ((state.config.quickLinks || []).length === 0) {
      quickLinksHtml += '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 12px;">Aucun raccourci pour le moment.</div>';
    } else {
      (state.config.quickLinks || []).forEach((link, idx) => {
        quickLinksHtml += `
          <div class="settings-list-item">
            <div class="settings-item-info">
              <span class="settings-item-abbr">${link.abbr || 'LN'}</span>
              <div class="settings-item-text">
                <span class="settings-item-title">${link.title}</span>
                <span class="settings-item-sub">${link.url}</span>
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-icon-secondary btn-edit-quicklink" data-idx="${idx}" title="Éditer le raccourci"><i class="fa-solid fa-pen-to-square"></i></button>
              <button type="button" class="btn-icon-danger btn-del-quicklink" data-idx="${idx}" title="Supprimer le raccourci"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `;
      });
    }
    quickLinksHtml += '</div>';
    quickLinksHtml += `
      <div style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 10px;">
        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: var(--accent-cyan);"><i class="fa-solid fa-plus"></i> Ajouter un Raccourci au Dock</h4>
        <div style="display: grid; grid-template-columns: 2fr 3fr 1fr; gap: 8px;">
          <input type="text" id="add-link-title" class="form-input" placeholder="Titre (ex: Freebox)">
          <input type="url" id="add-link-url" class="form-input" placeholder="https://...">
          <input type="text" id="add-link-abbr" class="form-input" placeholder="Tag (ex: FO)" maxlength="3">
        </div>
        <button type="button" class="btn-primary" id="btn-add-quicklink-action" style="margin-top: 10px; padding: 8px 16px; font-size: 13px;">Ajouter le Raccourci</button>
      </div>
    `;

    // Build Services List HTML
    let servicesHtml = '<div class="settings-item-list">';
    let totalServices = 0;
    (state.config.categories || []).forEach((cat) => {
      (cat.services || []).forEach((serv) => {
        totalServices++;
        servicesHtml += `
          <div class="settings-list-item">
            <div class="settings-item-info">
              ${renderIconHtml(serv.icon)}
              <div class="settings-item-text">
                <span class="settings-item-title">${serv.name} <small style="color: var(--text-muted);">(${cat.name})</small></span>
                <span class="settings-item-sub">${serv.url}</span>
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-icon-secondary btn-edit-service" data-cat-id="${cat.id}" data-serv-id="${serv.id}" title="Éditer le service"><i class="fa-solid fa-pen-to-square"></i></button>
              <button type="button" class="btn-icon-danger btn-del-service" data-cat-id="${cat.id}" data-serv-id="${serv.id}" title="Supprimer le service"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `;
      });
    });
    servicesHtml += '</div>';

    let catOptionsServices = '';
    (state.config?.categories || []).forEach(cat => {
      catOptionsServices += `<option value="${cat.id}">${cat.name}</option>`;
    });

    servicesHtml += `
      <div style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 10px;">
        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: var(--accent-cyan);"><i class="fa-solid fa-plus"></i> Ajouter un Nouveau Service</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <input type="text" id="add-serv-name" class="form-input" placeholder="Nom (ex: Portainer)">
          <input type="url" id="add-serv-url" class="form-input" placeholder="URL (ex: http://192.168.1.200:9000)">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
          <select id="add-serv-cat" class="form-select">${catOptionsServices}</select>
          <input type="text" id="add-serv-icon" class="form-input" placeholder="Icône (ex: container)">
        </div>
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-top: 8px;">
          <input type="text" id="add-serv-desc" class="form-input" placeholder="Description">
          <input type="text" id="add-serv-tag" class="form-input" placeholder="Tag (ex: Docker)">
        </div>
        <button type="button" class="btn-primary" id="btn-add-service-action" style="margin-top: 10px; padding: 8px 16px; font-size: 13px;">Ajouter le Service</button>
      </div>
    `;

    // Build Categories List HTML
    let categoriesHtml = '<div class="settings-item-list">';
    const totalCats = (state.config.categories || []).length;
    (state.config.categories || []).forEach((cat, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === totalCats - 1;
      categoriesHtml += `
        <div class="settings-list-item">
          <div class="settings-item-info">
            ${renderIconHtml(cat.icon)}
            <div class="settings-item-text">
              <span class="settings-item-title">${cat.name}</span>
              <span class="settings-item-sub">${(cat.services || []).length} services inclus</span>
            </div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn-icon-secondary btn-move-cat-up" data-cat-idx="${idx}" ${isFirst ? 'disabled style="opacity:0.3; cursor:default;"' : ''} title="Monter la catégorie"><i class="fa-solid fa-arrow-up"></i></button>
            <button type="button" class="btn-icon-secondary btn-move-cat-down" data-cat-idx="${idx}" ${isLast ? 'disabled style="opacity:0.3; cursor:default;"' : ''} title="Descendre la catégorie"><i class="fa-solid fa-arrow-down"></i></button>
            <button type="button" class="btn-icon-secondary btn-edit-category" data-cat-id="${cat.id}" title="Éditer la catégorie"><i class="fa-solid fa-pen-to-square"></i></button>
            <button type="button" class="btn-icon-danger btn-del-category" data-cat-id="${cat.id}" title="Supprimer la catégorie"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    });
    categoriesHtml += '</div>';
    categoriesHtml += `
      <div style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 10px;">
        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: var(--accent-cyan);"><i class="fa-solid fa-plus"></i> Créer une Nouvelle Catégorie</h4>
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
          <input type="text" id="add-cat-name" class="form-input" placeholder="Nom (ex: Domotique)">
          <input type="text" id="add-cat-icon" class="form-input" placeholder="Icône (ex: home)">
        </div>
        <button type="button" class="btn-primary" id="btn-add-category-action" style="margin-top: 10px; padding: 8px 16px; font-size: 13px;">Créer la Catégorie</button>
      </div>
    `;

    const html = `
      <div class="settings-nav-tabs">
        <button type="button" class="tab-btn ${activeTabId === 'tab-general' ? 'active' : ''}" data-tab="tab-general"><i class="fa-solid fa-sliders"></i> Général</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-categories' ? 'active' : ''}" data-tab="tab-categories"><i class="fa-solid fa-folder-tree"></i> Catégories (${(state.config.categories || []).length})</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-services' ? 'active' : ''}" data-tab="tab-services"><i class="fa-solid fa-list-check"></i> Services (${totalServices})</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-quicklinks' ? 'active' : ''}" data-tab="tab-quicklinks"><i class="fa-solid fa-bookmark"></i> Raccourcis (${(state.config.quickLinks || []).length})</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-weather' ? 'active' : ''}" data-tab="tab-weather"><i class="fa-solid fa-cloud-sun"></i> Météo</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-security' ? 'active' : ''}" data-tab="tab-security"><i class="fa-solid fa-user-shield"></i> Sécurité</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-theme' ? 'active' : ''}" data-tab="tab-theme"><i class="fa-solid fa-palette"></i> Thème</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-exportimport' ? 'active' : ''}" data-tab="tab-exportimport"><i class="fa-solid fa-file-export"></i> Import / Export</button>
        <button type="button" class="tab-btn ${activeTabId === 'tab-json' ? 'active' : ''}" data-tab="tab-json"><i class="fa-solid fa-code"></i> Code JSON</button>
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-general' ? 'active' : ''}" id="tab-general">
        <div class="form-group">
          <label>Titre du Dashboard</label>
          <input type="text" id="cfg-title" class="form-input" value="${state.config.settings?.title || ''}">
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <label>Sous-Titre</label>
          <input type="text" id="cfg-subtitle" class="form-input" value="${state.config.settings?.subtitle || ''}">
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <label>Favicon / Logo URL</label>
          <input type="text" id="cfg-favicon" class="form-input" value="${state.config.settings?.favicon || ''}">
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <label>Ouverture des Liens</label>
          <select id="cfg-target" class="form-select">
            <option value="_self" ${state.config.settings?.openTargetBlank ? '' : 'selected'}>Même onglet (_self)</option>
            <option value="_blank" ${state.config.settings?.openTargetBlank ? 'selected' : ''}>Nouvel onglet (_blank)</option>
          </select>
        </div>
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-categories' ? 'active' : ''}" id="tab-categories">
        ${categoriesHtml}
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-services' ? 'active' : ''}" id="tab-services">
        ${servicesHtml}
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-quicklinks' ? 'active' : ''}" id="tab-quicklinks">
        ${quickLinksHtml}
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-weather' ? 'active' : ''}" id="tab-weather">
        <div class="form-group">
          <label>Ville Météo (ex: Brest,fr)</label>
          <input type="text" id="cfg-weather-city" class="form-input" value="${state.config.settings?.weatherCity || 'Brest,fr'}">
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <label>Clé API OpenWeatherMap</label>
          <input type="text" id="cfg-weather-key" class="form-input" value="${state.config.settings?.weatherApiKey || ''}">
        </div>
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-security' ? 'active' : ''}" id="tab-security">
        <div class="form-group">
          <label>Identifiant de Connexion</label>
          <input type="text" id="cfg-auth-user" class="form-input" value="${state.config.auth?.user || 'admin'}" autocomplete="off">
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <label>Nouveau Mot de Passe (Laissez vide pour conserver l'actuel)</label>
          <input type="password" id="cfg-auth-pass" class="form-input" placeholder="••••••••" autocomplete="new-password">
        </div>
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-theme' ? 'active' : ''}" id="tab-theme">
        <div class="theme-options">
          <div class="theme-card ${currentTheme === 'dark-neon' ? 'active' : ''}" data-theme-id="dark-neon">
            <span>Dark Neon (Cyan & Violet)</span>
            <div class="theme-preview">
              <span class="theme-dot" style="background: #00f2fe"></span>
              <span class="theme-dot" style="background: #7f00ff"></span>
            </div>
          </div>
          <div class="theme-card ${currentTheme === 'cyber-emerald' ? 'active' : ''}" data-theme-id="cyber-emerald">
            <span>Cyber Emerald (Vert Menthe)</span>
            <div class="theme-preview">
              <span class="theme-dot" style="background: #00e676"></span>
              <span class="theme-dot" style="background: #00b0ff"></span>
            </div>
          </div>
          <div class="theme-card ${currentTheme === 'deep-space' ? 'active' : ''}" data-theme-id="deep-space">
            <span>Deep Space (Violet & Magenta)</span>
            <div class="theme-preview">
              <span class="theme-dot" style="background: #7f00ff"></span>
              <span class="theme-dot" style="background: #e100ff"></span>
            </div>
          </div>
          <div class="theme-card ${currentTheme === 'sunset-amber' ? 'active' : ''}" data-theme-id="sunset-amber">
            <span>Sunset Amber (Or & Corail)</span>
            <div class="theme-preview">
              <span class="theme-dot" style="background: #ffab00"></span>
              <span class="theme-dot" style="background: #ff3d00"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-exportimport' ? 'active' : ''}" id="tab-exportimport">
        <div style="display: flex; flex-direction: column; gap: 16px; padding: 6px 0;">
          <div style="padding: 16px; background: rgba(0, 242, 254, 0.05); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(0, 242, 254, 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-cyan); flex-shrink: 0;">
                <i class="fa-solid fa-file-arrow-down" style="font-size: 18px;"></i>
              </div>
              <div>
                <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">Exporter la Sauvegarde (JSON)</h4>
                <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">Téléchargez un fichier de sauvegarde contenant vos catégories, cartes de services, icônes et préférences.</p>
              </div>
            </div>
            <div style="margin-top: 14px; text-align: right;">
              <button type="button" class="btn-primary" id="btn-export-json-file" style="padding: 8px 18px; font-size: 13px;">
                <i class="fa-solid fa-file-download"></i> Exporter la configuration (.json)
              </button>
            </div>
          </div>

          <div style="padding: 16px; background: rgba(127, 0, 255, 0.05); border: 1px solid rgba(127, 0, 255, 0.2); border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(127, 0, 255, 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-violet); flex-shrink: 0;">
                <i class="fa-solid fa-file-arrow-up" style="font-size: 18px;"></i>
              </div>
              <div>
                <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">Importer une Sauvegarde (JSON)</h4>
                <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">Restaurez votre tableau de bord à partir d'un fichier `.json` précédemment exporté.</p>
              </div>
            </div>
            <div style="margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
              <input type="file" id="inp-import-file" accept=".json" style="display: none;">
              <button type="button" class="btn-secondary" id="btn-trigger-import-file" style="padding: 8px 16px; font-size: 13px;">
                <i class="fa-solid fa-folder-open"></i> Choisir un fichier JSON...
              </button>
              <span id="import-file-name" style="font-size: 12px; color: var(--text-muted); font-style: italic;">Aucun fichier sélectionné</span>
              <button type="button" class="btn-success" id="btn-apply-import-file" style="padding: 8px 16px; font-size: 13px;" disabled>
                <i class="fa-solid fa-check"></i> Importer & Appliquer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-tab-panel ${activeTabId === 'tab-json' ? 'active' : ''}" id="tab-json">
        <div class="form-group">
          <label>Code JSON Brut</label>
          <textarea id="inp-raw-json" class="form-textarea" rows="14" style="font-family: var(--font-mono); font-size: 12px;">${jsonStr}</textarea>
        </div>
      </div>
    `;

    openModal('Centre de Paramètres', html, 'settings-center');

    // Tab switcher events (CSS Class Toggling)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTabId = btn.getAttribute('data-tab');

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPanel = document.getElementById(targetTabId);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });

    // Theme selector click events
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', async () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const themeId = card.getAttribute('data-theme-id');
        if (!state.config.settings) state.config.settings = {};
        state.config.settings.theme = themeId;
        document.documentElement.setAttribute('data-theme', themeId);
        await saveConfigToServer();
        renderDashboard();
      });
    });

    // Export JSON File Event
    const btnExport = document.getElementById('btn-export-json-file');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        try {
          const configCopy = JSON.parse(JSON.stringify(state.config));
          const jsonStr = JSON.stringify(configCopy, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateStr = new Date().toISOString().slice(0, 10);
          a.href = url;
          a.download = `dashmax-config-${dateStr}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          alert("Erreur d'exportation: " + err.message);
        }
      });
    }

    // Import JSON File Events
    const inpImportFile = document.getElementById('inp-import-file');
    const btnTriggerImport = document.getElementById('btn-trigger-import-file');
    const btnApplyImport = document.getElementById('btn-apply-import-file');
    const lblFileName = document.getElementById('import-file-name');

    if (btnTriggerImport && inpImportFile) {
      btnTriggerImport.addEventListener('click', () => {
        inpImportFile.click();
      });

      inpImportFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (lblFileName) lblFileName.textContent = file.name;
          if (btnApplyImport) btnApplyImport.disabled = false;
        } else {
          if (lblFileName) lblFileName.textContent = 'Aucun fichier sélectionné';
          if (btnApplyImport) btnApplyImport.disabled = true;
        }
      });
    }

    if (btnApplyImport && inpImportFile) {
      btnApplyImport.addEventListener('click', async () => {
        const file = inpImportFile.files[0];
        if (!file) return;

        btnApplyImport.disabled = true;
        btnApplyImport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importation...';

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const importedConfig = JSON.parse(e.target.result);
            if (typeof importedConfig !== 'object' || importedConfig === null) {
              throw new Error("Format JSON invalide.");
            }

            const data = await safeFetchJson('/api/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(importedConfig)
            });

            if (data.status === 'success' || data.config) {
              state.config = data.config || importedConfig;
              closeModal();
              renderDashboard();
              alert("Configuration DashMax importée et appliquée avec succès !");
            } else {
              alert("Échec de l'importation de la configuration.");
            }
          } catch (err) {
            alert("Erreur lors de l'importation: " + err.message);
          } finally {
            btnApplyImport.disabled = false;
            btnApplyImport.innerHTML = '<i class="fa-solid fa-check"></i> Importer & Appliquer';
          }
        };
        reader.readAsText(file, 'UTF-8');
      });
    }

    // Move Category Up event
    document.querySelectorAll('.btn-move-cat-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-cat-idx'));
        if (idx > 0 && state.config.categories) {
          const temp = state.config.categories[idx];
          state.config.categories[idx] = state.config.categories[idx - 1];
          state.config.categories[idx - 1] = temp;
          await saveConfigToServer();
          renderDashboard();
          renderSettingsCenterModal('tab-categories');
        }
      });
    });

    // Move Category Down event
    document.querySelectorAll('.btn-move-cat-down').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-cat-idx'));
        if (idx < state.config.categories.length - 1 && state.config.categories) {
          const temp = state.config.categories[idx];
          state.config.categories[idx] = state.config.categories[idx + 1];
          state.config.categories[idx + 1] = temp;
          await saveConfigToServer();
          renderDashboard();
          renderSettingsCenterModal('tab-categories');
        }
      });
    });

    // Add Category event
    const btnAddCategory = document.getElementById('btn-add-category-action');
    if (btnAddCategory) {
      btnAddCategory.addEventListener('click', async () => {
        const name = document.getElementById('add-cat-name').value.trim();
        const icon = document.getElementById('add-cat-icon').value.trim() || 'folder';

        if (!name) {
          alert('Veuillez spécifier un nom de catégorie.');
          return;
        }

        const newCat = {
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          icon,
          services: []
        };

        if (!state.config.categories) state.config.categories = [];
        state.config.categories.push(newCat);
        await saveConfigToServer();
        renderDashboard();
        renderSettingsCenterModal('tab-categories');
      });
    }

    // Edit Category event
    document.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat-id');
        openEditCategoryModal(catId);
      });
    });

    // Delete Category event
    document.querySelectorAll('.btn-del-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catId = btn.getAttribute('data-cat-id');
        if (confirm('Voulez-vous vraiment supprimer cette catégorie et tous ses services ?')) {
          state.config.categories = (state.config.categories || []).filter(c => c.id !== catId);
          await saveConfigToServer();
          renderDashboard();
          renderSettingsCenterModal('tab-categories');
        }
      });
    });

    // Add Quick Link event
    const btnAddQuickLink = document.getElementById('btn-add-quicklink-action');
    if (btnAddQuickLink) {
      btnAddQuickLink.addEventListener('click', async () => {
        const title = document.getElementById('add-link-title').value.trim();
        const url = document.getElementById('add-link-url').value.trim();
        const abbr = document.getElementById('add-link-abbr').value.trim() || title.substring(0, 2).toUpperCase();

        if (!title || !url) {
          alert('Veuillez renseigner au moins le titre et l\'URL.');
          return;
        }

        if (!state.config.quickLinks) state.config.quickLinks = [];
        state.config.quickLinks.push({ title, url, abbr, target: '_self' });
        await saveConfigToServer();
        renderDashboard();
        renderSettingsCenterModal('tab-quicklinks');
      });
    }

    // Edit Quick Link event
    document.querySelectorAll('.btn-edit-quicklink').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        openEditQuicklinkModal(idx);
      });
    });

    // Delete Quick Link event
    document.querySelectorAll('.btn-del-quicklink').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (!isNaN(idx)) {
          state.config.quickLinks.splice(idx, 1);
          await saveConfigToServer();
          renderDashboard();
          renderSettingsCenterModal('tab-quicklinks');
        }
      });
    });

    // Edit Service event
    document.querySelectorAll('.btn-edit-service').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat-id');
        const servId = btn.getAttribute('data-serv-id');
        openEditServiceModal(catId, servId);
      });
    });

    // Delete Service event
    document.querySelectorAll('.btn-del-service').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catId = btn.getAttribute('data-cat-id');
        const servId = btn.getAttribute('data-serv-id');
        const cat = (state.config.categories || []).find(c => c.id === catId);
        if (cat) {
          cat.services = (cat.services || []).filter(s => s.id !== servId);
          await saveConfigToServer();
          renderDashboard();
          renderSettingsCenterModal('tab-services');
        }
      });
    });

    // Add Service Action event in tab-services
    const btnAddServiceAction = document.getElementById('btn-add-service-action');
    if (btnAddServiceAction) {
      btnAddServiceAction.addEventListener('click', async () => {
        const name = document.getElementById('add-serv-name').value.trim();
        const url = document.getElementById('add-serv-url').value.trim();
        const catId = document.getElementById('add-serv-cat').value;
        const icon = document.getElementById('add-serv-icon').value.trim() || 'container';
        const description = document.getElementById('add-serv-desc').value.trim();
        const tag = document.getElementById('add-serv-tag').value.trim() || 'Service';

        if (!name || !url) {
          alert('Veuillez remplir au moins le nom et l\'URL du service.');
          return;
        }

        const newServ = {
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          url,
          pingUrl: url,
          icon,
          description,
          tag,
          target: '_self'
        };

        const targetCat = (state.config.categories || []).find(c => c.id === catId);
        if (targetCat) {
          if (!targetCat.services) targetCat.services = [];
          targetCat.services.push(newServ);
          await saveConfigToServer();
          renderDashboard();
          renderSettingsCenterModal('tab-services');
        }
      });
    }
  }

  function openEditQuicklinkModal(idx) {
    const link = (state.config.quickLinks || [])[idx];
    if (!link) return;

    const html = `
      <div class="form-group">
        <label>Titre du Raccourci</label>
        <input type="text" id="edit-link-title" class="form-input" value="${link.title}">
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>URL d'accès</label>
        <input type="url" id="edit-link-url" class="form-input" value="${link.url}">
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>Sigle / Monogramme (2-3 lettres, ex: FO)</label>
        <input type="text" id="edit-link-abbr" class="form-input" value="${link.abbr || ''}" maxlength="3">
      </div>
    `;

    state.editingQuicklinkIdx = idx;
    openModal(`Éditer le Raccourci: ${link.title}`, html, 'edit-quicklink');
  }

  function openEditCategoryModal(catId) {
    const cat = (state.config.categories || []).find(c => c.id === catId);
    if (!cat) return;

    const html = `
      <div class="form-group">
        <label>Nom de la Catégorie</label>
        <input type="text" id="edit-cat-name" class="form-input" value="${cat.name}">
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>Icône (ex: hard-drive, home, film, download-cloud, server, shield, camera)</label>
        <input type="text" id="edit-cat-icon" class="form-input" value="${cat.icon || ''}">
      </div>
    `;

    state.editingCatId = catId;
    openModal(`Éditer la Catégorie: ${cat.name}`, html, 'edit-category');
  }

  function openEditServiceModal(catId, servId) {
    const cat = (state.config.categories || []).find(c => c.id === catId);
    if (!cat) return;
    const serv = (cat.services || []).find(s => s.id === servId);
    if (!serv) return;

    let catOptions = '';
    (state.config?.categories || []).forEach(c => {
      const sel = c.id === catId ? 'selected' : '';
      catOptions += `<option value="${c.id}" ${sel}>${c.name}</option>`;
    });

    const html = `
      <div class="form-group">
        <label>Nom du Service</label>
        <input type="text" id="edit-serv-name" class="form-input" value="${serv.name}">
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>URL d'accès</label>
        <input type="url" id="edit-serv-url" class="form-input" value="${serv.url}">
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>Catégorie</label>
        <select id="edit-serv-cat" class="form-select">${catOptions}</select>
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>Icône (ex: container, hard-drive, ou URL PNG CDN)</label>
        <input type="text" id="edit-serv-icon" class="form-input" value="${serv.icon || ''}">
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>Description</label>
        <input type="text" id="edit-serv-desc" class="form-input" value="${serv.description || ''}">
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>Tag / Badge</label>
        <input type="text" id="edit-serv-tag" class="form-input" value="${serv.tag || ''}">
      </div>
    `;

    state.editingTarget = { oldCatId: catId, servId: servId };
    openModal(`Éditer le Service: ${serv.name}`, html, 'edit-service');
  }

  // Save Modal Action Handler
  btnSaveModal.addEventListener('click', async () => {
    if (state.activeModalMode === 'edit-quicklink') {
      const idx = state.editingQuicklinkIdx;
      const title = document.getElementById('edit-link-title').value.trim();
      const url = document.getElementById('edit-link-url').value.trim();
      const abbr = document.getElementById('edit-link-abbr').value.trim() || title.substring(0, 2).toUpperCase();

      if (!title || !url) {
        alert('Veuillez renseigner au moins le titre et l\'URL.');
        return;
      }

      if (state.config.quickLinks && state.config.quickLinks[idx] !== undefined) {
        state.config.quickLinks[idx] = {
          ...state.config.quickLinks[idx],
          title,
          url,
          abbr
        };
        await saveConfigToServer();
        renderDashboard();
        renderSettingsCenterModal('tab-quicklinks');
      }
      closeModal();
    }
    else if (state.activeModalMode === 'edit-category') {
      const catId = state.editingCatId;
      const newName = document.getElementById('edit-cat-name').value.trim();
      const newIcon = document.getElementById('edit-cat-icon').value.trim();

      if (!newName) {
        alert('Veuillez spécifier un nom de catégorie.');
        return;
      }

      const cat = (state.config.categories || []).find(c => c.id === catId);
      if (cat) {
        cat.name = newName;
        cat.icon = newIcon;
        await saveConfigToServer();
        renderDashboard();
        renderSettingsCenterModal('tab-categories');
      }
      closeModal();
    }
    else if (state.activeModalMode === 'edit-service') {
      const { oldCatId, servId } = state.editingTarget || {};
      const newName = document.getElementById('edit-serv-name').value.trim();
      const newUrl = document.getElementById('edit-serv-url').value.trim();
      const newCatId = document.getElementById('edit-serv-cat').value;
      const newIcon = document.getElementById('edit-serv-icon').value.trim();
      const newDesc = document.getElementById('edit-serv-desc').value.trim();
      const newTag = document.getElementById('edit-serv-tag').value.trim();

      if (!newName || !newUrl) {
        alert('Veuillez remplir au moins le nom et l\'URL.');
        return;
      }

      const oldCat = (state.config.categories || []).find(c => c.id === oldCatId);
      if (oldCat) {
        const servIdx = (oldCat.services || []).findIndex(s => s.id === servId);
        if (servIdx !== -1) {
          const updatedServ = {
            ...oldCat.services[servIdx],
            name: newName,
            url: newUrl,
            pingUrl: newUrl,
            icon: newIcon,
            description: newDesc,
            tag: newTag
          };

          if (oldCatId === newCatId) {
            oldCat.services[servIdx] = updatedServ;
          } else {
            oldCat.services.splice(servIdx, 1);
            const newCat = (state.config.categories || []).find(c => c.id === newCatId);
            if (newCat) {
              if (!newCat.services) newCat.services = [];
              newCat.services.push(updatedServ);
            }
          }

          await saveConfigToServer();
          renderDashboard();
          renderSettingsCenterModal('tab-services');
        }
      }
      closeModal();
    }
    else if (state.activeModalMode === 'settings-center') {
      const activeTabBtn = document.querySelector('.tab-btn.active');
      const activeTabId = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : '';

      if (activeTabId === 'tab-json') {
        try {
          const newJson = JSON.parse(document.getElementById('inp-raw-json').value);
          state.config = newJson;
        } catch (err) {
          alert('Erreur dans la syntaxe JSON : ' + err.message);
          return;
        }
      } else {
        // Read form values
        const title = document.getElementById('cfg-title')?.value.trim();
        const subtitle = document.getElementById('cfg-subtitle')?.value.trim();
        const favicon = document.getElementById('cfg-favicon')?.value.trim();
        const target = document.getElementById('cfg-target')?.value;
        const weatherCity = document.getElementById('cfg-weather-city')?.value.trim();
        const weatherKey = document.getElementById('cfg-weather-key')?.value.trim();
        const authUser = document.getElementById('cfg-auth-user')?.value.trim();
        const authPass = document.getElementById('cfg-auth-pass')?.value.trim();
        const selectedTheme = document.querySelector('.theme-card.active')?.getAttribute('data-theme-id');

        if (!state.config.settings) state.config.settings = {};
        if (title) state.config.settings.title = title;
        if (subtitle) state.config.settings.subtitle = subtitle;
        if (favicon) state.config.settings.favicon = favicon;
        state.config.settings.openTargetBlank = (target === '_blank');
        if (weatherCity) state.config.settings.weatherCity = weatherCity;
        if (weatherKey) state.config.settings.weatherApiKey = weatherKey;
        if (selectedTheme) state.config.settings.theme = selectedTheme;

        if (!state.config.auth) state.config.auth = { enabled: true };
        if (authUser) state.config.auth.user = authUser;
        if (authPass) state.config.auth.password = authPass;
      }

      await saveConfigToServer();
      renderDashboard();
      fetchWeather();
      closeModal();
    }
    else if (state.activeModalMode === 'add-service') {
      const name = document.getElementById('inp-serv-name').value.trim();
      const url = document.getElementById('inp-serv-url').value.trim();
      const catId = document.getElementById('inp-serv-cat').value;
      const icon = document.getElementById('inp-serv-icon').value.trim() || 'container';
      const description = document.getElementById('inp-serv-desc').value.trim();
      const tag = document.getElementById('inp-serv-tag').value.trim() || 'Service';

      if (!name || !url) {
        alert('Veuillez remplir au moins le nom et l\'URL du service.');
        return;
      }

      const newService = {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name,
        url,
        pingUrl: url,
        icon,
        description,
        tag,
        target: '_self'
      };

      const category = state.config.categories.find(c => c.id === catId);
      if (category) {
        category.services.push(newService);
        await saveConfigToServer();
        renderDashboard();
      }
      closeModal();
    }
  });

  async function saveConfigToServer() {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.config)
      });
    } catch (e) {
      console.error("Error saving config:", e);
    }
  }

  async function fetchWeather() {
    try {
      const res = await fetch('/api/weather');
      if (!res.ok) return;
      const data = await res.json();
      const tempEl = document.getElementById('weather-temp');
      const cityEl = document.getElementById('weather-city');
      const iconEl = document.getElementById('weather-icon');
      if (tempEl) tempEl.textContent = `${data.temp}°C`;
      if (cityEl) cityEl.textContent = data.city;
      if (iconEl && data.icon) {
        iconEl.src = `https://openweathermap.org/img/wn/${data.icon}.png`;
      }
    } catch (e) {
      console.error("Weather fetch error:", e);
    }
  }

  // --- 6. Auth Status & Login Handlers ---
  const loginOverlay = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const btnLogout = document.getElementById('btn-logout');

  async function checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        if (data.auth_enabled && !data.authenticated) {
          showLoginScreen();
          return false;
        } else {
          hideLoginScreen();
          return true;
        }
      }
    } catch (e) {
      console.error("Auth status check error:", e);
    }
    return true;
  }

  function showLoginScreen() {
    if (!loginOverlay) return;
    loginOverlay.innerHTML = `
      <div class="login-box">
        <div class="login-header">
          <div class="login-logo">
            <i class="fa-solid fa-server"></i>
          </div>
          <h2>Synology Maison</h2>
          <p>Connexion requise pour accéder au dashboard</p>
        </div>

        <form id="login-form" autocomplete="off">
          <div class="form-group">
            <label><i class="fa-solid fa-user"></i> Identifiant</label>
            <input type="text" id="login-user" class="form-input" placeholder="Identifiant" required autocomplete="off">
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-lock"></i> Mot de passe</label>
            <div class="password-input-group">
              <input type="password" id="login-pass" class="form-input" placeholder="••••••••" required autocomplete="new-password">
              <button type="button" class="btn-toggle-pass" id="btn-toggle-pass" title="Afficher / Masquer"><i class="fa-solid fa-eye"></i></button>
            </div>
          </div>
          <div class="login-error-msg" id="login-error" style="display: none;"></div>
          <button type="submit" class="btn-primary btn-login-submit" id="btn-submit-login">
            <span>Se Connecter</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      </div>
    `;

    loginOverlay.classList.add('active');

    // Attach form submit handler
    const form = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-user').value.trim();
        const password = document.getElementById('login-pass').value.trim();

        if (loginError) loginError.style.display = 'none';

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          if (res.ok) {
            hideLoginScreen();
            initApp();
          } else {
            const data = await res.json();
            if (loginError) {
              loginError.textContent = data.message || 'Identifiants incorrects';
              loginError.style.display = 'block';
            }
          }
        } catch (err) {
          if (loginError) {
            loginError.textContent = 'Erreur de connexion au serveur';
            loginError.style.display = 'block';
          }
        }
      });
    }

    const btnTogglePass = document.getElementById('btn-toggle-pass');
    if (btnTogglePass) {
      btnTogglePass.addEventListener('click', () => {
        const passInp = document.getElementById('login-pass');
        if (passInp) {
          const isPass = passInp.type === 'password';
          passInp.type = isPass ? 'text' : 'password';
          btnTogglePass.innerHTML = `<i class="fa-solid fa-${isPass ? 'eye-slash' : 'eye'}"></i>`;
        }
      });
    }
  }

  function hideLoginScreen() {
    if (loginOverlay) {
      loginOverlay.classList.remove('active');
      loginOverlay.innerHTML = '';
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        showLoginScreen();
      } catch (e) {
        console.error("Logout error:", e);
      }
    });
  }

  // --- 7. Application Initialization ---
  async function initApp() {
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) return;

    initBackgroundMesh();
    initCharts();

    const btnToggleMetrics = document.getElementById('btn-toggle-metrics');
    if (btnToggleMetrics) {
      btnToggleMetrics.addEventListener('click', () => {
        const metricsSection = document.getElementById('metrics-section');
        metricsSection.classList.toggle('collapsed');
      });
    }

    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        state.config = await res.json();
        renderDashboard();
      }
    } catch (e) {
      console.error("Config fetch error:", e);
    }

    // Start background loops
    updateClock();
    setInterval(updateClock, 1000);
    fetchMetrics();
    fetchWeather();
    pingAllServices();
    setInterval(fetchMetrics, 1000); // Fast 1-second real-time CPU & Network refresh
    setInterval(fetchWeather, 600000); // 10 mins weather refresh
    setInterval(pingAllServices, 5000); // Fast 5-second service pings
  }

  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;

    const brandTimeEl = document.getElementById('brand-clock-time');
    const brandDateEl = document.getElementById('brand-clock-date');
    if (brandTimeEl) brandTimeEl.textContent = timeStr;
    if (brandDateEl) brandDateEl.textContent = dateStr;
  }

  initApp();
});
