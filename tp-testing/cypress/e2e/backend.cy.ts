describe("Listening Rooms & Chat API", () => {
  let roomId = "";

  it("Create Room", () => {
    cy.request("POST", "/rooms", {
      name: "Cypress Room",
      isPublic: true,
      hostId: "11111111-1111-1111-1111-111111111111",
    }).then((res) => {
      expect(res.status).to.eq(200);
      roomId = res.body.id;
    });
  });

  it("Join Room", () => {
    cy.request("POST", "/rooms/join", {
      inviteCode: "abc123",
      userId: "11111111-1111-1111-1111-111111111111",
    }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it("Send chat message", () => {
    cy.request("POST", "/chat", {
      roomId,
      userId: "11111111-1111-1111-1111-111111111111",
      message: "Hello from Cypress!",
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data.message).to.eq("Hello from Cypress!");
    });
  });
});
