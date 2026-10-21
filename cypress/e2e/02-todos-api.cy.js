// Parcours complet sur l'API REST (HTTP)
describe('API /api/todos', () => {
  it('cycle de vie complet : créer → lire → modifier → supprimer', () => {
    const title = `Tâche API ${Date.now()}`;

    cy.request('POST', '/api/todos', { title }).then((created) => {
      expect(created.status).to.eq(201);
      expect(created.body).to.include({ title, done: false });
      const id = created.body.id;

      cy.request('/api/todos').its('body.items').should('deep.include', created.body);

      cy.request('PATCH', `/api/todos/${id}`, { done: true })
        .its('body.done')
        .should('eq', true);

      cy.request('DELETE', `/api/todos/${id}`).its('status').should('eq', 204);

      cy.request({ url: `/api/todos/${id}`, failOnStatusCode: false })
        .its('status')
        .should('eq', 404);
    });
  });

  it('refuse une tâche sans titre (400)', () => {
    cy.request({
      method: 'POST',
      url: '/api/todos',
      body: { title: '' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.eq('Le titre est obligatoire');
    });
  });
});
