describe("Home Page & Logged In", () => {
  const FRONTEND = `http://${Cypress.env("FRONTEND_URL") || "localhost:5173"}`;
  const API_URL = "http://localhost:3000";
  const SIGNIN_PATH = "/signin";

  const email = `cypress_${Date.now()}@example.com`;
  const password = "1234";


  beforeEach(() => {
    cy.session([email, password], () => {
      cy.visit(`${FRONTEND}${SIGNIN_PATH}`);
      
      // ใช้การสร้างบัญชีหรือล็อกอิน
      cy.get('input[placeholder="Email"]').should("be.visible").type(email);
      cy.get('input[placeholder="Password"]').should("be.visible").type(password);
      cy.contains("button", /Sign Up\/Log In with Email/i)
        .should("be.enabled")
        .click();

      // เปลี่ยนมาหน้า Home และ localStorage ถูกตั้งค่าแล้ว
      cy.location("pathname", { timeout: 15000 }).should("eq", "/");
      cy.window().then((win) => {
        expect(win.localStorage.getItem("email")).to.eq(email);
      });
    });

    cy.intercept("GET", `${API_URL}/player/recently-played/*`).as("recentlyPlayed");
    cy.visit(`${FRONTEND}/`);
  });

  // Login Popup
  it("ไม่แสดง login popup เมื่อ login แล้ว", () => {
    cy.contains("Sign In / Log In").should("not.exist");
    cy.contains("This is Lukchang Vibe").should("not.exist");
  });

  // Search Bar
  it("แสดง search bar และสามารถค้นหาเพลงได้", () => {
    cy.get('input[placeholder="Search"]').should("be.visible").and("have.value", "");
    cy.get('input[placeholder="Search"]').type("test");
    cy.wait(600);
    cy.contains("h3", "Search Results").should("be.visible");
  });

  it("แสดง 'No results found' เมื่อค้นหาไม่เจอ", () => {
    cy.intercept("GET", `${API_URL}/songs/search*`, {
      statusCode: 200,
      body: [],
    }).as("emptySearch");

    cy.get('input[placeholder="Search"]').type("notfound");
    cy.wait("@emptySearch");
    cy.contains("No results found.").should("be.visible");
  });

  it("ล้างค่า search results เมื่อ clear search box", () => {
    cy.get('input[placeholder="Search"]').type("song");
    cy.wait(500);
    cy.contains("Search Results").should("be.visible");

    cy.get('input[placeholder="Search"]').clear();
    cy.wait(300);
    cy.contains("Search Results").should("not.exist");
  });

  // Popular Songs
  it("แสดง Popular Songs section เมื่อโหลดหน้าแรก", () => {
    cy.contains("h3", "🔥 Popular Songs").should("be.visible");
  });

  it("แสดงปุ่ม 'Show More' เมื่อมีเพลงมากกว่า 5 เพลง", () => {
    // Intercept ก่อน reload
    cy.intercept("GET", `${API_URL}/songs/popular*`, {
      statusCode: 200,
      body: Array.from({ length: 10 }, (_, i) => ({
        song: {
          id: `pop-${i}`,
          title: `Popular Song ${i + 1}`,
          artist: "Popular Artist",
          duration: 180,
          coverUrl: "https://via.placeholder.com/150",
        },
        playCount: 5000 + i * 100,
      })),
    }).as("popularSongs");

    cy.reload();
    cy.wait("@popularSongs");
    cy.contains("button", "Show More (10)").should("be.visible"); 
  });

  it("สามารถ toggle Show More / Show Less ได้", () => {
    // Intercept ก่อน reload
    cy.intercept("GET", `${API_URL}/songs/popular*`, {
      statusCode: 200,
      body: Array.from({ length: 10 }, (_, i) => ({
        song: {
          id: `pop-${i}`,
          title: `Popular Song ${i + 1}`,
          artist: "Popular Artist",
          duration: 180,
          coverUrl: "https://via.placeholder.com/150",
        },
        playCount: 5000 + i * 100,
      })),
    }).as("popularSongs");

    cy.reload();
    cy.wait("@popularSongs");
    cy.contains("button", "Show More (10)").click(); 
    cy.contains("button", "Show Less").should("be.visible");
    cy.contains("button", "Show Less").click();
    cy.contains("button", "Show More (10)").should("be.visible"); 
  });

  it("แสดง play count ในรูปแบบ K/M", () => {
    // Intercept ก่อน reload
    cy.intercept("GET", `${API_URL}/songs/popular*`, {
      statusCode: 200,
      body: [
        {
          song: { id: "1", title: "A", artist: "B" },
          playCount: 1500,
        },
        {
          song: { id: "2", title: "C", artist: "D" },
          playCount: 1500000,
        },
      ],
    }).as("popularSongs");

    cy.reload();
    cy.wait("@popularSongs");
    cy.contains("1.5K plays").should("exist"); 
    cy.contains("1.5M plays").should("exist"); 
  });

  // Quick Add Song
  it("เปิด/ปิด Quick Add form ได้", () => {
    cy.contains("button", "+ Add song").click();
    cy.get('input[placeholder="Paste a YouTube link"]').should("be.visible");
    cy.contains("button", "+ Add song").click();
    cy.get('input[placeholder="Paste a YouTube link"]').should("not.exist");
  });

  it("ปิด Quick Add form เมื่อกด ESC", () => {
    cy.contains("button", "+ Add song").click();
    cy.get("body").type("{esc}"); 
    cy.get('input[placeholder="Paste a YouTube link"]').should("not.exist");
  });

  it("ปิด Quick Add form เมื่อคลิก outside", () => {
    cy.contains("button", "+ Add song").click();
    cy.get("body").click(0, 0);
    cy.get('input[placeholder="Paste a YouTube link"]').should("not.exist");
  });

  it("เพิ่มเพลงจาก YouTube URL สำเร็จ", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    
    // ตั้งค่า Intercept เพื่อ Mock Response (แต่เราจะไม่ใช้ cy.wait เพื่อรอ)
    cy.intercept("POST", `${API_URL}/songs/add`, {
      statusCode: 200,
      body: {
        id: "yt1",
        title: "Added Song",
        artist: "Rick Astley",
        youtubeVideoId: "dQw4w9WgXcQ",
      },
    }).as("addSong");
    cy.on("window:alert", (txt) => {
        expect(txt).to.include("Song added!"); 
    });
    cy.contains("+ Add song").click();
    cy.get('input[placeholder="Paste a YouTube link"]')
      .should("be.visible")
      .type(url); 
    
    cy.contains("button", "+").click();
  });


  it("แสดง alert เมื่อ URL ไม่ถูกต้อง", () => {
    cy.contains("button", "+ Add song").click();
    cy.get('input[placeholder="Paste a YouTube link"]').type("invalid-url");
    cy.contains("button", "+").click();
    cy.on("window:alert", (txt) => expect(txt).to.include("Invalid YouTube URL"));
  });

  it("แสดงปุ่ม Play และ + Queue ใน search results", () => {
    cy.intercept("GET", `${API_URL}/songs/search*`, {
      statusCode: 200,
      body: [
        {
          id: "search-1",
          title: "Search Song 1",
          artist: "Tester",
          duration: 180,
        },
      ],
    }).as("searchSongs");

    cy.get('input[placeholder="Search"]').type("Search Song");
    cy.wait("@searchSongs");
    cy.contains("button", "Play").should("exist");
    cy.contains("button", "+ Queue").should("exist");
  });

  // Recently Played
  it("แสดง Recently Played section", () => {
    cy.contains("h3", "Recently Played").should("be.visible");
  });

  // Queue
  it("แสดง Queue section และ empty state", () => {
    cy.contains("h3", /Queue/).should("exist");
    cy.contains("No songs in queue").should("exist");
  });

  it("search bar อยู่ด้านบนและมองเห็นได้", () => {
    cy.get('input[placeholder="Search"]').should("be.visible");
  });

  // Edge Cases
  it("handle special characters ใน search", () => {
    cy.get('input[placeholder="Search"]').type("!@#$%^&*");
    cy.wait(300);
    cy.contains("Search Results").should("be.visible");
  });

  it("handle rapid search typing", () => {
    cy.get('input[placeholder="Search"]').type("abc");
    cy.wait(300);
    cy.get('input[placeholder="Search"]').should("have.value", "abc");
  });

  it("ไม่ crash เมื่อ search API error", () => {
    cy.intercept("GET", `${API_URL}/songs/search*`, {
      statusCode: 500,
      body: { error: "Server error" },
    }).as("searchError");

    cy.get('input[placeholder="Search"]').type("errorcase");
    cy.wait("@searchError"); 
    cy.get('input[placeholder="Search"]').should("exist");
    cy.contains("Search Results").should("not.exist"); 
  });
});