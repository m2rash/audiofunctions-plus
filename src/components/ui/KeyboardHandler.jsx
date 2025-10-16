import { useEffect, useRef } from "react";
import { useGraphContext } from "../../context/GraphContext";
import { getActiveFunctions, getFunctionNameN, getLandmarksN, findLandmarkByShortcut } from "../../utils/graphObjectOperations";
import audioSampleManager from "../../utils/audioSamples";
import { useAnnouncement } from '../../context/AnnouncementContext';
import { useInfoToast } from '../../context/InfoToastContext';

// Export the ZoomBoard function so it can be used in other components
export const useZoomBoard = () => {
  const { setGraphBounds, graphSettings, isAudioEnabled } = useGraphContext();
  
  return (out, xOnly = false, yOnly = false) => {
    const scaleFactor = {x: 0.9, y: 0.9};
    if (out) { scaleFactor.x = 1.1; scaleFactor.y = 1.1; }
    if (xOnly) scaleFactor.y = 1; //only x axis zoom
    if (yOnly) scaleFactor.x = 1; //only y axis zoom

    // Calculate new bounds
    const newBounds = {
      xMin: 0,
      xMax: 0,
      yMin: 0,
      yMax: 0
    };

    setGraphBounds(prev => {
      // Calculate new bounds
      newBounds.xMin = prev.xMin * scaleFactor.x;
      newBounds.xMax = prev.xMax * scaleFactor.x;
      newBounds.yMin = prev.yMin * scaleFactor.y;
      newBounds.yMax = prev.yMax * scaleFactor.y;

      // Check if new bounds would exceed limits
      const xDiff = Math.abs(newBounds.xMax - newBounds.xMin);
      const yDiff = Math.abs(newBounds.yMax - newBounds.yMin);
      
      const minDiff = graphSettings.minBoundDifference || 0.1;
      const maxDiff = graphSettings.maxBoundDifference || 100;

      // Check if zoom would exceed limits
      if (xDiff < minDiff || xDiff > maxDiff || yDiff < minDiff || yDiff > maxDiff) {
        // Play deny sound if audio is enabled
        if (isAudioEnabled) {
          try {
            audioSampleManager.playSample("deny", { volume: -10 }); // Lower volume to match other feedback sounds
          } catch (error) {
            console.warn("Failed to play deny sound:", error);
          }
        }
        // Return previous bounds to prevent zoom
        return prev;
      }

      // Return new bounds if within limits
      return newBounds;
    });
  };
};

export default function KeyboardHandler() {
    const { 
        setPlayFunction, 
        setIsAudioEnabled, 
        setGraphBounds,
        inputRefs,
        graphSettings,
        setGraphSettings,
        cursorCoords, 
        updateCursor,
        stepSize,
        functionDefinitions,
        setFunctionDefinitions,
        setExplorationMode,
        PlayFunction,
        mouseTimeoutRef,
        isAudioEnabled,
        setIsShiftPressed
    } = useGraphContext();

    const { announce } = useAnnouncement();
    const { showInfoToast } = useInfoToast();

    const pressedKeys = useRef(new Set());
    const lastKeyDownTime = useRef(null);
    const HOLD_THRESHOLD = 1000; // Time in ms before allowing continuous movement
    const KEYPRESS_THRESHOLD = 15; // Time in ms to filter out false positive keyup events (typical key repeat delay is ~30ms)

    // Use the exported zoom function
    const ZoomBoard = useZoomBoard();

    // Function to switch to specific function by index
    const switchToFunction = (targetIndex) => {
        if (!functionDefinitions || targetIndex < 0 || targetIndex >= functionDefinitions.length) return;
        
        const updatedDefinitions = functionDefinitions.map((func, index) => ({
            ...func,
            isActive: index === targetIndex
        }));
        
        setFunctionDefinitions(updatedDefinitions);
        
        // Announce the switch
        const functionName = getFunctionNameN(functionDefinitions, targetIndex) || `Function ${targetIndex + 1}`;
        announce(`Switched to ${functionName}`);
        showInfoToast(`${functionName}`, 1500);
        
        console.log(`Switched to function ${targetIndex + 1}`);
    };
  
    // Function to jump to landmark by shortcut
    const jumpToLandmarkByShortcut = (shortcut) => {
        const activeFunctions = getActiveFunctions(functionDefinitions);
        if (activeFunctions.length === 0) return;
        
        const activeFunction = activeFunctions[0];
        const activeFunctionIndex = functionDefinitions.findIndex(f => f.id === activeFunction.id);
        
        const landmark = findLandmarkByShortcut(functionDefinitions, activeFunctionIndex, shortcut);
        if (landmark) {
            updateCursor(landmark.x);
            announce(`Jumped to ${landmark.label || 'landmark'} at x = ${landmark.x.toFixed(2)}, y = ${landmark.y.toFixed(2)}`);
            showInfoToast(`${landmark.label || 'Landmark'}: x = ${landmark.x.toFixed(2)}, y = ${landmark.y.toFixed(2)}`, 2000);
        }
    };

    useEffect(() => {
      const handleKeyDown = async (event) => {
        const active = document.activeElement;

        // Only handle events when the chart (role="application") is focused
        if (!active || active.getAttribute('role') !== 'application') {
          return;
        }

        pressedKeys.current.add(event.key.toLowerCase());   // Store the pressed key in the set
        
        // Track Shift key state
        if (event.key === "Shift") {
          setIsShiftPressed(true);
        }
        
        const activeFunctions = getActiveFunctions(functionDefinitions);
        const step = event.shiftKey ? 5 : 1; // if shift is pressed, change step size

        // Handle landmark shortcuts (Ctrl + 1-9, 0)
        if (event.ctrlKey && !event.altKey && !event.shiftKey) {
            const landmarkShortcuts = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
            if (landmarkShortcuts.includes(event.key)) {
                event.preventDefault();
                event.stopPropagation();
                jumpToLandmarkByShortcut(event.key);
                return;
            }
        }

        // Handle Czech keyboard shortcuts for function switching (1-9 alternatives)
        const czechFunctionKeyMap = {
            '+': 0,  // Czech 1
            'ě': 1,  // Czech 2
            'š': 2,  // Czech 3
            'č': 3,  // Czech 4
            'ř': 4,  // Czech 5
            'ž': 5,  // Czech 6
            'ý': 6,  // Czech 7
            'á': 7,  // Czech 8
            'í': 8   // Czech 9
        };

        // Handle Czech keyboard shortcuts with Shift (uppercase variants)
        const czechFunctionKeyMapShift = {
            '1': 0,  // Czech Shift + 1 (might produce different character)
            '2': 1,  // Czech Shift + 2
            '3': 2,  // Czech Shift + 3
            '4': 3,  // Czech Shift + 4
            '5': 4,  // Czech Shift + 5
            '6': 5,  // Czech Shift + 6
            '7': 6,  // Czech Shift + 7
            '8': 7,  // Czech Shift + 8
            '9': 8   // Czech Shift + 9
        };
        
        let targetIndex;
        
        // Check for Shift + Czech keys first
        if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            targetIndex = czechFunctionKeyMapShift[event.key];
        }
        // Then check for regular Czech keys (without any modifier keys)
        else if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
            targetIndex = czechFunctionKeyMap[event.key];
        }
        
        if (targetIndex !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            switchToFunction(targetIndex);
            return;
        }

        switch (event.key) {
            case "a": case "A":
                setGraphBounds(prev => ({ ...prev, xMin: prev.xMin - step, xMax: prev.xMax - step }));
                break;
            case "d": case "D":
                setGraphBounds(prev => ({ ...prev, xMin: prev.xMin + step, xMax: prev.xMax + step }));
                break;
            case "w": case "W":
                setGraphBounds(prev => ({ ...prev, yMin: prev.yMin + step, yMax: prev.yMax + step }));
                break;
            case "s": case "S":
                setGraphBounds(prev => ({ ...prev, yMin: prev.yMin - step, yMax: prev.yMax - step }));
                break;

            case "z": case "Z":
                ZoomBoard(event.shiftKey, pressedKeys.current.has("x"), pressedKeys.current.has("y"));
                break;

            case "ArrowLeft": case "ArrowRight": case "j": case "J": case "l": case "L":
                // If batch sonification is active, stop it and keep cursor at current position
                if (PlayFunction.active && PlayFunction.source === "play") {
                    setPlayFunction(prev => ({ ...prev, active: false }));
                    setExplorationMode("none");
                    console.log("Batch sonification stopped by arrow key");
                    break;
                }

                // Handle Cmd/Ctrl + Left/Right for cursor positioning
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    const bounds = graphSettings?.defaultView || [-10, 10, 10, -10];
                    if (event.key === "ArrowLeft" || event.key === "j" || event.key === "J") {
                        // Go to beginning with Cmd/Ctrl + Left or J
                        const [xMin] = bounds;
                        updateCursor(xMin);
                    } else {
                        // Go to end with Cmd/Ctrl + Right or L
                        const [, xMax] = bounds;
                        updateCursor(xMax);
                    }
                    break;
                }

                let direction = 1;                               //right by default
                if (event.key === "ArrowLeft" || event.key === "j" || event.key === "J") direction = -1;   //left if left arrow or J pressed
                // First, stop any active smooth movement
                if (PlayFunction.active && PlayFunction.source === "keyboard") {
                    setPlayFunction(prev => ({ ...prev, active: false }));
                }

                // Clear any mouse exploration timeout
                if (mouseTimeoutRef.current) {
                    clearTimeout(mouseTimeoutRef.current);
                    mouseTimeoutRef.current = null;
                }

                if (!event.shiftKey) {
                    setExplorationMode("keyboard_stepwise");
                    let CurrentX = parseFloat(cursorCoords[0].x);
                    let NewX;
                    // Use a more robust approach to check if we're on the grid
                    // This handles floating-point precision issues
                    const epsilon = 1e-10; // Small tolerance for floating-point comparison
                    const gridPosition = Math.round(CurrentX / stepSize) * stepSize;
                    let IsOnGrid = Math.abs(CurrentX - gridPosition) < epsilon;
                    if (direction === 1) {
                        NewX = IsOnGrid ? CurrentX + stepSize : Math.ceil(CurrentX / stepSize) * stepSize;
                    } else {
                        NewX = IsOnGrid ? CurrentX - stepSize :  Math.floor(CurrentX / stepSize) * stepSize;
                    }
                    let l = [];
                    activeFunctions.forEach(func => {
                        func.pointOfInterests.forEach((point) =>{ 
                            l.push(point.x);
                        }); 
                    });
                    let sl;
                    
                    const currentTime = Date.now();
                    
                    // If this is the first keydown or enough time has passed since last movement
                    if (!lastKeyDownTime.current || (currentTime - lastKeyDownTime.current) >= HOLD_THRESHOLD) {
                        // Check for points of interest
                        if (direction === 1){
                            sl = l.filter(e => (CurrentX < e) && (e < NewX));
                        } else {
                            sl = l.filter(e => (NewX < e) && (e < CurrentX));
                        }
                        if (sl.length > 0 && isAudioEnabled) {
                            try {
                                await audioSampleManager.playSample("notification", { volume: -15 });
                            } catch (error) {
                                console.warn("Failed to play notification sound:", error);
                            }
                        }
                        
                        // Move cursor and update last keydown time
                        updateCursor(NewX);
                        lastKeyDownTime.current = currentTime;
                    }
                } else {
                    setExplorationMode("keyboard_smooth");
                    setPlayFunction(prev => ({ ...prev, source: "keyboard", active: true, direction: direction }));   // smooth move
                }
                break;
            case " ": // Spacebar plays batch sonification
                setPlayFunction(prev => ({ ...prev, source: "play", active: !prev.active }));
                event.preventDefault();
                event.stopPropagation();
            case "ArrowUp":
                // if (event.shiftKey) {
                //     setPlayFunction(prev => ({ ...prev, speed: prev.speed + (Math.abs(prev.speed+0.5) >= 10 ? 10 : 1) })); // Increase speed with Ctrl + Up
                //     break;
                // }
                break;
            case "ArrowDown":
                // if (event.shiftKey) {
                //     setPlayFunction(prev => ({ ...prev, speed: prev.speed - (Math.abs(prev.speed-0.5) >= 10 ? 10 : 1) })); // Decrease speed with Ctrl + Down
                //     break;
                // }
                break;

            default:
                break;
        }
      };

      const handleKeyUp = (e) => {
        const active = document.activeElement;
  
        // Only handle events when the chart (role="application") is focused
        if (!active || active.getAttribute('role') !== 'application') {
          return;
        }

        pressedKeys.current.delete(e.key.toLowerCase());
        
        // Track Shift key state
        if (e.key === "Shift") {
          setIsShiftPressed(false);
        }
        
        // If the arrow keys or J/L keys are released, stop move but maintain the last cursor position
        if (["ArrowLeft", "ArrowRight", "j", "J", "l", "L"].includes(e.key)) {
          setPlayFunction(prev => {
            if (prev.source === "keyboard") {
              // Keep the current x position and just set active to false
              return { ...prev, active: false };
            }
            return prev;
          });
          // Reset exploration mode when keyboard exploration stops
          setExplorationMode("none");
          
          const currentTime = Date.now();
          const timeSinceLastKeyDown = currentTime - (lastKeyDownTime.current || 0);
          
          if (timeSinceLastKeyDown > KEYPRESS_THRESHOLD) {
            lastKeyDownTime.current = null;
          }
        }
      };
  
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
      };
    }, [setPlayFunction, setIsAudioEnabled, setGraphBounds, setGraphSettings, inputRefs, cursorCoords, updateCursor, stepSize, functionDefinitions, setFunctionDefinitions, setExplorationMode, PlayFunction, mouseTimeoutRef, isAudioEnabled, setIsShiftPressed, ZoomBoard]);
  
    return null;
}