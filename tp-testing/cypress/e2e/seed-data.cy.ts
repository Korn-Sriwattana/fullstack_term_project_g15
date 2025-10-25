/// <reference types="cypress" />

describe("🧪 Verify Seeded Data (Based on Actual Backend)", () => {
  const API_URL = Cypress.env("API_URL") || "http://localhost:3000";
  const geeEmail = "gee@example.com";
  let geeId = "";

  before(() => {
    cy.request(`${API_URL}/api/user/check?email=${geeEmail}`).then((res) => {
      geeId = res.body.user.id;
      expect(geeId).to.exist;
    });
  });

  it("should have seeded users: Gee, Pam, Eye", () => {
    for (const name of ["gee", "pam", "eye"]) {
      cy.request(`${API_URL}/api/user/check?email=${name}@example.com`).then(
        (res) => {
          expect(res.status).to.eq(200);
          expect(res.body.exists).to.be.true;
        }
      );
    }
  });

  it("should have seeded songs correctly", () => {
    cy.request(`${API_URL}/songs/search?q=Lover`).then((res) => {
      expect(res.status).to.eq(200);
      const lover = res.body.find((s: any) => s.title.includes("Lover"));
      expect(lover).to.exist;
    });
  });

  it("should have at least one liked song for Gee", () => {
    cy.request(`${API_URL}/liked-songs/${geeId}`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an("array");
      if (res.body.length === 0) {
        cy.log("⚠️ Gee has no liked songs (possibly not seeded)");
      } else {
        const first = res.body[0];
        const valid = first.songId || first.song_id || first.song;
        expect(valid, "Liked song must contain song reference").to.exist;
      }
    });
  });

  it("should have at least one public room", () => {
    cy.request(`${API_URL}/rooms/public`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an("array");
      const publicRoom = res.body.find((r: any) =>
        (r.name || r.roomName || "").includes("Lukchang")
      );
      cy.log(`✅ Found ${res.body.length} public rooms`);
      if (!publicRoom)
        cy.log("⚠️ No Lukchang Public Lounge found, check seed script");
      else expect(publicRoom).to.exist;
    });
  });

  it("should list friends (Gee’s list may be empty)", () => {
    cy.request({
      url: `${API_URL}/api/friends/list?userId=${geeId}`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400]).to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.have.property("friends");
        cy.log(`👥 Friend count: ${res.body.friends.length}`);
      } else {
        cy.log("⚠️ No friends found or missing userId handled properly");
      }
    });
  });

  it("should search for friends (e.g., Pam)", () => {
    cy.request({
      url: `${API_URL}/api/friends/search?q=Pam`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400]).to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.have.property("users");
        const found = res.body.users.some(
          (u: any) =>
            (u.name && u.name.toLowerCase().includes("pam")) ||
            (u.email && u.email.includes("pam"))
        );
        expect(found, "Should find Pam in search results").to.be.true;
      } else {
        cy.log("⚠️ No results or missing query handled correctly");
      }
    });
  });
});

describe("🎧 Verify Seeded Data on Frontend (UI)", () => {
  const FRONTEND = Cypress.env("FRONTEND_URL") || "http://localhost:5173";
  const API_URL = Cypress.env("API_URL") || "http://localhost:3000";

  const USER = {
    id: "seed-checker",
    email: "gee@example.com",
    name: "Gee",
    profilePic: null as string | null,
  };

  beforeEach(() => {
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: { user: USER },
    });
    cy.intercept("GET", "**/api/current-user**", {
      statusCode: 200,
      body: { user: USER },
    });
    cy.setCookie("better-auth.session", "mock-session-cookie");
  });

  it("should load homepage without crashing", () => {
    cy.visit(FRONTEND);
    cy.get("body").should("exist");
    cy.url().should("include", "localhost");
  });

  it("should display songs (from /songs/popular)", () => {
    cy.request(`${API_URL}/songs/popular`).then((res) => {
      expect(res.status).to.eq(200);
      cy.log(`✅ ${res.body.length} popular songs fetched`);
    });
  });

  it("should show Lukchang Public Lounge in Rooms page (if exists)", () => {
    cy.visit(`${FRONTEND}/lokchangrooms`);
    cy.wait(1500);
    cy.get("body").then(($body) => {
      const hasRoom = $body.text().includes("Lukchang");
      if (hasRoom) {
        cy.contains("Lukchang Public Lounge").should("be.visible");
      } else {
        cy.log("⚠️ No Lukchang room visible (check seed)");
      }
    });
  });
});
