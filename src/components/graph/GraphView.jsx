import React, { useEffect, useRef } from "react";
import JXG from "jsxgraph";
import { useGraphContext } from "../../context/GraphContext";
import { create, all, forEach } from 'mathjs'
import { checkMathSpell, transformAssingnments, transformMathConstants } from "../../utils/parse";
import { getActiveFunctions } from "../../utils/graphObjectOperations";
import * as Tone from "tone";

const config = { }
const math = create(all, config)

// Number of x axis divisions (can be made configurable)
const X_AXIS_DIVISIONS = 10;

// txtraw is a string of the form [[expr_1,ineq_1],[expr_2,ineq_2],..,[expr_n,ineq_n]]
// where expr_i is an expression in the variable x that defines a function in the interval defined by ineq_i
// for instance [[x+5,x < -4],[x^2,-4<=x < 1],[x-2,1<=x < 3],[5,x==3],[x-2,3 < x < 5],[3,5<= x]]
// it should be previusly checked that it is a valid piecewise function or a math expression
function createEndPoints(func,board){
    // we are allowing the use of the power operator **, so we replace it by ^ to be able to parse it
    // we are also transforming the math constants to be able to parse them
    // WARNING nthroot is not implemented in mathjs, we need nthRoot, so when using mathjs, we need to change nthroot to nthRoot
    console.log("Creating endpoints for function: ", func);
    const txtraw= func.functionString
    const parsed = transformMathConstants(math.parse(txtraw.replace("**","^").replace("nthroot","nthRoot"))); 
    const types_to_be_deleted= ["isolated", "unequal"]; // we remove these types of points of interest, since they will be redefined
    const filteredPoints = func.pointOfInterests.filter(
      point => !types_to_be_deleted.includes(point.type)
    );
    func.pointOfInterests = filteredPoints;
    console.log(func);

    if (!("items" in parsed)){ // not a piecewise function
        return [[],[]];
    }
    const l = parsed.items; //list of items, each item is a pair [expr,ineq]
    let ineq,v,a,b,p,i;
    const endpoints = []; // the endpoints of the intervals
    for (i=0;i< l.length;i++){
        ineq = transformAssingnments(l[i].items[1]); // the inequality or equality of ith item, we change assignments to equalities
        if ("op" in ineq){ //that is a single inequality or an equality
            if (ineq.op == "<=" || ineq.op ==">=" || ineq.op =="=="){ //one of the arguments is the variable "x" 
                if ("name" in ineq.args[1]){ // we have a op x, with op in {<=, >=, ==}
                    v=ineq.args[0].evaluate(); // v is the value of a in a op x
                    p=board.create("point", [v,l[i].items[0].evaluate({x:v})], {cssClass: 'endpoint-closed', fixed:true, highlight:false, withLabel:false, size: 4});
                    endpoints.push(p);
                    if (ineq.op == "=="){ // if we have an equality, we add the x coordinate to the list of x-coordinates of isolated points
                        console.log("Adding isolated point at x=", v);
                        func.pointOfInterests.push({
                            x: v,
                            y: l[i].items[0].evaluate({x:v}),
                            type: "isolated"
                        });
                        console.log("Function ", func);
                      }
                }else{ // we have x op a, with op in {<=, >=, ==}
                    v=ineq.args[1].evaluate(); // v is the value of a in x op a
                    p=board.create("point", [v,l[i].items[0].evaluate({x:v})], {cssClass: 'isolated-point', fixed:true, highlight:false, withLabel:false, size: 4});   
                    endpoints.push(p);
                    if (ineq.op == "=="){ // if we have an equality, we add the x coordinate to the list of x-coordinates of isolated points
                        console.log("Adding isolated point at x=", v);
                        func.pointOfInterests.push({
                            x: v,
                            y: l[i].items[0].evaluate({x:v}),
                            type: "isolated"
                        });
                        console.log("Function ", func);
                    }
                }
            }
            if (ineq.op == "<" || ineq.op ==">" || ineq.op=="!="){ // this we fill in white, since it is an strict inequality
                if ("name" in ineq.args[1]){ // we have a op x, with op in {<,>}
                    v=ineq.args[0].evaluate(); // v is the value of a in a op x
                    let fv = l[i].items[0].evaluate({x:v});
                    if (ineq.op == "!="){ 
                      if (isNaN(fv)){// the point is not defined here, we try the mean of the values at the left and right of v
                        fv=(l[i].items[0].evaluate({x:v-0.0000001})+l[i].items[0].evaluate({x:v+0.0000001})/2);
                      }
                      console.log("Possible value at x=", v, fv);
                      func.pointOfInterests.push({
                        x: v,
                        y: NaN,
                        type: "unequal"
                      });
                    }
                    p=board.create("point", [v,fv], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                    endpoints.push(p);
                }else{ // we have x op a, with op in {<, >}
                    v=ineq.args[1].evaluate(); // v is the value of a in x op a
                    let fv = l[i].items[0].evaluate({x:v});
                    if (ineq.op == "!="){ 
                      if (isNaN(fv)){// the point is not defined here, we try the mean of the values at the left and right of v
                        fv=(l[i].items[0].evaluate({x:v-0.0000001})+l[i].items[0].evaluate({x:v+0.0000001})/2);
                      }
                      console.log("Possible value at x=", v, fv);
                      func.pointOfInterests.push({
                        x: v,
                        y: NaN,
                        type: "unequal"
                      });
                    }
                    p=board.create("point", [v,fv], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                    endpoints.push(p);
                }
            }
        }else{ // now we have a an inequality of the form a<=x<=b, a<x<=b, a<=x<b or a<x<b
            // the values a and b are the first and last arguments of the inequality
            a=ineq.params[0].evaluate(); // the value of a in a op x op b
            b=ineq.params[2].evaluate(); // the value of b in a op x op b
            // we should check here that conditionals are in the form smaller, smallerEq 
            if (ineq.conditionals[0]=="smaller"){ // this is a smaller so we fill in white, since it is an strict inequality
                p=board.create("point", [a,l[i].items[0].evaluate({x:a})], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }else{  // this is a smallerEq so we fill in blue
                p=board.create("point", [a,l[i].items[0].evaluate({x:a})], {cssClass: 'endpoint-closed', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }
            if (ineq.conditionals[1]=="smaller"){ // this is a smaller so we fill in white, since it is an strict inequality
                p=board.create("point", [b,l[i].items[0].evaluate({x:b})], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }else{ // this is a smallerEq so we fill in blue
                p=board.create("point", [b,l[i].items[0].evaluate({x:b})], {cssClass: 'endpoint-closed', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }
        }
    }
    return endpoints; // we return the endpoints and the x-coordinates of isolated points, removing duplicates
}

const GraphView = () => {
  const wrapperRef = useRef(null);
  const graphContainerRef = useRef(null);
  const boardRef = useRef(null);
  const { functionDefinitions, cursorCoords, setCursorCoords, setInputErrorMes, graphBounds, PlayFunction, playActiveRef, updateCursor, setUpdateCursor, setPlayFunction, timerRef, stepSize, isAudioEnabled, setExplorationMode, explorationMode } = useGraphContext();
  let endpoints = [];
  let snapaccuracy;
  const graphObjectsRef = useRef(new Map()); // Store graph objects for each function
  const cursorsRef = useRef(new Map()); // Store cursors for each function
  const parsedExpressionsRef = useRef(new Map()); // Store parsed expressions
  const lastCursorPositionRef = useRef(null); // Store the last known cursor position
  const pendingStateUpdateRef = useRef(null); // Store pending state update
  const currentTimerRef = useRef(null); // Store the current timer ID
  const preservedCursorPositionsRef = useRef(new Map()); // Store cursor positions to preserve during function updates
  const lastTickDivisionRef = useRef(null); // Track last ticked division index
  const prevXRef = useRef(null); // Track previous x value globally
  const divisionPointsRef = useRef([]); // Store division points
  const lastTickIndexRef = useRef(null); // Track last ticked index globally
  const mouseTimeoutRef = useRef(null); // Track mouse movement timeout
  const handlersRef = useRef({}); // Store event handlers for cleanup

  useEffect(() => {
    const board = JXG.JSXGraph.initBoard("jxgbox", {
      boundingbox: [graphBounds.xMin, graphBounds.yMax, graphBounds.xMax, graphBounds.yMin],
      grid: {
        cssClass: "grid",
        gridX: stepSize, // Grid-Abstand für X-Achse
        gridY: stepSize, // Grid-Abstand für Y-Achse
      },      
      axis: {
        cssClass: "axis", 
        needsRegularUpdate: true,
        highlight: false,
        ticks: {
          insertTicks: true,
          majorHeight: 5,
          minorHeight: 3,
          ticksDistance: stepSize, // Tick-Abstand anpassen
        },
      },
      zoom: { enabled: false, needShift: false },
      pan: { enabled: false, needShift: false, needTwoFingers: true},
      showCopyright: false,
      showNavigation: false //hides arrows and zoom icons
      });

    board.removeEventHandlers(); // remove all event handlers
    board.addPointerEventHandlers(); // Re-enable pointer handlers for mouse movement
    
    // Add click prevention handler
    const container = document.getElementById('jxgbox');
    
    const preventClickHandler = (event) => {
      // Prevent all mouse clicks
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    // Add the event listeners to prevent clicks
    container.addEventListener('click', preventClickHandler, true);
    container.addEventListener('mousedown', preventClickHandler, true);
    container.addEventListener('mouseup', preventClickHandler, true);
    
    // Store the handler in the ref for cleanup
    handlersRef.current = { preventClickHandler };

    boardRef.current = board;
    snapaccuracy = 3/board.unitX;

    // Get active functions
    const activeFunctions = getActiveFunctions(functionDefinitions);

    // Preserve current cursor positions before clearing
    if (cursorCoords && Array.isArray(cursorCoords)) {
      cursorCoords.forEach(coord => {
        preservedCursorPositionsRef.current.set(coord.functionId, {
          x: parseFloat(coord.x),
          y: parseFloat(coord.y)
        });
      });
    }

    // Clear old objects and cursors
    graphObjectsRef.current.clear();
    cursorsRef.current.clear();
    parsedExpressionsRef.current.clear();

    // Create graph objects and cursors for each active function
    activeFunctions.forEach(func => {
      let graphFormula;
      let expr = checkMathSpell(func.functionString);

      try {
        graphFormula = board.jc.snippet(expr, true, "x", true);
        setInputErrorMes(null);
      } catch (err) {
        console.error(`Error parsing expression for function ${func.id}: `, err);
        setInputErrorMes(`Invalid function ${func.functionName}. Please check your input.`);
        expr = "0";
        graphFormula = 0;
      }

      // Store the parsed expression
      parsedExpressionsRef.current.set(func.id, expr);

      // Create graph object with function's color
      const graphObject = board.create("functiongraph", [graphFormula], {
        cssClass: "curve",
        fixed: true,
        highlight: false,
        strokeColor: func.color || "#0000FF", // Use function's color or default to blue
      });
  
      // Create endpoints for piecewise functions
      if (expr !== "0") {
        const funcEndpoints = createEndPoints(func, board);
        endpoints = [...endpoints, ...funcEndpoints];
      }

      // Find last known position for this function's cursor
      let preservedPos = preservedCursorPositionsRef.current.get(func.id);
      let lastPos = cursorCoords && Array.isArray(cursorCoords)
        ? cursorCoords.find(c => c.functionId === func.id)
        : undefined;
      
      let initialX = 0;
      let initialY = 0;
      
      // Use preserved position if available, otherwise use current cursorCoords
      if (preservedPos) {
        initialX = preservedPos.x;
        initialY = preservedPos.y;
      } else if (lastPos) {
        initialX = parseFloat(lastPos.x);
        initialY = parseFloat(lastPos.y);
      }

      // Create cursor for this function at last known position (or [0,0])
      const cursor = board.create("point", [initialX, initialY], {
        cssClass: "functionCursor",
        name: "",
        size: 5,
        fixed: true,
        highlight: false,
        fillColor: func.color || "#0000FF",
        strokeColor: func.color || "#0000FF"
      });

      // Store references
      graphObjectsRef.current.set(func.id, graphObject);
      cursorsRef.current.set(func.id, cursor);
    });

    // Calculate division points for the x axis based on stepSize
    const divisions = [];
    const firstTick = Math.ceil(graphBounds.xMin / stepSize) * stepSize;
    for (let x = firstTick; x <= graphBounds.xMax; x += stepSize) {
      divisions.push(x);
    }
    divisionPointsRef.current = divisions;
    lastTickDivisionRef.current = null; // Reset on bounds change

    const updateCursors = (x, mouseY = null) => {
      // Guard against board not being initialized
      if (!board || !board.jc) {
        console.warn("Board or board.jc not available for cursor update");
        return;
      }

      // Retrieve points of interest for snapping
      let l = [];
      activeFunctions.forEach(func => {
        func.pointOfInterests.forEach((point) =>{ 
          //console.log("New x of interest:", point.x); 
          l.push(point.x);
        }); 
        //console.log("Points of interest: (x-coordinates)  ", l.toString());
      });
      
      const sl = l.filter(e => Math.abs(e-x) < snapaccuracy);
      let snappedX = sl.length > 0 ? sl[0] : x;
      
      // Clamp x position to prevent crossing chart boundaries
      const tolerance = 0.02; // Same tolerance as in GraphSonification
      if (snappedX <= graphBounds.xMin + tolerance) {
        snappedX = graphBounds.xMin + tolerance;
      } else if (snappedX >= graphBounds.xMax - tolerance) {
        snappedX = graphBounds.xMax - tolerance;
      }
      
      // Store the current position immediately
      lastCursorPositionRef.current = { x: snappedX };
      
      // Update all active cursors
      const cursorPositions = [];
      activeFunctions.forEach(func => {
        const cursor = cursorsRef.current.get(func.id);
        const graphObject = graphObjectsRef.current.get(func.id);
        const parsedExpr = parsedExpressionsRef.current.get(func.id);
        
        if (cursor && graphObject && parsedExpr) {
          try {
            const y = board.jc.snippet(parsedExpr, true, "x", true)(snappedX);
            // Check if y is a valid number
            if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
              // Clamp y position to prevent crossing vertical boundaries
              // let clampedY = y;
              // if (clampedY <= graphBounds.yMin + tolerance) {
              //   clampedY = graphBounds.yMin + tolerance;
              // } else if (clampedY >= graphBounds.yMax - tolerance) {
              //   clampedY = graphBounds.yMax - tolerance;
              // }
              
              // Show cursor and update position
              cursor.show();
              cursor.setPositionDirectly(JXG.COORDS_BY_USER, [snappedX, y]);
              cursorPositions.push({
                functionId: func.id,
                x: snappedX.toFixed(2),
                y: y.toFixed(2),
                mouseY: mouseY !== null ? mouseY.toFixed(2) : null
              });
            } else {
              console.warn(`Invalid y value for function ${func.id} at x=${snappedX}: ${y}`);
              // Hide cursor visually but still pass the invalid y value for sonification
              cursor.hide();
              // Position cursor at a point outside the visible area when function is invalid
              cursor.setPositionDirectly(JXG.COORDS_BY_USER, [snappedX, graphBounds.yMax + 10]);
              // Still pass the invalid y value to cursor positions for sonification detection
              cursorPositions.push({
                functionId: func.id,
                x: snappedX.toFixed(2),
                y: y.toString(), // Pass the invalid y value as string to preserve NaN/undefined
                mouseY: mouseY !== null ? mouseY.toFixed(2) : null
              });
            }
          } catch (err) {
            console.error(`Error updating cursor for function ${func.id}:`, err);
            // Hide cursor but still update its position to keep exploration moving
            cursor.hide();
            // Position cursor at a point outside the visible area when function is invalid
            cursor.setPositionDirectly(JXG.COORDS_BY_USER, [snappedX, graphBounds.yMax + 10]);
          }
        }
      });
      
      // Update audio immediately by calling setCursorCoords right away
      setCursorCoords(cursorPositions);
      
      // Always ensure we have a valid last position, even if no functions are valid
      if (cursorPositions.length === 0 && lastCursorPositionRef.current && lastCursorPositionRef.current.x !== snappedX) {
        // If no functions are valid but we have a last position, update it to current x
        lastCursorPositionRef.current = { x: snappedX };
      }
      
      // Clear any pending state update
      if (pendingStateUpdateRef.current) {
        clearTimeout(pendingStateUpdateRef.current);
      }
      
      // The delayed state update is no longer needed since we update immediately
      // But we keep the ref for potential future use
      pendingStateUpdateRef.current = null;
      
      board.update();

      // --- X axis tick logic (track last ticked index, no epsilon, not reset on resume) ---
      if (stepSize && stepSize > 0 && typeof x === 'number' && !isNaN(x) && isAudioEnabled) {
        let n = Math.floor(x / stepSize);
        if (n !== lastTickIndexRef.current) {
          // tickSynth.triggerAttackRelease("C6", "16n"); // Removed tick synth
          lastTickIndexRef.current = n;
        }
      }
    };
    setUpdateCursor(() => updateCursors);

    // Update cursors to their preserved positions after recreation
    if (lastCursorPositionRef.current && lastCursorPositionRef.current.x !== undefined) {
      updateCursors(lastCursorPositionRef.current.x);
    }

    // Clear preserved positions after they've been used
    preservedCursorPositionsRef.current.clear();

    if (PlayFunction.active) {
      console.log("Play mode activated!");
      let startX;
      if (PlayFunction.source === "play") {
        startX = PlayFunction.speed > 0 ? graphBounds.xMin : graphBounds.xMax;
      } else if (PlayFunction.source === "keyboard") {
        // Use the current cursor position if available, otherwise use last known position
        if (cursorCoords && cursorCoords.length > 0 && cursorCoords[0].x !== undefined) {
          startX = parseFloat(cursorCoords[0].x);
        } else if (lastCursorPositionRef.current && lastCursorPositionRef.current.x !== undefined) {
          startX = lastCursorPositionRef.current.x;
        } else {
          startX = PlayFunction.speed > 0 ? graphBounds.xMin : graphBounds.xMax;
        }
        // Clamp to bounds
        if (startX > graphBounds.xMax) startX = graphBounds.xMax;
        if (startX < graphBounds.xMin) startX = graphBounds.xMin;
      } else {
        startX = PlayFunction.speed > 0 ? graphBounds.xMin : graphBounds.xMax;
      }
      PlayFunction.x = startX;
      currentTimerRef.current = setInterval(() => {
        // Guard against board not being initialized
        if (!board || !board.jc) {
          console.warn("Board not available for play function, stopping timer");
          clearInterval(currentTimerRef.current);
          currentTimerRef.current = null;
          setPlayFunction(prev => ({ ...prev, active: false }));
          return;
        }
        
        // Use direction to determine movement direction
        let actualSpeed;
        if (PlayFunction.source === "keyboard") {
          actualSpeed = Math.abs(PlayFunction.speed) * PlayFunction.direction;
        } else if (PlayFunction.source === "play") {
          // For batch sonification, use the speed directly (positive = right, negative = left)
          actualSpeed = PlayFunction.speed;
        } else {
          actualSpeed = PlayFunction.speed;
        }
        PlayFunction.x += ((graphBounds.xMax - graphBounds.xMin) / (1000 / PlayFunction.interval)) * (actualSpeed / 100);
        
        // Clamp PlayFunction.x to prevent crossing boundaries
        const tolerance = 0.02;
        if (PlayFunction.x <= graphBounds.xMin + tolerance) {
          PlayFunction.x = graphBounds.xMin + tolerance;
        } else if (PlayFunction.x >= graphBounds.xMax - tolerance) {
          PlayFunction.x = graphBounds.xMax - tolerance;
        }
        
        updateCursors(PlayFunction.x);
        
        // Stop play function if we've reached the boundaries
        // For batch sonification, only stop when reaching the opposite boundary
        if (PlayFunction.source === "play") {
          // For batch sonification, stop when reaching the right boundary (if speed > 0) or left boundary (if speed < 0)
          const shouldStop = (PlayFunction.speed > 0 && PlayFunction.x >= graphBounds.xMax - tolerance) ||
                           (PlayFunction.speed < 0 && PlayFunction.x <= graphBounds.xMin + tolerance);
          if (shouldStop) {
            clearInterval(currentTimerRef.current);
            currentTimerRef.current = null;
            setPlayFunction(prev => ({ ...prev, active: false }));
            setExplorationMode("none");
          }
        } else {
          // For keyboard exploration, stop at either boundary
          if ((PlayFunction.x >= graphBounds.xMax - tolerance) || (PlayFunction.x <= graphBounds.xMin + tolerance)) {
            clearInterval(currentTimerRef.current);
            currentTimerRef.current = null;
            setPlayFunction(prev => ({ ...prev, active: false }));
            setExplorationMode("none");
          }
        }
      }, PlayFunction.interval);
    } else {
      if (currentTimerRef.current !== null) {
        clearInterval(currentTimerRef.current);
        currentTimerRef.current = null;
      }
      // Use the last known position immediately
      if (board && board.jc) {
      if (lastCursorPositionRef.current && lastCursorPositionRef.current.x !== undefined) {
        updateCursors(lastCursorPositionRef.current.x);
      } else if (PlayFunction.x !== undefined) {
        updateCursors(PlayFunction.x);
        }
      }
    }

    const moveHandler = (event) => {
      if (board && board.jc) {
        // Only handle mouse movement if not in keyboard exploration mode
        if (!playActiveRef.current) {
          setExplorationMode("mouse");
          const coords = board.getUsrCoordsOfMouse(event);
          const x = coords[0];
          const y = coords[1];
          updateCursors(x, y);
          
          // Reset exploration mode to "none" after a short delay when mouse stops moving
          clearTimeout(mouseTimeoutRef.current);
          mouseTimeoutRef.current = setTimeout(() => {
            setExplorationMode("none");
          }, 100); // 100ms delay
        }
      }
    };

    board.on("move", moveHandler, { passive: true });

    return () => {
      // Clear any running timer when component unmounts or dependencies change
      if (currentTimerRef.current !== null) {
        clearInterval(currentTimerRef.current);
        currentTimerRef.current = null;
      }
      // Clear mouse timeout
      if (mouseTimeoutRef.current !== null) {
        clearTimeout(mouseTimeoutRef.current);
        mouseTimeoutRef.current = null;
      }
      // Remove event handlers
      const container = document.getElementById('jxgbox');
      if (container) {
        container.removeEventListener('click', handlersRef.current.preventClickHandler, true);
        container.removeEventListener('mousedown', handlersRef.current.preventClickHandler, true);
        container.removeEventListener('mouseup', handlersRef.current.preventClickHandler, true);
      }
      board.off('move', moveHandler);
      
      board.unsuspendUpdate();
      JXG.JSXGraph.freeBoard(board);
    };
  }, [functionDefinitions, graphBounds, PlayFunction.active, PlayFunction.source, stepSize]);

  // Update playActiveRef when PlayFunction.active changes
  useEffect(() => {
    playActiveRef.current = PlayFunction.active;
  }, [PlayFunction.active]);

  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.setBoundingBox([
        graphBounds.xMin,
        graphBounds.yMax,
        graphBounds.xMax,
        graphBounds.yMin,
      ]);
      boardRef.current.update();  
    }
  }, [graphBounds]);

  // Focus the chart when component mounts
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.focus();
    }
  }, []);

  // useEffect(() => {
  //   const wrapper = wrapperRef.current;
  //   if (!wrapper) return;

  //   const handleKeyDown = (e) => {
  //     // only handle key events when the wrapper is focused
  //     if (document.activeElement !== wrapper) return;

  //     // ESCAPE to exit the application
  //     if (e.key === 'Escape') {
  //       wrapper.blur(); // Focus entfernen
  //       return;
  //     }
      
  //     // TAB to allow normal tabbing through elements
  //     if (e.key === 'Tab') {
  //       return; // Not preventing default to allow normal tabbing
  //     }



  //     // Only intercept graph-specific keys
  //     const graphKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',];
  //     if (!graphKeys.includes(e.key)) {
  //       return; // Other keys are passed through normally
  //     }
      
  //     e.preventDefault();
  //     e.stopPropagation();
      
  //     switch (e.key) {
  //       case 'ArrowLeft':
  //         setPlayFunction(prev => ({ ...prev, source: "keyboard", active: true, direction: -1 }));
  //         break;
  //       case 'ArrowRight':
  //         setPlayFunction(prev => ({ ...prev, source: "keyboard", active: true, direction: 1 }));
  //         break;
  //     }
  //   };

  //   wrapper.addEventListener('keydown', handleKeyDown);
  //   return () => wrapper.removeEventListener('keydown', handleKeyDown);
  // }, []);

  return (
    <div 
      ref={wrapperRef}
      id="chart"
      role="application"
      tabIndex={0}
      aria-label="Interactive graph."
      style={{ 
        outline: 'none', 
        width: "100%", 
        height: "100%",
        border: '2px solid transparent',
        borderRadius: '4px',
        transition: 'border-color 0.2s ease'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--color-primary)';
        e.target.style.boxShadow = '0 0 0 2px var(--color-primary)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'transparent';
        e.target.style.boxShadow = 'none';
      }}
    >
      <div 
        ref={graphContainerRef}
        aria-hidden="true"
        role="presentation"
        id="jxgbox" 
        style={{ width: "100%", height: "100%", outline: 'none' }}
      />
    </div>
  );
};

export default GraphView;