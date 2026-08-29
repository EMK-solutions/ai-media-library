# Duplicate files — business rules

Rules for [F-08-02](README.md).

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Only non-deleted catalog rows in the chosen library and folder scope participate. | Deleted or out-of-scope files must not reappear as copies. | `apps/desktop-media/electron/db/folder-duplicate-scan.ts` |
| BR-2 | Recursive default is on when the flag is omitted. Non-recursive scans exclude child-folder paths. | Folder-row "this folder only" must mean that. | Same; `folder-duplicate-scan-scope.ts` |
| BR-3 | Files larger than 128 MiB are not strongly hashed for this scan (skipped / unresolved hash). | Full hashing of huge videos would stall the machine. | `folder-duplicate-scan.ts` (`MAX_HASH_BYTES`) |
| BR-4 | Missing-on-disk files are skipped for hashing and counted in scan statistics. | The catalog can mention a path that is gone. | Same |
| BR-5 | A strong-hash group is every catalog path (library-wide) sharing that hash, if more than one path exists. | The extra copy may live outside the folder the user checked. | Same |
| BR-6 | Rows still without a usable hash are bucketed by case-insensitive file name + byte size + mtime (ms). Buckets of two or more are weak duplicates. | Gives a probable list when hashing was skipped. | `apps/desktop-media/electron/lib/folder-duplicate-scan-weak.ts` |
| BR-7 | Weak rows must never be presented as content-identical; the UI shows the amber metadata-only note. | Name/size/date collisions happen. | `duplicate-files-result-row.tsx` |
| BR-8 | The scan observes the job abort signal between units of work so dock **X** stops hashing promptly. | Cancel must not wait for the whole folder. | `folder-duplicate-scan` pipeline definition |
| BR-9 | Cancelled scan job ids are ignored when attaching completion so a superseded run cannot overwrite a newer session. | Rapid re-runs would flash stale results. | `apps/desktop-media/src/renderer/lib/duplicate-files-cancelled-scan-jobs.ts` |
| BR-10 | Delete targets are deduped by media id; empty list is rejected; more than 10,000 is rejected. | Guards the delete job. | `duplicate-marked-files-delete.ts` |
| BR-11 | Each delete target must still resolve to the expected path; mismatch is a per-file failure, not a silent catalog edit. | Stale UI selection must not remove the wrong row. | `apps/desktop-media/electron/lib/run-duplicate-marked-files-delete.ts` |
| BR-12 | `useTrash` defaults to true (OS Recycle Bin / Trash); false uses permanent unlink. | Accidental delete should be recoverable. | Same; confirm dialog resets the checkbox to on each open |
| BR-13 | Successful disk delete soft-deletes the catalog row. | The library must not keep showing a file that is gone. | Same |
| BR-14 | Scan and delete jobs run in the `io` concurrency group. | They compete with folder scan for disk, not with the vision model. | Pipeline definitions |
