ALTER TABLE "playlist_songs" ADD COLUMN "custom_order" integer;--> statement-breakpoint
CREATE INDEX "playlist_songs_custom_order_idx" ON "playlist_songs" USING btree ("playlist_id","custom_order");