-- Leftover file supplements (reputation factions, set-bonus membership, personal-trait career).
-- kind selects the Cargo table; payload is the Cargo-shaped record that table's merger already accepts.
-- Inserts only Reputation, SetBonus, and Traits. Modifier rows stay as previously seeded.

INSERT INTO "CatalogSupplement" ("kind", "key", "variant", "payload", "updatedAt")
VALUES
  (
    'Reputation',
    'Dyson Joint Command',
    '',
    $supp${"name":"Dyson Joint Command","color1":"#2e86ab","color2":"#a0c1b9","icon":"File:Dyson Mark icon.png","link":"Reputation: Dyson Joint Command","description":"Dyson Joint Command is a coalition of forces from the Federation, the Klingon Empire and the Romulan Republic. Because the Romulans have an alliance with both the Federation and the Empire, their officers have been placed in charge of the command structure in the Solanae Dyson Sphere, although individual officers still report to their respective commanding officers. Our purpose is to explore the sphere, to contain and control any dangerous technology there, and to neutralize the threat of Omega particles.","released":"Season Eight: The Sphere","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    '8472 Counter-Command',
    '',
    $supp${"name":"8472 Counter-Command","color1":"#6b3fa0","color2":"#a0c1b9","icon":"File:8472 Mark icon.png","link":"Reputation: 8472 Counter-Command","description":"8472 Counter-Command is a cross-faction task force dedicated to stopping the Undine threat in normal space. The Undine's new aggressive posture may be due to the opening of the gateways between the Solanae and Jenolan Dyson Spheres, which give the Undine access to some of the most protected planets in the Alpha and Beta Quadrants. However, some of our experts theorize that their leader, a former infiltrator, may be the reason the attacks have increased. Whatever the reason, our job is to protect our homes and push the Undine back to Fluidic space.","released":"Season Nine: A New Accord","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Delta Alliance',
    '',
    $supp${"name":"Delta Alliance","color1":"#5b2c6f","color2":"#a0c1b9","icon":"File:Delta Mark icon.png","link":"Reputation: Delta Alliance","description":"After U.S.S. Voyager returned home from the Delta Quadrant in 2378, Starfleet launched Project Voyager, a program to analyze the technology and data the ship collected during its seven-year journey and adapt it for use on all Starfleet vessels. Now that the gateway to the Delta Quadrant has been opened and a joint alliance will be operating in the region, the SCE is sharing its research with counterparts from the Klingon Defense Force and the Romulan Republic Militia to help equip all ships taking part in Operation Delta Rising for the challenges they will face in the Delta Quadrant.","released":"Delta Rising","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Iconian Resistance',
    '',
    $supp${"name":"Iconian Resistance","color1":"#8b0000","color2":"#a0c1b9","icon":"File:Iconian Mark icon.png","link":"Reputation: Iconian Resistance","description":"The Iconian Resistance is an alliance comprised of the forces of the Alpha, Beta, and Delta Quadrants. We have banded together to create a unified front against the Iconians and their servitor races. The Iconians will never again subjugate our galaxy.","released":"Season Ten: The Iconian War","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Terran Task Force',
    '',
    $supp${"name":"Terran Task Force","color1":"#a0522d","color2":"#a0c1b9","icon":"File:Terran Mark icon.png","link":"Reputation: Terran Task Force","description":"The Terran Task Force is a joint venture between the Klingon Empire, Romulan Republic, and United Federation of Planets. Using technology originally developed by the Klingon's secretive House Pegh to combat the Federation, the Task Force seeks to halt the Terran Empire's attempts to conquer territory, and drive them back to the Universe they came from.","released":"Season Eleven: New Dawn","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Temporal Defense Initiative',
    '',
    $supp${"name":"Temporal Defense Initiative","color1":"#1a5276","color2":"#a0c1b9","icon":"File:Temporal Mark icon.png","link":"Reputation: Temporal Defense Initiative","description":"The Temporal Defense Initiative will be established in 2769 when most of the significant galactic powers sign the Temporal Accords. Comprised of Temporal Operatives from all signatories across multiple historical periods, the TDI defends the timeline against attempts to alter our common history.","released":"Agents of Yesterday","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Lukari Restoration Initiative',
    '',
    $supp${"name":"Lukari Restoration Initiative","color1":"#148f77","color2":"#a0c1b9","icon":"File:Lukari Mark icon.png","link":"Reputation: Lukari Restoration Initiative","description":"Seeing the Tzenkethi's rampant use of protomatter for destructive purposes, the Lukari Restoration Initiative has agreed to work together to restore affected planets and to prevent the Tzenkethi from performing further atrocities. While not formally part of the Alliance, the Initiative still receives ample support from Klingon, Romulan, and Starfleet interests.","released":"Season Twelve: Reckoning","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Competitive Wargames',
    '',
    $supp${"name":"Competitive Wargames","color1":"#b9770e","color2":"#a0c1b9","icon":"File:Competitive Mark icon.png","link":"Reputation: Competitive Wargames","description":"Competitive Wargames were created as a measure of skill - a friendly way for members of the Alliance to prove their strength to one another while preserving peace and honor. Join now in an endeavor to show your worth and be rewarded with equipment befit for those willing to face the trails of combat.","released":"Season Thirteen: Escalation","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Gamma Task Force',
    '',
    $supp${"name":"Gamma Task Force","color1":"#117a65","color2":"#a0c1b9","icon":"File:Gamma Mark icon.png","link":"Reputation: Gamma Task Force","description":"The Gamma Task Force represents a coalition of forces formed to curb new threats pouring out of the Gamma Quadrant. The combination of top scientific organizations and military forces around the galaxy, this Task Force exists to ensure that the galaxy will survive these new threats intact and together.","released":"Victory is Life","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Reputation',
    'Discovery Legends',
    '',
    $supp${"name":"Discovery Legends","color1":"#1c2833","color2":"#a0c1b9","icon":"File:Discovery Mark icon.png","link":"Reputation: Discovery Legends","description":"The Discovery Legends expedition represents an effort to catalogue and capture the unique technologies, insights, and psychographic profiles that enabled a small group of individuals to have such an impact on the future of the galaxy. Much of this influence occured in the dark, on classified missions against unpublicized enemies, complicating the effort greatly. Captains across the Alliance are being asked to help gather the pieces of this grand puzzle, that we might learn from history instead of repeat it.","released":"Rise of Discovery","environment":null,"boff":null,"secondary":null}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'SetBonus',
    'Nausicaan Weaponry Augmentation (2)',
    '',
    $supp${"Name":"Nausicaan Weaponry Augmentation (2)","SetPage":"Nausicaan Weaponry Augmentation","ReqItems":"2","Passives":"On Hold: Disruptor Damage per sec for 5 sec (Nausicaan Weaponry Augmentation).","TraySkills":null,"Procs":null,"Abilities":null,"Members":"Nausicaan Energy Torpedo Launcher\nNausicaan Disruptor *\nConsole - Science - Nausicaan Siphon Capacitor"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'SetBonus',
    'Nausicaan Weaponry Augmentation (3)',
    '',
    $supp${"Name":"Nausicaan Weaponry Augmentation (3)","SetPage":"Nausicaan Weaponry Augmentation","ReqItems":"3","Passives":null,"TraySkills":null,"Procs":null,"Abilities":null,"Members":"Nausicaan Energy Torpedo Launcher\nNausicaan Disruptor *\nConsole - Science - Nausicaan Siphon Capacitor"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'SetBonus',
    'Bio-Molecular Instability',
    '',
    $supp${"Name":"Bio-Molecular Instability","SetPage":"Counter-Command Ordnance","ReqItems":"2","Passives":"+7.5% Bonus Phaser, Disruptor, Plasma, and Tetryon Energy Damage; 2% increased chance for Bio-Molecular weapons to apply their Incubation debuffs","TraySkills":null,"Procs":null,"Abilities":null,"Members":"Heavy Bio-Molecular * Turret\nEnhanced Bio-Molecular Photon Torpedo Launcher\nConsole - Universal - Hydrodynamics Compensator\nConsole - Tactical - Counter-Command Multi-Conduit Energy Relay"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'SetBonus',
    'Heavy Bio-Molecular Turret Barrage',
    '',
    $supp${"Name":"Heavy Bio-Molecular Turret Barrage","SetPage":"Counter-Command Ordnance","ReqItems":"3","Passives":null,"TraySkills":null,"Procs":"Targets Self; 3 min Recharge; Upgrades your Heavy Bio-Molecular Turret to deal damage to foes within 5km. Applies Bio-Molecular Incubation to all affected targets.","Abilities":null,"Members":"Heavy Bio-Molecular * Turret\nEnhanced Bio-Molecular Photon Torpedo Launcher\nConsole - Universal - Hydrodynamics Compensator\nConsole - Tactical - Counter-Command Multi-Conduit Energy Relay"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'SetBonus',
    'Degenerative Wave Signature',
    '',
    $supp${"Name":"Degenerative Wave Signature","SetPage":"Counter-Command Ordnance","ReqItems":"4","Passives":"Energy Weapons have a 1% chance to: Reduce Hull Healing by 50% for 10 sec; Disable Hull Regeneration for 10 sec; Remove one active Heal-Over-Time effect. Chance increases to 10% vs. Undine.","TraySkills":null,"Procs":null,"Abilities":null,"Members":"Heavy Bio-Molecular * Turret\nEnhanced Bio-Molecular Photon Torpedo Launcher\nConsole - Universal - Hydrodynamics Compensator\nConsole - Tactical - Counter-Command Multi-Conduit Energy Relay"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'A Good Day to Die',
    '',
    $supp${"name":"A Good Day to Die","type":"char","environment":"space","career":"tac"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Coordinated Targeting Solution',
    '',
    $supp${"name":"Coordinated Targeting Solution","type":"char","environment":"space","career":"tac"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Fleet Tactician',
    '',
    $supp${"name":"Fleet Tactician","type":"char","environment":"space","career":"tac"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Fleet Technician',
    '',
    $supp${"name":"Fleet Technician","type":"char","environment":"space","career":"eng"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Fleet Physicist',
    '',
    $supp${"name":"Fleet Physicist","type":"char","environment":"space","career":"sci"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Nadion Bypass',
    '',
    $supp${"name":"Nadion Bypass","type":"char","environment":"space","career":"eng"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Photonic Reinforcement',
    '',
    $supp${"name":"Photonic Reinforcement","type":"char","environment":"space","career":"sci"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Subnucleonic Transferal',
    '',
    $supp${"name":"Subnucleonic Transferal","type":"char","environment":"space","career":"sci"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Tactical Vigilance',
    '',
    $supp${"name":"Tactical Vigilance","type":"char","environment":"ground","career":"tac"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Combined Assault',
    '',
    $supp${"name":"Combined Assault","type":"char","environment":"ground","career":"tac"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Security Detail',
    '',
    $supp${"name":"Security Detail","type":"char","environment":"ground","career":"tac"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Orbital Devastation',
    '',
    $supp${"name":"Orbital Devastation","type":"char","environment":"ground","career":"eng"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Assault Drone Fabrication',
    '',
    $supp${"name":"Assault Drone Fabrication","type":"char","environment":"ground","career":"eng"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Distributed Shield Rerouting',
    '',
    $supp${"name":"Distributed Shield Rerouting","type":"char","environment":"ground","career":"eng"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Subspace Manipulator',
    '',
    $supp${"name":"Subspace Manipulator","type":"char","environment":"ground","career":"sci"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Nanoprobe Contagion',
    '',
    $supp${"name":"Nanoprobe Contagion","type":"char","environment":"ground","career":"sci"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Traits',
    'Tricorder Analysis',
    '',
    $supp${"name":"Tricorder Analysis","type":"char","environment":"ground","career":"sci"}$supp$::jsonb,
    CURRENT_TIMESTAMP
  );
