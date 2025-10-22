import { useEffect, useRef } from "react";
import { useGraphContext } from "../../context/GraphContext";
import { getActiveFunctions, getFunctionNameN, getLandmarksN, findLandmarkByShortcut, addLandmarkWithValidation } from "../../utils/graphObjectOperations";
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
    const { showLandmarkToast, showInfoToast } = useInfoToast();
    const { openDialog } = useDialog();

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
  
    // Function to calculate screen position directly here (same logic as in PaletteActions)
    const getScreenPosition = (graphX, graphY, graphBounds) => {
      const chartElement = document.getElementById('jxgbox');
      
      if (!chartElement) {
        console.warn('Chart element not found, using fallback position');
        return { x: 150, y: 150 };
      }

      const chartRect = chartElement.getBoundingClientRect();
      
      const xRange = graphBounds.xMax - graphBounds.xMin;
      const yRange = graphBounds.yMax - graphBounds.yMin;
      
      if (xRange === 0 || yRange === 0) {
        console.warn('Invalid graph bounds range');
        return { x: 150, y: 150 };
      }
      
      const relativeX = (graphX - graphBounds.xMin) / xRange;
      const relativeY = (graphBounds.yMax - graphY) / yRange;
      
      const screenX = chartRect.left + (relativeX * chartRect.width);
      const screenY = chartRect.top + (relativeY * chartRect.height);
      
      return { x: screenX, y: screenY };
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
            
            const screenPosition = getScreenPosition(landmark.x, landmark.y, graphBounds);
            
            showLandmarkToast(
                `${landmark.label || 'Landmark'}: x = ${landmark.x.toFixed(2)}, y = ${landmark.y.toFixed(2)}`,
                screenPosition,
                2000
            );
            announce(`Jumped to ${landmark.label || 'landmark'} at x = ${landmark.x.toFixed(2)}, y = ${landmark.y.toFixed(2)}`);
        }
    };

    // Function to add landmark at current cursor position
    const addLandmarkAtCursor = () => {
        const activeFunctions = getActiveFunctions(functionDefinitions);
        if (activeFunctions.length === 0) {
            announce("No active function available");
            return;
        }

        const activeFunction = activeFunctions[0];
        const activeFunctionIndex = functionDefinitions.findIndex(f => f.id === activeFunction.id);

        if (!cursorCoords || cursorCoords.length === 0) {
            announce("No cursor position available");
            return;
        }

        const cursorCoord = cursorCoords.find(coord => coord.functionId === activeFunction.id);
        if (!cursorCoord) {
            announce("No cursor position for active function");
            return;
        }

        const x = parseFloat(cursorCoord.x);
        const y = parseFloat(cursorCoord.y);

        // Check if landmark already exists at this position
        const currentLandmarks = getLandmarksN(functionDefinitions, activeFunctionIndex);
        const tolerance = 0.01;
        const existingLandmarkIndex = currentLandmarks.findIndex(landmark => 
            Math.abs(landmark.x - x) < tolerance && Math.abs(landmark.y - y) < tolerance
        );

        if (existingLandmarkIndex !== -1) {
            // Open existing landmark in dialog
            const existingLandmark = currentLandmarks[existingLandmarkIndex];
            announce(`Opening existing landmark at x = ${x.toFixed(2)}, y = ${y.toFixed(2)}`);
            
            openDialog("edit-landmark", {
                landmarkData: {
                    functionIndex: activeFunctionIndex,
                    landmarkIndex: existingLandmarkIndex,
                    landmark: existingLandmark
                }
            });
            return;
        }

        // Create new landmark
        const result = addLandmarkWithValidation(functionDefinitions, activeFunctionIndex, x, y);
        
        if (!result.success) {
            announce(result.message);
            if (result.message.includes("Maximum")) {
                showInfoToast(`Error: ${result.message}`, 3000);
            }
            return;
        }

        // Update function definitions with the new landmark
        setFunctionDefinitions(result.definitions);

        const shortcutText = result.shortcut ? `, shortcut: Ctrl+${result.shortcut}` : '';
        announce(`${result.message}${shortcutText}`);
        showInfoToast(`Landmark added${result.shortcut ? ` (Ctrl+${result.shortcut})` : ''}`, 2000);

        // Find the newly created landmark and open it in the dialog
        const updatedLandmarks = getLandmarksN(result.definitions, activeFunctionIndex);
        const newLandmarkIndex = updatedLandmarks.length - 1;
        const newLandmark = updatedLandmarks[newLandmarkIndex];

        // Open the new landmark in edit dialog
        setTimeout(() => {
            openDialog("edit-landmark", {
                landmarkData: {
                    functionIndex: activeFunctionIndex,
                    landmarkIndex: newLandmarkIndex,
                    landmark: newLandmark
                }
            });
        }, 100);
    };

    useEffect(() => {
        // Function to handle key down events
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

            // Handle Ctrl+N for new landmark
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                event.stopPropagation();
                addLandmarkAtCursor();
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
    }, [setPlayFunction, setIsAudioEnabled, setGraphBounds, setGraphSettings, inputRefs, cursorCoords, updateCursor, stepSize, functionDefinitions, setFunctionDefinitions, setExplorationMode, PlayFunction, mouseTimeoutRef, isAudioEnabled, setIsShiftPressed, ZoomBoard, openDialog]);
  
    return null;
}