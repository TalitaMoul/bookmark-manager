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

    it("should return 404 for non-existent bookmark id", async () => {
      const res = await request(app).get("/bookmarks/999-invalid-id");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Bookmark not found");
    });

    describe("Filtering Operations", () => {
      it("should filter bookmarks by tag", async () => {
        // Create a bookmark with specific tags for testing
        await request(app)
          .post("/bookmarks")
          .send({
            title: "Ghost Official Site",
            url: "https://www.ghost-official.com",
            tags: ["music", "rock"],
          });

        // Request bookmarks filtered by the 'music' tag
        const res = await request(app).get("/bookmarks?tag=music");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        // Ensure the returned bookmark actually contains the requested tag
        expect(res.body[0].tags).toContain("music");
      });
    });

    describe("Update and Delete Operations", () => {
      let testId: string;

      beforeAll(async () => {
        // Create a temporary bookmark to test updates/deletes
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

      it("should delete a bookmark", async () => {
        const res = await request(app).delete(`/bookmarks/${testId}`);
        expect(res.status).toBe(204);

        // Verify it's really gone
        const check = await request(app).get(`/bookmarks/${testId}`);
        expect(check.status).toBe(404);
      });
    });
  });
});
