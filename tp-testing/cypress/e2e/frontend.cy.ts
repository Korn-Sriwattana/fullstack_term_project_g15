/// <reference types="cypress" />

describe("Home Page (Frontend Tests)", () => {
  beforeEach(() => {
    // เปิดหน้าเว็บก่อนทุกเทส
    cy.visit("http://localhost:5173");

    // Intercept API calls
    cy.intercept("GET", "/songs/popular*").as("getPopularSongs");
    cy.intercept("GET", "/songs/search*").as("searchSongs");
    cy.intercept("POST", "/songs/add").as("addSong");
    cy.intercept("POST", "/users").as("createUser");
    cy.intercept("GET", "/player/recently-played/*").as("getRecentlyPlayed");
  });

  it("should display the search bar and create user section", () => {
    cy.get('input[placeholder="Search"]').should("exist");
    cy.contains("Create User (Test)").scrollIntoView().should("be.visible");
  });

  it("should show 'No results found' when searching for an unknown song", () => {
    cy.get('input[placeholder="Search"]').type("nonexistent_song_123");
    cy.wait("@searchSongs");
    cy.contains("No results found.", { timeout: 5000 }).should("be.visible");
  });

  it("should toggle Add Song input when clicking '+ Add song'", () => {
    cy.contains("+ Add song").click();
    cy.get('input[placeholder="Paste a YouTube link"]').should("exist");

    cy.contains("+ Add song").click(); // กดอีกครั้งเพื่อปิด
    cy.get('input[placeholder="Paste a YouTube link"]').should("not.exist");
  });

  it("should allow creating a new user", () => {
    cy.get('input[placeholder="Enter your name"]').type("Tester");

    // stub alert แบบ type-safe
    cy.window().then((win) => {
      cy.stub(win as any, "alert").as("alert");
    });

    cy.contains("Create User").click();

    cy.get("@alert").should("have.been.calledWithMatch", /User created/);
    cy.wait("@createUser").its("response.statusCode").should("eq", 200);
  });

  it("should add a song when pasting a YouTube link", () => {
    cy.contains("+ Add song").click();
    cy.get('input[placeholder="Paste a YouTube link"]').type("https://youtu.be/test123");

    // stub alert แบบ type-safe
    cy.window().then((win) => {
      cy.stub(win as any, "alert").as("alert");
    });

    cy.contains("+").click();

    cy.wait("@addSong").its("response.statusCode").should("eq", 200);
    cy.get("@alert").should("have.been.calledWithMatch", /Song added!/);
  });

  it("should play a song from search results", () => {
    cy.get('input[placeholder="Search"]').type("test song");
    cy.wait("@searchSongs");

    // stub musicPlayer
    cy.window().then((win) => {
      (win as any).musicPlayer = { playSong: cy.stub().as("playSong") };
    });

    cy.get(".resultItem").first().contains("Play").click();
    cy.get("@playSong").should("have.been.calledOnce");
  });

  it("should add a song to queue from search results", () => {
    cy.get('input[placeholder="Search"]').type("test song");
    cy.wait("@searchSongs");

    // stub musicPlayer
    cy.window().then((win) => {
      (win as any).musicPlayer = { addToQueue: cy.stub().as("addToQueue") };
    });

    cy.get(".resultItem").first().contains("+ Queue").click();
    cy.get("@addToQueue").should("have.been.calledOnce");
  });

  it("should show message when no recently played songs", () => {
    cy.wait("@getRecentlyPlayed");
    cy.contains("No recently played songs").should("be.visible");
  });

  it("should show empty queue initially", () => {
    cy.contains("Queue (0 songs)").should("be.visible");
    cy.contains("No songs in queue").should("exist");
  });
});
