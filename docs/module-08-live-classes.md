# Module 8 — Live Classes / Realtime

## Purpose
Secures the live-class signaling gateway (currently trusts client-supplied identity), and brings the WebRTC classroom up to a standard, robust level: screen sharing, host controls, raise-hand, go-live notifications, a pre-join device check, connection/reconnection handling, active-speaker view, TURN support, and teacher-side recording.

## How it works (context)
Media is **peer-to-peer (WebRTC mesh)**; the NestJS `LiveGateway` (Socket.IO `/live`) only does **signaling + chat relay + access control**. Teacher flips the class live → everyone opens `/live/class/[id]` → `useWebRTC` gets media, connects the socket, `join-room` → server access check → peers exchange `signal` (SDP/ICE) → media flows directly. Chat is server-relayed with in-memory history.

## User stories (from PROJECT_IDEA.md)
- **U-005** Attend online classes — access only if enrolled.
- **T-005** Teacher manages online class sessions (start/stop, only visible to enrolled users).

## Decisions locked

| Area | Decision |
|---|---|
| Socket auth | **Authenticate the handshake with the JWT** (the `access_token` cookie is already sent). Derive `userId` + `role` **server-side**; ignore client-supplied identity. |
| Multi-teacher | Instructor checks + end-session use `userMatchesClassTeacher` (lead, primary, or co-teacher). |
| Chat identity | `senderId`/`senderName` come from the authenticated socket only. |
| Teaching features | Screen sharing, host controls (mute / mute-all / remove), raise-hand, "class is live" notifications. |
| Reliability | Pre-join device check, per-peer connection + reconnection handling, active-speaker view. **TURN provisioning deferred** (paid infra) — code stays TURN-ready via existing env hooks; STUN-only for now. |
| Recording | **Teacher-side** MediaRecorder of the teacher's stream (camera/screen + mic) → downloadable `.webm`, optionally saved to class materials (reuses Module 7 video upload). No server-side recording infra. |
| Chat persistence | **Deferred** (still in-memory). Redis Socket.IO adapter is Module 11 (scaling). |

---

## Step-by-step plan

### A. Security (server)

**Step 1 — Authenticate the socket handshake.**
- `RealtimeModule`: register `JwtModule` (secret from `JWT_SECRET`, same as `auth.module`) and import `UserModule`.
- `LiveGateway.handleConnection`: read the `access_token` from `client.handshake.headers.cookie` (fallback `client.handshake.auth.token`). Verify with `JwtService`. On failure → `client.disconnect()`. On success, store **server-trusted** identity on `client.data`: `userId = payload.sub`, `role = mapRole(payload.role)` (`Admin`/`SuperAdmin`→`admin`, `Teacher`→`teacher`, `Student`→`student`, else `student`). Look up the user's name once (`UserService.findById`) and store a trusted `displayName`.

**Step 2 — Trust server identity in `join-room`.**
- Ignore `payload.userId`/`payload.role`/`payload.displayName`. Use `client.data.*`. Keep `payload.classId`.
- `isUserAllowedInClass` uses the authenticated `userId`/`role`; instructor check via `userMatchesClassTeacher`.

**Step 3 — Lock chat + end-session identity.**
- `chat-message`: `senderId = client.data.userId`, `senderName = client.data.displayName` (ignore payload identity).
- `end-session`: authorize via `userMatchesClassTeacher(klass, client.data.userId)` or `role === 'admin'`.

### B. Teaching features (server + client)

**Step 4 — Host controls.** New `host-action` event `{ action: 'mute' | 'mute-all' | 'remove', targetSocketId? }`.
- Server authorizes the emitter as teacher/admin of the room. Then:
  - `mute` → emit `force-mute` to the target (client disables its own mic — a P2P stream can't be muted server-side).
  - `mute-all` → `force-mute` to all non-host sockets in the room.
  - `remove` → emit `removed` to the target, then `targetSocket.leave(room)` + `targetSocket.disconnect()`; broadcast `peer-left`.
- Client (`useWebRTC`): on `force-mute` → disable local mic + update state; on `removed` → cleanup + show "removed by host".

**Step 5 — Raise hand.** `raise-hand { raised: boolean }` → server broadcasts `hand-raised { socketId, userId, displayName, raised }` (authenticated identity). Client tracks a raised-hands set; the teacher UI shows the queue; a participant can lower their own hand.

**Step 6 — Screen sharing (client).** `useWebRTC.startScreenShare()` uses `getDisplayMedia`, **replaceTrack** on every peer (swap the outgoing camera video track for the screen track), and emits a `presence` flag so peers can label "X is sharing"; `stopScreenShare()` restores the camera track. Handle the browser "stop sharing" event.

**Step 7 — "Class is live" notifications (server).** In `class.service.updateLiveState`, when `isLive` transitions **false → true**, load active enrollments (`enrollmentService.findByClass`) and notify each student (`NotificationService`, type `class_live`, with the class id/title + a join link). Inject `NotificationService` (import `NotificationModule` into `ClassModule`).

### C. Reliability / UX (client)

**Step 8 — Pre-join device check (lobby).** Before joining, `/live/class/[id]` shows a lobby: local camera preview, **device pickers** (camera/mic via `enumerateDevices`), mute/cam toggles, and a clear permission-denied state (with retry / join-without-media). Only on "Join" does it mount `LiveRoom`/`useWebRTC` with the chosen `deviceId`s.

**Step 9 — Connection state + reconnection.** Track per-peer state (`connecting` / `connected` / `reconnecting` / `failed`) from `peer.on('connect')` and `iceConnectionState`; show it on each `VideoTile`. On socket reconnect, tear down stale peers and re-`join-room` cleanly so the mesh rebuilds.

**Step 10 — Active-speaker view.** Use a WebAudio `AnalyserNode` per remote stream to measure audio level; mark the loudest as active speaker and visually emphasize their tile.

**Step 11 — TURN: keep code-ready, defer provisioning.** STUN (free, already wired) connects the large majority of peers. TURN only matters for the minority behind symmetric/strict NAT, and a relay carries real media bandwidth ⇒ paid infra. So: **no TURN server is provisioned in this module.** Keep the existing `NEXT_PUBLIC_TURN_*` env hooks (reading them is free), and document TURN as an optional later operator step (managed like Twilio/Metered/Cloudflare, or self-hosted coturn) to add only if real connection failures are observed. No code change beyond what already exists.

### D. Recording (client)

**Step 12 — Teacher-side recording.** A record control (teachers only) uses `MediaRecorder` on the teacher's active outgoing stream (camera or screen + mic). Stop → produce a `.webm` Blob → offer **Download** and **Save to class materials** (upload via the Module 7 materials endpoint, which now accepts video). Show a recording indicator while active.

### E. Module wiring
- `RealtimeModule`: + `JwtModule`, + `UserModule`.
- `ClassModule`: + `NotificationModule` (for go-live notifications).

## Verification checklist

- [ ] A socket with no/invalid JWT cookie is disconnected; a valid one joins.
- [ ] Sending `role: 'admin'` (or a spoofed `userId`) in `join-room` has **no effect** — identity comes from the token; a non-enrolled non-teacher is rejected.
- [ ] A **co-teacher** (in `teacherIds`) can join with teacher rights and end the session.
- [ ] Chat messages always show the real sender (payload identity ignored).
- [ ] Teacher can mute a student, mute-all, and remove a participant; the removed user is disconnected.
- [ ] Raise-hand shows in the teacher's queue; lowering works.
- [ ] Screen share replaces video for all peers and restores camera on stop.
- [ ] Enrolled students receive a notification when the class goes live.
- [ ] Pre-join lobby previews media, lets you pick devices, and handles permission denial.
- [ ] Per-peer connection status shows; a dropped socket reconnects and rebuilds the mesh.
- [ ] Active speaker is highlighted.
- [ ] TURN env hooks remain wired (STUN-only by default); no TURN server is required to build/run.
- [ ] Teacher can record and save the recording to class materials (video).
- [ ] `npx tsc --noEmit` passes in server/ and client/; both production builds pass.

## Notes / follow-ups
- **Chat persistence (DB)** and the **Redis Socket.IO adapter** (multi-instance) are deferred (the latter to Module 11 scaling).
- Mesh topology suits small classes; an SFU is the upgrade path if class sizes grow large.
- Full multi-party server-side recording would need an SFU/MCU; teacher-side recording is the pragmatic fit here.
