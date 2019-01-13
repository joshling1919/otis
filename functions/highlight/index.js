import { promisify } from 'util';

const mongoose = require('mongoose');
const AWS = require('aws-sdk');

const lambda = new AWS.Lambda({
  region: 'us-west-2',
});

const invoke = promisify(lambda.invoke.bind(lambda));

const { MONGO } = process.env;

const { Schema } = mongoose;

const messagesSchema = new Schema({
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
const Message = mongoose.model('Message', messagesSchema);

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

const highlight = async () => {
  const query = {
    'favorited_by.9': { $exists: true },
    num_times_seen: null,
  };
  const favMessages = await Message.find(query);

  if (favMessages.length > 0) {
    const randomInd = Math.floor(Math.random() * favMessages.length);
    const highlightedMessage = favMessages[randomInd];
    const highlightedId = highlightedMessage.toJSON().identification;
    const ids = [];
    for (let i = highlightedId - 5; i < highlightedId + 6; i += 1) {
      ids.push(i);
    }
    const wholeConvo = await Message.find({ identification: { $in: ids } });
    await Message.updateMany({ identification: { $in: ids } }, { $inc: { num_times_seen: 1 } });
    return wholeConvo;
  }
  return [];
};

module.exports.handler = async (event, context, callback) => {
  await mongoose.connect(
    MONGO,
    { useNewUrlParser: true },
  );

  const convo = await highlight();
  if (convo.length > 0) {
    const orderedConvo = convo.sort((a, b) => a.created_at - b.created_at);
    await Queue.remove({});
    await Queue.insertMany(orderedConvo);
    await invoke({
      FunctionName: 'otis-serverless-dev-send',
      Payload: JSON.stringify({
        test: true,
      }),
    });
  }
  mongoose.disconnect();
  return callback(null, { statusCode: 200, body: 'messages queued' });
};
