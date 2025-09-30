CREATE TABLE "friends" (
	"userId" uuid NOT NULL,
	"friendId" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostId" uuid,
	"name" varchar(255),
	"isPublic" boolean DEFAULT true,
	"inviteCode" varchar(255),
	"maxMembers" integer DEFAULT 5,
	"currentSongId" uuid,
	"currentStartedAt" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listening_rooms_inviteCode_unique" UNIQUE("inviteCode")
);
--> statement-breakpoint
CREATE TABLE "playlist_songs" (
	"playlistId" uuid,
	"songId" uuid,
	"addedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"description" text,
	"isPublic" boolean DEFAULT true,
	"isFavorite" boolean DEFAULT false,
	"ownerId" uuid,
	"coverUrl" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_members" (
	"roomId" uuid,
	"userId" uuid,
	"role" varchar(50) DEFAULT 'listener',
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roomId" uuid,
	"userId" uuid,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_presence" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"roomId" uuid,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'listening'
);
--> statement-breakpoint
CREATE TABLE "room_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roomId" uuid,
	"songId" uuid,
	"queuedBy" uuid,
	"queueIndex" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_song_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roomId" uuid,
	"requesterId" uuid,
	"youtubeVideoId" varchar(255),
	"note" varchar(255),
	"status" varchar(50) DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_stats" (
	"songId" uuid PRIMARY KEY NOT NULL,
	"playCount" integer DEFAULT 0,
	"communityPlayCount" integer DEFAULT 0,
	"personalPlayCount" integer DEFAULT 0,
	"lastPlayedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"youtubeVideoId" varchar(255) NOT NULL,
	"title" varchar(255),
	"artist" varchar(255),
	"duration" integer DEFAULT 0,
	"coverUrl" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "songs_youtubeVideoId_unique" UNIQUE("youtubeVideoId")
);
--> statement-breakpoint
CREATE TABLE "table_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"profilePic" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "table_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_userId_table_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."table_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_friendId_table_users_id_fk" FOREIGN KEY ("friendId") REFERENCES "public"."table_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_rooms" ADD CONSTRAINT "listening_rooms_hostId_table_users_id_fk" FOREIGN KEY ("hostId") REFERENCES "public"."table_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_rooms" ADD CONSTRAINT "listening_rooms_currentSongId_songs_id_fk" FOREIGN KEY ("currentSongId") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_playlistId_playlists_id_fk" FOREIGN KEY ("playlistId") REFERENCES "public"."playlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_songId_songs_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_ownerId_table_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."table_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_roomId_listening_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."listening_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_userId_table_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."table_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_roomId_listening_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."listening_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_userId_table_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."table_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_presence" ADD CONSTRAINT "room_presence_userId_table_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."table_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_presence" ADD CONSTRAINT "room_presence_roomId_listening_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."listening_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue" ADD CONSTRAINT "room_queue_roomId_listening_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."listening_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue" ADD CONSTRAINT "room_queue_songId_songs_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_queue" ADD CONSTRAINT "room_queue_queuedBy_table_users_id_fk" FOREIGN KEY ("queuedBy") REFERENCES "public"."table_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_song_requests" ADD CONSTRAINT "room_song_requests_roomId_listening_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."listening_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_song_requests" ADD CONSTRAINT "room_song_requests_requesterId_table_users_id_fk" FOREIGN KEY ("requesterId") REFERENCES "public"."table_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_stats" ADD CONSTRAINT "song_stats_songId_songs_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;