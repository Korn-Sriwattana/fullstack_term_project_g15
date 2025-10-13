describe('Authentication & Home Page - E2E Tests (Email/Password Login)', () => {
  const BASE_URL = 'http://localhost:5173';
  const API_URL = 'http://localhost:3000';

  // ------------------------
  // Helper: login via email/password
  // ------------------------
  const loginWithEmail = () => {
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/auth/login`, // <-- endpoint login จริง
      body: {
        email: 'test.user@example.com',
        password: 'password123',
      },
    }).then((res) => {
      expect(res.status).to.eq(200);

      // ถ้า backend ส่ง token กลับมา
      if (res.body.token) {
        cy.setCookie('sessionToken', res.body.token);
      }

      // หรือถ้า backend ใช้ cookie เซ็ตเอง ก็ไม่ต้องทำอะไรเพิ่ม
    });
  };

  // ------------------------
  // Test flow
  // ------------------------
  it('should login with email/password and display home page correctly', () => {
    // 1. ไปหน้า signin
    cy.visit(`${BASE_URL}/signin`);

    // 2. Login via API
    loginWithEmail();

    // 3. Visit home page หลัง login
    cy.visit(`${BASE_URL}/`);

    // ------------------------
    // Assertions
    // ------------------------
    // popup จะไม่ขึ้น
    cy.get('div[style*="position: fixed"][style*="z-index: 9999"]').should('not.exist');

    // content หลักของ home page visible
    cy.get('input[placeholder="Search"]').should('be.visible');
    cy.contains('button', '+ Add song').should('be.visible');

    // ------------------------
    // Mock popular songs (optional)
    // ------------------------
    cy.intercept(`${API_URL}/songs/popular*`, {
      statusCode: 200,
      body: [
        {
          song: {
            id: 'song-1',
            title: 'Popular Song After Login',
            artist: 'Test Artist',
            coverUrl: 'https://example.com/cover.jpg',
            duration: 180,
          },
          playCount: 1000,
        },
      ],
    }).as('loadPopularSongs');

    cy.wait('@loadPopularSongs');
    cy.contains('Popular Song After Login').should('be.visible');
  });
});
