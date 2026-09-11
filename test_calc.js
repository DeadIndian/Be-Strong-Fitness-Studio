import { HALL } from './lib/gym/route.mjs';

const END = HALL.runway + 2;
const LENGTH = HALL.span + END * 2;
const MID = HALL.x0 + HALL.span / 2;
const BACK = -5.4;
const FRONT = 4.2;
const CEIL = 3.6;

console.log({
  x0: HALL.x0,
  span: HALL.span,
  runway: HALL.runway,
  stations: HALL.stations,
  END, LENGTH, MID
});

const paneWidth = LENGTH - 6;
const paneStartX = MID - paneWidth / 2;
const paneEndX = MID + paneWidth / 2;
console.log({paneWidth, paneStartX, paneEndX});

for (let bay = 0; bay <= HALL.stations * 2; bay += 1) {
    const x = HALL.x0 - END + 3 + ((LENGTH - 6) * bay) / (HALL.stations * 2);
    console.log(`bay ${bay}: x = ${x}`);
}
