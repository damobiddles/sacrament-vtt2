// Notes about loot that ONLY THE GM may read. They live here, on the server, and not in site/sheet/gear.js, because that file is sent to every browser.
// The GM sees a note when they roll the item on the loot table; it is put in the private notes of the card they make from it, and never sent to a player.
// The key is the item's id in gear.js.
export const LOOT_NOTES = {
  sealshard: 'GM: someone, somewhere, is missing this.',
};
