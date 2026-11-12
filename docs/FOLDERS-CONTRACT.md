# Folders contract (wave 1 → wave 2)

## Types (`src/lib/meeting-db/types.ts`)
```ts
interface FolderRow { id: string; parentId: string | null; name: string; sort: number; createdAt: number; updatedAt: number }
interface MeetingSummaryRow { …existing; folderId: string | null }   // list/search rows
interface StoredMeeting   { …existing; folderId?: string | null }    // get() always sets it
```
`StoredMeeting.folderId` on PUT: absent = keep stored filing (browser sync sends none today); `null` = unfile; unknown folder id = unfiled.
`adoptStoredMeeting` fills `folderId` for the summary row but the browser's session index does NOT store it yet (wave 2: read it from `GET /api/meetings` rows / `GET /api/folders`).

## DB (`MeetingsDb`, `src/lib/meeting-db/db.ts`, schema v4)
```ts
class FolderError extends Error { code: 'not-found' | 'bad-name' | 'bad-parent' | 'cycle' }
type FolderDeleteMode = 'move-up' | 'delete-contents'
listFolders(): FolderRow[]                                   // by sort, name
createFolder(name, parentId = null, now?, id?): FolderRow    // bad-name | bad-parent; appended last among siblings
renameFolder(id, name, now?): FolderRow                      // not-found | bad-name
moveFolder(id, parentId | null, now?): FolderRow             // not-found | bad-parent | cycle; appended last
moveMeeting(meetingId, folderId | null, now?): void          // not-found (meeting) | bad-parent (folder); bumps updated_at
deleteFolder(id, mode, now?): { folders, meetings, markdownFiles }
```
Names: trimmed, whitespace collapsed, 1–200 chars. `delete-contents` deletes meetings via the same row path as `delete()` (id remembered in `deleted_meetings`, FTS/segments/speakers removed, scrub/VACUUM). `MeetingStore.deleteFolder(id, mode): { folders, meetings }` additionally removes the Markdown files — use the store, not the db, from routes.

## HTTP (all handlers call `refuseForeign`; errors `{ok:false,error}`)
| Route | Body / query | OK | Errors |
|---|---|---|---|
| `GET /api/folders` | – | `{ok, folders: FolderRow[]}` | |
| `POST /api/folders` | `{name, parentId?}` | 201 `{ok, folder}` | 400 `bad-folder`/`bad-name`/`bad-parent` |
| `PATCH /api/folders/:id` | `{name?, parentId?: string\|null}` | `{ok, folder}` | 400 bad-id/bad-name/bad-parent, 404 `not-found`, 409 `cycle` |
| `DELETE /api/folders/:id?mode=move-up\|delete-contents` (default move-up) | – | `{ok, deleted:{folders, meetings}}` | 400 `bad-mode`, 404 |
| `PUT /api/meetings/:id/folder` | `{folderId: string\|null}` | `{ok}` | 400 `bad-parent`, 404 `not-found` |
| `GET /api/meetings`, `GET /api/meetings/:id`, `PUT /api/meetings/:id` | as before | rows/meetings carry `folderId` | |

After a move/delete the affected meetings' `updatedAt` is bumped, so `pullFromServer` re-adopts them. Not touched: UI, markdown export, `src/mcp`, i18n.
