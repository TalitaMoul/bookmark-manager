import fs from "node:fs/promises";
import { config } from "./config.js";
import { Bookmark } from "./types.js";

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await fs.writeFile(config.BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  try {
    const data = await fs.readFile(config.BOOKMARKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}
