CREATE TABLE "personal_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"queue_index" integer NOT NULL,
	"source" varchar(50),
	"source_playlist_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"played_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current_song_id" uuid,
	"current_index" integer DEFAULT 0,
	"current_time" integer DEFAULT 0,
	"is_playing" boolean DEFAULT false,
	"repeat_mode" varchar(10) DEFAULT 'off',
	"shuffle_mode" boolean DEFAULT false,
	"shuffled_indices" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_queue" ADD CONSTRAINT "personal_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_queue" ADD CONSTRAINT "personal_queue_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_queue" ADD CONSTRAINT "personal_queue_source_playlist_id_playlists_id_fk" FOREIGN KEY ("source_playlist_id") REFERENCES "public"."playlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_state" ADD CONSTRAINT "player_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_state" ADD CONSTRAINT "player_state_current_song_id_songs_id_fk" FOREIGN KEY ("current_song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personal_queue_user_queue_idx" ON "personal_queue" USING btree ("user_id","queue_index");--> statement-breakpoint
CREATE INDEX "play_history_user_played_idx" ON "play_history" USING btree ("user_id","played_at");--> statement-breakpoint
ALTER TABLE "song_stats" DROP COLUMN "community_play_count";--> statement-breakpoint
ALTER TABLE "song_stats" DROP COLUMN "personal_play_count";