import request from "supertest";
import app from "./index.js";

describe("Health Check", () => {
  it("should return status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("Bookmarks API", () => {
  it("should create a new bookmark with valid data", async () => {
    const newBookmark = {
      title: "Ghost Official Site",
      url: "https://www.ghost-official.com",
    };

    const res = await request(app).post("/bookmarks").send(newBookmark);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe("Ghost Official Site");
  });

  it("should return 400 for invalid URL", async () => {
    const res = await request(app)
      .post("/bookmarks")
      .send({ title: "Error", url: "invalid-link" });

    expect(res.status).toBe(400);
  });

  describe("Read Operations", () => {
    it("should list all bookmarks", async () => {
      const res = await request(app).get("/bookmarks");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return a bookmark by id", async () => {
      const created = await request(app)
        .post("/bookmarks")
        .send({ title: "Find Me", url: "https://findme.com" });
      const res = await request(app).get(`/bookmarks/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it("should return 404 for non-existent bookmark id", async () => {
      const res = await request(app).get("/bookmarks/999-invalid-id");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Bookmark not found");
    });

    describe("Filtering Operations", () => {
      it("should filter bookmarks by tag", async () => {
        await request(app)
          .post("/bookmarks")
          .send({
            title: "Ghost Official Site",
            url: "https://www.ghost-official.com",
            tags: ["music", "rock"],
          });

        const res = await request(app).get("/bookmarks?tag=music");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].tags).toContain("music");
      });
    });

    describe("Search Operations", () => {
      it("should search bookmarks by title", async () => {
        await request(app)
          .post("/bookmarks")
          .send({ title: "TypeScript Guide", url: "https://typescript.org" });

        const res = await request(app).get("/bookmarks?q=typescript");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(
          res.body.some((b: { title: string }) =>
            b.title.toLowerCase().includes("typescript"),
          ),
        ).toBe(true);
      });

      it("should search bookmarks by URL", async () => {
        await request(app)
          .post("/bookmarks")
          .send({ title: "React Docs", url: "https://react.dev" });

        const res = await request(app).get("/bookmarks?q=react.dev");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(
          res.body.some((b: { url: string }) =>
            b.url.toLowerCase().includes("react.dev"),
          ),
        ).toBe(true);
      });

      it("should return empty array when no bookmarks match search", async () => {
        const res = await request(app).get(
          "/bookmarks?q=xyznonexistentterm123",
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      });

      it("should be case-insensitive when searching", async () => {
        await request(app)
          .post("/bookmarks")
          .send({ title: "Vue Framework", url: "https://vuejs.org" });

        const res = await request(app).get("/bookmarks?q=VUE");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(
          res.body.some((b: { title: string }) =>
            b.title.toLowerCase().includes("vue"),
          ),
        ).toBe(true);
      });

      it("should combine tag filter and search query", async () => {
        await request(app).post("/bookmarks").send({
          title: "Node.js Tutorial",
          url: "https://nodejs.org",
          tags: ["backend"],
        });

        const res = await request(app).get("/bookmarks?tag=backend&q=node");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(
          res.body.every(
            (b: { tags: string[]; title: string; url: string }) =>
              b.tags.includes("backend") &&
              (b.title.toLowerCase().includes("node") ||
                b.url.toLowerCase().includes("node")),
          ),
        ).toBe(true);
      });
    });

    describe("Filtering Edge Cases", () => {
      let idA: string;
      let idB: string;
      let idC: string;

      beforeAll(async () => {
        // A: term "alphadoc" only in title; tags: ["alpha", "docs"]
        const a = await request(app).post("/bookmarks").send({
          title: "AlphaDoc Primer",
          url: "https://primer.io",
          tags: ["alpha", "docs"],
        });
        idA = a.body.id;

        // B: term "betaref" only in URL; tags: ["beta"]
        const b = await request(app).post("/bookmarks").send({
          title: "Manual Guide",
          url: "https://betaref.com/manual",
          tags: ["beta"],
        });
        idB = b.body.id;

        // C: tags: ["alpha", "gamma"], no unique term in title or url
        const c = await request(app).post("/bookmarks").send({
          title: "Gamma Overview",
          url: "https://gamma.net",
          tags: ["alpha", "gamma"],
        });
        idC = c.body.id;
      });

      it("tag filter is case-insensitive", async () => {
        const res = await request(app).get("/bookmarks?tag=ALPHA");
        expect(res.status).toBe(200);
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(idA);
        expect(ids).toContain(idC);
      });

      it("tag filter returns empty array when no bookmark has the tag", async () => {
        const res = await request(app).get("/bookmarks?tag=nonexistent-xyz");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      });

      it("tag filter is exact match, not substring", async () => {
        // "alph" should NOT match bookmarks tagged "alpha"
        const res = await request(app).get("/bookmarks?tag=alph");
        expect(res.status).toBe(200);
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).not.toContain(idA);
        expect(ids).not.toContain(idC);
      });

      it("search matches a bookmark whose term appears only in the title", async () => {
        const res = await request(app).get("/bookmarks?q=alphadoc");
        expect(res.status).toBe(200);
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(idA);
        expect(ids).not.toContain(idB);
      });

      it("search matches a bookmark whose term appears only in the URL", async () => {
        const res = await request(app).get("/bookmarks?q=betaref");
        expect(res.status).toBe(200);
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(idB);
        expect(ids).not.toContain(idA);
      });

      it("combined tag+search returns empty when tag matches but q does not", async () => {
        // idB has tag "beta" but no "gamma" in title or url
        const res = await request(app).get("/bookmarks?tag=beta&q=gamma");
        expect(res.status).toBe(200);
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).not.toContain(idB);
      });

      it("combined tag+search returns only bookmarks matching both filters", async () => {
        // idA has tag "alpha" AND "alphadoc" in title
        const res = await request(app).get("/bookmarks?tag=alpha&q=alphadoc");
        expect(res.status).toBe(200);
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(idA);
        expect(ids).not.toContain(idC);
      });

      // Regression: search must use || not && — a term in only one field must still match
      it("search finds bookmark when term is in title but not in URL", async () => {
        const res = await request(app).get("/bookmarks?q=alphadoc");
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(idA); // "AlphaDoc Primer" at "https://primer.io"
      });

      it("search finds bookmark when term is in URL but not in title", async () => {
        const res = await request(app).get("/bookmarks?q=betaref");
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(idB); // "Manual Guide" at "https://betaref.com/manual"
      });

      it("empty q param is ignored and all bookmarks are returned", async () => {
        const all = await request(app).get("/bookmarks");
        const withEmptyQ = await request(app).get("/bookmarks?q=");
        expect(withEmptyQ.status).toBe(200);
        expect(withEmptyQ.body.length).toBe(all.body.length);
      });
    });

    describe("Pagination and Sorting", () => {
      it("returns array (no wrapper) when page and limit are absent", async () => {
        const res = await request(app).get("/bookmarks");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it("returns paginated shape when limit is provided", async () => {
        const res = await request(app).get("/bookmarks?limit=2");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("data");
        expect(res.body).toHaveProperty("total");
        expect(res.body).toHaveProperty("totalPages");
        expect(res.body.data.length).toBeLessThanOrEqual(2);
      });

      it("returns 400 for page < 1", async () => {
        const res = await request(app).get("/bookmarks?page=-1&limit=5");
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
      });

      it("returns 400 for page=0", async () => {
        const res = await request(app).get("/bookmarks?page=0&limit=5");
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
      });

      it("returns 400 for non-numeric page", async () => {
        const res = await request(app).get("/bookmarks?page=abc&limit=5");
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
      });

      it("caps limit at MAX_PAGE_SIZE (100)", async () => {
        const res = await request(app).get("/bookmarks?limit=999999");
        expect(res.status).toBe(200);
        expect(res.body.limit).toBeLessThanOrEqual(100);
      });

      it("returns 400 for invalid sort field", async () => {
        const res = await request(app).get("/bookmarks?sort=__proto__");
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
      });

      it("sorts by title ascending", async () => {
        const res = await request(app).get("/bookmarks?sort=title&order=asc");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const titles = res.body.map((b: { title: string }) => b.title);
        expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
      });
    });

    describe("Update and Delete Operations", () => {
      let testId: string;

      beforeAll(async () => {
        const res = await request(app)
          .post("/bookmarks")
          .send({ title: "Test", url: "https://test.com" });
        testId = res.body.id;
      });

      it("should update an existing bookmark", async () => {
        const res = await request(app)
          .put(`/bookmarks/${testId}`)
          .send({ title: "Updated Title", url: "https://test.com" });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe("Updated Title");
      });

      it("should return 404 when updating a non-existent bookmark", async () => {
        const res = await request(app)
          .put("/bookmarks/non-existent-id")
          .send({ title: "Ghost", url: "https://ghost.com" });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("error", "Bookmark not found");
      });

      it("should return 400 when updating with invalid data", async () => {
        const res = await request(app)
          .put(`/bookmarks/${testId}`)
          .send({ title: "", url: "not-a-url" });

        expect(res.status).toBe(400);
      });

      it("should return 404 when deleting a non-existent bookmark", async () => {
        const res = await request(app).delete("/bookmarks/non-existent-id");
        expect(res.status).toBe(404);
      });

      it("should delete a bookmark", async () => {
        const res = await request(app).delete(`/bookmarks/${testId}`);
        expect(res.status).toBe(204);

        const check = await request(app).get(`/bookmarks/${testId}`);
        expect(check.status).toBe(404);
      });
    });
  });
});
