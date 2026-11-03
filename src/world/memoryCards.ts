export const MEMORY_PAIR_COUNT = 10;
export const MEMORY_CARD_COUNT = MEMORY_PAIR_COUNT * 2;
export const MEMORY_ERROR_LIMIT = 3;
export const MEMORY_SECONDS = 10;

export type MemoryCharacter = {
  id: string;
  texture: string;
  introducedBefore: boolean;
};

export type MemoryCard = MemoryCharacter & { instanceId: number };

export const MEMORY_CHARACTERS: readonly MemoryCharacter[] = [
  { id: 'heroine', texture: 'memory-heroine', introducedBefore: true },
  { id: 'peppermint', texture: 'memory-peppermint', introducedBefore: true },
  { id: 'croustille', texture: 'memory-croustille', introducedBefore: true },
  { id: 'truffinou', texture: 'memory-truffinou', introducedBefore: true },
  { id: 'mango', texture: 'mango-fruit', introducedBefore: true },
  { id: 'pineapple', texture: 'pineapple-fruit', introducedBefore: true },
  { id: 'fairy', texture: 'memory-fairy', introducedBefore: false },
  { id: 'lollipop-princess', texture: 'memory-lollipop-princess', introducedBefore: false },
  { id: 'ogre', texture: 'memory-ogre', introducedBefore: false },
  { id: 'turtle', texture: 'memory-turtle', introducedBefore: false },
];

export function createMemoryDeck(random: () => number = Math.random): MemoryCard[] {
  const deck = MEMORY_CHARACTERS.flatMap(character => [
    { ...character, instanceId: 0 },
    { ...character, instanceId: 1 },
  ]);
  for (let index = deck.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [deck[index], deck[target]] = [deck[target], deck[index]];
  }
  return deck;
}
