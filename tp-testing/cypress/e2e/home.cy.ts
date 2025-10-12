describe('Home Page - Music Player Application', () => {
  const API_URL = 'http://localhost:3000';

  beforeEach(() => {
    // Arrange: Set viewport size to see all content
    cy.viewport(1920, 1080);

    // Arrange: Setup API mocks
    cy.intercept('GET', `${API_URL}/songs/search*`, { fixture: 'searchResults.json' }).as('searchSongs');
    cy.intercept('GET', `${API_URL}/player/recently-played/*`, { fixture: 'recentlyPlayed.json' }).as('recentlyPlayed');
    cy.intercept('GET', `${API_URL}/songs/popular*`, { fixture: 'popularSongs.json' }).as('popularSongs');
    cy.intercept('POST', `${API_URL}/users`, { fixture: 'createUser.json' }).as('createUser');
    cy.intercept('POST', `${API_URL}/songs/add`, { fixture: 'addSong.json' }).as('addSong');

    // Arrange: Visit the home page
    cy.visit("http://localhost:5173");
  });

  describe('Search Functionality', () => {
    it('should display search input on page load', () => {
      // Assert: Search input is visible
      cy.get('input[placeholder="Search"]').should('be.visible');
    });

    it('should show search results when user types in search box', () => {
      // Act: Type in search box
      cy.get('input[placeholder="Search"]').type('test song');

      // Assert: Wait for debounced API call
      cy.wait('@searchSongs');

      // Assert: Search results section appears
      cy.contains('h3', 'Search Results').should('be.visible');
    });

    it('should display "No results found" when search returns empty', () => {
      // Arrange: Mock empty search results
      cy.intercept('GET', `${API_URL}/songs/search*`, { body: [] }).as('emptySearch');

      // Act: Type in search box
      cy.get('input[placeholder="Search"]').type('nonexistent song');

      // Assert: Wait for API call
      cy.wait('@emptySearch');

      // Assert: No results message is displayed
      cy.contains('No results found').should('be.visible');
    });

    it('should display search results with song details', () => {
      // Arrange: Mock search results
      cy.intercept('GET', `${API_URL}/songs/search*`, {
        body: [
          {
            id: 1,
            title: 'Test Song',
            artist: 'Test Artist',
            duration: 180,
            coverUrl: 'https://example.com/cover.jpg'
          }
        ]
      }).as('searchWithResults');

      // Act: Type in search box
      cy.get('input[placeholder="Search"]').type('test');

      // Assert: Wait for API call
      cy.wait('@searchWithResults');

      // Assert: Song details are displayed
      cy.contains('Test Song').should('be.visible');
      cy.contains('Test Artist').should('be.visible');
      cy.contains('3:00').should('be.visible'); // duration formatted
    });

    it('should have Play and Queue buttons for each search result', () => {
      // Arrange: Mock search results
      cy.intercept('GET', `${API_URL}/songs/search*`, {
        body: [
          { id: 1, title: 'Test Song', artist: 'Test Artist', duration: 180 }
        ]
      }).as('searchResults');

      // Act: Type in search box
      cy.get('input[placeholder="Search"]').type('test');
      cy.wait('@searchResults');

      // Assert: Action buttons are visible
      cy.contains('button', 'Play').should('be.visible');
      cy.contains('button', '+ Queue').should('be.visible');
    });

    it('should clear search results when search input is cleared', () => {
      // Arrange: Mock search results
      cy.intercept('GET', `${API_URL}/songs/search*`, {
        body: [{ id: 1, title: 'Test Song', artist: 'Test Artist', duration: 180 }]
      }).as('search');

      // Act: Type and then clear
      cy.get('input[placeholder="Search"]').type('test');
      cy.wait('@search');
      cy.get('input[placeholder="Search"]').clear();

      // Assert: Search results section should not exist
      cy.contains('h3', 'Search Results').should('not.exist');
    });
  });

  describe('Quick Add Song Feature', () => {
    it('should show "Add song" button', () => {
      // Assert: Add song button is visible
      cy.contains('button', '+ Add song').should('be.visible');
    });

    it('should toggle Quick Add form when clicking "Add song" button', () => {
      // Act: Click Add song button
      cy.contains('button', '+ Add song').click();

      // Assert: YouTube URL input appears
      cy.get('input[placeholder="Paste a YouTube link"]').should('be.visible');

      // Act: Click again to close
      cy.contains('button', '+ Add song').click();

      // Assert: Form is hidden
      cy.get('input[placeholder="Paste a YouTube link"]').should('not.exist');
    });

    it('should close Quick Add form when clicking outside', () => {
      // Act: Open Quick Add form
      cy.contains('button', '+ Add song').click();
      cy.get('input[placeholder="Paste a YouTube link"]').should('be.visible');

      // Act: Click outside the form
      cy.get('body').click(0, 0);

      // Assert: Form is closed
      cy.get('input[placeholder="Paste a YouTube link"]').should('not.exist');
    });

    it('should close Quick Add form when pressing Escape key', () => {
      // Act: Open Quick Add form
      cy.contains('button', '+ Add song').click();
      cy.get('input[placeholder="Paste a YouTube link"]').should('be.visible');

      // Act: Press Escape key
      cy.get('body').type('{esc}');

      // Assert: Form is closed
      cy.get('input[placeholder="Paste a YouTube link"]').should('not.exist');
    });

    it('should add song with valid YouTube URL', () => {
      // Act: Open Quick Add form
      cy.contains('button', '+ Add song').click();

      // Act: Enter YouTube URL and submit
      cy.get('input[placeholder="Paste a YouTube link"]').type('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      cy.get('input[placeholder="Paste a YouTube link"]').siblings('button').click();

      // Assert: API call is made
      cy.wait('@addSong');

      // Assert: Success alert (stubbed)
      cy.on('window:alert', (text) => {
        expect(text).to.contains('Song added!');
      });
    });

    it('should show error for invalid YouTube URL', () => {
      // Arrange: Setup alert stub
      const stub = cy.stub();
      cy.on('window:alert', stub);

      // Act: Open Quick Add form
      cy.contains('button', '+ Add song').click();

      // Act: Enter invalid URL and submit
      cy.get('input[placeholder="Paste a YouTube link"]').type('invalid-url');
      cy.get('input[placeholder="Paste a YouTube link"]')
        .siblings('button')
        .click()
        .then(() => {
          // Assert: Error alert is shown
          expect(stub.getCall(0)).to.be.calledWith('Invalid YouTube URL');
        });
    });
  });

  describe('User Creation', () => {
    it('should display user creation section', () => {
      // Assert: Section elements are visible
      cy.contains('h3', 'Create User (Test)').should('be.visible');
      cy.get('input[placeholder="Enter your name"]').should('be.visible');
      cy.contains('button', 'Create User').should('be.visible');
    });

    it('should show current user status', () => {
      // Assert: User info is displayed
      cy.contains('Current User:').should('be.visible');
    });

    it('should create user with valid name', () => {
      // Arrange: Setup alert stub
      const stub = cy.stub();
      cy.on('window:alert', stub);

      // Act: Enter name and create user
      cy.get('input[placeholder="Enter your name"]').type('Test User');
      cy.contains('button', 'Create User').click();

      // Assert: API call is made
      cy.wait('@createUser');

      // Assert: Success message appears
      cy.wrap(stub).should('have.been.called');
    });

    it('should show error when creating user without name', () => {
      // Arrange: Setup alert stub
      const stub = cy.stub();
      cy.on('window:alert', stub);

      // Act: Click create without entering name
      cy.contains('button', 'Create User')
        .click()
        .then(() => {
          // Assert: Error alert is shown
          expect(stub.getCall(0)).to.be.calledWith('Please enter a name');
        });
    });
  });

  describe('Popular Songs Section', () => {
    it('should display popular songs on page load', () => {
      // Assert: Wait for popular songs to load
      cy.wait('@popularSongs');

      // Assert: Popular songs section is visible
      cy.contains('h3', '🔥 Popular Songs').should('be.visible');
    });

    it('should display song cards with details', () => {
      // Arrange: Mock popular songs
      cy.intercept('GET', `${API_URL}/songs/popular*`, {
        body: [
          {
            song: {
              id: 1,
              title: 'Popular Song',
              artist: 'Popular Artist',
              coverUrl: 'https://example.com/cover.jpg'
            },
            playCount: 5000
          }
        ]
      }).as('popularWithData');

      // Act: Wait for data
      cy.wait('@popularWithData');

      // Assert: Song details are displayed (scroll into view first)
      cy.contains('Popular Song').scrollIntoView().should('be.visible');
      cy.contains('Popular Artist').scrollIntoView().should('be.visible');
      cy.contains('plays').scrollIntoView().should('be.visible');
    });

    it('should show "Show More" button when there are more than 5 songs', () => {
      // Arrange: Mock many popular songs
      const songs = Array.from({ length: 10 }, (_, i) => ({
        song: { id: i, title: `Song ${i}`, artist: `Artist ${i}` },
        playCount: 1000
      }));

      cy.intercept('GET', `${API_URL}/songs/popular*`, { body: songs }).as('manySongs');

      // Act: Wait for data
      cy.wait('@manySongs');

      // Assert: Show More button exists
      cy.contains('button', 'Show More').should('be.visible');
    });

    it('should expand/collapse popular songs list', () => {
      // Arrange: Mock many popular songs
      const songs = Array.from({ length: 10 }, (_, i) => ({
        song: { id: i, title: `Song ${i}`, artist: `Artist ${i}` },
        playCount: 1000
      }));

      cy.intercept('GET', `${API_URL}/songs/popular*`, { body: songs }).as('manySongs');
      cy.wait('@manySongs');

      // Act: Click Show More
      cy.contains('button', 'Show More').click();

      // Assert: Button text changes to Show Less
      cy.contains('button', 'Show Less').should('be.visible');

      // Act: Click Show Less
      cy.contains('button', 'Show Less').click();

      // Assert: Button text changes back
      cy.contains('button', 'Show More').should('be.visible');
    });

    it('should hide popular songs when searching', () => {
      // Arrange: Wait for popular songs to load
      cy.wait('@popularSongs');
      cy.contains('h3', '🔥 Popular Songs').should('be.visible');

      // Act: Start typing in search
      cy.get('input[placeholder="Search"]').type('test');

      // Assert: Popular songs section is hidden
      cy.contains('h3', '🔥 Popular Songs').should('not.exist');
    });

    it('should format play count correctly', () => {
      // Arrange: Mock songs with different play counts
      cy.intercept('GET', `${API_URL}/songs/popular*`, {
        body: [
          { song: { id: 1, title: 'Song 1', artist: 'Artist 1' }, playCount: 1500 },
          { song: { id: 2, title: 'Song 2', artist: 'Artist 2' }, playCount: 1500000 }
        ]
      }).as('popularFormatted');

      // Act: Wait for data
      cy.wait('@popularFormatted');

      // Assert: Play counts are formatted (scroll into view first)
      cy.contains('1.5K plays').scrollIntoView().should('be.visible');
      cy.contains('1.5M plays').scrollIntoView().should('be.visible');
    });
  });

  describe('Recently Played Section', () => {
    it('should display recently played section', () => {
      // Assert: Section is visible (scroll into view first)
      cy.contains('h3', 'Recently Played').scrollIntoView().should('be.visible');
    });

    it('should show empty state when no songs played', () => {
      // Arrange: Mock empty recently played
      cy.intercept('GET', `${API_URL}/player/recently-played/*`, { body: [] }).as('emptyRecent');

      // Act: Create user to trigger load
      cy.intercept('POST', `${API_URL}/users`, {
        body: { id: 'test-user-id', name: 'Test User', email: 'test@test.com' }
      }).as('createTestUser');

      cy.get('input[placeholder="Enter your name"]').type('Test User');
      cy.contains('button', 'Create User').click();
      cy.wait('@createTestUser');
      cy.wait('@emptyRecent');

      // Assert: Empty state message is shown (scroll into view first)
      cy.contains('No recently played songs').scrollIntoView().should('be.visible');
      cy.contains('Start playing to see history').scrollIntoView().should('be.visible');
    });

    it('should display recently played songs with details', () => {
      // Arrange: Mock recently played data
      cy.intercept('GET', `${API_URL}/player/recently-played/*`, {
        body: [
          {
            id: 1,
            song: {
              id: 1,
              title: 'Recent Song',
              artist: 'Recent Artist',
              coverUrl: 'https://example.com/cover.jpg'
            }
          }
        ]
      }).as('recentData');

      // Act: Create user to trigger load
      cy.intercept('POST', `${API_URL}/users`, {
        body: { id: 'test-user-id', name: 'Test User', email: 'test@test.com' }
      }).as('createUser');

      cy.get('input[placeholder="Enter your name"]').type('Test User');
      cy.contains('button', 'Create User').click();
      cy.wait('@createUser');
      cy.wait('@recentData');

      // Assert: Song details are visible (scroll into view first)
      cy.contains('Recent Song').scrollIntoView().should('be.visible');
      cy.contains('Recent Artist').scrollIntoView().should('be.visible');
    });
  });

  describe('Queue Section', () => {
    it('should display queue section', () => {
      // Assert: Queue section is visible (scroll into view first)
      cy.contains('h3', 'Queue').scrollIntoView().should('be.visible');
    });

    it('should show empty state when queue is empty', () => {
      // Assert: Empty state message is shown (scroll into view first)
      cy.contains('No songs in queue').scrollIntoView().should('be.visible');
      cy.contains('Play a song or add to queue').scrollIntoView().should('be.visible');
    });

    it('should display queue count', () => {
      // Assert: Queue count is shown (initially 0) (scroll into view first)
      cy.contains('Queue (0 songs)').scrollIntoView().should('be.visible');
    });
  });

  describe('User Interaction Guards', () => {
    it('should prompt user to create account when playing without user', () => {
      // Arrange: Mock search results
      cy.intercept('GET', `${API_URL}/songs/search*`, {
        body: [{ id: 1, title: 'Test Song', artist: 'Test Artist', duration: 180 }]
      }).as('search');

      // Arrange: Setup alert stub
      const stub = cy.stub();
      cy.on('window:alert', stub);

      // Act: Search and try to play
      cy.get('input[placeholder="Search"]').type('test');
      cy.wait('@search');
      cy.contains('button', 'Play')
        .first()
        .click()
        .then(() => {
          // Assert: Alert shown
          expect(stub.getCall(0)).to.be.calledWith('Please create user first');
        });
    });

    it('should prompt user to create account when adding to queue without user', () => {
      // Arrange: Mock search results
      cy.intercept('GET', `${API_URL}/songs/search*`, {
        body: [{ id: 1, title: 'Test Song', artist: 'Test Artist', duration: 180 }]
      }).as('search');

      // Arrange: Setup alert stub
      const stub = cy.stub();
      cy.on('window:alert', stub);

      // Act: Search and try to add to queue
      cy.get('input[placeholder="Search"]').type('test');
      cy.wait('@search');
      cy.contains('button', '+ Queue')
        .first()
        .click()
        .then(() => {
          // Assert: Alert shown
          expect(stub.getCall(0)).to.be.calledWith('Please create user first');
        });
    });
  });

  describe('Time Formatting', () => {
    it('should format song duration correctly', () => {
      // Arrange: Mock search results with various durations
      cy.intercept('GET', `${API_URL}/songs/search*`, {
        body: [
          { id: 1, title: 'Short Song', artist: 'Artist', duration: 45 },
          { id: 2, title: 'Long Song', artist: 'Artist', duration: 245 }
        ]
      }).as('searchDurations');

      // Act: Search
      cy.get('input[placeholder="Search"]').type('test');
      cy.wait('@searchDurations');

      // Assert: Durations are formatted correctly
      cy.contains('0:45').should('be.visible');
      cy.contains('4:05').should('be.visible');
    });
  });
});