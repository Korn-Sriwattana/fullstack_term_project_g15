/// <reference types="cypress" />

describe("Liked Songs Page - Logged In (Mocked)", () => {
  const FRONTEND = Cypress.env("FRONTEND_URL") || "http://localhost:5173";
  const API_URL = "http://localhost:3000";

  const USER = {
    id: "u-1000",
    email: "cypress_user@example.com",
    name: "Cypress User",
    profilePic: null as string | null,
  };

  // Mock Liked Songs
  const initialLikedSongs = [
    { id: "like-1", likedAt: new Date("2024-01-15").toISOString(), song: { id: "s-1", title: "First Liked Song", artist: "Artist One", duration: 210, coverUrl: "https://via.placeholder.com/50" } },
    { id: "like-2", likedAt: new Date("2024-02-20").toISOString(), song: { id: "s-2", title: "Second Liked Song", artist: "Artist Two", duration: 180, coverUrl: "https://via.placeholder.com/50" } },
    { id: "like-3", likedAt: new Date("2024-03-10").toISOString(), song: { id: "s-3", title: "Third Liked Song", artist: "Artist Three", duration: 240, coverUrl: "https://via.placeholder.com/50" } }
  ];

  let mockLikedSongs: typeof initialLikedSongs;

  // Silence noise API calls
  const silenceNoise = () => {
    cy.intercept("GET", "**/player/recently-played/**", { statusCode: 200, body: [] });
    cy.intercept("GET", "**/player/queue/**", { statusCode: 200, body: [] });
    cy.intercept("GET", "**/songs/popular**", { statusCode: 200, body: [] });
    cy.intercept("GET", "**/api/proxy-image**", { statusCode: 200, body: new Uint8Array([255,216,255,224]) });
  };

  // Stub user session
  const stubSession = () => {
    cy.intercept("GET", "**/api/auth/get-session", { statusCode: 200, body: { user: USER } }).as("getSession");
    cy.intercept("GET", "**/api/current-user**", { statusCode: 200, body: { user: USER, source: "mock" } }).as("currentUser");
    cy.intercept("GET", "**/api/me", { statusCode: 200, body: { user: null } });
    cy.intercept("GET", "**/api/user/check**", { statusCode: 200, body: { exists: true, user: USER } }).as("userCheck");
  };

  // Stub Liked Songs API
  const stubLikedSongsApi = () => {
    cy.intercept("GET", `${API_URL}/liked-songs/${USER.id}`, (req) => {
      req.reply({ statusCode: 200, body: mockLikedSongs });
    }).as("getLikedSongs");

    cy.intercept("DELETE", `${API_URL}/liked-songs/${USER.id}/*`, (req) => {
      if (mockLikedSongs.length > 0) {
        mockLikedSongs.splice(0, 1); // Remove the first song
      }

      req.reply({ statusCode: 200, body: {} });
    }).as("unlikeSong");
  };

  before(() => {
    silenceNoise();
    stubSession();
    cy.session(["mock-login", USER.email], () => {
      cy.on("window:alert", () => {});
      cy.visit(FRONTEND);
      cy.wait("@getSession");
      cy.window().then((win) => {
        win.localStorage.setItem("email", USER.email);
      });
      cy.setCookie("better-auth.session", "mock-session-cookie");
    });
  });

  beforeEach(() => {
    silenceNoise();
    stubSession();
    mockLikedSongs = JSON.parse(JSON.stringify(initialLikedSongs));
    stubLikedSongsApi();
  });

  // Test 1: LikedSongs page displays correctly
  it("แสดง LikedSongs page correctly", () => {
    cy.visit(`${FRONTEND}/likedsongs`);
    cy.wait("@getSession");
    cy.wait("@getLikedSongs");
    cy.location("pathname").should("eq", "/likedsongs");
    cy.contains("strong", USER.name).should("exist");
  });

  // Test 2: Display all liked songs
  it("should display all liked songs", () => {
    cy.visit(`${FRONTEND}/likedsongs`);
    cy.wait("@getLikedSongs");

    mockLikedSongs.forEach((item) => {
      cy.contains(item.song.title).scrollIntoView().should("be.visible");
      cy.contains(item.song.artist).scrollIntoView().should("be.visible");
    });

    cy.contains(`${mockLikedSongs.length} songs`).scrollIntoView().should("be.visible");
  });

  // Test 3: Remove a song via heart button
  it("should remove a song when heart button is clicked", () => {
    cy.visit(`${FRONTEND}/likedsongs`);
    cy.wait("@getLikedSongs");
    const firstSong = initialLikedSongs[0]; 
    cy.get('[class*="resultItem"]').first().as("firstItem");
    
    // Click the unlike button
    cy.get("@firstItem").find('button').last().click();
    // Wait for the DELETE call (unlike)
    cy.wait("@unlikeSong"); 
    // Wait for the component's refresh (GET call)
    cy.wait("@getLikedSongs"); 
    // The total number of items should now be 2
    cy.get('[class*="resultItem"]').should("have.length", initialLikedSongs.length - 1);
    // Check that the removed song's title no longer exists
    cy.contains(firstSong.song.title).should("not.exist");
  });


  // Test 4: Empty state when all songs are removed
  it("should show empty state when all songs are removed", () => {
    cy.visit(`${FRONTEND}/likedsongs`);
    cy.wait("@getLikedSongs");

    // ใช้ loop ผ่านจำนวนเพลงใน mockLikedSongs ตอนเริ่มต้น
    for (let i = 0; i < initialLikedSongs.length; i++) {
      // เอาเพลงตัวแรกใน list
      cy.get('[class*="resultItem"]').first().as('firstItem');
      // Click the unlike button
      cy.get('@firstItem').find('button').last().click();
      // Wait for DELETE call
      cy.wait("@unlikeSong");
      // Wait for GET call to refresh the list
      cy.wait("@getLikedSongs");
    }

    // หลังจากลบครบทั้งหมด → ตรวจสอบ empty state
    cy.get('[class*="resultItem"]', { timeout: 10000 }).should('not.exist');
    cy.contains("You haven't liked any songs yet", { timeout: 10000 }).should("be.visible");
    cy.contains("Tap the heart on tracks you love", { timeout: 10000 }).should("be.visible");
  });


});
