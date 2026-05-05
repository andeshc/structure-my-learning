const { randomBytes } = require('crypto');

function makeId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

module.exports = {
  userId: () => makeId('usr'),
  guideId: () => makeId('gde'),
  topicId: () => makeId('top'),
  tokenId: () => makeId('tok'),
  oauthId: () => makeId('oau'),
};
