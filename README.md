# fullstack_term_project_g15

Group Member

660610738	Korn Sriwattana	660610779	Pimolnat Kaewboot	660612137	Kachapat Punthong	660610863	Yada Pholam

- สรุปขั้นตอนการนำไปพัฒนาต่อว่า หลังจากที่ clone project แล้วต้องรันคำสั่งอะไรบ้าง จึงเริ่มพัฒนาต่อได้
    - db
    File init.sh เปลี่ยนจาก CRLF เป็น LF
    .npmrc ให้ uncomment อันที่ตัวเองใช้
        1. pnpm install
        2. pnpm dlx @better-auth/cli@latest generate
        3. npm run db:generate
        3. docker compose up -d
        4. npm run db:push

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