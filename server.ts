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

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
let bot: TelegramBot | null = null;

if (telegramToken) {
  // Use polling for simplicity in dev/cloud run, unless we strictly want webhooks
  bot = new TelegramBot(telegramToken, { polling: true });

  // Handle callback queries (Approve/Reject)
  bot.on("callback_query", async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;

    if (!data || !supabase) return;

    if (data.startsWith("approve_")) {
      const userId = data.split("_")[1];
      await supabase
        .from("users")
        .update({ status: "approved" })
        .eq("id", userId);
      bot?.sendMessage(message!.chat.id, `User ${userId} Approved â`);
      bot?.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: message!.chat.id, message_id: message!.message_id },
      );
    } else if (data.startsWith("reject_")) {
      const userId = data.split("_")[1];
      await supabase
        .from("users")
        .update({ status: "rejected" })
        .eq("id", userId);
      bot?.sendMessage(message!.chat.id, `User ${userId} Rejected â`);
      bot?.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: message!.chat.id, message_id: message!.message_id },
      );
    }
  });

  bot.onText(/\/bracket/, async (msg) => {
    bot?.sendMessage(
      msg.chat.id,
      "Bracket editing feature coming soon. Please open the admin web UI.",
    );
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
        folder: string,
      ): Promise<string> => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
              if (result) resolve(result.secure_url);
              else reject(error);
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
          "fc_registration/photos",
        );
      }
      if (files["paymentProof"] && files["paymentProof"][0]) {
        paymentProofUrl = await uploadStream(
          files["paymentProof"][0].buffer,
          "fc_registration/payments",
        );
      }

      // 2. Insert into Supabase
      const { data: user, error } = await supabase
        .from("users")
        .insert([
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
        throw error;
      }

      // 3. Notify Telegram Admin
      if (bot && adminChatId) {
        const tgMsg = `New Registration:\nName: ${name}\nAge: ${age}\nMobile: ${mobile}\nFC Name: ${fcName}\nOVR: ${fcOvr}\nExp: ${fcExperience}`;
        const opts = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Approve â", callback_data: `approve_${uid}` },
                { text: "Reject â", callback_data: `reject_${uid}` },
              ],
            ],
          },
        };

        // Sending with photos is slightly more complex, we send text first, then photos
        await bot.sendMessage(adminChatId, tgMsg, opts);
        if (photoUrl)
          await bot.sendPhoto(adminChatId, photoUrl, {
            caption: "Personal Photo",
          });
        if (paymentProofUrl)
          await bot.sendPhoto(adminChatId, paymentProofUrl, {
            caption: "Payment Proof",
          });
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
        const uploadStream = (fileBuffer: Buffer): Promise<string> => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "fc_registration/results" },
              (error, result) => {
                if (result) resolve(result.secure_url);
                else reject(error);
              },
            );
            stream.end(fileBuffer);
          });
        };
        screenshotUrl = await uploadStream(file.buffer);
      }

      // Insert result
      const { error } = await supabase.from("matches").insert([
        {
          player_id: uid,
          opponent_id: opponentId,
          score_1: score1,
          score_2: score2,
          screenshot_url: screenshotUrl,
          status: "pending_verification",
        },
      ]);

      if (error) throw error;

      // Notify Telegram Admin
      if (bot && adminChatId) {
        await bot.sendMessage(
          adminChatId,
          `New Match Result Uploaded by ${uid}:\nScore: ${score1} - ${score2}\nOpponent: ${opponentId}`,
        );
        if (screenshotUrl) {
          await bot.sendPhoto(adminChatId, screenshotUrl);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
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
