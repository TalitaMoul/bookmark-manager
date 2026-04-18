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

      it("should delete a bookmark", async () => {
        const res = await request(app).delete(`/bookmarks/${testId}`);
        expect(res.status).toBe(204);

        const check = await request(app).get(`/bookmarks/${testId}`);
        expect(check.status).toBe(404);
      });
    });
  });
});
