import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const registrationBotToken = process.env.TELEGRAM_REGISTRATION_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
const registrationBot = registrationBotToken ? new TelegramBot(registrationBotToken, { polling: false }) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured yet. Please configure environment variables." });
  }

  try {
    const form = formidable({ multiples: true, keepExtensions: true });
    const [fields, files] = await form.parse(req);

    const name = Array.isArray(fields.name) ? fields.name[0] : (fields.name as string);
    const age = Array.isArray(fields.age) ? fields.age[0] : (fields.age as string);
    const mobile = Array.isArray(fields.mobile) ? fields.mobile[0] : (fields.mobile as string);
    const fcName = Array.isArray(fields.fcName) ? fields.fcName[0] : (fields.fcName as string);
    const fcUid = Array.isArray(fields.fcUid) ? fields.fcUid[0] : (fields.fcUid as string);
    const fcOvr = Array.isArray(fields.fcOvr) ? fields.fcOvr[0] : (fields.fcOvr as string);
    const fcExperience = Array.isArray(fields.fcExperience) ? fields.fcExperience[0] : (fields.fcExperience as string);
    const uid = Array.isArray(fields.uid) ? fields.uid[0] : (fields.uid as string);
    const email = Array.isArray(fields.email) ? fields.email[0] : (fields.email as string);

    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    const paymentProofFile = Array.isArray(files.paymentProof) ? files.paymentProof[0] : files.paymentProof;

    // Insert into Supabase
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
          photo_url: "",
          payment_proof_url: "",
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Notify Telegram Admin
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

        await registrationBot.sendMessage(adminChatId, tgMsg, opts);

        if (photoFile) {
          const stream = fs.createReadStream(photoFile.filepath);
          await registrationBot.sendPhoto(adminChatId, stream, { caption: "Personal Photo" });
        }
        if (paymentProofFile) {
          const stream = fs.createReadStream(paymentProofFile.filepath);
          await registrationBot.sendPhoto(adminChatId, stream, { caption: "Payment Proof" });
        }
      }
    } catch (tgError) {
      console.error("Telegram notification error:", tgError);
    }

    return res.json({ success: true, user });
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
}
