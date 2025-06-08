import { client } from './bot.js';  // Your Discord.js and Riffy client instance

export const botController = {
    // Enhanced play function with better error handling
    async playSong(userId, query) {
        try {
            console.log(`[BOT] Looking for user ${userId} in guilds...`);
            
            // Get guild & voice channel where user is in
            const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
            if (!guild) {
                console.log(`[BOT] User ${userId} not found in any guild`);
                throw new Error('User not found in any guild. Make sure the bot is in the same server as you.');
            }

            console.log(`[BOT] Found user in guild: ${guild.name}`);
            
            const member = guild.members.cache.get(userId);
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                console.log(`[BOT] User ${userId} not in voice channel`);
                throw new Error('You must be in a voice channel to play music.');
            }

            console.log(`[BOT] User in voice channel: ${voiceChannel.name}`);

            // Create or get player connection
            let player = client.riffy.players.get(guild.id);
            if (!player) {
                console.log(`[BOT] Creating new player for guild ${guild.name}`);
                player = client.riffy.createConnection({
                    guildId: guild.id,
                    voiceChannel: voiceChannel.id,
                    textChannel: null, // no text channel, command-less
                    deaf: true
                });
            } else {
                console.log(`[BOT] Using existing player for guild ${guild.name}`);
            }

            // Resolve tracks from query
            console.log(`[BOT] Resolving query: ${query}`);
            const resolve = await client.riffy.resolve({ query });
            
            if (!resolve || resolve.loadType === 'no_matches') {
                console.log(`[BOT] No matches found for: ${query}`);
                throw new Error('No tracks found for your search query.');
            }

            if (resolve.loadType === 'playlist') {
                console.log(`[BOT] Adding playlist: ${resolve.playlistInfo.name} (${resolve.tracks.length} tracks)`);
                for (const track of resolve.tracks) {
                    player.queue.add(track);
                }
                if (!player.playing && !player.paused) await player.play();
                return { title: `Playlist: ${resolve.playlistInfo.name} (${resolve.tracks.length} tracks)` };
            } else {
                const track = resolve.tracks[0];
                console.log(`[BOT] Adding track: ${track.info.title} by ${track.info.author}`);
                player.queue.add(track);
                if (!player.playing && !player.paused) await player.play();
                return { title: `${track.info.title} by ${track.info.author}` };
            }
        } catch (error) {
            console.error(`[BOT] Error in playSong:`, error);
            throw error;
        }
    },

    // Enhanced pause function
    async pause(userId) {
        try {
            console.log(`[BOT] Pause request for user ${userId}`);
            
            const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
            if (!guild) {
                throw new Error('User not found in any guild');
            }
            
            const player = client.riffy.players.get(guild.id);
            if (!player) {
                throw new Error('No active music player found');
            }
            
            if (player.paused) {
                throw new Error('Music is already paused');
            }
            
            await player.pause(true);
            console.log(`[BOT] Successfully paused music in ${guild.name}`);
        } catch (error) {
            console.error(`[BOT] Error in pause:`, error);
            throw error;
        }
    },

    // Enhanced resume function
    async resume(userId) {
        try {
            console.log(`[BOT] Resume request for user ${userId}`);
            
            const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
            if (!guild) {
                throw new Error('User not found in any guild');
            }
            
            const player = client.riffy.players.get(guild.id);
            if (!player) {
                throw new Error('No active music player found');
            }
            
            if (!player.paused) {
                throw new Error('Music is not paused');
            }
            
            await player.pause(false);
            console.log(`[BOT] Successfully resumed music in ${guild.name}`);
        } catch (error) {
            console.error(`[BOT] Error in resume:`, error);
            throw error;
        }
    },

    // Enhanced skip function
    async skip(userId) {
        try {
            console.log(`[BOT] Skip request for user ${userId}`);
            
            const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
            if (!guild) {
                throw new Error("User not found in any guild");
            }
          
            const player = client.riffy.players.get(guild.id);
            if (!player) {
                throw new Error("No active music player found");
            }
            
            if (!player.playing && !player.paused) {
                throw new Error("No music is currently playing");
            }
          
            player.stop();
            console.log(`[BOT] Successfully skipped music in ${guild.name}`);
        } catch (error) {
            console.error(`[BOT] Error in skip:`, error);
            throw error;
        }
    },

    // New stop function
    async stop(userId) {
        try {
            console.log(`[BOT] Stop request for user ${userId}`);
            
            const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
            if (!guild) {
                throw new Error("User not found in any guild");
            }
          
            const player = client.riffy.players.get(guild.id);
            if (!player) {
                throw new Error("No active music player found");
            }
            
            // Clear the queue and stop
            player.queue.clear();
            player.stop();
            
            // Optionally disconnect from voice channel after a delay
            setTimeout(() => {
                if (player && !player.playing && player.queue.size === 0) {
                    player.destroy();
                    console.log(`[BOT] Destroyed player for ${guild.name}`);
                }
            }, 5000); // Wait 5 seconds before destroying
            
            console.log(`[BOT] Successfully stopped music and cleared queue in ${guild.name}`);
        } catch (error) {
            console.error(`[BOT] Error in stop:`, error);
            throw error;
        }
    },
    // Enhanced function to get player status
    async getStatus(userId) {
        try {
            const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
            if (!guild) {
                return { 
                    connected: false, 
                    error: "User not found in any guild"
                };
            }
          
            const player = client.riffy.players.get(guild.id);
            if (!player) {
                return { 
                    connected: false, 
                    playing: false, 
                    paused: false,
                    queue: 0,
                    current: null,
                    guild: guild.name
                };
            }
            
            const member = guild.members.cache.get(userId);
            const voiceChannel = member?.voice?.channel;
            
            return {
                connected: true,
                playing: player.playing,
                paused: player.paused,
                queue: player.queue.size,
                volume: player.volume || 100,
                guild: guild.name,
                voiceChannel: voiceChannel?.name || 'Unknown',
                current: player.current ? {
                    title: player.current.info.title,
                    author: player.current.info.author,
                    duration: player.current.info.length,
                    uri: player.current.info.uri,
                    thumbnail: player.current.info.artworkUrl
                } : null,
                position: player.position || 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[BOT] Error in getStatus:`, error);
            return {
                connected: false,
                error: error.message
            };
        }
    },

};