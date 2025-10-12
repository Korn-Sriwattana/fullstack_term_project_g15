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
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }
/// <reference types="cypress" />

// --- Declare custom command types ---
declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      createUser(name: string): Chainable<void>;
      saveLocalStorage(): Chainable<void>;
      restoreLocalStorage(): Chainable<void>;
    }
  }
}

// --- Custom commands ---
Cypress.Commands.add('createUser', (name: string) => {
  cy.visit('/');
  cy.get('input[placeholder="Enter your name"]').type(name);
  cy.get('button').contains('Create User').click();
  cy.contains(`Welcome, ${name}`);
});

// --- LocalStorage persistence ---
let LOCAL_STORAGE_MEMORY: Record<string, string> = {};

Cypress.Commands.add('saveLocalStorage', () => {
  Object.keys(localStorage).forEach(key => {
    LOCAL_STORAGE_MEMORY[key] = localStorage[key];
  });
});

Cypress.Commands.add('restoreLocalStorage', () => {
  Object.keys(LOCAL_STORAGE_MEMORY).forEach(key => {
    localStorage.setItem(key, LOCAL_STORAGE_MEMORY[key]);
  });
});
