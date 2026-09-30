import { splitIntoSentences } from './src/services/localKeywordExtraction';

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

console.log('Input text:');
console.log(JSON.stringify(testText));
console.log('\nSplit result:');
const result = splitIntoSentences(testText);
console.log('Count:', result.length);
result.forEach((s, i) => console.log(`  ${i}: "${s}"`));
console.log('\nLength:', testText.length);
