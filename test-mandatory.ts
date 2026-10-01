import { extractKeywordsLocal } from './src/services/localKeywordExtraction';

const lyrics = `The coming of age
Pretends you are looking back on
As you turn the page
So many years all bygone
The moments in limelight
Are just like a wink of an eye
Deceiving your clear sight
Is it illusion we glorify?
A flashback in time
Is giving a seraphic smile`;

async function test() {
  const result = await extractKeywordsLocal(lyrics, { language: 'en', maxKeywords: 30 });
  console.log(`Found ${result.keywords.length} keywords:`);
  result.keywords.forEach((k, i) => console.log(`  ${i+1}. ${k.term} (${k.type}) score=${k.score.toFixed(4)}`));
  
  console.log('\nMandatory expressions check:');
  const mandatory = [
    'coming of age',
    'spur of the moment',
    'skin deep',
    'wink of an eye',
    'looking back'
  ];
  mandatory.forEach(exp => {
    const found = result.keywords.some(k => k.term.includes(exp) || exp.includes(k.term));
    console.log(`  ${found ? '✅' : '❌'} ${exp}`);
  });
}

test().catch(console.error);
