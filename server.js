const { MongoClient } = require('mongodb');
const wrap = require('express-async-wrap');
const random = require('randomstring');
const MongoErrors = require('mongo-errors');
const url = require('url');
const app = require('express')();

const env = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost/shorten',
  EXPIRE_SECONDS: Number.parseInt(process.env.EXPIRE_SECONDS || '3600'), // 1 hour by default,
  PREFIX: process.env.PREFIX || '',
  PORT: process.env.PORT || '3000',
  CODE_SIZE: Number.parseInt(process.env.CODE_SIZE || '5')
};


const generateOptions = {
  length: env.CODE_SIZE,
  charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:?#[]@!$&'()*+,;=."
};
function generate() {
  return random.generate(generateOptions);
}

async function shortenUrl(urlsCollection, longUrl) {
  if (!url.parse(longUrl).protocol) {
    longUrl = `http://${longUrl}`
  }

  try {
    const { value } = await urlsCollection.findOneAndUpdate(
      { longUrl },
      {
        $setOnInsert: { longUrl, _id: generate() },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, returnOriginal: false }
    );

    console.log('generate', value);

    return { short: value._id, long: value.longUrl };
  } catch (err) {
    if (err.code === MongoErrors.DuplicateKey) {
      return shortenUrl(urlsCollection, longUrl);
    } else {
      throw err;
    }
  }
}

async function expandUrl(urlsCollection, key) {
  const { value } = await urlsCollection.findOneAndUpdate(
    { _id: key },
    { $set: { updatedAt: new Date() } }
  );

  console.log('redirect', value);

  return value ? { short: value._id, long: value.longUrl } : null;
}

const handleShortenRequest = urlsCollection => async ({ originalUrl, headers }, res) => {
  const longUrl = originalUrl.replace('/generate/', '');
  const { short } = await shortenUrl(urlsCollection, longUrl);

  res.send(`${env.PREFIX}${headers.host}/${short}`);
};

const handleRedirectRequest = urlsCollection => async ({ originalUrl }, res) => {
  const key = originalUrl.replace('/', '');
  const shortened = await expandUrl(urlsCollection, key);
  if (shortened) {
    res.redirect(307, shortened.long);
  } else {
    res.status(404).json({ code: 404, message: 'Not Found' });
  }
};

(async () => {
  const db = await MongoClient.connect(env.MONGODB_URI);
  const urls = await db.collection('urls');
  await urls.createIndex({ updatedAt: 1 }, { expireAfterSeconds: env.EXPIRE_SECONDS });
  await urls.createIndex({ short: 1 });

  app.get('/generate/*', wrap(handleShortenRequest(urls)));
  app.get('*', wrap(handleRedirectRequest(urls)));

  app.use(wrap(async (err, req, res, next) => {
    res.status(500).send(err);
  }));

  app.listen(env.PORT, () => console.log(`Listening on port ${env.PORT}`));
})();
