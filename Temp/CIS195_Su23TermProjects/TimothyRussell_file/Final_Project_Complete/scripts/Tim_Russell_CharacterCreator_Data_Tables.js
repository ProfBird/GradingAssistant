

const namesArray = ["Hesmeri","Saracas","Thofled","Saka","Adelhere","Egar","Cuthar","Willa","Sanecrow","Cynfred","Vidsha","Li","Uan","Mark","Nathseph","Todun","Leegeor","Donesc","Anba",
                    "Trithae","Georwine","Lyrah","Menhol","Thasris","Ijolen","Mondda","Chaelfast","Frith'chell","Cy","Dajeff","Theoddon","Richloc","Richren","Beornris","Sylcon","Ridtom",
                    "Na","Phie'chris","Frea","Hesdon","Sontri","Niregin","Rednas","Saan","Ceolcon","Wilbrand","Annken","Tawil","Barddon","Chetbeorth","Roncen","Viaed","Dasa","Lessung","Tongar",
                    "Freali","Garceo","And","Seanchard","Ronadel","Seanjack","Helmwulf","Keleetim","Donisen","Cwenra","Saradra","Gard","Ethelfrea","Nifer","Locseph","Fred","Wen-ra","Fortinfled",
                    "Liamnald","Ancla","Anred","Viatho","Seanda","Donria","Mannjo","Sereja","Clason","Carthryth","Rahmes","Chell","Anneadel","Gormaris","Everhes","Richwerd","Viaeli","Ceolrol",
                    "Red","Dicwilfortin","Royken","Helmtheod","Bethpaul","Uwil","Eathony","Sufleddryt","Ryethel","Sakim","Cheldra","Topa","Rahan","Bet-tho","Thonyceol","Ingchris","Bafred","Werdever",
                    "Da-tri","Cynanne","Newerd","Tom","Wiljoan","Edron","Concas","Eamac","Su","Johnsean","Mitter","Sephbard","Nehe","Gorma","Laudra","Docbur","Kimsean","Thy","Cy","Rahal","Lasjackmas",
                    "Rismond","Nieldic","Aldgard","Redcar","Wardret","Holria","Bet","Na'lin","Chellka","Nalddeb","Ealpa","Redlee","Stantho","Dunson","Beorth-frea","Risbeorn","Fredord","Larocmen","Joven","Cara"
]

// Note: some arrays have the same data multiple times. The data in these tables are chosen at random, so the multiple instances are to simulate more common
//instances of that selection. For example, humans are much more common than Tabaxi, level 1 characters are more common than level 15.

const speciesArray = ["Elf", "Elf", "Elf", "Elf", "Elf", "Elf", "Elf", "Elf", "Elf", "Elf", "Elf", "Elf", 
                "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", "Dwarf", 
                "Dwarf", "Dwarf", "Dwarf", "Dwarf", 
                "Halfling", "Halfling", "Halfling", "Halfling", "Halfling", "Halfling", "Halfling", "Halfling", "Halfling", 
                "Halfling", "Halfling", "Halfling", "Halfling", "Halfling", "Halfling", 
                "Gnome", "Gnome", "Gnome", "Gnome", "Gnome", "Gnome", "Gnome", "Gnome", 
                "Human", "Human", "Human", "Human", "Human", "Human", "Human", "Human", "Human", "Human", "Human", 
                "Human", "Human", "Human", "Human", "Human", "Human", "Human", "Human", "Human", "Human",  "Human",
                "Half-Elf", "Half-Elf", "Half-Elf", "Half-Elf", "Half-Elf", 
                "Half-Orc", "Half-Orc", "Half-Orc", 
                "Yuan-Ti Pureblood",
                "Lizardfolk",
                "Genasi", "Genasi", "Genasi", 
                "Tiefling", "Tiefling", "Tiefling", 
                "Aasimar",
                "Firbolg",
                "Goliath", "Goliath", "Goliath", 
                "Tabaxi",
                "Kenku",
                "Arakocra",
                "Warforged",
            ]

const classArray = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"]

const alignmentArray = ["Lawful Good", "Lawful Good", "Lawful Good", "Lawful Good", "Lawful Good", "Lawful Good", "Lawful Good", "Lawful Good", "Lawful Good", "Lawful Good",
                        "Neutral Good", "Neutral Good", "Neutral Good", "Neutral Good", 
                        "Chaotic Good", "Chaotic Good", "Chaotic Good", "Chaotic Good", 
                        "Lawful Neutral", "Lawful Neutral", "Lawful Neutral", "Lawful Neutral", 
                        "True Neutral",  "True Neutral",
                        "Chaotic Neutral",
                        "Lawful Evil",
                        "Neutral Evil",
                        "Chaotic Evil"

]

const levelArray = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
                    2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
                    3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,
                    4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
                    5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
                   6,6,6,6,6,6,6,6,6,6,6,
                   7,7,7,7,7,7,7,7,7,
                   8,8,8,8,8,8,8,8,
                   9,9,9,9,9,9,9,
                   10,10,10,10,10,10,
                   11,11,11,11,11,
                   12,12,12,12,
                   13,13,13,
                   14,14,
                   15


        ]