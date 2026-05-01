/**
 * Persistence module for the bookmark manager.
 *
 * Handles reading and writing bookmarks to a local JSON file whose path is
 * controlled by the BOOKMARKS_FILE environment variable (defaults to
 * ./bookmarks.json). Every write operation replaces the entire file, so
 * callers are responsible for loading the current state, mutating it, and
 * passing the full updated array to persistBookmarks.
 *
 * Note: there is no concurrency control — concurrent writes may overwrite
 * each other. For production use, replace this module with a proper database.
 */
import fs from "node:fs/promises";
import { config } from "./config.js";
import { Bookmark } from "./types.js";

export async function persistBookmarks(bookmarks: Bookmark[]): Promise<void> {
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
