import {
  Client,
  GatewayIntentBits,
  TextChannel,
  ChannelType,
} from "discord.js";
import { config } from "../config/load-env";
import { ThreadData } from "../types/thread_data";
import { parse } from "csv-parse/sync";

const MAX_THREADS_PER_PERSON = 10;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("rateLimit", (rateLimitInfo) => {
  console.log("Rate limit hit:", rateLimitInfo);
});

client.on("messageCreate", async (message) => {
  try {
    if (!message.mentions.has(client.user!) || !message.attachments.size)
      return;

    const uploader = message.author;
    const attachment = message.attachments.first();
    if (!attachment?.name?.endsWith(".csv")) return;

    const response = await fetch(attachment.url);
    const text = await response.text();

    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const rows: ThreadData[] = records.map((record: any) => ({
      Deadline: record["Deadline"],
      "Order Number": record["Order Number"],
      "eBay Item Id": record["eBay Item Id"],
      product_id: record["product_id"],
      Category: record["Category"],
      Keyword: record["Keyword"],
      Identity: record["Identity"],
      "JP Keyword": record["JP Keyword"],
      Appendix: record["Appendix"],
      "Order Detail URL": record["Order Detail URL"],
      "Est. Prfoit": record["Est. Prfoit"],
      "In Charge Of": record["In Charge Of"]?.trim(),
    }));

    const grouped = rows.reduce<Record<string, ThreadData[]>>((acc, row) => {
      const rawPerson = row["In Charge Of"]?.trim();
      if (!rawPerson) return acc;

      const person = rawPerson.toLowerCase().replace(/[^a-z]/gi, "");
      const channelKey = `research-${person}`;

      if (!acc[channelKey]) acc[channelKey] = [];
      acc[channelKey].push(row);

      return acc;
    }, {});

    const guild = message.guild;
    if (!guild) {
      console.error("Guild not found for the message.");
      return;
    }

    await guild.channels.fetch().catch((error) => {
      console.error("Failed to fetch channels:", error);
      throw error;
    });

    const researchCategory = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildCategory &&
        ch.name.toLowerCase() === "research",
    );

    if (!researchCategory) {
      console.error("Research category not found.");
      return;
    }

    const researcherRole = guild.roles.cache.find(
      (role) => role.name === "Researcher",
    );
    const researcherMention = researcherRole
      ? `<@&${researcherRole.id}>`
      : "@Researcher";

    for (const [channelName, entries] of Object.entries(grouped)) {
      console.log(`Looking for channel: ${channelName}`);

      const channel = guild.channels.cache.find(
        (ch): ch is TextChannel =>
          ch.isTextBased() &&
          ch.type === ChannelType.GuildText &&
          ch.name === channelName &&
          ch.parentId === researchCategory.id,
      );

      if (!channel) {
        console.log(
          `Channel ${channelName} not found under Research category. Skipping...`,
        );
        continue;
      }

      const groupedByIdentityAndDeadline = entries.reduce<
        Record<string, ThreadData[]>
      >((acc, row) => {
        const identity = row["Identity"]?.trim();
        const deadline = row["Deadline"]?.trim();
        if (!identity || !deadline) return acc;

        const groupKey = `${identity}-${deadline}`;
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(row);
        return acc;
      }, {});

      for (const [identityAndDeadline, identityEntries] of Object.entries(
        groupedByIdentityAndDeadline,
      )) {
        const firstRow = identityEntries[0];
        const dateParts = firstRow.Deadline.split("/");
        const month = dateParts[0]?.padStart(2, "0");
        const day = dateParts[1]?.padStart(2, "0");
        const identity = firstRow["Identity"];

        const threadTitle = `${month}/${day} ${identity}`;

        try {
          const thread = await channel.threads.create({
            name: threadTitle,
            autoArchiveDuration: 10080,
            reason: "Auto-created from CSV upload by Assistant Bot",
          });

          const chunkedEntries = chunkArray(
            identityEntries,
            MAX_THREADS_PER_PERSON,
          );

          for (const chunk of chunkedEntries) {
            const content = chunk
              .map(
                (row) =>
                  `${researcherMention}\n Deadline: ${month}/${day}\n Order Number: ${row["Order Number"]}\n eBay Item Id: ${row["eBay Item Id"]}\n Product ID: ${row["product_id"]}\n Category: ${row["Category"]}\n Keyword: ${row["Keyword"]}\n Identity: ${row["Identity"]}\n JP Keyword: ${row["JP Keyword"]}\n Appendix: ${row["Appendix"]}\n Order Detail URL: ${row["Order Detail URL"]}\n Est. Profit: ${row["Est. Prfoit"]}`,
              )
              .join("\n");

            await thread.send({ content });
            await sleep(1000);
          }
          await sleep(2000);
        } catch (error: any) {
          if (error.code === 50013) {
            console.error(
              `Missing permissions to create thread in ${channelName}`,
            );
          } else {
            console.error(
              `Failed to create thread in ${channelName} for identity ${identity} and deadline ${firstRow.Deadline}:`,
              error,
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in messageCreate handler:", error);
  }
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const startBot = (): void => {
  client.login(config.DISCORD_TOKEN);
};
