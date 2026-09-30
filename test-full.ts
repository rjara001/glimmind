import { extractKeywordsLocal } from './src/services/localKeywordExtraction';

const testText = `The coming of age
Pretends you are looking back on
The coming of age
On the spur of the moment
Beauty is only skin deep
Wink of an eye
Flashback to yesterday
Bygone days
Limelight fades
Seraphic glow
Glorify the moment
Prime of life
Lore of the land
Elder wisdom`;

async function test() {
  const result = await extractKeywordsLocal(testText, { language: 'en', maxKeywords: 30 });
  console.log(`Found ${result.keywords.length} keywords:`);
  result.keywords.forEach((k, i) => console.log(`  ${i+1}. ${k.term} (${k.type}) score=${k.score.toFixed(4)}`));
}

test().catch(console.error);
