/// <reference types="cypress" />

const API_URL = "http://localhost:3000";

describe("Playlist Page - E2E Tests", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();

    // Stub API calls
    cy.intercept('GET', /\/playlists\/.*/, { fixture: 'playlists.json' }).as('getPlaylists');
    cy.intercept('GET', /\/playlists\/.*\/songs.*/, { fixture: 'playlistSongs.json' }).as('getPlaylistSongs');
    cy.intercept('GET', `${API_URL}/songs/search*`, { fixture: 'searchResults.json' }).as('searchSongs');
    cy.intercept('POST', `${API_URL}/playlists`, { statusCode: 201, body: { id: 'new123' } }).as('createPlaylist');
    cy.intercept('DELETE', /\/playlists\/.*/, { statusCode: 200 }).as('deletePlaylist');
    cy.intercept('DELETE', /\/playlists\/.*\/songs\/.*/, { statusCode: 200 }).as('removeSong');

    // ไปหน้า home เพื่อสร้าง user
    cy.visit('http://localhost:5173/');

    cy.get('input[placeholder="Enter your name"]').type('Test User');
    cy.contains('Create').click();

    // รอ playlists โหลด
    cy.wait('@getPlaylists');
  });

  it('should display playlists grid', () => {
    cy.get('.playlistGrid, .playlistCard')
      .should('exist')
      .and('have.length.greaterThan', 0);
  });

  it('should open playlist detail and show songs', () => {
    cy.get('.playlistCard, .playlistCard').first().click();
    
    cy.wait('@getPlaylistSongs');

    cy.get('.resultsList, .resultItem')
      .should('exist')
      .and('have.length.greaterThan', 0);
  });

  it('should search for songs', () => {
    cy.get('input[placeholder="Search"]').type('Love');
    cy.wait('@searchSongs');

    cy.get('.resultsList .resultItem')
      .should('have.length.greaterThan', 0);

    // Test play button on search result
    cy.get('.resultsList .resultItem').first().contains('Play').click();
  });

  it('should create a new playlist', () => {
    cy.contains('Create').click();
    cy.get('input[placeholder="My Awesome Playlist"]').type('My Test Playlist');
    cy.get('textarea[placeholder="Describe your playlist..."]').type('This is a test');

    cy.contains('Create').click();
    cy.wait('@createPlaylist');

    cy.get('.playlistCard, .playlistCard').contains('My Test Playlist').should('exist');
  });

  it('should delete a playlist', () => {
    cy.get('.playlistCard, .playlistCard').first().within(() => {
      cy.get('.deleteButton').click();
    });

    cy.wait('@deletePlaylist');
  });

  it('should remove a song from playlist', () => {
    cy.get('.playlistCard, .playlistCard').first().click();
    cy.wait('@getPlaylistSongs');

    cy.get('.resultsList .resultItem').first().within(() => {
      cy.contains('Remove').click();
    });

    cy.wait('@removeSong');
  });

  it('should play and shuffle playlist', () => {
    cy.get('.playlistCard, .playlistCard').first().click();
    cy.wait('@getPlaylistSongs');

    cy.contains('▶️ Play All').click();
    cy.contains('🔀 Shuffle').click();
  });

  it('should drag & drop songs (Custom Order)', () => {
    cy.get('.playlistCard, .playlistCard').first().click();
    cy.wait('@getPlaylistSongs');

    cy.get('.resultsList .resultItem').first().trigger('dragstart');
    cy.get('.resultsList .resultItem').last().trigger('drop');
  });
});
