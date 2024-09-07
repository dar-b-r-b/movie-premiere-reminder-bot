import cron from "node-cron";
import kinopoisk from "@api/kinopoiskdev";
import { connect } from "mongoose";
import dotenv from "dotenv";

import { bot } from "./bot-telegram.mjs";
import { notifyAboutPremieres, setPremiereDate } from "./cron.mjs";
import { getAllPremieres, onMessageHandler } from "./chatManager.mjs";

dotenv.config();

await connect(process.env.DATA_BASE_URL);
kinopoisk.auth(process.env.KINOPOISK_API_KEY);

//срабатывает каждые два часа с 8:00 до 23:00/0 8-23/2
cron.schedule("0 8-23/2 * * *", notifyAboutPremieres);
cron.schedule("0 12 * * *", setPremiereDate);

// по команде /all выводит список фильмов, по которым еще не было уведомления
bot.onText(/\/all/, getAllPremieres);

bot.on("message", onMessageHandler);
