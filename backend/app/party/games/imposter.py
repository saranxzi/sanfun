"""Find the Imposter (Chameleon/Spyfall) Game Engine."""
import random
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo

WORD_PACKS_HINTS: Dict[str, List[tuple[str, str]]] = {
    "Locations & Travel": [
        ("Airport", "A bustling transit hub with runways, terminals, and security checkpoints."),
        ("Hospital", "A medical facility with emergency rooms, doctors, and operating theaters."),
        ("Space Station", "An orbital research facility floating high above Earth in zero gravity."),
        ("Submarine", "A naval vessel engineered to submerge and navigate deep underwater."),
        ("Casino", "An entertainment venue filled with roulette wheels, slot machines, and card tables."),
        ("Cruise Ship", "A massive luxury ocean liner with pools, buffets, and cabins."),
        ("Amusement Park", "An outdoor recreation center with roller coasters, games, and cotton candy."),
        ("Art Museum", "A quiet cultural gallery displaying paintings, sculptures, and historical artifacts."),
        ("Pirate Ship", "A wooden sailing vessel with skull flags, cannons, and wooden decks."),
        ("Movie Theater", "A darkened auditorium with plush seating, surround sound, and a giant projector screen."),
        ("Police Station", "A law enforcement headquarters with holding cells, radios, and detectives."),
        ("Ski Resort", "A snowy mountain lodge with chairlifts, ski slopes, and chalets."),
        ("Haunted House", "A creepy dilapidated mansion rumored to contain ghosts, cobwebs, and creaky floorboards."),
        ("Desert Island", "An isolated strip of tropical land surrounded by endless ocean with palm trees."),
        ("Public Library", "A quiet sanctuary packed with bookshelves, study desks, and librarians."),
        ("Subway Station", "An underground transit platform with turnstiles, tracks, and arriving trains."),
        ("Zoo", "An outdoor wildlife park where people view exotic animals in enclosures."),
        ("Ancient Pyramid", "A monumental stone tomb built thousands of years ago in the desert."),
        ("Lighthouse", "A tall coastal coastal beacon that flashes a warning beam to night sailors."),
        ("Bank Vault", "A heavily fortified, reinforced steel room designed to safeguard cash and gold."),
        ("Volcano", "A mountain with a crater at the summit capable of spewing magma and ash."),
        ("Castle", "A medieval fortified stone fortress with towers, battlements, and a drawbridge."),
        ("Fire Station", "A garage housing sirens, hoses, tall ladders, and emergency trucks."),
        ("Camping Site", "An outdoor forest retreat with tents, sleeping bags, and a campfire.")
    ],
    "Animals & Wildlife": [
        ("Penguin", "A flightless bird equipped with flippers and a tuxedo-like coat in cold regions."),
        ("Chameleon", "A color-shifting reptile known for camouflage and independently moving eyes."),
        ("Kangaroo", "A hopping Australian marsupial with powerful hind legs and a pouch for its joey."),
        ("Great White Shark", "An apex ocean predator with rows of serrated teeth and a dorsal fin."),
        ("Platypus", "An Australian semi-aquatic mammal featuring a duck-like bill and webbed feet."),
        ("Grizzly Bear", "A massive brown woodland mammal known for winter hibernation and fishing for salmon."),
        ("Cheetah", "The fastest land animal on earth, characterized by black tear stripes and spots."),
        ("Octopus", "A highly intelligent sea creature with eight flexible arms and an ink defense mechanism."),
        ("Flamingo", "A tall pink wading bird often seen balancing gracefully on a single leg."),
        ("Bald Eagle", "A majestic bird of prey with a white head, sharp talons, and a hooked yellow beak."),
        ("Sloth", "An extremely slow tree-dwelling tropical mammal that spends life hanging upside down."),
        ("Hippopotamus", "A massive semi-aquatic African herbivore with enormous jaws and thick skin."),
        ("Koala", "A sleepy tree-climbing marsupial that feeds almost entirely on eucalyptus leaves."),
        ("Giraffe", "The tallest living land mammal, famous for its spotted coat and long neck."),
        ("Crocodile", "A prehistoric amphibious reptile with a armored scaly hide and powerful snap."),
        ("Wolf", "A cunning pack predator that communicates through howling at night."),
        ("Dolphin", "A playful, highly intelligent marine mammal that uses echolocation and leaps from waves."),
        ("Panda", "A beloved black-and-white bear native to bamboo forests in China."),
        ("Rhinoceros", "A heavy armored herbivore with one or two prominent keratin horns on its snout."),
        ("Sea Turtle", "A long-lived marine reptile with a streamlined shell and flipper legs."),
        ("Gorilla", "A strong, social ground-dwelling great ape native to African mountain forests."),
        ("Jellyfish", "A translucent gelatinous sea creature with stinging tentacles floating in ocean currents."),
        ("Peacock", "A male bird known for fanning out a spectacular, iridescent eye-patterned tail."),
        ("Hedgehog", "A small nocturnal woodland mammal covered in sharp protective quills."),
        ("Owl", "A nocturnal bird of prey with large forward-facing eyes and nearly silent flight.")
    ],
    "Food & Dining": [
        ("Sushi", "A Japanese delicacy composed of vinegared rice paired with raw fish and seaweed."),
        ("Pizza", "An oven-baked flatbread crust traditionally topped with melted mozzarella and tomato sauce."),
        ("Tacos", "A folded corn or flour tortilla packed with seasoned meat, cilantro, onions, and salsa."),
        ("Espresso", "A concentrated shot of rich coffee brewed by forcing near-boiling water through grounds."),
        ("Croissant", "A buttery, crescent-shaped French pastry famous for its flaky golden layers."),
        ("Dim Sum", "A Chinese dining style of small steamed and fried dumplings served in bamboo baskets."),
        ("Ice Cream Sundae", "A dessert of cold scoops topped with hot fudge, whipped cream, and a cherry."),
        ("Ramen", "A steaming Japanese noodle soup served in rich broth with scallions and sliced pork."),
        ("Pad Thai", "A stir-fried rice noodle dish cooked with tamarind sauce, peanuts, egg, and sprouts."),
        ("Cheeseburger", "A grilled ground beef patty topped with melted cheese nestled in a sesame seed bun."),
        ("Apple Pie", "A classic baked pastry filled with cinnamon-spiced apples beneath a golden crust."),
        ("Guacamole", "A creamy Mexican dip made from mashed ripe avocados, lime juice, and cilantro."),
        ("Burrito", "A large flour tortilla tightly wrapped around rice, beans, meat, cheese, and salsa."),
        ("Pancakes", "Flat round griddle cakes stacked high and drenched in warm maple syrup."),
        ("Barbecue Ribs", "Tender pork or beef cuts slow-cooked with a smoky sweet glaze until falling off the bone."),
        ("Donut", "A sweet fried dough ring or filled pillow glazed with sugar frosting or sprinkles."),
        ("Spaghetti", "Long thin pasta strands tossed with aromatic garlic, herbs, and savory marinara sauce."),
        ("Falafel", "Deep-fried seasoned chickpea balls served with warm pita and tahini sauce."),
        ("Chocolate Fondue", "A pot of melted warm chocolate used for dipping fruit and marshmallows."),
        ("Nachos", "Crispy tortilla chips smothered in melted cheddar cheese, jalapenos, and sour cream."),
        ("Hot Dog", "A grilled frankfurter served lengthwise in a split soft bun with mustard."),
        ("Cheesecake", "A rich baked dessert featuring a sweetened cream cheese layer atop a graham cracker crust."),
        ("French Fries", "Deep-fried baton-cut potatoes seasoned with salt and dipped in ketchup."),
        ("Curry", "A fragrant stew simmered with complex ground spices, herbs, and coconut milk or gravy."),
        ("Bagel", "A dense, boiled-then-baked bread roll with a hole in the center, often spread with cream cheese.")
    ],
    "Movies & Cinema": [
        ("Titanic", "A tragic romantic epic set aboard an ill-fated luxury passenger liner."),
        ("Jurassic Park", "A sci-fi adventure where cloned prehistoric dinosaurs escape their island enclosures."),
        ("The Matrix", "A cyberpunk classic where a hacker discovers reality is a simulated dream world."),
        ("Inception", "A heist thriller where agents infiltrate dreams to plant ideas in subconscious minds."),
        ("Avatar", "An epic adventure set on the lush alien moon Pandora among the Na'vi people."),
        ("Star Wars", "A space opera featuring Jedi knights, lightsabers, the Force, and the Galactic Empire."),
        ("Harry Potter", "A fantasy saga following a young wizard attending Hogwarts school of magic."),
        ("The Lion King", "An animated story of a lion cub learning to claim his destiny in the Pride Lands."),
        ("Avengers", "A superhero spectacle where Earth's mightiest champions team up to stop alien invasion."),
        ("Gladiator", "A historical drama about a betrayed Roman general forced into the arena to fight."),
        ("Shrek", "A fairytale parody about a grumpy green ogre and his talkative donkey companion."),
        ("Interstellar", "A space odyssey where astronauts travel through a wormhole to find humanity a new home."),
        ("Back to the Future", "A comedy adventure where a teenager travels in time using a plutonium-fueled DeLorean."),
        ("Toy Story", "An animated classic about secret toys who come alive when humans leave the room."),
        ("The Dark Knight", "A gritty superhero drama pitting Batman against the chaotic criminal mastermind Joker."),
        ("Finding Nemo", "An underwater journey of a clownfish father crossing the ocean to rescue his captured son."),
        ("Ghostbusters", "A supernatural comedy where scientists capture specters using proton packs in New York."),
        ("The Wizard of Oz", "A musical fantasy following a girl and her dog down a yellow brick road to the Emerald City."),
        ("Lord of the Rings", "An epic fantasy quest to cast a corrupting gold ring into a volcanic mountain."),
        ("Indiana Jones", "An archaeologist adventurer with a fedora, leather whip, and penchant for booby-trapped temples."),
        ("Pirates of the Caribbean", "A swashbuckling pirate tale centered on the eccentric Captain Jack Sparrow."),
        ("Jaws", "A suspense thriller about a coastal beach town terrorized by a man-eating great white shark.")
    ],
    "Professions & Careers": [
        ("Astronaut", "A person specially trained to travel and conduct research in outer space."),
        ("Detective", "An investigator who inspects clues, interviews suspects, and solves mysteries."),
        ("Brain Surgeon", "A highly specialized medical doctor who performs delicate operations on the nervous system."),
        ("Magician", "An entertainer who performs illusions, sleight-of-hand tricks, and disappearing acts."),
        ("Deep Sea Diver", "A diver equipped with pressurized gear to explore sunken wrecks and the ocean floor."),
        ("Airline Pilot", "A professional licensed to navigate commercial aircraft through the sky."),
        ("Secret Agent", "An undercover operative carrying out covert reconnaissance and intelligence missions."),
        ("Archaeologist", "A scientist who unearths ancient ruins, bones, pottery, and buried civilizations."),
        ("Rock Star", "A charismatic musician who performs loud concerts before arena crowds."),
        ("Firefighter", "A brave first responder who combats blazes and conducts emergency rescues."),
        ("Executive Chef", "The master culinarian responsible for kitchen leadership, recipes, and fine dining."),
        ("Blacksmith", "An artisan who heats metal in a forge and hammers it into tools and blades."),
        ("Lifeguard", "A certified swimmer stationed by a beach or pool to ensure water safety."),
        ("Stunt Performer", "A daring actor who performs falls, crashes, and fiery stunts on camera."),
        ("Flight Attendant", "A cabin crew member ensuring passenger comfort and emergency safety in flight."),
        ("Architect", "A designer who drafts blueprints and technical plans for buildings and structures."),
        ("Journalist", "A reporter who investigates stories, interviews witnesses, and writes news articles."),
        ("Veterinarian", "A healthcare professional devoted to diagnosing and treating animal ailments."),
        ("Judge", "A legal official who presides over courtrooms, enforces law, and delivers sentences."),
        ("Paleontologist", "A researcher who studies fossilized dinosaur bones and prehistoric life."),
        ("Electrician", "A tradesperson who installs, tests, and repairs electrical wiring and fixtures."),
        ("Plumber", "A technician who installs and repairs pipes, valves, and water drainage systems."),
        ("Photographer", "An artist who captures images using cameras, lenses, and specialized lighting."),
        ("Librarian", "A specialist who curates information, archives collections, and organizes library books.")
    ],
    "Household Objects": [
        ("Toaster", "A kitchen appliance that toasts slices of bread using heated electric coils."),
        ("Blender", "A motorized countertop jar with spinning blades that purees smoothies and soups."),
        ("Vacuum Cleaner", "A motorized cleaning machine that sucks dirt and dust out of carpets."),
        ("Microwave Oven", "An electronic kitchen box that rapidly heats food with electromagnetic radiation."),
        ("Alarm Clock", "A bedside timer designed to wake a sleeper with loud chimes or buzzing."),
        ("Television", "An electronic screen that displays broadcast shows, movies, and streams."),
        ("Refrigerator", "A chilled upright insulated cabinet that preserves perishable groceries."),
        ("Washing Machine", "An automated laundry appliance that cleans clothes with water and detergent."),
        ("Coffee Maker", "A brewing device that drips hot water over roasted beans into a carafe."),
        ("Hairdryer", "A handheld blower that streams hot air to quickly dry wet hair."),
        ("Dishwasher", "A kitchen machine that cleans dishes and cutlery with pressurized hot water jets."),
        ("Ironing Board", "A flat padded folding table used for pressing wrinkles out of clothing."),
        ("Ceiling Fan", "A ceiling-mounted rotating propeller that circulates cool air through a room."),
        ("Electric Kettle", "A countertop jug with an internal heating element to boil water quickly."),
        ("Lawn Mower", "A machine with rotating blades used to trim grass to an even height."),
        ("Flashlight", "A portable battery-powered electric torch that casts a focused beam of light."),
        ("Umbrella", "A folding fabric canopy supported by ribs designed to shield against rain."),
        ("Electric Toothbrush", "A battery-powered dental wand with a vibrating bristled head."),
        ("Bookshelf", "A piece of upright wooden furniture with horizontal shelves for reading material."),
        ("Mirror", "A reflective glass surface that produces a clear image of whatever faces it."),
        ("Air Conditioner", "A climate control appliance that cools and dehumidifies indoor air."),
        ("Thermometer", "A calibrated instrument used to gauge and display ambient or body temperature.")
    ],
    "Sports & Athletics": [
        ("Scuba Diving", "An underwater swimming activity using self-contained breathing equipment."),
        ("Rock Climbing", "The sport of ascending natural cliffs or artificial climbing walls with harnesses."),
        ("Skateboarding", "Riding and performing flip tricks on a wooden deck mounted on four wheels."),
        ("Bungee Jumping", "Leaping from a high bridge or crane while attached to an elastic cord."),
        ("Surfing", "Riding ocean waves toward shore while standing upright on a buoyant board."),
        ("Archery", "The skill and sport of shooting arrows with a bow at a bullseye target."),
        ("Ice Hockey", "A fast-paced winter sport where players on skates shoot a puck into a net."),
        ("Skydiving", "Jumping from an airplane at high altitude and free-falling before opening a parachute."),
        ("Ten-Pin Bowling", "Rolling a heavy ball down a wooden lane to knock down triangular pins."),
        ("Fencing", "A combat sport involving swift dueling with blunted foil, epee, or sabre swords."),
        ("Gymnastics", "A sport of athletic routines requiring balance, flips, beam work, and bars."),
        ("Karate", "A traditional martial art featuring punches, kicks, and open-hand strikes."),
        ("Snowboarding", "Gliding down a snow-covered hill with both boots strapped to a single board."),
        ("Table Tennis", "A parlor game where players hit a lightweight hollow ball across a net with paddles."),
        ("Golf", "A club-and-ball sport where players aim to sink balls into 18 holes in fewest strokes."),
        ("Horseback Riding", "The practice of riding and guiding an equestrian partner through courses or trails."),
        ("Deep Sea Fishing", "Angling for large oceanic fish using heavy rods and lures far from the coast."),
        ("Roller Skating", "Gliding on smooth surfaces wearing boots fitted with small wheels."),
        ("Yoga", "A mind-body practice combining physical poses, breathing control, and meditation."),
        ("Dodgeball", "A team game where players throw rubber balls to eliminate opponents upon impact."),
        ("Basketball", "A sport where teams dribble and shoot a spherical ball into an elevated hoop."),
        ("Volleyball", "A net game where two teams hit a ball back and forth with hands and arms.")
    ],
    "Superheroes & Sci-Fi": [
        ("Batman", "The billionaire vigilante of Gotham City who fights crime with gadgets and martial arts."),
        ("Spider-Man", "A friendly neighborhood hero who swings from webs and possesses a spider-sense."),
        ("Iron Man", "A brilliant inventor in high-tech powered armor equipped with repulsor blasts."),
        ("Superman", "The Man of Steel from planet Krypton who can fly and shoot heat vision."),
        ("Wonder Woman", "An Amazon warrior princess equipped with a lasso of truth and bulletproof bracelets."),
        ("Darth Vader", "A fallen Jedi Knight who wears black life-support armor and wields a red lightsaber."),
        ("Yoda", "A legendary, diminutive green Jedi Grand Master wise in the ways of the Force."),
        ("Thor", "The Norse God of Thunder who commands lightning and wields an enchanted hammer."),
        ("The Hulk", "A scientist who transforms into an enormous green behemoth of pure brute strength."),
        ("Deadpool", "A fourth-wall-breaking mercenary with hyper-regeneration and dual katanas."),
        ("Wolverine", "A mutant warrior with a rapid healing factor, keen senses, and adamantium claws."),
        ("Captain America", "A super-soldier from World War II who wields an indestructible vibranium shield."),
        ("Thanos", "A galactic titan obsessed with balancing the universe using six Infinity Stones."),
        ("Doctor Strange", "The Sorcerer Supreme who defends Earth against mystical and interdimensional threats."),
        ("The Flash", "A hero who taps into the Speed Force to run at velocities surpassing the speed of light."),
        ("Cyberpunk Cyborg", "A human enhanced with cybernetic limbs, optical implants, and digital brains."),
        ("Time Traveler", "An explorer who navigates backward and forward across historical eras."),
        ("Alien Invader", "An extraterrestrial being piloting a flying saucer to conquer distant worlds."),
        ("Optimus Prime", "The noble leader of the Autobots who can transform into a heavy semi-truck."),
        ("Godzilla", "A gigantic prehistoric sea monster awakened by radiation with atomic breath.")
    ],
    "Mythology & Fantasy": [
        ("Dragon", "A legendary winged reptilian beast that hoards treasure and breathes fire."),
        ("Unicorn", "A pure, mythical white equine creature possessing a single spiraled forehead horn."),
        ("Phoenix", "A sacred firebird that burns brightly upon death and is reborn from its own ashes."),
        ("Mermaid", "A mythical aquatic maiden with the upper body of a human and the tail of a fish."),
        ("Centaur", "A creature with the torso and head of a human joined to the body and legs of a horse."),
        ("Griffin", "A legendary guardian beast with the head and wings of an eagle and body of a lion."),
        ("Werewolf", "A cursed human who transforms into a ravenous wolf under a full moon."),
        ("Vampire", "An immortal undead nocturnal creature that drinks blood and avoids sunlight and garlic."),
        ("Leprechaun", "A cunning Irish fairy cobbler who hides a pot of gold at the end of the rainbow."),
        ("Pegasus", "A divine winged stallion capable of soaring across Olympian skies."),
        ("Cyclops", "A giant member of a primordial race possessing a single round eye in the middle of his forehead."),
        ("Minotaur", "A mythological monster with the head of a bull and body of a man trapped in a labyrinth."),
        ("Kraken", "A colossal tentacled sea monster capable of pulling entire sailing ships under waves."),
        ("Wizard", "A wise spellcaster who wields magical tomes, potions, and a glowing wooden staff."),
        ("Fairy", "A tiny mythical being with gossamer insect wings and magical dust."),
        ("Goblin", "A mischievous, diminutive folklore creature with pointed ears and a love for mischief."),
        ("Bigfoot", "A giant ape-like cryptid said to roam and leave enormous footprints in misty forests."),
        ("Loch Ness Monster", "A long-necked cryptid rumored to inhabit the deep dark waters of a Scottish lake."),
        ("Medusa", "A gorgon cursed with venomous snakes for hair whose gaze turns beholders into stone."),
        ("Genie", "A magical spirit bound to an oil lamp that grants three wishes to whoever rubs it.")
    ],
    "Vehicles & Transport": [
        ("Helicopter", "An aircraft that takes off and hovers vertically using horizontal overhead rotors."),
        ("Hot Air Balloon", "A large envelope filled with heated buoyant air carrying passengers in a basket."),
        ("Bulldozer", "A heavy crawler tractor fitted with a substantial front metal blade for pushing earth."),
        ("Jet Ski", "A compact personal watercraft operated like a motorbike skimming across waves."),
        ("Steam Locomotive", "A historic rail engine powered by burning coal to boil water into pressurized steam."),
        ("Monster Truck", "A customized pickup truck equipped with colossal oversized suspension and giant tires."),
        ("Ambulance", "A specialized emergency medical vehicle equipped with sirens and life support."),
        ("Hovercraft", "A vehicle that glides effortlessly over land and water atop a trapped cushion of air."),
        ("Cable Car", "An aerial tramway cabin suspended from overhead moving cables across mountains."),
        ("Garbage Truck", "A municipal truck fitted with a hydraulic compactor to collect neighborhood waste."),
        ("Zamboni", "An ice-resurfacing machine that cleans and smoothens ice rinks between hockey periods."),
        ("Formula 1 Car", "An ultra-light, open-wheel racing vehicle designed for extreme high-speed cornering."),
        ("Tuk Tuk", "A three-wheeled motorized rickshaw commonly used for urban transit in Asian cities."),
        ("Go-Kart", "A low-slung, open-wheel miniature racing vehicle driven on indoor and outdoor tracks."),
        ("Snowmobile", "A motorized winter sled powered by rear tracks with front steerable skis."),
        ("Subway Train", "An underground electric railway train that shuttles thousands of city commuters."),
        ("Fire Engine", "A red emergency vehicle fitted with long extension ladders, sirens, and water pumps."),
        ("Space Shuttle", "A reusable spacecraft designed for carrying crews and cargo into low Earth orbit."),
        ("Forklift", "A powered industrial truck used to lift and transport heavy palletized materials in warehouses."),
        ("Tractor", "A powerful farm vehicle equipped with high-tread tires to pull agricultural equipment."),
        ("Motorcycle", "A two-wheeled motor-driven vehicle known for speed and open-air riding."),
        ("Paddleboard", "A long buoyant board propelled across calm waters by a standing person with a paddle.")
    ],
    "Music & Instruments": [
        ("Electric Guitar", "A fretted stringed instrument that converts string vibrations into electrical signals through pickups."),
        ("Grand Piano", "A large acoustic keyboard instrument with strings struck by hammers within a horizontal wooden case."),
        ("Saxophone", "A curved brass woodwind instrument played with a single reed, prominent in jazz."),
        ("Bagpipes", "A traditional Celtic wind instrument played by squeezing air from a bag through melodic pipes."),
        ("Drum Kit", "A collection of percussion drums, cymbals, and foot pedals played with wooden sticks."),
        ("Violin", "A small four-stringed wooden instrument played with a horsehair bow resting under the chin."),
        ("Accordion", "A portable box-shaped bellows instrument with hand keys and buttons on opposite sides."),
        ("Harp", "A large triangular plucked string instrument with vertical strings set in an open frame."),
        ("Trumpet", "A brilliant brass instrument with three piston valves that plays high, piercing fanfares."),
        ("Ukulele", "A small four-stringed Hawaiian acoustic guitar with a light, cheerful pluck."),
        ("DJ Turntable", "A device used to spin and scratch vinyl records to mix beats in dance clubs."),
        ("Flute", "A slender reedless woodwind instrument played by blowing air across an open mouth hole."),
        ("Cello", "A deep, resonant bowed string instrument played resting on the floor between the musician's knees."),
        ("Harmonica", "A pocket-sized free-reed mouth organ played by inhaling and exhaling through channels."),
        ("Synthesizer", "An electronic keyboard capable of generating and manipulating complex audio waveforms."),
        ("Trombone", "A brass instrument distinguished by a long telescoping slide used to change musical pitch."),
        ("Banjo", "A stringed instrument with a thin circular membrane stretched over a frame like a drumhead."),
        ("Clarinet", "A cylindrical black woodwind instrument with a flared bell and a single reed."),
        ("Xylophone", "A percussion instrument consisting of wooden bars struck with mallets to produce notes."),
        ("Microphone", "An acoustic-to-electric transducer that amplifies and records vocal performances.")
    ],
    "Nature & Wonders": [
        ("Tornado", "A violently rotating funnel-shaped column of air extending from a storm cloud to the ground."),
        ("Northern Lights", "A celestial aurora of shimmering green and violet lights dancing across polar night skies."),
        ("Waterfall", "A steep cascade where a river or stream tumbles over a vertical rock ledge."),
        ("Avalanche", "A massive, sudden slide of snow and ice tumbling rapidly down a steep mountain slope."),
        ("Coral Reef", "An underwater marine ecosystem built by colonies of tiny calcium-carbonate secreting organisms."),
        ("Desert Oasis", "An isolated fertile area in an arid desert sustained by a natural freshwater spring."),
        ("Rainbow", "A multicolored circular optical arc caused by reflection and refraction of sunlight in raindrops."),
        ("Geyser", "A natural hot spring that periodically erupts with a towering jet of steam and boiling water."),
        ("Grand Canyon", "An immense, steep-sided gorge carved out over millions of years by a winding river."),
        ("Tropical Rainforest", "A dense, high-canopy jungle characterized by high annual rainfall and biodiversity."),
        ("Thunderstorm", "A transient weather storm accompanied by dark cumulonimbus clouds, lightning, and heavy rain."),
        ("Glacier", "A colossal, persistent body of dense ancient ice that moves slowly under its own weight."),
        ("Quicksand", "A colloid of loose sand, clay, and water that yields easily to weight and traps objects."),
        ("Solar Eclipse", "A rare celestial phenomenon where the moon passes directly between the Earth and the Sun."),
        ("Underground Cave", "A natural hollow underground subterranean passage lined with stalactites and stalagmites."),
        ("Sand Dune", "A wind-sculpted ridge or hill of loose sand common in desert and beach landscapes."),
        ("Meteor Shower", "A celestial event where numerous space debris trails burn brightly upon entering Earth's atmosphere."),
        ("Tsunami", "A series of immense ocean waves generated by an undersea earthquake or volcanic eruption."),
        ("Hot Spring", "A geothermal pool of naturally heated groundwater emerging from the Earth's crust."),
        ("Iceberg", "A massive chunk of freshwater ice that has broken off a glacier and floats in open seawater.")
    ],
    "Video Games & Tech": [
        ("Minecraft", "A blockbuster sandbox game where players mine blocky resources and build infinite worlds."),
        ("Super Mario", "The mustachioed Nintendo hero who stomps Goombas, eats mushrooms, and rescues Princess Peach."),
        ("Pokemon", "A creature-catching adventure where trainers collect monsters in red-and-white capsules."),
        ("Tetris", "A legendary puzzle game where falling geometric tetromino blocks must be cleared in solid lines."),
        ("Pac-Man", "An arcade icon who navigates blue mazes eating dots while fleeing four colorful ghosts."),
        ("Sonic the Hedgehog", "A blue anthropomorphic speedster who dashes through loops collecting golden rings."),
        ("The Legend of Zelda", "A fantasy quest following Link as he wields the Master Sword to rescue the princess of Hyrule."),
        ("Fortnite", "A battle royale phenomenon where 100 players skydive onto an island, build, and duel."),
        ("Among Us", "A multiplayer deduction game where bean astronauts complete tasks while hunting an alien imposter."),
        ("Virtual Reality Headset", "A wearable display unit that immerses the user's vision and senses into a 3D digital world."),
        ("Drone", "An unmanned aerial quadcopter controlled remotely with cameras for aerial photography."),
        ("Smartwatch", "A wearable wristwatch computer that tracks fitness metrics, heart rate, and notifications."),
        ("3D Printer", "A manufacturing machine that builds three-dimensional objects layer by layer from melted filament."),
        ("Smartphone", "A pocket touchscreen computer capable of cellular calls, browsing, and mobile gaming."),
        ("Gaming PC", "A customized desktop computer equipped with high-end graphics cards, RGB lights, and liquid cooling."),
        ("Donkey Kong", "A classic arcade title featuring a barrel-hurling ape atop industrial steel girders."),
        ("Game Boy", "A classic handheld 8-bit gaming console powered by AA batteries and swappable gray cartridges."),
        ("Roblox", "An online gaming platform and game creation system allowing users to program and share games."),
        ("PlayStation", "A flagship home video game console series celebrated for high-fidelity interactive storytelling."),
        ("Wi-Fi Router", "A networking device that broadcasts wireless internet signals to nearby connected devices."),
        ("Cyberpunk", "A gritty futuristic genre contrasting high technology with low, gritty street life."),
        ("Cybersecurity Hacker", "A digital specialist who tests, penetrates, or defends computerized networks and security.")
    ],
    "School & Campus": [
        ("Science Lab", "A classroom stocked with test tubes, Bunsen burners, goggles, and safety showers."),
        ("School Cafeteria", "A noisy communal hall where students line up with plastic trays for hot lunches."),
        ("Gymnasium", "A large indoor sports court with polished wooden floors, bleachers, and basketball nets."),
        ("Principal's Office", "The administrative room where the chief authority of the school conducts official business."),
        ("Chalkboard", "A large reusable dark writing surface marked with white or colored chalk sticks."),
        ("Backpack", "A durable fabric sack with shoulder straps used to haul textbooks, notebooks, and pencil cases."),
        ("School Bus", "A bright yellow passenger vehicle that picks up students along neighborhood routes."),
        ("Compound Microscope", "An optical instrument that magnifies microscopic slides using multiple lenses and mirrors."),
        ("Graduation Cap", "A traditional square mortarboard hat with a tassel tossed into the air by graduates."),
        ("Report Card", "A formal document sent home to parents grading academic performance and attendance."),
        ("Hallway Locker", "A narrow metal storage compartment with a combination dial lock in school corridors."),
        ("Playground", "An outdoor recreation area equipped with swings, slides, monkey bars, and a sandbox."),
        ("Pop Quiz", "An unannounced short test given to students to evaluate recent lecture material."),
        ("Pencil Sharpener", "A mechanical or electric tool that whittles a lead graphite pencil to a fine point."),
        ("School Auditorium", "A grand indoor assembly hall where theatrical plays, concerts, and ceremonies occur."),
        ("Detention", "A disciplinary punishment requiring misbehaving students to remain in a classroom after school."),
        ("Field Trip", "An educational class excursion outside the school building to a museum, farm, or historic site."),
        ("Yearbook", "An annual commemorative hardbound photo book celebrating the student body and school clubs."),
        ("Spelling Bee", "A competitive event where contestants are challenged to spell out spoken words letter-by-letter."),
        ("Lunchbox", "A portable insulated container packed with sandwiches, fruit, and snacks for mid-day eating.")
    ]
}

# Derived plain word lists for backward compatibility and candidate display
WORD_PACKS: Dict[str, List[str]] = {
    category: [word for word, _ in pairs]
    for category, pairs in WORD_PACKS_HINTS.items()
}

# Word to hint mapping for quick lookup
HINTS_BY_WORD: Dict[str, str] = {
    word: hint
    for pairs in WORD_PACKS_HINTS.values()
    for word, hint in pairs
}


class ImposterGame(BasePartyGame):
    id = "imposter"
    name = "Find the Imposter"
    tagline = "Spot the Chameleon Among You."
    description = "One player is the Imposter who doesn't know the secret word. Can the crew catch them before they blend in?"
    icon = "🦎"
    min_players = 3
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], recent_imposters: Optional[List[str]] = None, **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.recent_imposters: List[str] = list(recent_imposters or [])
        self.imposter_ids: List[str] = []
        self.category: str = ""
        self.secret_word: str = ""
        self.word_hint: str = ""
        self.clue_order: List[str] = []
        self.votes: Dict[str, str] = {}
        self.voted_out_id: Optional[str] = None
        self.imposter_guess: Optional[str] = None
        self.imposter_guess_correct: bool = False
        self.winner: Optional[str] = None

    def start(self) -> None:
        pids = list(self.players.keys())

        # 1. Fair Imposter Selection:
        # Prioritize players who have NOT been imposter recently
        eligible = [pid for pid in pids if pid not in self.recent_imposters]
        if not eligible:
            # All players have had a turn as imposter: reset pool but exclude the most recent imposter
            last_imp = self.recent_imposters[-1] if self.recent_imposters else None
            eligible = [pid for pid in pids if pid != last_imp] or pids

        random.shuffle(eligible)
        num_imposters = 1 if len(pids) < 7 else 2
        self.imposter_ids = eligible[:num_imposters]

        # In case we needed 2 imposters and eligible only had 1
        if len(self.imposter_ids) < num_imposters:
            remaining = [pid for pid in pids if pid not in self.imposter_ids]
            random.shuffle(remaining)
            self.imposter_ids.extend(remaining[:num_imposters - len(self.imposter_ids)])

        # 2. Speaking clue order: COMPLETELY INDEPENDENT RANDOM SHUFFLE
        self.clue_order = pids[:]
        random.shuffle(self.clue_order)

        # Ensure the Imposter does not always have to speak first (when players >= 3)
        if len(self.clue_order) > 2 and self.clue_order[0] in self.imposter_ids:
            swap_idx = random.randint(1, len(self.clue_order) - 1)
            self.clue_order[0], self.clue_order[swap_idx] = self.clue_order[swap_idx], self.clue_order[0]

        # 3. Word & Hint Selection
        self.category = random.choice(list(WORD_PACKS_HINTS.keys()))
        word_pairs = WORD_PACKS_HINTS[self.category]
        self.secret_word, self.word_hint = random.choice(word_pairs)

        self.phase = "WORD_REVEAL"
        self.phase_timer = 10.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "WORD_REVEAL":
            self.phase = "CLUE_ROUNDS"
            self.phase_timer = 75.0
            return self.phase
        elif self.phase == "CLUE_ROUNDS":
            self.phase = "VOTING"
            self.phase_timer = 30.0
            self.votes.clear()
            return self.phase
        elif self.phase == "VOTING":
            self.resolve_voting()
            return self.phase
        elif self.phase == "IMPOSTER_GUESS":
            self.resolve_guess()
            return self.phase
        return None

    def resolve_voting(self) -> None:
        tally: Dict[str, int] = {}
        for target in self.votes.values():
            tally[target] = tally.get(target, 0) + 1

        if tally:
            self.voted_out_id = max(tally, key=tally.get)
        else:
            self.voted_out_id = random.choice(list(self.players.keys()))

        if self.voted_out_id in self.imposter_ids:
            # Imposter caught! Give them 18 seconds to clutch-guess the word
            self.phase = "IMPOSTER_GUESS"
            self.phase_timer = 18.0
        else:
            # Imposter escaped detection! Imposter wins!
            self.winner = "IMPOSTER"
            for imp in self.imposter_ids:
                self.scores[imp] += 300
            self.phase = "GAME_OVER"
            self.is_over = True

    def resolve_guess(self) -> None:
        if self.imposter_guess and self.imposter_guess.strip().lower() == self.secret_word.lower():
            self.imposter_guess_correct = True
            self.winner = "IMPOSTER"
            for imp in self.imposter_ids:
                self.scores[imp] += 400
        else:
            self.imposter_guess_correct = False
            self.winner = "CREW"
            for pid in self.players:
                if pid not in self.imposter_ids:
                    self.scores[pid] += 200

        self.phase = "GAME_OVER"
        self.is_over = True

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "VOTING" and action == "CAST_VOTE":
            target_id = data.get("target_id")
            if target_id and target_id in self.players and target_id != player_id:
                self.votes[player_id] = target_id
                if len(self.votes) == len(self.players):
                    self.resolve_voting()
                return {"broadcast": True}

        elif self.phase == "IMPOSTER_GUESS" and action in ("GUESS_WORD", "SUBMIT_GUESS"):
            if player_id in self.imposter_ids:
                self.imposter_guess = data.get("guess", "").strip()
                self.resolve_guess()
                return {"broadcast": True}

        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        """Big Screen TV view. Does NOT leak secret word or imposter identity until GAME_OVER!"""
        state = self.get_base_state()
        for p in state["players"]:
            p["is_imposter"] = (p["id"] in self.imposter_ids) if self.phase == "GAME_OVER" else None

        state.update({
            "category": self.category,
            "secret_word": self.secret_word if self.phase == "GAME_OVER" else None,
            "clue_order": [self.players[pid].nickname for pid in self.clue_order if pid in self.players],
            "voted_out_name": self.players[self.voted_out_id].nickname if self.voted_out_id else None,
            "voted_out_was_imposter": (self.voted_out_id in self.imposter_ids) if self.voted_out_id else None,
            "imposter_guess": self.imposter_guess,
            "imposter_guess_correct": self.imposter_guess_correct,
            "winner": self.winner,
            "candidate_words": WORD_PACKS.get(self.category, []),
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        """Private mobile controller view. Imposter never gets the secret word!"""
        is_imposter = player_id in self.imposter_ids

        candidates = [
            {"id": pid, "nickname": p.nickname, "avatar": p.avatar}
            for pid, p in self.players.items()
            if pid != player_id
        ]

        return {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "category": self.category,
            "is_imposter": is_imposter,
            "secret_word": "???" if is_imposter else self.secret_word,
            "imposter_hint": self.word_hint if is_imposter else None,
            "candidates": candidates,
            "my_vote": self.votes.get(player_id),
            "candidate_words": WORD_PACKS.get(self.category, []),
            "score": self.scores.get(player_id, 0),
        }
