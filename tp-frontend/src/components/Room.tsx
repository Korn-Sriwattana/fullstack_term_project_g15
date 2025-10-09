import React from "react";
import styles from "../assets/styles/lokchang-rooms.module.css";

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
      {/* แสดงเฉพาะตอนยังไม่ได้เข้าห้อง */}
      {!roomId && (
        <>
          {/* Join Room Section */}
          <div style={{ 
            backgroundColor: '#282828',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔑 Join Room with Invite Code
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Enter invite code..."
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '16px',
                  backgroundColor: '#3e3e3e',
                  border: '1px solid #535353',
                  borderRadius: '8px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1db954'}
                onBlur={(e) => e.target.style.borderColor = '#535353'}
              />
              <button 
                onClick={() => handleJoinRoom()}
                disabled={!inviteCodeInput.trim()}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: inviteCodeInput.trim() ? '#1db954' : '#535353',
                  color: 'white',
                  cursor: inviteCodeInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  opacity: inviteCodeInput.trim() ? 1 : 0.5,
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (inviteCodeInput.trim()) {
                    e.currentTarget.style.backgroundColor = '#1ed760';
                  }
                }}
                onMouseLeave={(e) => {
                  if (inviteCodeInput.trim()) {
                    e.currentTarget.style.backgroundColor = '#1db954';
                  }
                }}
              >
                Join
              </button>
            </div>
          </div>

          {/* Public Rooms Section */}
          <div style={{ 
            backgroundColor: '#282828',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🌍 Public Rooms ({publicRooms.length})
            </h3>
            
            {publicRooms.length > 0 ? (
              <div style={{ 
                display: 'grid',
                gap: '12px'
              }}>
                {publicRooms.map((room) => (
                  <div 
                    key={room.roomId}
                    style={{
                      backgroundColor: '#3e3e3e',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#4a4a4a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3e3e3e';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'white',
                        marginBottom: '4px'
                      }}>
                        {room.roomName}
                      </div>
                      <div style={{ 
                        fontSize: '13px',
                        color: '#b3b3b3',
                        marginBottom: '8px'
                      }}>
                        {room.description || "No description"}
                      </div>
                      <div style={{ 
                        fontSize: '12px',
                        color: '#1db954',
                        fontWeight: '500'
                      }}>
                        👥 {room.count}/{room.maxMembers || 5} Members
                      </div>
                    </div>
                    <button 
                      onClick={() => handleJoinRoom(room.inviteCode)}
                      style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '20px',
                        backgroundColor: '#1db954',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1ed760';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1db954';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Join Room
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: '#b3b3b3'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  No public rooms available
                </div>
                <div style={{ fontSize: '14px' }}>
                  Create your own room to get started!
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Current Room Info - แสดงเมื่ออยู่ในห้อง */}
      {roomId && (
        <div style={{ 
          backgroundColor: '#282828',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: '2px solid #1db954'
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ 
                fontSize: '12px',
                color: '#1db954',
                fontWeight: '600',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Current Room
              </div>
              <div style={{ 
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                marginBottom: '8px'
              }}>
                {currentRoomName}
              </div>
              <div style={{ 
                fontSize: '14px',
                color: '#b3b3b3',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <span>👥 {roomCount}/5 Members</span>
                <span>•</span>
                <span>{currentIsPublic ? '🌍 Public' : '🔒 Private'}</span>
                {currentInviteCode && (
                  <>
                    <span>•</span>
                    <span style={{ 
                      fontFamily: 'monospace',
                      backgroundColor: '#3e3e3e',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      Code: {currentInviteCode}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button 
              onClick={handleLeaveRoom}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: '1px solid #535353',
                borderRadius: '20px',
                backgroundColor: 'transparent',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ff4444';
                e.currentTarget.style.borderColor = '#ff4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#535353';
              }}
            >
              Leave Room
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default RoomSection;