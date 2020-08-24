const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const cors = require('cors');

const PORT = process.env.PORT || 5000;
dotenv.config();

const app = express();
app.use(cors());
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
  try {
    const $ = cheerio.load(html);
    const matches = [];
    const allMatches = $('a');

    console.log('INSIDE SUCCESSS: ', allMatches.length);

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
  } catch(err) {
    console.log('Error in parsing response: ', err);
    return [];
  }
};

/**
 * Live Match APIs
 */
app.get('/api/matches', async(req, res) => {
  try {
    const body = await axios.get('http://www.cricbuzz.com/api/html/homepage-scag', {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
    console.log('Response:: ', body.data);
    const output = getParsedResponse(body.data);

    console.log('output generated');
    res.json(output);
  } catch(err) {
    console.log('Something went wrong: ', err);
    res.status(500).send({ error: 'Something went wrong' });
  }
});

/**
 * Match news
 */
app.get('/api/news', async(req, res) => {
  try {
    const resp = await axios.get(`http://newsapi.org/v2/top-headlines?country=in&category=sports&apiKey=${API_KEY}`);
    res.json(resp.data);
  } catch (err) {
    res.status(500).send({ error: 'Something went wrong' });
  }
});

/**
 * API health check
 */
app.get('/_health', (req, res) => {
  res.status(200).send('ok')
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
