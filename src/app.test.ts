import request from "supertest";
import app from "./index.js";

describe("Health Check", () => {
  it("should create a new bookmark with valid data", async () => {
    const newBookmark = {
      title: "Ghost Official Site",
      url: "https://ghost-official.com",
    };

    const res = await request(app).post("/bookmarks").send(newBookmark);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe("Ghost Official Site");
  });

  it("should return 400 for invalid URL", async () => {
    const invalidBookmark = {
      title: "Invalid",
      url: "not-a-url",
    };

    const res = await request(app).post("/bookmarks").send(invalidBookmark);

    expect(res.status).toBe(400);
  });

  it("should return 404 for non-existent bookmark", async () => {
    const res = await request(app).get("/bookmarks/999-invalid-id");
    expect(res.status).toBe(404);
  });

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
    const invalidBookmark = {
      title: "Invalid",
      url: "link-quebrado", // URL malformada
    };

    const res = await request(app).post("/bookmarks").send(invalidBookmark);

    expect(res.status).toBe(400);
  });
});
