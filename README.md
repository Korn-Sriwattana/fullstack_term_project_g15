# fullstack_term_project_g15

Project_Overview

เว็บไซต์สำหรับฟังเพลงที่ให้ผู้ใช้ที่รักการฟังเพลงสามารถเล่นเพลงได้เต็มรูปแบบ สร้างและจัดการเพลย์ลิสต์ส่วนตัว อีกทั้งยังเป็นศูนย์รวมสำหรับสร้าง community ของเด็กมช. ที่มีรสนิยมการฟังเพลงคล้ายกัน ซึ่งสามารถเข้าร่วมห้องฟังเพลงร่วมกันแบบ real-time และพูดคุยแลกเปลี่ยนความคิดเห็นเกี่ยวกับเพลงและอื่น ๆ ได้

Group Member

660610738	Korn Sriwattana	660610779	Pimolnat Kaewboot	660612137	Kachapat Punthong	660610863	Yada Pholam

Technology Stack 

| **Layer** | **Technologies** |
|------------|------------------|
| **Backend** | Express, Authentication (BCrypt), Better Auth, YouTube API (Youtube Player api, Youtube Data api v3) , WebSocket |
| **Frontend** | React, Vite |
| **Database** | PostgreSQL, Drizzle ORM |
| **Testing** | Cypress |


13 OCT (20.29)ทำครั้งเดียว
- backend
`pnpm add -D @types/bcrypt`

better-auth installation(ทำครั้งเดียวพอ)
- db, backend, frontend
`pnpm add better-auth@latest`
- db, backend 
`pnmp dlx @better-auth/cli@latest generate`
- db
File init.sh เปลี่ยนจาก CRLF เป็น LF
.npmrc ให้ uncomment อันที่ตัวเองใช้
1. `pnpm install`
2. `npm run db:generate`
3. `docker compose up -d`
4. `npm run db:push`
(ทำครั้งเดียวหลังจากนั้นรันบน docker ได้เลย)

- backend & frontend
1. `pnpm install` 
2. `npm run dev` 

- testing
1. pnpm install
2. npx cypress install
3. npm run test

- better-auth
    - frontend
    1. pnpm add better-auth@latest
    - backend
    1. pnpm add better-auth@latest
    2. pnmp dlx @better-auth/cli@latest generate
    - db
    1. pnpm add better-auth@latest
    2. pnmp dlx @better-auth/cli@latest generate
    3. docker compose down -v
    4. docker compose up -d
    5. npm run db:push
