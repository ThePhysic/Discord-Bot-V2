import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Partials, MessageCollector, ChannelType, EmbedBuilder, VoiceChannel } from "discord.js";

// Initialize the bot client:
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates, 
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

// Define target emojis and channels:
const PIN_TARGET_EMOJI = "📌";
const UNREAD_TARGET_EMOJI = "🔖";
const TODO_TARGET_EMOJI = "📝";
const DELETE_TODO_EMOJI = "✅";
const PIN_TARGET_CHANNEL_ID = process.env.PIN_CHANNEL_ID;
const UNREAD_TARGET_CHANNEL_ID = process.env.UNREAD_TARGET_CHANNEL_ID;
const TODO_TARGET_CHANNEL_ID = process.env.TODO_TARGET_CHANNEL_ID;
const TALKING_POINT_TARGET_CHANNEL_ID = process.env.TALKING_POINT_CHANNEL_ID;
const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID;
const USERNAME_REGEX = /<@(\d+)>/g;
const TODO_REGEX = /TODO/;
const deleteTodo = [false, false];


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
    if (reaction.emoji.name === PIN_TARGET_EMOJI) {
        emojiReactToSend(reaction.message, user, PIN_TARGET_CHANNEL_ID);
    }

    // Check if reaction emoji matches second target emoji:
    if (reaction.emoji.name === UNREAD_TARGET_EMOJI) {
        emojiReactToSend(reaction.message, user, UNREAD_TARGET_CHANNEL_ID);
    }

    // Check if reaction emoji matches third target emoji:
    if (reaction.emoji.name === TODO_TARGET_EMOJI) {
        emojiReactToSend(reaction.message, user, TODO_TARGET_CHANNEL_ID);
    }

    // Check emojis for deleting todo:
    const message = reaction.message.content;

    if (reaction.emoji.name === DELETE_TODO_EMOJI) {
        if (message.match(USERNAME_REGEX)[0] === `<@${user.id}>`) {
            deleteTodo[0] = true;
        }
        if (message.match(USERNAME_REGEX)[1] === `<@${user.id}>`) {
            deleteTodo[1] = true;
        }
        if (deleteTodo[0] === true && deleteTodo[1] === true) {
            reaction.message.delete();
            deleteTodo[0] = false;
            deleteTodo[1] = false;
        }
    }
});

// Event listener for reactions removed from messages:
client.on("messageReactionRemove", async (reaction, user) => {
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
            console.error("Something went wrong when fetching the reaction: ", error);
            return;
        }
    }

    // Check emojis removed for deleting todo:
    const message = reaction.message.content;

    if (message.match(USERNAME_REGEX)[0] === `<@${user.id}>`) {
        deleteTodo[0] = false;
    }
    if (message.match(USERNAME_REGEX)[1] === `<@${user.id}>`) {
        deleteTodo[1] = false;
    }
});

// Event listener for messages sent:
client.on("messageCreate", async (message) => {
    // Skip bot's own messages:
    if (message.author.bot) {
        return;
    }


    // Check if message is a reply:
    if (message.reference) {
        const originalMessageId = message.reference.messageId;

        try {
            // Fetch original message being replied to:
            const originalMessage = await message.channel.messages.fetch(originalMessageId);
            const originalMessageLink = `https://discord.com/channels/${originalMessage.guildId}/${originalMessage.channelId}/${originalMessage.id}`;

            // Add todo:
            if (message.content.substring(0, 5).match(TODO_REGEX)) {
                sendTodo(originalMessage, message.author, TODO_TARGET_CHANNEL_ID);
            }
            else if (message.content.match(TODO_REGEX)) {
                sendTodo(message, message.author, TODO_TARGET_CHANNEL_ID);
            }
    // Add todo that isn't a reply:
    else if (message.content.match(TODO_REGEX)) {
        sendTodo(message, message.author, TODO_TARGET_CHANNEL_ID);
    }
    }
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
            emojiReactToSend(message, interaction.user, PIN_TARGET_CHANNEL_ID, interaction);
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

// Function for sending todos:
const sendTodo = (message, user, targetChannelId, interaction = null) => {
    const targetChannel = client.channels.cache.get(targetChannelId);

    if (targetChannel && targetChannel.isTextBased()) {
        const messageLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
        targetChannel.send(`**Message from ${message.author}**:\n**Sent over by ${user}**:\n**TODO:** ${message.content}\n${messageLink}`);
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
