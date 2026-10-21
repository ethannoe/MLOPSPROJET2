// Logique métier : gestion d'une liste de tâches en mémoire.
// Volontairement indépendante d'Express pour être testée unitairement.

const MAX_TITLE_LENGTH = 120;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateTitle(title) {
  if (typeof title !== 'string') {
    throw new ValidationError('Le titre doit être une chaîne de caractères');
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Le titre est obligatoire');
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Le titre ne doit pas dépasser ${MAX_TITLE_LENGTH} caractères`);
  }
  return trimmed;
}

class TodoStore {
  constructor() {
    this.todos = new Map();
    this.nextId = 1;
  }

  list() {
    return [...this.todos.values()];
  }

  get(id) {
    return this.todos.get(Number(id));
  }

  create({ title } = {}) {
    const todo = {
      id: this.nextId++,
      title: validateTitle(title),
      done: false,
      createdAt: new Date().toISOString(),
    };
    this.todos.set(todo.id, todo);
    return todo;
  }

  update(id, changes = {}) {
    const todo = this.get(id);
    if (!todo) return undefined;

    if (changes.title !== undefined) {
      todo.title = validateTitle(changes.title);
    }
    if (changes.done !== undefined) {
      if (typeof changes.done !== 'boolean') {
        throw new ValidationError('Le champ "done" doit être un booléen');
      }
      todo.done = changes.done;
    }
    return todo;
  }

  remove(id) {
    return this.todos.delete(Number(id));
  }

  stats() {
    const all = this.list();
    const done = all.filter((t) => t.done).length;
    return { total: all.length, done, remaining: all.length - done };
  }
}

module.exports = { TodoStore, ValidationError, validateTitle, MAX_TITLE_LENGTH };
