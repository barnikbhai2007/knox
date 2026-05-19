import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import TelegramBot from "node-telegram-bot-api";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Use the token that is relevant based on where the callback came from
const registrationBotToken = process.env.TELEGRAM_REGISTRATION_BOT_TOKEN;
const registrationBot = registrationBotToken ? new TelegramBot(registrationBotToken, { polling: false }) : null;

const resultsBotToken = process.env.TELEGRAM_RESULTS_BOT_TOKEN;
const resultsBot = resultsBotToken ? new TelegramBot(resultsBotToken, { polling: false }) : null;


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  
  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    const update = req.body;
    
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;
      const message = callbackQuery.message;
      const chatId = message?.chat?.id;
      const messageId = message?.message_id;
      
      // Attempt to answer callback query first to stop loading state on telegram
      // Try with registration bot first
      try {
        if (registrationBot) await registrationBot.answerCallbackQuery(callbackQuery.id);
      } catch (e) {
        if (resultsBot) await resultsBot.answerCallbackQuery(callbackQuery.id).catch(console.error);
      }

      if (data.startsWith("approve_")) {
        const uid = data.split("_")[1];
        await supabase
          .from("users")
          .update({ status: "approved" })
          .eq("id", uid);
          
        if (registrationBot && chatId && messageId) {
          await registrationBot.sendMessage(chatId, `User ${uid} Approved ✅`);
          await registrationBot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: messageId }
          );
        }
      } else if (data.startsWith("reject_")) {
        const uid = data.split("_")[1];
        await supabase
          .from("users")
          .update({ status: "rejected" })
          .eq("id", uid);
          
        if (registrationBot && chatId && messageId) {
          await registrationBot.sendMessage(chatId, `User ${uid} Rejected ❌`);
          await registrationBot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: messageId }
          );
        }
      } else if (data.startsWith("verify_")) {
        const matchId = data.split("_")[1];
        await supabase
          .from("matches")
          .update({ status: "verified" })
          .eq("id", matchId);
          
        if (resultsBot && chatId && messageId) {
          await resultsBot.sendMessage(chatId, `Match ${matchId} Verified ✅`);
          await resultsBot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: messageId }
          );
        }
      } else if (data.startsWith("reject_match_")) {
        const matchId = data.split("_")[2];
        await supabase
          .from("matches")
          .update({ status: "rejected" })
          .eq("id", matchId);
          
        if (resultsBot && chatId && messageId) {
          await resultsBot.sendMessage(chatId, `Match ${matchId} Rejected ❌`);
          await resultsBot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: messageId }
          );
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
}
