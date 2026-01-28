---
title: "Welcome to Audiofunctions++"
lang: en
toc: false
---

# Welcome to Audiofunctions+

Audiofunctions+ is a web application designed to facilitate visually impaired users' learning of mathematical functions. By converting function graphs into audio, Audiofunctions+ allows users to interpret the shape of a function's graph by listening to its sonification and explore mathematical relationships through hearing.

## What You Can Do

- **Explore functions with sound**: Move through graphs and hear how functions change
- **Navigate easily**: Use simple keyboard shortcuts to control everything
- **Work with multiple functions**: Define and compare different mathematical expressions
- **Set landmarks**: Mark important points for quick navigation


## How Function Sonification Works

Audiofunctions+ converts mathematical functions into sound using **pitch** and **stereo positioning**. As you move along a function, the **pitch (frequency)** represents the Y-value - higher function values produce higher tones, lower values produce lower tones. **Stereo panning** indicates your X-position - sounds move from left speaker (negative X) to right speaker (positive X).

The application supports two sonification modes:
- **Continuous sonification**: Smooth, flowing tones that change pitch gradually as you navigate
- **Discrete sonification**: Individual musical notes from a predefined scale that are triggered when the function value changes significantly

Here's how a sine function sounds with both sonification modes:

**Continuous sonification**: 

<audio controls style="display: block; margin: auto;"> 
  <source src="earcons/af_continuous.mp3" type="audio/mp3"/>
</audio>

**Discrete sonification**: 

<audio controls style="display: block; margin: auto;"> 
  <source src="earcons/af_discrete.mp3" type="audio/mp3"/>
</audio>

Notice how the discrete version plays notes at different speeds - faster during steep sections of the curve and slower where the function is nearly flat, while the continuous version maintains steady movement throughout. Additionally, background noise indicates when the y-value is negative (< 0).

You can interactively explore the functions from these examples at the following link: [Sinus example](https://audiofunctions-plus.netlify.app/#import=eyJmdW5jdGlvbnMiOlt7ImlkIjoiZjEiLCJmdW5jdGlvbk5hbWUiOiJGdW5jdGlvbiAxIiwidHlwZSI6ImZ1bmN0aW9uIiwiZnVuY3Rpb25EZWYiOiJzaW4oeCkiLCJpc0FjdGl2ZSI6dHJ1ZSwiaW5zdHJ1bWVudCI6ImNsYXJpbmV0IiwicG9pbnRPZkludGVyZXN0cyI6W10sImxhbmRtYXJrcyI6W119XSwiZ3JhcGhTZXR0aW5ncyI6eyJkZWZhdWx0VmlldyI6Wy0xMCwxMCwzLC0zXSwibWluQm91bmREaWZmZXJlbmNlIjowLjEsIm1heEJvdW5kRGlmZmVyZW5jZSI6MTAwLCJzaG93R3JpZCI6dHJ1ZSwic2hvd0F4ZXMiOnRydWUsImdyaWRDb2xvciI6IiNDQ0NDQ0MiLCJyZXN0cmljdGlvbk1vZGUiOiJub25lIn19)



## Getting Started

To start exploring, all functions except the basic navigation are accessible through the command palette. Here are the essential controls to get you started:

### Basic Controls

1. **Open command palette**: `Ctrl+K` (`Cmd+K` on Mac)
2. **Basic navigation**:
   - Move cursor: Arrow keys or `J`/`L`
   - Move view: `W`, `A`, `S`, `D`
   - Show coordinates: `C`
3. **Manage functions**:
   - New function: Press `F` and use function editor
   - Switch between functions: `N` or number keys `1`-`9`
4. **Audio controls**:
   - Sonification on/off: `P`
   - Play entire function: `B`
   - Switch sonification type: `I`


### Advanced Navigation

Take full control of your navigation with these advanced movement options:

- **Fluid movement**: `Shift+Arrow keys` for smooth movement
- **Zoom/Scale controls**: `Z` and `Shift+Z` to enlarge/shrink the view around its center
- **Axis-specific zooming/scaling**: `X+Z` and `Shift+X+Z` for X-axis, `Y+Z` and `Shift+Y+Z` for Y-axis
- **Center cursor**: `Ctrl+Z` to reorientate the view, that the cursor is in the center
- **Show current view bounds**: `V` to display the current viewing area coordinates

- **Mouse movement with volume feedback**: Move your mouse across the graph to hear function values through volume changes - louder sounds indicate higher values, quieter sounds indicate lower values


### Landmarks System

Create interactive markers at important points on your functions - landmarks help you quickly navigate to specific coordinates and understand key features of mathematical graphs:

- **Create/edit landmark**: `Ctrl+B` (`Cmd+B` on Mac) at desired position
- **Jump between landmarks**: `Ctrl+Arrow keys` or `J` and `L` (`Cmd+Arrow keys` on Mac)
- **Jump to specific landmark**: `Ctrl+Number key` (`Cmd+Number key` on Mac)



## Learn More

Explore these detailed guides to master all features of Audiofunctions+.

### [Keyboard Shortcuts](shortcuts.md)
Complete list of all keyboard controls for navigating and using Audiofunctions+.

### [Audio Signals](earcons.md)
Learn about the different sounds that guide you through the application.

### [Sharing](sharing.md)
Share your set of functions with others and control how they can interact with them.

### [Export/Import Functions](json.md)
How to export and import your function definitions and settings.



## Need Help?

**First time using Audiofunctions+?** Start by pressing `Ctrl+K` (or `Cmd+K` on Mac) to open the command menu - it will guide you through available actions. You can also press `F1` at any time to open the help menu.


**Having issues or suggestions?** We'd love to hear from you! You can reach out to the development team or share your feedback to help us improve the application for everyone. 

TODO: Email and github link



<br />
<br />


---

*This project is supported by the SONification for Accessible and Inclusive Representation of GRAPHs in Education ([SONAIRGRAPH](https://sonairgraph.unito.it/)) project, which is an Erasmus+ key action 2 (project number 2024-1-IT02-KA220-HED-000244481), funded by the European Union. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or the European Education and Culture Executive Agency (EACEA). Neither the European Union nor EACEA can be held responsible for them.*
