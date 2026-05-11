/**
 * Bottom Navigation module — mobile navigation bar with 4 tabs.
 * Handles view switching between Dashboard, Routines, Stats, and Settings.
 */

// ============================================================
// INTERNAL STATE
// ============================================================

let activeTab = 'practice';

/**
 * Update the visual active state of bottom nav tabs + internal tracking.
 * Does NOT perform any view switching — purely cosmetic.
 */
export function setActiveTab(tabName) {
  document.querySelectorAll('.bottom-nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  activeTab = tabName;
}

/**
 * Get the currently active tab name.
 */
export function getActiveTab() {
  return activeTab;
}

// ============================================================
// VIEW HELPERS
// ============================================================

function hideAllViews() {
  const views = ['dashboard-view', 'details-view', 'stats-view', 'routines-view', 'settings-view', 'history-view'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
}

// ============================================================
// TAB SWITCHING (visual + view logic)
// ============================================================

export async function activateTab(tabName) {
  if (activeTab === tabName) {
    // Tapping same tab: for practice/stats, scroll to top; for routines/settings already handled
    if (tabName === 'practice') {
      const el = document.getElementById('exercise-list');
      if (el) el.scrollTop = 0;
    }
    if (tabName === 'stats') {
      const el = document.getElementById('stats-view');
      if (el) el.scrollTop = 0;
    }
    return;
  }

  // Update tab highlight
  setActiveTab(tabName);

  switch (tabName) {
    case 'practice':
      hideAllViews();
      const dashboardView = document.getElementById('dashboard-view');
      if (dashboardView) dashboardView.classList.add('active');
      import('./dashboard.js').then(m => m.updateUI());
      break;

    case 'routines':
      hideAllViews();
      const routinesView = document.getElementById('routines-view');
      if (routinesView) {
        routinesView.classList.add('active');
        import('./routines.js').then(m => m.renderRoutines());
      }
      break;

    case 'history':
      hideAllViews();
      const historyView = document.getElementById('history-view');
      if (historyView) {
        historyView.classList.add('active');
        import('./history.js').then(m => m.renderHistory());
      }
      break;

    case 'stats':
      hideAllViews();
      const statsView = document.getElementById('stats-view');
      if (statsView) statsView.classList.add('active');
      import('./stats.js').then(m => m.renderStats());
      break;

    case 'settings':
      hideAllViews();
      const settingsView = document.getElementById('settings-view');
      if (settingsView) {
        settingsView.classList.add('active');
        import('./settings.js').then(m => m.renderSettings());
      }
      break;
  }
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupBottomNav() {
  document.querySelectorAll('.bottom-nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.tab);
    });
  });
}
