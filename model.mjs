import { Schema, model } from "mongoose";

const movieSchema = new Schema({
  movieId: Number,
  name: String,
  premiere: Date,
  isNotificated: Boolean,
  chatId: Number,
});

export const Movie = model("MovieInformations", movieSchema);
