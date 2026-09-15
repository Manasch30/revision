/**
 * Adaptive Spaced Revision — Application Logic & Storage Engine
 * Based on ADAPTIVE_REVISION_BUILD_SPEC.md
 */

// ==========================================================================
// 1. Constants & Default State
// ==========================================================================

const STORAGE_KEY_TOPICS = 'spaced_revision_topics_v1';
const STORAGE_KEY_SUBJECTS = 'spaced_revision_subjects_v1';
const STORAGE_KEY_SETTINGS = 'spaced_revision_settings_v1';

const SUBJECT_COLORS = [
  '#10b981', // Emerald Green
  '#6366f1', // Indigo / Purple-Blue
  '#f59e0b', // Amber / Warm Gold
  '#ef4444', // Crimson Red
  '#06b6d4', // Vibrant Cyan
  '#8b5cf6', // Violet
  '#ec4899', // Vivid Pink
  '#f97316', // Bright Orange
  '#14b8a6', // Persian Teal
  '#3b82f6', // Sky Blue
  '#84cc16', // Lime
  '#a855f7'  // Deep Purple
];

// Seed data provided so the app is immediately demonstrative on first visit
const DEFAULT_SUBJECTS = [
  { id: 'subj_bio', name: 'Biology', color: '#10b981', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'subj_cs', name: 'Computer Science', color: '#6366f1', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'subj_hist', name: 'History', color: '#f59e0b', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() }
];

function generateDefaultTopics() {
  const now = new Date();
  const nowMs = now.getTime();

  const today7PM = new Date(now);
  today7PM.setHours(19, 0, 0, 0);

  const tomorrow7PM = new Date(now);
  tomorrow7PM.setDate(tomorrow7PM.getDate() + 1);
  tomorrow7PM.setHours(19, 0, 0, 0);

  const day3_7PM = new Date(now);
  day3_7PM.setDate(day3_7PM.getDate() + 3);
  day3_7PM.setHours(19, 0, 0, 0);

  return [
    {
      id: 'top_cell',
      subjectId: 'subj_bio',
      name: 'Cell Structure & Organelles',
      completedAt: new Date(nowMs - 165 * 60000).toISOString(), // learned ~2.75 hrs ago
      intervalMin: 150, // Within 3 hrs
      nextAt: new Date(nowMs - 15 * 60000).toISOString(), // due 15 min ago (Due Now!)
      reviews: []
    },
    {
      id: 'top_binary_tree',
      subjectId: 'subj_cs',
      name: 'Binary Search Trees & Balancing',
      completedAt: new Date(nowMs - 300 * 60000).toISOString(), // learned earlier today
      intervalMin: 360,
      nextAt: today7PM.toISOString(), // Due this evening at 7:00 PM (End of day)
      reviews: [
        {
          id: 'rev_demo_1',
          scheduledAt: new Date(nowMs - 150 * 60000).toISOString(),
          intervalMin: 150,
          doneAt: new Date(nowMs - 148 * 60000).toISOString()
        }
      ]
    },
    {
      id: 'top_revolution',
      subjectId: 'subj_hist',
      name: 'Causes of French Revolution',
      completedAt: new Date(nowMs - 86400000).toISOString(),
      intervalMin: 1440,
      nextAt: tomorrow7PM.toISOString(), // Due tomorrow at 7:00 PM (Day 1)
      reviews: [
        {
          id: 'rev_demo_2',
          scheduledAt: new Date(nowMs - 86400000 + 150 * 60000).toISOString(),
          intervalMin: 150,
          doneAt: new Date(nowMs - 86400000 + 152 * 60000).toISOString()
        },
        {
          id: 'rev_demo_3',
          scheduledAt: new Date(nowMs - 86400000 + 360 * 60000).toISOString(),
          intervalMin: 360,
          doneAt: new Date(nowMs - 86400000 + 365 * 60000).toISOString()
        }
      ]
    },
    {
      id: 'top_mitosis',
      subjectId: 'subj_bio',
      name: 'Mitosis vs Meiosis Stages',
      completedAt: new Date(nowMs - 86400000 * 3).toISOString(),
      intervalMin: 1440 * 3, // Day 3 milestone
      nextAt: day3_7PM.toISOString(), // Due in 3 days at 7:00 PM
      reviews: [
        {
          id: 'rev_demo_4',
          scheduledAt: new Date(nowMs - 86400000 * 3 + 150 * 60000).toISOString(),
          intervalMin: 150,
          doneAt: new Date(nowMs - 86400000 * 3 + 155 * 60000).toISOString()
        },
        {
          id: 'rev_demo_5',
          scheduledAt: new Date(nowMs - 86400000 * 3 + 360 * 60000).toISOString(),
          intervalMin: 360,
          doneAt: new Date(nowMs - 86400000 * 3 + 365 * 60000).toISOString()
        },
        {
          id: 'rev_demo_6',
          scheduledAt: new Date(nowMs - 86400000 * 2).toISOString(),
          intervalMin: 1440,
          doneAt: new Date(nowMs - 86400000 * 2 + 10 * 60000).toISOString()
        }
      ]
    }
  ];
}

// ==========================================================================
// 2. Application State & Storage Helpers
// ==========================================================================

class AppState {
  constructor() {
    this.subjects = this.loadSubjects();
    this.topics = this.loadTopics();
    this.settings = this.loadSettings();
    this.activeView = 'viewToday';
    this.subjectFilter = 'all';
    this.searchQuery = '';
    this.calendarCurrentDate = new Date();
    this.selectedCalendarDate = null;
    this.inspectingTopicId = null;
  }

  loadSubjects() {
    const raw = localStorage.getItem(STORAGE_KEY_SUBJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
      return DEFAULT_SUBJECTS;
    }
    try {
      const list = JSON.parse(raw);
      // Migrate demo subjects if they were previously saved with old monochrome colors
      return list.map(s => {
        if (s.id === 'subj_bio' && (s.color === '#18181b' || !s.color)) return { ...s, color: '#10b981' };
        if (s.id === 'subj_cs' && (s.color === '#52525b' || !s.color)) return { ...s, color: '#6366f1' };
        if (s.id === 'subj_hist' && (s.color === '#71717a' || !s.color)) return { ...s, color: '#f59e0b' };
        return s;
      });
    } catch {
      return DEFAULT_SUBJECTS;
    }
  }

  saveSubjects() {
    localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(this.subjects));
  }

  loadTopics() {
    const raw = localStorage.getItem(STORAGE_KEY_TOPICS);
    if (!raw) {
      const demo = generateDefaultTopics();
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(demo));
      return demo;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveTopics() {
    localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(this.topics));
  }

  loadSettings() {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const defaults = { audioHaptics: true, theme: 'dark' };
    if (!raw) return defaults;
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }

  saveSettings() {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
  }

  getSubject(subjectId) {
    return this.subjects.find(s => s.id === subjectId) || {
      id: 'unknown',
      name: 'General',
      color: '#6366f1'
    };
  }

  getTopic(topicId) {
    return this.topics.find(t => t.id === topicId);
  }
}

const state = new AppState();

// ==========================================================================
// 3. Adaptive Spaced Retrieval Scheduling Engine
// ==========================================================================

/**
 * Helper to get a Date object set to 7:00 PM (19:00 local time) on a specific day
 */
function getEveningTime(baseDate, daysOffset = 0) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(19, 0, 0, 0); // 7:00 PM local evening study time
  return d;
}

/**
 * Human-Friendly Spaced Forgetting Curve Engine:
 * 
 * 1. Initial Check: Within 3 hrs (~150 min after learning)
 * 2. End of Day: Same-day evening consolidation at 7:00 PM
 * 3. Day 1: Tomorrow at 7:00 PM
 * 4. Day 3: 3 days later at 7:00 PM
 * 5. Day 7: 1 week later at 7:00 PM
 * 6. Day 14: 2 weeks later at 7:00 PM
 * 7. Day 30+: 1 month later at 7:00 PM
 */
function calculateNextReview(topic) {
  const now = new Date();
  const currentInterval = topic.intervalMin || 150;

  // Determine current milestone stage
  let currentStage = 'within_3h';
  if (currentInterval <= 180) {
    currentStage = 'within_3h';
  } else if (currentInterval <= 720) {
    currentStage = 'end_of_day';
  } else if (currentInterval <= 2160) {
    currentStage = 'day_1';
  } else if (currentInterval <= 5760) {
    currentStage = 'day_3';
  } else if (currentInterval <= 14400) {
    currentStage = 'day_7';
  } else if (currentInterval <= 28800) {
    currentStage = 'day_14';
  } else {
    currentStage = 'day_30';
  }

  let nextDate;
  let nextIntervalMin;

  switch (currentStage) {
    case 'within_3h': {
      const today7PM = getEveningTime(now, 0);
      // If at least 25 min left before 7:00 PM today, review tonight at 7 PM
      if (today7PM.getTime() - now.getTime() > 25 * 60 * 1000) {
        nextDate = today7PM;
        nextIntervalMin = Math.max(60, Math.round((nextDate.getTime() - now.getTime()) / 60000));
      } else {
        // Already after 6:35 PM -> advance to Day 1 (Tomorrow at 7:00 PM)
        nextDate = getEveningTime(now, 1);
        nextIntervalMin = 1440;
      }
      break;
    }
    case 'end_of_day': {
      // End of day complete -> advance to Day 1 (Tomorrow at 7:00 PM)
      nextDate = getEveningTime(now, 1);
      nextIntervalMin = 1440;
      break;
    }
    case 'day_1': {
      // Advance to Day 3 (3 days from now at 7:00 PM)
      nextDate = getEveningTime(now, 3);
      nextIntervalMin = 1440 * 3;
      break;
    }
    case 'day_3': {
      // Advance to Day 7 (1 week from now at 7:00 PM)
      nextDate = getEveningTime(now, 7);
      nextIntervalMin = 1440 * 7;
      break;
    }
    case 'day_7': {
      // Advance to Day 14 (2 weeks from now at 7:00 PM)
      nextDate = getEveningTime(now, 14);
      nextIntervalMin = 1440 * 14;
      break;
    }
    case 'day_14': {
      // Advance to Day 30 (1 month from now at 7:00 PM)
      nextDate = getEveningTime(now, 30);
      nextIntervalMin = 1440 * 30;
      break;
    }
    case 'day_30':
    default: {
      // Advance to Day 60 (2 months from now at 7:00 PM)
      nextDate = getEveningTime(now, 60);
      nextIntervalMin = 1440 * 60;
      break;
    }
  }

  return {
    nextAt: nextDate.toISOString(),
    intervalMin: nextIntervalMin
  };
}

/**
 * Given a timestamp and interval in minutes, calculate the future ISO timestamp.
 */
function computeNextAt(baseTimestampISO, intervalMinutes) {
  const baseTime = new Date(baseTimestampISO).getTime();
  const nextTime = baseTime + (intervalMinutes * 60 * 1000);
  return new Date(nextTime).toISOString();
}

/**
 * Human-friendly milestone interval formatter:
 * e.g. "Within 3 hrs", "End of Day (7 PM)", "Day 1", "Day 3", "Day 7 (1 wk)", "Day 14 (2 wks)", "Day 30 (1 mo)"
 */
function formatInterval(minutes) {
  if (minutes <= 180) {
    return 'Within 3 hrs';
  }
  if (minutes <= 720) {
    return 'End of Day (7 PM)';
  }
  const days = Math.round(minutes / 1440);
  if (days <= 1) return 'Day 1';
  if (days < 7) return `Day ${days}`;
  if (days === 7) return 'Day 7 (1 wk)';
  if (days === 14) return 'Day 14 (2 wks)';
  if (days >= 28 && days <= 35) return 'Day 30 (1 mo)';
  if (days > 35) return `Day ${days} (${Math.round(days / 30)} mos)`;
  return `Day ${days}`;
}

/**
 * Human-friendly due time indicator
 */
function formatDueIndicator(nextAtISO) {
  const now = Date.now();
  const nextTime = new Date(nextAtISO).getTime();
  const diffMinutes = Math.round((nextTime - now) / 60000);

  if (diffMinutes <= 0) {
    const overdueMins = Math.abs(diffMinutes);
    if (overdueMins < 5) return 'Due now';
    if (overdueMins < 60) return `Overdue by ${overdueMins}m`;
    const overdueHours = Math.round(overdueMins / 60);
    if (overdueHours < 24) return `Overdue by ${overdueHours}h`;
    const overdueDays = Math.round(overdueHours / 24);
    return `Overdue by ${overdueDays}d`;
  }

  if (diffMinutes < 60) {
    return `Due in ${diffMinutes}m`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Due in ${diffHours}h`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `Due in ${diffDays}d`;
}

/**
 * Format timestamp to user's local time string:
 * "10:30 AM" or "Sep 14, 10:30 AM"
 */
function formatLocalTime(isoString, includeDate = false) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (!includeDate) return timeStr;
  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dateStr}, ${timeStr}`;
}

// ==========================================================================
// 4. Audio & Haptics Feedback (Harmonic Synth)
// ==========================================================================

class FeedbackEffects {
  constructor() {
    this.audioCtx = null;
  }

  initAudio() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  playCompletionSound() {
    if (!state.settings.audioHaptics) return;

    // Subtle crisp haptics for Mobile
    if (navigator.vibrate) {
      navigator.vibrate([30, 40, 60]);
    }

    try {
      this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      // Harmonious completion chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

const feedback = new FeedbackEffects();

// ==========================================================================
// 5. UI Rendering Engine
// ==========================================================================

const UI = {
  // Elements
  todayQueueContainer: document.getElementById('dueCardsContainer'),
  todayDueBadge: document.getElementById('todayDueBadge'),
  navBadgeToday: document.getElementById('navBadgeToday'),
  upcomingContainer: document.getElementById('upcomingCardsContainer'),
  upcomingCount: document.getElementById('upcomingCount'),
  subjectsContainer: document.getElementById('subjectsContentArea'),
  subjectFilterChips: document.getElementById('subjectFilterChips'),
  topicSearchInput: document.getElementById('topicSearchInput'),
  intervalTiersContainer: document.getElementById('intervalTiersContainer'),
  totalTopicsCount: document.getElementById('totalTopicsCount'),
  calendarGrid: document.getElementById('calendarDaysGrid'),
  calMonthYearLabel: document.getElementById('calMonthYearLabel'),
  agendaTitle: document.getElementById('agendaDateTitle'),
  agendaCountBadge: document.getElementById('agendaCountBadge'),
  agendaList: document.getElementById('agendaItemsList'),
  currentDateTimeText: document.getElementById('currentDateTimeText'),
  toastEl: document.getElementById('appToast'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),

  // Modals
  modalLogTopic: document.getElementById('modalLogTopic'),
  modalAddSubject: document.getElementById('modalAddSubject'),
  modalTopicDetail: document.getElementById('modalTopicDetail'),
  modalScience: document.getElementById('modalScience'),
  modalSettings: document.getElementById('modalSettings'),

  // Forms
  formLogTopic: document.getElementById('formLogTopic'),
  formAddSubject: document.getElementById('formAddSubject'),
  selectTopicSubject: document.getElementById('selectTopicSubject'),
  subjectColorPalette: document.getElementById('subjectColorPalette'),
  inputSubjectColor: document.getElementById('inputSubjectColor'),

  applyTheme(theme) {
    const isLight = theme === 'light';
    if (isLight) {
      document.documentElement.setAttribute('data-theme', 'light');
      if (document.body) document.body.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (document.body) document.body.removeAttribute('data-theme');
    }

    const sunIcon = document.getElementById('iconThemeSun');
    const moonIcon = document.getElementById('iconThemeMoon');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = isLight ? 'none' : 'block';
      moonIcon.style.display = isLight ? 'block' : 'none';
    }

    const toggleThemeMode = document.getElementById('toggleThemeMode');
    if (toggleThemeMode) {
      toggleThemeMode.checked = isLight;
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isLight ? '#eef1f5' : '#09090b');
    }
  },

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2800);
  },

  updateClock() {
    const now = new Date();
    const formatted = now.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }) + ' · ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.currentDateTimeText.textContent = formatted;
  },

  initColorPicker() {
    this.subjectColorPalette.innerHTML = '';
    SUBJECT_COLORS.forEach((color, idx) => {
      const opt = document.createElement('div');
      opt.className = `color-option ${idx === 0 ? 'selected' : ''}`;
      opt.style.backgroundColor = color;
      opt.dataset.color = color;
      opt.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
        opt.classList.add('selected');
        this.inputSubjectColor.value = color;
      });
      this.subjectColorPalette.appendChild(opt);
    });
  },

  populateSubjectDropdown() {
    this.selectTopicSubject.innerHTML = '';
    state.subjects.forEach(subj => {
      const opt = document.createElement('option');
      opt.value = subj.id;
      opt.textContent = subj.name;
      this.selectTopicSubject.appendChild(opt);
    });
  },

  renderSubjectChips() {
    this.subjectFilterChips.innerHTML = '';

    const allChip = document.createElement('button');
    allChip.className = `chip-btn ${state.subjectFilter === 'all' ? 'active' : ''}`;
    allChip.textContent = 'All Subjects';
    allChip.addEventListener('click', () => {
      state.subjectFilter = 'all';
      this.renderSubjectChips();
      this.renderSubjectsView();
    });
    this.subjectFilterChips.appendChild(allChip);

    state.subjects.forEach(subj => {
      const count = state.topics.filter(t => t.subjectId === subj.id).length;
      const chip = document.createElement('button');
      chip.className = `chip-btn ${state.subjectFilter === subj.id ? 'active' : ''}`;
      chip.innerHTML = `<span class="subject-dot" style="background:${subj.color}"></span> ${subj.name} (${count})`;
      chip.addEventListener('click', () => {
        state.subjectFilter = subj.id;
        this.renderSubjectChips();
        this.renderSubjectsView();
      });
      this.subjectFilterChips.appendChild(chip);
    });
  },

  // ========================================================================
  // Screen 1: Today Screen Rendering
  // ========================================================================
  renderTodayView() {
    const nowISO = new Date().toISOString();
    const nowTime = Date.now();

    // Due topics: nextAt <= now
    const dueTopics = state.topics.filter(topic => topic.nextAt <= nowISO);

    // Upcoming topics: nextAt > now && nextAt <= now + 24 hours
    const upcomingLimitTime = nowTime + (24 * 60 * 60 * 1000);
    const upcomingTopics = state.topics.filter(topic => {
      const tTime = new Date(topic.nextAt).getTime();
      return tTime > nowTime && tTime <= upcomingLimitTime;
    }).sort((a, b) => new Date(a.nextAt) - new Date(b.nextAt));

    // Update due counter badges
    this.todayDueBadge.textContent = `${dueTopics.length} due`;
    if (dueTopics.length > 0) {
      this.navBadgeToday.textContent = dueTopics.length;
      this.navBadgeToday.style.display = 'block';
    } else {
      this.navBadgeToday.style.display = 'none';
    }

    // Render Due Cards
    this.todayQueueContainer.innerHTML = '';

    if (dueTopics.length === 0) {
      this.todayQueueContainer.innerHTML = `
        <div class="empty-queue-card">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="empty-title">All Caught Up!</h3>
          <p class="empty-subtitle">No retrieval checks due right now. When you learn new material or your next spaced interval matures, your topics will appear here.</p>
          <button class="primary-btn" id="btnLogFromEmpty">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Log What You Just Learned
          </button>
        </div>
      `;

      const btn = document.getElementById('btnLogFromEmpty');
      if (btn) btn.addEventListener('click', () => UI.openLogTopicModal());
    } else {
      // Sort due topics by most overdue first
      const sortedDue = [...dueTopics].sort((a, b) => new Date(a.nextAt) - new Date(b.nextAt));

      sortedDue.forEach(topic => {
        const subject = state.getSubject(topic.subjectId);
        const card = document.createElement('div');
        card.className = 'review-card';
        card.id = `due-card-${topic.id}`;
        card.style.setProperty('--subject-color', subject.color);

        const dueStatus = formatDueIndicator(topic.nextAt);
        const intervalText = formatInterval(topic.intervalMin);

        card.innerHTML = `
          <div class="card-top">
            <span class="subject-pill">
              <span class="subject-dot" style="background:${subject.color}"></span>
              ${subject.name}
            </span>
            <span class="due-indicator">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${dueStatus}
            </span>
          </div>

          <h3 class="card-topic-title" title="Click to view history">${escapeHtml(topic.name)}</h3>

          <div class="card-meta-line">
            <span>Current interval: <strong class="interval-tag">${intervalText}</strong></span>
            <span>•</span>
            <span>Due at ${formatLocalTime(topic.nextAt, false)}</span>
          </div>

          <!-- Mark as Reviewed Action -->
          <div class="review-card-actions">
            <button class="btn-mark-reviewed" data-id="${topic.id}" aria-label="Mark as reviewed">
              <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Mark as Reviewed</span>
            </button>
          </div>
        `;

        // Click title to inspect details
        card.querySelector('.card-topic-title').addEventListener('click', () => {
          UI.openTopicDetailModal(topic.id);
        });

        // Mark as Reviewed click handler
        const markBtn = card.querySelector('.btn-mark-reviewed');
        if (markBtn) {
          markBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const topicId = markBtn.dataset.id;
            UI.handleMarkReviewed(topicId, card);
          });
        }

        this.todayQueueContainer.appendChild(card);
      });
    }

    // Render Upcoming Section
    this.upcomingCount.textContent = upcomingTopics.length;
    this.upcomingContainer.innerHTML = '';

    if (upcomingTopics.length === 0) {
      this.upcomingContainer.innerHTML = `<p class="hint-muted" style="padding: 0.5rem 0;">No additional reviews scheduled for the next 24 hours.</p>`;
    } else {
      upcomingTopics.forEach(topic => {
        const subject = state.getSubject(topic.subjectId);
        const item = document.createElement('div');
        item.className = 'upcoming-item';
        item.innerHTML = `
          <div class="upcoming-left">
            <span class="subject-dot" style="background:${subject.color}"></span>
            <div>
              <div class="upcoming-title">${escapeHtml(topic.name)}</div>
              <div class="upcoming-meta">
                <span>${subject.name}</span>
                <span>•</span>
                <span>Interval: ${formatInterval(topic.intervalMin)}</span>
              </div>
            </div>
          </div>
          <div class="upcoming-time">
            ${formatLocalTime(topic.nextAt, false)} (${formatDueIndicator(topic.nextAt)})
          </div>
        `;
        item.addEventListener('click', () => UI.openTopicDetailModal(topic.id));
        this.upcomingContainer.appendChild(item);
      });
    }
  },

  /**
   * Handle user clicking Mark as Reviewed
   */
  handleMarkReviewed(topicId, cardEl) {
    const topic = state.getTopic(topicId);
    if (!topic) return;

    // Trigger sound & haptics
    feedback.playCompletionSound();

    const nowISO = new Date().toISOString();
    const scheduledAt = topic.nextAt;
    const previousInterval = topic.intervalMin || 150;

    // 1. Calculate new review milestone using forgetting curve progression
    const { nextAt, intervalMin } = calculateNextReview(topic);

    // 2. Append to historical review record
    const reviewRecord = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      scheduledAt: scheduledAt,
      intervalMin: previousInterval,
      doneAt: nowISO
    };

    if (!Array.isArray(topic.reviews)) {
      topic.reviews = [];
    }
    topic.reviews.push(reviewRecord);

    // 3. Update topic state
    topic.intervalMin = intervalMin;
    topic.nextAt = nextAt;

    // 4. Persist to storage
    state.saveTopics();

    // 5. Visual animation and removal from queue
    if (cardEl) {
      cardEl.classList.add('card-animating-out');
      setTimeout(() => {
        UI.renderTodayView();
        UI.renderScheduleView();
        UI.renderCalendarView();
      }, 240);
    } else {
      UI.renderTodayView();
      UI.renderScheduleView();
      UI.renderCalendarView();
    }

    const readableNew = formatInterval(intervalMin);
    UI.showToast(`Marked as reviewed! Next review: ${readableNew}`);
  },

  // ========================================================================
  // Screen 2: Subjects & Topics Screen Rendering
  // ========================================================================
  renderSubjectsView() {
    this.subjectsContainer.innerHTML = '';
    const query = state.searchQuery.trim().toLowerCase();

    // Filter topics
    let filteredTopics = state.topics;
    if (state.subjectFilter !== 'all') {
      filteredTopics = filteredTopics.filter(t => t.subjectId === state.subjectFilter);
    }
    if (query) {
      filteredTopics = filteredTopics.filter(t => {
        const subj = state.getSubject(t.subjectId);
        return t.name.toLowerCase().includes(query) || subj.name.toLowerCase().includes(query);
      });
    }

    // Determine subjects to display
    const subjectsToDisplay = (state.subjectFilter === 'all') 
      ? state.subjects 
      : state.subjects.filter(s => s.id === state.subjectFilter);

    if (subjectsToDisplay.length === 0) {
      this.subjectsContainer.innerHTML = `
        <div class="empty-queue-card">
          <p class="empty-title">No Subjects Found</p>
          <p class="empty-subtitle">Create a subject to begin organizing your topics.</p>
          <button class="primary-btn" id="btnEmptyCreateSubject">Create Subject</button>
        </div>
      `;
      const btn = document.getElementById('btnEmptyCreateSubject');
      if (btn) btn.addEventListener('click', () => UI.openAddSubjectModal());
      return;
    }

    subjectsToDisplay.forEach(subj => {
      const subjTopics = filteredTopics.filter(t => t.subjectId === subj.id);

      const block = document.createElement('div');
      block.className = 'subject-block';

      block.innerHTML = `
        <div class="subject-block-header">
          <div class="subject-block-title">
            <span class="subject-dot" style="background:${subj.color}; width:12px; height:12px;"></span>
            <span>${escapeHtml(subj.name)}</span>
            <span class="badge-counter" style="font-size:0.75rem; padding:0.15rem 0.5rem;">${subjTopics.length} topics</span>
          </div>
          <div class="subject-actions">
            <button class="icon-btn btn-add-topic-to-subj" title="Add topic to this subject" data-subjid="${subj.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button class="icon-btn btn-delete-subj" title="Delete subject" data-subjid="${subj.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="topics-table">
          ${subjTopics.length === 0 
            ? `<div class="tier-empty">No topics in this subject yet.</div>`
            : subjTopics.map(t => `
                <div class="topic-row" data-topicid="${t.id}">
                  <div class="topic-row-left">
                    <span class="topic-name">${escapeHtml(t.name)}</span>
                    <span class="topic-submeta">
                      Learned: ${formatLocalTime(t.completedAt, true)} • Next: ${formatLocalTime(t.nextAt, true)}
                    </span>
                  </div>
                  <div class="topic-row-right">
                    <span class="interval-badge">${formatInterval(t.intervalMin)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              `).join('')
          }
        </div>
      `;

      // Event listener for adding topic directly to subject
      block.querySelector('.btn-add-topic-to-subj').addEventListener('click', () => {
        UI.openLogTopicModal(subj.id);
      });

      // Event listener for deleting subject
      block.querySelector('.btn-delete-subj').addEventListener('click', () => {
        UI.handleDeleteSubject(subj.id);
      });

      // Event listeners for topic row clicks
      block.querySelectorAll('.topic-row').forEach(row => {
        row.addEventListener('click', () => {
          UI.openTopicDetailModal(row.dataset.topicid);
        });
      });

      this.subjectsContainer.appendChild(block);
    });
  },

  handleDeleteSubject(subjectId) {
    const subj = state.getSubject(subjectId);
    const count = state.topics.filter(t => t.subjectId === subjectId).length;

    let msg = `Are you sure you want to delete the subject "${subj.name}"?`;
    if (count > 0) {
      msg += ` This will also delete ${count} associated topic(s) and their review histories.`;
    }

    if (!confirm(msg)) return;

    state.subjects = state.subjects.filter(s => s.id !== subjectId);
    state.topics = state.topics.filter(t => t.subjectId !== subjectId);
    state.saveSubjects();
    state.saveTopics();

    if (state.subjectFilter === subjectId) {
      state.subjectFilter = 'all';
    }

    this.populateSubjectDropdown();
    this.renderSubjectChips();
    this.renderSubjectsView();
    this.renderTodayView();
    this.renderScheduleView();
    this.renderCalendarView();
    this.showToast(`Deleted subject "${subj.name}"`);
  },

  // ========================================================================
  // Screen 3: Schedule (Interval Tiers) Screen Rendering
  // ========================================================================
  renderScheduleView() {
    this.intervalTiersContainer.innerHTML = '';
    this.totalTopicsCount.textContent = `${state.topics.length} total topics`;

    // Interval brackets: Within 3 hrs, End of Day (7 PM), Day 1, Day 3, Day 7, Day 14, Day 30+
    const tiers = [
      { name: 'Within 3 hrs', minMinutes: 0, maxMinutes: 200, desc: 'Initial retrieval check (~2–3 hrs after learning)' },
      { name: 'End of Day (7 PM)', minMinutes: 201, maxMinutes: 720, desc: 'Same-day evening consolidation at 7:00 PM' },
      { name: 'Day 1 (Tomorrow)', minMinutes: 721, maxMinutes: 2160, desc: '24-hour overnight retention check' },
      { name: 'Day 3', minMinutes: 2161, maxMinutes: 5760, desc: '3-day consolidation milestone' },
      { name: 'Day 7 (1 Week)', minMinutes: 5761, maxMinutes: 14400, desc: 'Weekly retention reinforcement' },
      { name: 'Day 14 (2 Weeks)', minMinutes: 14401, maxMinutes: 28800, desc: 'Mid-term memory consolidation' },
      { name: 'Day 30+ (1 Month)', minMinutes: 28801, maxMinutes: Infinity, desc: 'Long-term permanent recall' }
    ];

    tiers.forEach(tier => {
      const matchedTopics = state.topics.filter(topic => {
        const min = tier.minMinutes !== undefined ? tier.minMinutes : 0;
        const max = tier.maxMinutes !== undefined ? tier.maxMinutes : Infinity;
        return topic.intervalMin >= min && topic.intervalMin <= max;
      });

      const card = document.createElement('div');
      card.className = 'tier-card';

      card.innerHTML = `
        <div class="tier-header">
          <div>
            <div class="tier-name">
              <span>${tier.name}</span>
            </div>
            <span class="hint-muted">${tier.desc}</span>
          </div>
          <span class="tier-badge">${matchedTopics.length}</span>
        </div>

        <div class="tier-list">
          ${matchedTopics.length === 0 
            ? `<div class="tier-empty">No topics currently at this interval stage.</div>`
            : matchedTopics.map(t => {
                const subj = state.getSubject(t.subjectId);
                return `
                  <div class="tier-item" data-topicid="${t.id}">
                    <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
                      <span class="subject-dot" style="background:${subj.color};"></span>
                      <span style="font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                        ${escapeHtml(t.name)}
                      </span>
                    </div>
                    <span class="hint-muted" style="font-size:0.75rem; white-space:nowrap; margin-left:0.5rem;">
                      ${formatDueIndicator(t.nextAt)}
                    </span>
                  </div>
                `;
              }).join('')
          }
        </div>
      `;

      card.querySelectorAll('.tier-item').forEach(el => {
        el.addEventListener('click', () => {
          UI.openTopicDetailModal(el.dataset.topicid);
        });
      });

      this.intervalTiersContainer.appendChild(card);
    });
  },

  // ========================================================================
  // Screen 4: Calendar Screen Rendering
  // ========================================================================
  renderCalendarView() {
    this.calendarGrid.innerHTML = '';
    const current = state.calendarCurrentDate;
    const year = current.getFullYear();
    const month = current.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    this.calMonthYearLabel.textContent = `${monthNames[month]} ${year}`;

    // First day of current month & total days
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const todayObj = new Date();
    const isCurrentMonth = todayObj.getFullYear() === year && todayObj.getMonth() === month;
    const todayDate = todayObj.getDate();

    // Fill days from previous month
    for (let i = firstDayIndex; i > 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell other-month';
      cell.innerHTML = `<span class="cal-date-num">${prevMonthLastDay - i + 1}</span>`;
      this.calendarGrid.appendChild(cell);
    }

    // Days of this month
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      if (isCurrentMonth && day === todayDate) {
        cell.classList.add('today');
      }

      // Check if selected
      const cellDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (state.selectedCalendarDate === cellDateKey) {
        cell.classList.add('selected');
      }

      // Find topics scheduled for this local calendar day
      const dayTopics = state.topics.filter(topic => {
        const topicDate = new Date(topic.nextAt);
        return topicDate.getFullYear() === year &&
               topicDate.getMonth() === month &&
               topicDate.getDate() === day;
      });

      let eventsHtml = '';
      if (dayTopics.length > 0) {
        eventsHtml = '<div class="cal-events">';
        dayTopics.slice(0, 3).forEach(t => {
          const subj = state.getSubject(t.subjectId);
          eventsHtml += `
            <span class="cal-pill" style="--event-color: ${subj.color}; border-left: 3px solid ${subj.color};" title="${escapeHtml(t.name)} (${subj.name})">
              ${escapeHtml(t.name)}
            </span>
          `;
        });
        if (dayTopics.length > 3) {
          eventsHtml += `<span class="cal-more-dots">+${dayTopics.length - 3} more</span>`;
        }
        eventsHtml += '</div>';
      }

      cell.innerHTML = `
        <span class="cal-date-num">${day}</span>
        ${eventsHtml}
      `;

      cell.addEventListener('click', () => {
        document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        state.selectedCalendarDate = cellDateKey;
        UI.renderAgendaDrawer(new Date(year, month, day), dayTopics);
      });

      this.calendarGrid.appendChild(cell);
    }

    // Default agenda to today if nothing selected
    if (!state.selectedCalendarDate) {
      const todayKey = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;
      state.selectedCalendarDate = todayKey;
      const todayTopics = state.topics.filter(topic => {
        const td = new Date(topic.nextAt);
        return td.getFullYear() === todayObj.getFullYear() &&
               td.getMonth() === todayObj.getMonth() &&
               td.getDate() === todayDate;
      });
      this.renderAgendaDrawer(todayObj, todayTopics);
    }
  },

  renderAgendaDrawer(dateObj, topics) {
    const formattedDate = dateObj.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    this.agendaTitle.textContent = formattedDate;
    this.agendaCountBadge.textContent = `${topics.length} retrieval check${topics.length === 1 ? '' : 's'}`;

    this.agendaList.innerHTML = '';
    if (topics.length === 0) {
      this.agendaList.innerHTML = `<p class="empty-state-text">No topics due for retrieval on this date.</p>`;
      return;
    }

    // Sort by scheduled time
    const sorted = [...topics].sort((a, b) => new Date(a.nextAt) - new Date(b.nextAt));

    sorted.forEach(topic => {
      const subj = state.getSubject(topic.subjectId);
      const card = document.createElement('div');
      card.className = 'agenda-card';
      card.style.setProperty('--subject-color', subj.color);
      card.style.borderLeft = `3px solid ${subj.color}`;
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span class="subject-dot" style="background:${subj.color}"></span>
          <div>
            <div style="font-weight:700; color:var(--text-primary); font-size:0.92rem;">${escapeHtml(topic.name)}</div>
            <div class="hint-muted" style="font-size:0.78rem;">
              ${subj.name} • Interval: ${formatInterval(topic.intervalMin)}
            </div>
          </div>
        </div>
        <div class="agenda-time">
          ${formatLocalTime(topic.nextAt, false)}
        </div>
      `;

      card.addEventListener('click', () => {
        UI.openTopicDetailModal(topic.id);
      });

      this.agendaList.appendChild(card);
    });
  },

  // ========================================================================
  // Modals Management
  // ========================================================================
  openLogTopicModal(presetSubjectId = null) {
    this.populateSubjectDropdown();
    if (presetSubjectId) {
      this.selectTopicSubject.value = presetSubjectId;
    }

    // Set default Date and Time to device local right now
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    document.getElementById('inputTopicDate').value = `${year}-${month}-${day}`;
    document.getElementById('inputTopicTime').value = `${hours}:${minutes}`;
    document.getElementById('inputTopicName').value = '';

    this.openModal(this.modalLogTopic);
    setTimeout(() => document.getElementById('inputTopicName').focus(), 150);
  },

  openAddSubjectModal() {
    document.getElementById('inputSubjectName').value = '';
    this.initColorPicker();
    this.openModal(this.modalAddSubject);
    setTimeout(() => document.getElementById('inputSubjectName').focus(), 150);
  },

  openTopicDetailModal(topicId) {
    const topic = state.getTopic(topicId);
    if (!topic) return;

    state.inspectingTopicId = topicId;
    const subj = state.getSubject(topic.subjectId);

    document.getElementById('detailSubjectTag').textContent = subj.name;
    document.getElementById('detailSubjectTag').style.color = subj.color;
    document.getElementById('modalTopicDetailTitle').textContent = topic.name;

    document.getElementById('detailInitialLearned').textContent = formatLocalTime(topic.completedAt, true);
    document.getElementById('detailCurrentInterval').textContent = formatInterval(topic.intervalMin);
    document.getElementById('detailNextRetrieval').textContent = formatLocalTime(topic.nextAt, true);

    const reviews = Array.isArray(topic.reviews) ? topic.reviews : [];
    document.getElementById('detailTotalReviews').textContent = reviews.length;

    const timeline = document.getElementById('detailTimeline');
    timeline.innerHTML = '';

    if (reviews.length === 0) {
      timeline.innerHTML = `<div class="tier-empty">No reviews logged yet. The first retrieval check occurs within 3 hours from completion.</div>`;
    } else {
      // Reverse to show latest first
      [...reviews].reverse().forEach(rev => {
        const item = document.createElement('div');
        item.className = 'timeline-entry';
        item.innerHTML = `
          <div class="timeline-left">
            <span class="result-chip reviewed">✓ Reviewed</span>
            <span class="timeline-date">${formatLocalTime(rev.doneAt, true)}</span>
          </div>
          <span class="timeline-interval">Interval: ${formatInterval(rev.intervalMin)}</span>
        `;
        timeline.appendChild(item);
      });
    }

    this.openModal(this.modalTopicDetail);
  },

  openModal(modalEl) {
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
  },

  closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    });
  }
};

// ==========================================================================
// 6. Navigation and Event Listeners
// ==========================================================================

function switchView(targetViewId) {
  state.activeView = targetViewId;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === targetViewId);
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === targetViewId);
  });

  if (targetViewId === 'viewToday') {
    UI.renderTodayView();
  } else if (targetViewId === 'viewSubjects') {
    UI.renderSubjectChips();
    UI.renderSubjectsView();
  } else if (targetViewId === 'viewSchedule') {
    UI.renderScheduleView();
  } else if (targetViewId === 'viewCalendar') {
    UI.renderCalendarView();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// 7. Initialization & Event Bindings
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Clock & periodic queue update
  UI.updateClock();
  setInterval(() => {
    UI.updateClock();
    // Refresh queue as local time progresses
    if (state.activeView === 'viewToday') {
      UI.renderTodayView();
    }
  }, 30000);

  // 2. Navigation bar events
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  // 3. Top action buttons
  document.getElementById('btnQuickAdd').addEventListener('click', () => {
    UI.openLogTopicModal();
  });
  document.getElementById('btnScience').addEventListener('click', () => {
    UI.openModal(UI.modalScience);
  });
  document.getElementById('btnSettings').addEventListener('click', () => {
    UI.openModal(UI.modalSettings);
  });
  document.getElementById('btnLogo').addEventListener('click', () => {
    switchView('viewToday');
  });

  // 4. Modal close handlers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => UI.closeModals());
  });
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) UI.closeModals();
    });
  });

  // 5. Subjects & Topics view controls
  document.getElementById('btnAddSubjectModalBtn').addEventListener('click', () => {
    UI.openAddSubjectModal();
  });
  document.getElementById('btnQuickNewSubject').addEventListener('click', () => {
    UI.openAddSubjectModal();
  });

  UI.topicSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    UI.renderSubjectsView();
  });

  // 6. Form: Log Topic
  UI.formLogTopic.addEventListener('submit', (e) => {
    e.preventDefault();
    const subjectId = UI.selectTopicSubject.value;
    const name = document.getElementById('inputTopicName').value.trim();
    const dateVal = document.getElementById('inputTopicDate').value;
    const timeVal = document.getElementById('inputTopicTime').value;

    if (!subjectId || !name || !dateVal || !timeVal) {
      UI.showToast('Please fill in all required fields.');
      return;
    }

    // Construct local completion timestamp
    const [year, month, day] = dateVal.split('-').map(Number);
    const [hours, minutes] = timeVal.split(':').map(Number);
    const completedDate = new Date(year, month - 1, day, hours, minutes, 0);
    const completedAtISO = completedDate.toISOString();

    // Initial interval rule: First retrieval check within 3 hours (~150 min)
    const initialIntervalMin = 150;
    const nextAtISO = computeNextAt(completedAtISO, initialIntervalMin);

    const newTopic = {
      id: 'top_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      subjectId: subjectId,
      name: name,
      completedAt: completedAtISO,
      intervalMin: initialIntervalMin,
      nextAt: nextAtISO,
      reviews: []
    };

    state.topics.push(newTopic);
    state.saveTopics();

    UI.closeModals();
    UI.renderTodayView();
    UI.renderSubjectsView();
    UI.renderScheduleView();
    UI.renderCalendarView();

    const subj = state.getSubject(subjectId);
    UI.showToast(`Logged "${name}" in ${subj.name} · First check in ~2.5 hrs`);
  });

  // 7. Form: Add Subject
  UI.formAddSubject.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('inputSubjectName').value.trim();
    const color = UI.inputSubjectColor.value || '#6366f1';

    if (!name) return;

    const newSubject = {
      id: 'subj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name,
      color: color,
      createdAt: new Date().toISOString()
    };

    state.subjects.push(newSubject);
    state.saveSubjects();

    UI.closeModals();
    UI.populateSubjectDropdown();
    UI.renderSubjectChips();
    UI.renderSubjectsView();
    UI.showToast(`Created subject "${name}"`);
  });

  // 8. Delete Topic from detail modal
  document.getElementById('btnDeleteTopic').addEventListener('click', () => {
    if (!state.inspectingTopicId) return;
    const topic = state.getTopic(state.inspectingTopicId);
    if (!topic) return;

    if (!confirm(`Are you sure you want to delete topic "${topic.name}"?`)) return;

    state.topics = state.topics.filter(t => t.id !== topic.id);
    state.saveTopics();

    UI.closeModals();
    UI.renderTodayView();
    UI.renderSubjectsView();
    UI.renderScheduleView();
    UI.renderCalendarView();
    UI.showToast(`Deleted topic "${topic.name}"`);
  });

  // 9. Calendar Navigation
  document.getElementById('btnCalPrev').addEventListener('click', () => {
    const cur = state.calendarCurrentDate;
    state.calendarCurrentDate = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    UI.renderCalendarView();
  });
  document.getElementById('btnCalNext').addEventListener('click', () => {
    const cur = state.calendarCurrentDate;
    state.calendarCurrentDate = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    UI.renderCalendarView();
  });
  document.getElementById('btnCalToday').addEventListener('click', () => {
    state.calendarCurrentDate = new Date();
    state.selectedCalendarDate = null;
    UI.renderCalendarView();
  });

  // 10. Settings & Backup

  // Theme Mode Toggle (Header Button)
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const isCurrentlyLight = document.documentElement.getAttribute('data-theme') === 'light';
      const nextTheme = isCurrentlyLight ? 'dark' : 'light';
      state.settings.theme = nextTheme;
      state.saveSettings();
      UI.applyTheme(nextTheme);
      UI.showToast(nextTheme === 'light' ? 'Light grey theme activated' : 'Dark theme activated');
    });
  }

  // Theme Mode Toggle (Settings Modal Switch)
  const toggleThemeMode = document.getElementById('toggleThemeMode');
  if (toggleThemeMode) {
    toggleThemeMode.checked = state.settings.theme === 'light';
    toggleThemeMode.addEventListener('change', (e) => {
      const nextTheme = e.target.checked ? 'light' : 'dark';
      state.settings.theme = nextTheme;
      state.saveSettings();
      UI.applyTheme(nextTheme);
      UI.showToast(nextTheme === 'light' ? 'Light grey theme activated' : 'Dark theme activated');
    });
  }

  const toggleAudio = document.getElementById('toggleAudioHaptic');
  toggleAudio.checked = state.settings.audioHaptics;
  toggleAudio.addEventListener('change', (e) => {
    state.settings.audioHaptics = e.target.checked;
    state.saveSettings();
  });

  // Export JSON
  document.getElementById('btnExportData').addEventListener('click', () => {
    const backupData = {
      app: 'Adaptive Spaced Revision',
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: state.subjects,
      topics: state.topics,
      settings: state.settings
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateKey = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `spaced-revision-backup-${dateKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.showToast('JSON backup exported successfully');
  });

  // Import JSON
  document.getElementById('inputFileImport').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.subjects || !imported.topics) {
          throw new Error('Invalid schema format');
        }

        if (!confirm(`Import backup with ${imported.topics.length} topics and ${imported.subjects.length} subjects? This will replace your current local data.`)) {
          return;
        }

        state.subjects = imported.subjects;
        state.topics = imported.topics;
        if (imported.settings) state.settings = imported.settings;

        state.saveSubjects();
        state.saveTopics();
        state.saveSettings();

        UI.closeModals();
        UI.populateSubjectDropdown();
        UI.renderSubjectChips();
        UI.renderTodayView();
        UI.renderSubjectsView();
        UI.renderScheduleView();
        UI.renderCalendarView();
        UI.showToast(`Imported ${imported.topics.length} topics successfully`);
      } catch (err) {
        alert('Failed to parse backup JSON file. Ensure the file was generated by this application.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Load sample demo data
  document.getElementById('btnLoadDemoData').addEventListener('click', () => {
    if (!confirm('Load sample demonstration topics? This will replace your current data with demo subjects and topics.')) return;
    state.subjects = DEFAULT_SUBJECTS;
    state.topics = generateDefaultTopics();
    state.saveSubjects();
    state.saveTopics();

    UI.closeModals();
    UI.populateSubjectDropdown();
    UI.renderSubjectChips();
    UI.renderTodayView();
    UI.renderSubjectsView();
    UI.renderScheduleView();
    UI.renderCalendarView();
    UI.showToast('Demo data loaded');
  });

  // Reset all data
  document.getElementById('btnResetAll').addEventListener('click', () => {
    if (!confirm('WARNING: Are you sure you want to erase all subjects, topics, and recall histories? This action cannot be undone.')) return;
    state.subjects = [];
    state.topics = [];
    state.saveSubjects();
    state.saveTopics();

    UI.closeModals();
    UI.populateSubjectDropdown();
    UI.renderSubjectChips();
    UI.renderTodayView();
    UI.renderSubjectsView();
    UI.renderScheduleView();
    UI.renderCalendarView();
    UI.showToast('All local data wiped');
  });

  // Initial renders
  UI.applyTheme(state.settings.theme || 'dark');
  UI.initColorPicker();
  UI.populateSubjectDropdown();
  UI.renderSubjectChips();
  UI.renderTodayView();

  // Register Service Worker for offline PWA functionality (only in production)
  if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('[SW] Registered successfully:', reg.scope);
        })
        .catch(err => {
          console.log('[SW] Registration failed:', err);
        });
    });
  }
});
