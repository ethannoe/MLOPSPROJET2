// Parcours utilisateur réel dans le navigateur
describe('Interface web', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('un utilisateur ajoute, termine puis supprime une tâche', () => {
    const title = `Réviser le TP ${Date.now()}`;

    // Ajout
    cy.get('[data-cy="todo-input"]').type(title);
    cy.get('[data-cy="todo-submit"]').click();
    cy.get('[data-cy="todo-input"]').should('have.value', '');

    cy.contains('[data-cy="todo-item"]', title).as('item').should('be.visible');

    // Marquer comme terminée
    cy.get('@item').find('[data-cy="todo-toggle"]').check();
    cy.contains('[data-cy="todo-item"]', title).should('have.class', 'done');

    // La tâche persiste après rechargement de la page
    cy.reload();
    cy.contains('[data-cy="todo-item"]', title)
      .should('have.class', 'done')
      .find('[data-cy="todo-delete"]')
      .click();

    // Suppression
    cy.contains('[data-cy="todo-item"]', title).should('not.exist');
  });

  it('affiche une erreur si le titre ne contient que des espaces', () => {
    cy.get('[data-cy="todo-input"]').type('     ');
    cy.get('[data-cy="todo-submit"]').click();

    cy.get('[data-cy="error"]').should('be.visible').and('contain', 'Le titre est obligatoire');
  });
});
