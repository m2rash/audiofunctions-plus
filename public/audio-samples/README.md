# Audio Samples for Sonification

This folder contains audio samples that can be played during graph sonification to provide additional audio feedback for specific events.

## Supported Formats
- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- Any format supported by Tone.js Player

## How to Use

1. **Place your audio files** in this folder
2. **Load samples** in your code by calling:
   ```javascript
   import audioSampleManager from "../../utils/audioSamples";
   
   // Load a single sample
   await audioSampleManager.loadSample("notification", "notification.mp3");
   
   // Load multiple samples
   await audioSampleManager.loadSamples([
     { name: "warning", filename: "warning.mp3" },
     { name: "click", filename: "click.wav" },
     { name: "boundary", filename: "boundary.ogg" }
   ]);
   ```

3. **Play samples** during sonification:
   ```javascript
   // Play a sample with default settings
   audioSampleManager.playSample("notification");
   
   // Play with custom options
   audioSampleManager.playSample("warning", {
     volume: -10,        // Volume in dB
     playbackRate: 1.2,  // Speed multiplier
     startTime: 0        // Start time in seconds
   });
   ```

## Integration with GraphSonification

The `GraphSonification` component automatically detects events and plays the corresponding audio samples. The system includes:

### Automatic Event Detection
- **Chart boundaries** are detected when cursor coordinates match the graph bounds (with small tolerance)
- **Y-axis intersections** are detected when the x coordinate sign changes
- **Discontinuities** are detected when function values are NaN, undefined, or null

### Manual Sample Playback
You can also manually trigger samples using helper functions:

```javascript
// Use the built-in helper function
playAudioSample("chart_border", { volume: -20 });

// Or use the event trigger function
triggerSampleEvent("chart_border");
```

## Example Events

The system automatically detects and plays audio samples for these events:

### Chart Boundary Events
- **`chart_border.mp3`** - Plays when the cursor reaches or attempts to move beyond any of the four chart boundaries (left, right, top, bottom)
- Continues to play when user presses keys that would move beyond boundaries
- Does not trigger when moving back inside the chart area from outside
- Has a 200ms cooldown per boundary for responsive feedback
- Each boundary (left, right, top, bottom) is tracked independently

### Y-Axis Intersection Events  
- **`y-axis-intersection.wav`** - Plays when the cursor reaches or crosses the y-axis (x=0)
- Triggers when:
  - Reaching exactly x=0 (y-axis) from any direction
  - Crossing the y-axis (moving from positive to negative x values or vice versa)
- Prevents double triggers when leaving x=0 after reaching it
- Has a 300ms cooldown to prevent spam
- No false triggers on first cursor movement

### Discontinuity Events
- **`no_y.mp3`** - Plays when encountering a discontinuity point
- Detects NaN, undefined, null, or infinite function values
- Triggered when the function is not defined or has invalid values at the current x coordinate
- Has a 200ms cooldown to prevent spam during rapid exploration

### Legacy Events (for reference)
- `function_discontinuity` - When encountering a function discontinuity
- `cursor_at_boundary` - When the cursor reaches graph boundaries
- Custom events you define

## Best Practices

1. **Keep files small** - Audio samples should be short (0.1-2 seconds) to avoid interfering with sonification
2. **Use appropriate formats** - MP3 for longer samples, WAV for short effects
3. **Test volume levels** - Ensure samples don't overpower the main sonification
4. **Preload samples** - Load all samples at startup to avoid delays during playback

## File Naming Convention

Use descriptive names for your audio files:
- `warning.mp3` - Warning sounds
- `click.wav` - Click/selection sounds
- `boundary.ogg` - Boundary notification sounds
- `notification.mp3` - General notifications

## Troubleshooting

- If a sample doesn't play, check the browser console for loading errors
- Ensure the file path is correct (relative to this folder)
- Verify the audio format is supported by your browser
- Check that the sample name matches exactly when calling `playSample()` 