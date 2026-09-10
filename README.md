# 🔥 PairCode — Real-Time Collaborative Code Editor



PairCode is a full-stack collaborative coding platform where multiple users can edit code simultaneously in shared rooms, chat in real time, execute code, and manage multiple files — all without any setup or installation.

---

## 📸 Preview

```
┌─────────────────────────────────────────────────────────┐
│ 🔥 PairCode │ My Room │ ABC12345 │ 🔗 Copy  ▶ Run  💾  │
├──────────────────────────────────────────┬──────────────┤
│  main.py  │  utils.py  │ + New File      │  💬 Chat     │
├──────────────────────────────────────────┤  ● Sakshi    │
│  1  # Start coding here...               │  ● testuser  │
│  2  def fibonacci(n):                    │              │
│  3      if n <= 1: return n              │ Sakshi: hi!  │
│  4      return fib(n-1) + fib(n-2)      │ testuser: 👋 │
│                                          │              │
├──────────────────────────────────────────┤              │
│  ▶ Output                           ✕   │              │
│  Status: Accepted                        │ Type here... │
│  [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]      │        Send  │
└──────────────────────────────────────────┴──────────────┘
```

---

## ✨ Features

| Feature             | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| 🔄 Real-time sync   | Yjs CRDT — conflict-free collaborative editing like Google Docs |
| 💬 Live chat        | Room-based chat with user presence indicators                   |
| ▶ Code execution    | Run Python, JavaScript, Java, C++, TypeScript, Go               |
| 📁 Multiple files   | VS Code-style file tabs per room                                |
| 📜 Code history     | Snapshot and restore any previous version                       |
| 🔒 Private rooms    | Password-protect rooms                                          |
| 👤 User profiles    | Avatar, bio, display name, rooms created                        |
| 🌙 Dark/light theme | Toggle between themes                                           |
| 🔗 Share rooms      | One-click room link copying                                     |
| 🔐 Secure auth      | JWT via HttpOnly cookies                                        |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│   React 18 + Vite │ Monaco Editor │ Yjs CRDT │ Tailwind    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
          ┌────────────────┼────────────────────┐
          │                │                    │
          ▼                ▼                    ▼
   Spring Boot 3     Yjs WS Server        WebSocket
   (Port 8080)       (Port 1234)         STOMP/SockJS
          │
   ┌──────┴───────┐
   │              │
   ▼              ▼
PostgreSQL      Redis
(pgAdmin /    (Docker /
 Supabase)     Upstash)
```

---

## 🛠️ Tech Stack

### Backend

| Technology                  | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| Spring Boot 3.x             | REST API + WebSocket server                               |
| Spring Security + JWT       | Authentication via HttpOnly cookies                       |
| Spring Data JPA + Hibernate | ORM for PostgreSQL                                        |
| Spring WebSocket + STOMP    | Real-time messaging (chat, presence)                      |
| Redis (pub/sub)             | Broadcast messages across WebSocket sessions              |
| PostgreSQL                  | Persistent storage (users, rooms, files, chat, snapshots) |

### Frontend

| Technology              | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| React 18 + Vite         | UI framework                                   |
| Monaco Editor           | VS Code-quality code editor                    |
| Yjs + y-websocket       | CRDT-based conflict-free collaborative editing |
| y-monaco                | Binds Yjs to Monaco Editor                     |
| @stomp/stompjs + SockJS | WebSocket client for chat and presence         |
| Tailwind CSS            | Styling                                        |
| Axios                   | HTTP client                                    |
| React Router v6         | Client-side routing                            |

### DevOps

| Technology              | Purpose                         |
| ----------------------- | ------------------------------- |
| Docker + docker-compose | Local Redis container           |
| Maven                   | Java build tool                 |
| Vercel                  | Frontend deployment             |
| Render.com              | Backend + Yjs server deployment |
| Supabase                | Cloud PostgreSQL                |
| Upstash                 | Cloud Redis                     |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:

```
Java 21+        https://adoptium.net
Node.js 18+     https://nodejs.org
Maven           https://maven.apache.org
Docker Desktop  https://docker.com
pgAdmin         https://pgadmin.org
```

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/PairCode.git
cd PairCode
```

### 2. Start Docker (Redis)

```bash
docker-compose up -d
```

Verify:

```bash
docker ps
# Should show PairCode-redis running on port 6379
```

### 3. Set up the database

- Open pgAdmin
- Create a new database named `PairCode`

### 4. Configure backend

Open `backend/src/main/resources/application.properties`:

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/PairCode
spring.datasource.username=postgres
spring.datasource.password=YOUR_PGADMIN_PASSWORD

# JWT
jwt.secret=your-secret-key-minimum-32-characters-long
jwt.expiration-ms=28800000

# Redis
spring.data.redis.host=localhost
spring.data.redis.port=6379
```

### 5. Start the backend

```bash
cd backend
./mvnw spring-boot:run        # Mac/Linux
.\mvnw.cmd spring-boot:run    # Windows
```

Backend runs on `http://localhost:8080`

### 6. Start the Yjs server

```bash
cd yjs-server
npm install
node server.js
```

Yjs server runs on `ws://localhost:1234`

### 7. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 📁 Project Structure

```
PairCode/
│
├── backend/                          # Spring Boot application
│   └── src/main/java/com/PairCode/
│       ├── config/                   # CORS, Redis config
│       ├── controller/               # REST + WebSocket controllers
│       │   ├── AuthController.java
│       │   ├── RoomController.java
│       │   ├── ChatWebSocketController.java
│       │   ├── CodeWebSocketController.java
│       │   ├── ExecutionController.java
│       │   ├── RoomFileController.java
│       │   ├── SnapshotController.java
│       │   └── UserController.java
│       ├── dto/                      # Request/response objects
│       ├── exception/                # Custom exceptions
│       ├── model/                    # JPA entities
│       │   ├── User.java
│       │   ├── Room.java
│       │   ├── RoomFile.java
│       │   ├── ChatMessage.java
│       │   └── CodeSnapshot.java
│       ├── repository/               # Spring Data JPA repos
│       ├── security/                 # JWT, Spring Security
│       └── service/                  # Business logic
│
├── frontend/                         # React application
│   └── src/
│       ├── components/               # Reusable components
│       │   ├── FileTabs.jsx          # VS Code-style file tabs
│       │   ├── HistoryPanel.jsx      # Code snapshot viewer
│       │   └── PasswordModal.jsx     # Room password modal
│       ├── hooks/
│       │   ├── useWebSocket.js       # STOMP WebSocket (chat/presence)
│       │   └── useYjs.js             # Yjs CRDT collaborative editing
│       ├── pages/
│       │   ├── Landing.jsx           # Landing page
│       │   ├── Login.jsx             # Auth page
│       │   ├── Home.jsx              # Dashboard
│       │   ├── Room.jsx              # Main editor page
│       │   └── Profile.jsx           # User profile
│       └── services/
│           └── api.js                # Axios API calls
│
├── yjs-server/                       # Yjs WebSocket server
│   └── server.js
│
├── docker-compose.yml                # Redis container
└── README.md
```

---

## 🔌 API Endpoints

### Auth

| Method | Endpoint             | Description                    |
| ------ | -------------------- | ------------------------------ |
| POST   | `/api/auth/register` | Register new user              |
| POST   | `/api/auth/login`    | Login, returns HttpOnly cookie |

### Rooms

| Method | Endpoint                   | Description                    |
| ------ | -------------------------- | ------------------------------ |
| POST   | `/api/rooms/create`        | Create a new room              |
| GET    | `/api/rooms/{code}`        | Get room by code               |
| GET    | `/api/rooms/my-rooms`      | Get all rooms for current user |
| POST   | `/api/rooms/{code}/verify` | Verify room password           |

### Files

| Method | Endpoint                         | Description           |
| ------ | -------------------------------- | --------------------- |
| GET    | `/api/rooms/{code}/files`        | Get all files in room |
| POST   | `/api/rooms/{code}/files`        | Create new file       |
| PUT    | `/api/rooms/{code}/files/{name}` | Update file content   |
| DELETE | `/api/rooms/{code}/files/{name}` | Delete file           |

### Code Execution

| Method | Endpoint       | Description                       |
| ------ | -------------- | --------------------------------- |
| POST   | `/api/execute` | Execute code (Python/JS/Java/C++) |

### WebSocket Topics

| Destination                   | Description                |
| ----------------------------- | -------------------------- |
| `/topic/room/{code}/chat`     | Receive chat messages      |
| `/topic/room/{code}/presence` | User join/leave events     |
| `/topic/room/{code}`          | Code changes + file events |
| `/app/room/{code}/chat`       | Send chat message          |
| `/app/room/{code}/presence`   | Send join/leave            |
| `/app/room/{code}/code`       | Send code change           |

---

## 🧠 How Real-Time Sync Works

```
User A types code
       ↓
Yjs creates a tiny "operation" (not full code)
       ↓
y-websocket sends operation to Yjs server (port 1234)
       ↓
Yjs server broadcasts to all users in same room-file
       ↓
User B's Yjs doc applies the operation
       ↓
Monaco Editor updates automatically
       ↓
No conflicts — Yjs CRDT merges concurrent edits
```

**Why Yjs over plain WebSocket?**
Plain WebSocket sends full code on every keystroke — last write wins, causing overwrites. Yjs uses CRDT algorithms that mathematically guarantee conflict-free merging of concurrent edits, the same technology used by Notion, Figma, and VS Code Live Share.

---

## 🔐 Security

- Passwords hashed with **BCrypt**
- JWT stored in **HttpOnly cookies** (not localStorage — prevents XSS)
- Spring Security protects all API endpoints
- CORS configured for specific origins only
- Room passwords hashed before storage
- WebSocket connections authenticated via JWT

---

## 📝 Environment Variables (Production)

### Backend

```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://HOST:5432/PairCode
SPRING_DATASOURCE_USERNAME=your_db_user
SPRING_DATASOURCE_PASSWORD=your_db_password
JWT_SECRET=your_production_secret_min_32_chars
SPRING_DATA_REDIS_HOST=your_redis_host
SPRING_DATA_REDIS_PORT=6379
```

### Frontend (`.env.production`)

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_YJS_URL=wss://your-yjs-server.onrender.com
```

---

## 🌐 Deployment

| Service    | Platform   | URL                                 |
| ---------- | ---------- | ----------------------------------- |
| Frontend   | Vercel     | `https://PairCode.vercel.app`       |
| Backend    | Render.com | `https://PairCode-api.onrender.com` |
| Yjs Server | Render.com | `wss://PairCode-yjs.onrender.com`   |
| Database   | Supabase   | PostgreSQL cloud                    |
| Redis      | Upstash    | Redis cloud                         |

---

## 🎯 Resume Highlights

> _"Built a real-time collaborative code editor using Spring Boot WebSocket (STOMP), Yjs CRDT, and React/Monaco Editor supporting conflict-free concurrent multi-user editing."_

> _"Implemented JWT-based stateless authentication with HttpOnly cookies and Spring Security. Designed Redis pub/sub architecture for multi-instance WebSocket broadcasting."_

> _"Integrated code execution engine using ProcessBuilder supporting Python, JavaScript, Java, C++ with 10-second timeout and sandboxed temp file execution."_

> _"Deployed full-stack application using Docker, Vercel (frontend), Render.com (backend + Yjs), Supabase (PostgreSQL), and Upstash (Redis)."_

---

## 👨‍💻 Author

**Sakshi Sonawane**

- GitHub: [@sakshisonawane12](https://github.com/sakshisonawane12)
- Project: [PairCode](https://github.com/sakshisonawane12/PairCode)

---

