import type { DemoCard } from '../types/landing-demo';

export const LANDING_DEMO_DECK_NAME = 'Inglés Básico';

export const LANDING_DEMO_DECKS: Record<string, DemoCard[]> = {
  es: [
    { id: 'demo-01', term: 'Piece of cake', definition: 'cosita de niños', cycle: 1 },
    { id: 'demo-02', term: 'My bad', definition: 'fue mi culpa', cycle: 1 },
    { id: 'demo-03', term: "Let's call it a day", definition: 'terminemos por hoy', cycle: 1 },
    { id: 'demo-04', term: 'Under the weather', definition: 'medio enfermo', cycle: 2 },
    { id: 'demo-05', term: 'Hit the sack', definition: 'ir a dormir', cycle: 2 },
    { id: 'demo-06', term: "It's a deal", definition: 'trato hecho', cycle: 2 },
    { id: 'demo-07', term: 'No brainer', definition: 'no hay ni que pensarlo', cycle: 3 },
    { id: 'demo-08', term: 'Cut to the chase', definition: 'anda al grano', cycle: 3 },
    { id: 'demo-09', term: 'Long time no see', definition: 'cuánto tiempo sin verte', cycle: 3 },
    { id: 'demo-10', term: 'Beat around the bush', definition: 'ir por las ramas', cycle: 4 },
    { id: 'demo-11', term: "What's the catch?", definition: 'cuál es la trampa', cycle: 4 },
    { id: 'demo-12', term: 'Break a leg', definition: 'mucha suerte', cycle: 4 },
  ],
  en: [
    { id: 'demo-01', term: 'Piece of cake', definition: 'very easy', cycle: 1 },
    { id: 'demo-02', term: 'My bad', definition: 'my mistake', cycle: 1 },
    { id: 'demo-03', term: "Let's call it a day", definition: 'finish for today', cycle: 1 },
    { id: 'demo-04', term: 'Under the weather', definition: 'feeling sick', cycle: 2 },
    { id: 'demo-05', term: 'Hit the sack', definition: 'go to sleep', cycle: 2 },
    { id: 'demo-06', term: "It's a deal", definition: 'agreed', cycle: 2 },
    { id: 'demo-07', term: 'No brainer', definition: 'easy decision', cycle: 3 },
    { id: 'demo-08', term: 'Cut to the chase', definition: 'get to the point', cycle: 3 },
    { id: 'demo-09', term: 'Long time no see', definition: 'haven’t seen you in a while', cycle: 3 },
    { id: 'demo-10', term: 'Beat around the bush', definition: 'avoid the topic', cycle: 4 },
    { id: 'demo-11', term: "What's the catch?", definition: 'hidden problem', cycle: 4 },
    { id: 'demo-12', term: 'Break a leg', definition: 'good luck', cycle: 4 },
  ],
  pt: [
    { id: 'demo-01', term: 'Piece of cake', definition: 'moleza', cycle: 1 },
    { id: 'demo-02', term: 'My bad', definition: 'foi mal', cycle: 1 },
    { id: 'demo-03', term: "Let's call it a day", definition: 'vamos encerrar por hoje', cycle: 1 },
    { id: 'demo-04', term: 'Under the weather', definition: 'meio doente', cycle: 2 },
    { id: 'demo-05', term: 'Hit the sack', definition: 'ir dormir', cycle: 2 },
    { id: 'demo-06', term: "It's a deal", definition: 'fechado', cycle: 2 },
    { id: 'demo-07', term: 'No brainer', definition: 'sem dúvida', cycle: 3 },
    { id: 'demo-08', term: 'Cut to the chase', definition: 'ir direto ao ponto', cycle: 3 },
    { id: 'demo-09', term: 'Long time no see', definition: 'quanto tempo não te vejo', cycle: 3 },
    { id: 'demo-10', term: 'Beat around the bush', definition: 'fazer rodeios', cycle: 4 },
    { id: 'demo-11', term: "What's the catch?", definition: 'qual é a pegadinha', cycle: 4 },
    { id: 'demo-12', term: 'Break a leg', definition: 'boa sorte', cycle: 4 },
  ],
  fr: [
    { id: 'demo-01', term: 'Piece of cake', definition: "un jeu d'enfant", cycle: 1 },
    { id: 'demo-02', term: 'My bad', definition: "c'est ma faute", cycle: 1 },
    { id: 'demo-03', term: "Let's call it a day", definition: "on s'arrête là", cycle: 1 },
    { id: 'demo-04', term: 'Under the weather', definition: 'pas dans son assiette', cycle: 2 },
    { id: 'demo-05', term: 'Hit the sack', definition: 'aller au lit', cycle: 2 },
    { id: 'demo-06', term: "It's a deal", definition: 'marché conclu', cycle: 2 },
    { id: 'demo-07', term: 'No brainer', definition: 'évidence', cycle: 3 },
    { id: 'demo-08', term: 'Cut to the chase', definition: 'aller droit au but', cycle: 3 },
    { id: 'demo-09', term: 'Long time no see', definition: 'ça fait un bail', cycle: 3 },
    { id: 'demo-10', term: 'Beat around the bush', definition: 'tourner autour du pot', cycle: 4 },
    { id: 'demo-11', term: "What's the catch?", definition: "où est le piège", cycle: 4 },
    { id: 'demo-12', term: 'Break a leg', definition: 'bonne chance', cycle: 4 },
  ],
  de: [
    { id: 'demo-01', term: 'Piece of cake', definition: 'ein Kinderspiel', cycle: 1 },
    { id: 'demo-02', term: 'My bad', definition: 'mein Fehler', cycle: 1 },
    { id: 'demo-03', term: "Let's call it a day", definition: 'Feierabend machen', cycle: 1 },
    { id: 'demo-04', term: 'Under the weather', definition: 'angeschlagen', cycle: 2 },
    { id: 'demo-05', term: 'Hit the sack', definition: 'ins Bett gehen', cycle: 2 },
    { id: 'demo-06', term: "It's a deal", definition: 'abgemacht', cycle: 2 },
    { id: 'demo-07', term: 'No brainer', definition: 'keine Frage', cycle: 3 },
    { id: 'demo-08', term: 'Cut to the chase', definition: 'zur Sache kommen', cycle: 3 },
    { id: 'demo-09', term: 'Long time no see', definition: 'lange nicht gesehen', cycle: 3 },
    { id: 'demo-10', term: 'Beat around the bush', definition: 'um den heißen Brei herumreden', cycle: 4 },
    { id: 'demo-11', term: "What's the catch?", definition: 'wo ist der Haken', cycle: 4 },
    { id: 'demo-12', term: 'Break a leg', definition: 'viel Glück', cycle: 4 },
  ],
  zh: [
    { id: 'demo-01', term: 'Piece of cake', definition: '小菜一碟', cycle: 1 },
    { id: 'demo-02', term: 'My bad', definition: '我的错', cycle: 1 },
    { id: 'demo-03', term: "Let's call it a day", definition: '今天就到这里', cycle: 1 },
    { id: 'demo-04', term: 'Under the weather', definition: '身体不舒服', cycle: 2 },
    { id: 'demo-05', term: 'Hit the sack', definition: '去睡觉', cycle: 2 },
    { id: 'demo-06', term: "It's a deal", definition: '一言为定', cycle: 2 },
    { id: 'demo-07', term: 'No brainer', definition: '毫不犹豫', cycle: 3 },
    { id: 'demo-08', term: 'Cut to the chase', definition: '开门见山', cycle: 3 },
    { id: 'demo-09', term: 'Long time no see', definition: '好久不见', cycle: 3 },
    { id: 'demo-10', term: 'Beat around the bush', definition: '拐弯抹角', cycle: 4 },
    { id: 'demo-11', term: "What's the catch?", definition: '有什么蹊跷', cycle: 4 },
    { id: 'demo-12', term: 'Break a leg', definition: '祝好运', cycle: 4 },
  ],
};

export const LANDING_DEMO_DECK: DemoCard[] = LANDING_DEMO_DECKS.es;

export function getLandingDemoDeck(lang?: string): DemoCard[] {
  const normalized = (lang || 'es').split('-')[0].toLowerCase();
  return LANDING_DEMO_DECKS[normalized] || LANDING_DEMO_DECKS.es;
}
