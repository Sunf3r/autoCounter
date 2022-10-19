console.clear();
import { BOT, CHANNEL, EMOJIS, OWNER, PREFIX, TOKENS } from "./settings.json"
import { Client, Emoji, Member, Message } from 'eris';

const clients: Client[] = [];
let spinnies,
    clockWarns = 0,
    lastClientIndex = 0,
    timeout: NodeJS.Timeout,
    currentMessage: Message<any>,
    isBoosting: number;

boot(); // Login into users client

async function boot() {
    await generateSpinners();

    for (let i in TOKENS) {
        spinnies.add(`client${i}`, { text: `Connecting client ${i}` });

        const client = new Client(TOKENS[i], {
            intents: 34305,
            getAllUsers: false, // for reduce users cache
            maxShards: 1 // for reconnect automatically
        });
        await client.connect();

        while (client.shards.get(0).status !== 'ready') await sleep(0.5); // 500ms

        clients.push(client);
        spinnies.succeed(`client${i}`, { text: `Client ${client.user.username} connected.` });
    }
    console.log(`- ${clients.length} clients ready!`)

    clients[0]
        .on('messageReactionAdd', async (msg: Message<any>, emoji: Emoji, reactor: Member) => {
            if (reactor.id !== BOT || !EMOJIS.includes(emoji.name)) return;
            if (msg.channel.id !== CHANNEL || !msg.content || isBoosting) return;

            await verifyAuthor();
            clients[lastClientIndex].sendChannelTyping(CHANNEL);

            //@ts-ignore because NodeJS does not have the correct type of timeouts
            if (timeout?._destroyed === false) return;

            timeout = setTimeout(async () => {
                await verifyAuthor();
                clients[lastClientIndex].createMessage(CHANNEL, (await getNumber(currentMessage, emoji)).toString());
                clearTimeout(timeout);
            }, 5_000);
        })
        // .on('messageCreate', async (msg: Message<any>) => {
        //     if (msg.channel.id !== CHANNEL || !msg.content || msg.author.id !== OWNER) return;

        //     const args: any[] = msg.content.replace(PREFIX, '').trim().split(' '), // separates the content in a Array
        //         commandName = args.shift().toLowerCase();

        //     if (commandName !== 'boost') return;

        //     await verifyAuthor();
        //     for (let num: number = args[0]; num <= args[0] + 10; num++) {
        //         lastClientIndex = lastClientIndex === clients.length - 1 ? 0 : lastClientIndex + 1;
        //         await clients[lastClientIndex].createMessage(CHANNEL, (num).toString());
        //     }
        // })
}

async function verifyAuthor() {
    const client = clients.find(c => c.shards.get(0).status === 'ready');
    currentMessage = (await client.getMessages(CHANNEL, { limit: 10 }))
        .filter(async (m) => !isNaN(await getNumber(m)))[0];

    if (clients[lastClientIndex].user.id === currentMessage.author.id)
        lastClientIndex = lastClientIndex === clients.length - 1 ? 0 : lastClientIndex + 1
}

async function getNumber(msg: Message<any>, emoji?: Emoji) {
    let num = parseInt(msg.content.trim().split(' ')[0]);

    if (!emoji) return num;

    switch (emoji.name) {
        case '❌':
            await sleep(10); // 10s

            return 1;
        case '⏰':
            if (clockWarns >= 2) {
                clockWarns = 0;
                await sleep(3_600); // 1h
            } else clockWarns++;

            return num;
        default:
            return num + 1;
    }
}

async function sleep(timeout: number) {
    return await new Promise((res) => setTimeout(() => res(true), timeout * 1_000));
}

async function generateSpinners() {
    //@ts-ignore NodeJS bug lol
    const spinner = (await import('spinnies')).default;
    spinnies = new spinner({
        spinner: {
            interval: 80,
            frames: [
                "🌑 ",
                "🌒 ",
                "🌓 ",
                "🌔 ",
                "🌕 ",
                "🌖 ",
                "🌗 ",
                "🌘 "
            ]
        }
    });
}
