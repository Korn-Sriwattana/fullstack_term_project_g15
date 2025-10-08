export interface ChatRoom {
  roomId: string; // รหัสห้องแชท
  roomName: string; // ชื่อห้อง
  users: string[]; // รายชื่อผู้ใช้ที่อยู่ในห้อง (อาจจะใช้ userId หรือชื่อผู้ใช้)
  messages: ChatMessage[]; // ข้อความทั้งหมดในห้องแชท
  createdAt: string; // วันที่สร้างห้อง
  updatedAt: string; // วันที่อัปเดตห้อง
}

export interface ChatMessage {
  userId: string; // รหัสผู้ใช้ที่ส่งข้อความ
  message: string; // ข้อความที่ถูกส่ง
  createdAt: string; // วันที่และเวลาที่ส่งข้อความ
}
