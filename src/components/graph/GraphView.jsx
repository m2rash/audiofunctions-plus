import React, { useEffect, useRef } from "react";
import JXG from "jsxgraph";
import { useGraphContext } from "../../context/GraphContext";

// Convert JSON to conditional expression - eg.: '[["x","x<1"],["x+1","x>=1"]]' ==> x<1 ? x : (x>=1 ? (x+1) : 0)
function piecewiseToTernary(input) {
  let parts;
  try {
    parts = JSON.parse(input);
  } catch (e) {
    return input; // If not valid JSON, return original input
  }

  function normalizeCondition(cond) {
    //remove spaces
    cond = cond.replace(/\s+/g, '');   
    //find conditions like "1<=x<2" and convert to "(x>=1 && x<2)"
    const match = cond.match(/^(-?\d+(?:\.\d+)?)(<=|<)x(<|<=)(-?\d+(?:\.\d+)?)$/);
    if (match) {
      const leftVal = match[1];
      const leftOp = match[2] === '<' ? '>' : '>=';
      const rightOp = match[3];
      const rightVal = match[4];
      return `(x${leftOp}${leftVal} && x${rightOp}${rightVal})`;
    }
    return cond;
  }

  let result = '';
  for (let i = 0; i < parts.length; i++) {
    const [expr, rawCond] = parts[i];
    const cond = normalizeCondition(rawCond);
    if (i === parts.length - 1) {
      result += `(${expr})`;
    } else {
      result += `(${cond}) ? (${expr}) : `;
    }
  }
  return result;
}

// Process the input expression
function processExpression(rawInput) {
  let processed = rawInput;
  // Check if the input is a piecewise function
  if (rawInput.trim().startsWith('[')) {
    try {
      processed = piecewiseToTernary(rawInput);
    } catch (err) {
      console.error('Wrong piecewise function:', err);
    }
  }
  return processed;
}

const GraphView = () => {
  const boardRef = useRef(null);
  const { functionInput, setCursorCoords, setInputErrorMes, graphBounds } = useGraphContext();

  useEffect(() => {
    const board = JXG.JSXGraph.initBoard("jxgbox", {
      boundingbox: [graphBounds.xMin, graphBounds.yMax, graphBounds.xMax, graphBounds.yMin],
      axis: true,
      zoom: { enabled: true, needShift: false },
      pan: { enabled: true, needShift: false },
      showCopyright: false,
    });

    boardRef.current = board;

    let graphFormula;
    try {
      const sourceExpression = processExpression(functionInput);
      graphFormula = board.jc.snippet(sourceExpression, true, "x", true);
      setInputErrorMes(null);
    } catch (err) {
      setInputErrorMes("Invalid function. Please check your input.");
      graphFormula = () => 0;
    }

    const graphObject = board.create("functiongraph", [graphFormula]);
    const cursor = board.create("point", [0, 0], {
      name: "",
      size: 3,
      color: "red",
      fixed: true,
    });

    const updateCursor = (event) => {
      const coords = board.getUsrCoordsOfMouse(event);
      const x = coords[0];
      const y = graphFormula(x);
      cursor.setPosition(JXG.COORDS_BY_USER, [x, y]);
      setCursorCoords({ x: x.toFixed(2), y: y.toFixed(2) });
      board.update();
    };

    board.on("move", updateCursor, { passive: true });

    return () => {
      board.off("move", updateCursor);
      JXG.JSXGraph.freeBoard(board);
    };
  }, [functionInput, setCursorCoords, setInputErrorMes]);

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

  return <div id="jxgbox" style={{ flex: 1, width: "100%", height: "100%" }}></div>;
};

export default GraphView;