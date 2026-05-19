import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import TelegramBot from "node-telegram-bot-api";

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const resultsBotToken = process.env.TELEGRAM_RESULTS_BOT_TOKEN;
const resultsChatId = process.env.TELEGRAM_RESULTS_CHAT_ID;
const resultsBot = resultsBotToken ? new TelegramBot(resultsBotToken, { polling: false }) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured yet." });
  }

  try {
    const form = formidable({ multiples: true, keepExtensions: true });
    const [fields, files] = await form.parse(req);

    const uid = Array.isArray(fields.uid) ? fields.uid[0] : (fields.uid as string);
    const score1 = Array.isArray(fields.score1) ? fields.score1[0] : (fields.score1 as string);
    const score2 = Array.isArray(fields.score2) ? fields.score2[0] : (fields.score2 as string);
    const opponentId = Array.isArray(fields.opponentId) ? fields.opponentId[0] : (fields.opponentId as string);

    const screenshot1 = Array.isArray(files.screenshot1) ? files.screenshot1[0] : files.screenshot1;
    const screenshot2 = Array.isArray(files.screenshot2) ? files.screenshot2[0] : files.screenshot2;

    // Insert result
    const { data: insertedMatch, error } = await supabase.from("matches").insert([
      {
        player_id: uid,
        opponent_id: opponentId,
        score_1: score1,
        score_2: score2,
        screenshot_url: "",
        status: "pending_verification",
      },
    ]).select().single();

    if (error) throw new Error(`Database error: ${error.message}`);

    // Notify Telegram Admin
    try {
      if (resultsBot && resultsChatId) {
        await resultsBot.sendMessage(
          resultsChatId,
          `New Match Result Uploaded by ${uid}:\nScore: ${score1} - ${score2}\nOpponent: ${opponentId}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Verify ✅", callback_data: `verify_${insertedMatch.id}` },
                  { text: "Reject ❌", callback_data: `reject_match_${insertedMatch.id}` },
                ],
              ],
            },
          }
        );
        if (screenshot1) {
          const stream = fs.createReadStream(screenshot1.filepath);
          await resultsBot.sendPhoto(resultsChatId, stream, { caption: "Leg 1 Screenshot" });
        }
        if (screenshot2) {
          const stream = fs.createReadStream(screenshot2.filepath);
          await resultsBot.sendPhoto(resultsChatId, stream, { caption: "Leg 2 Screenshot" });
        }
      }
    } catch (tgError) {
      console.error("Telegram notification error:", tgError);
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
