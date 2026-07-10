# Music configuration

The built-in soundtrack is generated in real time with Web Audio and requires no external files.

To use licensed external tracks, edit `public/music-tracks.json`. Each value can be a full HTTPS audio URL or `netease:SONG_ID`, which resolves to the NetEase Cloud Music outer media URL format.

Only configure music that you are authorized to stream with the game. Empty, blocked, unavailable, or failed URLs automatically fall back to the corresponding procedural theme.
