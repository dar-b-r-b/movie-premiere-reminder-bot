import { Movie } from "./model.mjs";
import { bot } from "./bot-telegram.mjs";

export async function notifyAboutPremieres() {
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
}

export async function setPremiereDate() {
  const moviesWithoutPremiere = await Movie.find({
    premiere: null,
  }).exec();
  moviesWithoutPremiere.forEach(async (movie) => {
    let movieInformation = null;
    try {
      movieInformation = await kinopoisk.movieController_findOneV1_4({
        id: movie.movieId,
      });
    } catch (err) {
      const errorMessage = `Упс, ошибочки. ${err.data.message}`;
      bot.sendMessage(chatId, errorMessage);
      return;
    }
    const premiereDate =
      movieInformation.data.premiere.russia ??
      movieInformation.data.premiere.world ??
      movieInformation.data.premiere.digital;

    const formatPremiereDate = premiereDate ? new Date(premiereDate) : null;

    if (!formatPremiereDate) {
      return;
    }

    movie.premiere = premiereDate;
    await movie.save();

    const message = `${
      moviePremieres.data.name
    } выйдет в России ${formatPremiereDate.toLocaleDateString()}. За три дня до премьеры вам придет уведомление`;
    bot.sendMessage(chatId, message);
  });
}
