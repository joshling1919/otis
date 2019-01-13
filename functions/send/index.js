const mongoose = require('mongoose');
const axios = require('axios');

const { BETCHU_BOT, PROD_GROUP } = process.env;

const { MONGO } = process.env;

const { Schema } = mongoose;

const queueSchema = new Schema({
  attachments: Array,
  avatar_url: String,
  created_at: Number,
  favorited_by: Array,
  group_id: Number,
  id: Number,
  name: String,
  sender_id: String,
  sender_type: String,
  source_guid: String,
  system: Boolean,
  text: String,
  user_id: String,
  num_times_seen: Number,
});
const Queue = mongoose.model('Queue', queueSchema);

const postConvos = async (convo, i, bot) => {
  if (i >= convo.length) {
    return null;
  }
  const message = convo[i];
  const {
    text, name, attachments, favorited_by,
  } = message;
  const bod = {
    bot_id: bot,
    text: `(${favorited_by.length} likes) ${name}`,
  };
  if (text) {
    bod.text = `(${favorited_by.length} likes) ${name}: ${text}`;
  }
  if (attachments.length > 0) {
    bod.attachments = attachments;
  }
  setTimeout(() => {
    axios.post('https://api.groupme.com/v3/bots/post', bod).then((res) => {
      console.log('message sent!');
      postConvos(convo, i + 1, bot);
    });
  }, 1000);
};

const postFromQueue = async (bot) => {
  const queued = await Queue.find({});
  const convoDate = new Date(queued[0].created_at * 1000);
  const body = {
    bot_id: bot,
    text: `Happy #TBT! Check out this convo from ${convoDate.toLocaleDateString('en-US')}:`,
  };
  await axios.post('https://api.groupme.com/v3/bots/post', body);
  await postConvos(queued.sort((a, b) => a.created_at - b.created_at), 0, bot);
  return queued;
};

module.exports.handler = async (event) => {
  await mongoose.connect(
    MONGO,
    { useNewUrlParser: true },
  );
  const { test } = event;
  if (test) {
    await postFromQueue(BETCHU_BOT);
  } else {
    await postFromQueue(PROD_GROUP);
  }
};
