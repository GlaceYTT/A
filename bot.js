import { Client, GatewayDispatchEvents } from "discord.js";
import { Riffy } from "riffy";
import dotenv from "dotenv";
dotenv.config();

export const client = new Client({
  intents: [
    "Guilds",
    "GuildMessages",
    "GuildVoiceStates",
    "GuildMessageReactions",
    "MessageContent",
    "DirectMessages",
  ],
});

const nodes = [
  {
    name: "GlaceYT",
    password: "glaceyt",
    host: "5.39.63.207",
    port: 8262,
    secure: false,
  },
];

client.riffy = new Riffy(client, nodes, {
  send: (payload) => {
    const guild = client.guilds.cache.get(payload.d.guild_id);
    if (guild) guild.shard.send(payload);
  },
  defaultSearchPlatform: "ytmsearch",
  restVersion: "v4",
});

client.on("ready", () => {
  client.riffy.init(client.user.id);
  console.log(`Logged in as ${client.user.tag}`);
});

// Comment out or remove messageCreate command listener as it's command-less now
/*
client.on("messageCreate", async (message) => {
  // command logic removed
});
*/

client.riffy.on("nodeConnect", (node) => {
  console.log(`Node "${node.name}" connected.`);
});

client.riffy.on("nodeError", (node, error) => {
  console.log(`Node "${node.name}" encountered an error: ${error.message}.`);
});

client.riffy.on("trackStart", async (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);
  if (channel) channel.send(`Now playing: \`${track.info.title}\` by \`${track.info.author}\`.`);
});

client.riffy.on("queueEnd", async (player) => {
  if (player.textChannel) {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) channel.send("Queue has ended.");
  }
  player.destroy();
});

client.on("raw", (d) => {
  if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate].includes(d.t)) return;
  client.riffy.updateVoiceState(d);
});

client.login(process.env.TOKEN);
