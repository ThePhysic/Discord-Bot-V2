# About

Discord Butler is a Discord Bot using Discord.js v13.

Implements several quality-of-life improvements in enhancing the user experience. 

# Getting Started

## Prerequisites

Install the latest version of [Node](https://nodejs.org/en/download/) from here. 
This bot requires Node v16 or above to function.

Create a Discord bot [here](https://discord.com/developers) and have the bot token ready.

You can find the bot token under the "Bot" page for your selected bot. Click "Copy" to copy the bot token to clipboard.

See here for example:
![Bot token page for a Discord bot](https://github.com/ThePhysic/Discord-Butler/assets/57155067/24af185b-5e7d-46dc-aa84-a6af3f3f7770)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/RogueArt/discord-bot-template.git
```

2. Install node modules:
```bash
cd discord-bot-template
npm install
```

3. Configure the bot:
   1. Make a copy of `.env.example` and call it `.env`
   2. Replace the value for `BOT_TOKEN` with your Discord bot's token
   3. Change the prefix to any prefix you want to use for your commands

## Running

To run the bot, simply do `npm run start`.

To run it in development mode, use `npm run dev` to live reload the bot as the source code changes.

# Contributing

Feel free to fork this repo and change the code however you like! Make a pull request and I'll review it as soon as I can!

## Project Features & Status

<details>
  <summary>✅ Auto send messages to separate channels (Completed)</summary>

  - Reacting to a message with a certain emoji will send that message to your desired channel.
  - Has slash command implementation as well for a more seamless manual way of doing it.
</details>

<details>
  <summary>✅ Auto-completion of todo action items (Completed)</summary>

  - Messages marked with the keyword "TODO" are sent to a #todo channel.
  - When the author of the original message and the person who initially marked the message to be sent over both react to this new message with checkmarks, the message will be deleted, and thus complete.
</details>

<details>
  <summary>✅ Bypassed "Message could not be loaded" (Completed)</summary>

  - Messages replied to that are more than a week old are sent a message from Discord Butler with a link and added context from original message.
  - Context is a copy of the original message, or if too large, is capped at around 500 characters.
</details>

<details>
  <summary>✅ Check if a message has been responded to (Completed)</summary>

  - Enter /checkreply and message ID to find out if a message has been replied to.
  - Discord Butler will provide message links if appropriate.
</details>

<details>
  <summary>✅ Auto-creation of forum post (Completed)</summary>

  - Messages involving keywords "Talking point" or "TP" will be prompted to enter a title within one minute for the forum post.
  - Discord Butler will create a forum post with your content, link the original message, and then send a message linking the forum post in the chat.
</details>

<details>
  <summary>✅ Call reminder (Completed)</summary>

  - If you're in a call for longer than 5 minutes, Discord Butler will send you a reminder to take some notes.
  - This message is easily customizable to anyway you see fit.
</details>

<details>
  <summary>🚧  Count your messages since another user last replied (In progress)</summary>

  - Enter /message count and user ID to find out how many messages you've sent them since they last replied.
  - Currently limited to last 100 messages sent in chat.
</details>

<details>
  <summary>More features still in the works!</summary>
</details>

<!-- Continue adding other sections as needed, following the same format -->
