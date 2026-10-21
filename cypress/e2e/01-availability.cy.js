// Disponibilité de l'application
describe('Disponibilité', () => {
  it('GET /health répond 200 avec status "ok"', () => {
    cy.request('/health').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.status).to.eq('ok');
      expect(res.body).to.have.property('version');
    });
  });

  it('la page d’accueil se charge et indique que le service est en ligne', () => {
    cy.visit('/');
    cy.title().should('contain', 'Todo');
    cy.get('[data-cy="title"]').should('have.text', 'Mes tâches');
    cy.get('[data-cy="health"]').should('contain', 'en ligne');
    cy.get('[data-cy="version"]').should('contain', 'version');
  });
});
