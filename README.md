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

- สรุปขั้นตอนการนำไปพัฒนาต่อว่า หลังจากที่ clone project แล้วต้องรันคำสั่งอะไรบ้าง จึงเริ่มพัฒนาต่อได้
    - db
        1. File init.sh เปลี่ยนจาก CRLF เป็น LF
        2. .npmrc ให้ uncomment อันที่ตัวเองใช้
        3. pnpm install
        4. pnpm dlx @better-auth/cli@latest generate
        5. npm run db:generate
        6. docker compose up -d
        7. npm run db:push

    - backend
        1. pnpm install
        2. pnpm dlx @better-auth/cli@latest generate
        3. docker compose up -d

    - frontend
        1. pnpm install
        2. docker compose up -d

    - testing
        1. pnpm install
        2. npx cypress install
        3. npm run test

- ขั้นตอนและ script สำหรับการ seed ข้อมูลเบื้องต้นลงใน database ที่ใช้งาน
    - seed
    - 
