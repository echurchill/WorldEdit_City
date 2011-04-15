// $Id$
/*
* City generator CraftScript for WorldEdit
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

* Issues (search for !BUG!)
If you get a timeout error when running this script, open "plugins/worldedit/config.yml" and change "timeout" value (should be under "Scripting") to 10000 or larger
Need to figure out the height of the tallest legal block allowed by Minecraft given the player's location

* Potential Upcoming Improvements
Neighborhoods (4 lots to a square, houses with fenced backyards, driveway, garages
Farms (tilled and planted gardens with irrigation systems, possibly underground?)
Ponds and canals (with bridges)
Parking garages under 2x2 or larger buildings
Government buildings with columns
Stilted buildings (lots of columns around a core at first and then a normal city building on top)
Reduce the width/depth of building floors as they go up (empire state building style)
Improved slanted roofs (using steps) with overhangs
Fancy fountians (multiple founts, rounder and scale up in larger parks)

* Ponder
Interior room generator? 
Is there a way to speed up the transcription pass?

* Fixed
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
Parks with underground water reservoirs 
Skylights on roofs
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
Stairs (down into the basement, up to roof) 
Streetlights 
Manholes w/ladders down to the sewer (be the "focal" point)

* Answered
How do I increase the duration of script execution? - plugins/worldedit/config.yml
Should there be support for smaller blocks 2x2 instead of 3x3? - NO

* Left to player(s)
Plumbing level isn't bounded at the city edge 
Air bridges between buildings? 
Should replace outer most sidewalk with grass 
*/

importPackage(Packages.java.io);
importPackage(Packages.java.awt);
importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.blocks);
importPackage(Packages.com.sk89q.worldedit.regions);
importPackage(Packages.com.sk89q.worldedit.util);

// for future reference
var editsess = context.remember();
var session = context.getSession();
var origin = player.getBlockIn();
var rand = new java.util.Random();

// some pseudo-constants
var squareBlocks = 15;
var linesOffset = Math.floor(squareBlocks / 2);
var plumbingHeight = 4;
var sewerHeight = 3;
var streetHeight = 2;
var floorHeight = 4;
var roofHeight = 1; // extra bit for roof fluff like railings

// derived pseudo-constants
var belowGround = plumbingHeight + sewerHeight + streetHeight - 1;
var cornerBlocks = squareBlocks / 3;
var sewerFloor = plumbingHeight;
var sewerCeiling = sewerFloor + sewerHeight - 1;
var streetLevel = sewerCeiling + streetHeight - 1;

// how tall are things?
var cityFloorCount = 10;
var townFloorCount = 3;

// what do you want to create
var helpString = "[HELP | CITY | TOWN | PARK | DIRTLOT | PARKINGLOT | JUSTSTEETS]"
context.checkArgs(0, -1, helpString);
var modeCreate;
var createMode = { "city": 0, "town": 1, "park": 2, "dirtlot": 3, "parkinglot": 4, "juststreets": 5, "help": -1 };
var modeArg = argv.length > 1 ? argv[1] : "CITY";

// look for longest params first
if (/PARKINGLOT/i.test(modeArg))
    modeCreate = createMode.parkinglot
else if (/JUSTSTEETS/i.test(modeArg))
    modeCreate = createMode.juststreets;
else if (/DIRTLOT/i.test(modeArg))
    modeCreate = createMode.dirtlot
else if (/CITY/i.test(modeArg))
    modeCreate = createMode.city
else if (/TOWN/i.test(modeArg))
    modeCreate = createMode.town
else if (/PARK/i.test(modeArg))
    modeCreate = createMode.park

// all else fails let's show some help
else
    modeCreate = createMode.Help;

// show help
if (modeCreate == createMode.Help)
    context.print("Usage: " + argv[0] + " " + helpString);

// otherwise let's do something!
else {

    // how big is everything?
    var floorCount = modeCreate == createMode.city ? cityFloorCount : townFloorCount; // short or tall
    var squaresWidth = 5;
    var squaresLength = 5;

    // extended BlockID types
    var ExtendedID = {
        "NORTHWARD_LADDER": EncodeBlock(BlockID.LADDER, 4),
        "EASTWARD_LADDER": EncodeBlock(BlockID.LADDER, 2),
        "SOUTHWARD_LADDER": EncodeBlock(BlockID.LADDER, 5),
        "WESTWARD_LADDER": EncodeBlock(BlockID.LADDER, 3),

        "NORTHFACING_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 0),
        "EASTFACING_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 1),
        "SOUTHFACING_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 2),
        "WESTFACING_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 3),

        "NORTHFACING_REVERSED_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 3 + 4),
        "EASTFACING_REVERSED_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 0 + 4),
        "SOUTHFACING_REVERSED_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 1 + 4),
        "WESTFACING_REVERSED_WOODEN_DOOR": EncodeBlock(BlockID.WOODEN_DOOR, 2 + 4),

        "WHITE_CLOTH": EncodeBlock(BlockID.CLOTH, 0),
        "ORANGE_CLOTH": EncodeBlock(BlockID.CLOTH, 1),
        "MAGENTA_CLOTH": EncodeBlock(BlockID.CLOTH, 2),
        "LIGHT_BLUE_CLOTH": EncodeBlock(BlockID.CLOTH, 3),
        "YELLOW_CLOTH": EncodeBlock(BlockID.CLOTH, 4),
        "LIGHT_GREEN_CLOTH": EncodeBlock(BlockID.CLOTH, 5),
        "PINK_CLOTH": EncodeBlock(BlockID.CLOTH, 6),
        "GRAY_CLOTH": EncodeBlock(BlockID.CLOTH, 7),
        "LIGHT_GRAY_CLOTH": EncodeBlock(BlockID.CLOTH, 8),
        "CYAN_CLOTH": EncodeBlock(BlockID.CLOTH, 9),
        "PURPLE_CLOTH": EncodeBlock(BlockID.CLOTH, 10),
        "BLUE_CLOTH": EncodeBlock(BlockID.CLOTH, 11),
        "BROWN_CLOTH": EncodeBlock(BlockID.CLOTH, 12),
        "DARK_GREEN_CLOTH": EncodeBlock(BlockID.CLOTH, 13),
        "RED_CLOTH": EncodeBlock(BlockID.CLOTH, 14),
        "BLACK_CLOTH": EncodeBlock(BlockID.CLOTH, 15)
    };

    // making room to create
    var arrayWidth = squaresWidth * squareBlocks;
    var arrayDepth = squaresLength * squareBlocks;
    var arrayHeight = belowGround + streetHeight + floorHeight * cityFloorCount + roofHeight;
    var blocks = new Array(arrayWidth);
    InitializeBlocks();

    // make room for fixups and list out the known things we can fixup
    var fixups = new Array();

    // add plumbing level (based on Maze.js from WorldEdit)
    AddPlumbingLevel();

    // add streets
    AddStreets();

    // add the inside bits
    switch (modeCreate) {
        case createMode.city:
        case createMode.town:
            AddCitySquares();
            break;
        case createMode.park:
            AddParkLot();
            break;
        case createMode.dirtlot:
            AddDirtLot();
            break;
        case createMode.parkinglot:
            AddParkingLot();
            break;
        default: // createMode.juststreets
            AddJustStreets();
            break;
    }

    // add access points (will modify the player offset correctly as well)
    AddManholes();

    // and we are nearly done
    TranscribeBlocks(origin);

    // finally fix the things that need to be fixed up
    FixupFixups(origin);

    // poof, we are done!
    context.print("fini");
}

////////////////////////////////////////////////////
// all the supporting bits
////////////////////////////////////////////////////

function EncodeBlock(type, data) {
    //context.print(type + " " + data);
    return (data << 8) | type;
}

function DecodeType(block) {
    return block & 0xFF;
}

function DecodeData(block) {
    return block >> 8;
}

function InitializeBlocks() {
    //context.print(arrayWidth + " " + arrayHeight + " " + arrayDepth);
    context.print("Initializing");
    for (var x = 0; x < arrayWidth; x++) {
        blocks[x] = new Array(arrayHeight);
        for (var y = 0; y < arrayHeight; y++) {
            blocks[x][y] = new Array(arrayDepth);
            for (var z = 0; z < arrayDepth; z++)
                blocks[x][y][z] = BlockID.AIR;
        }
    }
}

// etch our array of ints into the "real" world
function TranscribeBlocks(origin) {
    context.print("Transcribing");
    var block;
    for (x = 0; x < arrayWidth; x++)
        for (var y = 0; y < arrayHeight; y++)
            for (var z = 0; z < arrayDepth; z++) {
                //context.print(x + " " + y + " " + z);
                block = blocks[x][y][z];
                editsess.rawSetBlock(origin.add(x, y, z),
                                     new BaseBlock(block & 0xFF, block >> 8));
                //editsess.rawSetBlock(origin.add(x, y - belowGround, z),
                //                     new BaseBlock(blocks[x][y][z]));
                //editsess.smartSetBlock(new Vector(x, y - belowGround, z), new BaseBlock(blocks[x][y][z]));
                //editsess.SetBlock(new Vector(x, y - belowGround, z), new BaseBlock(blocks[x][y][z]));
            }
}

// need to standarize on one param style, these five are not consistent!
function AddWalls(blockID, minX, minY, minZ, maxX, maxY, maxZ) {
    //context.print(minX + "," + minY + "," + minZ + " " + maxX + "," + maxY + "," + maxZ);

    for (var x = minX; x <= maxX; x++)
        for (var y = minY; y <= maxY; y++) {
            blocks[x][y][minZ] = blockID;
            blocks[x][y][maxZ] = blockID;
        }

    for (var y = minY; y <= maxY; y++)
        for (var z = minZ; z <= maxZ; z++) {
            blocks[minX][y][z] = blockID;
            blocks[maxX][y][z] = blockID;
        }
}

function FillCube(blockID, minX, minY, minZ, maxX, maxY, maxZ) {
    for (var x = minX; x <= maxX; x++)
        for (var y = minY; y <= maxY; y++)
            for (var z = minZ; z <= maxZ; z++)
                blocks[x][y][z] = blockID;
}

function FillLayer(blockID, blockX, blockZ, atY, layerW, layerL) {
    for (var x = blockX; x < blockX + layerW; x++)
        for (var z = blockZ; z < blockZ + layerL; z++)
            blocks[x][atY][z] = blockID;
}

function FillCellLayer(blockID, blockX, blockZ, atY, cellW, cellL) {
    FillLayer(blockID, blockX, blockZ, atY, cellW * squareBlocks, cellL * squareBlocks);
}

function FillStrataLevel(blockID, at) {
    FillLayer(blockID, 0, 0, at, arrayWidth, arrayDepth);
}

////////////////////////////////////////////////////
// fix up logic
////////////////////////////////////////////////////

function FixupFixups(origin) {
    for (i = 0; i < fixups.length; i++)
        fixups[i].setBlock(origin);
}

function SetLateBlock(atX, atY, atZ, id) {
    fixups.push(new LateItem(atX, atY, atZ, id));
}

function LateItem(atX, atY, atZ, id) {
    this.blockId = id;
    this.blockX = atX
    this.blockY = atY
    this.blockZ = atZ;

    this.setBlock = function (origin) {
        var id = DecodeType(this.blockId);
        var data = DecodeData(this.blockId);
        //context.print(id + " " + data);

        // late creation
        editsess.rawSetBlock(origin.add(this.blockX, this.blockY, this.blockZ),
                               new BaseBlock(id, data));

        // fix up the top of the doors
        if (id == BlockID.WOODEN_DOOR)
            editsess.rawSetBlock(origin.add(this.blockX, this.blockY + 1, this.blockZ),
                                 new BaseBlock(id, data + 8));
    }
}

////////////////////////////////////////////////////
// specific city block construction
////////////////////////////////////////////////////

// borrowed from WorldEdit's Maze script
function AddPlumbingLevel() {
    context.print("Plumbing");

    // add some strata
    FillStrataLevel(BlockID.OBSIDIAN, 0);

    // figure out the size
    w = Math.floor(arrayWidth / 2);
    d = Math.floor(arrayDepth / 2);

    var stack = [];
    var visited = {};
    var noWallLeft = new Array(w * d);
    var noWallAbove = new Array(w * d);
    var current = 0;

    stack.push(id(0, 0))

    while (stack.length > 0) {
        var cell = stack.pop();
        var x = $x(cell), z = $z(cell);
        visited[cell] = true;

        var neighbors = []

        if (x > 0) neighbors.push(id(x - 1, z));
        if (x < w - 1) neighbors.push(id(x + 1, z));
        if (z > 0) neighbors.push(id(x, z - 1));
        if (z < d - 1) neighbors.push(id(x, z + 1));

        shuffle(neighbors);

        while (neighbors.length > 0) {
            var neighbor = neighbors.pop();
            var nx = $x(neighbor), nz = $z(neighbor);

            if (visited[neighbor] != true) {
                stack.push(cell);

                if (z == nz) {
                    if (nx < x) {
                        noWallLeft[cell] = true;
                    } else {
                        noWallLeft[neighbor] = true;
                    }
                } else {
                    if (nz < z) {
                        noWallAbove[cell] = true;
                    } else {
                        noWallAbove[neighbor] = true;
                    }
                }

                stack.push(neighbor);
                break;
            }
        }
    }

    for (var z = 0; z < d; z++) {
        for (var x = 0; x < w; x++) {
            var cell = id(x, z);

            if (!noWallLeft[cell] && z < d) {
                blocks[x * 2 + 1][1][z * 2] = BlockID.OBSIDIAN;
                blocks[x * 2 + 1][2][z * 2] = BlockID.OBSIDIAN;
            }
            if (!noWallAbove[cell] && x < w) {
                blocks[x * 2][1][z * 2 + 1] = BlockID.OBSIDIAN;
                blocks[x * 2][2][z * 2 + 1] = BlockID.OBSIDIAN;
            }
            blocks[x * 2 + 1][1][z * 2 + 1] = BlockID.OBSIDIAN;
            blocks[x * 2 + 1][2][z * 2 + 1] = BlockID.OBSIDIAN;

            switch (rand.nextInt(15)) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:  // 46.7%
                    blocks[x * 2][1][z * 2] = BlockID.WATER;
                    break;
                case 7:
                case 8:  // 13.3%
                    blocks[x * 2][1][z * 2] = BlockID.BROWN_MUSHROOM;
                    break;
                case 9:
                case 10: // 13.3%
                    blocks[x * 2][1][z * 2] = BlockID.RED_MUSHROOM;
                    break;

                // what did people flush down the toilet?     
                case 11: //  6.7%
                    blocks[x * 2][1][z * 2] = BlockID.GOLD_BLOCK;
                    break;
                case 12: //  6.7%
                    blocks[x * 2][1][z * 2] = BlockID.DIAMOND_BLOCK;
                    break;
                default: // 13.3%
                    break;
            }
        }
    }

    // top off the plumbing
    FillStrataLevel(BlockID.CLAY, 3);

    //======================================================
    function id(x, z) {
        return z * (w + 1) + x;
    }

    function $x(i) {
        return i % (w + 1);
    }

    function $z(i) {
        return Math.floor(i / (w + 1));
    }

    function shuffle(arr) {
        var i = arr.length;
        if (i == 0) return false;
        while (--i) {
            var j = rand.nextInt(i + 1);
            var tempi = arr[i];
            var tempj = arr[j];
            arr[i] = tempj;
            arr[j] = tempi;
        }
    }
}

function DrawParkCell(blockX, blockZ, cellX, cellZ, cellW, cellL) {
    var cornerWidth = squareBlocks / 3;
    var cellWidth = cellW * squareBlocks;
    var cellLength = cellL * squareBlocks;

    // reservoir's walls
    FillCellLayer(BlockID.SANDSTONE, blockX, blockZ, 0, cellW, cellL);
    AddWalls(BlockID.SANDSTONE, blockX, 1, blockZ,
                                blockX + cellWidth - 1, streetLevel - 1, blockZ + cellLength - 1);

    // fill up reservoir with water
    FillCube(BlockID.WATER, blockX + 1, 1, blockZ + 1,
                            blockX + cellWidth - 2, 4, blockZ + cellLength - 2);

    // pillars to hold things up
    for (var x = cornerWidth; x < cellWidth; x = x + cornerWidth)
        for (var z = cornerWidth; z < cellLength; z = z + cornerWidth)
            for (var y = 1; y < streetLevel; y++)

            // every other column has a lit base
                if (y == 1 && ((x % 2 == 0 && z % 2 == 1) ||
                               (x % 2 == 1 && z % 2 == 0)))
                    blocks[blockX + x][y][blockZ + z] = BlockID.LIGHTSTONE;
                else
                    blocks[blockX + x][y][blockZ + z] = BlockID.SANDSTONE;


    // cap it off
    FillCellLayer(BlockID.SANDSTONE, blockX, blockZ, streetLevel, cellW, cellL);

    // add some grass
    FillCellLayer(BlockID.GRASS, blockX, blockZ, streetLevel + 1, cellW, cellL);

    // add an access point to the reservoir
    blocks[blockX + 2][streetLevel + 1][blockZ + 1] = BlockID.LOG;
    blocks[blockX + 2][streetLevel][blockZ + 1] = BlockID.AIR;
    blocks[blockX + 3][streetLevel - 3][blockZ + 1] = BlockID.SANDSTONE;
    blocks[blockX + 2][streetLevel - 3][blockZ + 1] = BlockID.SANDSTONE;
    blocks[blockX + 1][streetLevel - 3][blockZ + 1] = BlockID.SANDSTONE;

    // Record the need for the ladders
    SetLateBlock(blockX + 2, streetLevel, blockZ + 1, ExtendedID.WESTWARD_LADDER);
    SetLateBlock(blockX + 2, streetLevel - 1, blockZ + 1, ExtendedID.WESTWARD_LADDER);
    SetLateBlock(blockX + 2, streetLevel - 2, blockZ + 1, ExtendedID.WESTWARD_LADDER);

    // add some fencing
    var fenceHole = 2;
    for (var x = 0; x < cellWidth; x++)
        if (x > fenceHole && x < cellWidth - fenceHole) {
            blocks[blockX + x][streetLevel + 2][blockZ] = BlockID.FENCE;
            blocks[blockX + x][streetLevel + 2][blockZ + cellLength - 1] = BlockID.FENCE;
        }
    for (var z = 0; z < cellLength; z++)
        if (z > fenceHole && z < cellLength - fenceHole) {
            blocks[blockX][streetLevel + 2][blockZ + z] = BlockID.FENCE;
            blocks[blockX + cellWidth - 1][streetLevel + 2][blockZ + z] = BlockID.FENCE;
        }

    // add a fountain
    var fountainDiameter = 5;
    var fountainX = blockX + Math.floor((cellWidth - fountainDiameter) / 2);
    var fountainZ = blockZ + Math.floor((cellLength - fountainDiameter) / 2);

    FillLayer(BlockID.GLASS, fountainX + 1, fountainZ + 1, streetLevel, fountainDiameter - 2, fountainDiameter - 2);
    AddWalls(BlockID.STONE, fountainX, streetLevel + 1, fountainZ,
                            fountainX + fountainDiameter - 1, streetLevel + 2, fountainZ + fountainDiameter - 1);
    FillLayer(BlockID.WATER, fountainX + 1, fountainZ + 1, streetLevel + 1, fountainDiameter - 2, fountainDiameter - 2);

    blocks[fountainX + 2][streetLevel + 1][fountainZ + 2] = BlockID.LIGHTSTONE;
    blocks[fountainX + 2][streetLevel + 2][fountainZ + 2] = BlockID.GLASS;
    blocks[fountainX + 2][streetLevel + 3][fountainZ + 2] = BlockID.GLASS;
    blocks[fountainX + 2][streetLevel + 4][fountainZ + 2] = BlockID.GLASS;
    blocks[fountainX + 2][streetLevel + 5][fountainZ + 2] = BlockID.WATER;

    // add some trees
    //    for (var x = 2; x < cellWidth - 2; x++)
    //        for (var z = 2; z < cellLength - 2; z++)
    //            if (blocks[x][streetLevel + 1][z] == BlockID.GRASS && rand.nextInt(2) > 0)
    //                FixupTree(x, streetLevel + 2, z);
    //    PushTree(5, streetLevel + 1, 5);
}

function AddCitySquares() {
    context.print("Building");

    // upper limits
    var maxSize = 3;
    var parksAllowed = 1;

    // if we are in a town then change them a bit
    if (modeCreate == createMode.town){
        maxSize = 2;
        parksAllowed = 2;
        }

    // initialize the building cells
    var cells = new Array(3);
    for (var x = 0; x < 3; x++) {
        cells[x] = new Array(3);
        for (var z = 0; z < 3; z++)
            cells[x][z] = false;
    }

    // work our way through the cells
    var sizeX = 1;
    var sizeZ = 1;
    for (var atX = 0; atX < 3; atX++)
        for (var atZ = 0; atZ < 3; atZ++)
            if (!cells[atX][atZ]) { // nothing here yet.. build!
                sizeX = 1;
                sizeZ = 1;

                // 33% of time see if a bigger building will fit
                if (rand.nextInt(3) == 0) {
                    sizeX = rand.nextInt(Math.max(1, maxSize - atX)) + 1;
                    sizeZ = rand.nextInt(Math.max(1, maxSize - atZ)) + 1;

                    // mark the cells
                    for (var x = atX; x < atX + sizeX; x++)
                        for (var z = atZ; z < atZ + sizeZ; z++)
                            cells[x][z] = true;
                }
                else
                    cells[atX][atZ] = true;

                // make it so!
                DrawBuildingOrParkCell(atX + 1, atZ + 1, sizeX, sizeZ);
            }

    //======================================================
    function DrawBuildingOrParkCell(cellX, cellZ, cellW, cellL) {
        // little park instead of a building?
        if (rand.nextInt(4) == 0 && parksAllowed > 0) {
            DrawParkCell(cellX * squareBlocks, cellZ * squareBlocks, cellX, cellZ, cellW, cellL)
            parksAllowed--;
        }

        // fine.. be boring, let's make a building
        else
            DrawBuildingCell(cellX * squareBlocks, cellZ * squareBlocks, cellX, cellZ, cellW, cellL);
    }

    function DrawBuildingCell(blockX, blockZ, cellX, cellZ, cellW, cellL) {
        var cellWidth = cellW * squareBlocks;
        var cellLength = cellL * squareBlocks;

        // a basement
        AddWalls(BlockID.STONE, blockX, sewerFloor, blockZ,
                                blockX + cellWidth - 1, streetLevel, blockZ + cellLength - 1);

        // bottom of the first floor (roof of basement)
        var firstFloor = streetLevel + 1;
        FillCellLayer(BlockID.STONE, blockX, blockZ, firstFloor, cellW, cellL);

        // add some stairs
        PunchStairs(BlockID.COBBLESTONE_STAIRS, blockX + 5, blockZ + 2, firstFloor,
                                                true, true);

        // what color is the walls and floors?
        var wallID = BlockID.BRICK;
        var edgingID = BlockID.IRON_ORE;
        var floorID = BlockID.WOOD;
        var roofID = BlockID.WOOD;
        var buildingType = rand.nextInt(24);
        switch (buildingType) {
            case 0:
                wallID = BlockID.DOUBLE_STEP;
                edgingID = BlockID.MOSSY_COBBLESTONE;
                break;
            case 1:
                wallID = BlockID.IRON_BLOCK;
                edgingID = BlockID.IRON_ORE;
                break;
            case 2:
                wallID = BlockID.SAND;
                edgingID = BlockID.WOOD;
                break;
            case 3:
                wallID = BlockID.WOOD;
                edgingID = BlockID.SANDSTONE;
                break;
            case 4:
                wallID = BlockID.CLAY;
                edgingID = BlockID.COBBLESTONE;
                break;
            case 5:
                wallID = ExtendedID.GRAY_CLOTH;
                edgingID = ExtendedID.WHITE_CLOTH;
                break;
            case 6:
                wallID = ExtendedID.GRAY_CLOTH;
                edgingID = ExtendedID.LIGHT_GRAY_CLOTH;
                break;
            case 7:
                wallID = ExtendedID.LIGHT_GRAY_CLOTH;
                edgingID = ExtendedID.BLACK_CLOTH;
                break;
            case 8:
                wallID = ExtendedID.LIGHT_BLUE_CLOTH;
                edgingID = ExtendedID.BLUE_CLOTH;
                break;
            case 9:
                wallID = ExtendedID.DARK_GREEN_CLOTH;
                edgingID = ExtendedID.LIGHT_GREEN_CLOTH;
                break;
            case 10:
                wallID = ExtendedID.YELLOW_CLOTH;
                edgingID = ExtendedID.BROWN_CLOTH;
                break;
            case 11:
                wallID = ExtendedID.LIGHT_GRAY_CLOTH;
                edgingID = ExtendedID.RED_CLOTH;
                break;
            case 12:
                wallID = ExtendedID.GRAY_CLOTH;
                edgingID = ExtendedID.MAGENTA_CLOTH;
                break;
            case 13:
                wallID = ExtendedID.GRAY_CLOTH;
                edgingID = ExtendedID.PURPLE_CLOTH;
                roofID = BlockID.GLASS;
                break;
            case 14:
                wallID = ExtendedID.LIGHT_GRAY_CLOTH;
                edgingID = ExtendedID.ORANGE_CLOTH;
                break;
            case 15:
                wallID = ExtendedID.CYAN_CLOTH;
                edgingID = ExtendedID.LIGHT_BLUE_CLOTH;
                break;
            case 16:
                wallID = ExtendedID.GRAY_CLOTH;
                edgingID = BlockID.GLASS;
                floorID = ExtendedID.LIGHT_GRAY_CLOTH;
                break;
            case 17:
                wallID = BlockID.STONE;
                edgingID = BlockID.GLASS;
                floorID = ExtendedID.LIGHT_GRAY_CLOTH;
                break;
            case 18:
                wallID = ExtendedID.BLUE_CLOTH;
                edgingID = BlockID.GLASS;
                floorID = ExtendedID.LIGHT_BLUE_CLOTH;
                break;
            case 19:
                wallID = ExtendedID.BLACK_CLOTH;
                edgingID = BlockID.GLASS;
                floorID = ExtendedID.WHITE_CLOTH;
                roofID = BlockID.GLASS;
                break;
            case 20:
                wallID = BlockID.STONE;
                edgingID = BlockID.GLASS;
                floorID = BlockID.STONE;
                roofID = BlockID.GLASS;
                break;
            case 21:
                wallID = ExtendedID.PURPLE_CLOTH;
                edgingID = BlockID.GLASS;
                floorID = ExtendedID.LIGHT_GRAY_CLOTH;
                roofID = BlockID.GLASS;
                break;
            case 22:
                wallID = ExtendedID.DARK_GREEN_CLOTH;
                edgingID = BlockID.GLASS;
                floorID = ExtendedID.WHITE_CLOTH;
                roofID = BlockID.GLASS;
                break;
            default:
                break;
        }

        // how many stories and what type of roof?
        var stories = rand.nextInt(floorCount) + 1;
        var roofStyle = rand.nextInt(4);
        if (roofID == BlockID.GLASS && roofStyle == 3) // if the roof is made of glass, can't be flat
            roofStyle = rand.nextInt(3);

        // is there an angled roof? if so then the building should be one story shorter
        var roofTop = roofStyle < 3 ? 1 : 0;
        if (stories == 1 && roofTop)
            stories++;

        // random windows or not
        var windowStyle = rand.nextInt(3);

        // build the building
        for (var story = 0; story < (stories - roofTop); story++) {
            var floorAt = story * floorHeight + firstFloor + 1;
            FillFloor(wallID, edgingID, floorID,
                      blockX + 1, floorAt, blockZ + 1,
                      blockX + cellWidth - 2, floorAt + floorHeight - 2, blockZ + cellLength - 2,
                      windowStyle, story, stories - roofTop - 1);

            // add some stairs, but not to the roof
            if (story < (stories - roofTop - 1) || roofStyle == 3)
                PunchStairs(BlockID.WOODEN_STAIRS, blockX + 5, blockZ + 2, floorAt + floorHeight - 1,
                                                   false, true);
        }

        // where is the roof?
        var roofAt = (stories - 1) * floorHeight + firstFloor + 1;

        // flat roofs are special
        if (roofStyle == 3) {

            // flat roofs can have one more stairs
            PunchStairs(BlockID.WOODEN_STAIRS, blockX + 5, blockZ + 2, roofAt + floorHeight - 1,
                            false, true);

            // now add some more fences
            AddWalls(BlockID.FENCE, blockX + 1, roofAt + floorHeight, blockZ + 1,
                                        blockX + cellWidth - 2, roofAt + floorHeight, blockZ + cellLength - 2);

            // three more to finish things up
            blocks[blockX + 4][roofAt + floorHeight][blockZ + 2] = BlockID.FENCE;
            blocks[blockX + 4][roofAt + floorHeight][blockZ + 3] = BlockID.FENCE;
            blocks[blockX + 4][roofAt + floorHeight][blockZ + 4] = BlockID.FENCE;
        }
        else {
            // skylight or not? 1/3
            var skylightID = rand.nextInt(3) == 0 ? roofID : BlockID.GLASS;

            // hollow out the ceiling
            if (skylightID == BlockID.GLASS || roofID == BlockID.GLASS)
                FillLayer(BlockID.AIR, blockX + 2, blockZ + 2, roofAt - 1, cellWidth - 4, cellLength - 4);

            // three more to finish things up on the floor below
            blocks[blockX + 4][roofAt - floorHeight][blockZ + 2] = BlockID.FENCE;
            blocks[blockX + 4][roofAt - floorHeight][blockZ + 3] = BlockID.FENCE;
            blocks[blockX + 4][roofAt - floorHeight][blockZ + 4] = BlockID.FENCE;

            // cap the building
            switch (roofStyle) {
                case 0:
                    // NS ridge
                    for (r = 0; r < floorHeight; r++)
                        AddWalls(roofID, blockX + 2 + r, roofAt + r, blockZ + 1,
                                         blockX + cellWidth - 3 - r, roofAt + r, blockZ + cellLength - 2);

                    // fill in top with skylight
                    FillCube(skylightID, blockX + 2 + floorHeight, roofAt + floorHeight - 1, blockZ + 2,
                                         blockX + cellWidth - 3 - floorHeight, roofAt + floorHeight - 1, blockZ + cellLength - 3);
                    break;
                case 1:
                    // EW ridge
                    for (r = 0; r < floorHeight; r++)
                        AddWalls(roofID, blockX + 1, roofAt + r, blockZ + 2 + r,
                                     blockX + cellWidth - 2, roofAt + r, blockZ + cellLength - 3 - r);

                    // fill in top with skylight
                    FillCube(skylightID, blockX + 2, roofAt + floorHeight - 1, blockZ + 2 + floorHeight,
                                         blockX + cellWidth - 3, roofAt + floorHeight - 1, blockZ + cellLength - 3 - floorHeight);
                    break;

                default:
                    // pointy
                    for (r = 0; r < floorHeight; r++)
                        AddWalls(roofID, blockX + 2 + r, roofAt + r, blockZ + 2 + r,
                                         blockX + cellWidth - 3 - r, roofAt + r, blockZ + cellLength - 3 - r);

                    // fill in top with skylight
                    FillCube(skylightID, blockX + 2 + floorHeight, roofAt + floorHeight - 1, blockZ + 2 + floorHeight,
                                         blockX + cellWidth - 3 - floorHeight, roofAt + floorHeight - 1, blockZ + cellLength - 3 - floorHeight);
                    break;
            }
        }

        function FillFloor(wallID, edgingID, floorID, minX, minY, minZ, maxX, maxY, maxZ, windowStyle, story, topstory) {

            // NS walls
            var window = 0;
            for (var x = minX; x <= maxX; x++) {
                var sectionID = ComputeWindowID(windowStyle, wallID, x, minX, minY, window);
                window++;

                for (var y = minY; y <= maxY; y++) {
                    blocks[x][y][minZ] = sectionID;
                    blocks[x][y][maxZ] = sectionID;
                }
            }

            // EW walls
            window = 0;
            for (var z = minZ; z <= maxZ; z++) {
                var sectionID = ComputeWindowID(windowStyle, wallID, z, minZ, minZ, window);
                window++;

                for (var y = minY; y <= maxY; y++) {
                    blocks[minX][y][z] = sectionID;
                    blocks[maxX][y][z] = sectionID;
                }
            }

            // draw the ceiling edge, the topmost one is special
            if (story < topstory) {
                AddWalls(edgingID, minX, maxY + 1, minZ, maxX, maxY + 1, maxZ);
                FillLayer(floorID, minX + 1, minZ + 1, maxY + 1, maxX - minX - 1, maxZ - minZ - 1);
            }
            else
                FillLayer(floorID, minX, minZ, maxY + 1, maxX - minX + 1, maxZ - minZ + 1);

            // are we on the ground floor? if so let's add some doors
            if (story == 0) {
                var punchedDoor = false;

                // fifty/fifty chance of a door on a side, but there must be one somewhere
                if (rand.nextInt(2) == 0) {
                    PunchDoor(minX + 2, minY, minZ, ExtendedID.WESTFACING_WOODEN_DOOR);
                    punchedDoor = true;
                }
                if (rand.nextInt(2) == 0) {
                    PunchDoor(maxX, minY, minZ + 2, ExtendedID.NORTHFACING_WOODEN_DOOR);
                    punchedDoor = true;
                }
                if (rand.nextInt(2) == 0) {
                    PunchDoor(maxX - 2, minY, maxZ, ExtendedID.EASTFACING_WOODEN_DOOR);
                    punchedDoor = true;
                }
                if (!punchedDoor || rand.nextInt(2) == 0)
                    PunchDoor(minX, minY, maxZ - 2, ExtendedID.SOUTHFACING_WOODEN_DOOR);
            }
        }

        function ComputeWindowID(style, defaultID, curAt, minAt, maxAt, state) {
            var windowID = defaultID;

            switch (style) {
                case 1:
                    if (curAt != minAt && curAt != maxAt && rand.nextInt(2) == 0)
                        windowID = BlockID.GLASS;
                    break;
                case 2:
                    if (state % 3 == 1 || state % 3 == 2)
                        windowID = BlockID.GLASS;
                    break;
                default:
                    if (state % 4 == 1 || state % 4 == 2 || state % 4 == 3)
                        windowID = BlockID.GLASS;
                    break;
            }
            return windowID;
        }

        function PunchDoor(blockX, blockY, blockZ, doorID) {
            blocks[blockX][blockY][blockZ] = BlockID.AIR;
            blocks[blockX][blockY + 1][blockZ] = BlockID.AIR;
            SetLateBlock(blockX, blockY, blockZ, doorID);
        }

        function PunchStairs(stairID, blockX, blockZ, floorY, addStairwell, addGuardrail) {

            // how tall are the stairs?
            var stairHeight = floorHeight;
            if (addStairwell)
                stairHeight++;

            // place stairs
            for (airX = blockX; airX < blockX + stairHeight; airX++) {
                for (airZ = blockZ; airZ < blockZ + 2; airZ++) {
                    blocks[airX][floorY][airZ] = BlockID.AIR;
                    blocks[airX][floorY - (stairHeight - (airX - blockX)) + 1][airZ] = stairID
                };

                // make sure we don't fall down the stairs
                if (addGuardrail)
                    blocks[airX][floorY + 1][blockZ + 2] = BlockID.FENCE;
            }

            // create a basement enclosure to protect against the nasties
            if (addStairwell) {
                AddWalls(BlockID.STONE, blockX - 4, sewerFloor, blockZ - 1,
                                        blockX + stairHeight, streetLevel, blockZ + 2);

                // add a light
                blocks[blockX - 4][sewerFloor + 3][blockZ] = BlockID.LIGHTSTONE;

                // and a door 
                SetLateBlock(blockX - sewerHeight + 1, sewerFloor, blockZ + 2, ExtendedID.WESTFACING_WOODEN_DOOR);
            }
        }
    }

    function RandomBuildingSize() {
        switch (rand.nextInt(10)) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
                return 1; // 50%
            case 5:
            case 6:
            case 7:
            case 8:
                return 2; // 40%
            default:
                return 3; // 10%
        }
    }
}

// streets or bridges over canals (one of these days)
function AddStreets() {
    for (var x = 0; x < squaresWidth; x++)
        for (var z = 0; z < squaresLength; z++)
            if (x % 4 == 0 || z % 4 == 0)
                DrawStreetCell(x * squareBlocks, z * squareBlocks, x, z);

    //======================================================
    function DrawStreetCell(blockX, blockZ, cellX, cellZ) {

        // add the sewer corner bits
        DrawSewerPart(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks);
        DrawSewerPart(blockX + 2 * cornerBlocks, blockZ + 0 * cornerBlocks);
        DrawSewerPart(blockX + 0 * cornerBlocks, blockZ + 2 * cornerBlocks);
        DrawSewerPart(blockX + 2 * cornerBlocks, blockZ + 2 * cornerBlocks);

        // add the sewer straight bits
        if (cellX % 4 == 0 && cellZ != 0 && cellZ != squaresLength - 1 && cellZ % 4 != 0) {
            DrawSewerPart(blockX + 0 * cornerBlocks, blockZ + 1 * cornerBlocks);
            DrawSewerPart(blockX + 2 * cornerBlocks, blockZ + 1 * cornerBlocks);
        }
        if (cellZ % 4 == 0 && cellX != 0 && cellX != squaresWidth - 1 && cellX % 4 != 0) {
            DrawSewerPart(blockX + 1 * cornerBlocks, blockZ + 0 * cornerBlocks);
            DrawSewerPart(blockX + 1 * cornerBlocks, blockZ + 2 * cornerBlocks);
        }

        // add the street
        FillCellLayer(BlockID.STONE, blockX, blockZ, streetLevel - 1, 1, 1);
        FillCellLayer(BlockID.STONE, blockX, blockZ, streetLevel, 1, 1);

        // add the sidewalk and streetlights
        var sidewalkY = streetLevel + 1;
        if (cellX % 4 == 0 && cellZ % 4 != 0) {
            DrawSidewalk(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks,
                         blockX + 1 * cornerBlocks - 2, blockZ + 3 * cornerBlocks);
            DrawSidewalk(blockX + 2 * cornerBlocks + 2, blockZ + 0 * cornerBlocks,
                         blockX + 3 * cornerBlocks, blockZ + 3 * cornerBlocks);

            DrawStreetlight(blockX + 0 * cornerBlocks + 2, blockZ + 1 * cornerBlocks + 2, true, false, false, false);
            DrawStreetlight(blockX + 2 * cornerBlocks + 2, blockZ + 1 * cornerBlocks + 2, false, false, true, false);

            // paint road lines
            for (var z = 0; z < squareBlocks; z++)
                if (z % 5 != 0 && z % 5 != 4)
                    blocks[blockX + linesOffset][streetLevel][blockZ + z] = ExtendedID.YELLOW_CLOTH;

        } else if (cellX % 4 != 0 && cellZ % 4 == 0) {
            DrawSidewalk(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks,
                         blockX + 3 * cornerBlocks, blockZ + 1 * cornerBlocks - 2);
            DrawSidewalk(blockX + 0 * cornerBlocks, blockZ + 2 * cornerBlocks + 2,
                         blockX + 3 * cornerBlocks, blockZ + 3 * cornerBlocks);

            DrawStreetlight(blockX + 1 * cornerBlocks + 2, blockZ + 0 * cornerBlocks + 2, false, true, false, false);
            DrawStreetlight(blockX + 1 * cornerBlocks + 2, blockZ + 2 * cornerBlocks + 2, false, false, false, true);

            // paint road lines
            for (var x = 0; x < squareBlocks; x++)
                if (x % 5 != 0 && x % 5 != 4)
                    blocks[blockX + x][streetLevel][blockZ + linesOffset] = ExtendedID.YELLOW_CLOTH;

        } else if (cellX % 4 == 0 && cellZ % 4 == 0) {
            DrawSidewalkCorner(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks, 0, 0);
            DrawSidewalkCorner(blockX + 2 * cornerBlocks, blockZ + 0 * cornerBlocks, 2, 0);
            DrawSidewalkCorner(blockX + 0 * cornerBlocks, blockZ + 2 * cornerBlocks, 0, 2);
            DrawSidewalkCorner(blockX + 2 * cornerBlocks, blockZ + 2 * cornerBlocks, 2, 2);

            DrawStreetlight(blockX + 0 * cornerBlocks + 2, blockZ + 0 * cornerBlocks + 2, true, true, false, false);
            DrawStreetlight(blockX + 2 * cornerBlocks + 2, blockZ + 0 * cornerBlocks + 2, false, true, true, false);
            DrawStreetlight(blockX + 2 * cornerBlocks + 2, blockZ + 2 * cornerBlocks + 2, false, false, true, true);
            DrawStreetlight(blockX + 0 * cornerBlocks + 2, blockZ + 2 * cornerBlocks + 2, true, false, false, true);

            // paint crosswalk
            for (var i = 0; i < 5; i++) {
                blocks[blockX + 1][streetLevel][blockZ + linesOffset + i] = ExtendedID.WHITE_CLOTH;
                blocks[blockX + squareBlocks - 2][streetLevel][blockZ + linesOffset - i] = ExtendedID.WHITE_CLOTH;
                blocks[blockX + linesOffset - i][streetLevel][blockZ + 1] = ExtendedID.WHITE_CLOTH;
                blocks[blockX + linesOffset + i][streetLevel][blockZ + squareBlocks - 2] = ExtendedID.WHITE_CLOTH;
            }
        }

        function DrawSewerPart(blockX, blockZ) {
            // first the walls
            var wallID = BlockID.COBBLESTONE;
            if (rand.nextInt(2) == 0)
                wallID = BlockID.MOSSY_COBBLESTONE;
            AddWalls(wallID, blockX, sewerFloor, blockZ,
                         blockX + cornerBlocks - 1, sewerCeiling, blockZ + cornerBlocks - 1);

            // then the goodies
            var fillID = BlockID.DIRT;
            switch (rand.nextInt(40)) {
                case 0:
                case 1:
                case 2:
                case 3:  // 10.0%
                    fillID = BlockID.SAND;
                    break;
                case 4:
                case 5:
                case 6:  //  7.5%
                    fillID = BlockID.COAL_ORE;
                    break;
                case 7:
                case 8:
                case 9:  //  7.5%
                    fillID = BlockID.GRAVEL;
                    break;
                case 10:
                case 11: //  5.0%
                    fillID = BlockID.IRON_ORE;
                    break;
                case 12:
                case 13: //  5.0%
                    fillID = BlockID.LAPIS_LAZULI_ORE;
                    break;
                case 14:
                case 15: //  5.0%
                    fillID = BlockID.WATER;
                    break;
                case 16: //  2.5%
                    fillID = BlockID.GOLD_BLOCK;
                    break;
                case 17: //  2.5%
                    fillID = BlockID.LAVA;
                    break;
                default: // 55.0%
                    // everything else gets DIRT
                    break;
            }
            FillCube(fillID, blockX + 1, sewerFloor, blockZ + 1,
                         blockX + cornerBlocks - 2, sewerCeiling, blockZ + cornerBlocks - 2);
        }

        function DrawStreetlight(blockX, blockZ, lightN, lightE, lightS, lightW) {
            blocks[blockX][sidewalkY][blockZ] = BlockID.DOUBLE_STEP;
            blocks[blockX][sidewalkY + 1][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 2][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 3][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 4][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 5][blockZ] = BlockID.STEP;

            if (lightN)
                blocks[blockX + 1][sidewalkY + 5][blockZ] = BlockID.LIGHTSTONE;
            if (lightE)
                blocks[blockX][sidewalkY + 5][blockZ + 1] = BlockID.LIGHTSTONE;
            if (lightS)
                blocks[blockX - 1][sidewalkY + 5][blockZ] = BlockID.LIGHTSTONE;
            if (lightW)
                blocks[blockX][sidewalkY + 5][blockZ - 1] = BlockID.LIGHTSTONE;
        }

        function DrawSidewalkCorner(blockX, blockZ, offsetX, offsetZ) {
            for (var x = 0; x < 3; x++)
                for (var z = 0; z < 3; z++)
                    blocks[blockX + offsetX + x][sidewalkY][blockZ + offsetZ + z] = BlockID.STEP;
        }

        function DrawSidewalk(minX, minZ, maxX, maxZ) {
            for (var x = minX; x < maxX; x++)
                for (var z = minZ; z < maxZ; z++)
                    blocks[x][sidewalkY][z] = BlockID.STEP;
        }
    }
}

function AddParkLot() {
    DrawParkCell(squareBlocks, squareBlocks, 1, 1, 3, 3);
}

function AddDirtLot() {
    FillCube(BlockID.DIRT, 1 * squareBlocks, sewerFloor, 1 * squareBlocks,
                           4 * squareBlocks - 1, streetLevel, 4 * squareBlocks - 1);
}

function AddParkingLot() {
    FillCube(BlockID.DIRT, 1 * squareBlocks, sewerFloor, 1 * squareBlocks,
                           4 * squareBlocks - 1, streetLevel - 1, 4 * squareBlocks - 1);
    FillCube(BlockID.STONE, 1 * squareBlocks, streetLevel, 1 * squareBlocks,
                            4 * squareBlocks - 1, streetLevel, 4 * squareBlocks - 1);
}

function AddJustStreets() {
    // let see if we can literally do nothing... hey it worked!
}

function AddManholes() {
    var manX = 5;
    var manZ = 4;

    // add the manholes
    AddSewerManhole(manX + 0 * squareBlocks, belowGround, manZ + 0 * squareBlocks);
    AddSewerManhole(manX + 0 * squareBlocks, belowGround, manZ + 4 * squareBlocks);
    AddSewerManhole(manX + 4 * squareBlocks, belowGround, manZ + 0 * squareBlocks);
    AddSewerManhole(manX + 4 * squareBlocks, belowGround, manZ + 4 * squareBlocks);

    // offset the start so we are standing on the SE manhole
    origin = origin.add(-manX, -belowGround, -manZ);

    //======================================================
    function AddSewerManhole(locX, locY, locZ) {
        // Manhole down to sewer
        blocks[locX][locY - 1][locZ] = BlockID.LOG;

        // Make room for the ladders
        blocks[locX][locY - 2][locZ] = BlockID.AIR;
        blocks[locX][locY - 3][locZ] = BlockID.AIR;
        blocks[locX][locY - 4][locZ] = BlockID.AIR;

        // Record the need for the ladders
        SetLateBlock(locX, locY - 2, locZ, ExtendedID.SOUTHWARD_LADDER);
        SetLateBlock(locX, locY - 3, locZ, ExtendedID.SOUTHWARD_LADDER);
        SetLateBlock(locX, locY - 4, locZ, ExtendedID.SOUTHWARD_LADDER);

        // Manhole down to the plumbing... WATCH OUT IT IS DANGEROUS DOWN THERE!
        blocks[locX][locY - 5][locZ] = BlockID.LOG;
        blocks[locX][locY - 6][locZ] = BlockID.AIR;
        blocks[locX][locY - 7][locZ] = BlockID.AIR;
    }
}