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
const TALKING_POINT_REGEX = /(Talking point|TP)/;
const AGE_THRESHOLD_IN_DAYS = 7;
const TIME_IN_DAYS = 1000 * 60 * 60 * 24;
const CHAR_LENGTH = 500;
const FIVE_MINUTES = 1000 * 60 * 5;
const SIXTY_THOUSAND = 60000;

const approvedBy = {
    author: false, 
    sender: false, 
};
const emojiChannelMap = {
    [PIN_TARGET_EMOJI]: PIN_TARGET_CHANNEL_ID, 
    [UNREAD_TARGET_EMOJI]: UNREAD_TARGET_CHANNEL_ID, 
    [TODO_TARGET_EMOJI]: TODO_TARGET_CHANNEL_ID,
};

let talkingPointCounter = 0;
let callRecords = {};
let messageCounter = 0;


// Event listener for when bot is ready:
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.displayName}!`);

    // Fetch forum channel:
    const forumChannel = client.channels.cache.get(TALKING_POINT_TARGET_CHANNEL_ID);

    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
        console.error("Forum channel not found or is not a forum channel.");
        return;
}
    // Fetch active threads:
    const activeThreads = await forumChannel.threads.fetchActive();

    // Fetch archived threads:
    const archivedThreads = await forumChannel.threads.fetch({
        archived: {
            fetchAll: true,
        },
    });

    // Get talking point cuount:
    talkingPointCounter = talkingPointCount(activeThreads, archivedThreads);
});

// Event listener for reactions added to messages:
client.on("messageReactionAdd", async (reaction, user) => {
    // Ignore bot reactions:
    if (user.bot) {
        return;
    }

    // Fetch full version if partial:
    if (reaction.partial) {
        try {
            await reaction.fetch();
        }
        catch (error) {
            console.error("Something went wrong whe fetching the reaction: ", error);
            return;
        }
    }

    // Check if reaction emoji is in mapping object:
    const targetChannelId = emojiChannelMap[reaction.emoji.name];
    if (targetChannelId) {
        emojiReactToSend(reaction.message, user, targetChannelId);
    }

    // Check emojis for deleting todo:
    const message = reaction.message.content;
    const userId = `<@${user.id}>`;
    const matchRegex = message.match(USERNAME_REGEX);

    if (reaction.emoji.name === DELETE_TODO_EMOJI) {
        // Author approved:
        if (matchRegex[0] === userId) {
            approvedBy.author = true;
        }
        // Sender approved:
        if (matchRegex[1] === userId) {
            approvedBy.sender = true;
        }
        if (approvedBy.author === true && approvedBy.sender === true) {
            reaction.message.delete();
            approvedBy.author = false;
            approvedBy.sender = false;
        }
    }
});

// Event listener for reactions removed from messages:
client.on("messageReactionRemove", async (reaction, user) => {
    // Ignore bot reactions:
    if (user.bot) {
        return;
    }

    // Fetch full version if partial:
    if (reaction.partial) {
        try {
            await reaction.fetch();
        }
        catch (error) {
            console.error("Something went wrong when fetching the reaction: ", error);
            return;
        }
    }

    const message = reaction.message.content;
    const targetChannel = client.channels.cache.get(TODO_TARGET_CHANNEL_ID);
    const userId = `<@${user.id}>`;
    const matchRegex = message.match(USERNAME_REGEX);

    // Check emojis removed for deleting todo:
    if (message.channel === targetChannel) {
        // Author changed their mind:
        if (matchRegex[0] === userId) {
            approvedBy.author = false;
    }
        // Sender changed their mind:
        if (matchRegex[1] === userId) {
            approvedBy.sender = false;
        }
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
                emojiReactToSend(originalMessage, message.author, TODO_TARGET_CHANNEL_ID);
            }
            else if (message.content.match(TODO_REGEX)) {
                emojiReactToSend(message, message.author, TODO_TARGET_CHANNEL_ID);
            }

            // Check if original message meets time threshold:
            const messageAgeInDays = (Date.now() - originalMessage.createdTimestamp) / TIME_IN_DAYS;

            if (messageAgeInDays > AGE_THRESHOLD_IN_DAYS) {
                //Include snippet of original message for context:
                
                let snippet = originalMessage.content;

                if (originalMessage.content.length > CHAR_LENGTH) {
                    const spaceIndex = originalMessage.content.indexOf(" ", CHAR_LENGTH);
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
        emojiReactToSend(message, message.author, TODO_TARGET_CHANNEL_ID);
    }

    // Add talking point:
    const content = message.content;
    if (content.match(TALKING_POINT_REGEX)) {
        try {
            // Prompt user for title:
            await message.reply("Please provide a title for this TP:");

            // Create a message collector for the title:
            const filter = (response) => {
                return response.author.id === message.author.id;
            };

            const collector = new MessageCollector(message.channel, { time: SIXTY_THOUSAND, max: 1, filter: filter });

            // Event listener for receiving title:
            collector.on("collect", async (response) => {
                talkingPointCounter++;
                const title = `TP${String(talkingPointCounter).padStart(2, "0")} - ${response.content}`;
                const originalMessageLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
                const postContent = `${message.content}\n\n[Original Message](${originalMessageLink})`;

                // Create new post in forums channel:
                const forumChannel = client.channels.cache.get(TALKING_POINT_TARGET_CHANNEL_ID);
        
                if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                    return message.reply("Forum channel not found or not accessible.");
                }

                const newPost = await forumChannel.threads.create({
                    name: title,
                    message: {
                        content: postContent,
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(title)
                                .setDescription(postContent)
                                .setColor('#0099ff')
                        ]
                    }
                });

                await message.reply(`Talking Point has been created: [${title}](${newPost.url})`);
            });

            // Event listener for end of collection:
            collector.on("end", (collected) => {
                if (collected.size === 0) {
                    message.reply(`No title provided. Talking Point creation canceled.`);
                }
            });
        }
        catch (error) {
            console.error(error);
            message.reply(`An error occurred while creating the Talkiing Point.`);
        }
    }
});

// Event listener for voice calls:
client.on("voiceStateUpdate", (oldState, newState) => {
    const oldUserChannel = oldState.channel;
    const newUserChannel = newState.channel;

    // User joins voice channel:
    if (!oldUserChannel && newUserChannel) {
        const callId = newUserChannel.id;
        if (!callRecords[callId]) {
            callRecords[callId] = {
            startTime: Date.now(),
            timeout: setTimeout(() => {
                const targetChannel = client.channels.cache.get(GENERAL_CHANNEL_ID);
                    if (newUserChannel instanceof VoiceChannel) {
                    targetChannel.send(`Remember to take notes!`);
                }
                }, 3000)
        };
        }
    }

    // User leaves voice channel:
    if (oldUserChannel && !newUserChannel) {
        const callId = oldUserChannel.id;
        const remainingUsers = oldUserChannel.members.size;

        if (remainingUsers === 0 && callRecords[callId]) {
            clearTimeout(callRecords[callId].timeout);
            delete callRecords[callId];
        }
    }
});

// Event listener for message updates:
client.on("messageUpdate", async (oldMessage, newMessage) => {
    try {
        if (!oldMessage.pinned && newMessage.pinned) {
            const pinnedMessages = await newMessage.channel.messages.fetchPinned();
            const pinnedMessageCount = pinnedMessages.size;
            if (pinnedMessageCount >= 40) {
                newMessage.channel.send(`Warning: The number of pinned messages is nearing its limit. Current count: ${pinnedMessageCount}`);
            }
        }
    }
    catch (error) {
        console.error("Error fetching pinned messages: ", error);
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
        let lastMessageId = null;
        let reachedTargetUser = false;

        console.log(`Counting messages from ${interaction.user.username} to ${user.username}...`);

        while (!reachedTargetUser) {
                const messages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
            reachedTargetUser = messageCount(user, userId, targetId, messages, lastMessageId);
        }

        console.log(`Counted ${messageCounter} messages from ${interaction.user.username} to ${user.username}.`);

        await interaction.editReply(`You have sent ${messageCounter} messages to ${user.username} since their last reply.`);
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
        const messageContent = targetChannelId === TODO_TARGET_CHANNEL_ID ? `**Message from ${message.author}**:\n**Sent over by ${user}**:\n**TODO:** ${message.content}\n${messageLink}` : `**Message from ${message.author}**:\n**Sent over by ${user}**:\n${message.content}\n${messageLink}`;
        targetChannel.send(messageContent);
        if (interaction) {
            interaction.reply(`Message pinned successfully to ${targetChannel.name}.`);
        }
    }
    else {
        console.error("Target channel not found or is not a text channel.");
    }
};

// Function for message count:
const messageCount = (user, userId, targetId, messages, lastMessageId) => {
    let reachedTargetUser = false;
    try {
        // If there are no messages from that user:
        if (messages.size === 0) {
            return;
        }
            
        for (const [messageId, message] of messages) {
            console.log(`Checking message from ${message.author.username} at ${message.createdAt}`);
            if (message.author.id === userId) {
                reachedTargetUser = true;
                console.log(`Reached a message from ${user.username}, stopping count.`);
                return reachedTargetUser;
            }

            if (message.author.id === targetId) {
                messageCounter++;
            }

            lastMessageId = messageId;
        }

        if (reachedTargetUser) {
            return reachedTargetUser;
        }
    }
    catch (error) {
        console.error("Error fetching messages: ", error);
        return;
    }
};

// Function to check talking point count:
const talkingPointCount = (activeThreads, archivedThreads) => {
    const TALKING_POINT_COUNT_REGEX = /\d+/;

    try {
        // Combine active and archived threads:
        const allThreads = activeThreads.threads.concat(archivedThreads.threads);

        // Sort threads by creation time and access latest one:
        const latestThread = allThreads.sort((a, b) => b.createdAt - a.createdAt).first();

        // Get last talking point number from title:
        let postCount = 0;

        if (latestThread) {
            postCount = parseInt(latestThread.name.match(TALKING_POINT_COUNT_REGEX)[0]);
            return postCount;
    }
    else {
            console.log("No threads found in the forums channel.");
            return postCount;
        }
    }
    catch (error) {
        console.error("Error fetching threads: ", error);
    }
};

// Log in the bot:
client.login(process.env.DISCORD_TOKEN);
