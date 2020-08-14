const express = require('express');
const path = require('path');
const request = require('request');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cheerio = require('cheerio');
const dotenv = require('dotenv');


const PORT = process.env.PORT || 5000;
dotenv.config();

const app = express();
app.use(morgan());
app.use(bodyParser.json());
const { API_KEY } = process.env;

const getDate = (date) => {
  if (!date) {
    return null;
  }

  const datetime = new Date(date.split('|')[0]);
  const ampm = datetime.getHours() >= 12 ? 'PM' : 'AM';
  const weeks = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saterday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const hour = ampm === 'AM' ? datetime.getHours() : datetime.getHours() - 12;
  const month = months[datetime.getMonth()+1];
  const week = weeks[datetime.getDay()];

  return `${week}, ${datetime.getDate()} ${month}, ${hour}:${datetime.getMinutes()} ${ampm}`;
};

// creating JSON for matches
const getParsedResponse = (html) => {
  const $ = cheerio.load(html);
  const matches = [];
  const allMatches = $('a');

  for (let index = 0, len = allMatches.length; index < len; index++) {
    const anchor = $(allMatches[index]);

    anchor.find('*').removeAttr('style', '');
    const date = anchor.find('.cb-text-preview').attr('ng-bind');
    const url = anchor.attr('href');

    matches.push({
      live: anchor.find('.cb-text-live').length > 0,
      title: url.split('/').pop().split('-').join(' '),
      url,
      content: anchor.html(),
      toBeStartedAt: getDate(date)
    });
  }

  return matches;
};

/**
 * Live Match APIs
 */
app.get('/api/matches', function (req, res) {
  request('http://www.cricbuzz.com/api/html/homepage-scag', (err, resp, body) => {
    if (err) {
      console.log('Something went wrong: ', err);
      res.status(500).send({ error: 'Something went wrong' });
    }
    const output = getParsedResponse(body);

    console.log('output generated');
    res.json(output);
  });
});

/**
 * Match news
 */
app.get('/api/news', function(req, res) {
  request(`http://newsapi.org/v2/top-headlines?country=in&category=sports&apiKey=${API_KEY}`, (err, resp) => {
    if (err) {
      res.status(500).send({ error: 'Something went wrong' });
    }

    res.json(resp);
  });
});

/**
 * API health check
 */
app.get('/_health', (req, res) => {
  res.status(200).send('ok')
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
