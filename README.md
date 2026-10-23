## Gup Chup – WhatsApp-style chat (Vite + React + Tailwind + Firebase + Cloudinary)

### Features
Sign up / log in, edit profile, find friends by phone number, real-time chat, read ticks, online status,
groups (create, add/remove members, admins, group photo/name/description, leave, delete),
message search, voice messages, photos / videos / audio / files, emojis, reactions, reply,
edit (15 min), delete for me / for everyone, typing indicator, clear chat, delete chat, block / unblock, voice calls (1-to-1), notifications, 5 in-app themes.

### 2. Cloudinary (files, photos, videos, voice messages)
Free plan limits: about 10 MB per image/document and 100 MB per video. Large files may be rejected.

### 3. Environment
    npm install
    npm run dev

### Notes
- Cloudinary files cannot be deleted from the browser (the API secret must stay private).
  "Delete for everyone" removes the file link from the chat; the file stays in your Cloudinary library.
- Calls need HTTPS (localhost is fine) and use free Google STUN. For strict networks add a TURN server in `.env`.
- Phone numbers are not SMS-verified.

### Typing, clear, delete and block (notes)
- Typing indicator writes a small timestamp to the chat document while someone types (at most once every 3 s).
- Clear chat and Delete chat only affect you. A deleted chat comes back automatically if the other person messages you again.
- Block is enforced inside the app: messages and calls from a blocked contact are hidden, silent and do not notify you.
  The blocked person is not told. (A server would be needed to technically stop them from writing to Firestore.)
- Messages a blocked contact sent while blocked reappear if you unblock them.
