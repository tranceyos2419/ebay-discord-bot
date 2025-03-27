import dotenv from 'dotenv'
dotenv.config()
import { Client, GatewayIntentBits } from 'discord.js'

// Create a new client instance with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // This is required to read message content
  ]
})

// Log when the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`)
})

// Listen for messages
client.on('messageCreate', (message) => {
  // Ignore messages from bots (including itself)
  if (message.author.bot) return

  // Log message details
  const channelName = 'name' in message.channel ? message.channel.name : 'DM';
  console.log(`[${message.guild?.name || 'DM'}] #${channelName} - ${message.author.tag}: ${message.content}`)

  // If there are attachments, log them too
  if (message.attachments.size > 0) {
    message.attachments.forEach((attachment) => {
      console.log(`Attachment: ${attachment.url}`)
    })
  }
})

// Login to Discord with your token
client.login(process.env.DISCORD_TOKEN)
