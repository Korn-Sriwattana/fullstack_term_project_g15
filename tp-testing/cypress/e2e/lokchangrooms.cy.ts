/// <reference types="cypress" />

/**
 * LokchangRooms - Partial E2E Tests (Current working logic only)
 *
 * ✅ Tests implemented now:
 *   - "Please create user first" (works)
 *
 * 💬 TODO (when user context / frontend ready):
 *   - Render Look Chang Room title after user context
 *   - Load public rooms
 *   - Join/Create room logic
 */

describe('LokchangRooms Page - E2E Tests (current stable only)', () => {
  const BASE_URL = 'http://localhost:5173/lokchangrooms';

  beforeEach(() => {
    cy.intercept('GET', '**/rooms/public', { fixture: 'rooms.json' }).as('getPublicRooms');
  });

  it('should show "Please create user first" when no user exists', () => {
    cy.clearLocalStorage();
    cy.visit(BASE_URL);
    cy.contains('Please create user first.').should('be.visible');
  });

  /**
   * 💬 TODO: Enable this once useUser() can initialize with existing user
   * 
   * it('should render the base page title when user exists', () => {
   *   cy.visit(BASE_URL, {
   *     onBeforeLoad(win) {
   *       win.localStorage.setItem('user', JSON.stringify({ id: 'user123', name: 'Test User' }));
   *     },
   *   });
   *   cy.contains('Look Chang Room').should('be.visible');
   * });
   */
});
