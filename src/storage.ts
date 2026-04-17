import fs from "node:fs/promises";
import { Bookmark } from "./types.js";

const FILE_PATH = "./bookmarks.json";

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await fs.writeFile(FILE_PATH, JSON.stringify(bookmarks, null, 2));
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  try {
    const data = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}
