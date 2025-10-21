import * as Tone from "tone";

/**
 * Landmark Earcon System
 * Creates distinctive audio feedback for different landmark shapes using Tone.js synthesis
 */

class LandmarkEarconManager {
  constructor() {
    this.synths = new Map();
    this.channels = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the earcon system
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await Tone.start();
      this.createSynths();
      this.isInitialized = true;
      console.log("LandmarkEarconManager initialized");
    } catch (error) {
      console.error("Failed to initialize LandmarkEarconManager:", error);
    }
  }

  /**
   * Create synthesizers for each landmark shape
   */
  createSynths() {
    // Circle Earcon - Bell-like, metallic sound with reverb
    const circleSynth = new Tone.FMSynth({
      volume: 0,
      harmonicity: 3.5, // Higher harmonicity for more metallic sound
      modulationIndex: 2.5, // Higher modulation for bell-like character
      oscillator: {
        type: "triangle" // Triangle wave for softer attack than sine
      },
      envelope: {
        attack: 0.05, // Faster attack for bell-like strike
        decay: 0.3,
        sustain: 0.1, // Lower sustain for bell decay
        release: 1.2 // Longer release for bell resonance
      }
    });

    const circleReverb = new Tone.Reverb({
      decay: 2.5, // Longer decay for bell resonance
      preDelay: 0.05, // Shorter pre-delay for immediate response
      wet: 0.6 // More reverb for bell-like character
    });

    const circleChannel = new Tone.Channel({
      volume: 6,
      pan: 0
    }).toDestination();

    circleSynth.chain(circleReverb, circleChannel);
    this.synths.set("circle", circleSynth);
    this.channels.set("circle", circleChannel);

    // Triangle Earcon - Sharp, bright sound with filter sweep
    const triangleSynth = new Tone.FMSynth({
      volume: 0,
      harmonicity: 3,
      modulationIndex: 2,
      oscillator: {
        type: "triangle"
      },
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.2,
        release: 0.6
      }
    });

    const triangleFilter = new Tone.Filter({
      type: "highpass",
      frequency: 800,
      rolloff: -12
    });

    const triangleChannel = new Tone.Channel({
      volume: 0,
      pan: 0
    }).toDestination();

    triangleSynth.chain(triangleFilter, triangleChannel);
    this.synths.set("triangle", triangleSynth);
    this.channels.set("triangle", triangleChannel);

    // Square Earcon - Harsh, percussive sound with distortion
    const squareSynth = new Tone.FMSynth({
      volume: -8,
      harmonicity: 4,
      modulationIndex: 3,
      oscillator: {
        type: "square"
      },
      envelope: {
        attack: 0.02,
        decay: 0.4,
        sustain: 0.1,
        release: 0.4
      }
    });

    const squareDistortion = new Tone.Distortion({
      distortion: 0.3,
      oversample: "2x"
    });

    const squareFilter = new Tone.Filter({
      type: "lowpass",
      frequency: 2000,
      rolloff: -24
    });

    const squareChannel = new Tone.Channel({
      volume: -2,
      pan: 0
    }).toDestination();

    squareSynth.chain(squareDistortion, squareFilter, squareChannel);
    this.synths.set("square", squareSynth);
    this.channels.set("square", squareChannel);
  }

  /**
   * Play earcon for a specific landmark shape
   * @param {string} shape - The landmark shape ("circle", "triangle", "square")
   * @param {Object} options - Optional parameters for customization
   */
  playEarcon(shape, options = {}) {
    if (!this.isInitialized) {
      console.warn("LandmarkEarconManager not initialized");
      return;
    }

    const synth = this.synths.get(shape);
    const channel = this.channels.get(shape);

    if (!synth || !channel) {
      console.warn(`No earcon found for shape: ${shape}`);
      return;
    }

    try {
      // Stop any currently playing sound for this shape
      synth.triggerRelease();

      // Calculate frequency based on shape characteristics (no variation)
      let baseFreq = 440; // A4
      switch (shape) {
        case "circle":
          baseFreq = 523.25; // C5 - higher, more rounded
          break;
        case "triangle":
          baseFreq = 659.25; // E5 - sharp, bright
          break;
        case "square":
          baseFreq = 349.23; // F4 - lower, more percussive
          break;
      }

      // Trigger the earcon
      synth.triggerAttackRelease(baseFreq, "8n");

      // Add subtle panning variation for spatial awareness
      if (options.pan !== undefined) {
        channel.pan.value = options.pan;
      }

      console.log(`Playing ${shape} earcon at ${baseFreq.toFixed(2)}Hz`);
    } catch (error) {
      console.error(`Error playing ${shape} earcon:`, error);
    }
  }

  /**
   * Play earcon for a landmark with automatic shape detection
   * @param {Object} landmark - The landmark object
   * @param {Object} options - Optional parameters
   */
  playLandmarkEarcon(landmark, options = {}) {
    if (!landmark) return;

    const shape = landmark.shape || landmark.appearance || "circle";
    this.playEarcon(shape, options);
  }

  /**
   * Stop all earcons
   */
  stopAllEarcons() {
    this.synths.forEach(synth => {
      synth.triggerRelease();
    });
  }

  /**
   * Set volume for all earcons
   * @param {number} volume - Volume in dB
   */
  setVolume(volume) {
    this.channels.forEach(channel => {
      channel.volume.value = volume;
    });
  }

  /**
   * Test all earcon shapes (for development/testing)
   */
  testAllEarcons() {
    if (!this.isInitialized) {
      console.warn("LandmarkEarconManager not initialized");
      return;
    }

    console.log("Testing all landmark earcons...");
    
    // Test each shape with a slight delay
    setTimeout(() => this.playEarcon("circle"), 0);
    setTimeout(() => this.playEarcon("triangle"), 1000);
    setTimeout(() => this.playEarcon("square"), 2000);
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.synths.forEach(synth => {
      synth.dispose();
    });
    this.channels.forEach(channel => {
      channel.dispose();
    });
    this.synths.clear();
    this.channels.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const landmarkEarconManager = new LandmarkEarconManager();

export default landmarkEarconManager;
