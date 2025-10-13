/// <reference types="cypress" />

describe("Friend and FriendProfile Pages", () => {
  const FRONTEND = Cypress.env("FRONTEND_URL") || "http://localhost:5173";
  const API_URL = "http://localhost:3000";

  const USER = {
    id: "u-2000",
    email: "friend_user@example.com",
    name: "Friend User",
    profilePic: null as string | null,
  };

  // Silence unrelated API
  const silenceNoise = () => {
    cy.intercept("GET", "**/player/recently-played/**", {
      statusCode: 200,
      body: [],
    });
    cy.intercept("GET", "**/player/queue/**", { statusCode: 200, body: [] });
    cy.intercept("GET", "**/songs/popular**", { statusCode: 200, body: [] });
    cy.intercept("GET", "**/api/proxy-image**", {
      statusCode: 200,
      body: new Uint8Array([255, 216, 255, 224]),
    });
  };

  // Mock user session
  const stubSession = () => {
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: { user: USER },
    }).as("getSession");
    cy.intercept("GET", "**/api/current-user**", {
      statusCode: 200,
      body: { user: USER },
    }).as("currentUser");
  };

  // Mock Friends APIs
  const stubFriendsApi = () => {
    cy.intercept("GET", `${API_URL}/api/friends/requests*`, {
      statusCode: 200,
      body: {
        requests: [
          {
            requester: { id: "f001", name: "Alice", profilePic: null },
            userId: USER.id,
            friendId: "f001",
            requestedBy: "f001",
            status: "pending",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }).as("getRequests");

    cy.intercept("GET", `${API_URL}/api/friends/list*`, {
      statusCode: 200,
      body: {
        friends: [
          { id: "f002", name: "Bob", profilePic: null },
          { id: "f003", name: "Charlie", profilePic: null },
        ],
      },
    }).as("getFriends");

    cy.intercept("GET", `${API_URL}/api/friends/search*`, {
      statusCode: 200,
      body: {
        users: [
          {
            id: "f004",
            name: "David",
            email: "david@example.com",
            profilePic: null,
            status: "none",
          },
        ],
      },
    }).as("searchUsers");

    cy.intercept("POST", `${API_URL}/api/friends/request`, {
      statusCode: 200,
      body: { message: "Friend request sent" },
    }).as("sendRequest");
    cy.intercept("POST", `${API_URL}/api/friends/accept`, {
      statusCode: 200,
      body: { message: "accepted" },
    }).as("acceptRequest");
    cy.intercept("DELETE", `${API_URL}/api/friends/remove`, {
      statusCode: 200,
      body: { message: "removed" },
    }).as("removeFriend");
  };

  before(() => {
    silenceNoise();
    stubSession();

    cy.session(["mock-login", USER.email], () => {
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
    stubFriendsApi();
    cy.visit(`${FRONTEND}/friends`);
    cy.wait(["@getSession", "@currentUser", "@getRequests", "@getFriends"]);
  });

  it("should display friend requests and friends sections", () => {
    cy.contains("Friend Requests").should("be.visible");
    cy.contains("My Friends").should("be.visible");
  });

  it("should search for users correctly", () => {
    cy.get("input[placeholder='Search user']").type("soy100");
    cy.contains("Search").click();
    cy.wait("@searchUsers");
    cy.contains("David").should("be.visible");
  });

  it("should send a friend request", () => {
    cy.get("input[placeholder='Search user']").type("david");
    cy.contains("Search").click();
    cy.wait("@searchUsers");
    cy.contains("Send Request").click();
    cy.wait("@sendRequest");
  });

  it("should accept and reject friend requests", () => {
    cy.contains("✓").click();
    cy.wait("@acceptRequest");

    cy.contains("✕").click();
    cy.wait("@removeFriend");
  });

  it("should navigate to friend profile when clicking a friend", () => {
    cy.contains("Charlie").click();
    cy.url().should("include", "/profile/f003");
  });
});

describe("FriendProfile Page", () => {
  const FRONTEND = Cypress.env("FRONTEND_URL") || "http://localhost:5173";
  const API_URL = "http://localhost:3000";

  const USER = {
    id: "u-2000",
    email: "friend_user@example.com",
    name: "Friend User",
    profilePic: null as string | null,
  };

  const silenceNoise = () => {
    cy.intercept("GET", "**/player/recently-played/**", {
      statusCode: 200,
      body: [],
    });
    cy.intercept("GET", "**/player/queue/**", { statusCode: 200, body: [] });
  };

  const stubSession = () => {
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: { user: USER },
    }).as("getSession");
    cy.intercept("GET", "**/api/current-user**", {
      statusCode: 200,
      body: { user: USER },
    }).as("currentUser");
  };

  beforeEach(() => {
    silenceNoise();
    stubSession();

    cy.intercept("GET", `${API_URL}/api/users/f001/profile`, {
      statusCode: 200,
      body: {
        user: {
          id: "f001",
          name: "Charlie",
          email: "charlie@gmail.com",
          profilePic: null,
          createdAt: new Date().toISOString(),
        },
      },
    }).as("getFriendProfile");

    cy.intercept("GET", `${API_URL}/playlists/f001?mode=public`, {
      statusCode: 200,
      body: [
        {
          id: "pl001",
          name: "Charlie's Mix",
          description: "My public playlist",
          songCount: 3,
          coverUrl: null,
          isPublic: true,
          createdAt: new Date().toISOString(),
          ownerId: "f001",
        },
      ],
    }).as("getFriendPlaylists");

    cy.session(["mock-login", USER.email], () => {
      cy.visit(FRONTEND);
      cy.wait("@getSession");
      cy.window().then((win) => {
        win.localStorage.setItem("email", USER.email);
      });
      cy.setCookie("better-auth.session", "mock-session-cookie");
    });

    cy.visit(`${FRONTEND}/profile/f001`);
  });

  it("should display friend profile info", () => {
    cy.wait(["@getFriendProfile", "@getFriendPlaylists"]);
    cy.contains("Charlie").should("be.visible");
    cy.contains("@charlie").should("be.visible");
    cy.contains("Public Playlists").should("be.visible");
  });

  it("should open and display playlist details", () => {
    cy.contains("Charlie's Mix").click();
    cy.url().should("include", "profile/f001");
    cy.contains("PLAYLIST").should("exist");
  });
});
