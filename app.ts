import { Bot, Context, session, SessionFlavor } from "grammy";
import { Menu, MenuRange } from "@grammyjs/menu";

import { getSOLBalanceAndUSD, getSwapTransactionData } from "./src/lib";
import { BOT_TOKEN } from "./src/constants";

import { validateTransactionSignature } from "./src/utils";

/** This is how the actions look that this bot is managing */
interface Action {
  readonly id: string;
  readonly name: string;
}

interface SessionData {
  actionID: string;
}
type MyContext = Context & SessionFlavor<SessionData>;

/**
 * All known actions. Users can click them to parse swap tx or get wallet balance.
 */
const actions: Action[] = [
  { id: "parseTX", name: "Parse Swap Tx" },
  { id: "getBalance", name: "Get Wallet Balance" },
];

const bot = new Bot<MyContext>(BOT_TOKEN);

bot.use(
  session({
    initial(): SessionData {
      return { actionID: "" };
    },
  })
);

// Create a dynamic menu that lists all actions,
// one button each
const mainText = "What do you want to do?";
const mainMenu = new Menu<MyContext>("action");
mainMenu.dynamic(() => {
  const range = new MenuRange<MyContext>();
  for (const action of actions) {
    range.submenu(
      { text: action.name, payload: action.id }, // label and payload
      "next", // navigation target menu
      (ctx) => {
        ctx.session.actionID = action.id;
        ctx.editMessageText(handleActionPrompt(action.id), {
          parse_mode: "HTML",
        });
      }
    );
  }
  return range;
});

function handleActionPrompt(actionId: string): string {
  const prompts: Record<string, string> = {
    parseTX: "Please input the transaction signature.",
    getBalance: "Please input the wallet address.",
  };

  const message = prompts[actionId];
  return message;
}

const nextMenu = new Menu<MyContext>("next");
nextMenu.dynamic((ctx) => {
  const next = ctx.match;
  if (typeof next !== "string") throw new Error("No action chosen!");
  return createNextMenu(next);
});

function createNextMenu(next: string) {
  return new MenuRange<MyContext>().back({ text: "Back", payload: next });
}

mainMenu.register(nextMenu);

bot.use(mainMenu);

bot.command("start", (ctx) => ctx.reply(mainText, { reply_markup: mainMenu }));
bot.command("help", async (ctx) => {
  const text = "Send /start to see and select actions.";
  await ctx.reply(text);
});

bot.api.setMyCommands([
  { command: "start", description: "start to chat with bot" },
  { command: "help", description: "help for you to use this more correctly" },
]);

bot.on("message", async (ctx) => {
  if (ctx.session.actionID == "parseTX") {
    const signature = ctx.message.text as string;
    if (!validateTransactionSignature(signature)) {
      ctx.reply("Invalid transaction signature");
    } else {
      try {
        const parsedJson = await getSwapTransactionData(signature);
        ctx.reply(JSON.stringify(parsedJson));
      } catch (e) {
        console.error(e);
        ctx.reply(JSON.stringify(e));
      }
    }
  } else if (ctx.session.actionID == "getBalance") {
    const walletBalance = await getSOLBalanceAndUSD(ctx.message.text as string);
    ctx.reply(walletBalance);
  }
});

bot.catch(console.error.bind(console));
bot.start();
