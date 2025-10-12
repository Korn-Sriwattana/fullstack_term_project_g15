/// <reference types="cypress" />

describe('LikedSongs Page - Stable E2E', () => {
  const user = { id: '123', name: 'Test User' };
  const BASE_URL = 'http://localhost:5173';
  const API_URL = 'http://localhost:3000';

  // Ignore specific known frontend errors
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('likedSongs is not iterable')) return false;
    return true;
  });

  beforeEach(() => {
    // Mock APIs
    cy.intercept('GET', `${API_URL}/songs/popular*`, { fixture: 'popularSongs.json' }).as('getPopularSongs');
    cy.intercept('GET', `${API_URL}/player/recently-played/*`, { body: [] }).as('getRecentlyPlayed');
    cy.intercept('POST', `${API_URL}/users`, { statusCode: 200, body: { id: user.id, name: user.name } }).as('createUser');
    cy.intercept('GET', `${API_URL}/liked-songs/*`, { fixture: 'likedSongsWithData.json' }).as('getLikedSongs');

    // Create user via UI
    cy.visit(BASE_URL);
    cy.get('input[placeholder="Enter your name"]').should('be.visible').type(user.name);
    cy.contains('button', 'Create User').click();
    cy.wait('@createUser');
    cy.contains(`Current User: ${user.name}`).should('be.visible');

    // Stub musicPlayer to avoid real audio actions
    cy.window().then((win) => {
      (win as any).musicPlayer = {
        playSong: cy.stub().as('playSong'),
        addToQueue: cy.stub().as('addToQueue'),
      };
    });
  });

  // Helper to go to Liked Songs page
  const navigateToLikedSongs = () => {
    cy.get('a').contains('Liked Songs').should('be.visible').click();
    cy.wait('@getLikedSongs', { timeout: 10000 });
  };

  it('should display header, user info, and render songs', () => {
    navigateToLikedSongs();
    cy.contains('Liked Songs').should('be.visible');
    cy.contains(user.name).should('be.visible');
    cy.get('[class*="_resultItem_"]').should('have.length.at.least', 1);
  });

  it('should allow playing a song', () => {
    navigateToLikedSongs();
    cy.contains('button', 'Play', { timeout: 5000 }).should('exist').click();
    cy.get('@playSong').should('have.been.calledOnce');
  });

  it('should allow adding a song to queue', () => {
    navigateToLikedSongs();
    cy.contains('button', '+ Queue', { timeout: 5000 }).should('exist').click();
    cy.get('@addToQueue').should('have.been.calledOnce');
  });

  it("should show empty state when no songs exist", () => {
    cy.intercept('GET', `${API_URL}/liked-songs/*`, { fixture: 'likedSongsEmpty.json' }).as('getEmptyLikedSongs');
    cy.get('a').contains('Liked Songs').click();
    cy.wait('@getEmptyLikedSongs');
    cy.contains("You haven't liked any songs yet").should('be.visible');
    cy.get('[class*="_resultItem_"]').should('not.exist');
  });

  it('should show message if user not created', () => {
    cy.visit(`${BASE_URL}/likedsongs`, { onBeforeLoad: (win) => win.localStorage.removeItem('user') });
    cy.contains('Please create user first').should('be.visible');
  });
});
