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
  el.classList.remove('app-hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('app-hidden'), 2400);
}

function setSync(status) {
  const dot = $('#sync-dot');
  const text = $('#sync-text');
  dot.className = 'h-1.5 w-1.5 rounded-full ' + (status === 'ok' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600');
  text.textContent = status === 'ok' ? 'Synced' : status === 'error' ? 'Offline — retrying' : 'Connecting…';
}

// ---------- Theme ----------
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('compass-theme', dark ? 'dark' : 'light');
  $('#theme-label').textContent = dark ? 'Light mode' : 'Dark mode';
}
(function initTheme() {
  const saved = localStorage.getItem('compass-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ? saved === 'dark' : prefersDark);
})();
$('#theme-toggle').addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('dark')));
$('#theme-toggle-mobile').addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('dark')));

// ---------- Navigation ----------
const sectionTitles = { long: 'Long-term Goals', short: 'Short-term Goals', schedule: 'Daily Schedule', ideas: 'Idea Dump' };
function goToSection(sec) {
  state.section = sec;
  $$('.goal-section, #section-schedule, #section-ideas').forEach((el) => el.classList.add('app-hidden'));
  $(`#section-${sec}`).classList.remove('app-hidden');
  $$('.nav-btn').forEach((b) => {
    const active = b.dataset.section === sec;
    b.classList.toggle('bg-primary/10', active);
    b.classList.toggle('text-primary', active);
    b.classList.toggle('dark:bg-primary/20', active);
    b.classList.toggle('dark:text-primary-light', active);
    b.classList.toggle('text-slate-600', !active);
    b.classList.toggle('dark:text-slate-300', !active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $$('.nav-btn-m').forEach((b) => {
    const active = b.dataset.section === sec;
    b.classList.toggle('text-primary', active);
    b.classList.toggle('dark:text-primary-light', active);
    b.classList.toggle('text-slate-400', !active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#mobile-title').textContent = sectionTitles[sec];
  $('#fab-idea').classList.toggle('app-hidden', sec === 'ideas');
  localStorage.setItem('compass-section', sec);
  if (sec === 'schedule') renderSchedule();
  if (sec === 'ideas') renderIdeas();
}
$$('.nav-btn, .nav-btn-m').forEach((b) => b.addEventListener('click', () => goToSection(b.dataset.section)));
$('#fab-idea').addEventListener('click', () => { goToSection('ideas'); setTimeout(() => $('#idea-input').focus(), 50); });

// ---------- Modal helpers ----------
function openModal(id) { $(id).classList.remove('app-hidden'); }
function closeModal(id) { $(id).classList.add('app-hidden'); }
$$('[data-close-modal]').forEach((b) => b.addEventListener('click', (e) => closeModal('#' + e.target.closest('[id$="-modal"]').id)));
$$('.modal-overlay').forEach((o) => o.addEventListener('click', () => o.closest('[id$="-modal"]').classList.add('app-hidden')));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('[id$="-modal"]:not(.app-hidden)').forEach((m) => m.classList.add('app-hidden'));
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

const levelStyles = {
  normal: { bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', chip: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  soon: { bar: 'bg-gradient-to-r from-amber-400 to-accent', text: 'text-amber-600 dark:text-accent', chip: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-accent' },
  urgent: { bar: 'bg-gradient-to-r from-orange-500 to-red-500', text: 'text-red-600 dark:text-red-400', chip: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' },
  overdue: { bar: 'bg-gradient-to-r from-red-600 to-red-700', text: 'text-red-700 dark:text-red-400', chip: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' },
};

function goalCardHtml(goal) {
  const tl = timelineInfo(goal.created_at, goal.deadline);
  const isScheduled = state.tasks.some((t) => t.goal_id === goal.id);
  const styles = tl ? levelStyles[tl.level] : null;
  const urgentClass = tl && (tl.level === 'urgent' || tl.level === 'overdue') ? 'urgent-pulse' : '';
  return `
  <div class="goal-card card-hover fade-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 ${goal.completed ? 'opacity-60' : ''}" data-id="${goal.id}">
    <div class="flex items-start gap-3">
      <button data-toggle-complete="${goal.id}" class="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${goal.completed ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600 hover:border-primary'}" aria-label="Toggle complete">
        ${goal.completed ? '<svg class="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
      </button>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold leading-snug ${goal.completed ? 'line-through text-slate-400' : ''}">${escapeHtml(goal.title)}</h3>
          <div class="flex items-center gap-1 shrink-0">
            <button data-edit-goal="${goal.id}" class="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Edit"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button data-delete-goal="${goal.id}" class="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" aria-label="Delete"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg></button>
          </div>
        </div>
        ${goal.description ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">${escapeHtml(goal.description)}</p>` : ''}
        ${tl ? `
        <div class="mt-3">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] font-semibold ${styles.text} ${urgentClass}">${tl.label}</span>
            <span class="text-[11px] text-slate-400">${new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full ${styles.bar} transition-all duration-500" style="width:${tl.pct}%"></div>
          </div>
        </div>` : `<p class="text-[11px] text-slate-400 mt-2">No deadline set</p>`}
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          ${isScheduled ? `<span class="text-[11px] font-medium text-primary dark:text-primary-light bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1"><svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>On schedule</span>` : `<button data-move-goal="${goal.id}" class="text-[11px] font-semibold text-primary dark:text-primary-light hover:underline">+ Add to daily schedule</button>`}
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
    empty.classList.remove('app-hidden');
    return;
  }
  empty.classList.add('app-hidden');
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
  <div class="task-row card-hover fade-in flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3" data-id="${task.id}">
    <button data-toggle-task="${task.id}" class="h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600 hover:border-primary'}" aria-label="Toggle complete">
      ${task.completed ? '<svg class="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
    </button>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium leading-snug ${task.completed ? 'line-through text-slate-400' : ''}">${escapeHtml(task.title)}</p>
      ${goal ? `<p class="text-[11px] text-primary dark:text-primary-light mt-0.5 flex items-center gap-1"><svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6M12 22v-6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6M4.9 19.1l4.2-4.2M14.9 9.1l4.2-4.2"/></svg>${escapeHtml(goal.title)}</p>` : ''}
    </div>
    ${task.task_time ? `<span class="text-xs font-mono text-slate-400 shrink-0">${formatTime(task.task_time)}</span>` : `<span class="text-xs text-slate-300 dark:text-slate-600 shrink-0">Anytime</span>`}
    <div class="flex items-center gap-1 shrink-0">
      <button data-edit-task="${task.id}" class="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Edit"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button data-delete-task="${task.id}" class="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" aria-label="Delete"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg></button>
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
    empty.classList.remove('app-hidden');
    $('#schedule-progress').textContent = '';
    return;
  }
  empty.classList.add('app-hidden');
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
  <div class="idea-card card-hover fade-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 ${idea.archived ? 'opacity-50' : ''}" data-id="${idea.id}">
    <div class="flex items-start justify-between gap-2">
      <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">${escapeHtml(idea.content)}</p>
      <div class="flex items-center gap-1 shrink-0">
        <button data-promote-idea="${idea.id}" class="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Promote to goal" title="Turn into a goal"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6M12 22v-6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6M4.9 19.1l4.2-4.2M14.9 9.1l4.2-4.2"/></svg></button>
        <button data-archive-idea="${idea.id}" class="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Archive" title="${idea.archived ? 'Unarchive' : 'Archive'}"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M10 13h4"/></svg></button>
        <button data-delete-idea="${idea.id}" class="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" aria-label="Delete"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg></button>
      </div>
    </div>
    <div class="flex items-center gap-2 mt-2 flex-wrap">
      <span class="text-[11px] text-slate-400">${timeAgo(idea.created_at)}</span>
      ${(idea.tags || []).map((t) => `<span class="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">#${escapeHtml(t)}</span>`).join('')}
      ${idea.promoted_goal_id ? `<span class="text-[10px] font-semibold text-primary dark:text-primary-light">→ promoted to a goal</span>` : ''}
    </div>
  </div>`;
}

function updateIdeaBadge() {
  const active = state.ideas.filter((i) => !i.archived).length;
  const badge = $('#idea-count-badge');
  if (active > 0) { badge.textContent = active; badge.classList.remove('app-hidden'); } else badge.classList.add('app-hidden');
}

function renderTagFilters() {
  const tagCounts = {};
  state.ideas.forEach((i) => (i.tags || []).forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
  const tags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 8);
  $('#tag-filters').innerHTML = tags.map((t) => `
    <button data-tag-filter="${escapeHtml(t)}" class="text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${state.activeTagFilter === t ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-primary/40'}">#${escapeHtml(t)}</button>
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
    empty.classList.remove('app-hidden');
    return;
  }
  empty.classList.add('app-hidden');
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
  $('#reminder-banner').classList.remove('app-hidden');
  $('#reminder-banner').dataset.ideaId = idea.id;
  supabase.from('ideas').update({ last_surfaced_at: new Date().toISOString() }).eq('id', idea.id).then(() => {
    idea.last_surfaced_at = new Date().toISOString();
  });
}
$('#reminder-dismiss').addEventListener('click', () => {
  $('#reminder-banner').classList.add('app-hidden');
  sessionStorage.setItem('compass-reminder-dismissed', String(Date.now() + 1000 * 60 * 60 * 4));
});
$('#reminder-snooze').addEventListener('click', () => {
  const pool = state.ideas.filter((i) => !i.archived);
  showRandomReminder(pool);
});
$('#reminder-promote').addEventListener('click', () => {
  const id = $('#reminder-banner').dataset.ideaId;
  const idea = state.ideas.find((i) => i.id === id);
  $('#reminder-banner').classList.add('app-hidden');
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
  reply.classList.remove('app-hidden');
  reply.innerHTML = '<span class="text-slate-400">Thinking…</span>';
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
  reply.innerHTML = `<p class="text-slate-700 dark:text-slate-200">${escapeHtml(text)}</p>` +
    (matches.length ? `<div class="mt-2 space-y-1.5">${matches.map((m) => `<div class="text-xs bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-2"><span class="text-slate-600 dark:text-slate-300">${escapeHtml(m.content.slice(0, 140))}${m.content.length > 140 ? '…' : ''}</span><span class="block text-[10px] text-slate-400 mt-0.5">${timeAgo(m.created_at)}</span></div>`).join('')}</div>` : '');
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
