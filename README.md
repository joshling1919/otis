# Otis

## Motivation

There were 2 key motivations to this project:

1. Several of my college friends and I have been messaging in various Groupme
   group chats for over 5 years. During that time, we've sent thousands of
   messages, and for nostalgia's sake, I wanted to build a service that finds
   some of the most "liked" messages from the past years and highlight them to
   the group on a weekly basis.
1. The company I work at, App Academy, recently transitioned from a Ruby on
   Rails backend to a Serverless/AWS Lamda backend, so I wanted to further
   explore this framework and learn how to set it up from scratch.

## Functionality

This app uses 2 key functions on a weekly basis:

### `highlight`

This function queries the mongo database that holds all of the chat messages and
finds a random one that has 10 or more "likes". It then also queries for the 5
messages that preceded it and the 5 messages that followed it:

```js
const highlight = async () => {
  const query = {
    'favorited_by.9': { $exists: true },
    num_times_seen: null
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
    await Message.updateMany(
      { identification: { $in: ids } },
      { $inc: { num_times_seen: 1 } }
    );
    return wholeConvo;
  }
  return [];
};
```

It then stores those 11 messages in a `queues` collection

### `send`

Right after the 11 messages are queued, the `send` function is invoked to send
them to a dummy Groupme account where the admin can choose whether or not to
display those past messages.

If the admin chooses to not send them, then the 11 messages will simply sit in
the queue until the next week until a newly highlighted set of messages are
enqueued.

The `send` function handles the logic of whether to send the messages to the
dummy admin account or to the actual Groupme chat group that has all of the live
users.
