# Specification: saveUser

## Function chosen and why

**Function:** `saveUser`

This function was chosen because it sits at the boundary between three distinct concerns — input validation, unique ID generation, and file-system persistence — making it an ideal candidate for specification-driven testing. None of these behaviors were covered by any existing test. Testing it requires thinking about failure modes that only appear at the intersections: what happens if validation passes but the file is corrupt? What if two callers write at the same time? These questions cannot be answered by reading a happy-path implementation; they require a behavioral specification written before the code is inspected.

---

## Description

`saveUser` receives an unknown object and attempts to register a new user in a local JSON file. It must validate the fields, generate a unique identifier, and persist the data.

---

## Behavioral Rules

**Validation**
- The `name` field is mandatory and must contain at least one non-whitespace character.
- The `email` field must be present and in a valid email format.
- If either field is invalid, the function must return a failure result containing a list of errors — one entry per invalid field.
- A failed validation must never write anything to the file.

**ID Generation**
- Every successfully saved user must receive a unique ID in UUID v4 format.
- Two successive calls with identical input must produce different IDs.

**Storage**
- Users must be stored as an array inside a JSON file.
- If the file does not exist at call time, it must be created.
- Each successful call appends one entry; previous entries must not be overwritten.
- If the storage file is corrupt (unreadable or invalid JSON), the function must not silently discard the existing contents.

**Return shape**
- Success: `{ success: true, user: { id: string, name: string, email: string } }`
- Failure: `{ success: false, errors: Array<{ path: string[], message: string }> }`

---

## Hand-calculated Expected Values

These values were derived before reading the source code.

### Case 1 — valid input
```
Input:  { name: "Talita", email: "liatest@ghost.com" }
Output: { success: true, user: { name: "Talita", email: "liatest@ghost.com", id: <uuid-v4> } }
```
Because both fields satisfy their constraints, a UUID is generated and the user is persisted.

### Case 2 — both fields invalid
```
Input:  { name: "", email: "invalid-email" }
Output: { success: false, errors: [{ path: ["name"], ... }, { path: ["email"], ... }] }
```
An empty string does not satisfy "at least one non-whitespace character"; "invalid-email" has no `@` separator. Two separate errors must be returned — one per field.

### Case 3 — missing name
```
Input:  { email: "marcello@test.com" }
Output: { success: false, errors: [{ path: ["name"], message: "Required" }] }
```
`name` is absent from the object entirely. One error indicating the field is required must be present.

### Case 4 — whitespace-only name (boundary)
```
Input:  { name: "   ", email: "valid@test.com" }
Output: { success: false, errors: [{ path: ["name"], ... }] }
```
`"   "` has `length === 3` and would pass a naive `min(1)` check. Semantically it is empty. The rule "at least one non-whitespace character" must be enforced after trimming.

### Case 5 — concurrent calls
```
Input:  two simultaneous saveUser calls with valid but distinct inputs
Output: both calls return success: true; the file contains exactly two entries
```
Because the function reads and then writes the file, concurrent calls without a write lock will produce a last-writer-wins race: one entry silently disappears. The expected value here documents the correct behavior, not what a naive implementation produces.
