/// <reference types="cypress" />

describe("Playlist Page - Logged In (Mocked)", () => {
    const FRONTEND = Cypress.env("FRONTEND_URL") || "http://localhost:5173";
    const API_URL = "http://localhost:3000";

    const USER = {
        id: "u-1000",
        email: "cypress_user@example.com",
        name: "Cypress User",
        profilePic: null as string | null,
    };

    // Initial mock playlists
    const initialPlaylists = [
        { id: "pl-1", name: "My First Playlist", description: "Desc 1", isPublic: true, songCount: 2, createdAt: new Date().toISOString() },
        { id: "pl-2", name: "My Second Playlist", description: "Desc 2", isPublic: false, songCount: 0, createdAt: new Date().toISOString() },
    ];

    let mockPlaylists: typeof initialPlaylists;

    // Silence noise API calls
    const silenceNoise = () => {
        cy.intercept("GET", "**/player/recently-played/**", { statusCode: 200, body: [] });
        cy.intercept("GET", "**/player/queue/**", { statusCode: 200, body: [] });
        cy.intercept("GET", "**/songs/popular**", { statusCode: 200, body: [] });
        cy.intercept("GET", "**/api/proxy-image**", { statusCode: 200, body: new Uint8Array([255, 216, 255, 224]) });
    };

    // Stub user session
    const stubSession = () => {
        cy.intercept("GET", "**/api/auth/get-session", { statusCode: 200, body: { user: USER } }).as("getSession");
        cy.intercept("GET", "**/api/current-user**", { statusCode: 200, body: { user: USER, source: "mock" } }).as("currentUser");
    };

    // Stub Playlists API
    const stubPlaylistsApi = () => {
        // GET playlists
        cy.intercept("GET", `${API_URL}/playlists/${USER.id}?mode=owner`, (req) => {
            req.reply({ statusCode: 200, body: mockPlaylists });
        }).as("getPlaylists");

        // GET songs in playlist
        cy.intercept("GET", `${API_URL}/playlists/*/songs**`, (req) => {
            // ดึง playlistId จาก URL
            const urlParts = req.url.split('/');
            const playlistIdIndex = urlParts.findIndex(part => part === 'playlists') + 1;
            const playlistId = urlParts[playlistIdIndex];
            
            const playlist = mockPlaylists.find(p => p.id === playlistId);

            if (playlist && playlist.songCount > 0) {
                // สร้าง Mock Song List
                const songs = Array.from({ length: playlist.songCount }, (_, i) => ({
                    id: `ps-${i + 1}`,
                    song: {
                        id: `s-${i + 1}`,
                        title: `Song ${i + 1}`,
                        artist: `Artist ${i + 1}`,
                        duration: 180 + i * 10,
                        coverUrl: `/api/proxy-image?url=mock-cover-${i + 1}.jpg`
                    },
                    addedAt: new Date().toISOString(),
                }));
                req.reply({ statusCode: 200, body: songs });
            } else {
                req.reply({ statusCode: 200, body: [] });
            }
        }).as("getPlaylistSongs");

        // POST create playlist
        cy.intercept("POST", `${API_URL}/playlists`, (req) => {
            const newPlaylist = {
                ...req.body,
                id: `pl-${Date.now()}`,
                songCount: 0,
                createdAt: new Date().toISOString(),
            };
            mockPlaylists.push(newPlaylist);
            req.reply({ statusCode: 201, body: newPlaylist });
        }).as("createPlaylist");

        // DELETE playlist
        cy.intercept("DELETE", `${API_URL}/playlists/*`, (req) => {
            const id = req.url.split("/").pop();
            const idx = mockPlaylists.findIndex(p => p.id === id);
            if (idx >= 0) mockPlaylists.splice(idx, 1);
            req.reply({ statusCode: 200, body: {} });
        }).as("deletePlaylist");
    };

    before(() => {
        silenceNoise();
        stubSession();

        cy.session([USER.email], () => {
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
        mockPlaylists = JSON.parse(JSON.stringify(initialPlaylists));
        stubPlaylistsApi();
        cy.visit(`${FRONTEND}/playlist`);
        cy.wait("@getPlaylists");
    });

    it("แสดง Playlist page correctly", () => {
        cy.location("pathname").should("eq", "/playlist");
        cy.contains("h1", "Your Library").should("be.visible");
        cy.contains("button", "Create").should("be.visible");
        cy.get('input[placeholder="Search"]').should("be.visible");
    });

    it("สามารถสร้าง playlist ใหม่", () => {
        const newTitle = "My Brand New Playlist";
        cy.contains("button", "Create").click();
        
        cy.get('[class*="modalContent"]').should('be.visible');

        cy.get('input[placeholder="My Awesome Playlist"]').type(newTitle);
        cy.get('textarea[placeholder="Describe your playlist..."]').type("Test Description");
        cy.get("select").select("public"); 
        
        cy.get('[class*="modalActions"]').contains("button", "Create").click({ force: true });

        cy.wait("@createPlaylist");
        cy.wait("@getPlaylists");

        cy.contains(newTitle).should("exist");
    });

    it("สามารถเปิด playlist detail view และแสดงรายการเพลงที่ถูกต้อง", () => {
        const playlist = mockPlaylists[0];
        
        // คลิก Playlist Card 
        cy.get('[class*="playlistCard"]').first().click();
      
        cy.wait("@getPlaylistSongs");

        // ชื่อ Playlist
        cy.contains("h1", playlist.name).scrollIntoView().should("be.visible");

        // จำนวนเพลง
        if (playlist.songCount > 0) {
            cy.get('[class*="resultItem"]').should("have.length", playlist.songCount);
            
            // ใช้ .scrollIntoView() เพื่อแก้ไขปัญหา Clipping/Visibility
            cy.contains('Song 1').scrollIntoView().should('be.visible');
            cy.contains('Artist 2').scrollIntoView().should('be.visible');
        } else {
            cy.contains("No songs in this playlist").should("be.visible");
        }
    });

    it("สามารถเปิด playlist detail view และแสดง 'No songs in this playlist' เมื่อไม่มีเพลง", () => {
        const playlist = mockPlaylists[1]; 
        
        // คลิก Playlist Card
        cy.get('[class*="playlistCard"]').eq(1).click();
        
        // รอ API ดึงเพลง
        cy.wait("@getPlaylistSongs");

        // ชื่อ Playlist ในหน้า Detail
        cy.contains("h1", playlist.name).scrollIntoView().should("be.visible");
        
        // ตรวจสอบข้อความ Empty State เพิ่ม .scrollIntoView() แก้ไขปัญหา Clipping/Visibility
        cy.contains("No songs in this playlist").scrollIntoView().should("be.visible");
    });

    it("สามารถลบ playlist", () => {
        const titleToDelete = mockPlaylists[0].name;
        cy.get('[class*="playlistCard"]').first().within(() => {
            cy.get('[title="Delete playlist"]').click({ force: true });
        });
        
        cy.wait("@deletePlaylist");
        cy.wait("@getPlaylists");
        
        cy.contains(titleToDelete).should("not.exist");
    });

    it("สามารถค้นหา playlist", () => {
        cy.intercept("GET", `${API_URL}/songs/search?q=searchterm`, {
            statusCode: 200, 
            body: [
                { id: "s-100", title: "Search Song 1", artist: "Search Artist", duration: 200, coverUrl: "" }
            ] 
        }).as("searchSongs");

        // พิมพ์คำค้นหา
        cy.get('input[placeholder="Search"]').type("searchterm");
        
        // รอ API Search
        cy.wait("@searchSongs"); 
        
        // ตรวจสอบผลลัพธ์การค้นหาเพลง
        cy.contains("Search Song 1").should("exist");
        
        // ตรวจสอบว่า Playlists เดิมยังคงแสดงอยู่ 
        cy.contains("My First Playlist").should("exist");
        cy.contains("My Second Playlist").should("exist");
    });
    
    it("สามารถกดเล่น playlist ได้", () => {
        cy.window().then((win) => {
            (win as any).musicPlayer = {
                playSong: cy.stub().as("playSongStub"),
                addToQueue: cy.stub().as("addToQueueStub"),
            };
        });
        
        // คลิกปุ่ม Play
        cy.get('[class*="playlistCard"]').first().within(() => {
            cy.get('[title^="Play"]').click({ force: true });
        });
        cy.wait("@getPlaylistSongs"); 

        // ตรวจสอบว่ามีการเรียก 'playSong' (เพลงแรก)
        cy.get("@playSongStub").should("be.calledOnce");
        
        // ตรวจสอบว่ามีการเรียก 'addToQueue' (เพลงที่เหลือ: 2 - 1 = 1 เพลง)
        cy.get("@addToQueueStub").should("be.calledOnce"); 
    });

    it("แสดงว่า your playlist is empty เมื่อไม่มี playlist", () => {
        cy.intercept("GET", `${API_URL}/playlists/${USER.id}?mode=owner`, { statusCode: 200, body: [] }).as("getEmptyPlaylists");
        cy.reload();
        cy.wait("@getEmptyPlaylists");
        cy.contains("Your playlist is still empty").should("be.visible");
        cy.contains("Tap the Create button to start building your collection").should("be.visible");
    });
});