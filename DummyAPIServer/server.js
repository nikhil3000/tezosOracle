// import { express } from 'express'; 
// import { bodyParser } from 'body-parser';
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const getDummyData = () => {
  const list = [];
  for (let i = 247804; i < 247818; i++)
    list.push({ cycle: Math.floor(i / 2048), height: i });
  return list;
};

const dummyData = getDummyData();
let counter = 0;

app.get('/testData', (req, res) => {
    console.log(`sending data to client ${JSON.stringify(dummyData[counter])}`);
    res.send(dummyData[counter++]);
});

app.listen(5000, () => {
    console.log('server running at port 5000');
});