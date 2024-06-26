import {REST, Routes} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// Define commands:
const commands = [
    {
        name: "pinmessage", 
        description: "Send messages to pin channel", 
        options: [ 
            {
                name: "messageid", 
                type: 3, 
                description: "The ID of the message to send", 
                required: true,
            },
        ],
    },
    {
        name: "messagecount", 
        description: "Check how many messages you have sent to a user since their last reply", 
        options: [
            {
                name: "user", 
                type: 6, 
                description: "The user to check the message count for", 
                required: true, 
            },
        ],
    },
    {
        name: "checkreply", 
        description: "Check if a message has been replied to", 
        options: [
            {
                name: "messageid", 
                type: 3, 
                description: "The ID of the message to check", 
                required: true,
            },
        ],
    },
];

// Register commands with Discord API: 
const rest = new REST({version: "10"}).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), 
            {body: commands},
        );

        console.log("Successfully reloaded application (/) commands");
    }
    catch (error) {
        console.error(error);
    }
})();