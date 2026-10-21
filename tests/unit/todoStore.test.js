const {
  TodoStore,
  ValidationError,
  validateTitle,
  MAX_TITLE_LENGTH,
} = require('../../src/todoStore');

describe('validateTitle', () => {
  test('retourne le titre sans espaces superflus', () => {
    expect(validateTitle('  Acheter du pain  ')).toBe('Acheter du pain');
  });

  test.each([[undefined], [null], [42], [{}], [[]]])('refuse une valeur non textuelle (%p)', (value) => {
    expect(() => validateTitle(value)).toThrow(ValidationError);
  });

  test('refuse un titre vide ou composé uniquement d’espaces', () => {
    expect(() => validateTitle('')).toThrow('Le titre est obligatoire');
    expect(() => validateTitle('    ')).toThrow('Le titre est obligatoire');
  });

  test(`refuse un titre de plus de ${MAX_TITLE_LENGTH} caractères`, () => {
    expect(() => validateTitle('a'.repeat(MAX_TITLE_LENGTH))).not.toThrow();
    expect(() => validateTitle('a'.repeat(MAX_TITLE_LENGTH + 1))).toThrow(ValidationError);
  });
});

describe('TodoStore', () => {
  let store;

  beforeEach(() => {
    store = new TodoStore();
  });

  test('démarre vide', () => {
    expect(store.list()).toEqual([]);
    expect(store.stats()).toEqual({ total: 0, done: 0, remaining: 0 });
  });

  test('crée une tâche avec un id incrémental et done=false', () => {
    const first = store.create({ title: 'Première' });
    const second = store.create({ title: 'Seconde' });

    expect(first).toMatchObject({ id: 1, title: 'Première', done: false });
    expect(second.id).toBe(2);
    expect(new Date(first.createdAt).toString()).not.toBe('Invalid Date');
    expect(store.list()).toHaveLength(2);
  });

  test('n’ajoute rien si la création est invalide', () => {
    expect(() => store.create({ title: '' })).toThrow(ValidationError);
    expect(() => store.create()).toThrow(ValidationError);
    expect(store.list()).toHaveLength(0);
  });

  test('retrouve une tâche par id (nombre ou chaîne)', () => {
    const todo = store.create({ title: 'Test' });
    expect(store.get(todo.id)).toBe(todo);
    expect(store.get(String(todo.id))).toBe(todo);
    expect(store.get(999)).toBeUndefined();
  });

  test('met à jour le titre et le statut', () => {
    const todo = store.create({ title: 'Ancien titre' });

    const updated = store.update(todo.id, { title: ' Nouveau titre ', done: true });

    expect(updated).toMatchObject({ title: 'Nouveau titre', done: true });
    expect(store.stats()).toEqual({ total: 1, done: 1, remaining: 0 });
  });

  test('refuse un statut "done" non booléen', () => {
    const todo = store.create({ title: 'Test' });
    expect(() => store.update(todo.id, { done: 'oui' })).toThrow(ValidationError);
    expect(store.get(todo.id).done).toBe(false);
  });

  test('retourne undefined lors de la mise à jour d’une tâche inconnue', () => {
    expect(store.update(42, { done: true })).toBeUndefined();
  });

  test('supprime une tâche', () => {
    const todo = store.create({ title: 'À supprimer' });

    expect(store.remove(todo.id)).toBe(true);
    expect(store.get(todo.id)).toBeUndefined();
    expect(store.remove(todo.id)).toBe(false);
  });
});
