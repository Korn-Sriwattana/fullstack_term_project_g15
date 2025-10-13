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
// /// <reference types="cypress" />

// // --- Declare custom command types ---
// declare global {
//   namespace Cypress {
//     interface Chainable<Subject = any> {
//       createUser(name: string): Chainable<void>;
//       saveLocalStorage(): Chainable<void>;
//       restoreLocalStorage(): Chainable<void>;
//     }
//   }
// }

// // --- Custom commands ---
// Cypress.Commands.add('createUser', (name: string) => {
//   cy.visit('/');
//   cy.get('input[placeholder="Enter your name"]').type(name);
//   cy.get('button').contains('Create User').click();
//   cy.contains(`Welcome, ${name}`);
// });

// // --- LocalStorage persistence ---
// let LOCAL_STORAGE_MEMORY: Record<string, string> = {};

// Cypress.Commands.add('saveLocalStorage', () => {
//   Object.keys(localStorage).forEach(key => {
//     LOCAL_STORAGE_MEMORY[key] = localStorage[key];
//   });
// });

// Cypress.Commands.add('restoreLocalStorage', () => {
//   Object.keys(LOCAL_STORAGE_MEMORY).forEach(key => {
//     localStorage.setItem(key, LOCAL_STORAGE_MEMORY[key]);
//   });
// });

// Cypress custom commands
// /// <reference types="cypress" />

// declare global {
//   namespace Cypress {
//     interface Chainable<Subject = any> {
//       createUser(name: string): Chainable<void>;
//       saveLocalStorage(): Chainable<void>;
//       restoreLocalStorage(): Chainable<void>;

//       // --- Add new commands for Home E2E ---
//       login(): Chainable<void>;
//       stubHomeAPI(): Chainable<void>;
//     }
//   }
// }

// Cypress.Commands.add("login", () => {
//   // Mock session (frontend จะเห็น user)
//   cy.intercept("GET", "http://localhost:3000/api/auth/get-session", {
//     statusCode: 200,
//     body: {
//       data: {
//         user: { id: "user123", name: "Test User", email: "test@example.com" },
//       },
//     },
//   }).as("getSession");

//   // Set cookie เพื่อให้ authClient.credentials: 'include' ทำงาน
//   cy.setCookie("auth_session", "fake-valid-session-token");
// });

// Cypress.Commands.add("stubHomeAPI", () => {
//   // Popular songs
//   cy.intercept("GET", "http://localhost:3000/songs/popular?limit=20", {
//     statusCode: 200,
//     body: [
//       {
//         song: { id: "1", title: "Test Song 1", artist: "Artist A", coverUrl: "https://via.placeholder.com/150" },
//         playCount: 5000,
//       },
//       {
//         song: { id: "2", title: "Test Song 2", artist: "Artist B", coverUrl: "https://via.placeholder.com/150" },
//         playCount: 2000,
//       },
//     ],
//   }).as("getPopularSongs");

//   // Recently played
//   cy.intercept("GET", /\/player\/recently-played\/.+\?limit=10/, {
//     statusCode: 200,
//     body: [
//       {
//         id: "r1",
//         song: { id: "s1", title: "Recently Played 1", artist: "Tester", coverUrl: "https://via.placeholder.com/150" },
//       },
//     ],
//   }).as("getRecentlyPlayed");

//   // Add song
//   cy.intercept("POST", "http://localhost:3000/songs/add", {
//     statusCode: 200,
//     body: { id: "songYt", title: "Added Song" },
//   }).as("addSong");

//   // Search
//   cy.intercept("GET", /\/songs\/search\?q=.*/, {
//     statusCode: 200,
//     body: [
//       {
//         id: "song123",
//         title: "Search Result Song",
//         artist: "Search Artist",
//         duration: 120,
//         coverUrl: "https://via.placeholder.com/150",
//       },
//     ],
//   }).as("searchSongs");
// });



