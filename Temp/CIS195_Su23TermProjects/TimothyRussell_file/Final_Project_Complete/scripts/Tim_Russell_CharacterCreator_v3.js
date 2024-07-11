/*  File created by Tim Russell 5/20/23

Dungeons and Dragons character generator
    
    to-do: 
    Done!

    phase 2 to-do:
    calculate skills
    add armor and calculate armor class
    add weapons and calculate hit and damage
    add subclass
    add proficiencies
    add languages
    add feats
    add passive perception
    add treasure


    */
const CHARACTER_ARRAY = []; // Array to contain character objects. Currently set up to only work with one.
let currentCharacter = 0;  

function createRandomCharacter(nameUserInput, classUserInput, speciesUserInput, levelUserInput, alignmentUserInput) //Generates a random character
{
    CHARACTER_ARRAY.pop();
    let inputName ="";
    let inputClass="";
    let inputSpecies="";
    let inputLevel
    let inputAlignment ="";

//these if statments assign user input data to variables or assign them randomly if the random option is chosen
    if (nameUserInput == "")
        {
            inputName = namesArray[Math.floor((Math.random() * namesArray.length))];
        }
    else
        {
            inputName = nameUserInput;
        }

    if (classUserInput == "Random")
        {
            inputClass = classArray[Math.floor((Math.random() * classArray.length))];
        }
    else
        {
            inputClass = classUserInput;
        }

    if (speciesUserInput == "Random")
        {
            inputSpecies = speciesArray[Math.floor((Math.random() * speciesArray.length))];
        }
    else
        {
            inputSpecies = speciesUserInput;
        }

    if (levelUserInput == "Random")
        {
            inputLevel = levelArray[Math.floor((Math.random() * levelArray.length))];
        }
    else
        {
            inputLevel = levelUserInput;
        }
    
    if (alignmentUserInput == "Random")
        {
            inputAlignment = alignmentArray[Math.floor((Math.random() * alignmentArray.length))];
        }
    else
        {
            inputAlignment = alignmentUserInput;
        }
    
    //creates the charcter object and assigns the user or random data, and then calculates all the subsequent statistics.
    CHARACTER_ARRAY.push(new createCharacterObj(inputName, inputClass, inputSpecies, inputLevel, inputAlignment));
    CHARACTER_ARRAY[currentCharacter].allStatRollsSorted();
    CHARACTER_ARRAY[currentCharacter].abilityIncreaseForLevel();
    CHARACTER_ARRAY[currentCharacter].statAssigner();
    CHARACTER_ARRAY[currentCharacter].speciesStatMod();
    CHARACTER_ARRAY[currentCharacter].calculateAbilityModifiers();
    CHARACTER_ARRAY[currentCharacter].calculateHitPoints();
    CHARACTER_ARRAY[currentCharacter].calculateProficiencyBonus();
    CHARACTER_ARRAY[currentCharacter].calculateSpeed();
    CHARACTER_ARRAY[currentCharacter].calculateInitiativeBonus();

    
}


function createCharacterObj(name, characterClass, species, level, alignment) // character object initializer
{
    //object properties-------------------------------------------------------------------
    this.statArray = [];
    this.name = name;
    this.characterClass = characterClass;
    this.species = species;
    this.level = level;
    this.alignment = alignment;
    this.str = 0;
    this.strMod = 0;
    this.dex = 0;
    this.dexMod = 0;
    this.con = 0;
    this.conMod = 0;
    this.int = 0;
    this.intMod = 0;
    this.wis = 0;
    this.wisMod = 0;
    this.cha = 0;
    this.chaMod = 0;
    this.hitPoints = 0;
    this.hitDiceValue = 0;
    this.proficencyBonus = 0;
    this.speed = 0;
    this.initiativeBonus = 0;

    //object methods----------------------------------------------------------------------

    this.calculateInitiativeBonus = function() // Calculate initiative bonus. Currently using simple version. Expand with subclasses and feats in phase 2.
    {
        this.initiativeBonus = this.dexMod;
    }

    this.calculateSpeed = function() // Calculates character speed based on race. Some classes effect speed, but that is not factored here. Expand in phase 2.
    {
        switch (this.species)
        {
            case "Dwarf":
            case "Halfling":
            case "Gnome":
            case "Arakocra":
                this.speed=25;
                break;
            default:
                this.speed=30;
        }
    }

    this.calculateProficiencyBonus = function() // calculates profiency bonus stat
    {
        this.proficencyBonus = Math.floor(2 + (this.level-1)/4);
    }

    this.calculateHitPoints = function() //Calculates hit points based on class, constitiution score and level.
    {
        this.hitPoints = this.hitDiceValue;
        for (i=this.level; i>=2; i--)
        {
            this.hitPoints += Math.floor(Math.random() * this.hitDiceValue+1);
        }

        this.hitPoints += this.conMod * this.level;
    }

    this.abilityIncreaseForLevel = function() //Checks level and adds ability bonues based on level milestones. Adds scores before stat assignment, since I assume that these bonuses would be added to class priority attributes.
    {
        if (this.level >=16)
        {
            this.statArray[0] += 2;
            this.statArray[1] += 1;
            this.statArray[2] += 1;
        }
        else if (this.level >=12)
            {
                this.statArray[0] += 1;
                this.statArray[1] += 1;
                this.statArray[2] += 1;
            }
            else if (this.level >=8)
                {
                    this.statArray[0] += 1;
                    this.statArray[1] += 1;
                }
                    else if (this.level >= 4)
                    {
                        this.statArray[0] += 1;            
                    }

        if (this.class == "Fighter" && this.level >=14)
        {
            this.statArray[0] += 2;
        }
        else if (this.class == "Fighter" && this.level >=6)
            {
                this.statArray[0] += 1;
            }

        if (this.class == "Rogue" && this.level >=10)
        {
            this.statArray[0] += 1;
        }

    }

    this.calculateAbilityModifiers = function() // calculates Ability Modifiers
    {
        this.strMod = Math.floor((this.str-10) / 2);
        this.dexMod = Math.floor((this.dex-10) / 2);
        this.conMod = Math.floor((this.con-10) / 2);
        this.intMod = Math.floor((this.int-10) / 2);
        this.wisMod = Math.floor((this.wis-10) / 2);
        this.chaMod = Math.floor((this.cha-10) / 2);
    }

    this.rollStatDice = function()  // "rolls" 4 d/6, drops the lowest, and returns the sum.
    {

        const dieRolls = [Math.floor((Math.random() * 6)+1), Math.floor((Math.random() * 6)+1), Math.floor((Math.random() * 6)+1), Math.floor((Math.random() * 6)+1)];
        let rollTotal = 0;
        dieRolls.sort();
        dieRolls.shift();
        for (let die of dieRolls)
        {
            rollTotal += die;
        }
        return rollTotal;

    }

    this.allStatRollsSorted = function() // assigns rolled stats to stat array, and sorts largest to smallest
    {
        for (i=0; i<6; i++)
        {
            this.statArray.push(this.rollStatDice());
        }

            let tempArrayItem;
        for (i=0; i<6; i++)
        {
            for (j=5; j>0; j--)
            {
                if (this.statArray[j] > this.statArray[j-1])
                {
                    tempArrayItem = this.statArray[j-1];
                    this.statArray[j-1] = this.statArray[j];
                    this.statArray[j] = tempArrayItem;
                }
            }
        }
    }



    this.statAssigner = function() //assigns rolled stat value to individual ability fields. Stats are assigned to abilities based on character class priority. I.E. Fighters get their highest stat in strength, Wizards in Intelegence, etc. Also assigns hit dice value
    {
        switch (this.characterClass)
        {
            case "Barbarian":   
                this.str = this.statArray[0];
                this.con = this.statArray[1];
                this.dex = this.statArray[2];
                this.wis = this.statArray[3];
                this.cha = this.statArray[4];
                this.int = this.statArray[5];
                this.hitDiceValue = 12;
                break;
            case "Fighter":
                this.str = this.statArray[0];
                this.con = this.statArray[1];
                this.dex = this.statArray[2];
                this.wis = this.statArray[3];
                this.cha = this.statArray[4];
                this.int = this.statArray[5];
                this.hitDiceValue = 10;
                break;
            case "Druid":
                this.wis = this.statArray[0];
                this.con = this.statArray[1];
                this.dex = this.statArray[2];
                this.str = this.statArray[3];
                this.int = this.statArray[4];
                this.cha = this.statArray[5];
                this.hitDiceValue = 8;
                break;
            case "Monk":
                this.dex = this.statArray[0];
                this.wis = this.statArray[1];
                this.con = this.statArray[2];
                this.cha = this.statArray[3];
                this.int = this.statArray[4];
                this.str = this.statArray[5];
                this.hitDiceValue = 8;
                break;
            case "Cleric":
                this.wis = this.statArray[0];
                this.con = this.statArray[1];
                this.int = this.statArray[2];
                this.cha = this.statArray[3];
                this.str = this.statArray[4];
                this.dex = this.statArray[5];
                this.hitDiceValue = 8;
                break;
            case "Rogue":
                this.dex = this.statArray[0];
                this.str = this.statArray[1];
                this.int = this.statArray[2];
                this.con = this.statArray[3];
                this.cha = this.statArray[4];
                this.wis = this.statArray[5];
                this.hitDiceValue = 8;
                break;
            case "Wizard":
                this.int = this.statArray[0];
                this.wis = this.statArray[1];
                this.con = this.statArray[2];
                this.dex = this.statArray[3];
                this.cha = this.statArray[4];
                this.str = this.statArray[5];
                this.hitDiceValue = 6;
                break;
            case "Bard":
                this.cha = this.statArray[0];
                this.int = this.statArray[1];
                this.dex = this.statArray[2];
                this.wis = this.statArray[3];
                this.str = this.statArray[4];
                this.con = this.statArray[5];
                this.hitDiceValue = 8;
                break;
            case "Paladin":
                this.cha = this.statArray[0];
                this.str = this.statArray[1];
                this.con = this.statArray[2];
                this.wis = this.statArray[3];
                this.dex = this.statArray[4];
                this.int = this.statArray[5];
                this.hitDiceValue = 10;
                break;
            case "Warlock":
                this.int = this.statArray[0];
                this.con = this.statArray[1];
                this.cha = this.statArray[2];
                this.wis = this.statArray[3];
                this.str = this.statArray[4];
                this.dex = this.statArray[5];
                this.hitDiceValue = 8;
                break;
            case "Sorcerer":
                this.cha = this.statArray[0];
                this.con = this.statArray[1];
                this.dex = this.statArray[2];
                this.wis = this.statArray[3];
                this.str = this.statArray[4];
                this.int = this.statArray[5];
                this.hitDiceValue = 6;
                break;
            case "Ranger":
                this.dex = this.statArray[0];
                this.wis = this.statArray[1];
                this.str = this.statArray[2];
                this.con = this.statArray[3];
                this.int = this.statArray[4];
                this.cha = this.statArray[5];
                this.hitDiceValue = 10;
                break;
            default:
                alert("Error in Stat or hit dice value Assignment")
                break;


        }
    }

    this.speciesStatMod = function() //modifies Ability scores based on character species. Subspecies not included- Genasi stats reflect Air type
    {
        switch (this.species)
        {
            case "Elf":
                this.dex =  this.dex +2;
                this.int =  this.int +1;
                break;
            case "Dwarf":
                this.con =  this.con +2;
                this.str =  this.str +2;
                break;
            case "Halfling":
                this.dex =  this.dex +2;
                this.cha =  this.cha +1;
                break;
            case "Gnome":
                this.int =  this.int +2;
                this.dex =  this.dex +1;
                break;
            case "Human":
                this.str += 1;
                this.dex += 1;
                this.con += 1;
                this.int += 1;
                this.wis += 1;
                this.cha += 1;
                break;
            case "Half-Elf":
                this.cha =  this.cha +2;
                rand = Math.floor(Math.random()*5)+1;
                switch (rand)
                {
                    case 1:
                        this.str =  this.str +1;
                        break;
                    case 2:
                        this.dex =  this.dex +1;
                        break;
                    case 3:
                        this.con =  this.con +1;
                        break;
                    case 4:
                        this.int =  this.int +1;
                        break;
                    case 5:
                        this.wis =  this.wis +1;
                        break;
                    default:
                        alert("Error in Half-Elf Species Stat Modifier");
                }
                break;
            case "Half-Orc":
                this.str += 2;
                this.con += 1;
                break;
            case "Yuan-Ti Pureblood":
                this.cha =  this.cha +2;
                this.int =  this.int +1;
                break;
            case "Lizardfolk":
                this.con =  this.con +2;
                this.wis =  this.wis +1;
                break;
            case "Genasi":
                this.con =  this.con +2;
                this.dex =  this.dex +1;
                break;
            case "Tiefling":
                this.cha =  this.cha +2;
                this.int =  this.int +1;
                break;
            case "Aasimar":
                this.cha =  this.cha +2;
                this.wis =  this.wis +1;
                break;
            case "Firbolg":
                this.wis =  this.wis +2;
                this.str =  this.str +1;
                break;
            case "Goliath":
                this.str =  this.str +2;
                this.con =  this.con +1;
                break;
            case "Tabaxi":
                this.dex =  this.dex +2;
                this.cha =  this.cha +1;
                break;
            case "Kenku":
                this.dex =  this.dex +2;
                this.wis =  this.wis +1;
                break;
            case "Arakocra":
                this.dex =  this.dex +2;
                this.wis =  this.wis +1;
                break;
            case "Warforged":
                this.con =  this.con +2;
                rand = Math.floor(Math.random()*5)+1;
                switch (rand)
                {
                    case 1:
                        this.str =  this.str +1;
                        break;
                    case 2:
                        this.dex =  this.dex +1;
                        break;
                    case 3:
                        this.int =  this.con +1;
                        break;
                    case 4:
                        this.wis =  this.int +1;
                        break;
                    case 5:
                        this.cha =  this.wis +1;
                        break;
                    default:
                        alert("Error in Warforged Species Stat Modifier");
                }
                break;


            default:
                alert("Error in Species Stat Mod");
                break;

        }
    }
}

