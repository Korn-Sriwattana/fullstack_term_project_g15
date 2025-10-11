import React, { useState } from "react";

import styles from "../assets/styles/community/room.module.css";

interface Props {
  roomNameInput: string;
  setRoomNameInput: (val: string) => void;
  roomDescriptionInput: string;
  setRoomDescriptionInput: (val: string) => void;
  mode: "public" | "private";
  setMode: (val: "public" | "private") => void;
  handleCreateRoom: () => void;
  inviteCodeInput: string;
  setInviteCodeInput: (val: string) => void;
  handleJoinRoom: (invite?: string) => void;
  publicRooms: any[];
  currentRoomName: string;
  currentInviteCode: string;
  currentIsPublic: boolean;
  roomCount: number;
  roomId: string;
  handleLeaveRoom: () => void;
}

const RoomSection: React.FC<Props> = (props) => {
  const {
    roomNameInput,
    setRoomNameInput,
    roomDescriptionInput,
    setRoomDescriptionInput,
    mode,
    setMode,
    handleCreateRoom,
    inviteCodeInput,
    setInviteCodeInput,
    handleJoinRoom,
    publicRooms,
    currentRoomName,
    currentInviteCode,
    currentIsPublic,
    roomCount,
    roomId,
    handleLeaveRoom,
  } = props;

  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  const handleCreateAndClose = () => {
    handleCreateRoom();
    setShowCreateRoomModal(false);
  };

  return (
    <section className={styles.section}>
      {/* แสดงเฉพาะตอนยังไม่ได้เข้าห้อง */}
      {!roomId && (
        <>
          {/*  create + Join */}
          <div className={styles.actionRow}>
            <div className={styles.joinRow}>
              <input
                type="text"
                placeholder="Enter Id Room"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                className={styles.inviteInput}
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={!inviteCodeInput.trim()}
                className={styles.joinBtn}
              >
                join
              </button>
            </div>

            <button
              onClick={() => setShowCreateRoomModal(true)}
              className={styles.createBtn}
            >
              Create
            </button>
          </div>


          
          {/* Public Rooms Section */}
          <div className={styles.publicBox}>
            <h3 className={styles.publicTitle}>
              Public Rooms ({publicRooms.length})
            </h3>

            {publicRooms.length > 0 ? (
              <div className={styles.publicGrid}>
                {publicRooms.map((room) => (
                  <div
                    key={room.roomId}
                    className={styles.publicItem}
                  >
                    <div className={styles.publicInfo}>
                      <div className={styles.publicName}>{room.roomName}</div>
                      <div className={styles.publicDesc}>
                        {room.description || "No description"}
                      </div>
                      <div className={styles.publicCount}>
                        👥 {room.count}/{room.maxMembers || 5} Members
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.inviteCode)}
                      className={styles.publicJoinBtn}
                    >
                      Join Room
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.publicEmpty}>
                <div className={styles.publicEmptyEmoji}>🏠</div>
                <div className={styles.publicEmptyTitle}>
                  No public rooms available
                </div>
                <div className={styles.publicEmptyNote}>
                  Create your own room to get started!
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Current Room Info - เมื่ออยู่ในห้อง */}
      {roomId && (
        <div className={styles.currentBox}>
          <div className={styles.currentRow}>
            <div className={styles.currentLeft}>
              <div className={styles.currentLabel}>Current Room</div>
              <div className={styles.currentName}>{currentRoomName}</div>
              <div className={styles.currentMeta}>
                <span>👥 {roomCount}/5 Members</span>
                <span>•</span>
                <span>{currentIsPublic ? "🌍 Public" : "🔒 Private"}</span>
                {currentInviteCode && (
                  <>
                    <span>•</span>
                    <span className={styles.inviteCode}>
                      Code: {currentInviteCode}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={handleLeaveRoom}
              className={styles.leaveBtn}
            >
              Leave Room
            </button>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            setShowCreateRoomModal(false);
            setRoomNameInput("");
            setRoomDescriptionInput("");
            setMode("public");
          }}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>Create New Room</h2>

            {/* Room Name */}
            <div className={styles.field}>
              <label className={styles.label}>Room Name *</label>
              <input
                type="text"
                placeholder="My Awesome Room"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                autoFocus
                className={styles.input}
              />
            </div>

            {/* Description */}
            <div className={styles.field}>
              <label className={styles.label}>Description (optional)</label>
              <textarea
                placeholder="Describe your room..."
                value={roomDescriptionInput}
                onChange={(e) => setRoomDescriptionInput(e.target.value)}
                rows={3}
                className={styles.textarea}
              />
            </div>

            {/* Privacy Dropdown */}
            <div className={styles.field}>
              <label className={styles.label}>Privacy</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "public" | "private")}
                className={styles.select}
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                }}
              >
                <option value="public" style={{ backgroundColor: "#ffffffff" }}>
                  🌍 Public
                </option>
                <option value="private" style={{ backgroundColor: "#ffffffff" }}>
                  🔒 Private
                </option>
              </select>
              <small className={styles.help}>
                {mode === "public"
                  ? "This room will appear in public room list"
                  : "Only people with invite code can join"}
              </small>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionRow}>
              <button
                onClick={() => {
                  setShowCreateRoomModal(false);
                  setRoomNameInput("");
                  setRoomDescriptionInput("");
                  setMode("public");
                }}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAndClose}
                disabled={!roomNameInput.trim()}
                className={styles.createModalBtn}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default RoomSection;
