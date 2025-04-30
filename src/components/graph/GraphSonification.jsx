import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useGraphContext } from "../../context/GraphContext";

const GraphSonification = () => {
  const { cursorCoords, isAudioEnabled } = useGraphContext();
  const oscillatorRef = useRef(null);
  const pannerRef = useRef(null);
  const lastTimeRef = useRef(null);

  const minFrequency = 100;
  const maxFrequency = 1000;

  useEffect(() => {
    const oscillator = new Tone.Oscillator({ type: "sine" }).toDestination();
    const panner = new Tone.Panner(0).toDestination();
    oscillator.connect(panner);

    oscillatorRef.current = oscillator;
    pannerRef.current = panner;

    return () => {
      oscillator.stop();
      oscillator.disconnect();
      panner.disconnect();
    };
  }, []);

  // update the frequency based on cursor position
  useEffect(() => {
    if (!oscillatorRef.current || !pannerRef.current || !isAudioEnabled) {
      stopTone();
      return;
    }

    const { y } = cursorCoords;
    const frequency = calculateFrequency(y);
    const pan = 0;

    if (frequency) {
      startTone(frequency, pan);
    } else {
      stopTone();
    }
  }, [cursorCoords, isAudioEnabled]); 

  const calculateFrequency = (y) => {
    if (y === null || y === undefined) return null;
    const normalizedY = Math.max(0, Math.min(1, (y - -10) / (10 - -10)));  //may be: (y - bbox[3]) / (bbox[1] - bbox[3])
    return minFrequency + normalizedY * (maxFrequency - minFrequency);
  };

  const startTone = (frequency, pan) => {
    const now = Tone.now();
    if (lastTimeRef.current && now - lastTimeRef.current < 0.01) return;

    oscillatorRef.current.frequency.setValueAtTime(frequency, now);
    pannerRef.current.pan.setValueAtTime(pan, now);

    if (oscillatorRef.current.state !== "started") {
      oscillatorRef.current.start(now);
    }

    lastTimeRef.current = now;
  };

  const stopTone = () => {
    if (oscillatorRef.current && oscillatorRef.current.state === "started") {
      oscillatorRef.current.stop(Tone.now());
    }
  };

  return null;
};

export default GraphSonification;