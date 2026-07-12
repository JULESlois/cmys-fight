# Weapon Art Reference Register

This register documents the visual reference selected for the weapon-art pass introduced in version 0.18.0 and expanded in versions 0.19.0, 0.20.0, 0.21.0 and 0.23.0. External images are used only as temporary study references. The repository contains newly authored low-resolution sprites and palettes, not the downloaded source images.

## Reference-driven licensed designs

| Weapon ID | Display design | Reference version | Reference |
|---|---|---|---|
| `ballistic_knife` | Ballistic Knife | Call of Duty: Black Ops menu profile | https://callofduty.fandom.com/wiki/Ballistic_Knife |
| `olympia` | Olympia | Call of Duty: Black Ops menu profile | https://callofduty.fandom.com/wiki/Olympia |
| `ksg_12` | KSG | Call of Duty: Black Ops II menu profile | https://callofduty.fandom.com/wiki/KSG |
| `akimbo_scorpion` | Skorpion pair | Call of Duty 4 menu profile; internal ID retained for save compatibility | https://callofduty.fandom.com/wiki/Skorpion |
| `scavenger` | Scavenger | Call of the Dead weapon profile | https://callofduty.fandom.com/wiki/Scavenger_(weapon) |
| `venom_x` | Venom-X | Call of Duty: Ghosts Extinction model | https://callofduty.fandom.com/wiki/Venom-X |
| `ray_gun` | Ray Gun | Call of Duty: World at War model and color layout | https://callofduty.fandom.com/wiki/Ray_Gun |
| `wunderwaffe` | Wunderwaffe DG-2 | Call of Duty: World at War third-person profile | https://callofduty.fandom.com/wiki/Wunderwaffe_DG-2 |
| `r9_0` | R9-0 Shotgun | Call of Duty: Modern Warfare (2019) HUD profile | https://callofduty.fandom.com/wiki/R9-0_Shotgun |
| `mx_guardian` | MX Guardian | Call of Duty: Modern Warfare II HUD profile | https://callofduty.fandom.com/wiki/MX_Guardian |
| `cx_9` | CX-9 | Call of Duty: Modern Warfare (2019) HUD profile | https://callofduty.fandom.com/wiki/Skorpion_EVO |
| `mg42` | MG42 | Call of Duty: World at War menu profile | https://callofduty.fandom.com/wiki/MG42 |
| `bp50` | BP50 | Call of Duty: Modern Warfare III HUD profile | https://callofduty.fandom.com/wiki/F2000 |
| `na_45` | NA-45 | Call of Duty: Advanced Warfare menu profile | https://callofduty.fandom.com/wiki/NA-45 |
| `so_14` | SO-14 | Call of Duty: Modern Warfare II HUD profile | https://callofduty.fandom.com/wiki/M14 |
| `aa_12` | AA-12 | Call of Duty: Modern Warfare 2 menu profile | https://callofduty.fandom.com/wiki/AA-12 |
| `awp_dragon_lore` | AWP &#124; Dragon Lore | Counter-Strike: Global Offensive inventory/market profile | https://counterstrike.fandom.com/wiki/AWP/Gallery |
| `ak47_wild_lotus` | AK-47 &#124; Wild Lotus | Counter-Strike: Global Offensive inventory profile | https://counterstrike.fandom.com/wiki/AK-47/Gallery |
| `inspector` | Inspector | Strinova Michele weapon profile | https://wiki.biligame.com/klbq/米雪儿·李 |
| `finale` | Finale / 谢幕曲 | Strinova Kanami weapon profile | https://wiki.biligame.com/klbq/谢幕曲 |
| `minishark` | Minishark | Official Terraria item sprite | https://terraria.wiki.gg/wiki/Minishark |
| `water_bolt` | Water Bolt | Official Terraria item sprite | https://terraria.wiki.gg/wiki/Water_Bolt |
| `stardust_dragon_staff` | Stardust Dragon Staff | Official Terraria item sprite | https://terraria.wiki.gg/wiki/Stardust_Dragon_Staff |
| `terrarian` | Terrarian | Official Terraria item sprite | https://terraria.wiki.gg/wiki/Terrarian |
| `last_prism` | Last Prism | Official Terraria item sprite | https://terraria.wiki.gg/wiki/Last_Prism |
| `zenith` | Zenith | Official Terraria item sprite | https://terraria.wiki.gg/wiki/Zenith |

## Real-world profile references

| Weapon ID | Profile basis | Reference |
|---|---|---|
| `vector_9` | KRISS Vector low bore axis, angled magazine well and stepped receiver | https://kriss-usa.com/item/vector-crb/ |
| `liberator` | FP-45 Liberator stamped box receiver, short barrel and straight grip | https://americanhistory.si.edu/collections/object/nmah_415383 |

## Project-original designs

The remaining weapons do not claim a one-to-one external prototype. Their sprites are authored from their mechanics and names, using a consistent industrial-design language:

- `pistol`, `shotgun`, `service_revolver`: worn conventional ballistic weapons.
- `laser`, `plasma_caster`, `tesla_carbine`: distinct coherent-light, plasma and exposed-coil energy systems.
- `bell_repeater`, `mask_sprayer`, `code_scanner`, `swab_lance`, `vat_horse_cannon`: object-derived silhouettes whose recognizable object is incorporated into the receiver or muzzle.
- `nail_driver`, `ripper_disc`, `micro_rocket`: industrial tool, exposed saw-disc and multi-tube launcher profiles.
- `kingmaker`, `storm_repeater`, `starfall_array`: Vanguard-series black/gold, storm-cyan and tri-array designs.
- `void_rail`, `dragon_breath`, `siege_breaker`: Aether-series void rail, dragon-head emitter and heavy siege launcher designs.

## Adaptation rules

1. All weapon sprites face right in authored coordinates.
2. Source images are trimmed, orientation-corrected and reduced to an 18–32 pixel canvas.
3. Each weapon uses an independent material palette rather than the global character palette.
4. Grip and muzzle anchors are authored against the final sprite and converted into runtime offsets.
5. Reference silhouettes and signature colors are preserved, while the pixels are redrawn to match the project's outline weight and 320 × 240 presentation.

## Character sprite adaptation

Kanami's dedicated player sprite was authored from the approved pixel reference sheet rather than importing the generated image as a runtime asset. The 16 × 16 model preserves the readable identity markers that survive the game's 320 × 240 presentation: long silver-lavender hair, blue eyes, black hair ornament, black-and-white idol outfit, pink waist accents and trailing ribbon panels. Finale is kept as a separate weapon layer so its long sniper silhouette remains visible above the character body.
