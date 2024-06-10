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
const TIME_IN_DAYS = 1000 * 60 * 60 * 24;
const CHAR_LENGTH = 500;
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

            // Check if original message meets time threshold:
            const messageAgeInDays = (Date.now() - originalMessage.createdTimestamp) / TIME_IN_DAYS;
            const ageThresholdInDays = 7;

            if (messageAgeInDays > ageThresholdInDays) {
                //Include snippet of original message for context:
                
                let snippet = originalMessage.content;

                if (originalMessage.content.length > CHAR_LENGTH) {
                    const spaceIndex = originalMessage.content.indexOf(" ", 500);
                    snippet = originalMessage.content.substring(0, spaceIndex) + "...";
                }

                const replyContext = `Replying to **${originalMessage.member.displayName}**: ${snippet}`;

                // Send follow-up message with context: 
                message.channel.send(`${replyContext}\n\n**Your reply:** ${message.content}\n${originalMessageLink}`);
            }
        }
        catch (error) {
            console.error("Something went wrong with fetching the original message: ", error);
        }
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

    // Message count:
    if (commandName === "messagecount") {
        const user = options.getUser("user");
        if (!user) {
            await interaction.reply("User not found.");
            return;
        }

        const { id: userId} = user;
        const { user: { id: targetId } } = interaction;
        
        if (userId === client.user.id || userId === targetId) {
            await interaction.reply("You cannot count messages to yourself or the bot.");
            return;
        }

        await interaction.deferReply();

        const channel = interaction.channel;
        let messageCount = 0;
        let lastMessageId = null;
        let reachedTargetUser = false;

        console.log(`Counting messages from ${interaction.user.username} to ${user.username}...`);

        while (true) {
            try {
                const messages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
                if (messages.size === 0) {
                    break;
                }
                
                for (const [messageId, message] of messages) {
                    console.log(`Checking message from ${message.author.username} at ${message.createdAt}`);
                    if (message.author.id === userId) {
                        reachedTargetUser = true;
                        console.log(`Reached a message from ${user.username}, stopping count.`);
                        break;
                    }

                    if (message.author.id === targetId) {
                        messageCount++;
                    }

                    lastMessageId = messageId;
                }

                if (reachedTargetUser) {
                    break;
                }
            }
            catch (error) {
                console.error("Error fetching messages: ", error);
                break;
            }
        }

        console.log(`Counted ${messageCount} messages from ${interaction.user.username} to ${user.username}.`);

        await interaction.editReply(`You have sent ${messageCount} messages to ${user.username} since their last reply.`);
    }

    // Check message for replies:
    if (commandName === "checkreply") {
        const messageId = options.getString("messageid");

        try {
            const channel = interaction.channel;
            const originalMessageLink = `https://discord.com/channels/${interaction.guildId}/${channel.id}/${messageId}`;

            // Check for replies:
            const replies = [];
            const fetchedMessages = await channel.messages.fetch({ limit: 100 });
            fetchedMessages.forEach((message) => {
                if (message.reference && message.reference.messageId === messageId) {
                    replies.push(message);
                }
            });

            if (replies.length === 0) {
                await interaction.reply(`This message ${originalMessageLink} has not been replied to.`);
            }
            else {
                let replyText = `This message ${originalMessageLink} has been replied. Here are links to the replies:\n`;
                replies.forEach((reply) => {
                    const replyLink = `https://discord.com/channels/${interaction.guildId}/${channel.id}/${reply.id}`;
                    replyText += `${replyLink}\n`;
                });
                await interaction.reply(replyText);
            }
        }
        catch (error) {
            console.error(error);
            await interaction.reply(`An error occurred while fetching the message.`);
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
