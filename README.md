# Hex Map Editor

Try it out! https://andrewdm90.github.io/hexmap/

You can get .svg icons from https://thenounproject.com to add to your hex map. I grabbed a bunch from here when I was testing things out: https://skyrim.fandom.com/wiki/Category:Map_icons

Runs client-side via HTML / CSS / JS. Made as an experiment in 'vibe coding', and because I wanted a basic little map editor for my games (With notes functionality!).

The controls are pretty straight forward. I would recommend not playing with the orientation / shape once you've set the size of hex map you want. It won't lose any data if you do, but it will mis-align must stuff aside from hex colouring and look weird. If you chnage the settings back everythnig will be back in the right place however.

== FEATURES ==

COLOURING: Change a hex to whatever colour you want, representing the terrain type. This uses the built-in colour pciker for your browser / OS.

ICONS: Import .svg format icons and stamp them onto your hexmap. Location is not bound to a hex, you can put them whereever you want, even between hexes if you want.

DRAWING: A 'pen tool' that lets you draw stuff onto your hexmap, again you can draw across or inbetween hexes if you want. Great for drawing rivers and roads etc.

TEXT: Add text to your hexmap, whereever you want it.

HEX NOTES: You can add notes to the hexes by clicking a hex number, which will come up with a small window for you to type in, then save. When a hex has a saved note, a small notebook emoji (📓) will appear next to the hex number. Good for keeping track of the names, history or facts about locations.

SAVING / LOADING: Saving and loading functionality is built in as well and appears to work very well. Imported icons are also saved along with the rest of the map data. I can't guarantee compatibility with an old save file if the site is updated, though I can't think of any more features I want to add that would break compatability at the moment.

== WIP / Bugs ==

There is currently no map / notes export function, but I (I.e. the AI) will probably add that in at some point down the line. Until then you can screenshot the map and print it if need be.

Warning: The 'Shapes' are buggy AF and don't really work expect in certain numbers of columns / rows.
