import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Configuration ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Bot 1 - Registration
const registrationBotToken = process.env.TELEGRAM_REGISTRATION_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
const registrationBot = registrationBotToken
  ? new TelegramBot(registrationBotToken, { polling: true })
  : null;

// Bot 2 - Results
const resultsBotToken = process.env.TELEGRAM_RESULTS_BOT_TOKEN;
const resultsChatId = process.env.TELEGRAM_RESULTS_CHAT_ID;
const resultsBot = resultsBotToken
  ? new TelegramBot(resultsBotToken, { polling: true })
  : null;

if (registrationBot) {
  registrationBot.on("callback_query", async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;

    if (!data || !supabase || !message) return;

    if (data.startsWith("approve_")) {
      const userId = data.split("_")[1];
      await supabase
        .from("users")
        .update({ status: "approved" })
        .eq("id", userId);
      registrationBot.sendMessage(
        message.chat.id,
        `User ${userId} Approved ✅`,
      );
      registrationBot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: message.chat.id, message_id: message.message_id },
      );
    } else if (data.startsWith("reject_")) {
      const userId = data.split("_")[1];
      await supabase
        .from("users")
        .update({ status: "rejected" })
        .eq("id", userId);
      registrationBot.sendMessage(
        message.chat.id,
        `User ${userId} Rejected ❌`,
      );
      registrationBot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: message.chat.id, message_id: message.message_id },
      );
    }
  });

  registrationBot.onText(/\/players/, async (msg) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("users")
      .select("name, fc_name, fc_ovr");
    const reply =
      data && data.length > 0
        ? data.map((u: any) => `${u.name} (${u.fc_name} - ${u.fc_ovr})`).join("\n")
        : "No players found.";
    registrationBot.sendMessage(msg.chat.id, "Registered Players:\n" + reply);
  });

  registrationBot.onText(/\/bracket/, async (msg) => {
    registrationBot.sendMessage(
      msg.chat.id,
      "Bracket feature is fully supported in the admin web UI.",
    );
  });

  registrationBot.onText(/\/edit_name (.+)/, async (msg, match) => {
    if (!supabase || !match) return;
    const args = match[1].trim().split(" ");
    if (args.length < 2) {
      registrationBot.sendMessage(msg.chat.id, "Usage: /edit_name [id] [name]");
      return;
    }
    const userId = args[0];
    const newName = args.slice(1).join(" ");
    await supabase.from("users").update({ name: newName }).eq("id", userId);
    registrationBot.sendMessage(
      msg.chat.id,
      `Updated user ${userId} name to ${newName}.`,
    );
  });

  registrationBot.onText(/\/edit_score (.+)/, async (msg, match) => {
    if (!supabase || !match) return;
    const args = match[1].trim().split(" ");
    if (args.length !== 3) {
      registrationBot.sendMessage(
        msg.chat.id,
        "Usage: /edit_score [match_id] [s1] [s2]",
      );
      return;
    }
    const [matchId, s1, s2] = args;
    await supabase
      .from("matches")
      .update({ score_1: s1, score_2: s2 })
      .eq("id", matchId);
    registrationBot.sendMessage(
      msg.chat.id,
      `Updated match ${matchId} score to ${s1} - ${s2}.`,
    );
  });
}

if (resultsBot) {
  resultsBot.on("callback_query", async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;

    if (!data || !supabase || !message) return;

    if (data.startsWith("verify_")) {
      const matchId = data.split("_")[1];
      await supabase
        .from("matches")
        .update({ status: "verified" })
        .eq("id", matchId);
      resultsBot.sendMessage(message.chat.id, `Match ${matchId} Verified ✅`);
      resultsBot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: message.chat.id, message_id: message.message_id },
      );
    } else if (data.startsWith("reject_match_")) {
      const matchId = data.split("_")[2];
      await supabase
        .from("matches")
        .update({ status: "rejected" })
        .eq("id", matchId);
      resultsBot.sendMessage(message.chat.id, `Match ${matchId} Rejected ❌`);
      resultsBot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: message.chat.id, message_id: message.message_id },
      );
    }
  });

  resultsBot.onText(/\/pending/, async (msg) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "pending_verification");
    const reply =
      data && data.length > 0
        ? data
            .map(
              (m: any) =>
                `Match ${m.id}: User ${m.player_id} VS ${m.opponent_id} (${m.score_1}-${m.score_2})`,
            )
            .join("\n")
        : "No pending matches.";
    resultsBot.sendMessage(msg.chat.id, "Pending Matches:\n" + reply);
  });
}

// --- Multer setup for memory storage ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- API Routes ---
app.post(
  "/api/register",
  upload.fields([{ name: "photo" }, { name: "paymentProof" }]),
  async (req, res) => {
    try {
      const {
        name,
        age,
        mobile,
        fcName,
        fcUid,
        fcOvr,
        fcExperience,
        uid,
        email,
      } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!supabase) {
        return res
          .status(500)
          .json({
            error:
              "Supabase is not configured yet. Please configure environment variables.",
          });
      }

      // 1. Upload files to Cloudinary
      const uploadStream = (
        fileBuffer: Buffer,
        mimetype: string,
        folder: string,
      ): Promise<string> => {
        if (!process.env.CLOUDINARY_API_KEY) {
          // Do not use huge base64 strings as they crash Supabase and Telegram!
          return Promise.resolve("");
        }
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
              if (result) resolve(result.secure_url);
              else reject(new Error(error?.message || "Cloudinary error"));
            },
          );
          stream.end(fileBuffer);
        });
      };

      let photoUrl = "";
      let paymentProofUrl = "";

      if (files["photo"] && files["photo"][0]) {
        photoUrl = await uploadStream(
          files["photo"][0].buffer,
          files["photo"][0].mimetype,
          "fc_registration/photos",
        );
      }
      if (files["paymentProof"] && files["paymentProof"][0]) {
        paymentProofUrl = await uploadStream(
          files["paymentProof"][0].buffer,
          files["paymentProof"][0].mimetype,
          "fc_registration/payments",
        );
      }

      // 2. Insert into Supabase
      const { data: user, error } = await supabase
        .from("users")
        .upsert([
          {
            id: uid,
            email,
            name,
            age,
            mobile,
            fc_name: fcName,
            fc_uid: fcUid,
            fc_ovr: fcOvr,
            fc_experience: fcExperience,
            photo_url: photoUrl,
            payment_proof_url: paymentProofUrl,
            status: "pending", // pending approval
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error", error);
        throw new Error(`Database error: ${error.message}`);
      }

      // 3. Notify Telegram Admin
      try {
        if (registrationBot && adminChatId) {
          const tgMsg = `New Registration:\nName: ${name}\nAge: ${age}\nMobile: ${mobile}\nFC Name: ${fcName}\nOVR: ${fcOvr}\nExp: ${fcExperience}`;
          const opts = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Approve ✅", callback_data: `approve_${uid}` },
                  { text: "Reject ❌", callback_data: `reject_${uid}` },
                ],
              ],
            },
          };

          // Sending with photos is slightly more complex, we send text first, then photos
          await registrationBot.sendMessage(adminChatId, tgMsg, opts);
          if (files["photo"] && files["photo"][0]) {
            await registrationBot.sendPhoto(adminChatId, files["photo"][0].buffer, {
              caption: "Personal Photo",
            });
          }
          if (files["paymentProof"] && files["paymentProof"][0]) {
            await registrationBot.sendPhoto(adminChatId, files["paymentProof"][0].buffer, {
              caption: "Payment Proof",
            });
          }
        }
      } catch (tgError) {
        console.error("Telegram notification error:", tgError);
      }

      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  },
);

app.post(
  "/api/results",
  upload.single("resultScreenshot"),
  async (req, res) => {
    try {
      const { uid, score1, score2, opponentId } = req.body;
      const file = req.file;

      if (!supabase) {
        return res
          .status(500)
          .json({ error: "Supabase is not configured yet." });
      }

      let screenshotUrl = "";
      if (file) {
        const uploadStream = (fileBuffer: Buffer, mimetype: string): Promise<string> => {
          if (!process.env.CLOUDINARY_API_KEY) {
            return Promise.resolve(""); // Do not embed large base64 strings
          }
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "fc_registration/results" },
              (error, result) => {
                if (result) resolve(result.secure_url);
                else reject(new Error(error?.message || "Cloudinary error"));
              },
            );
            stream.end(fileBuffer);
          });
        };
        screenshotUrl = await uploadStream(file.buffer, file.mimetype);
      }

      // Insert result
      const { data: insertedMatch, error } = await supabase.from("matches").insert([
        {
          player_id: uid,
          opponent_id: opponentId,
          score_1: score1,
          score_2: score2,
          screenshot_url: screenshotUrl,
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
          if (file) {
            await resultsBot.sendPhoto(resultsChatId, file.buffer);
          }
        }
      } catch (tgError) {
        console.error("Telegram notification error:", tgError);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

app.post(
  "/api/upload-image",
  upload.single("image"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No image uploaded" });

      if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

      // Upload to telegra.ph (anonymous image host)
      const FormData = require("form-data");
      const form = new FormData();
      form.append("file", file.buffer, file.originalname);

      const response = await axios.post("https://telegra.ph/upload", form, {
        headers: form.getHeaders(),
      });
      const result = response.data;

      if (!result || !result[0] || !result[0].src) {
         throw new Error("Failed to upload image");
      }

      const imageUrl = "https://telegra.ph" + result[0].src;

      res.json({ success: true, url: imageUrl });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
