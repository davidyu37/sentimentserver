const express = require("express");
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const path = require("path");
const PORT = process.env.PORT || 3000;
const app = express();

const { setupSentimentModel, getSentimentScore } = require('./lib/sentiment-analysis')

app
  .use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .get("/", (req, res) => res.render("index"))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

app.post("/sentiment", jsonParser,  async (req, res) => {
  const { text } = req.body

  if(!text) return res.status(404)

  try {
    await setupSentimentModel()
    const result = await getSentimentScore(text)
    
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Something broke!');
  }

});
