const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const errorBox = document.getElementById('error');
const statsBox = document.querySelector('[data-cy="stats"]');

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erreur HTTP ${res.status}`);
  return data;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function renderTodo(todo) {
  const li = document.createElement('li');
  li.dataset.cy = 'todo-item';
  li.dataset.id = todo.id;
  li.classList.toggle('done', todo.done);

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.done;
  checkbox.dataset.cy = 'todo-toggle';
  checkbox.addEventListener('change', async () => {
    await api('PATCH', `/api/todos/${todo.id}`, { done: checkbox.checked });
    refresh();
  });

  const title = document.createElement('span');
  title.className = 'todo-title';
  title.textContent = todo.title;
  label.append(checkbox, title);

  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = 'Supprimer';
  del.dataset.cy = 'todo-delete';
  del.addEventListener('click', async () => {
    await api('DELETE', `/api/todos/${todo.id}`);
    refresh();
  });

  li.append(label, del);
  return li;
}

async function refresh() {
  const { items, stats } = await api('GET', '/api/todos');
  list.replaceChildren(...items.map(renderTodo));
  statsBox.textContent = `${stats.total} tâche(s) · ${stats.done} terminée(s) · ${stats.remaining} restante(s)`;
}

async function loadHealth() {
  const healthEl = document.querySelector('[data-cy="health"]');
  const versionEl = document.querySelector('[data-cy="version"]');
  try {
    const health = await api('GET', '/health');
    healthEl.innerHTML = 'Statut : <span class="up">en ligne</span>';
    versionEl.textContent = `version ${health.version}`;
  } catch {
    healthEl.textContent = 'Statut : hors ligne';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  // On vide le champ tout de suite pour qu'une saisie rapide ne se mélange
  // pas avec la tâche en cours d'envoi ; il est restauré en cas d'erreur.
  const title = input.value;
  input.value = '';
  try {
    await api('POST', '/api/todos', { title });
    showError('');
    refresh();
  } catch (err) {
    input.value = title;
    showError(err.message);
  }
});

refresh();
loadHealth();
