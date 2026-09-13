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
  '#18181b', // Deep Charcoal
  '#52525b', // Slate
  '#71717a', // Neutral Gray
  '#3f3f46', // Zinc
  '#27272a', // Graphite
  '#a1a1aa', // Silver Gray
  '#09090b', // True Black
  '#475569'  // Muted Slate
];

// Seed data provided so the app is immediately demonstrative on first visit
const DEFAULT_SUBJECTS = [
  { id: 'subj_bio', name: 'Biology', color: '#18181b', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'subj_cs', name: 'Computer Science', color: '#52525b', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'subj_hist', name: 'History', color: '#71717a', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() }
];

function generateDefaultTopics() {
  const now = Date.now();
  return [
    {
      id: 'top_cell',
      subjectId: 'subj_bio',
      name: 'Cell Structure & Organelles',
      completedAt: new Date(now - 35 * 60000).toISOString(), // learned 35 min ago
      intervalMin: 20,
      nextAt: new Date(now - 15 * 60000).toISOString(), // was due 15 min ago (Due Now!)
      reviews: []
    },
    {
      id: 'top_binary_tree',
      subjectId: 'subj_cs',
      name: 'Binary Search Trees & Balancing',
      completedAt: new Date(now - 120 * 60000).toISOString(),
      intervalMin: 20,
      nextAt: new Date(now - 5 * 60000).toISOString(), // due 5 min ago (Due Now!)
      reviews: []
    },
    {
      id: 'top_revolution',
      subjectId: 'subj_hist',
      name: 'Causes of French Revolution',
      completedAt: new Date(now - 86400000 * 2).toISOString(),
      intervalMin: 120,
      nextAt: new Date(now + 45 * 60000).toISOString(), // Due later today in 45m
      reviews: [
        {
          id: 'rev_demo_1',
          scheduledAt: new Date(now - 86400000 * 2 + 20 * 60000).toISOString(),
          intervalMin: 20,
          result: 'good',
          doneAt: new Date(now - 86400000 * 2 + 21 * 60000).toISOString()
        }
      ]
    },
    {
      id: 'top_mitosis',
      subjectId: 'subj_bio',
      name: 'Mitosis vs Meiosis Stages',
      completedAt: new Date(now - 86400000 * 4).toISOString(),
      intervalMin: 2880, // 2 days
      nextAt: new Date(now + 86400000).toISOString(), // Due tomorrow
      reviews: [
        {
          id: 'rev_demo_2',
          scheduledAt: new Date(now - 86400000 * 4 + 20 * 60000).toISOString(),
          intervalMin: 20,
          result: 'good',
          doneAt: new Date(now - 86400000 * 4 + 22 * 60000).toISOString()
        },
        {
          id: 'rev_demo_3',
          scheduledAt: new Date(now - 86400000 * 4 + 140 * 60000).toISOString(),
          intervalMin: 120,
          result: 'hard',
          doneAt: new Date(now - 86400000 * 4 + 150 * 60000).toISOString()
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
      return JSON.parse(raw);
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
    const defaults = { audioHaptics: true };
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
 * Adaptive Spaced Retrieval Rules according to ADAPTIVE_REVISION_BUILD_SPEC.md:
 * 
 * Initial review: 20 minutes after learning completion.
 * 
 * Subsequent review results:
 * - Forget: next interval = max(20 min, previous interval * 0.25)
 * - Hard:   next interval = max(60 min, previous interval * 1.8)
 * - Good:   next interval = max(120 min, previous interval * 3.0)
 * 
 * Exactly 3 recall choices: Forget, Hard, Good (no Easy button).
 */
function calculateNextInterval(previousIntervalMin, result) {
  let nextInterval = 20;

  switch (result) {
    case 'forget':
      nextInterval = Math.max(20, Math.round(previousIntervalMin * 0.25));
      break;
    case 'hard':
      nextInterval = Math.max(60, Math.round(previousIntervalMin * 1.8));
      break;
    case 'good':
      nextInterval = Math.max(120, Math.round(previousIntervalMin * 3.0));
      break;
    default:
      nextInterval = 20;
  }

  return nextInterval;
}

/**
 * Given a timestamp and interval in minutes, calculate the future ISO timestamp.
 * Uses exact millisecond arithmetic to seamlessly handle midnight, month changes,
 * leap years, and DST.
 */
function computeNextAt(baseTimestampISO, intervalMinutes) {
  const baseTime = new Date(baseTimestampISO).getTime();
  const nextTime = baseTime + (intervalMinutes * 60 * 1000);
  return new Date(nextTime).toISOString();
}

/**
 * Human-friendly interval formatter:
 * e.g. "20 min", "2 hr", "1 day", "3.5 days"
 */
function formatInterval(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    const cleanHours = Math.round(hours * 10) / 10;
    return `${cleanHours} ${cleanHours === 1 ? 'hr' : 'hrs'}`;
  }
  const days = minutes / 1440;
  const cleanDays = Math.round(days * 10) / 10;
  return `${cleanDays} ${cleanDays === 1 ? 'day' : 'days'}`;
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

  playRecallSound(result) {
    if (!state.settings.audioHaptics) return;

    // Haptics for Android / Mobile
    if (navigator.vibrate) {
      if (result === 'forget') navigator.vibrate([40, 60, 40]);
      else if (result === 'hard') navigator.vibrate(50);
      else if (result === 'good') navigator.vibrate([30, 40, 60]);
    }

    try {
      this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (result === 'forget') {
        // Subtle downward pitch
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (result === 'hard') {
        // Warm double tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (result === 'good') {
        // Bright upward harmonic arpeggio
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
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

          <!-- Exactly Three Recall Choices: Forget · Hard · Good -->
          <div class="recall-actions">
            <button class="btn-recall btn-recall-forget" data-action="forget" data-id="${topic.id}" aria-label="Forget recall grade">
              <span>Forget</span>
              <span class="recall-sub">Reset / Gap</span>
            </button>

            <button class="btn-recall btn-recall-hard" data-action="hard" data-id="${topic.id}" aria-label="Hard recall grade">
              <span>Hard</span>
              <span class="recall-sub">Struggled</span>
            </button>

            <button class="btn-recall btn-recall-good" data-action="good" data-id="${topic.id}" aria-label="Good recall grade">
              <span>Good</span>
              <span class="recall-sub">Adequate</span>
            </button>
          </div>
        `;

        // Click title to inspect details
        card.querySelector('.card-topic-title').addEventListener('click', () => {
          UI.openTopicDetailModal(topic.id);
        });

        // Recall button event listeners
        card.querySelectorAll('.btn-recall').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const topicId = btn.dataset.id;
            UI.handleReviewSubmit(topicId, action, card);
          });
        });

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
   * Handle user clicking Forget, Hard, or Good
   */
  handleReviewSubmit(topicId, result, cardEl) {
    const topic = state.getTopic(topicId);
    if (!topic) return;

    // Trigger sound & haptics
    feedback.playRecallSound(result);

    const nowISO = new Date().toISOString();
    const scheduledAt = topic.nextAt;
    const previousInterval = topic.intervalMin || 20;

    // 1. Calculate new interval using adaptive formula
    const newInterval = calculateNextInterval(previousInterval, result);

    // 2. Append to historical review record
    const reviewRecord = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      scheduledAt: scheduledAt,
      intervalMin: previousInterval,
      result: result,
      doneAt: nowISO
    };

    if (!Array.isArray(topic.reviews)) {
      topic.reviews = [];
    }
    topic.reviews.push(reviewRecord);

    // 3. Update topic state
    topic.intervalMin = newInterval;
    topic.nextAt = computeNextAt(nowISO, newInterval);

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

    const readableNew = formatInterval(newInterval);
    const gradeLabel = result.charAt(0).toUpperCase() + result.slice(1);
    UI.showToast(`Logged as ${gradeLabel} · Next review in ${readableNew}`);
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

    // Interval brackets as specified in build spec
    const tiers = [
      { name: '20 min', maxMinutes: 30, desc: 'Initial retrieval check' },
      { name: '1 hr – 2 hr', minMinutes: 31, maxMinutes: 180, desc: 'Early memory consolidation' },
      { name: '6 hr', minMinutes: 181, maxMinutes: 480, desc: 'Same-day reinforcement' },
      { name: '1 day', minMinutes: 481, maxMinutes: 1800, desc: 'Overnight retention milestone' },
      { name: '2 days', minMinutes: 1801, maxMinutes: 3600, desc: 'Multi-day spacing' },
      { name: '3 days', minMinutes: 3601, maxMinutes: 5760, desc: 'Expanding retrieval interval' },
      { name: '7 days', minMinutes: 5761, maxMinutes: 14400, desc: 'Weekly retention check' },
      { name: '14+ days', minMinutes: 14401, maxMinutes: Infinity, desc: 'Long-term memory stability' }
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
            <span class="cal-pill" title="${escapeHtml(t.name)} (${subj.name})">
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
      timeline.innerHTML = `<div class="tier-empty">No reviews logged yet. The first check will occur at 20 minutes from completion.</div>`;
    } else {
      // Reverse to show latest first
      [...reviews].reverse().forEach(rev => {
        const item = document.createElement('div');
        item.className = 'timeline-entry';
        item.innerHTML = `
          <div class="timeline-left">
            <span class="result-chip ${rev.result}">${rev.result}</span>
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

    // Initial interval rule: First retrieval check at 20 minutes after learning
    const initialIntervalMin = 20;
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
    UI.showToast(`Logged "${name}" in ${subj.name} · First review in 20 min`);
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
  UI.initColorPicker();
  UI.populateSubjectDropdown();
  UI.renderSubjectChips();
  UI.renderTodayView();

  // Register Service Worker for offline PWA functionality
  if ('serviceWorker' in navigator) {
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
