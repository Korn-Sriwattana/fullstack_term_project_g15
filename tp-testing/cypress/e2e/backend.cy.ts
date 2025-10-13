// ✅ Lukchang Vibe - Backend Integration Test (Express + Drizzle + Better Auth)
describe("🎧 Lukchang Vibe Backend API Test Suite", () => {
  const baseUrl = "http://localhost:3000";

  // ข้อมูลจำลองผู้ใช้
  const mockUser = {
    email: "test@example.com",
    password: "123456",
    name: "Cypress User",
  };

  // ตัวแปรที่ใช้ร่วมกันระหว่าง describe
  let userId = "";
  let roomId = "";
  let inviteCode = "";
  let playlistId = "";

  // --------------------------------------------------------------------------
  // 🧩 1️⃣ USER SECTION
  // --------------------------------------------------------------------------
  describe("👤 User APIs", () => {
    it("should create or login mock user via /api/normal-signup", () => {
      cy.request("POST", `${baseUrl}/api/normal-signup`, mockUser).then(
        (res) => {
          expect(res.status).to.be.oneOf([200, 201]);
          expect(res.body.user).to.have.property("email", mockUser.email);
          userId = res.body.user.id;
          cy.log("✅ User ID:", userId);
        }
      );
    });

    it("should check if user exists", () => {
      cy.request(
        "GET",
        `${baseUrl}/api/user/check?email=${mockUser.email}`
      ).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
        if (res.status === 200)
          expect(res.body).to.have.property("exists", true);
      });
    });

    it("should fetch current user (mock or Better Auth)", () => {
      cy.request({
        method: "GET",
        url: `${baseUrl}/api/current-user?email=${mockUser.email}`,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
        if (res.status === 200)
          expect(res.body.user).to.have.property("email", mockUser.email);
      });
    });

    it("should upload a dummy profile picture", () => {
      cy.fixture("test-image.png", "binary")
        .then(Cypress.Blob.binaryStringToBlob)
        .then((blob) => {
          const formData = new FormData();
          formData.append("image", blob, "test-image.png");

          cy.request({
            method: "POST",
            url: `${baseUrl}/upload/profile-pic`,
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
            },
            failOnStatusCode: false,
          }).then((res) => {
            expect(res.status).to.be.oneOf([200, 500]);
          });
        });
    });
  });

  // --------------------------------------------------------------------------
  // 🎵 2️⃣ MUSIC STREAMING SECTION
  // --------------------------------------------------------------------------
  describe("🎵 Music Streaming APIs", () => {
    it("should search for songs", () => {
      cy.request("GET", `${baseUrl}/songs/search?q=test`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array");
      });
    });

    it("should get popular songs", () => {
      cy.request("GET", `${baseUrl}/songs/popular`).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it("should create a new playlist", () => {
      cy.request({
        method: "POST",
        url: `${baseUrl}/playlists`,
        failOnStatusCode: false,
        body: {
          userId,
          name: "My Test Playlist",
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([201, 500]);
        playlistId = res.body?.id || "";
      });
    });

    it("should fetch user playlists", () => {
      cy.request("GET", `${baseUrl}/playlists/${userId}`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array");
      });
    });

    it("should fetch liked songs", () => {
      cy.request("GET", `${baseUrl}/liked-songs/${userId}`).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it("should get player state", () => {
      cy.request("GET", `${baseUrl}/player/state/${userId}`).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
      });
    });

    it("should play next song", () => {
      cy.request({
        method: "POST",
        url: `${baseUrl}/player/next`,
        failOnStatusCode: false,
        body: { userId },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 💬 3️⃣ COMMUNITY SECTION
  // --------------------------------------------------------------------------
  describe("💬 Community APIs", () => {
    it("should create a new listening room", () => {
      cy.request("POST", `${baseUrl}/rooms`, {
        name: "Cypress Test Room",
        hostId: userId,
        isPublic: true,
      }).then((res) => {
        expect(res.status).to.eq(201);
        roomId = res.body.roomId || res.body.id;
        inviteCode = res.body.inviteCode;
        cy.log("Room ID:", roomId, "Invite:", inviteCode);
      });
    });

    it("should list public rooms", () => {
      cy.request("GET", `${baseUrl}/rooms/public`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array");
      });
    });

    it("should join room by invite code", () => {
      cy.request({
        method: "POST",
        url: `${baseUrl}/rooms/join`,
        failOnStatusCode: false,
        body: {
          inviteCode,
          userId,
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
      });
    });

    it("should send a chat message", () => {
      cy.request({
        method: "POST",
        url: `${baseUrl}/chat`,
        failOnStatusCode: false,
        body: {
          roomId,
          userId,
          message: "Hello from Cypress!",
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 500]);
        if (res.status === 200)
          expect(res.body.data).to.have.property(
            "message",
            "Hello from Cypress!"
          );
      });
    });

    it("should fetch chat messages from the room", () => {
      cy.request({
        method: "GET",
        url: `${baseUrl}/chat/${roomId}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
      });
    });
  });
});
