import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { useGraphContext } from "../../context/GraphContext";
import { useInstruments } from "../../context/InstrumentsContext";
import { useDialog } from "../../context/DialogContext";
import { GLOBAL_FREQUENCY_RANGE, InstrumentFrequencyType } from "../../config/instruments";
import { 
  getActiveFunctions,
  getFunctionById,
  isFunctionActiveN,
  getFunctionInstrumentN,
  getFunctionIndexById
} from "../../utils/graphObjectOperations";
import audioSampleManager from "../../utils/audioSamples";

const GraphSonification = () => {
  const { 
    cursorCoords, 
    isAudioEnabled, 
    graphBounds,
    functionDefinitions,
    stepSize, // <-- get stepSize from context
    PlayFunction, // <-- get PlayFunction to detect exploration mode
    explorationMode // <-- get exploration mode for robust detection
  } = useGraphContext();
  
  // Refs to track previous states for event detection
  const prevCursorCoordsRef = useRef(new Map()); // Track previous cursor positions
  const prevXSignRef = useRef(new Map()); // Track previous x coordinate signs for y-axis intersection
  const boundaryTriggeredRef = useRef(new Map()); // Track if boundary event was recently triggered to avoid spam
  const yAxisTriggeredRef = useRef(new Map()); // Track if y-axis intersection was recently triggered
  const prevBoundaryStateRef = useRef(new Map()); // Track previous boundary state for each function
  const lastTickIndexRef = useRef(null); // Track last ticked index
  const tickSynthRef = useRef(null); // Reference to tick synth
  const tickChannelRef = useRef(null); // Reference to tick channel for panning
  const isAtBoundaryRef = useRef(false); // Track if cursor is at a boundary
  
  const { getInstrumentByName } = useInstruments();
  const { isEditFunctionDialogOpen } = useDialog();
  const instrumentsRef = useRef(new Map()); // Map to store instrument references
  const channelsRef = useRef(new Map()); // Map to store channel references
  const lastPitchClassesRef = useRef(new Map()); // Map to store last pitch class for discrete instruments
  const pinkNoiseRef = useRef(null); // Reference to pink noise synthesizer
  const [forceRecreate, setForceRecreate] = useState(false); // State to force recreation of sonification pipeline
  const batchTickCountRef = useRef(0); // Track tick count since batch exploration started
  const batchResetDoneRef = useRef(false); // Track if batch reset has been done

  // Initialize tick synth
  useEffect(() => {
    if (!tickSynthRef.current) {
      tickSynthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.001,
        octaves: 1,
        envelope: {
          attack: 0,
          decay: 0.05,
          sustain: 0,
          release: 0
        },
        volume: -18 // Lower volume in dB
      });

      // Create a channel for the tick synth to handle panning
      tickChannelRef.current = new Tone.Channel({
        pan: 0,
        volume: 0
      }).toDestination();

      // Connect tick synth to its channel
      tickSynthRef.current.connect(tickChannelRef.current);
    }

    return () => {
      if (tickSynthRef.current) {
        tickSynthRef.current.dispose();
        tickSynthRef.current = null;
      }
      if (tickChannelRef.current) {
        tickChannelRef.current.dispose();
        tickChannelRef.current = null;
      }
    };
  }, []);

  // Initialize pink noise synthesizer
  useEffect(() => {
    if (!pinkNoiseRef.current) {
      pinkNoiseRef.current = new Tone.Noise("pink").toDestination();
      pinkNoiseRef.current.volume.value = -36; // dB - low volume background sound
    }

    return () => {
      if (pinkNoiseRef.current) {
        pinkNoiseRef.current.dispose();
        pinkNoiseRef.current = null;
      }
    };
  }, []);

  // Initialize audio sample manager only
  useEffect(() => {
    const initializeAudioSampleManager = async () => {
      try {
        // Wait for Tone.js to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await audioSampleManager.initialize();
        console.log("Audio sample manager initialized (samples will load on-demand)");
      } catch (error) {
        console.error("Failed to initialize audio sample manager:", error);
      }
    };

    initializeAudioSampleManager();

    return () => {
      // Cleanup audio sample manager
      audioSampleManager.dispose();
    };
  }, []);

  // Initialize channels for all functions
  useEffect(() => {
    // Check if we need to force recreation of the entire pipeline
    if (forceRecreate) {
      console.log("Forcing recreation of channels");
      
      // Dispose all existing channels
      channelsRef.current.forEach(channel => {
        channel.dispose();
      });
      channelsRef.current.clear();
    }

    // Create or update channels for each function
    functionDefinitions.forEach((func, index) => {
      const functionId = func.id;
      if (!channelsRef.current.has(functionId)) {
        const channel = new Tone.Channel({
          pan: 0,
          mute: !isFunctionActiveN(functionDefinitions, index),
          volume: 0
        }).toDestination();
        
        channelsRef.current.set(functionId, channel);
      } else {
        // Update existing channel's mute state
        const channel = channelsRef.current.get(functionId);
        if (channel) {
          channel.mute = !isFunctionActiveN(functionDefinitions, index);
        }
      }
    });

    // Clean up unused channels
    Array.from(channelsRef.current.keys()).forEach(functionId => {
      if (!getFunctionById(functionDefinitions, functionId)) {
        if (channelsRef.current.get(functionId)) {
          channelsRef.current.get(functionId).dispose();
        }
        channelsRef.current.delete(functionId);
      }
    });

    return () => {
      channelsRef.current.forEach(channel => channel.dispose());
      channelsRef.current.clear();
    };
  }, [functionDefinitions, forceRecreate]);

  // Manage instruments and their connections
  useEffect(() => {
    // Check if we need to force recreation of the entire pipeline
    if (forceRecreate) {
      console.log("Forcing recreation of sonification pipeline");
      
      // Dispose all existing instruments
      instrumentsRef.current.forEach(instrument => {
        if (instrument.dispose) {
          instrument.dispose();
        }
      });
      instrumentsRef.current.clear();
      
      // Clear last pitch classes
      lastPitchClassesRef.current.clear();
      
      // Reset batch exploration tracking
      batchTickCountRef.current = 0;
      batchResetDoneRef.current = false;
      
      // Reset the flag
      setForceRecreate(false);
    }

    const activeFunctions = getActiveFunctions(functionDefinitions);
    
    // Clean up unused instruments
    Array.from(instrumentsRef.current.keys()).forEach(functionId => {
      if (!getFunctionById(functionDefinitions, functionId)) {
        if (instrumentsRef.current.get(functionId)) {
          instrumentsRef.current.get(functionId).dispose();
        }
        instrumentsRef.current.delete(functionId);
      }
    });

    // Set up instruments for active functions
    activeFunctions.forEach(func => {
      if (!instrumentsRef.current.has(func.id)) {
        const functionIndex = getFunctionIndexById(functionDefinitions, func.id);
        const instrumentConfig = getInstrumentByName(getFunctionInstrumentN(functionDefinitions, functionIndex));
        if (instrumentConfig && instrumentConfig.createInstrument) {
          const instrument = instrumentConfig.createInstrument();
          instrumentsRef.current.set(func.id, instrument);
          
          // Connect to channel
          const channel = channelsRef.current.get(func.id);
          if (channel) {
            instrument.connect(channel);
            
            // Special case for organ
            if (getFunctionInstrumentN(functionDefinitions, functionIndex) === 'organ') {
              instrument.start();
            }
          }
        }
      }
    });

    Tone.start();

    return () => {
      instrumentsRef.current.forEach(instrument => {
        if (instrument.dispose) {
          instrument.dispose();
        }
      });
      instrumentsRef.current.clear();
    };
  }, [functionDefinitions, getInstrumentByName, forceRecreate]);

  // Clean up sonification when edit dialog closes
  useEffect(() => {
    let timeoutId = null;
    
    if (!isEditFunctionDialogOpen && isAudioEnabled) {
      // When edit dialog closes, force recreation of the entire sonification pipeline
      console.log("Sonification resumed: Edit function dialog closed - forcing pipeline recreation");
      
      // Stop all current tones and clear references immediately
      stopAllTones();
      stopPinkNoise();
      
      // Force recreation with a small delay to ensure state updates are complete
      timeoutId = setTimeout(() => {
        setForceRecreate(true);
      }, 50);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isEditFunctionDialogOpen, isAudioEnabled]);

  // Clean up tracking refs when functions change
  useEffect(() => {
    // Clean up tracking refs for functions that no longer exist
    const currentFunctionIds = new Set(functionDefinitions.map(func => func.id));
    
    // Clean up prevCursorCoordsRef
    Array.from(prevCursorCoordsRef.current.keys()).forEach(functionId => {
      if (!currentFunctionIds.has(functionId)) {
        prevCursorCoordsRef.current.delete(functionId);
      }
    });
    
    // Clean up prevXSignRef
    Array.from(prevXSignRef.current.keys()).forEach(functionId => {
      if (!currentFunctionIds.has(functionId)) {
        prevXSignRef.current.delete(functionId);
      }
    });
    
    // Clean up boundaryTriggeredRef (now handles boundary-specific keys)
    Array.from(boundaryTriggeredRef.current.keys()).forEach(key => {
      const functionId = key.split('_')[0]; // Extract functionId from boundary key
      if (!currentFunctionIds.has(functionId)) {
        boundaryTriggeredRef.current.delete(key);
      }
    });
    
    // Clean up prevBoundaryStateRef
    Array.from(prevBoundaryStateRef.current.keys()).forEach(functionId => {
      if (!currentFunctionIds.has(functionId)) {
        prevBoundaryStateRef.current.delete(functionId);
      }
    });
    
    // Clean up yAxisTriggeredRef
    Array.from(yAxisTriggeredRef.current.keys()).forEach(functionId => {
      if (!currentFunctionIds.has(functionId)) {
        yAxisTriggeredRef.current.delete(functionId);
      }
    });
  }, [functionDefinitions]);

  const calculateFrequency = (y) => {
    if (y === null || y === undefined) return null;
    
    const normalizedY = (y - graphBounds.yMin)/(graphBounds.yMax-graphBounds.yMin);
    return GLOBAL_FREQUENCY_RANGE.min + normalizedY * (GLOBAL_FREQUENCY_RANGE.max - GLOBAL_FREQUENCY_RANGE.min);
  };

  const calculatePan = (x) => {
    if (x === null || x === undefined) return 0;
    const pan = -1 + 2*(x - graphBounds.xMin)/(graphBounds.xMax-graphBounds.xMin);
    if (pan > 1) return 1;
    if (pan < -1) return -1;
    return pan;
  };

  const calculateVolume = (functionY, mouseY, graphBounds) => {
    if (mouseY === null || mouseY === undefined) {
      return 0; // Default volume when no mouse Y is available
    }
    
    // Calculate distance between function value and mouse Y
    const distance = Math.abs(functionY - mouseY);
    const maxDistance = graphBounds.yMax - graphBounds.yMin;
    
    // Normalize distance (0 = on the function, 1 = maximum distance)
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    
    // Convert to volume: closer = louder, farther = quieter
    // Use a less steep curve for discrete sonification - linear instead of exponential
    const volume = 1 - normalizedDistance;
    
    // Convert to dB: volume of 1 = 0 dB (full volume), volume of 0 = -30 dB (quieter but not silent)
    const volumeDB = (volume - 1) * 30;
    
    return volumeDB;
  };

  const handleDiscreteSonification = (functionId, y, pan, instrumentConfig, mouseY) => {
    try {
      if (!instrumentConfig.availablePitchClasses || instrumentConfig.availablePitchClasses.length === 0) {
        return;
      }

      // Map y value to pitch class index
      const normalizedY = (y - graphBounds.yMin) / (graphBounds.yMax - graphBounds.yMin);
      const pitchClassIndex = Math.floor(normalizedY * instrumentConfig.availablePitchClasses.length);
      const clampedIndex = Math.max(0, Math.min(pitchClassIndex, instrumentConfig.availablePitchClasses.length - 1));
      const currentPitchClass = instrumentConfig.availablePitchClasses[clampedIndex];

      // Get the last pitch class for this function
      const lastPitchClass = lastPitchClassesRef.current.get(functionId);

      // Only trigger sound if pitch class has changed
      if (currentPitchClass !== lastPitchClass) {
        // Convert pitch class to frequency
        const frequency = Tone.Frequency(currentPitchClass).toFrequency();
        
        // Stop any current sound
        stopTone(functionId);
        
        // Start new sound with the actual function Y value for volume calculation
        startTone(functionId, frequency, pan, mouseY, y);
        
        // Update the last pitch class
        lastPitchClassesRef.current.set(functionId, currentPitchClass);
      }
    } catch (error) {
      console.warn(`Error in discrete sonification for function ${functionId}:`, error);
      // Stop the tone for this function to prevent further errors
      stopTone(functionId);
    }
  };

  const startTone = (functionId, frequency, pan, mouseY = null, functionY = null) => {
    const instrument = instrumentsRef.current.get(functionId);
    const channel = channelsRef.current.get(functionId);
    
    if (instrument && channel) {
      try {
        // Get the current time from Tone.js
        const now = Tone.now();
        
        // Add a tiny offset based on the functionId to prevent simultaneous triggers
        // Using the last character of functionId to create a small offset
        const offset = parseInt(functionId.slice(-1), 10) * 0.01;
        
        // Ensure the start time is in the future to prevent "Start time must be strictly greater than previous start time" error
        const startTime = Math.max(now + offset, now + 0.001);
        
        instrument.triggerAttack(frequency, startTime);
        channel.pan.value = pan;
        
        // Apply volume control based on mouse distance (only when mouseY is available)
        if (mouseY !== null && mouseY !== undefined) {
          // Use provided functionY if available (for discrete sonification), otherwise calculate from frequency
          const actualFunctionY = functionY !== null ? functionY : (frequency - GLOBAL_FREQUENCY_RANGE.min) / (GLOBAL_FREQUENCY_RANGE.max - GLOBAL_FREQUENCY_RANGE.min) * (graphBounds.yMax - graphBounds.yMin) + graphBounds.yMin;
          const volumeDB = calculateVolume(actualFunctionY, parseFloat(mouseY), graphBounds);
          channel.volume.value = volumeDB;
        } else {
          // Reset to default volume when no mouse Y is available
          channel.volume.value = 0;
        }
      } catch (error) {
        console.warn(`Error starting tone for function ${functionId}:`, error);
        // Fallback: try to start immediately without timing
        try {
          instrument.triggerAttack(frequency);
          channel.pan.value = pan;
          
          // Apply volume control in fallback as well
          if (mouseY !== null && mouseY !== undefined) {
            // Use provided functionY if available (for discrete sonification), otherwise calculate from frequency
            const actualFunctionY = functionY !== null ? functionY : (frequency - GLOBAL_FREQUENCY_RANGE.min) / (GLOBAL_FREQUENCY_RANGE.max - GLOBAL_FREQUENCY_RANGE.min) * (graphBounds.yMax - graphBounds.yMin) + graphBounds.yMin;
            const volumeDB = calculateVolume(actualFunctionY, parseFloat(mouseY), graphBounds);
            channel.volume.value = volumeDB;
          } else {
            channel.volume.value = 0;
          }
        } catch (fallbackError) {
          console.error(`Fallback error starting tone for function ${functionId}:`, fallbackError);
        }
      }
    }
  };

  const stopTone = (functionId) => {
    const instrument = instrumentsRef.current.get(functionId);
    if (instrument) {
      instrument.triggerRelease();
    }
  };

  const stopAllTones = () => {
    instrumentsRef.current.forEach((instrument, functionId) => {
      stopTone(functionId);
    });
  };

  const startPinkNoise = () => {
    if (pinkNoiseRef.current && pinkNoiseRef.current.state === "stopped") {
      pinkNoiseRef.current.start();
    }
  };

  const stopPinkNoise = () => {
    if (pinkNoiseRef.current && pinkNoiseRef.current.state === "started") {
      pinkNoiseRef.current.stop();
    }
  };

  // Add a visual indicator when sonification is paused during editing
  if (isEditFunctionDialogOpen && isAudioEnabled) {
    console.log("Sonification paused: Edit function dialog is open");
  }

  // Main effect for processing cursor coordinates and triggering sonification
  useEffect(() => {
    if (!isAudioEnabled || isEditFunctionDialogOpen || !cursorCoords) {
      stopAllTones();
      stopPinkNoise();
      return;
    }

    // Reset pitch classes when batch exploration starts
    if (explorationMode === "batch" && PlayFunction.active && PlayFunction.source === "play" && !batchResetDoneRef.current) {
      console.log("Batch exploration started - resetting last pitch classes for discrete sonification");
      lastPitchClassesRef.current.clear();
      batchTickCountRef.current = 0;
      batchResetDoneRef.current = true;
    } else if (explorationMode !== "batch") {
      // Reset flags when not in batch mode
      batchResetDoneRef.current = false;
      batchTickCountRef.current = 0;
    }

    // Check if any active function has a y-value below zero
    const hasNegativeY = cursorCoords.some(coord => {
      const y = parseFloat(coord.y);
      return !isNaN(y) && isFinite(y) && y < 0;
    });

    // Check if any cursor is at a boundary (we need to check this before processing individual coordinates)
    let isAnyAtBoundary = false;
    for (const coord of cursorCoords) {
      const x = parseFloat(coord.x);
      const y = parseFloat(coord.y);
      
      // Calculate tolerance based on current graph bounds to be more robust with zoom
      const xRange = graphBounds.xMax - graphBounds.xMin;
      const yRange = graphBounds.yMax - graphBounds.yMin;
      const tolerance = Math.max(0.02, Math.min(xRange, yRange) * 0.001); // Adaptive tolerance
      
      const isAtLeftBoundary = Math.abs(x - (graphBounds.xMin + tolerance)) < tolerance * 0.1;
      const isAtRightBoundary = Math.abs(x - (graphBounds.xMax - tolerance)) < tolerance * 0.1;
      const isAtBottomBoundary = Math.abs(y - (graphBounds.yMin + tolerance)) < tolerance * 0.1;
      const isAtTopBoundary = Math.abs(y - (graphBounds.yMax - tolerance)) < tolerance * 0.1;
      
      if (isAtLeftBoundary || isAtRightBoundary || isAtBottomBoundary || isAtTopBoundary) {
        isAnyAtBoundary = true;
        break;
      }
    }

    // Only start pink noise if there's a negative y value AND not at a boundary
    if (hasNegativeY && !isAnyAtBoundary) {
      startPinkNoise();
    } else {
      stopPinkNoise();
    }

    // Check if any functions are visible in the current interval
    const hasVisibleFunctions = cursorCoords.some(coord => {
      const y = parseFloat(coord.y);
      return !isNaN(y) && isFinite(y) && y >= graphBounds.yMin && y <= graphBounds.yMax;
    });

    // Check if any functions are out of bounds (invalid y values or outside visible bounds)
    const hasOutOfBoundsFunctions = cursorCoords.some(coord => {
      const y = parseFloat(coord.y);
      return isNaN(y) || y === undefined || y === null || !isFinite(y) || 
             y < graphBounds.yMin || y > graphBounds.yMax;
    });

    // If no functions are visible in the current interval, play no_y.mp3 and stop all tones
    if (!hasVisibleFunctions && cursorCoords.length > 0) {
      // Check if we haven't recently triggered this event to avoid spam
      const lastTriggered = boundaryTriggeredRef.current.get('no_visible_functions');
      const now = Date.now();
      
      if (!lastTriggered || (now - lastTriggered) > 200) { // 200ms cooldown
        // Stop all tones before playing the earcon
        stopAllTones();
        
        playAudioSample("no_y", { volume: -10 });
        boundaryTriggeredRef.current.set('no_visible_functions', now);
        console.log(`No visible functions in current interval, playing no_y.mp3. cursorCoords:`, cursorCoords);
      }
    } else if (hasVisibleFunctions) {
      // Clear the no_visible_functions trigger when functions become visible again
      boundaryTriggeredRef.current.delete('no_visible_functions');
      
      // If some functions are out of bounds but others are visible, play no_y.mp3
      if (hasOutOfBoundsFunctions) {
        const lastTriggered = boundaryTriggeredRef.current.get('some_out_of_bounds');
        const now = Date.now();
        
        if (!lastTriggered || (now - lastTriggered) > 200) { // 200ms cooldown
          playAudioSample("no_y", { volume: -10 });
          boundaryTriggeredRef.current.set('some_out_of_bounds', now);
          console.log(`Some functions out of bounds, playing no_y.mp3 while continuing sonification of visible functions. cursorCoords:`, cursorCoords);
        }
      } else {
        // Clear the some_out_of_bounds trigger when all functions are visible
        boundaryTriggeredRef.current.delete('some_out_of_bounds');
      }
    }

    // Process each cursor coordinate
    cursorCoords.forEach(async (coord) => {
      const functionId = coord.functionId;
      const x = parseFloat(coord.x);
      const y = parseFloat(coord.y);
      const mouseY = coord.mouseY ? parseFloat(coord.mouseY) : null;
      const pan = calculatePan(x);

      // Handle tick sound with panning - only in smooth exploration modes (keyboard smooth, mouse, or batch)
      if (stepSize && stepSize > 0 && typeof x === 'number' && !isNaN(x) && isAudioEnabled && 
          (explorationMode === "keyboard_smooth" || explorationMode === "mouse" || explorationMode === "batch")) {
        let n = Math.floor(x / stepSize);
        if (n !== lastTickIndexRef.current) {
          // Update tick synth panning based on x position
          if (tickChannelRef.current) {
            tickChannelRef.current.pan.value = pan;
          }
          tickSynthRef.current?.triggerAttackRelease("C6", "16n");
          lastTickIndexRef.current = n;
          
          // Increment tick count for batch exploration
          if (explorationMode === "batch") {
            batchTickCountRef.current++;
          }
        }
      }

      // Check for special events first (this sets the boundary state)
      // Skip boundary detection for the first 5 ticks of batch exploration
      const shouldSkipBoundaryDetection = explorationMode === "batch" && batchTickCountRef.current <= 5;
      
      if (!shouldSkipBoundaryDetection) {
        await checkChartBoundaryEvents(functionId, coord);
        await checkYAxisIntersectionEvents(functionId, coord);
        await checkDiscontinuityEvents(functionId, coord);
      } else {
        // Reset boundary state during skipped detection to prevent false positives
        isAtBoundaryRef.current = false;
      }

      // If at boundary, stop sonification and return
      if (isAtBoundaryRef.current) {
        stopTone(functionId);
        return;
      }

      // Get the function's instrument configuration
      const functionIndex = getFunctionIndexById(functionDefinitions, functionId);
      const instrumentConfig = getInstrumentByName(getFunctionInstrumentN(functionDefinitions, functionIndex));

      if (!instrumentConfig) return;

      // Check if the function value is valid before proceeding with sonification
      const isValidY = typeof y === 'number' && !isNaN(y) && isFinite(y);
      const isWithinBounds = isValidY && y >= graphBounds.yMin && y <= graphBounds.yMax;

      if (isWithinBounds) {
        // Handle discrete vs continuous instruments differently
        if (instrumentConfig.instrumentType === InstrumentFrequencyType.discretePitchClassBased) {
          handleDiscreteSonification(functionId, y, pan, instrumentConfig, mouseY);
        } else {
          // Continuous sonification
          const frequency = calculateFrequency(y);
          if (frequency !== null) {
            startTone(functionId, frequency, pan, mouseY, y);
          } else {
            stopTone(functionId);
          }
        }
      } else {
        // Stop the tone for this function when it's not valid or outside bounds
        stopTone(functionId);
      }
    });
  }, [cursorCoords, isAudioEnabled, isEditFunctionDialogOpen, functionDefinitions, graphBounds, stepSize]);

  // Event detection functions
  const checkChartBoundaryEvents = async (functionId, coords) => {
    const x = parseFloat(coords.x);
    const y = parseFloat(coords.y);
    
    // Calculate tolerance based on current graph bounds to be more robust with zoom
    const xRange = graphBounds.xMax - graphBounds.xMin;
    const yRange = graphBounds.yMax - graphBounds.yMin;
    const tolerance = Math.max(0.02, Math.min(xRange, yRange) * 0.001); // Adaptive tolerance
    
    // Check if cursor is at any of the four boundaries (cursor is clamped, so it can't go beyond)
    const isAtLeftBoundary = Math.abs(x - (graphBounds.xMin + tolerance)) < tolerance * 0.1;
    const isAtRightBoundary = Math.abs(x - (graphBounds.xMax - tolerance)) < tolerance * 0.1;
    const isAtBottomBoundary = Math.abs(y - (graphBounds.yMin + tolerance)) < tolerance * 0.1;
    const isAtTopBoundary = Math.abs(y - (graphBounds.yMax - tolerance)) < tolerance * 0.1;
    
    // Get previous boundary state for this function
    const prevState = prevBoundaryStateRef.current.get(functionId) || {
      left: false, right: false, bottom: false, top: false
    };
    
    // Create a boundary key for this specific boundary
    let boundaryKey = null;
    if (isAtLeftBoundary) boundaryKey = `${functionId}_left`;
    else if (isAtRightBoundary) boundaryKey = `${functionId}_right`;
    else if (isAtBottomBoundary) boundaryKey = `${functionId}_bottom`;
    else if (isAtTopBoundary) boundaryKey = `${functionId}_top`;
    
    console.log(`Boundary check for function ${functionId}: boundaryKey=${boundaryKey}, x=${x}, y=${y}, graphBounds=${JSON.stringify(graphBounds)}`);
    
    if (boundaryKey) {
      // Set boundary state to true when at boundary
      isAtBoundaryRef.current = true;
      
      // Check if we haven't recently triggered this specific boundary to avoid spam
      const lastTriggered = boundaryTriggeredRef.current.get(boundaryKey);
      const now = Date.now();
      
      if (!lastTriggered || (now - lastTriggered) > 200) { // 200ms cooldown for responsive feedback
        await playAudioSample("chart_border", { volume: -15 });
        boundaryTriggeredRef.current.set(boundaryKey, now);
        console.log(`Chart boundary event triggered for function ${functionId} at boundary: ${boundaryKey}`);
      }
    } else {
      // Clear boundary state when not at boundary
      isAtBoundaryRef.current = false;
    }
    
    // Update the previous boundary state
    prevBoundaryStateRef.current.set(functionId, {
      left: isAtLeftBoundary,
      right: isAtRightBoundary,
      bottom: isAtBottomBoundary,
      top: isAtTopBoundary
    });
  };

  const checkYAxisIntersectionEvents = async (functionId, coords) => {
    const x = parseFloat(coords.x);
    const prevXSign = prevXSignRef.current.get(functionId);
    const currentXSign = Math.sign(x);
    
    // Check if we crossed the y-axis (x coordinate sign changed)
    // Only trigger if we have a valid previous sign (not null/undefined) and signs are different
    if (prevXSign !== null && prevXSign !== undefined && prevXSign !== currentXSign && currentXSign !== 0) {
      const lastTriggered = yAxisTriggeredRef.current.get(functionId);
      const now = Date.now();
      
      if (!lastTriggered || (now - lastTriggered) > 300) { // 300ms cooldown
        await playAudioSample("y_axis_intersection", { volume: -12 });
        yAxisTriggeredRef.current.set(functionId, now);
        console.log(`Y-axis intersection event triggered for function ${functionId}`);
      }
    }
    
    // Update the previous x sign
    prevXSignRef.current.set(functionId, currentXSign);
  };

  const checkDiscontinuityEvents = async (functionId, coords) => {
    // Handle both numeric and string representations of y
    let y;
    if (typeof coords.y === 'string') {
      // If y is a string, try to parse it, but also check for special string values
      if (coords.y === 'NaN' || coords.y === 'undefined' || coords.y === 'null' || coords.y === 'Infinity' || coords.y === '-Infinity') {
        y = NaN; // Force NaN for these special cases
      } else {
        y = parseFloat(coords.y);
      }
    } else {
      y = parseFloat(coords.y);
    }
    
    // Check if the function value is NaN, undefined, null, infinite, or outside visible bounds
    const isInvalid = isNaN(y) || y === undefined || y === null || !isFinite(y);
    const isOutsideBounds = typeof y === 'number' && (y < graphBounds.yMin || y > graphBounds.yMax);
    
    if (isInvalid || isOutsideBounds) {
      // Check if we haven't recently triggered this event to avoid spam
      const lastTriggered = boundaryTriggeredRef.current.get(`${functionId}_discontinuity`);
      const now = Date.now();
      
      if (!lastTriggered || (now - lastTriggered) > 200) { // 200ms cooldown for discontinuities
        // Stop the tone for this function before playing the earcon
        stopTone(functionId);
        console.log(`Stopping tone for function ${functionId} due to ${isInvalid ? 'discontinuity' : 'out of bounds'} at x=${coords.x}, y=${coords.y}`);
        
        await playAudioSample("no_y", { volume: -10 });
        boundaryTriggeredRef.current.set(`${functionId}_discontinuity`, now);
        console.log(`${isInvalid ? 'Discontinuity' : 'Out of bounds'} event triggered for function ${functionId} at x=${coords.x}, y=${coords.y}`);
      }
    } else {
      // Clear the discontinuity trigger when function becomes valid again
      boundaryTriggeredRef.current.delete(`${functionId}_discontinuity`);
    }
  };

  // Helper function to play audio samples
  const playAudioSample = async (sampleName, options = {}) => {
    // Don't play samples if audio is not enabled
    if (!isAudioEnabled) {
      return;
    }
    
    try {
      await audioSampleManager.playSample(sampleName, options);
    } catch (error) {
      console.warn(`Failed to play audio sample ${sampleName}:`, error);
    }
  };

  // Example function to demonstrate how to play samples during sonification
  // You can call this function when specific events occur
  const triggerSampleEvent = async (eventType) => {
    // Don't trigger samples if audio is not enabled
    if (!isAudioEnabled) {
      return;
    }

    try {
      switch (eventType) {
        case 'chart_border':
          await playAudioSample('chart_border', { volume: -15 });
          break;
        case 'no_y':
          await playAudioSample('no_y', { volume: -10 });
          break;
        case 'y_axis_intersection':
          await playAudioSample('y_axis_intersection', { volume: -12 });
          break;
        default:
          console.log(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.warn(`Failed to trigger sample event ${eventType}:`, error);
    }
  };

  return null;
};

export default GraphSonification;