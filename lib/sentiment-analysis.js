const tf = require("@tensorflow/tfjs-node");
const axios = require("axios");

const urls = {
  model:
    "https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json",
  metadata:
    "https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/metadata.json",
};

const PAD_INDEX = 0;
const OOV_INDEX = 2;

const SentimentThreshold = {
  Positive: 0.66,
  Neutral: 0.33,
  Negative: 0,
};

async function loadModel(url) {
  try {
    const model = await tf.loadLayersModel(url);
    return model;
  } catch (err) {
    console.log(err);
  }
}

async function loadMetadata(url) {
  try {
    const { data } = await axios(url);
    return data;
  } catch (err) {
    console.log(err);
  }
}

function padSequences(
  sequences,
  maxLen,
  padding = "pre",
  truncating = "pre",
  value = PAD_INDEX
) {
  return sequences.map((seq) => {
    if (seq.length > maxLen) {
      if (truncating === "pre") {
        seq.splice(0, seq.length - maxLen);
      } else {
        seq.splice(maxLen, seq.length - maxLen);
      }
    }

    if (seq.length < maxLen) {
      const pad = [];
      for (let i = 0; i < maxLen - seq.length; ++i) {
        pad.push(value);
      }
      if (padding === "pre") {
        seq = pad.concat(seq);
      } else {
        seq = seq.concat(pad);
      }
    }

    return seq;
  }).filter((seq) => {
    if(seq < 0) {
      return false
    }
    if(isNaN(seq)) {
      return false
    }
    return true
  })
}

async function setupSentimentModel() {
  if (typeof model === "undefined") {
    model = await loadModel(urls.model);
  }
  if (typeof metadata === "undefined") {
    metadata = await loadMetadata(urls.metadata);
  }
}

function getSentimentScore(text) {
  const inputText = text
    .trim()
    .toLowerCase()
    .replace(/(\.|\,|\!)/g, "")
    .split(" ");

  console.log({inputText})
  // Convert the words to a sequence of word indices.
  const sequence = inputText.map((word) => {
    let wordIndex = metadata.word_index[word] + metadata.index_from;
    if (wordIndex > metadata.vocabulary_size) {
      wordIndex = OOV_INDEX;
    }
    return wordIndex;
  });

  console.log({sequence})
  // Perform truncation and padding.
  const paddedSequence = padSequences([sequence], metadata.max_len);
  const input = tf.tensor2d(paddedSequence, [1, metadata.max_len]);

  const predictOut = model.predict(input);
  const sentiment_score = predictOut.dataSync()[0];
  predictOut.dispose();

  if (sentiment_score > SentimentThreshold.Positive) {
    tweet_sentiment = "positive";
  } else if (sentiment_score > SentimentThreshold.Neutral) {
    tweet_sentiment = "neutral";
  } else if (sentiment_score >= SentimentThreshold.Negative) {
    tweet_sentiment = "negative";
  }

  const result = {
    sentiment: tweet_sentiment,
    score: sentiment_score.toFixed(4),
    text,
  };

  return result;
}

module.exports.setupSentimentModel = setupSentimentModel;
module.exports.getSentimentScore = getSentimentScore;
