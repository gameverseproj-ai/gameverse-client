# GELLY WORLD ART BIBLE v1

Reference image:

```
docs/art/gelly-world-target-v1.png
```

This image is the canonical visual target for Gelly World.

Goal:

Create a premium cute stylized 3D world inspired by Nintendo-quality games such as:

* Animal Crossing
* Fall Guys
* Kirby
* Dreamlight Valley

The world must feel:

* cute
* magical
* cozy
* colorful
* welcoming

Never:

* dark
* realistic
* horror-like
* cyberpunk
* low-poly tech demo

---

# Core Rules

Game mechanics are shared.

World art is world-specific.

All Gelly-specific visuals must remain inside Gelly World layer.

Shared engine remains world agnostic.

---

# Color Palette

## Sky

Top:

* #2D4DCC

Middle:

* #7A5CFF

Horizon:

* #FF9FEF

Lower haze:

* #FFC6F7

Atmosphere:

* dreamy twilight
* no black sky

---

## Ground

Base:

* #4B4A8F

Road:

* #5B55A5

Plaza:

* #3E3A92

Ground must never appear black.

---

## Portal Colors

Snake:

* #57FF8A

2048:

* #FFD65C

Tetris:

* #FF6BFF

---

# Materials

General style:

* rounded geometry
* glossy plastic
* soft emissive
* no hard edges

Avoid:

* metallic surfaces
* photorealism
* sharp corners

---

# Hero

The hero is the center of the world.

Hero occupies 25–30% of screen height.

Visual style:

* pink jelly body
* large expressive eyes
* small cute mouth
* subtle bounce animation
* idle breathing
* soft glow only

Never overexpose the hero.

The hero is future monetization.

Future cosmetics:

* hats
* pets
* wings
* trails
* emotes

---

# World Layout

```
            2048 Temple

Snake Hall       Tetris Factory

             Central Plaza

                Hero
```

All portals must be visible simultaneously.

Roads must guide the player's eyes.

---

# Buildings

## Snake Hall

Visual language:

* organic tower
* green palette
* friendly snake wrapped around tower
* glowing entrance
* curved shapes

No boxes.

---

## 2048 Temple

Visual language:

* stepped temple
* golden palette
* floating crystal
* magical energy

No cubes.

---

## Tetris Factory

Visual language:

* block structures
* floating cubes
* purple palette
* playful industry

No simple boxes.

---

# Vegetation

Use:

* jelly trees
* mushrooms
* crystals
* flowers
* small stones

Dense placement near roads and portals.

Avoid empty spaces.

---

# Background

Must include:

* giant jelly moon
* floating islands
* clouds
* distant silhouettes

The world should feel larger than the playable area.

---

# Lighting

Use:

* AmbientLight
* HemisphereLight
* Directional moon light
* Colored portal lights

Bloom:

* subtle
* selective
* never overexposed

Bloom targets:

* roads
* crystals
* portals
* moon

Not the entire world.

---

# Camera

Style:

Third-person adventure.

Camera should feel like:

* Animal Crossing
* Fall Guys

Never:

* RTS
* top-down
* first-person

The player must feel present inside the world.

---

# Performance

Target:

* Web
* Telegram Mini App
* Android wrapper
* iOS wrapper

Maintain 60 FPS whenever possible.
