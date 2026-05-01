import { jest } from "@jest/globals";
import request from "supertest";

const persistMock = jest.fn<() => Promise<void>>();

await jest.unstable_mockModule("./storage.js", () => ({
  persistBookmarks: persistMock,
  loadBookmarks: jest.fn<() => Promise<never[]>>().mockResolvedValue([]),
}));

const { default: app } = await import("./index.js");

describe("persistBookmarks failure handling", () => {
  beforeEach(() => {
    persistMock.mockReset();
    persistMock.mockResolvedValue(undefined);
  });

  describe("POST /bookmarks", () => {
    it("returns 500 with JSON error body when persist fails", async () => {
      persistMock.mockRejectedValueOnce(new Error("disk full"));

      const res = await request(app)
        .post("/bookmarks")
        .send({ title: "New", url: "https://new.example.com" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });

    it("does not add bookmark to memory when persist fails", async () => {
      const before = (await request(app).get("/bookmarks")).body as unknown[];

      persistMock.mockRejectedValueOnce(new Error("disk full"));
      await request(app)
        .post("/bookmarks")
        .send({ title: "Ghost Bookmark", url: "https://ghost.example.com" });

      const after = (await request(app).get("/bookmarks")).body as unknown[];
      expect(after.length).toBe(before.length);
    });
  });

  describe("PUT /bookmarks/:id", () => {
    let bookmarkId: string;

    beforeAll(async () => {
      persistMock.mockResolvedValue(undefined);
      const res = await request(app)
        .post("/bookmarks")
        .send({ title: "Original Title", url: "https://original.example.com" });
      bookmarkId = res.body.id as string;
    });

    it("returns 500 with JSON error body when persist fails", async () => {
      persistMock.mockRejectedValueOnce(new Error("disk full"));

      const res = await request(app)
        .put(`/bookmarks/${bookmarkId}`)
        .send({ title: "Updated Title", url: "https://original.example.com" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });

    it("does not mutate bookmark in memory when persist fails", async () => {
      persistMock.mockRejectedValueOnce(new Error("disk full"));
      await request(app)
        .put(`/bookmarks/${bookmarkId}`)
        .send({ title: "Should Not Stick", url: "https://original.example.com" });

      const check = await request(app).get(`/bookmarks/${bookmarkId}`);
      expect(check.body.title).toBe("Original Title");
    });
  });

  describe("DELETE /bookmarks/:id", () => {
    let bookmarkId: string;

    beforeAll(async () => {
      persistMock.mockResolvedValue(undefined);
      const res = await request(app)
        .post("/bookmarks")
        .send({ title: "To Delete", url: "https://to-delete.example.com" });
      bookmarkId = res.body.id as string;
    });

    it("returns 500 with JSON error body when persist fails", async () => {
      persistMock.mockRejectedValueOnce(new Error("disk full"));

      const res = await request(app).delete(`/bookmarks/${bookmarkId}`);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });

    it("does not remove bookmark from memory when persist fails", async () => {
      persistMock.mockRejectedValueOnce(new Error("disk full"));
      await request(app).delete(`/bookmarks/${bookmarkId}`);

      const check = await request(app).get(`/bookmarks/${bookmarkId}`);
      expect(check.status).toBe(200);
    });
  });
});
