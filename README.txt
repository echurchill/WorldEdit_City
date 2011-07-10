/***** BUILD.JS v1.0
* City block generator CraftScript for WorldEdit
* (parts of this is based on WorldEdit's sample Maze generator)
* Copyright (C) 2011 echurch <http://www.virtualchurchill.com>
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program. If not, see <http://www.gnu.org/licenses/>.

*****************************************
* Command line options
/Build.js [..city block option..] [HELP] [RANDOM] [FIRSTTIME]
  Build again on this spot using the location's natural random seed, this can be overridden
  Each city block built uses a random seed based on it's XYZ location

>>city block options..
HIGHRISE    - buildings are as large as possible, buildings tend to be narrower
MIDRISE*    - buildings are about 2/3 as tall as possible
LOWRISE     - buildings are about 1/3 as tall as possible 
TOWN        - buildings are about 1/4 as tall as possible, parks can be larger
PARK        - city block size park
FARM        - farm with up to four different crops
FARMHOUSE   - like a farm but a house instead of one of the crops
HOUSES      - four cute little houses with fenced yards
DIRTLOT     - city block size dirt lot
PARKINGLOT  - parking structure
JUSTSTREETS - city block size hole in the ground
            - last city block option specified wins!
            - * = MIDRISE is used if nothing else is specified

>>other options..
HELP        - shows the command line options
RANDOM      - build using a true random seed instead of one based on location
FIRSTTIME   - overrides the rift protection and allows for creation of city blocks anywhere

*****************************************
* Comments
The first time you use this script you will need to specify FIRSTTIME. From then on,
as long as you are standing within a cross road, you can simply run the script to 
generate a new city block (or regenerate an existing block). 

The goodness isn't just above ground, make sure to explore any manholes or bricked
up door's you find. Becareful though, those bricks are there for a reason sometimes.

*****************************************
* Issues
If you get a timeout error when running this script, open "plugins/worldedit/config.yml" and change "timeout" value (should be under "Scripting") to 10000 or larger
I would warn people when timeout is too small, alas context.configuration does not seem to work anymore
I would love to figure out the height of the tallest legal block allowed by Minecraft given the player's location, for now I assume it's around 127

*****************************************
* Potential Upcoming Improvements
Buried chest at the city block origin that allow for designing of city blocks (and random seed storage)
Bottom stairs, with no basement, should be backfilled a bit.. right?
Gazebos (single level buildings that have columns)
WATERTOWER centered in a park
Fancy fountians (multiple founts, rounder and/or scale up in larger parks)
Two story and/or L shaped houses

*****************************************
* Ponder
How do I warn folks if their timeout is too short?
Interior room generator? 
Ponds and canals (with bridges)
Preposition lightstone or torches in buildings?
Government buildings with columns
Reduce the width/depth of building floors as they go up (empire state building style)
Improved slanted roofs (using steps) with overhangs
http://en.wikipedia.org/wiki/Fountain_Place
http://skyscraperpage.com
http://skyscraperpage.com/cities/?buildingID=229 (Prism)
http://skyscraperpage.com/cities/?buildingID=1601 (Pyramid)

*****************************************
* Fixed
Added FIRSTTIME argument to allow kicking off a new city
Tightened up the origin street crossing validation to prevent rifts
Pilings should be under the entire city block
Mushrooms in the plumbing are no longer floating! Woot! ...well for the most part
Place buildings on stilts (pylons) if there isn't a basement
0, 1 or 2 basement levels
2 level basement should replace parts (or all of the plumbing)
Parking structures with basements but no upper floors have goofed up center lines
Entrances to parking structures are goofed up
Plumbing is now a bit taller and more complicated
Bugs related to taller sewers (parking basement for example)
Look to the NW (or SW or SE or NE) and that is where things get created
Reworked the origin logic, now you just need to stand where streets come together
"Round" out the upper corners in the sewers
Moved the origin spot again, now on the light gray crosswalk strip nearest to the manhole
Add bricked up doors in the sewers, empty ones in the case where there is nothing in "cell"
Made the sewer a bit taller 
Touchup the parking ramp creation to fix the ceiling indent on the last step
In smaller parks, have one big tree instead of a fountian
Above ground parking garage
Paint lines in the parking lot
Redid the park manhole and endcaps for fences
Moved and improved the manholes to sewer, cisturn and plumbing
Move the build point to the point just in front of the streetlamp, beside the manhole
Cleaned up some of the random usage
House now have attics (access to them is left to the player)
Buildings on stilts (lots of columns around a core at first and then a normal city building on top)
Center stairwells in buildings
Building with rounded corners... sorta still feels like it needs more work... hummm
HIGHRISE - buildings as tall as can be, no parks
MIDRISE - 2/3 as tall as can be, optional single 1x park
LOWRISE - 1/3 as tall as can be, optional single 1x park
TOWN - 1/4 as tall as can be, plus optional single 2x park
HOUSES builds a two by two neighborhood of houses
FARMHOUSE now builds a farm with a single house
RANDOM overrides the consistent random city blocks and produces really random city blocks
Now builds the exact same city block when you rebuilt at the same location (stand on the manhole)
Farms with wheat, suger cane, cactus, rose, dandelion, trees, pumpkins and empty plots
No random buildings in buildings
Trees in parks!
Fixed the spelling of JUSTSTEETS
Optimized transcription a bit (around 10% faster, on average) by getting before setting
Refactored the building/park resize and placement logic
Rework the building material logics (more colored cloth, less fire proof)
Doors for the buildings
Regular (and existing random) windows in buildings
Add street lines
Door and ladder fixup logic working
Place manholes for plumbing
Ladders down to reservoirs and sewers
Renamed emptylot to dirtlot
Placed manholes in parks
Arg options for emptylots, parks, parkinglots, streetsonly, towns (short) and cities (tall)
Add some lights to the reservoirs
Remove all doors and ladders for now, not really a fix more of an avoiding
Wooden floors with accent only in building's walls
Parks with cisturns (underground water reservoirs) http://en.wikipedia.org/wiki/Cistern
Skylights on roofs, well some of them anyway
Support 3x3, 3x2, 2x3, 3x1, 1x3, 2x2, 2x1 and 1x2 buildings
Pyramid, needle or tented roofs for buildings
Simple park with fountain
Stairwells in basement 
Add guardrails to stairs
Thicker streets (allows for roadlines and manholes)
Need to lower the ratio of gold/diamonds in the sewer and plumbing levels
Get rid of the "make a region first" requirement
Sewer treasure encroaches onto the plumbing level
Need to narrow the sidewalks 
Add sandstone accent for wood structures 
Stairs (down into the basement, up to roof when doable) 
Streetlights 
Manholes w/ladders down to the sewer (be the "focal" point)

*****************************************
* Answered
How do I increase the duration of script execution? - plugins/worldedit/config.yml

*****************************************
* Left to player(s)
Instead of basements, single level parking garages under 2x2 or larger buildings
Plumbing level isn't bounded at the city edge 
Air bridges between buildings? 
Should replace outer most sidewalk with grass 
*/
