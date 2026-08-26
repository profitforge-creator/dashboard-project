import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://zwhxwwtowpfzxbjzvzba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3aHh3d3Rvd3Bmenhianp2emJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTU3NjksImV4cCI6MjEwMzE5MTc2OX0.OT0Wp8qMoEqhUpgKfmJX88wkBO8922lNlEEUvBML4Dk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- State ----------
const state = {
  goals: [],
  tasks: [],
  ideas: [],
  section: 'long',
  scheduleDate: todayISO(),
  activeTagFilter: null,
  ideaSearch: '',
  editingGoalId: null,
  editingTaskId: null,
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- DOM helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

function setSync(status) {
  const dot = $('#sync-dot');
  const text = $('#sync-text');
  dot.className = 'sync-dot' + (status === 'ok' ? ' ok' : status === 'error' ? ' error' : '');
  text.textContent = status === 'ok' ? 'Synced' : status === 'error' ? 'Offline — retrying' : 'Connecting…';
}

// ---------- Theme ----------
function applyTheme(dark) {
  if (dark) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', 'light');
  localStorage.setItem('compass-theme', dark ? 'dark' : 'light');
  const label = dark ? 'Light mode' : 'Dark mode';
  $('#theme-label').textContent = label;
}
function isDarkActive() { return document.documentElement.getAttribute('data-theme') !== 'light'; }
(function initTheme() {
  const saved = localStorage.getItem('compass-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ? saved === 'dark' : prefersDark);
})();
$('#theme-toggle').addEventListener('click', () => applyTheme(!isDarkActive()));
$('#theme-toggle-mobile').addEventListener('click', () => applyTheme(!isDarkActive()));

// ---------- Navigation ----------
const sectionTitles = { long: 'Long-term Goals', short: 'Short-term Goals', schedule: 'Daily Schedule', ideas: 'Idea Dump' };
function goToSection(sec) {
  state.section = sec;
  $$('.view').forEach((el) => el.classList.remove('active'));
  $(`#section-${sec}`).classList.add('active');
  $$('.nav-btn').forEach((b) => {
    const active = b.dataset.section === sec;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $$('.nav-btn-m').forEach((b) => {
    const active = b.dataset.section === sec;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#mobile-title').textContent = sectionTitles[sec];
  $('#fab-idea').classList.toggle('show', sec !== 'ideas');
  localStorage.setItem('compass-section', sec);
  if (sec === 'schedule') renderSchedule();
  if (sec === 'ideas') renderIdeas();
}
$$('.nav-btn, .nav-btn-m').forEach((b) => b.addEventListener('click', () => goToSection(b.dataset.section)));
$('#fab-idea').addEventListener('click', () => { goToSection('ideas'); setTimeout(() => $('#idea-input').focus(), 50); });

// ---------- Modal helpers ----------
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }
$$('[data-close-modal]').forEach((b) => b.addEventListener('click', (e) => closeModal('#' + e.target.closest('[id$="-modal"]').id)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('[id$="-modal"].open').forEach((m) => m.classList.remove('open'));
});

let confirmCallback = null;
function askConfirm(text, onYes) {
  $('#confirm-text').textContent = text;
  confirmCallback = onYes;
  openModal('#confirm-modal');
}
$('#confirm-yes').addEventListener('click', () => { closeModal('#confirm-modal'); if (confirmCallback) confirmCallback(); });
$('#confirm-no').addEventListener('click', () => closeModal('#confirm-modal'));

// ---------- Data loading ----------
async function loadAll() {
  setSync('connecting');
  try {
    const [g, t, i] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('schedule_tasks').select('*').order('task_time', { ascending: true, nullsFirst: false }),
      supabase.from('ideas').select('*').order('created_at', { ascending: false }),
    ]);
    if (g.error) throw g.error;
    if (t.error) throw t.error;
    if (i.error) throw i.error;
    state.goals = g.data || [];
    state.tasks = t.data || [];
    state.ideas = i.data || [];
    setSync('ok');
    renderAll();
    maybeShowReminder();
  } catch (err) {
    console.error(err);
    setSync('error');
    toast('Could not reach the database. Check your connection.');
  }
}

function renderAll() {
  renderGoals('long');
  renderGoals('short');
  renderSchedule();
  renderIdeas();
  updateIdeaBadge();
}

// ---------- Timeline / urgency ----------
function timelineInfo(createdAt, deadline) {
  if (!deadline) return null;
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const total = Math.max(end - start, 1);
  const elapsed = now - start;
  let pct = Math.min(Math.max((elapsed / total) * 100, 0), 100);
  const msRemaining = end - now;
  const overdue = msRemaining < 0;
  if (overdue) pct = 100;
  const daysRemaining = Math.abs(msRemaining) / 86400000;

  let level = 'normal'; // normal | soon | urgent | overdue
  if (overdue) level = 'overdue';
  else if (daysRemaining <= 2) level = 'urgent';
  else if (pct >= 70 || daysRemaining <= 7) level = 'soon';

  let label;
  if (overdue) {
    const d = Math.floor(daysRemaining);
    label = d < 1 ? 'Overdue' : `Overdue by ${d} day${d === 1 ? '' : 's'}`;
  } else if (daysRemaining < 1) {
    const hrs = Math.max(Math.round(daysRemaining * 24), 1);
    label = `${hrs} hour${hrs === 1 ? '' : 's'} left`;
  } else {
    const d = Math.round(daysRemaining);
    label = `${d} day${d === 1 ? '' : 's'} left`;
  }
  return { pct, level, label };
}

function goalCardHtml(goal) {
  const tl = timelineInfo(goal.created_at, goal.deadline);
  const isScheduled = state.tasks.some((t) => t.goal_id === goal.id);
  const urgentClass = tl && (tl.level === 'urgent' || tl.level === 'overdue') ? 'pulse-urgent' : '';
  return `
  <div class="dk-card goal-card fade-in ${goal.completed ? 'completed' : ''}" data-id="${goal.id}">
    <div class="goal-card__row">
      <button data-toggle-complete="${goal.id}" class="goal-check ${goal.completed ? 'done' : ''}" aria-label="Toggle complete">
        ${goal.completed ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}
      </button>
      <div style="min-width:0; flex:1;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
          <h3 class="goal-card__title ${goal.completed ? 'done' : ''}">${escapeHtml(goal.title)}</h3>
          <div class="goal-card__actions">
            <button data-edit-goal="${goal.id}" class="icon-btn" aria-label="Edit"><svg class="icon"><use href="#i-edit"/></svg></button>
            <button data-delete-goal="${goal.id}" class="icon-btn icon-btn--danger" aria-label="Delete"><svg class="icon"><use href="#i-trash"/></svg></button>
          </div>
        </div>
        ${goal.description ? `<p class="goal-card__desc">${escapeHtml(goal.description)}</p>` : ''}
        ${tl ? `
        <div class="goal-card__timeline">
          <div class="timeline-toprow">
            <span class="timeline-label level-${tl.level} ${urgentClass}">${tl.label}</span>
            <span class="timeline-date">${new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div class="timeline-track">
            <div class="timeline-fill level-${tl.level}" style="width:${tl.pct}%"></div>
          </div>
        </div>` : `<p class="no-deadline">No deadline set</p>`}
        <div class="goal-card__foot">
          ${isScheduled ? `<span class="on-schedule"><svg class="icon"><use href="#i-check"/></svg>On schedule</span>` : `<button data-move-goal="${goal.id}" class="add-schedule-btn">+ Add to daily schedule</button>`}
        </div>
      </div>
    </div>
  </div>`;
}

function renderGoals(term) {
  const list = $(`[data-list="${term}"]`);
  const empty = $(`[data-empty="${term}"]`);
  const goals = state.goals
    .filter((g) => g.term === term)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  if (!goals.length) {
    list.innerHTML = '';
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');
  list.innerHTML = goals.map(goalCardHtml).join('');
}

// ---------- Goal actions ----------
function openGoalModal(term, goal = null) {
  state.editingGoalId = goal ? goal.id : null;
  $('#goal-modal-title').textContent = goal ? 'Edit Goal' : 'New Goal';
  $('#goal-id').value = goal ? goal.id : '';
  $('#goal-title').value = goal ? goal.title : '';
  $('#goal-desc').value = goal ? (goal.description || '') : '';
  $('#goal-term').value = goal ? goal.term : term;
  $('#goal-deadline').value = goal && goal.deadline ? goal.deadline.slice(0, 10) : '';
  openModal('#goal-modal');
  setTimeout(() => $('#goal-title').focus(), 50);
}

$$('[data-add-goal]').forEach((b) => b.addEventListener('click', () => openGoalModal(b.dataset.addGoal)));

$('#goal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#goal-id').value;
  const payload = {
    title: $('#goal-title').value.trim(),
    description: $('#goal-desc').value.trim(),
    term: $('#goal-term').value,
    deadline: $('#goal-deadline').value ? new Date($('#goal-deadline').value + 'T23:59:59').toISOString() : null,
  };
  if (!payload.title) return;
  try {
    if (id) {
      const { error } = await supabase.from('goals').update(payload).eq('id', id);
      if (error) throw error;
      Object.assign(state.goals.find((g) => g.id === id), payload);
    } else {
      const { data, error } = await supabase.from('goals').insert(payload).select().single();
      if (error) throw error;
      state.goals.unshift(data);
    }
    closeModal('#goal-modal');
    renderGoals('long');
    renderGoals('short');
    toast(id ? 'Goal updated' : 'Goal created');
  } catch (err) {
    console.error(err);
    toast('Could not save the goal.');
  }
});

document.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit-goal]');
  if (editBtn) {
    const goal = state.goals.find((g) => g.id === editBtn.dataset.editGoal);
    if (goal) openGoalModal(goal.term, goal);
    return;
  }
  const delBtn = e.target.closest('[data-delete-goal]');
  if (delBtn) {
    const goalId = delBtn.dataset.deleteGoal;
    askConfirm('Delete this goal? This cannot be undone.', async () => {
      try {
        const { error } = await supabase.from('goals').delete().eq('id', goalId);
        if (error) throw error;
        state.goals = state.goals.filter((g) => g.id !== goalId);
        renderGoals('long');
        renderGoals('short');
        toast('Goal deleted');
      } catch (err) {
        console.error(err);
        toast('Could not delete the goal.');
      }
    });
    return;
  }
  const toggleBtn = e.target.closest('[data-toggle-complete]');
  if (toggleBtn) {
    const goal = state.goals.find((g) => g.id === toggleBtn.dataset.toggleComplete);
    if (!goal) return;
    const completed = !goal.completed;
    goal.completed = completed;
    goal.completed_at = completed ? new Date().toISOString() : null;
    renderGoals(goal.term);
    try {
      const { error } = await supabase.from('goals').update({ completed, completed_at: goal.completed_at }).eq('id', goal.id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast('Could not update the goal.');
    }
    return;
  }
  const moveBtn = e.target.closest('[data-move-goal]');
  if (moveBtn) {
    const goal = state.goals.find((g) => g.id === moveBtn.dataset.moveGoal);
    if (!goal) return;
    $('#move-goal-id').value = goal.id;
    $('#move-title').value = goal.title;
    $('#move-date').value = state.scheduleDate;
    $('#move-time').value = '';
    openModal('#move-modal');
  }
});

$('#move-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const goalId = $('#move-goal-id').value;
  const payload = {
    title: $('#move-title').value.trim(),
    task_date: $('#move-date').value,
    task_time: $('#move-time').value || null,
    goal_id: goalId || null,
    completed: false,
  };
  try {
    const { data, error } = await supabase.from('schedule_tasks').insert(payload).select().single();
    if (error) throw error;
    state.tasks.push(data);
    closeModal('#move-modal');
    renderGoals('long');
    renderGoals('short');
    if (payload.task_date === state.scheduleDate) renderSchedule();
    toast('Added to schedule');
  } catch (err) {
    console.error(err);
    toast('Could not add to schedule.');
  }
});

// ---------- Daily Schedule ----------
$('#schedule-date').value = state.scheduleDate;
$('#schedule-date').addEventListener('change', (e) => { state.scheduleDate = e.target.value; renderSchedule(); });
$('#date-prev').addEventListener('click', () => shiftDate(-1));
$('#date-next').addEventListener('click', () => shiftDate(1));
$('#date-today').addEventListener('click', () => { state.scheduleDate = todayISO(); $('#schedule-date').value = state.scheduleDate; renderSchedule(); });
function shiftDate(delta) {
  const d = new Date(state.scheduleDate + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  state.scheduleDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  $('#schedule-date').value = state.scheduleDate;
  renderSchedule();
}

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function taskRowHtml(task) {
  const goal = task.goal_id ? state.goals.find((g) => g.id === task.goal_id) : null;
  return `
  <div class="dk-card task-row fade-in ${task.completed ? 'completed' : ''}" data-id="${task.id}">
    <button data-toggle-task="${task.id}" class="goal-check ${task.completed ? 'done' : ''}" aria-label="Toggle complete">
      ${task.completed ? '<svg class="icon"><use href="#i-check"/></svg>' : ''}
    </button>
    <div class="task-row__body">
      <p class="task-row__title">${escapeHtml(task.title)}</p>
      ${goal ? `<p class="task-row__goal"><svg class="icon"><use href="#i-target"/></svg>${escapeHtml(goal.title)}</p>` : ''}
    </div>
    ${task.task_time ? `<span class="task-row__time">${formatTime(task.task_time)}</span>` : `<span class="task-row__time" style="opacity:.55">Anytime</span>`}
    <div class="task-row__actions">
      <button data-edit-task="${task.id}" class="icon-btn" aria-label="Edit"><svg class="icon"><use href="#i-edit"/></svg></button>
      <button data-delete-task="${task.id}" class="icon-btn icon-btn--danger" aria-label="Delete"><svg class="icon"><use href="#i-trash"/></svg></button>
    </div>
  </div>`;
}

function renderSchedule() {
  const list = $('[data-list="schedule"]');
  const empty = $('[data-empty="schedule"]');
  const tasks = state.tasks
    .filter((t) => t.task_date === state.scheduleDate)
    .sort((a, b) => {
      if (!a.task_time && !b.task_time) return 0;
      if (!a.task_time) return 1;
      if (!b.task_time) return -1;
      return a.task_time.localeCompare(b.task_time);
    });
  if (!tasks.length) {
    list.innerHTML = '';
    empty.classList.add('show');
    $('#schedule-progress').textContent = '';
    return;
  }
  empty.classList.remove('show');
  list.innerHTML = tasks.map(taskRowHtml).join('');
  const done = tasks.filter((t) => t.completed).length;
  $('#schedule-progress').textContent = `${done}/${tasks.length} done`;
}

function openTaskModal(task = null) {
  state.editingTaskId = task ? task.id : null;
  $('#task-modal-title').textContent = task ? 'Edit Task' : 'Add Task';
  $('#task-id').value = task ? task.id : '';
  $('#task-title').value = task ? task.title : '';
  $('#task-date').value = task ? task.task_date : state.scheduleDate;
  $('#task-time').value = task ? (task.task_time || '') : '';
  openModal('#task-modal');
  setTimeout(() => $('#task-title').focus(), 50);
}
$('[data-add-task]').addEventListener('click', () => openTaskModal());

$('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#task-id').value;
  const payload = {
    title: $('#task-title').value.trim(),
    task_date: $('#task-date').value,
    task_time: $('#task-time').value || null,
  };
  if (!payload.title) return;
  try {
    if (id) {
      const { error } = await supabase.from('schedule_tasks').update(payload).eq('id', id);
      if (error) throw error;
      Object.assign(state.tasks.find((t) => t.id === id), payload);
    } else {
      const { data, error } = await supabase.from('schedule_tasks').insert({ ...payload, completed: false }).select().single();
      if (error) throw error;
      state.tasks.push(data);
    }
    closeModal('#task-modal');
    renderSchedule();
    toast(id ? 'Task updated' : 'Task added');
  } catch (err) {
    console.error(err);
    toast('Could not save the task.');
  }
});

document.addEventListener('click', async (e) => {
  const toggleBtn = e.target.closest('[data-toggle-task]');
  if (toggleBtn) {
    const task = state.tasks.find((t) => t.id === toggleBtn.dataset.toggleTask);
    if (!task) return;
    task.completed = !task.completed;
    renderSchedule();
    try {
      const { error } = await supabase.from('schedule_tasks').update({ completed: task.completed }).eq('id', task.id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast('Could not update the task.');
    }
    return;
  }
  const editBtn = e.target.closest('[data-edit-task]');
  if (editBtn) {
    const task = state.tasks.find((t) => t.id === editBtn.dataset.editTask);
    if (task) openTaskModal(task);
    return;
  }
  const delBtn = e.target.closest('[data-delete-task]');
  if (delBtn) {
    const taskId = delBtn.dataset.deleteTask;
    askConfirm('Delete this task?', async () => {
      try {
        const { error } = await supabase.from('schedule_tasks').delete().eq('id', taskId);
        if (error) throw error;
        state.tasks = state.tasks.filter((t) => t.id !== taskId);
        renderSchedule();
        renderGoals('long');
        renderGoals('short');
        toast('Task deleted');
      } catch (err) {
        console.error(err);
        toast('Could not delete the task.');
      }
    });
  }
});

// ---------- Ideas ----------
function extractTags(content) {
  const matches = content.match(/#[\p{L}\p{N}_-]+/gu) || [];
  const tags = new Set(matches.map((t) => t.slice(1).toLowerCase()));
  if (!tags.size) {
    const heuristics = [
      { tag: 'work', re: /\b(work|project|client|meeting|deadline|boss|colleague)\b/i },
      { tag: 'people', re: /\b(call|email|text|meet|talk to|ask)\b/i },
      { tag: 'shopping', re: /\b(buy|purchase|order|shop)\b/i },
      { tag: 'app-idea', re: /\b(app|feature|build|product|tool)\b/i },
      { tag: 'health', re: /\b(gym|run|workout|diet|sleep|doctor)\b/i },
      { tag: 'finance', re: /\b(money|budget|invest|save|pay|bill)\b/i },
      { tag: 'creative', re: /\b(write|design|draw|music|song|story)\b/i },
    ];
    heuristics.forEach((h) => { if (h.re.test(content)) tags.add(h.tag); });
  }
  return Array.from(tags).slice(0, 4);
}

$('#idea-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('#idea-form').requestSubmit();
  }
});

$('#idea-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#idea-input');
  const content = input.value.trim();
  if (!content) return;
  const tags = extractTags(content);
  const payload = { content, tags, archived: false };
  input.value = '';
  try {
    const { data, error } = await supabase.from('ideas').insert(payload).select().single();
    if (error) throw error;
    state.ideas.unshift(data);
    renderIdeas();
    updateIdeaBadge();
    toast('Idea captured');
  } catch (err) {
    console.error(err);
    toast('Could not save the idea.');
    input.value = content;
  }
});

document.addEventListener('click', async (e) => {
  const archiveBtn = e.target.closest('[data-archive-idea]');
  if (archiveBtn) {
    const idea = state.ideas.find((i) => i.id === archiveBtn.dataset.archiveIdea);
    if (!idea) return;
    idea.archived = !idea.archived;
    renderIdeas();
    try {
      const { error } = await supabase.from('ideas').update({ archived: idea.archived }).eq('id', idea.id);
      if (error) throw error;
    } catch (err) { console.error(err); }
    return;
  }
  const delBtn = e.target.closest('[data-delete-idea]');
  if (delBtn) {
    const ideaId = delBtn.dataset.deleteIdea;
    askConfirm('Delete this idea?', async () => {
      try {
        const { error } = await supabase.from('ideas').delete().eq('id', ideaId);
        if (error) throw error;
        state.ideas = state.ideas.filter((i) => i.id !== ideaId);
        renderIdeas();
        updateIdeaBadge();
        toast('Idea deleted');
      } catch (err) {
        console.error(err);
        toast('Could not delete the idea.');
      }
    });
    return;
  }
  const promoteBtn = e.target.closest('[data-promote-idea]');
  if (promoteBtn) {
    const idea = state.ideas.find((i) => i.id === promoteBtn.dataset.promoteIdea);
    if (idea) promoteIdeaToGoal(idea);
    return;
  }
  const tagChip = e.target.closest('[data-tag-filter]');
  if (tagChip) {
    const tag = tagChip.dataset.tagFilter;
    state.activeTagFilter = state.activeTagFilter === tag ? null : tag;
    renderIdeas();
  }
});

function promoteIdeaToGoal(idea) {
  openGoalModal('short');
  $('#goal-title').value = idea.content.length > 80 ? idea.content.slice(0, 80) + '…' : idea.content;
  $('#goal-form').dataset.promoteFrom = idea.id;
  const onSave = async () => {
    const goalId = state.goals[0] && state.goals[0].id;
    if (goalId) {
      try {
        await supabase.from('ideas').update({ promoted_goal_id: goalId }).eq('id', idea.id);
        idea.promoted_goal_id = goalId;
      } catch (err) { console.error(err); }
    }
  };
  $('#goal-form').addEventListener('submit', onSave, { once: true });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ideaCardHtml(idea) {
  return `
  <div class="dk-card idea-card fade-in ${idea.archived ? 'archived' : ''}" data-id="${idea.id}">
    <div class="idea-card__row">
      <p class="idea-card__text">${escapeHtml(idea.content)}</p>
      <div class="idea-card__actions">
        <button data-promote-idea="${idea.id}" class="icon-btn" aria-label="Promote to goal" title="Turn into a goal"><svg class="icon"><use href="#i-target"/></svg></button>
        <button data-archive-idea="${idea.id}" class="icon-btn" aria-label="Archive" title="${idea.archived ? 'Unarchive' : 'Archive'}"><svg class="icon"><use href="#i-archive"/></svg></button>
        <button data-delete-idea="${idea.id}" class="icon-btn icon-btn--danger" aria-label="Delete"><svg class="icon"><use href="#i-trash"/></svg></button>
      </div>
    </div>
    <div class="idea-card__meta">
      <span class="idea-card__time">${timeAgo(idea.created_at)}</span>
      ${(idea.tags || []).map((t) => `<span class="idea-tag">#${escapeHtml(t)}</span>`).join('')}
      ${idea.promoted_goal_id ? `<span class="idea-promoted">&rarr; promoted to a goal</span>` : ''}
    </div>
  </div>`;
}

function updateIdeaBadge() {
  const active = state.ideas.filter((i) => !i.archived).length;
  const badge = $('#idea-count-badge');
  if (active > 0) { badge.textContent = active; badge.classList.add('show'); } else badge.classList.remove('show');
}

function renderTagFilters() {
  const tagCounts = {};
  state.ideas.forEach((i) => (i.tags || []).forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
  const tags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 8);
  $('#tag-filters').innerHTML = tags.map((t) => `
    <button data-tag-filter="${escapeHtml(t)}" class="tag-chip ${state.activeTagFilter === t ? 'active' : ''}">#${escapeHtml(t)}</button>
  `).join('');
}

$('#idea-search').addEventListener('input', (e) => { state.ideaSearch = e.target.value.toLowerCase(); renderIdeas(); });

function renderIdeas() {
  renderTagFilters();
  const list = $('[data-list="ideas"]');
  const empty = $('[data-empty="ideas"]');
  let ideas = [...state.ideas];
  if (state.activeTagFilter) ideas = ideas.filter((i) => (i.tags || []).includes(state.activeTagFilter));
  if (state.ideaSearch) {
    ideas = ideas.filter((i) => i.content.toLowerCase().includes(state.ideaSearch) || (i.tags || []).some((t) => t.includes(state.ideaSearch)));
  }
  if (!ideas.length) {
    list.innerHTML = '';
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');
  list.innerHTML = ideas.map(ideaCardHtml).join('');
  updateIdeaBadge();
}

// ---------- Idea resurfacing reminder ----------
function maybeShowReminder() {
  const candidates = state.ideas.filter((i) => !i.archived);
  if (!candidates.length) return;
  const dismissedUntil = Number(sessionStorage.getItem('compass-reminder-dismissed') || 0);
  if (Date.now() < dismissedUntil) return;
  showRandomReminder(candidates);
}
function showRandomReminder(pool) {
  const sorted = [...pool].sort((a, b) => new Date(a.last_surfaced_at || a.created_at) - new Date(b.last_surfaced_at || b.created_at));
  const weightedPool = sorted.slice(0, Math.max(Math.ceil(sorted.length / 2), 1));
  const idea = weightedPool[Math.floor(Math.random() * weightedPool.length)];
  if (!idea) return;
  $('#reminder-text').textContent = idea.content;
  $('#reminder-meta').textContent = `Captured ${timeAgo(idea.created_at)}`;
  $('#reminder-banner').classList.add('show');
  $('#reminder-banner').dataset.ideaId = idea.id;
  supabase.from('ideas').update({ last_surfaced_at: new Date().toISOString() }).eq('id', idea.id).then(() => {
    idea.last_surfaced_at = new Date().toISOString();
  });
}
$('#reminder-dismiss').addEventListener('click', () => {
  $('#reminder-banner').classList.remove('show');
  sessionStorage.setItem('compass-reminder-dismissed', String(Date.now() + 1000 * 60 * 60 * 4));
});
$('#reminder-snooze').addEventListener('click', () => {
  const pool = state.ideas.filter((i) => !i.archived);
  showRandomReminder(pool);
});
$('#reminder-promote').addEventListener('click', () => {
  const id = $('#reminder-banner').dataset.ideaId;
  const idea = state.ideas.find((i) => i.id === id);
  $('#reminder-banner').classList.remove('show');
  if (idea) { goToSection('ideas'); promoteIdeaToGoal(idea); }
});

// ---------- Assistant (retrieve / remind) ----------
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');

function heuristicAsk(query) {
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const stop = new Set(['what', 'did', 'i', 'about', 'the', 'a', 'an', 'to', 'my', 'me', 'think', 'was', 'is', 'of', 'for', 'on']);
  const keywords = terms.filter((t) => !stop.has(t) && t.length > 1).map(stem);
  if (!keywords.length) return { text: "Try asking about a topic, e.g. \"ideas about marketing\" or a specific word from an idea.", matches: [] };
  const scored = state.ideas.map((idea) => {
    const hayWords = (idea.content + ' ' + (idea.tags || []).join(' ')).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const hayStems = hayWords.map(stem);
    let score = 0;
    keywords.forEach((k) => { if (hayStems.some((h) => h === k || h.startsWith(k) || k.startsWith(h))) score += k.length >= 4 ? 2 : 1; });
    return { idea, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  if (!scored.length) return { text: `I couldn't find any ideas matching "${query}".`, matches: [] };
  return { text: `Found ${scored.length} idea${scored.length === 1 ? '' : 's'} that might match:`, matches: scored.map((s) => s.idea) };
}

async function askAssistant(query) {
  const reply = $('#assistant-reply');
  reply.classList.add('show');
  reply.innerHTML = '<span style="color:var(--muted)">Thinking…</span>';
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ideas: state.ideas.filter((i) => !i.archived).map((i) => ({ id: i.id, content: i.content, tags: i.tags, created_at: i.created_at })) }),
    });
    if (!res.ok) throw new Error('assistant unavailable');
    const data = await res.json();
    renderAssistantReply(data.text, (data.matchIds || []).map((id) => state.ideas.find((i) => i.id === id)).filter(Boolean));
  } catch {
    const { text, matches } = heuristicAsk(query);
    renderAssistantReply(text, matches);
  }
}
function renderAssistantReply(text, matches) {
  const reply = $('#assistant-reply');
  reply.innerHTML = `<p style="margin:0">${escapeHtml(text)}</p>` +
    (matches.length ? `<div class="assistant-reply__matches">${matches.map((m) => `<div class="assistant-match">${escapeHtml(m.content.slice(0, 140))}${m.content.length > 140 ? '…' : ''}<span class="assistant-match__meta">${timeAgo(m.created_at)}</span></div>`).join('')}</div>` : '');
}
$('#assistant-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#assistant-input').value.trim();
  if (!q) return;
  askAssistant(q);
});

// ---------- Init ----------
(function initSectionFromStorage() {
  const saved = localStorage.getItem('compass-section');
  goToSection(saved && sectionTitles[saved] ? saved : 'long');
})();

loadAll();
