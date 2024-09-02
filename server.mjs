import telegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import kinopoisk from "@api/kinopoiskdev";
import { connect, Schema, model } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const bot = new telegramBot(process.env.BOT_API_KEY, { polling: true });
//подключение к бд
await connect(process.env.DATA_BASE_URL);

// создание схемы бд
const movieSchema = new Schema({
  movieId: Number,
  name: String,
  premiere: Date,
  isNotificated: Boolean,
  chatId: Number,
});

const Movie = model("MovieInformations", movieSchema);

kinopoisk.auth(process.env.KINOPOISK_API_KEY);

//срабатывает каждые два часа с 8:00 до 23:00
cron.schedule("0 8-23/2 * * *", async () => {
  // ищет фильмы у которых дата премьеры через три дня
  const today = new Date();
  today.setDate(today.getDate() + 3);
  today.setHours(3, 0, 0, 0);

  console.log("Я сработал", new Date());

  let moviePremieres = await Movie.find({
    isNotificated: false,
    premiere: { $lte: today },
  }).exec();

  // отправляет уведомления по найденным фильмам
  moviePremieres.forEach(async (movie) => {
    bot.sendMessage(
      movie.chatId,
      `Премьера ${
        movie.name
      } уже ${movie.premiere.toLocaleDateString()}, не забудьте купить билеты и попкорн`
    );
    movie.isNotificated = true;
    await movie.save();
  });
});

// по команде /all выводит список фильмов, по которым еще не было уведомления
bot.onText(/\/all/, async (msg) => {
  let allMoviePremieres = await Movie.find({
    isNotificated: false,
  }).exec();

  const messageAllMoviePremieres = allMoviePremieres
    .toSorted((a, b) => a.premiere - b.premiere)
    .map((m) => `${m.name} выйдет ${m.premiere.toLocaleDateString()}`)
    .join(",\n\n");

  bot.sendMessage(msg.chat.id, messageAllMoviePremieres);
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text.startsWith("/")) return;

  // достает из ссылки id фильма
  let inputLink = msg.text.split("/");
  let inputMovieId = inputLink[inputLink.length - 2];

  if (isNaN(inputMovieId)) {
    bot.sendMessage(chatId, "Некорректный ID");
    return;
  }

  // ищет возможные копии фильма
  const copyMovie = await Movie.findOne({
    movieId: inputMovieId,
  }).exec();

  if (copyMovie) {
    bot.sendMessage(chatId, "Данный фильм уже есть в бд");
    return;
  }

  //делает запрос на кинопоиск с введенным id фильма
  let moviePremieres = null;

  try {
    moviePremieres = await kinopoisk.movieController_findOneV1_4({
      id: inputMovieId,
    });
  } catch (err) {
    console.log(err.data.message);
    const errorMessage = `Упс, ошибочки. ${err.data.message}`;
    bot.sendMessage(chatId, errorMessage);
    return;
  }

  //возможные варианты даты премьеры
  const premiereDate =
    moviePremieres.data.premiere.russia ??
    moviePremieres.data.premiere.world ??
    moviePremieres.data.premiere.digital;

  const formatPremiereDate = premiereDate ? new Date(premiereDate) : null;

  if (formatPremiereDate) {
    if (formatPremiereDate < new Date()) {
      bot.sendMessage(chatId, `${moviePremieres.data.name} уже вышел в прокат`);
      return;
    }
  } else {
    bot.sendMessage(chatId, "Дата премьеры неизвестна, приходите позже");
    return;
  }

  // создание записи в бд
  await Movie.create({
    movieId: Number(inputMovieId),
    name: moviePremieres.data.name,
    premiere: premiereDate,
    isNotificated: false,
    chatId: chatId,
  });

  const message = `${
    moviePremieres.data.name
  } выйдет в России ${formatPremiereDate.toLocaleDateString()}. За три дня до премьеры вам придет уведомление`;

  bot.sendMessage(chatId, message);
});
