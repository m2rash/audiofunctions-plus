import React, { useEffect, useRef } from "react";
import { useGraphContext } from "../../context/GraphContext";
import { Play } from "lucide-react";

const GraphControls = () => {
  
  const {
    functionInput,
    setFunctionInput,
    cursorCoords,
    error,
    isAudioEnabled,
    setIsAudioEnabled,
    PlayFunction,
    setPlayFunction,
  } = useGraphContext();

  const PlayButtonClick = () => {
    setPlayFunction(prev => ({ ...prev, active: !prev.active }));
  }

  return (
    <div style={{ padding: "10px" }}>
      <label htmlFor="functionInput">Function: </label>
      <input
        type="text"
        id="functionInput"
        value={functionInput}
        onChange={(e) => setFunctionInput(e.target.value)}
      />
      <span>
        &nbsp;Cursor: x: {cursorCoords.x}, y: {cursorCoords.y}
      </span>
      {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}
      <button
        onClick={() => setIsAudioEnabled((prev) => !prev)}
        style={{
          marginLeft: "10px",
          padding: "5px 10px",
          backgroundColor: isAudioEnabled ? "green" : "orange",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        {isAudioEnabled ? "Stop Audio" : "Start Audio"}
      </button>
      <button
        onClick={ PlayButtonClick }
        style={{
          marginLeft: "10px",
          padding: "5px 10px",
          backgroundColor: PlayFunction.active ? "green" : "orange",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        {PlayFunction.active ? "Stop" : "Play"}
      </button>
      <label htmlFor="speedInput"> speed: </label>
      <input
        type="text"
        id="functionInput"
        value={PlayFunction.speed}
        onChange={(e) => setPlayFunction(prev => ({ ...prev, speed: e.target.value }))}
        style={{ marginLeft: "10px", width: "50px" }}
      />
    </div>
  );
};

export default GraphControls;