/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// cypress/support/commands.ts

declare global {
  namespace Cypress {
    interface Chainable {
      saveLocalStorage(): Chainable<void>;
      restoreLocalStorage(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('saveLocalStorage', () => {
  cy.window().then((win) => {
    const localStorage: { [key: string]: string } = {};
    for (let i = 0; i < win.localStorage.length; i++) {
      const key = win.localStorage.key(i);
      if (key) {
        localStorage[key] = win.localStorage.getItem(key) || '';
      }
    }
    cy.wrap(localStorage).as('localStorage');
  });
});

Cypress.Commands.add('restoreLocalStorage', () => {
  cy.get<{ [key: string]: string }>('@localStorage').then((localStorage) => {
    cy.window().then((win) => {
      Object.entries(localStorage).forEach(([key, value]) => {
        // win.localStorage.setItem(key, value);
      });
    });
  });
});

export {};