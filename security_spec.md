# Study Battle Security Specification

## 1. Data Invariants
1. **Room Code Isolation**: `studyRooms` collection disables `list` queries globally so rooms cannot be enumerated or scraped. Only `get` by an exact 4-letter uppercase `roomCode` matching `^[A-Z]{4}$` is permitted.
2. **Strict Schema Enforcement**: Every write to `studyRooms`, `players`, and `answers` enforces exact allowed and required keys (`hasAll` + `hasOnly`), valid data types, and explicit `.size()` boundaries to prevent payload bloating or shadow fields.
3. **Immutable Room Anchors**: Once a room is created, `roomCode`, `hostId`, `hostName`, `title`, `questions`, `questionDurationSec`, and `createdAt` are immutable.
4. **State Machine Integrity**: Room status only transitions forward along `lobby -> question -> leaderboard -> (question | finished)`. Once `status == 'finished'`, the room is terminally locked against all further mutations.
5. **Relational Master Gate**: Players can only join existing rooms (`exists(...)`) while `status == 'lobby'`, starting at `score == 0`, `streak == 0`, and `lastPointsEarned == 0`. Answers can only be created when the parent room exists (`get(...)`), `status == 'question'`, `answersLocked == false`, `questionIndex == room.currentQuestionIndex`, and the referenced `playerId` exists in `players`.
6. **Temporal Integrity**: `createdAt`, `joinedAt`, and `updatedAt` fields are strictly validated against `request.time`.

## 2. Adversarial Payloads Blocked ("Dirty Dozen")
1. `LIST /studyRooms`: Global collection scrape -> Denied (`allow list: if false`).
2. `CREATE /studyRooms/ABC12`: Invalid 5-char room code with digit -> Denied (`isValidRoomCode`).
3. `CREATE /studyRooms/BOZZ` with `status: "finished"`: Shortcut creation straight to finished -> Denied.
4. `CREATE /studyRooms/BOZZ` with `questions: []`: Empty question deck -> Denied (`questions.size() >= 1`).
5. `CREATE /studyRooms/BOZZ` with extra field `isAdmin: true`: Shadow field injection -> Denied (`hasOnly`).
6. `UPDATE /studyRooms/BOZZ` mutating `questions`: Question tampering mid-game -> Denied (`affectedKeys().hasOnly(...)`).
7. `UPDATE /studyRooms/BOZZ` when `status == 'finished'`: Mutating terminal game state -> Denied.
8. `UPDATE /studyRooms/BOZZ` skipping `lobby -> finished`: Invalid state transition -> Denied.
9. `CREATE /studyRooms/BOZZ/players/p1` with `score: 99999`: Score spoofing on join -> Denied (`score == 0`).
10. `CREATE /studyRooms/BOZZ/players/p1` when room is `finished`: Late join injection -> Denied (`room.data.status == 'lobby'`).
11. `CREATE /studyRooms/BOZZ/answers/0_p1` when `answersLocked == true`: Post-timer buzzer bypass -> Denied.
12. `UPDATE /studyRooms/BOZZ/answers/0_p1`: Answer change after submission -> Denied (`allow update: if false`).
