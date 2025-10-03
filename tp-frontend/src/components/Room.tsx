import React from "react";

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

  return (
    <section>
      <h3>🏠 Create Room</h3>
      <input
        type="text"
        placeholder="Room name"
        value={roomNameInput}
        onChange={(e) => setRoomNameInput(e.target.value)}
      />
      <textarea
        placeholder="Description (optional)"
        value={roomDescriptionInput}
        onChange={(e) => setRoomDescriptionInput(e.target.value)}
      />
      <select value={mode} onChange={(e) => setMode(e.target.value as "public" | "private")}>
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>
      <button onClick={handleCreateRoom}>Create Room</button>

      <h3>🔑 Join Room</h3>
      <input
        type="text"
        placeholder="Invite Code"
        value={inviteCodeInput}
        onChange={(e) => setInviteCodeInput(e.target.value)}
      />
      <button onClick={() => handleJoinRoom()}>Join Room</button>

      <h2>🌍 Public Rooms</h2>
      <ul>
        {publicRooms.map((room) => (
          <li key={room.roomId}>
            <strong>{room.roomName}</strong> <br />
            📝 {room.description || "No description"} <br />
            👥 {room.count}/5 Members
            <br />
            <button onClick={() => handleJoinRoom(room.inviteCode)}>Join</button>
          </li>
        ))}
      </ul>

      <p>
        Current Room: {currentRoomName || "Not joined"}{" "}
        {currentInviteCode && <> (Invite: {currentInviteCode})</>}{" "}
        {roomId && (
          <>
            {" "}👥 {roomCount}/5 🔒 {currentIsPublic ? "Public" : "Private"}
            <button onClick={handleLeaveRoom}>Leave Room</button>
          </>
        )}
      </p>
    </section>
  );
};

export default RoomSection;
