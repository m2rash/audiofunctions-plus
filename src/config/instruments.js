import * as Tone from 'tone';

export const InstrumentFrequencyType = {
  continuous: 'continuous',
  discretePitchClassBased: 'discretePitchClassBased'
};

// Global frequency range for all instruments
// export const GLOBAL_FREQUENCY_RANGE = {
//   min: 250,  // Hz - Common minimum (flute's minimum)
//   max: 2000  // Hz - Common maximum (clarinet's maximum)
// };

export const GLOBAL_FREQUENCY_RANGE = { // from third to fifth octave approximately
  min: 100,  
  max: 1000  
};

// Create a function to set up the organ components
const createOrganInstrument = () => {
  // 1) FM Synth with different characteristics from clarinet/flute
  const fmSynth = new Tone.FMSynth({
    volume: -18,
    detune: -5,
    portamento: 0.1,
    harmonicity: 4.5,  // Higher harmonicity for more complex timbre
    modulationIndex: 1.5,  // Higher modulation for more metallic sound
    oscillator: {
      type: "square",  // Different from clarinet's sine
      phase: 90
    },
    envelope: {
      attack: 0.05,
      decay: 0.3,
      sustain: 0.7,
      release: 0.8
    },
    modulation: {
      type: "sawtooth",  // Different from clarinet's triangle
      phase: 45
    },
    modulationEnvelope: {
      attack: 0.1,
      decay: 0.4,
      sustain: 0.6,
      release: 0.3
    }
  });

  // 2) Chorus for richness
  const chorus = new Tone.Chorus({
    frequency: 1.5,
    delayTime: 3.5,
    depth: 0.6,
    wet: 0.8
  });

  // 3) Reverb for space
  const reverb = new Tone.Reverb({
    decay: 2,
    preDelay: 0.1,
    wet: 0.6
  });

  // 4) Filter for tone shaping
  const filter = new Tone.Filter({
    type: "lowpass",
    frequency: 1000,
    rolloff: -12
  });

  // Connect the effects chain
  fmSynth
    .connect(filter)
    .connect(chorus)
    .connect(reverb);

  let isStarted = false;

  return {
    voices: [fmSynth], // Keep for compatibility
    voiceIndex: 0,
    fmSynth: fmSynth,
    chorus: chorus,
    reverb: reverb,
    filter: filter,
    start: () => {
      // Start effects when needed
      if (!isStarted) {
        try {
          chorus.start();
          isStarted = true;
        } catch (e) {
          // console.log("Effects start error:", e.message);
        }
      }
    },
    stop: () => {
      fmSynth.triggerRelease();
    },
    dispose: () => {
      fmSynth.dispose();
      chorus.dispose();
      reverb.dispose();
      filter.dispose();
    },
    triggerAttack: (freq) => {
      try {
        // Start effects on first note trigger
        if (!isStarted) {
          chorus.start();
          isStarted = true;
        }
        fmSynth.triggerAttack(freq);
      } catch (e) {
        // console.log("Trigger attack error:", e.message);
      }
    },
    triggerRelease: () => {
      fmSynth.triggerRelease();
    },
    connect: (dest) => {
      reverb.connect(dest);
    },
    disconnect: () => {
      fmSynth.disconnect();
      chorus.disconnect();
      reverb.disconnect();
      filter.disconnect();
    }
  };
};

const generatePitchClasses = () => {
  const notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octaves = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const pitchClasses = [];
  
  for (let octave of octaves) {
    for (let note of notes) {
      pitchClasses.push(`${note}${octave}`);
    }
  }
  return pitchClasses;
};

const allPitchClasses = generatePitchClasses();

export const getPitchClasses = (from, to) => {
  const beginIdx = allPitchClasses.indexOf(from);
  const endIdx = allPitchClasses.indexOf(to);
  return allPitchClasses.slice(beginIdx, endIdx + 1);
};

export const createInstruments = () => [
  {
    name: "clarinet",
    createInstrument: () => new Tone.FMSynth({
      volume: -8,
      detune: 3,
      portamento: 0,
      harmonicity: 2,
      oscillator: {
        partialCount: 0,
        partials: [],
        phase: 0,
        type: "sine",
      },
      envelope: {
        attack: 0.21000000000000005,
        attackCurve: "linear",
        decay: 0.1,
        decayCurve: "exponential",
        release: 0.05,
        releaseCurve: "exponential",
        sustain: 1,
      },
      modulation: {
        partialCount: 0,
        partials: [],
        phase: 0,
        type: "triangle",
      },
      modulationEnvelope: {
        attack: 0.20000000000000004,
        attackCurve: "linear",
        decay: 0.01,
        decayCurve: "exponential",
        release: 0.5,
        releaseCurve: "exponential",
        sustain: 1,
      },
      modulationIndex: 1,
    }),
    instrumentType: InstrumentFrequencyType.continuous,
  },
  {
    name: "flute",
    createInstrument: () => new Tone.FMSynth({
      volume: -6,
      harmonicity: 1.0,
      modulationIndex: 0.5,
      oscillator: { type: "sine" },
      envelope: { 
        attack: 0.2, 
        decay: 0.1, 
        sustain: 0.9, 
        release: 0.5 
      },
      modulation: { type: "triangle" },
      modulationEnvelope: { 
        attack: 0.3, 
        decay: 0.2, 
        sustain: 0.5, 
        release: 0.2 
      }
    }),
    instrumentType: InstrumentFrequencyType.continuous,
  },
  {
    name: "organ",
    createInstrument: () => createOrganInstrument(),
    instrumentType: InstrumentFrequencyType.continuous,
  },
  {
    name: "guitar",
    createInstrument: () => new Tone.PluckSynth({
      volume: -2,
      attackNoise: 1,
      dampening: 500,
      resonance: 0.99,
    }),
    instrumentType: InstrumentFrequencyType.discretePitchClassBased,
    availablePitchClasses: getPitchClasses("C3", "C5"),
  },
]; 