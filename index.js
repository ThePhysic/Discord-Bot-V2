import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Partials } from "discord.js";

// Initialize the bot client:
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

// Define target emojis and channels:
const firstTargetEmoji = "📌";
const secondTargetEmoji = "🔖";
const thirdTargetEmoji = "📝";
const deleteTodoEmoji = "✅";
const firstTargetChannelId = process.env.TARGET_CHANNEL_ID;
const secondTargetChannelId = process.env.SECOND_TARGET_CHANNEL_ID;
const thirdTargetChannelId = process.env.THIRD_TARGET_CHANNEL_ID;


// Event listener for when bot is ready:
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.displayName}!`);
});

// Event listener for reactions added to messages:
client.on("messageReactionAdd", async (reaction, user) => {
    // Ignore bot reactions:
    if (user.bot) {
        return;
    }

    // Fetch partials if necessary:
    if (reaction.partial) {
        try {
            await reaction.fetch();
        }
        catch (error) {
            console.error("Something went wrong whe fetching the reaction: ", error);
            return;
        }
    }

    // Check if reaction emoji matches first target emoji:
    if (reaction.emoji.name === firstTargetEmoji) {
        emojiReactToSend(reaction.message, user, firstTargetChannelId);
    }

    // Check if reaction emoji matches second target emoji:
    if (reaction.emoji.name === secondTargetEmoji) {
        emojiReactToSend(reaction.message, user, secondTargetChannelId);
    }

    // Check if reaction emoji matches third target emoji:
    if (reaction.emoji.name === thirdTargetEmoji) {
        emojiReactToSend(reaction.message, user, thirdTargetChannelId);
    }
});

// Event listener for slash commands:
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand) {
        return;
    }

    const { commandName, options } = interaction;

    // Pin message:
    if (commandName === "pinmessage") {
        const messageId = options.getString("messageid");
        try {
            const message = await interaction.channel.messages.fetch(messageId);
            emojiReactToSend(message, interaction.user, firstTargetChannelId, interaction);
        } 
        catch (error) {
            console.error("Something went wrong when fetching the message: ", error);
            await interaction.reply("Failed to pin the message. Please check the message ID and try again.");
        }
    }
});


// Function for checking emoji reactions (to send message):
const emojiReactToSend = (message, user, targetChannelId, interaction = null) => {
    const targetChannel = client.channels.cache.get(targetChannelId);

    if (targetChannel && targetChannel.isTextBased()) {
        const messageLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
        targetChannel.send(`**Message from ${message.author}**:\n**Sent over by ${user}**:\n${message.content}\n${messageLink}`);
        if (interaction) {
            interaction.reply(`Message pinned successfully to ${targetChannel.name}.`);
        }
    }
    else {
        console.error("Target channel not found or is not a text channel.");
    }
};

// Log in the bot:
client.login(process.env.DISCORD_TOKEN);
