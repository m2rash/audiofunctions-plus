import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useGraphContext } from "../../context/GraphContext";

const GraphSonification = () => {
  const { cursorCoords, isAudioEnabled, graphBounds } = useGraphContext();
  let instrumentRef = useRef(null);
  let pannerRef = useRef(null);
  const lastTimeRef = useRef(null);

  const minFrequency = 100;
  const maxFrequency = 1000;

  useEffect(() => {
    const panner = new Tone.Panner(0).toDestination();
    pannerRef.current = panner;

    const clarinet = new Tone.FMSynth({
      volume: 0,
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
    }).connect(pannerRef.current).toDestination();

    instrumentRef.current = clarinet;

    Tone.start();

    return () => {
      instrumentRef.current.dispose();
      panner.disconnect();
    };
  }, []);

  // update the frequency based on cursor position
  useEffect(() => {
    if (!instrumentRef.current || !pannerRef.current || !isAudioEnabled) {
      stopTone();
      return;
    }

    const { x, y } = cursorCoords;
    const frequency = calculateFrequency(y);
    const pan = calculatePan(x);
    console.log("Cursor Coords:", cursorCoords, "Frequency:", frequency, "Pan:", pan);

    if (frequency) {
      startTone(frequency, pan);
    } else {
      stopTone();
    }
  }, [cursorCoords, isAudioEnabled]); 

  const calculateFrequency = (y) => {
    if (y === null || y === undefined) return null;
    const normalizedY = (y- graphBounds.yMin)/(graphBounds.yMax-graphBounds.yMin); //Math.max(0, Math.min(1, (y - -10) / (10 - -10)));
    return minFrequency + normalizedY * (maxFrequency - minFrequency);
  };

  const calculatePan = (x) => {
    if (x === null || x === undefined) return 0;
    const pan =-1+2*(x- graphBounds.xMin)/(graphBounds.xMax-graphBounds.xMin);  // Normalize x to range [-1, 1]
    if (pan > 1) return 1;
    if (pan < -1) return -1;
    return pan;
  };


  const startTone = (frequency, pan) => {

    instrumentRef.current.triggerAttack(frequency);
    pannerRef.current.pan.value=pan;

  };

  const stopTone = () => {
    instrumentRef.current.triggerRelease();
  };

  return null;
};

export default GraphSonification;