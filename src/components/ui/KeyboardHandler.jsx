import { useEffect, useRef } from "react";
import { useGraphContext } from "../../context/GraphContext";
import { getActiveFunctions, getFunctionNameN, findLandmarkByShortcut } from "../../utils/graphObjectOperations";
import { addLandmarkAtCursorPosition, jumpToLandmarkWithToast, getScreenPosition } from "../../utils/landmarkUtils";
import audioSampleManager from "../../utils/audioSamples";
import { useAnnouncement } from '../../context/AnnouncementContext';
import { useInfoToast } from '../../context/InfoToastContext';
import { useDialog } from "../../context/DialogContext";

// Export the ZoomBoard function so it can be used in other components
export const useZoomBoard = () => {
  const { setGraphBounds, graphSettings, isAudioEnabled } = useGraphContext();
  
  return (out, xOnly = false, yOnly = false) => {
    const scaleFactor = {x: 0.9, y: 0.9};
    if (out) { scaleFactor.x = 1.1; scaleFactor.y = 1.1; }
    if (xOnly) scaleFactor.y = 1; //only x axis zoom
    if (yOnly) scaleFactor.x = 1; //only y axis zoom

    setGraphBounds(prevBounds => {
      const centerX = (prevBounds.xMin + prevBounds.xMax) / 2;
      const centerY = (prevBounds.yMin + prevBounds.yMax) / 2;
      const halfWidthX = (prevBounds.xMax - prevBounds.xMin) / 2 * scaleFactor.x;
      const halfWidthY = (prevBounds.yMax - prevBounds.yMin) / 2 * scaleFactor.y;
      
      return {
        xMin: centerX - halfWidthX,
        xMax: centerX + halfWidthX,
        yMin: centerY - halfWidthY,
        yMax: centerY + halfWidthY,
      };
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
        setIsShiftPressed,
        graphBounds
    } = useGraphContext();

    const { announce } = useAnnouncement();
    const { showInfoToast, showLandmarkToast } = useInfoToast();
    const { openDialog } = useDialog();

    const pressedKeys = useRef(new Set());
    const lastKeyDownTime = useRef(null);
    const HOLD_THRESHOLD = 1000;
    const KEYPRESS_THRESHOLD = 15;

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
            jumpToLandmarkWithToast(landmark, updateCursor, graphBounds, announce, showLandmarkToast);
        }
    };

    useEffect(() => {
        // Function to handle key down events
        const handleKeyDown = async (event) => {
            const active = document.activeElement;

            // Only handle events when the chart (role="application") is focused
            if (!active || active.getAttribute('role') !== 'application') {
                return;
            }
        
            pressedKeys.current.add(event.key.toLowerCase());
            
            // Track Shift key state
            if (event.key === "Shift") {
                setIsShiftPressed(true);
            }
            
            const activeFunctions = getActiveFunctions(functionDefinitions);
            const step = event.shiftKey ? 5 : 1;

            // Handle shortcut for new landmark using utility function
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                event.stopPropagation();
                
                addLandmarkAtCursorPosition(
                    functionDefinitions,
                    cursorCoords,
                    setFunctionDefinitions,
                    announce,
                    showInfoToast,
                    openDialog
                );
                return;
            }

            // Handle landmark shortcuts - support both regular numbers and Czech keyboard
            if (event.ctrlKey && !event.altKey && !event.shiftKey) {
                const landmarkShortcuts = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
                
                // Czech keyboard alternatives for Ctrl shortcuts
                const czechLandmarkKeyMap = {
                    '+': '1',  // Czech 1
                    'ě': '2',  // Czech 2  
                    'š': '3',  // Czech 3
                    'č': '4',  // Czech 4
                    'ř': '5',  // Czech 5
                    'ž': '6',  // Czech 6
                    'ý': '7',  // Czech 7
                    'á': '8',  // Czech 8
                    'í': '9',  // Czech 9
                    'é': '0'   // Czech 0
                };

                // Check for regular number keys first
                if (landmarkShortcuts.includes(event.key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    jumpToLandmarkByShortcut(event.key);
                    return;
                }

                // Check for Czech keyboard alternatives
                const mappedShortcut = czechLandmarkKeyMap[event.key];
                if (mappedShortcut) {
                    event.preventDefault();
                    event.stopPropagation();
                    jumpToLandmarkByShortcut(mappedShortcut);
                    return;
                }
            }

            // Handle Czech keyboard shortcuts for function switching
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

            const czechFunctionKeyMapShift = {
                '1': 0,
                '2': 1,
                '3': 2,
                '4': 3,
                '5': 4,
                '6': 5,
                '7': 6,
                '8': 7,
                '9': 8
            };
            
            let targetIndex;
            
            if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
                targetIndex = czechFunctionKeyMapShift[event.key];
            }
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
    }, [setPlayFunction, setIsAudioEnabled, setGraphBounds, setGraphSettings, inputRefs, cursorCoords, updateCursor, stepSize, functionDefinitions, setFunctionDefinitions, setExplorationMode, PlayFunction, mouseTimeoutRef, isAudioEnabled, setIsShiftPressed, ZoomBoard, openDialog]);
  
    return null;
}