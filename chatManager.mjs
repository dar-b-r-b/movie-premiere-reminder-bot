import { Movie } from "./model.mjs";
import { bot } from "./bot-telegram.mjs";
import kinopoisk from "@api/kinopoiskdev";

export async function getAllPremieres(msg) {
  let allMoviePremieres = await Movie.find({
    isNotificated: false,
  }).exec();

  const messageAllMoviePremieres = allMoviePremieres
    .toSorted((a, b) => a.premiere - b.premiere)
    .map((m) => `${m.name} выйдет ${m.premiere.toLocaleDateString()}`)
    .join(",\n\n");

  bot.sendMessage(msg.chat.id, messageAllMoviePremieres);
}

export async function onMessageHandler(msg) {
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
  }

  // создание записи в бд
  await Movie.create({
    movieId: Number(inputMovieId),
    name: moviePremieres.data.name,
    premiere: premiereDate,
    isNotificated: false,
    chatId: chatId,
  });

  const message = formatPremiereDate
    ? `${
        moviePremieres.data.name
      } выйдет в России ${formatPremiereDate.toLocaleDateString()}. За три дня до премьеры вам придет уведомление`
    : `Дата премьеры пока хз, когда будет известна, вам придет уведомление`;

  bot.sendMessage(chatId, message);
}
