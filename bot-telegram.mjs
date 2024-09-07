import telegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

export const bot = new telegramBot(process.env.BOT_API_KEY, { polling: true });
